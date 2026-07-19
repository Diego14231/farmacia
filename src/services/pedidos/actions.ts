"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { enviarConfirmacionPedido } from "./emails";

// Traducciones de los status_detail más comunes de Mercado Pago (ver
// https://www.mercadopago.cl/developers/es/docs/checkout-api/response-handling/collection-results).
const MOTIVO_RECHAZO: Record<string, string> = {
  cc_rejected_bad_filled_card_number: "Revisa el número de la tarjeta.",
  cc_rejected_bad_filled_date: "Revisa la fecha de vencimiento.",
  cc_rejected_bad_filled_security_code: "Revisa el código de seguridad (CVV).",
  cc_rejected_bad_filled_other: "Revisa los datos de la tarjeta.",
  cc_rejected_call_for_authorize: "Debes autorizar el pago con tu banco antes de reintentar.",
  cc_rejected_card_disabled: "La tarjeta está deshabilitada. Contacta a tu banco.",
  cc_rejected_duplicated_payment: "Ya existe un pago igual reciente. Espera unos minutos.",
  cc_rejected_high_risk: "El pago fue rechazado por prevención de fraude.",
  cc_rejected_insufficient_amount: "Fondos insuficientes.",
  cc_rejected_invalid_installments: "Número de cuotas inválido para esta tarjeta.",
  cc_rejected_max_attempts: "Superaste el número de intentos permitidos.",
  cc_rejected_other_reason: "El emisor de la tarjeta rechazó el pago.",
  rejected_by_issuer: "El emisor de la tarjeta rechazó el pago.",
};

/**
 * Traduce el status_detail crudo de MP a un mensaje accionable. En modo
 * prueba, agrega el recordatorio de usar el nombre "APRO" -- en sandbox el
 * resultado del pago depende del nombre del titular, no de si los demás
 * datos están bien, así que es el motivo más común de "rechazo" al probar.
 */
function mensajeRechazo(statusDetail?: string): string {
  const base =
    (statusDetail && MOTIVO_RECHAZO[statusDetail]) ??
    "Tu tarjeta fue rechazada. Intenta con otra.";
  if (process.env.NEXT_PUBLIC_MERCADO_PAGO_MODO_PRUEBA === "true") {
    return `${base} En modo de pruebas, usa exactamente el nombre "APRO" como titular de la tarjeta para que el pago se apruebe.`;
  }
  return base;
}

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
    // OJO: la Orders API de MP para CLP (peso chileno, sin decimales) exige
    // el monto como entero SIN punto decimal -- "12990", no "12990.00". Con
    // decimales, MP responde 400 "does not match pattern" en TODOS los
    // intentos (nunca aprueba ninguna tarjeta), y como ese error ocurre en
    // esta llamada servidor-a-servidor, nunca aparece en el Network tab del
    // navegador -- solo en los logs del servidor.
    const monto = String(Math.round(Number(pedido.total)));

    // Con credenciales de PRUEBA, MP rechaza cualquier email real con
    // "invalid_email_for_sandbox" (código verificado en vivo) -- exige que
    // termine en "@testuser.com", sin importar cuál sea el resto. Esto NO
    // afecta el email real del cliente (el que queda guardado en `clientes`
    // y al que le llegan los emails de confirmación): solo se sustituye en
    // este payload que viaja a Mercado Pago.
    const emailParaMP =
      process.env.NEXT_PUBLIC_MERCADO_PAGO_MODO_PRUEBA === "true"
        ? `${datosTarjeta.payerEmail.split("@")[0].replace(/[^a-zA-Z0-9._-]/g, "") || "cliente"}@testuser.com`
        : datosTarjeta.payerEmail;

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
        payer: { email: emailParaMP },
        transactions: {
          payments: [
            {
              amount: monto,
              payment_method: {
                id: datosTarjeta.payment_method_id,
                type: datosTarjeta.tipoTarjeta === "debit_card" ? "debit_card" : "credit_card",
                token: datosTarjeta.token,
                installments: datosTarjeta.installments,
                // OJO: la Orders API rechaza esta llamada con 400
                // "unsupported_properties" / "additionalProperties 'issuer_id'
                // not allowed" si se incluye issuer_id acá -- pese a que el
                // Brick sí lo entrega en formData, este endpoint no lo acepta.
                // Verificado en vivo: sacarlo es lo que hace que el pago
                // finalmente se apruebe.
              },
            },
          ],
        },
      }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      // OJO: un pago RECHAZADO (tarjeta declinada) también llega acá -- la
      // Orders API lo devuelve como HTTP 402 con "status":"failed" y el
      // detalle real en transactions.payments[0].status_detail (verificado en
      // vivo), no como un 2xx con estado "rejected" como hacen otras APIs de
      // MP. Si es ese caso, se trata igual que un rechazo normal (si no, el
      // código de abajo que maneja "rejected" nunca se ejecuta). Cualquier
      // otro error (400 de validación, credenciales, etc.) sigue siendo un
      // error genérico -- ese detalle técnico en inglés queda solo en el log.
      const pagoFallido = data?.data?.transactions?.payments?.[0];
      if (resp.status === 402 && pagoFallido) {
        console.error("Mercado Pago: pago rechazado", pagoFallido);
        return {
          ok: true,
          estado: "rechazado",
          detalle: mensajeRechazo(pagoFallido.status_detail),
        };
      }

      console.error("Mercado Pago Orders API error:", data);
      return {
        ok: false,
        error:
          "No se pudo procesar el pago. Verifica los datos de la tarjeta o intenta con otra.",
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
      // Descuenta stock real ahora que el pago está confirmado -- idempotente,
      // así que si el webhook de MP también dispara esto no se descuenta dos veces.
      await supabase.rpc("descontar_stock_pedido", { p_pedido_id: pedidoId });
      await enviarConfirmacionPedido(pedidoId);
      return { ok: true, estado: "aprobado" };
    }

    if (estadoPago === "rejected") {
      return {
        ok: true,
        estado: "rechazado",
        detalle: mensajeRechazo(pago?.status_detail),
      };
    }

    // pending / in_process: queda pendiente_pago, se confirma por webhook
    return { ok: true, estado: "pendiente" };
  } catch (e) {
    console.error("procesarPagoConTarjeta:", e);
    return { ok: false, error: "No se pudo procesar el pago. Intenta de nuevo." };
  }
}

