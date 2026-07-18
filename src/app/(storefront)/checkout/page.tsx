"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCarrito } from "@/hooks/useCarrito";
import {
  crearPedido,
  procesarPagoConTarjeta,
  subirReceta,
} from "@/services/pedidos/actions";
import { formatearPrecio } from "@/lib/formato";
import { guardarCookie, leerCookie } from "@/lib/cookies";
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
import {
  CardPaymentBrick,
  type DatosTarjetaBrick,
} from "@/components/storefront/CardPaymentBrick";

const COOKIE_CONTACTO = "ahorrabien:contacto";

interface DatosContacto {
  nombre: string;
  email: string;
  telefono: string;
  rut: string;
  calle: string;
  numero: string;
  comuna: string;
  ciudad: string;
  referencia: string;
}

const CONTACTO_VACIO: DatosContacto = {
  nombre: "",
  email: "",
  telefono: "",
  rut: "",
  calle: "",
  numero: "",
  comuna: "",
  ciudad: "",
  referencia: "",
};

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, requiereReceta, vaciar } = useCarrito();
  const [datos, setDatos] = useState<DatosContacto>(CONTACTO_VACIO);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tipoReceta, setTipoReceta] = useState("simple");
  const [archivoReceta, setArchivoReceta] = useState<File | null>(null);

  // Pedido ya creado -> pasamos a la pantalla de pago con tarjeta
  const [pedido, setPedido] = useState<{ id: string; total: number } | null>(null);
  const [procesandoPago, setProcesandoPago] = useState(false);

  // Recuerda los datos de contacto/despacho de una visita anterior (no son
  // datos sensibles: nombre, email, teléfono, dirección).
  useEffect(() => {
    const guardado = leerCookie(COOKIE_CONTACTO);
    if (guardado) {
      try {
        setDatos({ ...CONTACTO_VACIO, ...JSON.parse(guardado) });
      } catch {
        // cookie corrupta: se ignora
      }
    }
  }, []);

  function campo(nombre: keyof DatosContacto) {
    return {
      value: datos[nombre],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setDatos((d) => ({ ...d, [nombre]: e.target.value })),
    };
  }

  if (items.length === 0 && !pedido) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        Tu carrito está vacío.
      </div>
    );
  }

  async function onSubmitDatos(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (requiereReceta && !archivoReceta) {
      setError("Debes adjuntar la receta médica para continuar.");
      return;
    }

    setEnviando(true);
    const resultado = await crearPedido({
      ...datos,
      items: items.map((i) => ({ sku: i.sku, cantidad: i.cantidad })),
    });

    if (!resultado.ok || !resultado.pedidoId || resultado.total == null) {
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

    // Guarda los datos de contacto/despacho para la próxima visita (180 días)
    guardarCookie(COOKIE_CONTACTO, JSON.stringify(datos));

    setPedido({ id: resultado.pedidoId, total: resultado.total });
    setEnviando(false);
  }

  async function onSubmitTarjeta(datosTarjeta: DatosTarjetaBrick) {
    if (!pedido) return;
    setProcesandoPago(true);
    setError(null);

    const resultado = await procesarPagoConTarjeta(pedido.id, datosTarjeta);

    if (!resultado.ok) {
      setError(resultado.error ?? "No se pudo procesar el pago.");
      setProcesandoPago(false);
      return;
    }

    if (resultado.estado === "rechazado") {
      setError(resultado.detalle ?? "Tu tarjeta fue rechazada. Intenta con otra.");
      setProcesandoPago(false);
      return;
    }

    vaciar();
    router.push(`/checkout/gracias?pedido=${pedido.id}`);
  }

  // --- Paso 2: pago con tarjeta ------------------------------------------------
  if (pedido) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <h1 className="text-2xl font-semibold">Pagar con tarjeta</h1>
        <p className="text-muted-foreground">
          Total a pagar:{" "}
          <span className="font-bold text-foreground">
            {formatearPrecio(pedido.total)}
          </span>
        </p>
        {error && (
          <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
            {error}
          </p>
        )}
        <CardPaymentBrick
          amount={pedido.total}
          payerEmail={datos.email}
          onSubmit={onSubmitTarjeta}
          procesando={procesandoPago}
        />
      </div>
    );
  }

  // --- Paso 1: datos de contacto, despacho y receta ---------------------------
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold">Finalizar compra</h1>

      <form onSubmit={onSubmitDatos} className="space-y-6">
        <section className="space-y-4">
          <h2 className="font-semibold">Datos de contacto</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre completo *</Label>
              <Input id="nombre" required {...campo("nombre")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rut">RUT</Label>
              <Input id="rut" placeholder="12.345.678-9" {...campo("rut")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" required {...campo("email")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefono">Teléfono *</Label>
              <Input id="telefono" type="tel" placeholder="+56 9 …" required {...campo("telefono")} />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="font-semibold">Dirección de despacho</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="calle">Calle *</Label>
              <Input id="calle" required {...campo("calle")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="numero">Número / depto</Label>
              <Input id="numero" {...campo("numero")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comuna">Comuna *</Label>
              <Input id="comuna" required {...campo("comuna")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ciudad">Ciudad *</Label>
              <Input id="ciudad" required {...campo("ciudad")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="referencia">Referencia</Label>
              <Input id="referencia" placeholder="Casa esquina, timbre azul…" {...campo("referencia")} />
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
          {enviando ? "Procesando…" : "Continuar al pago"}
        </Button>
      </form>
    </div>
  );
}
