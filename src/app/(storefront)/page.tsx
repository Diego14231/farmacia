import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">
        Farmacia Online — en construcción
      </h1>
      <p className="max-w-md text-muted-foreground">
        Catálogo, carrito y despacho a domicilio próximamente. Proyecto en
        etapa de armado (ver <code>docs/PLAN-FARMACIA-ONLINE.md</code>).
      </p>
      <Button disabled>Ver catálogo (próximamente)</Button>
    </div>
  );
}
