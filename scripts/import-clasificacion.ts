/**
 * Importa la salida de scripts/clasificar_medicamentos.py como SUGERENCIA de
 * clasificación ISP (staging) -- ver docs/PLAN-FARMACIA-ONLINE.md sección 9 y
 * supabase/migrations/20260718180000_clasificacion_isp_staging.sql.
 *
 * A propósito NO toca es_medicamento/condicion_venta/registro_isp (los
 * campos reales) -- solo llena clasificacion_sugerida_* para que la Química
 * Farmacéutica los revise y confirme desde /admin/clasificacion. No inserta
 * productos nuevos: si un "Código" del CSV no matchea ningún sku_codigo
 * existente, esa fila se reporta y se salta (no se pierde nada, pero tampoco
 * se crea un producto a medias).
 *
 * Uso:
 *   npx tsx scripts/import-clasificacion.ts "C:\ruta\clasificacion_salida.csv"
 *   (también acepta el .xlsx generado por csv_a_excel_seguro.py)
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";

function cargarEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const linea of readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const m = linea.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// Concurrencia limitada -- 4.986 updates uno por uno sería muy lento, pero
// mandarlos todos a la vez satura la conexión local de Supabase.
async function conConcurrencia<T>(
  items: T[],
  limite: number,
  fn: (item: T, i: number) => Promise<void>,
) {
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: limite }, worker));
}

async function main() {
  const pathArchivo = process.argv[2];
  if (!pathArchivo) {
    console.error(
      "Uso: npx tsx scripts/import-clasificacion.ts <clasificacion_salida.csv|.xlsx>",
    );
    process.exit(1);
  }
  if (!existsSync(pathArchivo)) {
    console.error(`No existe el archivo: ${pathArchivo}`);
    process.exit(1);
  }

  cargarEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY (en .env.local o el ambiente).",
    );
    process.exit(1);
  }
  const supabase = createClient(url, serviceKey);

  // --- Leer CSV/XLSX ------------------------------------------------------
  const wb = XLSX.readFile(pathArchivo, { raw: false });
  const hoja = wb.Sheets[wb.SheetNames[0]];
  const filas = XLSX.utils.sheet_to_json<string[]>(hoja, {
    header: 1,
    raw: false,
    defval: "",
  });
  const [header, ...datos] = filas;
  const idx = (nombre: string) => {
    const i = header.indexOf(nombre);
    if (i === -1) throw new Error(`Falta la columna "${nombre}" en ${pathArchivo}`);
    return i;
  };
  const iCodigo = idx("Código");
  const iEsMedicamento = idx("Es Medicamento");
  const iRequiereReceta = idx("Requiere Receta");
  const iRevisarManual = idx("Revisar Manual");
  const iDetalle = idx("Detalle");

  console.log(`Filas en ${path.basename(pathArchivo)}: ${datos.length}`);

  // Por si el CSV trae algún código repetido entre corridas: se queda con
  // la última aparición (la más reciente).
  const porCodigo = new Map<string, (typeof datos)[number]>();
  for (const fila of datos) {
    const codigo = String(fila[iCodigo] ?? "").trim();
    if (codigo) porCodigo.set(codigo, fila);
  }
  const filasUnicas = [...porCodigo.entries()];
  console.log(`Códigos únicos: ${filasUnicas.length}`);

  let actualizados = 0;
  let sinMatch = 0;
  let errores = 0;
  const sinMatchEjemplos: string[] = [];

  await conConcurrencia(filasUnicas, 20, async ([codigo, fila]) => {
    const { data, error } = await supabase
      .from("productos")
      .update({
        clasificacion_sugerida_medicamento: fila[iEsMedicamento] || null,
        clasificacion_sugerida_receta: fila[iRequiereReceta] || null,
        clasificacion_detalle: fila[iDetalle] || null,
        clasificacion_revisar_manual: fila[iRevisarManual] === "SI",
      })
      .eq("sku_codigo", codigo)
      .select("id");

    if (error) {
      errores++;
      console.error(`  error en ${codigo}: ${error.message}`);
      return;
    }
    if (!data?.length) {
      sinMatch++;
      if (sinMatchEjemplos.length < 10) sinMatchEjemplos.push(codigo);
      return;
    }
    actualizados++;
    if (actualizados % 500 === 0) console.log(`  ${actualizados} actualizados...`);
  });

  console.log("\nImportación completa.");
  console.log(`  actualizados: ${actualizados}`);
  console.log(`  sin match (no existen en productos): ${sinMatch}`);
  console.log(`  errores: ${errores}`);
  if (sinMatchEjemplos.length)
    console.log(`  ejemplos sin match: ${sinMatchEjemplos.join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
