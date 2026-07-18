import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { ResponderReclamo } from "@/components/admin/ResponderReclamo";

export const metadata = { title: "Reclamos — Admin" };

export default async function AdminReclamosPage() {
  const supabase = createAdminClient();
  const { data: reclamos } = await supabase
    .from("reclamos")
    .select("id, mensaje, estado, respuesta, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Reclamos</h1>
      {!reclamos?.length ? (
        <p className="py-12 text-center text-muted-foreground">
          No hay reclamos registrados.
        </p>
      ) : (
        <ul className="space-y-3">
          {reclamos.map((r) => (
            <li key={r.id} className="space-y-2 rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Badge
                  variant={
                    r.estado === "resuelto"
                      ? "secondary"
                      : r.estado === "en_proceso"
                        ? "outline"
                        : "destructive"
                  }
                >
                  {r.estado.replaceAll("_", " ")}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(r.created_at).toLocaleString("es-CL")}
                </span>
              </div>
              <p className="text-sm">{r.mensaje}</p>
              {r.respuesta ? (
                <p className="rounded bg-muted p-2 text-sm">
                  <strong>Respuesta:</strong> {r.respuesta}
                </p>
              ) : (
                <ResponderReclamo reclamoId={r.id} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
