"use client";

/** Cookies simples de cliente para recordar datos entre visitas (no sensibles). */

export function leerCookie(nombre: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${nombre}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function guardarCookie(nombre: string, valor: string, diasExpiracion = 180) {
  const expira = new Date();
  expira.setDate(expira.getDate() + diasExpiracion);
  document.cookie = `${nombre}=${encodeURIComponent(valor)}; expires=${expira.toUTCString()}; path=/; SameSite=Lax`;
}
