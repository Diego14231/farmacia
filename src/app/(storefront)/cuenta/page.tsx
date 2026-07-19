import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatearPrecio, ETIQUETA_ESTADO_PEDIDO } from "@/lib/formato";
import { CerrarSesionClienteBoton } from "@/components/storefront/CerrarSesionClienteBoton";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Mi cuenta" };

export default async function CuentaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, nombre, email")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  const { data: pedidos } = cliente
    ? await supabase
        .from("pedidos")
        .select("id, estado, total, created_at")
        .eq("cliente_id", cliente.id)
        .order("created_at", { ascending: false })
    : { data: null };

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Mi cuenta</h1>
          <p className="text-muted-foreground text-sm">
            {cliente?.nombre ?? "Cliente"} — {cliente?.email ?? user.email}
          </p>
        </div>
        <CerrarSesionClienteBoton />
      </div>

      <div>
        <h2 className="mb-2 font-semibold">Mis pedidos</h2>
        {!pedidos?.length ? (
          <p className="text-muted-foreground text-sm">
            Todavía no tienes pedidos.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {pedidos.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <span className="text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString("es-CL")}
                </span>
                <Badge variant="secondary">
                  {ETIQUETA_ESTADO_PEDIDO[p.estado] ?? p.estado}
                </Badge>
                <span className="font-medium">{formatearPrecio(p.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
