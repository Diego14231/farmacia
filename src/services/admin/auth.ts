import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { RolStaff } from "@/types/database";

export interface StaffActual {
  id: string;
  nombre: string;
  rol: RolStaff;
}

/**
 * Devuelve el registro de staff del usuario autenticado, o null si no hay
 * sesión o el usuario no es staff activo. Todas las páginas y server
 * actions del panel admin deben pasar por aquí.
 */
export async function obtenerStaffActual(): Promise<StaffActual | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: staff } = await supabase
    .from("staff")
    .select("id, nombre, rol")
    .eq("auth_user_id", user.id)
    .eq("activo", true)
    .maybeSingle();

  return (staff as StaffActual | null) ?? null;
}
