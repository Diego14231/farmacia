"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { enviarEmail, plantillaBase } from "@/lib/email";

export interface DatosRegistro {
  authUserId: string;
  nombre: string;
  email: string;
  telefono?: string;
}

/**
 * Crea (o vincula) la ficha en `clientes` de un cliente que se acaba de
 * registrar con Supabase Auth. El signUp() en sí ocurre en el navegador (ver
 * /registro) -- esto solo persiste el perfil y dispara las notificaciones.
 *
 * Find-or-create por email, igual que crearPedido(): si la persona ya había
 * comprado como invitado con este email, esta cuenta nueva se vincula a esa
 * misma fila (y de paso hereda el historial de pedidos) en vez de duplicarla.
 */
export async function crearFichaCliente(
  datos: DatosRegistro,
): Promise<{ ok: boolean; error?: string }> {
  const email = datos.email.trim().toLowerCase();
  const nombre = datos.nombre.trim();
  if (!email || !nombre) return { ok: false, error: "Faltan datos obligatorios." };

  const supabase = createAdminClient();

  const { data: existente } = await supabase
    .from("clientes")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existente) {
    const { error } = await supabase
      .from("clientes")
      .update({
        auth_user_id: datos.authUserId,
        nombre,
        telefono: datos.telefono?.trim() || null,
      })
      .eq("id", existente.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("clientes").insert({
      auth_user_id: datos.authUserId,
      nombre,
      email,
      telefono: datos.telefono?.trim() || null,
    });
    if (error) return { ok: false, error: error.message };
  }

  await Promise.all([
    enviarEmail({
      to: email,
      subject: "¡Bienvenido a Farmacias AhorraBien!",
      html: plantillaBase(
        "Tu cuenta ya está lista",
        `<p>Hola ${nombre}, gracias por crear tu cuenta. Desde ahora puedes ver el estado de tus pedidos y recetas en <strong>Mi cuenta</strong>.</p>`,
      ),
    }),
    enviarNotificacionNuevoRegistro(nombre, email),
  ]);

  return { ok: true };
}

async function enviarNotificacionNuevoRegistro(nombre: string, email: string) {
  const destino = process.env.EMAIL_NOTIFICACIONES_REGISTRO;
  if (!destino) return;
  await enviarEmail({
    to: destino,
    subject: "Nuevo cliente registrado",
    html: plantillaBase(
      "Nuevo registro en el sitio",
      `<p><strong>${nombre}</strong> (${email}) acaba de crear una cuenta en la tienda online.</p>`,
    ),
  });
}
