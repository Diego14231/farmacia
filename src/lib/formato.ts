export function formatearPrecio(valor: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(valor);
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
