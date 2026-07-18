import Link from "next/link";
import type { ListaProductos } from "@/services/productos/productosService";
import { ProductCard } from "./ProductCard";
import { Button } from "@/components/ui/button";

interface Props {
  lista: ListaProductos;
  /** ruta base para la paginación, ej. "/productos?q=aspirina" */
  hrefBase: string;
}

export function CatalogoGrid({ lista, hrefBase }: Props) {
  const { productos, total, pagina, totalPaginas } = lista;
  const sep = hrefBase.includes("?") ? "&" : "?";

  if (productos.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        No se encontraron productos.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {total} producto{total === 1 ? "" : "s"}
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {productos.map((p) => (
          <ProductCard key={p.id} producto={p} />
        ))}
      </div>
      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button asChild variant="outline" disabled={pagina <= 1}>
            <Link href={`${hrefBase}${sep}pagina=${pagina - 1}`}>Anterior</Link>
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {pagina} de {totalPaginas}
          </span>
          <Button asChild variant="outline" disabled={pagina >= totalPaginas}>
            <Link href={`${hrefBase}${sep}pagina=${pagina + 1}`}>Siguiente</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
