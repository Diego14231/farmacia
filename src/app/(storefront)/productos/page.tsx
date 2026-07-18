import { listarProductos } from "@/services/productos/productosService";
import { CatalogoGrid } from "@/components/storefront/CatalogoGrid";

export const metadata = { title: "Catálogo" };

interface Props {
  searchParams: Promise<{ q?: string; pagina?: string }>;
}

export default async function ProductosPage({ searchParams }: Props) {
  const { q, pagina } = await searchParams;
  const lista = await listarProductos({
    busqueda: q,
    pagina: pagina ? Number(pagina) : 1,
  });

  const hrefBase = q ? `/productos?q=${encodeURIComponent(q)}` : "/productos";

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">
        {q ? `Resultados para "${q}"` : "Todo el catálogo"}
      </h1>
      <CatalogoGrid lista={lista} hrefBase={hrefBase} />
    </div>
  );
}
