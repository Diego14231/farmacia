"use client";

import { useState, useTransition } from "react";
import { obtenerUrlReceta, resolverReceta } from "@/services/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AccionesReceta({ recetaId }: { recetaId: string }) {
  const [pendiente, startTransition] = useTransition();
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function verArchivo() {
    const r = await obtenerUrlReceta(recetaId);
    if (r.ok && r.url) window.open(r.url, "_blank");
    else setError(r.error ?? "Error");
  }

  function decidir(decision: "validada" | "rechazada") {
    startTransition(async () => {
      const r = await resolverReceta(recetaId, decision, motivo || undefined);
      if (!r.ok) setError(r.error ?? "Error");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" size="sm" onClick={verArchivo}>
        Ver receta
      </Button>
      {!rechazando ? (
        <>
          <Button variant="success" size="sm" disabled={pendiente} onClick={() => decidir("validada")}>
            Validar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={pendiente}
            onClick={() => setRechazando(true)}
          >
            Rechazar
          </Button>
        </>
      ) : (
        <>
          <Input
            placeholder="Motivo del rechazo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="w-56"
          />
          <Button
            variant="destructive"
            size="sm"
            disabled={pendiente || !motivo.trim()}
            onClick={() => decidir("rechazada")}
          >
            Confirmar rechazo
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setRechazando(false)}>
            Cancelar
          </Button>
        </>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
