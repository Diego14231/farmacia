/**
 * Crea un usuario de staff (auth + fila en la tabla staff).
 *
 * Uso:
 *   npx tsx scripts/crear-staff.ts <email> <password> <nombre> <rol>
 *   npx tsx scripts/crear-staff.ts admin@ahorrabien.cl cambiame123 "Diego" admin
 *
 * Roles válidos: admin | quimico_farmaceutico | bodega
 * Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

function cargarEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const linea of readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const m = linea.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

async function main() {
  const [email, password, nombre, rol] = process.argv.slice(2);
  if (!email || !password || !nombre || !rol) {
    console.error("Uso: npx tsx scripts/crear-staff.ts <email> <password> <nombre> <rol>");
    process.exit(1);
  }
  if (!["admin", "quimico_farmaceutico", "bodega"].includes(rol)) {
    console.error("Rol inválido. Usa: admin | quimico_farmaceutico | bodega");
    process.exit(1);
  }

  cargarEnvLocal();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: usuario, error: errAuth } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
  if (errAuth) {
    console.error("Error creando usuario auth:", errAuth.message);
    process.exit(1);
  }

  const { error: errStaff } = await supabase.from("staff").insert({
    auth_user_id: usuario.user.id,
    nombre,
    rol,
  });
  if (errStaff) {
    console.error("Error creando fila staff:", errStaff.message);
    process.exit(1);
  }

  console.log(`Staff creado: ${nombre} <${email}> (${rol})`);
}

main();
