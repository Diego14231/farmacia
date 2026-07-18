import Link from "next/link";

/**
 * Footer con los contenidos de compliance del checklist ISP (plan, sección 5).
 * Los datos marcados [PENDIENTE] se completan cuando la farmacia entregue la
 * información real (resolución sanitaria, Directora Técnica, dirección).
 */
export function Footer() {
  return (
    <footer className="mt-auto border-t bg-muted/40 text-sm">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="font-semibold">Farmacia AhorraBien</p>
          <p className="mt-2 text-muted-foreground">
            Dirección: [PENDIENTE — dirección del local]
          </p>
          <p className="text-muted-foreground">
            Directora Técnica (Químico Farmacéutico): [PENDIENTE — nombre]
          </p>
        </div>
        <div>
          <p className="font-semibold">Información legal</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>
              <Link href="/marco-regulatorio" className="hover:underline">
                Marco regulatorio y resoluciones sanitarias
              </Link>
            </li>
            <li>
              <Link href="/politicas" className="hover:underline">
                Políticas de venta, cambios y devoluciones
              </Link>
            </li>
            <li>
              <Link href="/privacidad" className="hover:underline">
                Política de privacidad
              </Link>
            </li>
            <li>
              <Link href="/reclamos" className="hover:underline">
                Reclamos
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-semibold">Uso responsable de medicamentos</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>
              <Link href="/uso-racional-medicamentos" className="hover:underline">
                Infografía: uso racional de medicamentos
              </Link>
            </li>
            <li>
              <a
                href="https://www.minsal.cl/medicamentos_uso_racional/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
              >
                Material oficial MINSAL
              </a>
            </li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Resolución sanitaria del local: [PENDIENTE — N° y fecha]. La
            autorización ISP de expendio de medicamentos por medios
            electrónicos se publicará aquí una vez obtenida.
          </p>
        </div>
      </div>
    </footer>
  );
}
