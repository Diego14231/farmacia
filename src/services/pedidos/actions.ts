"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface DatosCheckout {
  nombre: string;
  email: string;
  telefono: string;
  rut?: string;
  calle: string;
  numero?: string;
  comuna: string;
  ciudad: string;
  referencia?: string;
  items: Array<{ sku: string; cantidad: number }>;
}

export interface ResultadoCheckout {
  ok: boolean;
  pedidoId?: string;
  total?: number;
  requiereReceta?: boolean;
  error?: string;
}

/**
 * Crea el pedido completo: cliente (por email, sin duplicar), dirección,
 * pedido y sus items. Los PRECIOS se leen de la base de datos — nunca del
 * cliente. Si algún producto requiere receta, el pedido queda marcado y la
 * receta se adjunta después (subirReceta).
 */
export async function crearPedido(
  datos: DatosCheckout,
): Promise<ResultadoCheckout> {
  try {
    if (!datos.nombre?.trim() || !datos.email?.trim() || !datos.telefono?.trim())
      return { ok: false, error: "Nombre, email y teléfono son obligatorios." };
    if (!datos.calle?.trim() || !datos.comuna?.trim() || !datos.ciudad?.trim())
      return { ok: false, error: "La dirección de despacho está incompleta." };
    if (!datos.items?.length)
      return { ok: false, error: "El carrito está vacío." };

    const supabase = createAdminClient();

    // --- Productos reales (precio y condición de venta desde la BD) -------
    const skus = datos.items.map((i) => i.sku);
    const { data: productos, error: errProd } = await supabase
      .from("productos")
      .select("id, sku_codigo, nombre, precio_venta, stock_actual, condicion_venta, activo_online")
      .in("sku_codigo", skus);
    if (errProd) throw errProd;

    const porSku = new Map(productos?.map((p) => [p.sku_codigo, p]) ?? []);
    for (const item of datos.items) {
      const p = porSku.get(item.sku);
      if (!p || !p.activo_online)
        return { ok: false, error: `Producto no disponible: ${item.sku}` };
      if (p.condicion_venta === "no_vendible_online")
        return { ok: false, error: `"${p.nombre}" solo se vende en tienda.` };
      if (p.stock_actual < item.cantidad)
        return { ok: false, error: `Stock insuficiente para "${p.nombre}".` };
    }

    const requiereReceta = datos.items.some((i) => {
      const cv = porSku.get(i.sku)?.condicion_venta;
      return cv != null && cv !== "directa" && cv !== "no_vendible_online";
    });

    // --- Cliente (find-or-create por email) --------------------------------
    const email = datos.email.trim().toLowerCase();
    const { data: clienteExistente } = await supabase
      .from("clientes")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    let clienteId = clienteExistente?.id as string | undefined;
    if (!clienteId) {
      const { data: nuevo, error: errCliente } = await supabase
        .from("clientes")
        .insert({
          nombre: datos.nombre.trim(),
          email,
          telefono: datos.telefono.trim(),
          rut: datos.rut?.trim() || null,
        })
        .select("id")
        .single();
      if (errCliente) throw errCliente;
      clienteId = nuevo.id;
    }

    // --- Dirección -----------------------------------------------------------
    const { data: direccion, error: errDir } = await supabase
      .from("direcciones")
      .insert({
        cliente_id: clienteId,
        calle: datos.calle.trim(),
        numero: datos.numero?.trim() || null,
        comuna: datos.comuna.trim(),
        ciudad: datos.ciudad.trim(),
        referencia: datos.referencia?.trim() || null,
      })
      .select("id")
      .single();
    if (errDir) throw errDir;

    // --- Pedido + items --------------------------------------------------------
    const subtotal = datos.items.reduce(
      (s, i) => s + porSku.get(i.sku)!.precio_venta * i.cantidad,
      0,
    );
    const costoDespacho = 0; // TODO: definir zonas/tarifas de despacho con la farmacia

    const { data: pedido, error: errPedido } = await supabase
      .from("pedidos")
      .insert({
        cliente_id: clienteId,
        direccion_id: direccion.id,
        estado: "pendiente_pago",
        requiere_receta: requiereReceta,
        subtotal,
        costo_despacho: costoDespacho,
        total: subtotal + costoDespacho,
      })
      .select("id")
      .single();
    if (errPedido) throw errPedido;

    const { error: errItems } = await supabase.from("pedido_items").insert(
      datos.items.map((i) => ({
        pedido_id: pedido.id,
        producto_id: porSku.get(i.sku)!.id,
        cantidad: i.cantidad,
        precio_unitario: porSku.get(i.sku)!.precio_venta,
      })),
    );
    if (errItems) throw errItems;

    // El pago se procesa en un segundo paso con el Card Payment Brick
    // (ver procesarPagoConTarjeta) -- acá solo se deja el pedido creado y
    // pendiente de pago, con su total ya calculado desde precios reales.
    return {
      ok: true,
      pedidoId: pedido.id,
      total: subtotal + costoDespacho,
      requiereReceta,
    };
  } catch (e) {
    console.error("crearPedido:", e);
    return { ok: false, error: "No se pudo crear el pedido. Intenta de nuevo." };
  }
}

export interface ResultadoPago {
  ok: boolean;
  estado?: "aprobado" | "rechazado" | "pendiente";
  detalle?: string;
  error?: string;
}

