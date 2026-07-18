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
  /** URL de pago de Mercado Pago (init_point), si la pasarela está configurada */
  urlPago?: string;
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

    // --- Mercado Pago (si está configurado) -----------------------------------
    let urlPago: string | undefined;
    const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (mpToken) {
      const resp = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${mpToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          external_reference: pedido.id,
          items: datos.items.map((i) => {
            const p = porSku.get(i.sku)!;
            return {
              id: p.sku_codigo,
              title: p.nombre,
              quantity: i.cantidad,
              unit_price: p.precio_venta,
              currency_id: "CLP",
            };
          }),
          back_urls: {
            success: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/checkout/gracias?pedido=${pedido.id}`,
            failure: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/checkout?error=pago`,
            pending: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/checkout/gracias?pedido=${pedido.id}`,
          },
          notification_url: process.env.NEXT_PUBLIC_SITE_URL
            ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/mercadopago`
            : undefined,
        }),
      });
      if (resp.ok) {
        const pref = await resp.json();
        urlPago = pref.init_point as string;
        await supabase
          .from("pedidos")
          .update({ metodo_pago: "mercadopago", referencia_pago_externo: pref.id })
          .eq("id", pedido.id);
      }
      // si MP falla, el pedido queda creado en pendiente_pago igual — se
      // puede reintentar el pago después sin perder el pedido.
    }

    return { ok: true, pedidoId: pedido.id, urlPago, requiereReceta };
  } catch (e) {
    console.error("crearPedido:", e);
    return { ok: false, error: "No se pudo crear el pedido. Intenta de nuevo." };
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
