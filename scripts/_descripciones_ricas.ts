/**
 * Re-genera `descripcion` para TODA la tabla `productos` con un estilo mas
 * vendedor (beneficios en vinetas), como referencia visual de tu hermana.
 *
 * Excepcion deliberada: los medicamentos con receta (receta_simple /
 * receta_retenida / receta_cheque) NO llevan lenguaje de venta ni vinetas de
 * beneficios -- la Ley 20.724 (Ley de Farmacos II) prohibe la publicidad al
 * publico de medicamentos de receta. Esos quedan en tono clinico-informativo.
 *
 * Uso:
 *   npx tsx scripts/_descripciones_ricas.ts            (dry-run)
 *   npx tsx scripts/_descripciones_ricas.ts --write     (escribe en Supabase)
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
const RECETA = new Set(["receta_simple", "receta_retenida", "receta_cheque"]);

// =========================================================================
// Beneficios por principio activo / palabra clave (honestos, no inventados:
// solo se listan efectos ampliamente reconocidos para ese ingrediente).
// =========================================================================
const BENEFICIOS_INGREDIENTE: Array<[RegExp, string[]]> = [
  [/NIACINAMIDA/i, [
    "Ayuda a reducir manchas y a prevenir la hiperpigmentación.",
    "Contribuye a controlar la oleosidad y afinar el aspecto del poro.",
    "Calma la irritación y ayuda a unificar el tono de la piel.",
  ]],
  [/ACIDO HIALURONICO/i, [
    "Aporta hidratación profunda a la piel.",
    "Ayuda a mejorar la elasticidad y firmeza.",
    "Suaviza la apariencia de líneas de expresión.",
  ]],
  [/VITAMINA C|ACIDO ASCORBICO/i, [
    "Antioxidante que ayuda a iluminar el tono de la piel.",
    "Contribuye a parejar el tono y reducir manchas.",
    "Apoya la producción natural de colágeno.",
  ]],
  [/RETINOL/i, [
    "Ayuda a renovar la piel y suavizar líneas finas.",
    "Contribuye a mejorar la textura de la piel.",
    "Uso nocturno recomendado; aplicar protector solar durante el día.",
  ]],
  [/COLAGENO/i, ["Contribuye a la elasticidad y firmeza de la piel.", "Apoya la salud de piel y articulaciones."]],
  [/PROTECTOR SOLAR|BLOQUEADOR|SPF/i, [
    "Protege la piel de la radiación UVA/UVB.",
    "Ayuda a prevenir el fotoenvejecimiento y las manchas solares.",
    "Recomendado de uso diario, incluso en días nublados.",
  ]],
  [/OMEGA ?3/i, ["Contribuye a la salud cardiovascular.", "Apoya la función cerebral y visual."]],
  [/MAGNESIO/i, ["Contribuye al funcionamiento normal del sistema nervioso y muscular.", "Ayuda a reducir el cansancio y la fatiga."]],
  [/\bCALCIO\b/i, ["Contribuye a mantener huesos y dientes sanos."]],
  [/\bZINC\b/i, ["Contribuye al funcionamiento normal del sistema inmune.", "Apoya la salud de la piel."]],
  [/MELATONINA/i, ["Ayuda a regular el ciclo de sueño.", "Puede facilitar conciliar el sueño de forma natural."]],
  [/PROBIOTICO/i, ["Contribuye al equilibrio de la flora intestinal.", "Apoya la salud digestiva."]],
  [/MULTIVITAMIN|COMPLEJO B/i, ["Aporta un complejo de vitaminas y minerales para el día a día."]],
  [/COLAGENO|ACIDO HIALURONICO/i, []], // (evita fallthrough accidental, no-op)
  // --- OTC / venta directa: indicacion aprobada, sin hiperbole ---
  [/PARACETAMOL/i, ["Indicado para el alivio del dolor leve a moderado y la fiebre."]],
  [/IBUPROFENO/i, ["Antiinflamatorio indicado para el alivio del dolor, la inflamación y la fiebre."]],
  [/AMBROXOL|BROMHEXINA/i, ["Ayuda a fluidificar y eliminar la mucosidad en afecciones respiratorias."]],
  [/LORATADINA|CETIRIZINA|CLORFENAMINA/i, ["Antihistamínico indicado para el alivio de síntomas alérgicos (estornudos, picazón, congestión)."]],
  [/DIMENHIDRINATO/i, ["Indicado para prevenir y tratar náuseas y mareos."]],
  [/\bOMEPRAZOL\b/i, ["Indicado para el alivio de la acidez y el reflujo gastroesofágico."]],
  [/SIMETICONA/i, ["Ayuda a aliviar los gases y la distensión abdominal."]],
  [/LOPERAMIDA/i, ["Indicado para el alivio de la diarrea aguda."]],
  [/ACIDO ACETILSALICILICO/i, ["Indicado para el alivio del dolor leve y la fiebre."]],
];

// Beneficios genericos por categoria, solo cuando no hay match de ingrediente.
const BENEFICIOS_CATEGORIA: Record<string, string[]> = {
  "cuidado-de-la-piel": ["Formulado para el cuidado diario de la piel.", "Ayuda a mantener la piel hidratada y en buen estado."],
  "perfumeria-y-belleza": ["Fragancia/producto de belleza para uso diario."],
  "cuidado-personal": ["Pensado para tu higiene y cuidado personal diario."],
  "productos-naturales": ["Elaborado a partir de ingredientes de origen natural."],
  "vitaminas-y-suplementos": ["Complemento nutricional para apoyar tu alimentación diaria."],
  "bebe-y-maternidad": ["Formulado pensando en el cuidado de tu bebé."],
};

function limpiarNombre(nombre: string): string {
  return nombre.replace(/\s*\([A-ZÁÉÍÓÚÑ0-9+/ .-]{4,60}\)\s*$/i, "").trim();
}

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

function buscarBeneficios(texto: string): string[] | null {
  for (const [re, beneficios] of BENEFICIOS_INGREDIENTE) {
    if (beneficios.length && re.test(texto)) return beneficios;
  }
  return null;
}

function generarDescripcion(
  nombre: string,
  principioActivo: string | null,
  presentacion: string | null,
  categoriaSlug: string,
  condicionVenta: string | null,
): string {
  const base = limpiarNombre(nombre).replace(/\.+$/, "");
  const esReceta = condicionVenta != null && RECETA.has(condicionVenta);

  // --- Medicamentos con receta: tono clinico, sin vinetas de venta ---
  if (esReceta) {
    const partes = [`${base}.`];
    if (principioActivo) partes.push(`Principio activo: ${principioActivo}.`);
    partes.push(
      "Medicamento de venta bajo receta médica. Su indicación, dosis y duración del tratamiento deben ser confirmadas por un profesional de la salud.",
    );
    if (presentacion) partes.push(`Presentación: ${presentacion.replace(/\.+$/, "")}.`);
    return partes.join(" ");
  }

  // --- Resto del catalogo: estilo vendedor con beneficios, solo si hay
  // una base honesta (ingrediente reconocido o categoria con texto generico) ---
  const beneficios = buscarBeneficios(principioActivo ?? nombre) ?? BENEFICIOS_CATEGORIA[categoriaSlug] ?? null;

  if (!beneficios) {
    // Sin base para inventar beneficios: descripcion factual simple.
    const partes = [`${base}.`];
    if (principioActivo) partes.push(`Principio activo: ${principioActivo}.`);
    if (presentacion) partes.push(`Presentación: ${presentacion.replace(/\.+$/, "")}.`);
    return partes.join(" ");
  }

  const lineas = [`${base}.`, ""];
  lineas.push("¿Cómo te puede ayudar este producto?");
  for (const b of beneficios) lineas.push(`• ${b}`);
  lineas.push("");
  if (presentacion) lineas.push(`Presentación: ${presentacion.replace(/\.+$/, "")}.`);
  return lineas.join("\n");
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
      .select("sku_codigo, nombre, precio_venta, principio_activo, categoria_id, condicion_venta")
      .range(desde, desde + PAGE - 1)
      .order("sku_codigo");
    if (error) throw error;
    if (!data || data.length === 0) break;
    productos.push(...data);
    if (data.length < PAGE) break;
    desde += PAGE;
  }
  console.log(`Productos leidos: ${productos.length}`);

  const stats = { conBeneficios: 0, clinico: 0, factualSimple: 0 };
  const updates = productos.map((p) => {
    const slug = catIdASlug.get(p.categoria_id) ?? "por-clasificar";
    const presentacion = extraerPresentacion(p.nombre);
    const descripcion = generarDescripcion(p.nombre, p.principio_activo, presentacion, slug, p.condicion_venta);

    if (p.condicion_venta && RECETA.has(p.condicion_venta)) stats.clinico++;
    else if (descripcion.includes("¿Cómo te puede ayudar")) stats.conBeneficios++;
    else stats.factualSimple++;

    return { sku_codigo: p.sku_codigo, nombre: p.nombre, precio_venta: p.precio_venta, descripcion };
  });

  console.log("\n--- Resumen ---");
  console.log("Con beneficios (estilo vendedor):", stats.conBeneficios);
  console.log("Clinico (receta, sin venta):", stats.clinico);
  console.log("Factual simple (sin base para beneficios):", stats.factualSimple);

  console.log("\nMuestra:");
  for (const sku of ["9007455219200", "7899706192019", "7800004005178"]) {
    console.log(`--- ${sku} ---`);
    console.log(updates.find((u) => u.sku_codigo === sku)?.descripcion ?? "(no encontrado)");
  }
  console.log("--- receta ---");
  console.log(updates.find((u) => u.descripcion.includes("Medicamento de venta bajo receta"))?.descripcion ?? "(sin receta encontrada)");

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
