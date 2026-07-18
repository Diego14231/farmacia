"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function CerrarSesionBoton() {
  const router = useRouter();
  async function salir() {
    await createClient().auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }
  return (
    <Button variant="secondary" size="sm" onClick={salir}>
      Salir
    </Button>
  );
}
