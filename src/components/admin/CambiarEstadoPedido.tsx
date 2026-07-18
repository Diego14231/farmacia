"use client";

import { useTransition } from "react";
import { cambiarEstadoPedido } from "@/services/admin/actions";
import type { EstadoPedido } from "@/types/database";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ESTADOS: EstadoPedido[] = [
  "pendiente_pago",
  "pagado",
  "pendiente_validacion_qf",
  "en_preparacion",
  "despachado",
  "entregado",
  "cancelado",
];

export function CambiarEstadoPedido({
  pedidoId,
  estadoActual,
}: {
  pedidoId: string;
  estadoActual: string;
}) {
  const [pendiente, startTransition] = useTransition();

  return (
    <Select
      value={estadoActual}
      disabled={pendiente}
      onValueChange={(estado) =>
        startTransition(async () => {
          await cambiarEstadoPedido(pedidoId, estado as EstadoPedido);
        })
      }
    >
      <SelectTrigger className="w-52" size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ESTADOS.map((e) => (
          <SelectItem key={e} value={e}>
            {e.replaceAll("_", " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
