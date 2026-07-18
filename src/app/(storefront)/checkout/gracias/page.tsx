import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatearPrecio } from "@/lib/formato";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export const metadata = { title: "Pedido recibido" };

interface Props {
  searchParams: Promise<{ pedido?: string }>;
}

export default async function GraciasPage({ searchParams }: Props) {
  const { pedido: pedidoId } = await searchParams;

  let resumen: { total: number; estado: string; requiereReceta: boolean } | null =
    null;
  if (pedidoId) {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("pedidos")
      .select("total, estado, requiere_receta")
      .eq("id", pedidoId)
      .maybeSingle();
    if (data)
      resumen = {
        total: data.total,
        estado: data.estado,
        requiereReceta: data.requiere_receta,
      };
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 py-16 text-center">
      <CheckCircle2 className="mx-auto size-14 text-brand-green" />
      <h1 className="text-2xl font-semibold">¡Pedido recibido!</h1>

      {resumen ? (
        <div className="space-y-2 text-muted-foreground">
          <p>
            Total: <strong>{formatearPrecio(resumen.total)}</strong>
          </p>
          {resumen.estado === "pendiente_pago" && (
            <p>
              Tu pedido está registrado y pendiente de pago. Te contactaremos
              para coordinar el pago y el despacho.
            </p>
          )}
          {resumen.requiereReceta && (
            <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              Tu receta será revisada por nuestro químico farmacéutico. Te
              avisaremos por email cuando esté validada.
            </p>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground">
          Tu pedido fue registrado. Te contactaremos para coordinar el
          despacho.
        </p>
      )}

      <Button asChild>
        <Link href="/productos">Seguir comprando</Link>
      </Button>
    </div>
  );
}
