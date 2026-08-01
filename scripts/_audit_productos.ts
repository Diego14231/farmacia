/**
 * Auditoria de solo lectura: estado actual de la tabla productos.
 * Uso: npx tsx scripts/_audit_productos.ts
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
  cargarEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, key);

  const { count: total } = await supabase
    .from("productos")
    .select("*", { count: "exact", head: true });
  console.log("Total productos:", total);

  for (const col of ["descripcion", "es_medicamento", "condicion_venta", "principio_activo", "registro_isp"]) {
    if (col === "es_medicamento") {
      const { count: c } = await supabase
        .from("productos")
        .select("*", { count: "exact", head: true })
        .eq("es_medicamento", true);
      console.log(`  es_medicamento=true: ${c}`);
      continue;
    }
    const { count: nonNull } = await supabase
      .from("productos")
      .select("*", { count: "exact", head: true })
      .not(col, "is", null);
    console.log(`  ${col} no nulo: ${nonNull}`);
  }

  const { count: activos } = await supabase
    .from("productos")
    .select("*", { count: "exact", head: true })
    .eq("activo_online", true);
  console.log("activo_online=true:", activos);

  const { data: categorias } = await supabase.from("categorias").select("id, nombre, slug");
  console.log("\nCategorias:", categorias?.length);
  console.log(categorias);

  const { data: sample } = await supabase
    .from("productos")
    .select("sku_codigo, nombre, descripcion, precio_venta, categoria_id, departamento_original, es_medicamento, condicion_venta, principio_activo")
    .limit(8);
  console.log("\nMuestra:");
  console.log(sample);

  const { data: junk } = await supabase
    .from("productos")
    .select("sku_codigo, nombre, departamento_original")
    .in("nombre", ["30", "451 COLONIA INGLESA X 400 ML", "AB ANTITUSIVO"]);
  console.log("\nProductos junk de la pantalla:");
  console.log(junk);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
