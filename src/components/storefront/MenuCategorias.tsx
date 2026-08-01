"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import type { Categoria } from "@/types/database";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Todas las categorías viven acá adentro (sin scroll horizontal ni recorte
 * en mobile) -- el header solo muestra unas pocas "principales" inline en
 * pantallas grandes, ver Header.tsx.
 */
export function MenuCategorias({ categorias }: { categorias: Categoria[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 gap-1.5 text-white hover:bg-white/15 hover:text-white"
        >
          <Menu className="size-4" aria-hidden />
          Categorías
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuItem asChild>
          <Link href="/productos">Todo el catálogo</Link>
        </DropdownMenuItem>
        {categorias.map((c) => (
          <DropdownMenuItem key={c.id} asChild>
            <Link href={`/categoria/${c.slug}`}>{c.nombre}</Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
