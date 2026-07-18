/**
 * ETL: importa el Excel del inventario de Farmacia AhorraBien a Supabase.
 *
 * - Parsea precios con formato texto ("$14,990" -> 14990) y stock ("2.00" -> 2).
 * - Crea las categorías de src/config/categorias.ts y mapea cada producto a
 *   una (fallback: "Por Clasificar").
 * - Upsert por sku_codigo: correrlo dos veces no duplica; actualiza precios
 *   y stock de lo existente.
 * - Los campos de clasificación ISP (es_medicamento, condicion_venta,
 *   registro_isp) quedan en su valor por defecto — se llenan después con la
 *   salida revisada de scripts/clasificar_medicamentos.py.
 *
 * Uso:
 *   npx tsx scripts/import-inventario.ts "C:\ruta\inventario1.xlsx"
 *
 * Requiere en .env.local (o en el ambiente):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import * as XLSX from "xlsx";
import { CATEGORIAS, clasificarProducto } from "../src/config/categorias";

function cargarEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const linea of readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const m = linea.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

function parsearPrecio(valor: unknown): number | null {
  if (valor == null || valor === "") return null;
  const limpio = String(valor).replace(/[$.\s]/g, "").replace(/,/g, "");
  const n = Number(limpio);
  return Number.isFinite(n) ? n : null;
}

function parsearStock(valor: unknown): number {
  const n = Number(String(valor ?? "0").replace(/,/g, "."));
  return Number.isFinite(n) ? Math.round(n) : 0;
}

async function main() {
  const pathExcel = process.argv[2];
  if (!pathExcel) {
    console.error("Uso: npx tsx scripts/import-inventario.ts <inventario.xlsx>");
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

  // --- Leer Excel -------------------------------------------------------
  const wb = XLSX.read(readFileSync(pathExcel));
  const hoja = wb.Sheets[wb.SheetNames[0]];
  // header:1 -> array de arrays; el Excel real trae los códigos de barra
  // como texto, y raw:false preserva el formato mostrado.
  const filas = XLSX.utils.sheet_to_json<string[]>(hoja, {
    header: 1,
    raw: false,
    defval: "",
  });
  const [, ...datos] = filas; // primera fila = header
  console.log(`Filas de datos en el Excel: ${datos.length}`);

  // --- Upsert categorías --------------------------------------------------
  const { error: errCat } = await supabase
    .from("categorias")
    .upsert(
      CATEGORIAS.map((c) => ({ nombre: c.nombre, slug: c.slug, orden: c.orden })),
      { onConflict: "slug" },
    );
  if (errCat) throw new Error(`Error creando categorías: ${errCat.message}`);

  const { data: cats, error: errCats } = await supabase
    .from("categorias")
    .select("id, slug");
  if (errCats || !cats) throw new Error(`Error leyendo categorías: ${errCats?.message}`);
  const slugAId = new Map(cats.map((c) => [c.slug, c.id]));

  // --- Transformar productos ----------------------------------------------
  const porCategoria = new Map<string, number>();
  const vistos = new Set<string>();
  const productos = [];
  for (const fila of datos) {
    const [codigo, nombre, pCosto, pVenta, pMayoreo, existencia, invMin, invMax, depto] = fila;
    if (!nombre?.trim()) continue;
    const sku = String(codigo).trim();
    if (!sku || vistos.has(sku)) continue; // sku vacío o duplicado: saltar
    vistos.add(sku);

    const precioVenta = parsearPrecio(pVenta);
    if (precioVenta == null || precioVenta <= 0) continue; // sin precio no se puede vender

    const slug = clasificarProducto(nombre, depto);
    porCategoria.set(slug, (porCategoria.get(slug) ?? 0) + 1);

    productos.push({
      sku_codigo: sku,
      nombre: nombre.trim(),
      categoria_id: slugAId.get(slug),
      precio_costo: parsearPrecio(pCosto),
      precio_venta: precioVenta,
      precio_mayorista: parsearPrecio(pMayoreo),
      stock_actual: parsearStock(existencia),
      stock_minimo: parsearStock(invMin),
      stock_maximo: parsearStock(invMax) || null,
      departamento_original: depto?.trim() || null,
      // activo_online queda en false (default) hasta el lanzamiento — ver
      // sección 2.4 del plan.
    });
  }
  console.log(`Productos válidos a importar: ${productos.length}`);
  console.log("Distribución por categoría propuesta:");
  for (const [slug, n] of [...porCategoria.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${slug}: ${n}`);
  }

  // --- Upsert en lotes ------------------------------------------------------
  const LOTE = 500;
  let importados = 0;
  for (let i = 0; i < productos.length; i += LOTE) {
    const lote = productos.slice(i, i + LOTE);
    const { error } = await supabase
      .from("productos")
      .upsert(lote, { onConflict: "sku_codigo" });
    if (error) {
      console.error(`Error en lote ${i / LOTE + 1}: ${error.message}`);
      process.exit(1);
    }
    importados += lote.length;
    console.log(`  upsert ${importados}/${productos.length}`);
  }
  console.log("Importación completa.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
