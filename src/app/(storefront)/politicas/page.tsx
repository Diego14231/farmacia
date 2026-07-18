export const metadata = { title: "Políticas de venta" };

export default function PoliticasPage() {
  return (
    <article className="prose prose-sm mx-auto max-w-2xl py-8 dark:prose-invert">
      <h1>Políticas de venta, cambios y devoluciones</h1>

      <h2>Venta y stock</h2>
      <ul>
        <li>
          Los precios publicados incluyen IVA y corresponden al canal online.
        </li>
        <li>
          El stock mostrado es en tiempo real; si un producto se agota entre
          la compra y la preparación del pedido, te contactaremos para
          ofrecerte una alternativa o la devolución íntegra de lo pagado.
        </li>
        <li>
          Los medicamentos que requieren receta médica solo se despachan
          previa validación de la receta por nuestro químico farmacéutico.
        </li>
      </ul>

      <h2>Cambios y devoluciones</h2>
      <ul>
        <li>
          Por razones sanitarias, <strong>los medicamentos no tienen cambio
          ni devolución</strong>, salvo falla o error de despacho atribuible
          a la farmacia.
        </li>
        <li>
          Los productos de perfumería, cuidado personal e insumos pueden
          cambiarse dentro de 10 días, sin uso y en su envase original,
          presentando la boleta.
        </li>
        <li>
          En caso de producto en mal estado, vencido o error de despacho,
          gestionamos el cambio o la devolución del dinero sin costo.
        </li>
      </ul>

      <h2>Medios de pago</h2>
      <p>
        Aceptamos pagos con tarjetas de crédito y débito a través de Mercado
        Pago. [PENDIENTE — confirmar la lista definitiva de medios de pago.]
      </p>

      <h2>Despacho</h2>
      <p>
        [PENDIENTE — zonas de cobertura, plazos y tarifas de despacho. Los
        productos que requieren cadena de frío se despachan con embalaje que
        garantiza la temperatura, en ventanas horarias acotadas.]
      </p>
    </article>
  );
}
