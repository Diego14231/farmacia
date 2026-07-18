"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { obtenerStaffActual } from "./auth";
import type { EstadoPedido } from "@/types/database";

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
  }

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
