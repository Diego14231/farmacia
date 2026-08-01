"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { crearFichaCliente } from "@/services/cuenta/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function RegistroPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const form = new FormData(e.currentTarget);
    const nombre = String(form.get("nombre") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const telefono = String(form.get("telefono") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirmar = String(form.get("confirmar") ?? "");

    if (password !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setCargando(true);
    const supabase = createClient();
    const { data, error: errAuth } = await supabase.auth.signUp({ email, password });

    if (errAuth || !data.user) {
      setError(
        errAuth?.message.includes("already registered") ||
          errAuth?.message.includes("already been registered")
          ? "Ya existe una cuenta con ese email. Prueba iniciar sesión."
          : (errAuth?.message ?? "No se pudo crear la cuenta."),
      );
      setCargando(false);
      return;
    }

    const resultado = await crearFichaCliente({
      authUserId: data.user.id,
      nombre,
      email,
      telefono,
    });
    if (!resultado.ok) {
      setError(resultado.error ?? "Tu cuenta se creó, pero hubo un problema guardando tus datos.");
      setCargando(false);
      return;
    }

    router.push("/cuenta");
    router.refresh();
  }

  return (
    <div className="flex justify-center py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Crear cuenta</CardTitle>
          <p className="text-sm text-muted-foreground">
            Guarda tus datos para ver el estado de tus pedidos y recetas más
            rápido la próxima vez.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nombre">Nombre completo *</Label>
              <Input id="nombre" name="nombre" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input id="telefono" name="telefono" type="tel" placeholder="+56 9 …" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña *</Label>
                <Input id="password" name="password" type="password" required minLength={6} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmar">Confirmar *</Label>
                <Input id="confirmar" name="confirmar" type="password" required minLength={6} />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={cargando}>
              {cargando ? "Creando cuenta…" : "Crear cuenta"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link href="/login" className="underline">
                Inicia sesión
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
