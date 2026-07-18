"use client";

import Link from "next/link";
import { useCarrito } from "@/hooks/useCarrito";
import { formatearPrecio } from "@/lib/formato";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Trash2 } from "lucide-react";

export default function CarritoPage() {
  const { items, actualizarCantidad, quitar, subtotal, requiereReceta } =
    useCarrito();

  if (items.length === 0) {
    return (
      <div className="space-y-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Tu carrito está vacío</h1>
        <Button asChild>
          <Link href="/productos">Ver catálogo</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Carrito</h1>

      <ul className="divide-y rounded-lg border">
        {items.map((item) => (
          <li key={item.sku} className="flex items-center gap-4 p-4">
            <div className="flex-1">
              <Link
                href={`/producto/${encodeURIComponent(item.sku)}`}
                className="font-medium hover:underline"
              >
                {item.nombre}
              </Link>
              <p className="text-sm text-muted-foreground">
                {formatearPrecio(item.precio)} c/u
              </p>
            </div>
            <Input
              type="number"
              min={1}
              value={item.cantidad}
              onChange={(e) =>
                actualizarCantidad(item.sku, Number(e.target.value))
              }
              className="w-20"
              aria-label={`Cantidad de ${item.nombre}`}
            />
            <p className="w-24 text-right font-semibold">
              {formatearPrecio(item.precio * item.cantidad)}
            </p>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => quitar(item.sku)}
              aria-label={`Quitar ${item.nombre}`}
            >
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ul>

      {requiereReceta && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Tu carrito incluye medicamentos que requieren receta médica —
          deberás adjuntarla en el siguiente paso.
        </p>
      )}

      <Separator />

      <div className="flex items-center justify-between">
        <p className="text-lg">
          Subtotal: <span className="font-bold">{formatearPrecio(subtotal)}</span>
        </p>
        <Button asChild size="lg">
          <Link href="/checkout">Continuar al pago</Link>
        </Button>
      </div>
    </div>
  );
}
