/**
 * Prueba en seco del mapeo de categorías (sin base de datos):
 * lee el Excel real y muestra la distribución + muestras por categoría.
 *
 * Uso: npx tsx scripts/test-clasificacion-categorias.ts <inventario.xlsx>
 */
import { readFileSync } from "node:fs";
import * as XLSX from "xlsx";
import { clasificarProducto } from "../src/config/categorias";

const pathExcel = process.argv[2];
if (!pathExcel) {
  console.error("Uso: npx tsx scripts/test-clasificacion-categorias.ts <inventario.xlsx>");
  process.exit(1);
}

const wb = XLSX.read(readFileSync(pathExcel));
const hoja = wb.Sheets[wb.SheetNames[0]];
const filas = XLSX.utils.sheet_to_json<string[]>(hoja, { header: 1, raw: false, defval: "" });
const [, ...datos] = filas;

const porCategoria = new Map<string, string[]>();
for (const fila of datos) {
  const [, nombre, , , , , , , depto] = fila;
  if (!nombre?.trim()) continue;
  const slug = clasificarProducto(nombre, depto);
  if (!porCategoria.has(slug)) porCategoria.set(slug, []);
  porCategoria.get(slug)!.push(nombre.trim());
}

for (const [slug, items] of [...porCategoria.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`\n=== ${slug} (${items.length}) ===`);
  for (const n of items.slice(0, 8)) console.log(`  ${n.slice(0, 70)}`);
}
