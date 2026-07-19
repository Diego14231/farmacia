import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { ConfirmarClasificacionFila } from "@/components/admin/ConfirmarClasificacionFila";
import { ConfirmarAltaConfianzaBoton } from "@/components/admin/ConfirmarAltaConfianzaBoton";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Clasificación ISP — Admin" };

const PAGE_SIZE = 30;

interface Props {
  searchParams: Promise<{ pagina?: string }>;
}

export default async function AdminClasificacionPage({ searchParams }: Props) {
  const { pagina: paginaParam } = await searchParams;
  const pagina = Math.max(1, Number(paginaParam) || 1);
  const desde = (pagina - 1) * PAGE_SIZE;

  const supabase = createAdminClient();

  const [{ count: total }, { count: pendientesManual }, { count: altaConfianza }, { count: confirmados }] =
    await Promise.all([
      supabase.from("productos").select("id", { count: "exact", head: true }),
      supabase
        .from("productos")
        .select("id", { count: "exact", head: true })
        .eq("clasificacion_revisar_manual", true)
        .eq("clasificacion_revisada", false),
      supabase
        .from("productos")
        .select("id", { count: "exact", head: true })
        .eq("clasificacion_revisar_manual", false)
        .eq("clasificacion_revisada", false)
        .not("clasificacion_sugerida_medicamento", "is", null),
      supabase
        .from("productos")
        .select("id", { count: "exact", head: true })
        .eq("clasificacion_revisada", true),
    ]);

  const { data: productos, count: totalCola } = await supabase
    .from("productos")
    .select(
      "id, sku_codigo, nombre, clasificacion_sugerida_medicamento, clasificacion_sugerida_receta, clasificacion_detalle",
      { count: "exact" },
    )
    .eq("clasificacion_revisar_manual", true)
    .eq("clasificacion_revisada", false)
    .order("nombre")
    .range(desde, desde + PAGE_SIZE - 1);

  const totalPaginas = Math.max(1, Math.ceil((totalCola ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Clasificación ISP</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sugerencias de scripts/clasificar_medicamentos.py contra el registro
          sanitario del ISP. Nada de esto se aplica solo -- cada producto
          queda con su clasificación real (Productos → condición de venta)
          recién cuando se confirma acá.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-md border p-3">
          <p className="text-2xl font-semibold">{total ?? 0}</p>
          <p className="text-xs text-muted-foreground">Total productos</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-2xl font-semibold">{pendientesManual ?? 0}</p>
          <p className="text-xs text-muted-foreground">Por revisar a mano</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-2xl font-semibold">{altaConfianza ?? 0}</p>
          <p className="text-xs text-muted-foreground">Alta confianza pendiente</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-2xl font-semibold">{confirmados ?? 0}</p>
          <p className="text-xs text-muted-foreground">Ya confirmados</p>
        </div>
      </div>

      <ConfirmarAltaConfianzaBoton cantidad={altaConfianza ?? 0} />

      <div>
        <h2 className="mb-2 font-semibold">Cola de revisión manual</h2>
        {!productos?.length ? (
          <p className="py-8 text-center text-muted-foreground">
            No hay productos ambiguos pendientes de revisión.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left">
                <tr>
                  <th className="p-3">Producto</th>
                  <th className="p-3">Sugerido</th>
                  <th className="p-3">Detalle (candidatos ISP)</th>
                  <th className="p-3">Es medicamento</th>
                  <th className="p-3">Condición de venta</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {productos.map((p) => (
                  <ConfirmarClasificacionFila
                    key={p.id}
                    producto={{
                      id: p.id,
                      nombre: p.nombre,
                      sku: p.sku_codigo,
                      sugeridoMedicamento: p.clasificacion_sugerida_medicamento,
                      sugeridoReceta: p.clasificacion_sugerida_receta,
                      detalle: p.clasificacion_detalle,
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPaginas > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button asChild variant="outline" size="sm" disabled={pagina <= 1}>
              <Link href={`/admin/clasificacion?pagina=${pagina - 1}`}>Anterior</Link>
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {pagina} de {totalPaginas}
            </span>
            <Button asChild variant="outline" size="sm" disabled={pagina >= totalPaginas}>
              <Link href={`/admin/clasificacion?pagina=${pagina + 1}`}>Siguiente</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
