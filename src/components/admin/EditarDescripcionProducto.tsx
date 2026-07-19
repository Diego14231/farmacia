"use client";

import { useState, useTransition } from "react";
import { actualizarProducto } from "@/services/admin/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Props {
  productoId: string;
  nombre: string;
  descripcion: string | null;
}

/**
 * Ojo: esta descripción la escribe el staff/químico farmacéutico, nunca se
 * genera automáticamente -- afirmar "qué hace" un medicamento es información
 * clínica real, no algo que un script deba inventar.
 */
export function EditarDescripcionProducto({ productoId, nombre, descripcion }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [valor, setValor] = useState(descripcion ?? "");
  const [pendiente, startTransition] = useTransition();

  function guardar() {
    startTransition(async () => {
      const r = await actualizarProducto(productoId, { descripcion: valor.trim() || null });
      if (r.ok) setAbierto(false);
    });
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          {descripcion ? "Editar descripción" : "+ Descripción"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Descripción</DialogTitle>
          <DialogDescription>{nombre}</DialogDescription>
        </DialogHeader>
        <Textarea
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          rows={5}
          placeholder="Qué es, para qué se usa, cómo se toma…"
          disabled={pendiente}
        />
        <DialogFooter>
          <Button onClick={guardar} disabled={pendiente}>
            {pendiente ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