/**
 * Procesa el pago de un pedido ya creado con el token de tarjeta que entrega
 * el Card Payment Brick (nunca tocamos el número de tarjeta directamente,
 * eso lo maneja Mercado Pago del lado del cliente).
 *
 * Usa la Orders API (POST /v1/orders) -- la integración que Diego eligió en
 * el panel de Mercado Pago ("Checkout API vía Orders"), distinta a la API
 * de Preferencias/Checkout Pro que se usaba antes.
 */
export async function procesarPagoConTarjeta(
  pedidoId: string,
  datosTarjeta: {
    token: string;
    payment_method_id: string;
    /** "credit_card" | "debit_card" -- lo entrega el Brick en additionalData.paymentTypeId */
    tipoTarjeta: string;
    installments: number;
    issuer_id?: string;
    payerEmail: string;
  },
): Promise<ResultadoPago> {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken)
    return { ok: false, error: "El pago con tarjeta no está configurado todavía." };

  try {
    const supabase = createAdminClient();
    const { data: pedido, error: errPedido } = await supabase
      .from("pedidos")
      .select("id, total, estado, requiere_receta")
      .eq("id", pedidoId)
      .single();
    if (errPedido || !pedido) return { ok: false, error: "Pedido no encontrado." };
    if (pedido.estado !== "pendiente_pago")
      return { ok: false, error: "Este pedido ya no está pendiente de pago." };

    // El monto SIEMPRE sale de la base de datos, nunca del formulario del
    // navegador -- evita que alguien manipule el precio desde el cliente.
    const monto = Number(pedido.total).toFixed(2);

    const resp = await fetch("https://api.mercadopago.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        "X-Idempotency-Key": `${pedidoId}-${crypto.randomUUID()}`,
      },
      body: JSON.stringify({
        type: "online",
        processing_mode: "automatic",
        total_amount: monto,
        external_reference: pedidoId,
        payer: { email: datosTarjeta.payerEmail },
        transactions: {
          payments: [
            {
              amount: monto,
              payment_method: {
                id: datosTarjeta.payment_method_id,
                type: datosTarjeta.tipoTarjeta === "debit_card" ? "debit_card" : "credit_card",
                token: datosTarjeta.token,
                installments: datosTarjeta.installments,
                ...(datosTarjeta.issuer_id ? { issuer_id: datosTarjeta.issuer_id } : {}),
              },
            },
          ],
        },
      }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      console.error("Mercado Pago Orders API error:", data);
      return {
        ok: false,
        error: data?.message ?? "El pago fue rechazado. Verifica los datos de la tarjeta.",
      };
    }

    const pago = data.transactions?.payments?.[0];
    const estadoPago = pago?.status ?? data.status;

    await supabase
      .from("pedidos")
      .update({
        metodo_pago: "mercadopago",
        referencia_pago_externo: data.id,
      })
      .eq("id", pedidoId);

    if (estadoPago === "processed" || estadoPago === "approved") {
      await supabase
        .from("pedidos")
        .update({
          estado: pedido.requiere_receta ? "pendiente_validacion_qf" : "pagado",
        })
        .eq("id", pedidoId);
      return { ok: true, estado: "aprobado" };
    }

    if (estadoPago === "rejected") {
      return {
        ok: true,
        estado: "rechazado",
        detalle: pago?.status_detail ?? "Pago rechazado por el emisor de la tarjeta.",
      };
    }

    // pending / in_process: queda pendiente_pago, se confirma por webhook
    return { ok: true, estado: "pendiente" };
  } catch (e) {
    console.error("procesarPagoConTarjeta:", e);
    return { ok: false, error: "No se pudo procesar el pago. Intenta de nuevo." };
  }
}

/**
 * Sube la receta médica de un pedido al bucket privado y la asocia.
 * Se llama con FormData desde la página de checkout cuando el carrito
 * incluye medicamentos con receta.
 */
export async function subirReceta(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  try {
    const pedidoId = String(formData.get("pedidoId") ?? "");
    const tipo = String(formData.get("tipo") ?? "simple");
    const archivo = formData.get("archivo") as File | null;

    if (!pedidoId || !archivo)
      return { ok: false, error: "Falta el archivo de la receta." };
    if (archivo.size > 10 * 1024 * 1024)
      return { ok: false, error: "La receta no puede superar 10 MB." };
    if (!["simple", "retenida", "cheque"].includes(tipo))
      return { ok: false, error: "Tipo de receta inválido." };

    const supabase = createAdminClient();

    const { data: pedido, error: errPedido } = await supabase
      .from("pedidos")
      .select("id, cliente_id, requiere_receta")
      .eq("id", pedidoId)
      .single();
    if (errPedido || !pedido) return { ok: false, error: "Pedido no encontrado." };

    const extension = archivo.name.split(".").pop()?.toLowerCase() ?? "pdf";
    const ruta = `${pedido.cliente_id}/${pedidoId}.${extension}`;
    const { error: errUpload } = await supabase.storage
      .from("recetas")
      .upload(ruta, archivo, { upsert: true });
    if (errUpload) throw errUpload;

    const { data: receta, error: errReceta } = await supabase
      .from("recetas")
      .insert({
        cliente_id: pedido.cliente_id,
        archivo_url: ruta,
        tipo,
      })
      .select("id")
      .single();
    if (errReceta) throw errReceta;

    await supabase
      .from("pedidos")
      .update({ receta_id: receta.id })
      .eq("id", pedidoId);

    return { ok: true };
  } catch (e) {
    console.error("subirReceta:", e);
    return { ok: false, error: "No se pudo subir la receta. Intenta de nuevo." };
  }
}
