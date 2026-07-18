export const metadata = { title: "Uso racional de medicamentos" };

/**
 * Infografía de medicamentos exigida por el Título VI BIS del DS 466/84
 * para sitios de comercio electrónico de medicamentos (plan, sección 8.4).
 * Contenido basado en el material oficial MINSAL/ISP de uso racional.
 */
export default function UsoRacionalPage() {
  return (
    <article className="prose prose-sm mx-auto max-w-2xl py-8 dark:prose-invert">
      <h1>Uso racional de medicamentos</h1>

      <h2>Antes de usar un medicamento</h2>
      <ul>
        <li>
          <strong>Consulta siempre a un profesional de la salud.</strong> El
          médico prescribe; el químico farmacéutico orienta sobre el uso
          correcto.
        </li>
        <li>
          No te automediques: un medicamento mal usado puede dañar tu salud.
        </li>
        <li>
          Lee el folleto del envase: dosis, frecuencia, duración del
          tratamiento y contraindicaciones.
        </li>
      </ul>

      <h2>Durante el tratamiento</h2>
      <ul>
        <li>Respeta la dosis y el horario indicados.</li>
        <li>
          Completa el tratamiento aunque te sientas mejor (especialmente con
          antibióticos).
        </li>
        <li>
          No combines medicamentos ni los mezcles con alcohol sin consultar.
        </li>
        <li>
          Informa a tu médico o químico farmacéutico cualquier reacción
          adversa.
        </li>
      </ul>

      <h2>Almacenamiento y desecho</h2>
      <ul>
        <li>
          Guarda los medicamentos en un lugar fresco y seco, lejos del
          alcance de los niños.
        </li>
        <li>Respeta la cadena de frío cuando el envase lo indique.</li>
        <li>No uses medicamentos vencidos.</li>
      </ul>

      <h2>Dónde comprar</h2>
      <ul>
        <li>
          Compra solo en farmacias autorizadas.{" "}
          <strong>
            Nunca compres medicamentos por redes sociales o portales de
            anuncios
          </strong>{" "}
          — no es comercio autorizado y pone en riesgo tu salud.
        </li>
      </ul>

      <p>
        Más información en el material oficial del Ministerio de Salud:{" "}
        <a
          href="https://www.minsal.cl/medicamentos_uso_racional/"
          target="_blank"
          rel="noopener noreferrer"
        >
          minsal.cl/medicamentos_uso_racional
        </a>
      </p>
    </article>
  );
}
