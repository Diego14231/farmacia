"use client";

import Image from "next/image";
import { useState } from "react";
import { Plus } from "lucide-react";

/**
 * Logo real de Farmacias AhorraBien -- lee public/logo-banner.png. Si el
 * archivo todavía no existe (404), cae automáticamente a una recreación en
 * CSS con los mismos colores de marca, así que no rompe nada mientras se
 * agrega la imagen real.
 */
export function Logo({ compact = false }: { compact?: boolean }) {
  const [error, setError] = useState(false);

  if (!error) {
    return (
      <Image
        src="/logo-banner.png"
        alt="Farmacias AhorraBien"
        width={800}
        height={140}
        priority
        className={compact ? "h-8 w-auto" : "h-10 w-auto"}
        onError={() => setError(true)}
      />
    );
  }

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
