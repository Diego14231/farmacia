import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarConfirmacionPedido } from "@/services/pedidos/emails";

/**
 * Webhook de Mercado Pago (notificaciones de pago).
 * MP manda ?type=payment&data.id=<paymentId>; se consulta el pago real a la
 * API de MP (nunca confiar en el body del webhook) y si está aprobado se
 * marca el pedido como pagado usando external_reference = pedidos.id.
 *
 * Nota: con la Orders API el pedido ya se actualiza de forma síncrona en
 * procesarPagoConTarjeta() según la respuesta directa de /v1/orders -- este
 * webhook queda como respaldo para pagos que confirman de forma asíncrona
 * (pending/in_process) o para no depender solo de la respuesta síncrona.
 */
export async function POST(req: NextRequest) {
  const mpToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!mpToken) return NextResponse.json({ ok: true }); // pasarela no configurada

  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? url.searchParams.get("topic");
  const dataId =
    url.searchParams.get("data.id") ?? url.searchParams.get("id");

  if (type !== "payment" || !dataId) return NextResponse.json({ ok: true });

  const resp = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
    headers: { Authorization: `Bearer ${mpToken}` },
  });
  if (!resp.ok) return NextResponse.json({ ok: true });

  const pago = await resp.json();
  const pedidoId = pago.external_reference as string | undefined;
  if (!pedidoId) return NextResponse.json({ ok: true });

  if (pago.status === "approved") {
    const supabase = createAdminClient();
    // Los pedidos con receta pasan a validación de la química farmacéutica
    // antes de prepararse; los demás quedan listos para preparar.
    const { data: pedido } = await supabase
      .from("pedidos")
      .select("requiere_receta, estado")
      .eq("id", pedidoId)
      .single();

    if (pedido && pedido.estado === "pendiente_pago") {
      await supabase
        .from("pedidos")
        .update({
          estado: pedido.requiere_receta ? "pendiente_validacion_qf" : "pagado",
        })
        .eq("id", pedidoId);
      // Idempotente (ver migración stock_pedido): seguro aunque el camino
      // síncrono ya lo haya descontado.
      await supabase.rpc("descontar_stock_pedido", { p_pedido_id: pedidoId });
      await enviarConfirmacionPedido(pedidoId);
    }
  }

  return NextResponse.json({ ok: true });
}
