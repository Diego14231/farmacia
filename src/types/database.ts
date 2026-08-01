// Tipos del modelo de datos — espejo de supabase/migrations/*_schema_inicial.sql

export type CondicionVenta =
  | "directa"
  | "receta_simple"
  | "receta_retenida"
  | "receta_cheque"
  | "receta_retenida_control_existencia"
  | "no_vendible_online";

export interface Categoria {
  id: string;
  nombre: string;
  slug: string;
  parent_id: string | null;
  orden: number;
}

export interface Producto {
  id: string;
  sku_codigo: string;
  nombre: string;
  descripcion: string | null;
  categoria_id: string | null;
  precio_costo: number | null;
  precio_venta: number;
  precio_mayorista: number | null;
  stock_actual: number;
  stock_minimo: number;
  stock_maximo: number | null;
  es_medicamento: boolean;
  registro_isp: string | null;
  condicion_venta: CondicionVenta | null;
  principio_activo: string | null;
  requiere_cadena_frio: boolean;
  activo_online: boolean;
  imagen_url: string | null;
  departamento_original: string | null;
  // Sugerencia de scripts/clasificar_medicamentos.py (staging, no
  // autoritativa) -- ver /admin/clasificacion. La Química Farmacéutica
  // confirma o corrige antes de que cuente para es_medicamento/condicion_venta.
  clasificacion_sugerida_medicamento: string | null;
  clasificacion_sugerida_receta: string | null;
  clasificacion_detalle: string | null;
  clasificacion_revisar_manual: boolean;
  clasificacion_revisada: boolean;
  created_at: string;
  updated_at: string;
}

export type EstadoPedido =
  | "carrito"
  | "pendiente_pago"
  | "pagado"
  | "pendiente_validacion_qf"
  | "en_preparacion"
  | "despachado"
  | "entregado"
  | "cancelado";

export interface Pedido {
  id: string;
  cliente_id: string;
  direccion_id: string | null;
  estado: EstadoPedido;
  requiere_receta: boolean;
  receta_id: string | null;
  subtotal: number;
  costo_despacho: number;
  total: number;
  metodo_pago: string | null;
  referencia_pago_externo: string | null;
  created_at: string;
  updated_at: string;
}

export interface PedidoItem {
  id: string;
  pedido_id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  lote: string | null;
  fecha_vencimiento: string | null;
}

export type TipoReceta = "simple" | "retenida" | "cheque";
export type EstadoReceta = "pendiente" | "validada" | "rechazada";

export interface Receta {
  id: string;
  cliente_id: string;
  archivo_url: string;
  tipo: TipoReceta;
  estado: EstadoReceta;
  validada_por_staff_id: string | null;
  validada_at: string | null;
  motivo_rechazo: string | null;
  created_at: string;
}

export interface Cliente {
  id: string;
  auth_user_id: string | null;
  nombre: string;
  rut: string | null;
  email: string | null;
  telefono: string | null;
  created_at: string;
}

export type RolStaff = "admin" | "quimico_farmaceutico" | "bodega";

export interface Staff {
  id: string;
  auth_user_id: string | null;
  nombre: string;
  rol: RolStaff;
  activo: boolean;
  created_at: string;
}
