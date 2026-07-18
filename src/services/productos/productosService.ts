import { createClient } from "@/lib/supabase/server";
import type { Categoria, Producto } from "@/types/database";

const PAGE_SIZE = 24;

export interface ListaProductosParams {
  categoriaSlug?: string;
  busqueda?: string;
  pagina?: number;
}

export interface ListaProductos {
  productos: Producto[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

/**
 * Catálogo público: solo productos activos online y con stock.
 * Ordenado alfabéticamente — el requisito ISP prohíbe priorizar
 * comercialmente un producto sobre otro al buscar (ver plan, sección 2.1),
 * así que el orden es neutro y estable.
 */
export async function listarProductos(
  params: ListaProductosParams,
): Promise<ListaProductos> {
  const supabase = await createClient();
  const pagina = Math.max(1, params.pagina ?? 1);
  const desde = (pagina - 1) * PAGE_SIZE;

  let query = supabase
    .from("productos")
    .select("*", { count: "exact" })
    .eq("activo_online", true)
    .gt("stock_actual", 0)
    .order("nombre", { ascending: true })
    .range(desde, desde + PAGE_SIZE - 1);

  if (params.busqueda?.trim()) {
    const q = params.busqueda.trim();
    query = query.or(`nombre.ilike.%${q}%,principio_activo.ilike.%${q}%`);
  }

  if (params.categoriaSlug) {
    const { data: cat } = await supabase
      .from("categorias")
      .select("id")
      .eq("slug", params.categoriaSlug)
      .single();
    if (cat) query = query.eq("categoria_id", cat.id);
  }

  const { data, count, error } = await query;
  if (error) throw new Error(`Error listando productos: ${error.message}`);

  const total = count ?? 0;
  return {
    productos: (data ?? []) as Producto[],
    total,
    pagina,
    totalPaginas: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function obtenerProductoPorSku(
  sku: string,
): Promise<Producto | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("productos")
    .select("*")
    .eq("sku_codigo", sku)
    .eq("activo_online", true)
    .maybeSingle();
  if (error) throw new Error(`Error obteniendo producto: ${error.message}`);
  return data as Producto | null;
}

/**
 * Bioequivalentes: productos activos con el mismo principio activo
 * (requisito ISP: mostrar alternativas al buscar por principio activo).
 */
export async function obtenerBioequivalentes(
  producto: Producto,
): Promise<Producto[]> {
  if (!producto.principio_activo) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("productos")
    .select("*")
    .eq("activo_online", true)
    .eq("principio_activo", producto.principio_activo)
    .neq("id", producto.id)
    .gt("stock_actual", 0)
    .order("precio_venta", { ascending: true })
    .limit(8);
  return (data ?? []) as Producto[];
}

export async function listarCategorias(): Promise<Categoria[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categorias")
    .select("*")
    .order("orden", { ascending: true });
  if (error) throw new Error(`Error listando categorías: ${error.message}`);
  return (data ?? []) as Categoria[];
}
