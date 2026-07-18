"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function enviarReclamo(datos: {
  email: string;
  mensaje: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!datos.email?.trim() || !datos.mensaje?.trim())
    return { ok: false, error: "Email y mensaje son obligatorios." };
  if (datos.mensaje.length > 5000)
    return { ok: false, error: "El mensaje es demasiado largo." };

  const supabase = createAdminClient();

  // Si el email corresponde a un cliente conocido, se asocia el reclamo
  const { data: cliente } = await supabase
    .from("clientes")
    .select("id")
    .eq("email", datos.email.trim().toLowerCase())
    .maybeSingle();

  const { error } = await supabase.from("reclamos").insert({
    cliente_id: cliente?.id ?? null,
    mensaje: `[${datos.email.trim()}] ${datos.mensaje.trim()}`,
  });
  if (error) {
    console.error("enviarReclamo:", error);
    return { ok: false, error: "No se pudo registrar el reclamo." };
  }
  return { ok: true };
}
