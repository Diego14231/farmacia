import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con service role — SOLO para server actions / route handlers.
 * Salta RLS, así que cada uso debe validar la entrada por su cuenta.
 * Nunca importar desde componentes de cliente ("server-only" lo impide
 * en build).
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
