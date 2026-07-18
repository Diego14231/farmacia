import { Plus } from "lucide-react";

/**
 * Recreación del isotipo de Farmacias AhorraBien (círculo verde con cruz +
 * "Farmacias" en azul + "AhorraBien" en píldora azul) usando los colores de
 * marca. Si en algún momento se cuenta con el archivo del logo real
 * (PNG/SVG), reemplazar esto por <Image src="/logo.png" .../>.
 */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-green">
        <Plus className="size-4 text-white" strokeWidth={3} />
      </span>
      {!compact && (
        <span className="font-bold tracking-tight text-brand">Farmacias</span>
      )}
      <span className="rounded-full bg-brand px-2.5 py-0.5 font-bold tracking-tight text-white">
        AhorraBien
      </span>
    </span>
  );
}
