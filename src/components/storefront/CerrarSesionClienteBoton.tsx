"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function CerrarSesionClienteBoton() {
  const router = useRouter();
  async function salir() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }
  return (
    <Button variant="outline" size="sm" onClick={salir}>
      Cerrar sesión
    </Button>
  );
}
