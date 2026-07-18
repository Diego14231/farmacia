"use client";

import { useTransition } from "react";
import { actualizarProducto } from "@/services/admin/actions";
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
    precio: number;
    stock: number;
    activoOnline: boolean;
    condicionVenta: string | null;
    categoriaId: string | null;
  };
  categorias: Array<{ id: string; nombre: string }>;
  precioFormateado: string;
}

export function EditarProductoFila({ producto, categorias, precioFormateado }: Props) {
  const [pendiente, startTransition] = useTransition();

  function actualizar(campos: Parameters<typeof actualizarProducto>[1]) {
    startTransition(async () => {
      await actualizarProducto(producto.id, campos);
    });
  }

  return (
    <tr className={pendiente ? "opacity-50" : ""}>
      <td className="p-3">
        <div className="max-w-xs truncate font-medium">{producto.nombre}</div>
        <div className="text-xs text-muted-foreground">{producto.sku}</div>
      </td>
      <td className="p-3">{precioFormateado}</td>
      <td className="p-3">{producto.stock}</td>
      <td className="p-3">
        <Select
          value={producto.categoriaId ?? undefined}
          disabled={pendiente}
          onValueChange={(categoriaId) => actualizar({ categoria_id: categoriaId })}
        >
          <SelectTrigger className="w-44" size="sm">
            <SelectValue placeholder="Sin categoría" />
          </SelectTrigger>
          <SelectContent>
            {categorias.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="p-3">
        <Select
          value={producto.condicionVenta ?? "sin_clasificar"}
          disabled={pendiente}
          onValueChange={(v) =>
            actualizar({ condicion_venta: v === "sin_clasificar" ? null : v })
          }
        >
          <SelectTrigger className="w-44" size="sm">
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
      <td className="p-3">
        <input
          type="checkbox"
          checked={producto.activoOnline}
          disabled={pendiente}
          onChange={(e) => actualizar({ activo_online: e.target.checked })}
          className="size-4 accent-emerald-600"
          aria-label={`Visible online: ${producto.nombre}`}
        />
      </td>
    </tr>
  );
}
