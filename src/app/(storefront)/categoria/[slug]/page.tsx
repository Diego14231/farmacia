import { notFound } from "next/navigation";
import {
  listarCategorias,
  listarProductos,
} from "@/services/productos/productosService";
import { CatalogoGrid } from "@/components/storefront/CatalogoGrid";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ pagina?: string }>;
}

export default async function CategoriaPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { pagina } = await searchParams;

  const categorias = await listarCategorias();
  const categoria = categorias.find((c) => c.slug === slug);
  if (!categoria) notFound();

  const lista = await listarProductos({
    categoriaSlug: slug,
    pagina: pagina ? Number(pagina) : 1,
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{categoria.nombre}</h1>
      <CatalogoGrid lista={lista} hrefBase={`/categoria/${slug}`} />
    </div>
  );
}
