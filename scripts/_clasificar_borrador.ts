/**
 * Borrador automatico de descripcion / es_medicamento / condicion_venta /
 * principio_activo para toda la tabla `productos`.
 *
 * IMPORTANTE: esto es una heuristica, no una clasificacion legal. Todo lo
 * que caiga en 'no_vendible_online' o no tenga principio_activo detectado
 * queda marcado a proposito como pendiente de revision de la Quimica
 * Farmaceutica (ver docs/PLAN-FARMACIA-ONLINE.md secc. 9). No toca
 * `activo_online` ni ninguna otra columna.
 *
 * Uso:
 *   npx tsx scripts/_clasificar_borrador.ts            (dry-run, solo imprime)
 *   npx tsx scripts/_clasificar_borrador.ts --write     (escribe en Supabase)
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

const WRITE = process.argv.includes("--write");

// =========================================================================
// Diccionario de principios activos -> clasificacion (borrador, best-effort
// segun normativa chilena tipica). NO reemplaza el registro ISP real.
// =========================================================================
type Cond = "directa" | "receta_simple" | "receta_retenida" | "receta_cheque";
const DICCIONARIO: Array<[RegExp, Cond]> = [
  // Receta Cheque (psicotropicos/estupefacientes de control estricto)
  [/\b(ALPRAZOLAM|CLONAZEPAM|DIAZEPAM|LORAZEPAM|MIDAZOLAM|ZOLPIDEM|METILFENIDATO|MORFINA|METADONA|FENTANIL|OXICODONA)\b/i, "receta_cheque"],
  // Receta Retenida (opioides debiles / control de precursores)
  [/\b(TRAMADOL|CODEINA|PSEUDOEFEDRINA|ISOTRETINOINA)\b/i, "receta_retenida"],
  // Receta Simple (mayoria de antibioticos, cronicos, psicofarmacos comunes)
  [/\b(AMOXICILINA|ACICLOVIR|AZITROMICINA|CEFADROXILO|CIPROFLOXACINO|CLARITROMICINA|DOXICICLINA|METRONIDAZOL|FLUCONAZOL|CLINDAMICINA|LOSARTAN|ENALAPRIL|ATORVASTATINA|METFORMINA|GLIBENCLAMIDA|LEVOTIROXINA|SERTRALINA|FLUOXETINA|PAROXETINA|ESCITALOPRAM|MELOXICAM|DICLOFENACO|NAPROXENO|PREDNISONA|FLUNARIZINA|DOMPERIDONA|OLOPATADINA|SILDENAFIL|TADALAFIL|FINASTERIDE|LEVONORGESTREL|ETINILESTRADIOL|BETAMETASONA)\b/i, "receta_simple"],
  // Directa (OTC comun)
  [/\b(PARACETAMOL|IBUPROFENO|AMBROXOL|BROMHEXINA|LORATADINA|CETIRIZINA|CLORFENAMINA|DIMENHIDRINATO|LOPERAMIDA|OMEPRAZOL|RANITIDINA|ACIDO ACETILSALICILICO|GUAIFENESINA|SIMETICONA|MACROGOL|MENTOL|MELATONINA)\b/i, "directa"],
];

function clasificarPorIngrediente(texto: string): Cond | null {
  for (const [re, cond] of DICCIONARIO) {
    if (re.test(texto)) return cond;
  }
  return null;
}

const NON_MED_SLUGS = new Set([
  "perfumeria-y-belleza",
  "cuidado-personal",
  "cuidado-de-la-piel",
  "insumos-medicos",
  "vitaminas-y-suplementos",
  "productos-naturales",
]);

const FORMA_SHAPE = /\d\s?(MG|MCG|UI)\b|\b(COMPRIMIDOS?|CAPSULAS?|JARABE|GOTAS|INYECTABLE|SUPOSITORIO|OVULOS?|AMPOLLA|GRAGEAS?|COM|COMP|CAPS?|JBE|GTS|SUSP|AMP)\b/i;

// =========================================================================
// Extraccion de principio activo desde el nombre: "(PARACETAMOL)" o
// "(CLORFENAMINA+CODEINA+PSEUDOEFEDRINA)"
// =========================================================================
function extraerPrincipioActivo(nombre: string): string | null {
  const m = nombre.match(/\(([A-ZÁÉÍÓÚÑ0-9+/ .-]{4,60})\)\s*$/i);
  if (!m) return null;
  return m[1].toUpperCase().replace(/\s*\+\s*/g, "//").trim();
}

