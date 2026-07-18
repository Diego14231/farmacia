"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Suspense, useState } from "react";

function Buscador() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [texto, setTexto] = useState(searchParams.get("q") ?? "");

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    const q = texto.trim();
    router.push(q ? `/productos?q=${encodeURIComponent(q)}` : "/productos");
  }

  return (
    <form onSubmit={buscar} role="search">
      <Input
        type="search"
        placeholder="Buscar por nombre o principio activo…"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        aria-label="Buscar productos"
      />
    </form>
  );
}

export function BuscadorProductos() {
  return (
    <Suspense fallback={<Input type="search" placeholder="Buscar…" disabled />}>
      <Buscador />
    </Suspense>
  );
}
