"use client";

import { useState } from "react";
import {
  consultarPedido,
  type DetallePedido,
} from "@/services/pedidos/actions";
import { formatearPrecio, ETIQUETA_ESTADO_PEDIDO } from "@/lib/formato";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function SeguimientoPedidoPage() {
  const [pedido, setPedido] = useState<DetallePedido | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBuscando(true);
    setError(null);
    setPedido(null);
    const form = new FormData(e.currentTarget);
    const r = await consultarPedido(
      String(form.get("pedidoId") ?? ""),
      String(form.get("email") ?? ""),
    );
    if (r.ok && r.pedido) setPedido(r.pedido);
    else setError(r.error ?? "Error inesperado.");
    setBuscando(false);
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Seguimiento de pedido</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ingresa el número de pedido (lo recibiste al finalizar tu compra) y
          el email con el que compraste.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="pedidoId">Número de pedido *</Label>
          <Input id="pedidoId" name="pedidoId" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email de la compra *</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        {error && (
          <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
            {error}
          </p>
        )}
        <Button type="submit" disabled={buscando}>
          {buscando ? "Buscando…" : "Ver estado del pedido"}
        </Button>
      </form>

      {pedido && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Pedido del{" "}
                {new Date(pedido.createdAt).toLocaleDateString("es-CL")}
              </p>
              <Badge variant="secondary">
                {ETIQUETA_ESTADO_PEDIDO[pedido.estado] ?? pedido.estado}
              </Badge>
            </div>

            <ul className="space-y-1 text-sm">
              {pedido.items.map((it, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">
                    {it.cantidad}× {it.nombre}
                  </span>
                  <span>{formatearPrecio(it.precioUnitario * it.cantidad)}</span>
                </li>
              ))}
            </ul>

            <div className="flex justify-between border-t pt-3 font-semibold">
              <span>Total</span>
              <span>{formatearPrecio(pedido.total)}</span>
            </div>

            {pedido.requiereReceta && (
              <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                {pedido.estadoReceta === "validada" && (
                  <p>Tu receta fue validada por nuestro químico farmacéutico.</p>
                )}
                {pedido.estadoReceta === "rechazada" && (
                  <p>
                    Tu receta fue rechazada
                    {pedido.motivoRechazoReceta
                      ? `: ${pedido.motivoRechazoReceta}`
                      : "."}{" "}
                    Contáctanos por la página de reclamos si tienes dudas.
                  </p>
                )}
                {(!pedido.estadoReceta || pedido.estadoReceta === "pendiente") && (
                  <p>Tu receta está pendiente de validación farmacéutica.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
