"use client";

import { useState } from "react";
import { enviarReclamo } from "@/services/pedidos/reclamos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ReclamosPage() {
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const r = await enviarReclamo({
      email: String(form.get("email") ?? ""),
      mensaje: String(form.get("mensaje") ?? ""),
    });
    if (r.ok) setEnviado(true);
    else setError(r.error ?? "Error inesperado.");
    setEnviando(false);
  }

  if (enviado) {
    return (
      <div className="mx-auto max-w-lg space-y-3 py-16 text-center">
        <h1 className="text-2xl font-semibold">Reclamo recibido</h1>
        <p className="text-muted-foreground">
          Te responderemos al email indicado. Gracias por ayudarnos a mejorar.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 py-8">
      <h1 className="text-2xl font-semibold">Reclamos</h1>
      <p className="text-sm text-muted-foreground">
        Si tuviste un problema con un pedido o con la atención, cuéntanos.
        Registramos y respondemos todos los reclamos.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Tu email *</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mensaje">Descripción del reclamo *</Label>
          <Textarea id="mensaje" name="mensaje" rows={6} required />
        </div>
        {error && (
          <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
            {error}
          </p>
        )}
        <Button type="submit" disabled={enviando}>
          {enviando ? "Enviando…" : "Enviar reclamo"}
        </Button>
      </form>
    </div>
  );
}