// =========================================================================
// Presentacion aproximada desde el nombre (para la descripcion)
// =========================================================================
function extraerPresentacion(nombre: string): string | null {
  let m = nombre.match(/(\d+)\s?(COMP|COM|CAPS?|CAP|GRAGEAS?)\b\.?/i);
  if (m) return `${m[1]} comp./caps.`;
  m = nombre.match(/(\d+)\s?(ML|CC)\b/i);
  if (m) return `${m[1]} mL`;
  m = nombre.match(/(\d+)\s?(GR|G)\b/i);
  if (m) return `${m[1]} g`;
  m = nombre.match(/(\d+)\s?SOBRES?\b/i);
  if (m) return `${m[1]} sobres`;
  m = nombre.match(/(\d+)\s?AMPOLLAS?\b/i);
  if (m) return `${m[1]} ampollas`;
  m = nombre.match(/(\d+)\s?GOTAS?\b/i);
  if (m) return `${m[1]} gotas`;
  return null;
}

function limpiarNombre(nombre: string): string {
  return nombre.replace(/\s*\([A-ZÁÉÍÓÚÑ0-9+/ .-]{4,60}\)\s*$/i, "").trim();
}

function generarDescripcion(nombre: string, principioActivo: string | null, presentacion: string | null): string {
  const base = limpiarNombre(nombre).replace(/\.+$/, "");
  const partes = [base + "."];
  if (principioActivo) partes.push(`Principio activo: ${principioActivo}.`);
  if (presentacion) partes.push(`Presentación: ${presentacion.replace(/\.+$/, "")}.`);
  return partes.join(" ");
}

// =========================================================================
// Excel de tu hermana: mapa nombre -> principio activo (dato humano, pisa
// a la heuristica cuando exista)
// =========================================================================
function cargarMapaExcel(): Map<string, string> {
  const mapa = new Map<string, string>();
  const rutaExcel = "C:/Users/donpi/Desktop/farmaciaExcel/Inventario_Clasificacion_ISP_Ahorrabien.xlsx";
  if (!existsSync(rutaExcel)) return mapa;
  const wb = XLSX.readFile(rutaExcel);

  const agregar = (hoja: string, colNombre: number, colPrincipio: number) => {
    const rows = XLSX.utils.sheet_to_json<string[]>(wb.Sheets[hoja], { header: 1, defval: "" });
    for (const r of rows.slice(1)) {
      const nombre = String(r[colNombre] ?? "").trim().toUpperCase();
      const principio = String(r[colPrincipio] ?? "").trim().toUpperCase();
      if (!nombre || !principio || principio.startsWith("POR COMPLETAR")) continue;
      mapa.set(nombre, principio);
    }
  };
  agregar("Tabla 1 - 1 p.activo", 2, 0);
  agregar("Tabla 2 - 2 o 3 p.activos", 2, 0);
  agregar("Tabla 3 - Combinac. multip", 1, 0);
  agregar("Por clasificar - Revisar", 0, 5);
  return mapa;
}

