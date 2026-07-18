import Link from "next/link";
import type { Categoria } from "@/types/database";
import { CarritoBoton } from "./CarritoBoton";
import { BuscadorProductos } from "./BuscadorProductos";

export function Header({ categorias }: { categorias: Categoria[] }) {
  const visibles = categorias.filter((c) => c.slug !== "por-clasificar");
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="shrink-0 text-xl font-bold tracking-tight text-emerald-700">
          Farmacia AhorraBien
        </Link>
        <div className="hidden flex-1 md:block">
          <BuscadorProductos />
        </div>
        <CarritoBoton />
      </div>
      <div className="px-4 pb-3 md:hidden">
        <BuscadorProductos />
      </div>
      <nav className="border-t bg-muted/40">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 py-1.5 text-sm">
          <Link
            href="/productos"
            className="whitespace-nowrap rounded px-2 py-1 hover:bg-muted"
          >
            Todo el catálogo
          </Link>
          {visibles.map((c) => (
            <Link
              key={c.id}
              href={`/categoria/${c.slug}`}
              className="whitespace-nowrap rounded px-2 py-1 hover:bg-muted"
            >
              {c.nombre}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