export interface DetalleItemPedido {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
}

export interface DetallePedido {
  id: string;
  estado: string;
  total: number;
  createdAt: string;
  requiereReceta: boolean;
  estadoReceta: string | null;
  motivoRechazoReceta: string | null;
  items: DetalleItemPedido[];
}

export interface ResultadoConsultaPedido {
  ok: boolean;
  pedido?: DetallePedido;
  error?: string;
}

/**
 * Consulta guest: como el checkout no exige cuenta de cliente (ver
 * services/pedidos/actions.ts:crearPedido), el único modo de que alguien vea
 * su pedido es con el ID (que recibe en la página de gracias) + el email con
 * el que compró. Si no calzan, se devuelve el mismo error genérico -- no se
 * confirma si el ID existe, para no filtrar esa información a quien no
 * conoce el email real.
 */
export async function consultarPedido(
  pedidoId: string,
  email: string,
): Promise<ResultadoConsultaPedido> {
  const idLimpio = pedidoId.trim();
  const emailLimpio = email.trim().toLowerCase();
  if (!idLimpio || !emailLimpio)
    return { ok: false, error: "Ingresa el número de pedido y el email." };

  const supabase = createAdminClient();

  const { data: pedido, error } = await supabase
    .from("pedidos")
    .select(
      "id, estado, total, created_at, requiere_receta, clientes!inner(email), recetas(estado, motivo_rechazo), pedido_items(cantidad, precio_unitario, productos(nombre))",
    )
    .eq("id", idLimpio)
    .eq("clientes.email", emailLimpio)
    .maybeSingle();

  if (error || !pedido)
    return { ok: false, error: "No encontramos un pedido con ese número y email." };

  const receta = pedido.recetas as unknown as
    | { estado: string; motivo_rechazo: string | null }
    | { estado: string; motivo_rechazo: string | null }[]
    | null;
  const recetaUnica = Array.isArray(receta) ? receta[0] : receta;

  const items = (
    (pedido.pedido_items ?? []) as unknown as Array<{
      cantidad: number;
      precio_unitario: number;
      productos: { nombre: string } | { nombre: string }[] | null;
    }>
  ).map((it) => {
    const prod = Array.isArray(it.productos) ? it.productos[0] : it.productos;
    return {
      nombre: prod?.nombre ?? "Producto",
      cantidad: it.cantidad,
      precioUnitario: it.precio_unitario,
    };
  });

  return {
    ok: true,
    pedido: {
      id: pedido.id,
      estado: pedido.estado,
      total: pedido.total,
      createdAt: pedido.created_at,
      requiereReceta: pedido.requiere_receta,
      estadoReceta: recetaUnica?.estado ?? null,
      motivoRechazoReceta: recetaUnica?.motivo_rechazo ?? null,
      items,
    },
  };
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
