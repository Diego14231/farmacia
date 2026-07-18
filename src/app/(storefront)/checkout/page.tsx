"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCarrito } from "@/hooks/useCarrito";
import { crearPedido, subirReceta } from "@/services/pedidos/actions";
import { formatearPrecio } from "@/lib/formato";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, requiereReceta, vaciar } = useCarrito();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tipoReceta, setTipoReceta] = useState("simple");
  const [archivoReceta, setArchivoReceta] = useState<File | null>(null);

  if (items.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        Tu carrito está vacío.
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (requiereReceta && !archivoReceta) {
      setError("Debes adjuntar la receta médica para continuar.");
      return;
    }

    setEnviando(true);
    const form = new FormData(e.currentTarget);
    const resultado = await crearPedido({
      nombre: String(form.get("nombre") ?? ""),
      email: String(form.get("email") ?? ""),
      telefono: String(form.get("telefono") ?? ""),
      rut: String(form.get("rut") ?? ""),
      calle: String(form.get("calle") ?? ""),
      numero: String(form.get("numero") ?? ""),
      comuna: String(form.get("comuna") ?? ""),
      ciudad: String(form.get("ciudad") ?? ""),
      referencia: String(form.get("referencia") ?? ""),
      items: items.map((i) => ({ sku: i.sku, cantidad: i.cantidad })),
    });

    if (!resultado.ok || !resultado.pedidoId) {
      setError(resultado.error ?? "Error inesperado.");
      setEnviando(false);
      return;
    }

    if (requiereReceta && archivoReceta) {
      const fd = new FormData();
      fd.set("pedidoId", resultado.pedidoId);
      fd.set("tipo", tipoReceta);
      fd.set("archivo", archivoReceta);
      const subida = await subirReceta(fd);
      if (!subida.ok) {
        setError(subida.error ?? "No se pudo subir la receta.");
        setEnviando(false);
        return;
      }
    }

    vaciar();
    if (resultado.urlPago) {
      window.location.href = resultado.urlPago; // redirige a Mercado Pago
    } else {
      router.push(`/checkout/gracias?pedido=${resultado.pedidoId}`);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold">Finalizar compra</h1>

      <form onSubmit={onSubmit} className="space-y-6">
        <section className="space-y-4">
          <h2 className="font-semibold">Datos de contacto</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre completo *</Label>
              <Input id="nombre" name="nombre" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rut">RUT</Label>
              <Input id="rut" name="rut" placeholder="12.345.678-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefono">Teléfono *</Label>
              <Input id="telefono" name="telefono" type="tel" placeholder="+56 9 …" required />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-semibold">Dirección de despacho</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="calle">Calle *</Label>
              <Input id="calle" name="calle" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="numero">Número / depto</Label>
              <Input id="numero" name="numero" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comuna">Comuna *</Label>
              <Input id="comuna" name="comuna" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ciudad">Ciudad *</Label>
              <Input id="ciudad" name="ciudad" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="referencia">Referencia</Label>
              <Input id="referencia" name="referencia" placeholder="Casa esquina, timbre azul…" />
            </div>
          </div>
        </section>

        {requiereReceta && (
          <section className="space-y-4 rounded-md border border-amber-300 bg-amber-50 p-4">
            <h2 className="font-semibold text-amber-900">Receta médica</h2>
            <p className="text-sm text-amber-900">
              Tu pedido incluye medicamentos que requieren receta. Adjúntala
              aquí — será validada por nuestro químico farmacéutico antes del
              despacho.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tipo de receta</Label>
                <Select value={tipoReceta} onValueChange={setTipoReceta}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Receta simple</SelectItem>
                    <SelectItem value="retenida">Receta retenida</SelectItem>
                    <SelectItem value="cheque">Receta cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="receta">Archivo (PDF o foto) *</Label>
                <Input
                  id="receta"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setArchivoReceta(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
          </section>
        )}

        <Separator />

        <section className="space-y-2">
          <h2 className="font-semibold">Resumen</h2>
          <ul className="space-y-1 text-sm">
            {items.map((i) => (
              <li key={i.sku} className="flex justify-between">
                <span>
                  {i.cantidad} × {i.nombre}
                </span>
                <span>{formatearPrecio(i.precio * i.cantidad)}</span>
              </li>
            ))}
          </ul>
          <p className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>{formatearPrecio(subtotal)}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            El costo de despacho se confirmará según tu comuna.
          </p>
        </section>

        {error && (
          <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={enviando}>
          {enviando ? "Procesando…" : "Confirmar pedido"}
        </Button>
      </form>
    </div>
  );
}
