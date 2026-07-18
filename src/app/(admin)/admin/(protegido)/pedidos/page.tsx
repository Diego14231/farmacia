import { createAdminClient } from "@/lib/supabase/admin";
import { formatearPrecio } from "@/lib/formato";
import { Badge } from "@/components/ui/badge";
import { CambiarEstadoPedido } from "@/components/admin/CambiarEstadoPedido";

export const metadata = { title: "Pedidos — Admin" };

const COLOR_ESTADO: Record<string, string> = {
  pendiente_pago: "bg-yellow-100 text-yellow-900",
  pagado: "bg-blue-100 text-blue-900",
  pendiente_validacion_qf: "bg-amber-100 text-amber-900",
  en_preparacion: "bg-indigo-100 text-indigo-900",
  despachado: "bg-cyan-100 text-cyan-900",
  entregado: "bg-brand-green/15 text-brand-green",
  cancelado: "bg-red-100 text-red-900",
};

export default async function AdminPedidosPage() {
  const supabase = createAdminClient();
  const { data: pedidos } = await supabase
    .from("pedidos")
    .select(
      "id, estado, total, requiere_receta, created_at, clientes(nombre, email, telefono), direcciones(calle, numero, comuna)",
    )
    .neq("estado", "carrito")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Pedidos</h1>
      {!pedidos?.length ? (
        <p className="py-12 text-center text-muted-foreground">
          No hay pedidos todavía.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left">
              <tr>
                <th className="p-3">Fecha</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Dirección</th>
                <th className="p-3">Total</th>
                <th className="p-3">Receta</th>
                <th className="p-3">Estado</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {pedidos.map((p) => {
                const cliente = p.clientes as unknown as {
                  nombre: string;
                  email: string;
                  telefono: string;
                } | null;
                const dir = p.direcciones as unknown as {
                  calle: string;
                  numero: string | null;
                  comuna: string;
                } | null;
                return (
                  <tr key={p.id}>
                    <td className="p-3 whitespace-nowrap">
                      {new Date(p.created_at).toLocaleString("es-CL")}
                    </td>
                    <td className="p-3">
                      <div>{cliente?.nombre}</div>
                      <div className="text-xs text-muted-foreground">
                        {cliente?.email} · {cliente?.telefono}
                      </div>
                    </td>
                    <td className="p-3">
                      {dir ? `${dir.calle} ${dir.numero ?? ""}, ${dir.comuna}` : "—"}
                    </td>
                    <td className="p-3 font-medium">{formatearPrecio(p.total)}</td>
                    <td className="p-3">
                      {p.requiere_receta ? <Badge variant="secondary">Sí</Badge> : "—"}
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-medium ${COLOR_ESTADO[p.estado] ?? ""}`}
                      >
                        {p.estado.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="p-3">
                      <CambiarEstadoPedido pedidoId={p.id} estadoActual={p.estado} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
