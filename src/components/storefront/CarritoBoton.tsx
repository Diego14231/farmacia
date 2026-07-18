"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCarrito } from "@/hooks/useCarrito";
import { Button } from "@/components/ui/button";

export function CarritoBoton() {
  const { totalItems } = useCarrito();
  return (
    <Button asChild variant="outline" className="relative shrink-0">
      <Link href="/carrito" aria-label={`Carrito, ${totalItems} productos`}>
        <ShoppingCart className="size-4" />
        <span className="hidden sm:inline">Carrito</span>
        {totalItems > 0 && (
          <span className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-emerald-600 text-xs font-semibold text-white">
            {totalItems > 99 ? "99+" : totalItems}
          </span>
        )}
      </Link>
    </Button>
  );
}
