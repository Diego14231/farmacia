/**
 * Segunda pasada de borrador para condicion_venta/es_medicamento/
 * principio_activo, usando datos reales del ISP que ya scrapeo
 * clasificar_medicamentos.py (columna clasificacion_detalle), en vez de
 * solo adivinar por el nombre comercial.
 *
 * SOLO toca filas con clasificacion_revisada = false (o sea, nunca las que
 * ya confirmo de verdad la Quimica Farmaceutica desde /admin/clasificacion).
 * Sigue siendo borrador -- no marca clasificacion_revisada.
 *
 * Uso:
 *   npx tsx scripts/_clasificar_borrador_v2.ts            (dry-run)
 *   npx tsx scripts/_clasificar_borrador_v2.ts --write     (escribe)
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

type Cond = "directa" | "receta_simple" | "receta_retenida" | "receta_cheque" | "receta_retenida_control_existencia";

// =========================================================================
// Diccionario ampliado de principios activos -> clasificacion (borrador,
// best-effort segun normativa chilena tipica). NO reemplaza el registro ISP
// real ni la firma de la Quimica Farmaceutica.
// =========================================================================
const DICCIONARIO: Array<[RegExp, Cond]> = [
  // Retenida con control de existencia: biologicos/inmunoglobulinas/uso
  // hospitalario estricto
  [/\b(INMUNOGLOBULINA|INSULINA|HEPARINA|ERITROPOYETINA|FILGRASTIM|RITUXIMAB|ADALIMUMAB|INFLIXIMAB)\b/i, "receta_retenida_control_existencia"],
  // Receta Cheque (psicotropicos/estupefacientes de control estricto)
  [/\b(ALPRAZOLAM|CLONAZEPAM|DIAZEPAM|LORAZEPAM|MIDAZOLAM|ZOLPIDEM|ZOPICLONA|METILFENIDATO|MORFINA|METADONA|FENTANIL|OXICODONA|QUETIAPINA|OLANZAPINA|RISPERIDONA)\b/i, "receta_cheque"],
  // Receta Retenida (opioides debiles / control de precursores / retinoides /
  // gabapentinoides -- pregabalina y gabapentina estan en el anexo de
  // psicotropicos en Chile, no son receta simple)
  [/\b(TRAMADOL|CODEINA|PSEUDOEFEDRINA|ISOTRETINOINA|PREGABALINA|GABAPENTINA)\b/i, "receta_retenida"],
  // Receta Simple (antibioticos, antifungicos sistemicos, cronicos,
  // psicofarmacos comunes, hormonales, respiratorio de uso controlado,
  // cardiovascular/antihipertensivos, antiepilepticos)
  [
    /\b(AMOXICILINA|ACICLOVIR|AZITROMICINA|CEFADROXILO|CEFUROXIMO|CEFTRIAXONA|CIPROFLOXACINO|CLARITROMICINA|CLINDAMICINA|DOXICICLINA|LEVOFLOXACINO|MOXIFLOXACINO|METRONIDAZOL|FLUCONAZOL|KETOCONAZOL|TERBINAFINA|ITRACONAZOL|NISTATINA|LOSARTAN|ENALAPRIL|VALSARTAN|OLMESARTAN|ATORVASTATINA|ROSUVASTATINA|METFORMINA|GLIBENCLAMIDA|SITAGLIPTINA|LINAGLIPTINA|EMPAGLIFLOZINA|LEVOTIROXINA|SERTRALINA|FLUOXETINA|PAROXETINA|ESCITALOPRAM|VENLAFAXINA|DULOXETINA|MIRTAZAPINA|TRAZODONA|AMITRIPTILINA|MELOXICAM|DICLOFENACO|NAPROXENO|KETOROLACO|KETOPROFENO|CELECOXIB|ACIDO MEFENAMICO|PREDNISONA|DEXAMETASONA|FLUNARIZINA|DOMPERIDONA|OLOPATADINA|SILDENAFIL|TADALAFILO?|FINASTERIDE|LEVONORGESTREL|ETINILESTRADIOL|DIENOGEST|DROSPIRENONA|DESOGESTREL|TIBOLONA|MONTELUKAST|SALBUTAMOL|SALMETEROL|BUDESONIDA|FLUTICASONA|FORMOTEROL|TIOTROPIO|BETAMETASONA|CLOTRIMAZOL\/BETAMETASONA|BISOPROLOL|AMLODIPINO|CARVEDILOL|ATENOLOL|HIDROCLOROTIAZIDA|ESPIRONOLACTONA|ESOMEPRAZOL|CARBAMAZEPINA|LEVETIRACETAM|OXIBUTININA|ACIDO VALPROICO)\b/i,
    "receta_simple",
  ],
  // Directa (OTC comun, incluye topicos/antifungicos topicos leves,
  // antihistaminicos de 2da generacion, antiparasitarios OTC, vitaminas)
  [/\b(PARACETAMOL|IBUPROFENO|AMBROXOL|BROMHEXINA|LORATADINA|DESLORATADINA|CETIRIZINA|LEVOCETIRIZINA|BILASTINA|FEXOFENADINA|CLORFENAMINA|DIMENHIDRINATO|LOPERAMIDA|OMEPRAZOL|RANITIDINA|FAMOTIDINA|ACIDO ACETILSALICILICO|ACIDO FOLICO|ASPIRINA|SUBSALICILATO|GUAIFENESINA|SIMETICONA|MACROGOL|MENTOL|MELATONINA|CLOTRIMAZOL|MICONAZOL|CALAMINA|ALBENDAZOL|COLECALCIFEROL)\b/i, "directa"],
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

/**
 * Extrae principio(s) activo(s) reales del texto de candidatos ISP:
 * "... F-5515/25: AMOVAL COMPRIMIDOS 1 g (AMOXICILINA) | F-5513/25: ..."
 * IMPORTANTE (bug real encontrado en pruebas): cuando la busqueda ISP usa
 * una sola palabra generica del nombre ("CREATINA", "CITRATO", "RENU"),
 * trae candidatos que no tienen nada que ver con el producto pero que por
 * casualidad comparten esa palabra (ej. "Citrato de Potasio" trajo como
 * candidato "SUBLIMAZE ... (FENTANILO CITRATO)"). Que los candidatos
 * "concuerden entre si" NO alcanza como filtro -- se exige ademas que el
 * NOMBRE DE MARCA del candidato (la palabra antes de la dosis/parentesis)
 * coincida con la primera palabra del nombre real del producto. Sin esa
 * validacion cruzada, no se acepta el dato, aunque parezca consistente.
 */
