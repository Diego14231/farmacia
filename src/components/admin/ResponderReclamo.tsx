"use client";

import { useState, useTransition } from "react";
import { responderReclamo } from "@/services/admin/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ResponderReclamo({ reclamoId }: { reclamoId: string }) {
  const [pendiente, startTransition] = useTransition();
  const [respuesta, setRespuesta] = useState("");

  return (
    <div className="space-y-2">
      <Textarea
        placeholder="Escribir respuesta…"
        value={respuesta}
        onChange={(e) => setRespuesta(e.target.value)}
        rows={2}
      />
      <Button
        variant="success"
        size="sm"
        disabled={pendiente || !respuesta.trim()}
        onClick={() =>
          startTransition(async () => {
            await responderReclamo(reclamoId, respuesta.trim(), "resuelto");
          })
        }
      >
        Responder y resolver
      </Button>
    </div>
  );
}
