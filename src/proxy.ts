import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const RUTAS_CON_SESION = ["/admin", "/cuenta", "/login", "/registro"];

/**
 * Proxy estándar de @supabase/ssr (antes "middleware", renombrado en
 * Next.js 16): refresca la sesión (cookies) en cada request para que los
 * Server Components vean al usuario autenticado. Solo corre esa parte en
 * /admin (staff) y en las rutas de cuenta de cliente -- el resto del
 * storefront es público y no necesita sesión.
 *
 * También sirve como gate de contraseña simple (Basic Auth) para el preview
 * de Vercel mientras el sitio no está listo para ser público de verdad --
 * se activa SOLO si SITE_BASIC_AUTH_USER/PASSWORD están seteadas (en local,
 * sin esas env vars, no pide nada). El webhook de Mercado Pago queda AFUERA
 * del matcher a propósito: MP no manda credenciales Basic Auth, así que si
 * quedara adentro el webhook dejaría de funcionar.
 */
export async function proxy(request: NextRequest) {
  const usuario = process.env.SITE_BASIC_AUTH_USER;
  const clave = process.env.SITE_BASIC_AUTH_PASSWORD;
  if (usuario && clave) {
    const header = request.headers.get("authorization");
    const [esquema, credenciales] = header?.split(" ") ?? [];
    const [u, p] = credenciales ? atob(credenciales).split(":") : [];
    if (esquema !== "Basic" || u !== usuario || p !== clave) {
      return new NextResponse("Autenticación requerida", {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Basic realm="Farmacia AhorraBien - vista previa"',
        },
      });
    }
  }

  const necesitaSesion = RUTAS_CON_SESION.some((r) =>
    request.nextUrl.pathname.startsWith(r),
  );
  if (!necesitaSesion) return NextResponse.next();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/webhooks).*)"],
};
