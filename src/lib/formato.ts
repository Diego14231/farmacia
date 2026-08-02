export function formatearPrecio(valor: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(valor);
}

const UNIDAD_POR_PALABRA: Record<string, string> = {
  com: "comprimido", // abreviatura chilena mas comun ("32 COM."), sin la "p"
  comp: "comprimido",
  comprimido: "comprimido",
  tab: "tableta",
  tableta: "tableta",
  cap: "cápsula",
  caps: "cápsula",
  capsula: "cápsula",
  sobre: "sobre",
  ovulo: "óvulo",
  supositorio: "supositorio",
  amp: "ampolla",
  ampolla: "ampolla",
  perla: "perla",
  gragea: "gragea",
  parche: "parche",
  ml: "ml",
  gr: "gramo",
  g: "gramo",
};

// Busca un patrón "<cantidad> <forma>" en el nombre crudo del producto (ej.
// "GLAUPAX XR 1000MG X 30 COMP" -> 30 comprimidos) para calcular precio por
// unidad, al estilo de las farmacias de descuento (Doctor Simi, etc.). Es
// deliberadamente conservador: si no encuentra un patrón confiable, no
// inventa nada y el llamador simplemente no muestra el dato.
//
// "com\.?" y "amp\.?" cubren las abreviaturas de 3 letras que usa la mayoria
// del inventario real (COM./AMP., no COMP./AMPOLLA) -- sin esto, ~575
// medicamentos con cantidad SI declarada en el nombre no mostraban precio
// por unidad. "g\." exige el punto (no "g" suelto) para no confundir
// fragmentos de otras palabras con gramos.
const PATRON_CANTIDAD =
  /(\d+)\s*(comprimidos?|comp\.?|com\.?|tabletas?|tab\.?|c[aá]psulas?|caps?\.?|sobres?|[oó]vulos?|supositorios?|ampollas?|amp\.?|perlas?|grageas?|parches?|gr\.?|g\.|ml)\b/i;

export interface PrecioPorUnidad {
  cantidad: number;
  unidad: string;
  precioUnitario: number;
}

export function calcularPrecioPorUnidad(
  nombre: string,
  precioVenta: number,
): PrecioPorUnidad | null {
  const m = nombre.match(PATRON_CANTIDAD);
  if (!m) return null;

  const cantidad = Number(m[1]);
  if (!Number.isFinite(cantidad) || cantidad <= 1 || cantidad > 500) return null;

  const sinTildes = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const palabra = sinTildes(m[2].toLowerCase().replace(/\.$/, ""));
  const singular = palabra.endsWith("s") ? palabra.slice(0, -1) : palabra;
  const unidad = UNIDAD_POR_PALABRA[palabra] ?? UNIDAD_POR_PALABRA[singular];
  if (!unidad) return null;

  return { cantidad, unidad, precioUnitario: precioVenta / cantidad };
}

export const ETIQUETA_CONDICION_VENTA: Record<string, string> = {
  directa: "Venta directa",
  receta_simple: "Requiere receta médica",
  receta_retenida: "Requiere receta retenida",
  receta_cheque: "Requiere receta cheque",
  receta_retenida_control_existencia:
    "Requiere receta retenida (control de existencia)",
  no_vendible_online: "Solo disponible en tienda",
};

export const ETIQUETA_ESTADO_PEDIDO: Record<string, string> = {
  carrito: "Carrito",
  pendiente_pago: "Pendiente de pago",
  pagado: "Pagado",
  pendiente_validacion_qf: "En validación por el químico farmacéutico",
  en_preparacion: "En preparación",
  despachado: "Despachado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};
