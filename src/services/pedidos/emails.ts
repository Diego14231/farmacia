import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmail, plantillaBase } from "@/lib/email";
import { formatearPrecio, ETIQUETA_ESTADO_PEDIDO } from "@/lib/formato";

/**
 * Notificaciones por email de todo el ciclo de vida del pedido. Viven acá
 * (no en services/admin) porque tanto acciones del storefront (pago) como
 * del panel interno (validar receta, cambiar estado) necesitan mandarlas.
 */

interface ClienteEmail {
  nombre: string | null;
  email: string | null;
}

async function obtenerPedidoConCliente(pedidoId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("pedidos")
    .select(
      "id, total, clientes(nombre, email), pedido_items(cantidad, precio_unitario, productos(nombre))",
    )
    .eq("id", pedidoId)
    .maybeSingle();
  return data;
}

function extraerCliente(valor: unknown): ClienteEmail | null {
  const c = valor as ClienteEmail | ClienteEmail[] | null;
  return Array.isArray(c) ? (c[0] ?? null) : c;
}

export async function enviarConfirmacionPedido(pedidoId: string): Promise<void> {
  const pedido = await obtenerPedidoConCliente(pedidoId);
  const cliente = extraerCliente(pedido?.clientes);
  if (!pedido || !cliente?.email) return;

  const items = (
    (pedido.pedido_items ?? []) as unknown as Array<{
      cantidad: number;
      precio_unitario: number;
      productos: { nombre: string } | { nombre: string }[] | null;
    }>
  )
    .map((it) => {
      const prod = Array.isArray(it.productos) ? it.productos[0] : it.productos;
      return `<li>${it.cantidad}× ${prod?.nombre ?? "Producto"} — ${formatearPrecio(it.precio_unitario * it.cantidad)}</li>`;
    })
    .join("");

  await enviarEmail({
    to: cliente.email,
    subject: `Confirmamos tu pedido #${pedidoId.slice(0, 8)}`,
    html: plantillaBase(
      "¡Gracias por tu compra!",
      `<p>Hola${cliente.nombre ? ` ${cliente.nombre}` : ""}, tu pedido fue confirmado.</p>
       <ul>${items}</ul>
       <p><strong>Total: ${formatearPrecio(pedido.total)}</strong></p>
       <p style="font-size: 12px; color: #666;">Número de pedido: <code>${pedidoId}</code></p>`,
    ),
  });
}

export async function enviarNotificacionReceta(
  recetaId: string,
  decision: "validada" | "rechazada",
  motivoRechazo?: string | null,
): Promise<void> {
  const supabase = createAdminClient();
  const { data: receta } = await supabase
    .from("recetas")
    .select("clientes(nombre, email)")
    .eq("id", recetaId)
    .maybeSingle();
  const cliente = extraerCliente(receta?.clientes);
  if (!cliente?.email) return;

  const cuerpo =
    decision === "validada"
      ? `<p>Hola${cliente.nombre ? ` ${cliente.nombre}` : ""}, tu receta médica fue validada por nuestro químico farmacéutico. Tu pedido pasa a preparación.</p>`
      : `<p>Hola${cliente.nombre ? ` ${cliente.nombre}` : ""}, tu receta médica fue rechazada${motivoRechazo ? `: ${motivoRechazo}` : "."}</p>
         <p>Si tienes dudas, escríbenos por la página de reclamos.</p>`;

  await enviarEmail({
    to: cliente.email,
    subject: decision === "validada" ? "Tu receta fue validada" : "Tu receta fue rechazada",
    html: plantillaBase("Estado de tu receta médica", cuerpo),
  });
}

export async function enviarNotificacionEstadoPedido(
  pedidoId: string,
  estado: "despachado" | "entregado",
): Promise<void> {
  const pedido = await obtenerPedidoConCliente(pedidoId);
  const cliente = extraerCliente(pedido?.clientes);
  if (!cliente?.email) return;

  const cuerpo =
    estado === "despachado"
      ? `<p>Hola${cliente.nombre ? ` ${cliente.nombre}` : ""}, tu pedido fue despachado y está en camino.</p>`
      : `<p>Hola${cliente.nombre ? ` ${cliente.nombre}` : ""}, tu pedido fue entregado. ¡Gracias por comprar con nosotros!</p>`;

  await enviarEmail({
    to: cliente.email,
    subject:
      estado === "despachado" ? "Tu pedido fue despachado" : "Tu pedido fue entregado",
    html: plantillaBase(ETIQUETA_ESTADO_PEDIDO[estado], cuerpo),
  });
}
