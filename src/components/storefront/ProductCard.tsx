import Link from "next/link";
import type { Producto } from "@/types/database";
import { formatearPrecio, ETIQUETA_CONDICION_VENTA } from "@/lib/formato";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { AgregarAlCarrito } from "./AgregarAlCarrito";
import { Pill } from "lucide-react";

export function ProductCard({ producto }: { producto: Producto }) {
  const requiereReceta =
    producto.condicion_venta != null &&
    producto.condicion_venta !== "directa" &&
    producto.condicion_venta !== "no_vendible_online";

  return (
    <Card className="flex h-full flex-col overflow-hidden py-0 transition-shadow hover:shadow-md">
      <CardHeader className="p-0">
        <div className="flex aspect-square items-center justify-center bg-gradient-to-b from-muted to-muted/60">
          {/* Sin fotos de producto todavía — placeholder neutro */}
          <Pill className="size-10 text-brand-green/30" aria-hidden />
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-2 pb-2">
        <Link
          href={`/producto/${encodeURIComponent(producto.sku_codigo)}`}
          className="line-clamp-2 text-sm font-medium hover:underline"
        >
          {producto.nombre}
        </Link>
        <p className="text-lg font-bold text-brand-green">
          {formatearPrecio(producto.precio_venta)}
        </p>
        {requiereReceta && (
          <Badge variant="secondary" className="text-xs">
            {ETIQUETA_CONDICION_VENTA[producto.condicion_venta!]}
          </Badge>
        )}
      </CardContent>
      <CardFooter>
        <AgregarAlCarrito producto={producto} />
      </CardFooter>
    </Card>
  );
}
