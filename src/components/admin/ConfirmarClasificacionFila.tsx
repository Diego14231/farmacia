"use client";

import { useState, useTransition } from "react";
import { confirmarClasificacion } from "@/services/admin/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CONDICIONES = [
  { value: "sin_clasificar", label: "Sin clasificar" },
  { value: "directa", label: "Venta directa" },
  { value: "receta_simple", label: "Receta simple" },
  { value: "receta_retenida", label: "Receta retenida" },
  { value: "receta_cheque", label: "Receta cheque" },
  { value: "receta_retenida_control_existencia", label: "Ret. control existencia" },
  { value: "no_vendible_online", label: "No vendible online" },
];

interface Props {
  producto: {
    id: string;
    nombre: string;
    sku: string;
    sugeridoMedicamento: string | null;
    sugeridoReceta: string | null;
    detalle: string | null;
  };
}

// Traduce el texto crudo que escribió el script (ver
// scripts/clasificar_medicamentos.py: ETIQUETA_REQUIERE_RECETA) al valor del
// enum condicion_venta -- solo para PRE-LLENAR el selector, la Química
// Farmacéutica puede cambiarlo antes de confirmar.
function condicionSugerida(receta: string | null): string {
  switch (receta) {
    case "NO (venta directa)":
      return "directa";
    case "SÍ - Receta Simple":
      return "receta_simple";
    case "SÍ - Receta Retenida":
      return "receta_retenida";
    case "SÍ - Receta Cheque":
      return "receta_cheque";
    case "SÍ - Receta Retenida con Control de Existencia":
      return "receta_retenida_control_existencia";
    default:
      return "sin_clasificar";
  }
}

export function ConfirmarClasificacionFila({ producto }: Props) {
  const [pendiente, startTransition] = useTransition();
  const [esMedicamento, setEsMedicamento] = useState(
    producto.sugeridoMedicamento === "SI" ||
      producto.sugeridoMedicamento === "SI (ambiguo)",
  );
  const [condicionVenta, setCondicionVenta] = useState(
    condicionSugerida(producto.sugeridoReceta),
  );
  const [confirmado, setConfirmado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (confirmado) return null; // sale de la cola apenas se confirma

  function confirmar() {
    startTransition(async () => {
      const r = await confirmarClasificacion(producto.id, {
        es_medicamento: esMedicamento,
        condicion_venta: condicionVenta === "sin_clasificar" ? null : condicionVenta,
      });
      if (r.ok) setConfirmado(true);
      else setError(r.error ?? "Error inesperado.");
    });
  }

  return (
    <tr className={pendiente ? "opacity-50" : ""}>
      <td className="p-3 align-top">
        <div className="max-w-xs font-medium">{producto.nombre}</div>
        <div className="text-xs text-muted-foreground">{producto.sku}</div>
      </td>
      <td className="p-3 align-top">
        <Badge
          variant={
            producto.sugeridoMedicamento === "SI (ambiguo)" ? "secondary" : "outline"
          }
        >
          {producto.sugeridoMedicamento ?? "—"}
        </Badge>
      </td>
      <td className="max-w-sm p-3 align-top text-xs text-muted-foreground">
        {producto.detalle ?? "—"}
      </td>
      <td className="p-3 align-top">
        <label className="flex items-center gap-2 text-sm whitespace-nowrap">
          <input
            type="checkbox"
            checked={esMedicamento}
            disabled={pendiente}
            onChange={(e) => setEsMedicamento(e.target.checked)}
            className="size-4 accent-brand"
          />
          Es medicamento
        </label>
      </td>
      <td className="p-3 align-top">
        <Select value={condicionVenta} disabled={pendiente} onValueChange={setCondicionVenta}>
          <SelectTrigger className="w-48" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONDICIONES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="p-3 align-top">
        <Button size="sm" disabled={pendiente} onClick={confirmar}>
          Confirmar
        </Button>
        {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
      </td>
    </tr>
  );
}
