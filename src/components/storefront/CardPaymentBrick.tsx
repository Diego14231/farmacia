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
  onSubmit: (datos: DatosTarjetaBrick) => Promise<void>;
  procesando: boolean;
}

const CONTAINER_ID = "cardPaymentBrick_container";

export function CardPaymentBrick({ amount, payerEmail, onSubmit, procesando }: Props) {
  const [sdkListo, setSdkListo] = useState(false);
  const controllerRef = useRef<{ unmount: () => void } | null>(null);

  useEffect(() => {
    if (!sdkListo) return;
    const publicKey = process.env.NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY;
    if (!publicKey) return;

    let cancelado = false;

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
            await onSubmit({
              token: formData.token,
              payment_method_id: formData.payment_method_id,
              installments: formData.installments,
              issuer_id: formData.issuer_id,
              tipoTarjeta: additionalData?.paymentTypeId ?? "credit_card",
              payerEmail,
            });
          },
        },
      });
      if (!cancelado) controllerRef.current = controller;
      else controller.unmount();
    }

    render();

    return () => {
      cancelado = true;
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
