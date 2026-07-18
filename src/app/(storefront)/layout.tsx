import { CarritoProvider } from "@/hooks/useCarrito";
import { Header } from "@/components/storefront/Header";
import { Footer } from "@/components/storefront/Footer";
import { listarCategorias } from "@/services/productos/productosService";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categorias = await listarCategorias();
  return (
    <CarritoProvider>
      <div className="flex min-h-screen flex-col">
        <Header categorias={categorias} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
          {children}
        </main>
        <Footer />
      </div>
    </CarritoProvider>
  );
}
