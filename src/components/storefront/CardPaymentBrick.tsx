"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    MercadoPago: new (publicKey: string, opts?: { locale?: string }) => {
      bricks: () => {
        create: (
          type: string,
          containerId: string,
          settings: Record<string, unknown>,
        ) => Promise<{ unmount: () => void }>;
      };
    };
  }
}

export interface DatosTarjetaBrick {
  token: string;
  payment_method_id: string;
  tipoTarjeta: string;
  installments: number;
  issuer_id?: string;
  payerEmail: string;
}

interface Props {
  amount: number;
  payerEmail: string;
  // Debe devolver true si el pago quedó aprobado. El Card Payment Brick usa
  // que la promesa de onSubmit se RECHACE (no solo "false") como señal para
  // reactivar el botón y los campos y permitir reintentar con otra tarjeta --
  // si siempre resolvemos (incluso en un rechazo), el Brick queda pensando
  // que el intento terminó y el botón no vuelve a responder.
  onSubmit: (datos: DatosTarjetaBrick) => Promise<boolean>;
  procesando: boolean;
}

const CONTAINER_ID = "cardPaymentBrick_container";

/**
 * El campo "Nombre del titular" del Brick es un <input> real dentro de
 * nuestra página (no un iframe seguro como el número/vencimiento/CVV), así
 * que sí podemos tocarlo -- las tarjetas siempre llevan el nombre en
 * mayúsculas, y a mano es fácil olvidarlo. Como el campo lo renderiza el SDK
 * de Mercado Pago (no nuestro JSX), no puede ser un input controlado de
 * React: se conecta un listener de DOM directo apenas el campo existe.
 */
function forzarMayusculasEnTitular(container: HTMLElement): () => void {
  let conectado = false;

  function alEscribir(e: Event) {
    const el = e.target as HTMLInputElement;
    const mayus = el.value.toUpperCase();
    if (el.value === mayus) return; // ya en mayúsculas -- corta el loop del dispatchEvent de abajo
    const cursor = el.selectionStart;
    el.value = mayus;
    if (cursor != null) el.setSelectionRange(cursor, cursor);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function intentarConectar() {
    if (conectado) return;
    const input = container.querySelector<HTMLInputElement>('input[name="HOLDER_NAME"]');
    if (!input) return;
    conectado = true;
    input.addEventListener("input", alEscribir);
  }

  intentarConectar();
  const observer = new MutationObserver(intentarConectar);
  observer.observe(container, { childList: true, subtree: true });
  return () => observer.disconnect();
}

export function CardPaymentBrick({ amount, payerEmail, onSubmit, procesando }: Props) {
  const [sdkListo, setSdkListo] = useState(false);
  const controllerRef = useRef<{ unmount: () => void } | null>(null);

  useEffect(() => {
    if (!sdkListo) return;
    const publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;
    if (!publicKey) return;

    let cancelado = false;
    let detenerMayusculas: (() => void) | null = null;

    async function render() {
      const mp = new window.MercadoPago(publicKey!, { locale: "es-CL" });
      const controller = await mp.bricks().create("cardPayment", CONTAINER_ID, {
        initialization: { amount },
        customization: { visual: { style: { theme: "default" } } },
        callbacks: {
          onReady: () => {},
          onError: (error: unknown) => {
            console.error("Card Payment Brick:", error);
          },
          onSubmit: async (formData: {
            token: string;
            payment_method_id: string;
            installments: number;
            issuer_id?: string;
          }, additionalData?: { paymentTypeId?: string }) => {
            const aprobado = await onSubmit({
              token: formData.token,
              payment_method_id: formData.payment_method_id,
              installments: formData.installments,
              issuer_id: formData.issuer_id,
              tipoTarjeta: additionalData?.paymentTypeId ?? "credit_card",
              payerEmail,
            });
            // Rechazar la promesa (no solo resolver con false) es lo que le
            // indica al Brick que reactive el formulario para reintentar.
            if (!aprobado) throw new Error("Pago no aprobado");
          },
        },
      });
      if (!cancelado) {
        controllerRef.current = controller;
        const contenedor = document.getElementById(CONTAINER_ID);
        if (contenedor) detenerMayusculas = forzarMayusculasEnTitular(contenedor);
      } else {
        controller.unmount();
      }
    }

    render();

    return () => {
      cancelado = true;
      detenerMayusculas?.();
      controllerRef.current?.unmount();
      controllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkListo, amount]);

  if (!process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY) {
    return (
      <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        El pago con tarjeta todavía no está configurado (falta la clave
        pública de Mercado Pago).
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Script
        src="https://sdk.mercadopago.com/js/v2"
        strategy="afterInteractive"
        onReady={() => setSdkListo(true)}
      />
      <div id={CONTAINER_ID} />
      {procesando && (
        <p className="text-sm text-muted-foreground">Procesando el pago…</p>
      )}
    </div>
  );
}