function extraerPrincipioActivoDeDetalle(nombreProducto: string, detalle: string | null): string | null {
  if (!detalle) return null;
  const primeraPalabraProducto = nombreProducto.trim().split(/[^A-ZÁÉÍÓÚÑ]+/i)[0]?.toUpperCase();
  if (!primeraPalabraProducto || primeraPalabraProducto.length < 4) return null;

  const segmentos = detalle.split("|").map((s) => s.trim());
  const matches: string[] = [];
  for (const seg of segmentos) {
    const sinCodigo = seg.replace(/^[A-Z0-9-]+\/\d+:\s*/, "");
    const primeraPalabraCandidato = sinCodigo.split(/[^A-ZÁÉÍÓÚÑ]+/i)[0]?.toUpperCase();
    if (primeraPalabraCandidato !== primeraPalabraProducto) continue; // no es el mismo producto/marca
    const m = sinCodigo.match(/\(([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9 /+.-]{3,60})\)/i);
    if (m) matches.push(m[1].trim().toUpperCase());
  }
  const validos = matches.filter((s) => !/^(IGSC|IV|IM|SC|VO)$/.test(s));
  if (validos.length === 0) return null;

  const raiz = (s: string) => s.split(/[\s/]/)[0];
  const raices = new Set(validos.map(raiz));
  if (raices.size === 1) {
    const conteo = new Map<string, number>();
    for (const m of validos) conteo.set(m, (conteo.get(m) ?? 0) + 1);
    return [...conteo.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }
  return null; // misma marca, pero variantes con principios distintos -> no inventar
}

async function main() {
  cargarEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, key);

  const { data: categorias } = await supabase.from("categorias").select("id, slug");
  const catIdASlug = new Map((categorias ?? []).map((c) => [c.id, c.slug]));

  const PAGE = 1000;
  let desde = 0;
  const productos: any[] = [];
  for (;;) {
    const { data, error } = await supabase
      .from("productos")
      .select("sku_codigo, nombre, precio_venta, principio_activo, categoria_id, condicion_venta, clasificacion_detalle, clasificacion_revisada")
      .eq("clasificacion_revisada", false)
      .range(desde, desde + PAGE - 1)
      .order("sku_codigo");
    if (error) throw error;
    if (!data || data.length === 0) break;
    productos.push(...data);
    if (data.length < PAGE) break;
    desde += PAGE;
  }
  console.log(`Productos no revisados (clasificacion_revisada=false): ${productos.length}`);

  const stats = {
    principioActivoDesdeDetalle: 0,
    condicionVentaMejorada: 0,
    sinCambio: 0,
    condicionVenta: new Map<string, number>(),
  };

  const updates: Array<{ sku_codigo: string; nombre: string; precio_venta: number; principio_activo: string | null; es_medicamento: boolean; condicion_venta: string }> = [];

  for (const p of productos) {
    const slug = catIdASlug.get(p.categoria_id) ?? "por-clasificar";

    let principioActivo: string | null = p.principio_activo ?? null;

    let esMedicamento: boolean;
    let condicionVenta: Cond | "no_vendible_online";

    if (NON_MED_SLUGS.has(slug)) {
      // Categorias no-farmaceuticas: el "candidato ISP" que trajo el
      // scraping para estos nombres (vendas, cepillos, cosmetica) suele ser
      // ruido de una busqueda generica -- no usar clasificacion_detalle aqui,
      // se contamina principio_activo con quimicos que no tienen nada que
      // ver con el producto.
      esMedicamento = false;
      condicionVenta = "directa";
    } else {
      // Ademas de coincidir entre candidatos, exigimos que el propio nombre
      // del producto ya "huela" a medicamento (dosis/forma farmaceutica) --
      // si no, la busqueda ISP para nombres genericos (TALCO, VENDA, CEPILLO)
      // trae candidatos irrelevantes que igual comparten raiz por casualidad.
      const desdeDetalle = FORMA_SHAPE.test(p.nombre) ? extraerPrincipioActivoDeDetalle(p.nombre, p.clasificacion_detalle) : null;
      if (desdeDetalle && desdeDetalle !== principioActivo) {
        principioActivo = desdeDetalle;
        stats.principioActivoDesdeDetalle++;
      }

      const cond = clasificarPorIngrediente(principioActivo ?? p.nombre);
      if (cond) {
        esMedicamento = true;
        condicionVenta = cond;
      } else if (FORMA_SHAPE.test(p.nombre)) {
        esMedicamento = true;
        condicionVenta = "no_vendible_online";
      } else {
        esMedicamento = false;
        condicionVenta = "directa";
      }
    }

    if (condicionVenta !== p.condicion_venta || principioActivo !== p.principio_activo) {
      stats.condicionVentaMejorada++;
      stats.condicionVenta.set(condicionVenta, (stats.condicionVenta.get(condicionVenta) ?? 0) + 1);
      updates.push({
        sku_codigo: p.sku_codigo,
        nombre: p.nombre,
        precio_venta: p.precio_venta,
        principio_activo: principioActivo,
        es_medicamento: esMedicamento,
        condicion_venta: condicionVenta,
      });
    } else {
      stats.sinCambio++;
    }
  }

  console.log("\n--- Resumen ---");
  console.log("principio_activo mejorado desde clasificacion_detalle:", stats.principioActivoDesdeDetalle);
  console.log("Filas con condicion_venta/principio_activo actualizado:", stats.condicionVentaMejorada);
  console.log("Sin cambio (se mantiene igual que antes):", stats.sinCambio);
  console.log("Distribucion condicion_venta (nuevas):", Object.fromEntries(stats.condicionVenta));

  console.log("\nMuestra (15):");
  console.log(JSON.stringify(updates.slice(0, 15), null, 2));

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
