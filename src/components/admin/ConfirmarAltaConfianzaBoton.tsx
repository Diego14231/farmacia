"use client";

import { useState, useTransition } from "react";
import { confirmarClasificacionAltaConfianza } from "@/services/admin/actions";
import { Button } from "@/components/ui/button";

export function ConfirmarAltaConfianzaBoton({ cantidad }: { cantidad: number }) {
  const [pendiente, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);

  if (cantidad === 0) return null;

  function confirmar() {
    startTransition(async () => {
      const r = await confirmarClasificacionAltaConfianza();
      setMensaje(
        r.ok
          ? `${r.confirmados} productos confirmados. Recarga la página para actualizar los números.`
          : (r.error ?? "Error inesperado."),
      );
    });
  }

  return (
    <div className="space-y-2 rounded-md border border-brand-green/30 bg-brand-green/5 p-4">
      <p className="text-sm">
        <strong>{cantidad}</strong> productos tienen clasificación de{" "}
        <strong>alta confianza</strong> (match único y sin ambigüedad contra el
        registro ISP) esperando confirmación masiva.
      </p>
      <Button size="sm" disabled={pendiente} onClick={confirmar}>
        {pendiente ? "Confirmando…" : `Confirmar los ${cantidad} de alta confianza`}
      </Button>
      {mensaje && <p className="text-sm text-muted-foreground">{mensaje}</p>}
    </div>
  );
}
