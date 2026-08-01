import Link from "next/link";
import { User, Truck } from "lucide-react";
import type { Categoria } from "@/types/database";
import { CarritoBoton } from "./CarritoBoton";
import { BuscadorProductos } from "./BuscadorProductos";
import { MenuCategorias } from "./MenuCategorias";
import { Logo } from "./Logo";

// Solo estas aparecen como link directo en el header (además del menú
// hamburguesa, que siempre tiene TODAS) -- así nunca hace falta scroll
// horizontal ni se corta nada en mobile.
const CATEGORIAS_PRINCIPALES = ["medicamentos", "vitaminas-y-suplementos", "cuidado-personal"];

export function Header({
  categorias,
  nombreCliente,
}: {
  categorias: Categoria[];
  nombreCliente?: string | null;
}) {
  const visibles = categorias.filter((c) => c.slug !== "por-clasificar");
  const principales = visibles.filter((c) => CATEGORIAS_PRINCIPALES.includes(c.slug));
  return (
    <header className="border-b bg-background">
      {/* Barra superior: aviso breve, siempre real (no promociones inventadas) */}
      <div className="bg-brand-dark px-4 py-1.5 text-center text-xs text-white">
        <Truck className="mr-1 inline size-3.5 -translate-y-px" aria-hidden />
        Despacho a todo Chile · Recetas validadas por nuestro químico farmacéutico
      </div>

      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="shrink-0 text-lg">
          <Logo />
        </Link>
        <div className="hidden flex-1 md:block">
          <BuscadorProductos />
        </div>
        <Link
          href={nombreCliente ? "/cuenta" : "/login"}
          className="hidden items-center gap-1.5 text-sm hover:underline sm:flex"
        >
          <User className="size-4" aria-hidden />
          {nombreCliente ? nombreCliente.split(" ")[0] : "Ingresar"}
        </Link>
        <Link
          href={nombreCliente ? "/cuenta" : "/login"}
          className="shrink-0 sm:hidden"
          aria-label={nombreCliente ? "Mi cuenta" : "Ingresar"}
        >
          <User className="size-5" aria-hidden />
        </Link>
        <CarritoBoton />
      </div>
      <div className="px-4 pb-3 md:hidden">
        <BuscadorProductos />
      </div>

      <nav className="border-t bg-brand text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-1 px-4 py-1.5 text-sm">
          <MenuCategorias categorias={visibles} />
          <Link
            href="/productos"
            className="whitespace-nowrap rounded px-2 py-1 hover:bg-white/15"
          >
            Todo el catálogo
          </Link>
          {/* Solo en pantallas más anchas -- en mobile todo vive en el menú
              de arriba para no cortar contenido ni necesitar scroll. */}
          {principales.map((c) => (
            <Link
              key={c.id}
              href={`/categoria/${c.slug}`}
              className="hidden whitespace-nowrap rounded px-2 py-1 hover:bg-white/15 md:inline-block"
            >
              {c.nombre}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
