import Link from "next/link";
import {
  listarCategorias,
  listarProductos,
} from "@/services/productos/productosService";
import { ProductCard } from "@/components/storefront/ProductCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function Home() {
  const [categorias, destacados] = await Promise.all([
    listarCategorias(),
    listarProductos({ pagina: 1 }),
  ]);
  const visibles = categorias.filter((c) => c.slug !== "por-clasificar");

  return (
    <div className="space-y-12">
      <section className="rounded-xl bg-gradient-to-br from-brand to-brand-dark px-6 py-12 text-center text-white">
        <h1 className="text-3xl font-bold sm:text-4xl">Farmacias AhorraBien</h1>
        <p className="mt-1 font-semibold text-brand-green">Tu salud a tu alcance</p>
        <p className="mx-auto mt-3 max-w-xl text-blue-50">
          Precios convenientes y despacho a domicilio.
        </p>
        <Button asChild size="lg" variant="secondary" className="mt-6">
          <Link href="/productos">Ver catálogo completo</Link>
        </Button>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Categorías</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {visibles.map((c) => (
            <Link key={c.id} href={`/categoria/${c.slug}`}>
              <Card className="h-full transition-colors hover:bg-muted/60">
                <CardContent className="flex h-full items-center justify-center p-4 text-center text-sm font-medium">
                  {c.nombre}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Productos</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {destacados.productos.slice(0, 8).map((p) => (
            <ProductCard key={p.id} producto={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
