/**
 * Copia el numero de registro ISP real (ya scrapeado por
 * clasificar_medicamentos.py) desde clasificacion_detalle a la columna
 * registro_isp -- SOLO para los casos de un unico candidato confiable
 * ("Registro ISP X — Laboratorio — Principio activo: Y"), nunca para
 * ambiguos con varios candidatos (ahi no hay forma de saber cual es el
 * correcto sin inventar, ver .claude/skills/farmacia-compliance).
 *
 * Uso:
 *   npx tsx scripts/_completar_registro_isp.ts            (dry-run)
 *   npx tsx scripts/_completar_registro_isp.ts --write     (escribe)
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

const WRITE = process.argv.includes("--write");
const PATRON = /^Registro ISP\s+([A-Z0-9./-]+)\s*—/i;

async function main() {
  cargarEnvLocal();
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const PAGE = 1000;
  let desde = 0;
  const filas: any[] = [];
  for (;;) {
    const { data, error } = await supabase
      .from("productos")
      .select("sku_codigo, nombre, precio_venta, clasificacion_detalle, registro_isp")
      .not("clasificacion_detalle", "is", null)
      .is("registro_isp", null)
      .range(desde, desde + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    filas.push(...data);
    if (data.length < PAGE) break;
    desde += PAGE;
  }
  console.log(`Filas con detalle y sin registro_isp: ${filas.length}`);

  const updates = [];
  for (const f of filas) {
    const m = f.clasificacion_detalle.match(PATRON);
    if (!m) continue;
    updates.push({ sku_codigo: f.sku_codigo, nombre: f.nombre, precio_venta: f.precio_venta, registro_isp: m[1] });
  }
  console.log(`Con "Registro ISP X —" confiable (1 solo candidato): ${updates.length}`);
  console.log("Muestra:", updates.slice(0, 5));

  if (!WRITE) {
    console.log("\n[DRY RUN] No se escribio nada. Corre con --write para aplicar.");
    return;
  }

  const LOTE = 500;
  let hechos = 0;
  for (let i = 0; i < updates.length; i += LOTE) {
    const lote = updates.slice(i, i + LOTE);
    const { error } = await supabase.from("productos").upsert(lote, { onConflict: "sku_codigo" });
    if (error) throw new Error(`Error en lote ${i / LOTE + 1}: ${error.message}`);
    hechos += lote.length;
    console.log(`  upsert ${hechos}/${updates.length}`);
  }
  console.log("Escritura completa.");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
