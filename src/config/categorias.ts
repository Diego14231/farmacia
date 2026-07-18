/**
 * Taxonomía de categorías de navegación de Farmacia AhorraBien.
 *
 * Reemplaza la columna "Departamento" cruda del Excel del inventario (66
 * valores mezclados: laboratorios, categorías terapéuticas y "- Sin
 * Departamento -" en el 62% de las filas — ver docs/PLAN-FARMACIA-ONLINE.md
 * sección 3). La clasificación automática de abajo es una PROPUESTA
 * editable: lo que no matchea ninguna regla cae en "Por Clasificar" y se
 * corrige a mano desde el panel admin.
 */

export interface CategoriaDef {
  nombre: string;
  slug: string;
  orden: number;
}

export const CATEGORIAS: CategoriaDef[] = [
  { nombre: "Medicamentos", slug: "medicamentos", orden: 1 },
  { nombre: "Vitaminas y Suplementos", slug: "vitaminas-y-suplementos", orden: 2 },
  { nombre: "Productos Naturales", slug: "productos-naturales", orden: 3 },
  { nombre: "Cuidado Personal e Higiene", slug: "cuidado-personal", orden: 4 },
  { nombre: "Cuidado de la Piel", slug: "cuidado-de-la-piel", orden: 5 },
  { nombre: "Perfumería y Belleza", slug: "perfumeria-y-belleza", orden: 6 },
  { nombre: "Bebé y Maternidad", slug: "bebe-y-maternidad", orden: 7 },
  { nombre: "Salud Sexual", slug: "salud-sexual", orden: 8 },
  { nombre: "Insumos y Dispositivos Médicos", slug: "insumos-medicos", orden: 9 },
  { nombre: "Por Clasificar", slug: "por-clasificar", orden: 99 },
];

/**
 * Reglas de mapeo Departamento-original -> slug de categoría nueva.
 * Los departamentos que son nombres de laboratorio (BAGO, EUROFARMA,
 * GENERICO/*, etc.) se mapean a "medicamentos" porque en la práctica esas
 * filas son fármacos; la clasificación fina (es_medicamento / receta) viene
 * del pipeline ISP + revisión de la Química Farmacéutica, no de aquí.
 */
const DEPTO_A_SLUG: Record<string, string> = {
  PERFUMERIA: "perfumeria-y-belleza",
  "PRODUCTOS NATURALES": "productos-naturales",
  "JARABES NATURALES": "productos-naturales",
  "SALUD FEMENINA": "salud-sexual",
  "EST.SEXUAL MASCULINO": "salud-sexual",
  ANTIBIOTICOS: "medicamentos",
  HIPOGLICEMIANTES: "medicamentos",
  "OFTALMICO Y OTICO": "medicamentos",
  ANTIGRIPALES: "medicamentos",
  LAXANTE: "medicamentos",
  BUCOFARINGEO: "medicamentos",
  "SPRAYS NASALES": "medicamentos",
  JARABES2: "medicamentos",
  jarabe1: "medicamentos",
};

