import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy estándar de @supabase/ssr (antes "middleware", renombrado en
 * Next.js 16): refresca la sesión (cookies) en cada request para que los
 * Server Components vean al usuario autenticado. Corre en /admin (staff) y
 * en las rutas de cuenta de cliente (/cuenta, /login, /registro) -- el
 * resto del storefront es público y no necesita sesión.
 */
export async function proxy(request: NextRequest) {
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
  matcher: ["/admin/:path*", "/cuenta/:path*", "/login", "/registro"],
};
