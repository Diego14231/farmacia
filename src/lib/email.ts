import "server-only";

import { Resend } from "resend";

/**
 * Envoltorio de envío de email. Si RESEND_API_KEY no está configurado (ej.
 * en desarrollo local sin cuenta de Resend), no falla -- solo deja registro
 * en consola, igual que el patrón ya usado para MERCADO_PAGO_ACCESS_TOKEN.
 */

let cliente: Resend | null = null;

function obtenerCliente(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!cliente) cliente = new Resend(apiKey);
  return cliente;
}

// "onboarding@resend.dev" es la dirección de pruebas de Resend -- funciona
// sin verificar un dominio propio, pero solo entrega a la cuenta dueña de la
// API key. Cuando la farmacia tenga su dominio verificado en Resend, cambiar
// RESEND_FROM_EMAIL a algo como "Farmacias AhorraBien <pedidos@ahorrabien.cl>".
const FROM = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

export async function enviarEmail(datos: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const resend = obtenerCliente();
  if (!resend) {
    console.warn(
      `RESEND_API_KEY no configurado -- email no enviado ("${datos.subject}" a ${datos.to}).`,
    );
    return;
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: datos.to,
      subject: datos.subject,
      html: datos.html,
    });
    if (error) console.error("enviarEmail:", error);
  } catch (e) {
    console.error("enviarEmail:", e);
  }
}

const URL_SEGUIMIENTO = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/pedido`
  : null;

/** Envoltura visual común para todos los emails transaccionales. */
export function plantillaBase(titulo: string, cuerpoHtml: string): string {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 480px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="color: #0f7a4f; margin-bottom: 4px;">Farmacias AhorraBien</h2>
      <h3 style="margin-top: 0;">${titulo}</h3>
      ${cuerpoHtml}
      ${
        URL_SEGUIMIENTO
          ? `<p style="margin-top: 24px; font-size: 12px; color: #666;">
               Puedes revisar el estado de tu pedido en cualquier momento en
               <a href="${URL_SEGUIMIENTO}">Seguimiento de pedido</a>.
             </p>`
          : ""
      }
    </div>
  `;
}