/** Palabras clave (en el nombre del producto) -> slug. Se evalúan en orden. */
const KEYWORD_A_SLUG: Array<[RegExp, string]> = [
  // Insumos / dispositivos
  [/\b(TIRAS? REACTIVAS?|JERINGA|AGUJA|TERMOMETRO|TENSIOMETRO|NEBULIZADOR|MASCARILLA|GASA|VENDA|PARCHE CURITA|ALGODON|TEST DE|GLUCOMETRO|ACCU-?CHEK)\b/i, "insumos-medicos"],
  // Bebé y maternidad
  [/\b(PAÑAL(ES)?|MAMADERA|CHUPETE|BIBERON|NAN\b|SIMILAC|LECHE DE (CONTINUACION|INICIO)|ABSORBENTE DE LECHE|TALCO INFANTIL|BEBE|INFANTIL)\b/i, "bebe-y-maternidad"],
  // Vitaminas y suplementos
  [/\b(VITAMINA|MULTIVITAMINICO|OMEGA ?3|COLAGENO|MAGNESIO|CALCIO|ZINC|MELATONINA|PROBIOTICO|SUPLEMENTO|PROTEINA)\b/i, "vitaminas-y-suplementos"],
  // Cuidado de la piel
  [/\b(PROTECTOR SOLAR|BLOQUEADOR|CREMA (FACIAL|CORPORAL|HIDRATANTE)|SERUM|ACIDO HIALURONICO|RETINOL|DERMO|HIDRATANTE|ANTIARRUGAS)\b/i, "cuidado-de-la-piel"],
  // Perfumería y belleza
  [/\b(PERFUME|COLONIA|EAU DE|MAQUILLAJE|LABIAL|ESMALTE|SOMBRA|RIMEL|MASCARA DE PESTAÑAS|DELINEADOR)\b/i, "perfumeria-y-belleza"],
  // Cuidado personal e higiene
  [/\b(SHAMPOO|ACONDICIONADOR|JABON|DESODORANTE|PASTA (DENTAL|DE DIENTES)|CEPILLO|ENJUAGUE BUCAL|TOALLAS? HIGIENICAS?|TAMPONES|AFEITAR|CREMA DENTAL|HIGIENE)\b/i, "cuidado-personal"],
  // Salud sexual
  [/\b(PRESERVATIVO|CONDON|LUBRICANTE INTIMO|ANTICONCEPTIV[OA])\b/i, "salud-sexual"],
  // Aceites de uso natural/cosmético (antes de la regla de medicamentos,
  // para que "ACEITE DE RICINO 20G" no caiga en fármacos)
  [/\bACEITE (DE )?(COCO|RICINO|ALMENDRA|OLIVA|ROSA MOSQUETA|ARGAN|MACADAMIA|CALENDULA)\b/i, "productos-naturales"],
  // Formas farmacéuticas -> medicamentos (heurística; la clasificación legal
  // viene del pipeline ISP, esto es solo navegación). Incluye las
  // abreviaturas chilenas típicas del inventario real: COM., X20COMP,
  // GTS, JBE, SUSP, AMP, "M G" con espacio, "%".
  [/\d\s?(MG|MCG|UI|M\s?G)\b/i, "medicamentos"],
  [/\b(COMPRIMIDOS?|CAPSULAS?|JARABE|GOTAS|INYECTABLE|SUPOSITORIO|OVULOS?|AMPOLLA|GRAGEAS?)\b/i, "medicamentos"],
  [/\b(COM|COMP|CAPS?|JBE|GTS|SUSP|AMP)\.?\s*$/i, "medicamentos"],
  [/\b(X\s?\d+\s?(COM|COMP|CAPS?)|(COM|COMP|CAPS?)\.?\s+X?\s?\d+)\b/i, "medicamentos"],
  [/\bSOL\.?\s?(OFT|ORAL|INY)/i, "medicamentos"],
  [/\d+\s?(SOBRES?|AMPOLLAS?)\b/i, "medicamentos"],
  [/\d+(\.\d+)?\s?%/, "medicamentos"],
];

export function clasificarProducto(
  nombreProducto: string,
  departamentoOriginal: string,
): string {
  const porDepto = DEPTO_A_SLUG[departamentoOriginal?.trim() ?? ""];
  if (porDepto) return porDepto;

  // Departamentos que son laboratorios -> medicamentos
  if (
    /^(GENERICO|Gen[eé]rico|Lab\.?chile|knop|MEGALABS|PASTEUR|MAVER|BAGO|ABBOTT|EUROFARMA|PRATER|SAVAL|BAYER|SANITAS|ANDROMACO|GALENICUM|MINTLAB|OPKO|LABORATORIOS)/i.test(
      departamentoOriginal?.trim() ?? "",
    )
  ) {
    return "medicamentos";
  }

  for (const [re, slug] of KEYWORD_A_SLUG) {
    if (re.test(nombreProducto)) return slug;
  }
  return "por-clasificar";
}
