import { notFound } from "next/navigation";
import {
  obtenerBioequivalentes,
  obtenerProductoPorSku,
} from "@/services/productos/productosService";
import { formatearPrecio, ETIQUETA_CONDICION_VENTA } from "@/lib/formato";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AgregarAlCarrito } from "@/components/storefront/AgregarAlCarrito";
import { ProductCard } from "@/components/storefront/ProductCard";
import { Pill, Snowflake } from "lucide-react";

interface Props {
  params: Promise<{ sku: string }>;
}

export default async function ProductoPage({ params }: Props) {
  const { sku } = await params;
  const producto = await obtenerProductoPorSku(decodeURIComponent(sku));
  if (!producto) notFound();

  const bioequivalentes = await obtenerBioequivalentes(producto);
  const requiereReceta =
    producto.condicion_venta != null &&
    producto.condicion_venta !== "directa" &&
    producto.condicion_venta !== "no_vendible_online";

  return (
    <div className="space-y-10">
      <div className="grid gap-8 md:grid-cols-2">
        <div className="flex aspect-square items-center justify-center rounded-lg bg-muted">
          <Pill className="size-24 text-muted-foreground/30" aria-hidden />
        </div>
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold">{producto.nombre}</h1>
          <p className="text-3xl font-bold text-emerald-700">
            {formatearPrecio(producto.precio_venta)}
          </p>

          <div className="flex flex-wrap gap-2">
            {producto.condicion_venta && (
              <Badge variant={requiereReceta ? "destructive" : "secondary"}>
                {ETIQUETA_CONDICION_VENTA[producto.condicion_venta]}
              </Badge>
            )}
            {producto.requiere_cadena_frio && (
              <Badge variant="outline">
                <Snowflake className="size-3" /> Requiere cadena de frío
              </Badge>
            )}
            <Badge variant="outline">
              {producto.stock_actual > 0
                ? `Stock disponible: ${producto.stock_actual}`
                : "Sin stock"}
            </Badge>
          </div>

          {requiereReceta && (
            <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              Este medicamento requiere receta médica. Al finalizar tu compra
              deberás adjuntar la receta, la que será validada por nuestro
              químico farmacéutico antes del despacho.
            </p>
          )}

          <dl className="space-y-1 text-sm text-muted-foreground">
            {producto.principio_activo && (
              <div>
                <dt className="inline font-medium">Principio activo: </dt>
                <dd className="inline">{producto.principio_activo}</dd>
              </div>
            )}
            {producto.registro_isp && (
              <div>
                <dt className="inline font-medium">Registro ISP: </dt>
                <dd className="inline">{producto.registro_isp}</dd>
              </div>
            )}
            <div>
              <dt className="inline font-medium">Código: </dt>
              <dd className="inline">{producto.sku_codigo}</dd>
            </div>
          </dl>

          {producto.descripcion && (
            <>
              <Separator />
              <p className="text-sm">{producto.descripcion}</p>
            </>
          )}

          <div className="max-w-xs pt-2">
            <AgregarAlCarrito producto={producto} />
          </div>
        </div>
      </div>

      {bioequivalentes.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">
            Alternativas con el mismo principio activo
          </h2>
          <p className="text-sm text-muted-foreground">
            Productos bioequivalentes ordenados por precio.
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {bioequivalentes.map((p) => (
              <ProductCard key={p.id} producto={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