async function main() {
  cargarEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, key);

  const { data: categorias } = await supabase.from("categorias").select("id, slug");
  const catIdASlug = new Map((categorias ?? []).map((c) => [c.id, c.slug]));

  const mapaExcel = cargarMapaExcel();
  console.log(`Mapa de principio_activo desde el Excel de tu hermana: ${mapaExcel.size} nombres`);

  // --- Paginar toda la tabla productos ---
  const PAGE = 1000;
  let desde = 0;
  const productos: any[] = [];
  for (;;) {
    const { data, error } = await supabase
      .from("productos")
      .select("id, sku_codigo, nombre, precio_venta, descripcion, es_medicamento, condicion_venta, principio_activo, categoria_id")
      .range(desde, desde + PAGE - 1)
      .order("sku_codigo");
    if (error) throw error;
    if (!data || data.length === 0) break;
    productos.push(...data);
    if (data.length < PAGE) break;
    desde += PAGE;
  }
  console.log(`Productos leidos: ${productos.length}`);

  const stats = {
    descripcionNueva: 0,
    principioActivoNuevo: 0,
    clasificacionNueva: 0,
    clasificacionMantenida: 0,
    condicionVenta: new Map<string, number>(),
  };

  const updates: Array<{
    sku_codigo: string;
    descripcion?: string;
    principio_activo?: string;
    es_medicamento?: boolean;
    condicion_venta?: string;
  }> = [];

  for (const p of productos) {
    const slug = catIdASlug.get(p.categoria_id) ?? "por-clasificar";
    // nombre/precio_venta van siempre: Postgres exige columnas NOT NULL sin
    // default en el candidato de INSERT del upsert, aunque el valor no cambie.
    const update: any = { sku_codigo: p.sku_codigo, nombre: p.nombre, precio_venta: p.precio_venta };
    let cambiaAlgo = false;

    // --- principio_activo ---
    // Nota: supabase-js upsert() une las claves de TODOS los objetos del lote
    // en un solo INSERT columnar -- si una fila no trae una clave que otra
    // del mismo lote si trae, esa fila manda NULL para esa columna y borra
    // el valor existente. Por eso esta columna (y las de abajo) se
    // incluyen SIEMPRE con su valor final (nuevo o el que ya tenia).
    let principioActivo: string | null = p.principio_activo ?? null;
    if (!principioActivo) {
      principioActivo =
        extraerPrincipioActivo(p.nombre) ??
        mapaExcel.get(p.nombre.trim().toUpperCase()) ??
        null;
      if (principioActivo) {
        cambiaAlgo = true;
        stats.principioActivoNuevo++;
      }
    }
    update.principio_activo = principioActivo;

    // --- es_medicamento / condicion_venta (solo si condicion_venta viene nula;
    // es_medicamento es NOT NULL default false en el schema, no sirve para
    // detectar "sin clasificar") ---
    if (p.condicion_venta == null) {
      let esMedicamento: boolean;
      let condicionVenta: Cond | "no_vendible_online";

      if (NON_MED_SLUGS.has(slug)) {
        esMedicamento = false;
        condicionVenta = "directa";
      } else if (slug === "salud-sexual") {
        const cond = clasificarPorIngrediente(principioActivo ?? p.nombre);
        if (cond) {
          esMedicamento = true;
          condicionVenta = cond;
        } else if (/\b(PRESERVATIVO|CONDON|LUBRICANTE)\b/i.test(p.nombre)) {
          esMedicamento = false;
          condicionVenta = "directa";
        } else {
          esMedicamento = true;
          condicionVenta = "no_vendible_online";
        }
      } else {
        // medicamentos / por-clasificar
        const cond = clasificarPorIngrediente(principioActivo ?? p.nombre);
        if (cond) {
          esMedicamento = true;
          condicionVenta = cond;
        } else if (FORMA_SHAPE.test(p.nombre)) {
          esMedicamento = true;
          condicionVenta = "no_vendible_online"; // pendiente revision QF
        } else {
          esMedicamento = false;
          condicionVenta = "directa";
        }
      }

      update.es_medicamento = esMedicamento;
      update.condicion_venta = condicionVenta;
      cambiaAlgo = true;
      stats.clasificacionNueva++;
      stats.condicionVenta.set(condicionVenta, (stats.condicionVenta.get(condicionVenta) ?? 0) + 1);
    } else {
      // se respeta lo existente, pero igual va explicito en el payload
      update.es_medicamento = p.es_medicamento;
      update.condicion_venta = p.condicion_venta;
      stats.clasificacionMantenida++;
    }

    // --- descripcion ---
    if (!p.descripcion) {
      const presentacion = extraerPresentacion(p.nombre);
      update.descripcion = generarDescripcion(p.nombre, principioActivo, presentacion);
      cambiaAlgo = true;
      stats.descripcionNueva++;
    } else {
      update.descripcion = p.descripcion;
    }

    if (cambiaAlgo) updates.push(update);
  }

  console.log("\n--- Resumen ---");
  console.log("Descripciones nuevas:", stats.descripcionNueva);
  console.log("principio_activo nuevos:", stats.principioActivoNuevo);
  console.log("Clasificaciones nuevas (es_medicamento/condicion_venta):", stats.clasificacionNueva);
  console.log("Clasificaciones existentes respetadas (no tocadas):", stats.clasificacionMantenida);
  console.log("Distribucion condicion_venta (solo las nuevas):", Object.fromEntries(stats.condicionVenta));
  console.log("\nFilas a actualizar:", updates.length);
  console.log("\nMuestra (10):");
  console.log(JSON.stringify(updates.slice(0, 10), null, 2));

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
