"use client";

import { useState } from "react";
import type { Producto } from "@/types/database";
import { useCarrito } from "@/hooks/useCarrito";
import { Button } from "@/components/ui/button";
import { Check, ShoppingCart } from "lucide-react";

export function AgregarAlCarrito({ producto }: { producto: Producto }) {
  const { agregar } = useCarrito();
  const [agregado, setAgregado] = useState(false);

  // Productos marcados como no vendibles online solo se muestran
  // informativamente (requisito del modelo de datos, plan sección 2.2)
  if (producto.condicion_venta === "no_vendible_online") {
    return (
      <Button variant="outline" className="w-full" disabled>
        Solo disponible en tienda
      </Button>
    );
  }

  function onAgregar() {
    agregar({
      sku: producto.sku_codigo,
      nombre: producto.nombre,
      precio: producto.precio_venta,
      esMedicamento: producto.es_medicamento,
      condicionVenta: producto.condicion_venta,
      imagenUrl: producto.imagen_url,
    });
    setAgregado(true);
    setTimeout(() => setAgregado(false), 1500);
  }

  return (
    <Button onClick={onAgregar} className="w-full" variant={agregado ? "secondary" : "default"}>
      {agregado ? (
        <>
          <Check className="size-4" /> Agregado
        </>
      ) : (
        <>
          <ShoppingCart className="size-4" /> Agregar
        </>
      )}
    </Button>
  );
}
