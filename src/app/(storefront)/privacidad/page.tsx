export const metadata = { title: "Política de privacidad" };

export default function PrivacidadPage() {
  return (
    <article className="prose prose-sm mx-auto max-w-2xl py-8 dark:prose-invert">
      <h1>Política de privacidad y tratamiento de datos personales</h1>
      <p>
        Farmacia AhorraBien trata los datos personales de sus clientes
        conforme a la Ley N°21.719 de Protección de Datos Personales.
      </p>

      <h2>Qué datos tratamos y para qué</h2>
      <ul>
        <li>
          <strong>Datos de contacto y despacho</strong> (nombre, RUT, email,
          teléfono, dirección): para procesar y despachar tu pedido, y
          contactarte sobre su estado.
        </li>
        <li>
          <strong>Recetas médicas</strong>: son{" "}
          <strong>datos sensibles de salud</strong>. Se usan exclusivamente
          para la validación farmacéutica exigida por la normativa sanitaria,
          se almacenan cifradas en repositorio de acceso restringido (solo el
          personal farmacéutico autorizado accede a ellas) y se conservan por
          el plazo mínimo legal de 6 meses.
        </li>
      </ul>

      <h2>Lo que no hacemos</h2>
      <ul>
        <li>No vendemos ni cedemos tus datos a terceros.</li>
        <li>No usamos tus datos de salud con fines comerciales.</li>
      </ul>

      <h2>Tus derechos</h2>
      <p>
        Puedes solicitar acceso, rectificación, supresión, oposición y
        portabilidad de tus datos escribiendo a{" "}
        <strong>[PENDIENTE — email de contacto]</strong>.
      </p>
    </article>
  );
}
