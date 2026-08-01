import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerStaffActual } from "@/services/admin/auth";
import { CerrarSesionBoton } from "@/components/admin/CerrarSesionBoton";
import { Logo } from "@/components/storefront/Logo";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await obtenerStaffActual();
  if (!staff) redirect("/admin/login");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-brand-dark text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <span className="rounded-md bg-white px-2 py-1">
            <Logo compact />
          </span>
          <span className="font-bold">Panel interno</span>
          <nav className="flex gap-4 text-sm">
            <Link href="/admin/pedidos" className="hover:underline">
              Pedidos
            </Link>
            <Link href="/admin/recetas" className="hover:underline">
              Recetas
            </Link>
            <Link href="/admin/productos" className="hover:underline">
              Productos
            </Link>
            <Link href="/admin/clasificacion" className="hover:underline">
              Clasificación ISP
            </Link>
            <Link href="/admin/reclamos" className="hover:underline">
              Reclamos
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span>
              {staff.nombre} ({staff.rol})
            </span>
            <CerrarSesionBoton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}
