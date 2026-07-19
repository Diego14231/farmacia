import { createAdminClient } from "@/lib/supabase/admin";
import { formatearPrecio } from "@/lib/formato";
import { EditarProductoFila } from "@/components/admin/EditarProductoFila";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Productos — Admin" };

interface Props {
  searchParams: Promise<{ q?: string; filtro?: string }>;
}

export default async function AdminProductosPage({ searchParams }: Props) {
  const { q, filtro } = await searchParams;
  const supabase = createAdminClient();

  let query = supabase
    .from("productos")
    .select("id, sku_codigo, nombre, precio_venta, stock_actual, activo_online, condicion_venta, categoria_id, descripcion, categorias(nombre)")
    .order("nombre")
    .limit(50);

  if (q?.trim()) query = query.ilike("nombre", `%${q.trim()}%`);
  if (filtro === "sin-clasificar") {
    const { data: cat } = await supabase
      .from("categorias")
      .select("id")
      .eq("slug", "por-clasificar")
      .single();
    if (cat) query = query.eq("categoria_id", cat.id);
  }

  const [{ data: productos }, { data: categorias }] = await Promise.all([
    query,
    supabase.from("categorias").select("id, nombre").order("orden"),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Productos</h1>

      <form className="flex gap-2" action="/admin/productos">
        <Input name="q" placeholder="Buscar por nombre…" defaultValue={q ?? ""} className="max-w-sm" />
        <Button type="submit" variant="outline">
          Buscar
        </Button>
        <Button asChild variant="ghost">
          <a href="/admin/productos?filtro=sin-clasificar">Ver sin clasificar</a>
        </Button>
      </form>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left">
            <tr>
              <th className="p-3">Producto</th>
              <th className="p-3">Precio</th>
              <th className="p-3">Stock</th>
              <th className="p-3">Categoría</th>
              <th className="p-3">Condición de venta</th>
              <th className="p-3">Visible online</th>
              <th className="p-3">Descripción</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {productos?.map((p) => (
              <EditarProductoFila
                key={p.id}
                producto={{
                  id: p.id,
                  nombre: p.nombre,
                  sku: p.sku_codigo,
                  precio: p.precio_venta,
                  stock: p.stock_actual,
                  activoOnline: p.activo_online,
                  condicionVenta: p.condicion_venta,
                  categoriaId: p.categoria_id,
                  descripcion: p.descripcion,
                }}
                categorias={categorias ?? []}
                precioFormateado={formatearPrecio(p.precio_venta)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
