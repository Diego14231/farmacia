import { CarritoProvider } from "@/hooks/useCarrito";
import { Header } from "@/components/storefront/Header";
import { Footer } from "@/components/storefront/Footer";
import { listarCategorias } from "@/services/productos/productosService";
import { createClient } from "@/lib/supabase/server";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const [categorias, { data: userData }] = await Promise.all([
    listarCategorias(),
    supabase.auth.getUser(),
  ]);

  let nombreCliente: string | null = null;
  if (userData.user) {
    const { data: cliente } = await supabase
      .from("clientes")
      .select("nombre")
      .eq("auth_user_id", userData.user.id)
      .maybeSingle();
    nombreCliente = cliente?.nombre ?? userData.user.email ?? "Mi cuenta";
  }

  return (
    <CarritoProvider>
      <div className="flex min-h-screen flex-col">
        <Header categorias={categorias} nombreCliente={nombreCliente} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
          {children}
        </main>
        <Footer />
      </div>
    </CarritoProvider>
  );
}
