import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { AccionesReceta } from "@/components/admin/AccionesReceta";

export const metadata = { title: "Recetas — Admin" };

export default async function AdminRecetasPage() {
  const supabase = createAdminClient();
  const { data: recetas } = await supabase
    .from("recetas")
    .select("id, tipo, estado, motivo_rechazo, created_at, clientes(nombre, email)")
    .order("created_at", { ascending: false })
    .limit(100);

  const pendientes = recetas?.filter((r) => r.estado === "pendiente") ?? [];
  const resueltas = recetas?.filter((r) => r.estado !== "pendiente") ?? [];

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">
          Recetas pendientes de validación ({pendientes.length})
        </h1>
        {pendientes.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            No hay recetas pendientes.
          </p>
        ) : (
          <ul className="space-y-3">
            {pendientes.map((r) => {
              const cliente = r.clientes as unknown as {
                nombre: string;
                email: string;
              } | null;
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-4 rounded-lg border p-4"
                >
                  <div className="flex-1">
                    <p className="font-medium">{cliente?.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {cliente?.email} ·{" "}
                      {new Date(r.created_at).toLocaleString("es-CL")}
                    </p>
                  </div>
                  <Badge variant="outline">Receta {r.tipo}</Badge>
                  <AccionesReceta recetaId={r.id} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {resueltas.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Historial</h2>
          <ul className="space-y-2 text-sm">
            {resueltas.map((r) => {
              const cliente = r.clientes as unknown as { nombre: string } | null;
              return (
                <li key={r.id} className="flex items-center gap-3 rounded border p-3">
                  <span className="flex-1">{cliente?.nombre}</span>
                  <Badge
                    variant={r.estado === "validada" ? "secondary" : "destructive"}
                  >
                    {r.estado}
                  </Badge>
                  {r.motivo_rechazo && (
                    <span className="text-xs text-muted-foreground">
                      {r.motivo_rechazo}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
