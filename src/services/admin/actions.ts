"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { obtenerStaffActual } from "./auth";
import type { EstadoPedido } from "@/types/database";
import {
  enviarNotificacionEstadoPedido,
  enviarNotificacionReceta,
} from "@/services/pedidos/emails";

const ESTADOS_VALIDOS: EstadoPedido[] = [
  "pendiente_pago",
  "pagado",
  "pendiente_validacion_qf",
  "en_preparacion",
  "despachado",
  "entregado",
  "cancelado",
];

export async function cambiarEstadoPedido(
  pedidoId: string,
  estado: EstadoPedido,
): Promise<{ ok: boolean; error?: string }> {
  const staff = await obtenerStaffActual();
  if (!staff) return { ok: false, error: "No autorizado." };
  if (!ESTADOS_VALIDOS.includes(estado))
    return { ok: false, error: "Estado inválido." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("pedidos")
    .update({ estado })
    .eq("id", pedidoId);
  if (error) return { ok: false, error: error.message };

  // Si se cancela un pedido cuyo stock ya se había descontado (pagado), se
  // devuelve al inventario -- no se vendió realmente.
  if (estado === "cancelado")
    await supabase.rpc("restaurar_stock_pedido", { p_pedido_id: pedidoId });

  // El staff también puede marcar un pedido como pagado manualmente (ej. una
  // venta en efectivo/presencial) sin pasar por Mercado Pago -- el descuento
  // de stock es idempotente, así que es seguro llamarlo aquí también.
  if (estado === "pagado" || estado === "pendiente_validacion_qf")
    await supabase.rpc("descontar_stock_pedido", { p_pedido_id: pedidoId });

  if (estado === "despachado" || estado === "entregado")
    await enviarNotificacionEstadoPedido(pedidoId, estado);

  revalidatePath("/admin/pedidos");
  return { ok: true };
}

/**
 * Valida o rechaza una receta. Solo la química farmacéutica (o admin) puede
 * hacerlo — es el punto del flujo que implementa el requisito ISP de
 * validación farmacéutica antes del despacho.
 */
export async function resolverReceta(
  recetaId: string,
  decision: "validada" | "rechazada",
  motivoRechazo?: string,
): Promise<{ ok: boolean; error?: string }> {
  const staff = await obtenerStaffActual();
  if (!staff) return { ok: false, error: "No autorizado." };
  if (staff.rol !== "quimico_farmaceutico" && staff.rol !== "admin")
    return { ok: false, error: "Solo el químico farmacéutico puede validar recetas." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("recetas")
    .update({
      estado: decision,
      validada_por_staff_id: staff.id,
      validada_at: new Date().toISOString(),
      motivo_rechazo: decision === "rechazada" ? (motivoRechazo ?? null) : null,
    })
    .eq("id", recetaId);
  if (error) return { ok: false, error: error.message };

  // Avanza el pedido asociado: validada -> en_preparacion; rechazada -> cancelado
  const { data: pedido } = await supabase
    .from("pedidos")
    .select("id")
    .eq("receta_id", recetaId)
    .maybeSingle();
  if (pedido) {
    await supabase
      .from("pedidos")
      .update({ estado: decision === "validada" ? "en_preparacion" : "cancelado" })
      .eq("id", pedido.id);
    // El pedido ya estaba pagado (por eso llegó a validación QF), así que si
    // se rechaza la receta hay que devolver el stock que se había descontado.
    if (decision === "rechazada")
      await supabase.rpc("restaurar_stock_pedido", { p_pedido_id: pedido.id });
  }

  await enviarNotificacionReceta(recetaId, decision, motivoRechazo);

  revalidatePath("/admin/recetas");
  revalidatePath("/admin/pedidos");
  return { ok: true };
}

/** URL firmada (10 min) para que el staff vea el archivo de una receta. */
export async function obtenerUrlReceta(
  recetaId: string,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const staff = await obtenerStaffActual();
  if (!staff) return { ok: false, error: "No autorizado." };

  const supabase = createAdminClient();
  const { data: receta } = await supabase
    .from("recetas")
    .select("archivo_url")
    .eq("id", recetaId)
    .single();
  if (!receta) return { ok: false, error: "Receta no encontrada." };

  const { data, error } = await supabase.storage
    .from("recetas")
    .createSignedUrl(receta.archivo_url, 600);
  if (error || !data) return { ok: false, error: "No se pudo generar el enlace." };
  return { ok: true, url: data.signedUrl };
}

export async function actualizarProducto(
  productoId: string,
  campos: {
    activo_online?: boolean;
    categoria_id?: string | null;
    condicion_venta?: string | null;
    precio_venta?: number;
    stock_actual?: number;
    descripcion?: string | null;
  },
): Promise<{ ok: boolean; error?: string }> {
  const staff = await obtenerStaffActual();
  if (!staff) return { ok: false, error: "No autorizado." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("productos")
    .update(campos)
    .eq("id", productoId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/productos");
  return { ok: true };
}

/**
 * Confirma la clasificación ISP de UN producto (cola de revisión manual en
 * /admin/clasificacion) -- solo química farmacéutico/admin, mismo requisito
 * legal que resolverReceta: un script no reemplaza esta firma.
 */
export async function confirmarClasificacion(
  productoId: string,
  campos: { es_medicamento: boolean; condicion_venta: string | null },
): Promise<{ ok: boolean; error?: string }> {
  const staff = await obtenerStaffActual();
  if (!staff) return { ok: false, error: "No autorizado." };
  if (staff.rol !== "quimico_farmaceutico" && staff.rol !== "admin")
    return {
      ok: false,
      error: "Solo el químico farmacéutico puede confirmar la clasificación.",
    };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("productos")
    .update({
      es_medicamento: campos.es_medicamento,
      condicion_venta: campos.condicion_venta,
      clasificacion_revisada: true,
    })
    .eq("id", productoId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/clasificacion");
  return { ok: true };
}

/**
 * Confirma en lote los productos de "confianza alta" (ver migración
 * confirmar_clasificacion_alta_confianza) -- deja fuera a propósito todos los
 * casos ambiguos, esos siempre pasan por confirmarClasificacion().
 */
export async function confirmarClasificacionAltaConfianza(): Promise<{
  ok: boolean;
  confirmados?: number;
  error?: string;
}> {
  const staff = await obtenerStaffActual();
  if (!staff) return { ok: false, error: "No autorizado." };
  if (staff.rol !== "quimico_farmaceutico" && staff.rol !== "admin")
    return {
      ok: false,
      error: "Solo el químico farmacéutico puede confirmar la clasificación.",
    };

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc(
    "confirmar_clasificacion_alta_confianza",
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/clasificacion");
  return { ok: true, confirmados: data as number };
}

export async function responderReclamo(
  reclamoId: string,
  respuesta: string,
  estado: "en_proceso" | "resuelto",
): Promise<{ ok: boolean; error?: string }> {
  const staff = await obtenerStaffActual();
  if (!staff) return { ok: false, error: "No autorizado." };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("reclamos")
    .update({ respuesta, estado })
    .eq("id", reclamoId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/reclamos");
  return { ok: true };
}
