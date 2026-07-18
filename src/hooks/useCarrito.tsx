"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface ItemCarrito {
  sku: string;
  nombre: string;
  precio: number;
  cantidad: number;
  esMedicamento: boolean;
  condicionVenta: string | null;
  imagenUrl: string | null;
}

interface CarritoContexto {
  items: ItemCarrito[];
  agregar: (item: Omit<ItemCarrito, "cantidad">, cantidad?: number) => void;
  quitar: (sku: string) => void;
  actualizarCantidad: (sku: string, cantidad: number) => void;
  vaciar: () => void;
  subtotal: number;
  totalItems: number;
  /** true si algún ítem del carrito requiere receta médica */
  requiereReceta: boolean;
}

const STORAGE_KEY = "ahorrabien:carrito";

const Contexto = createContext<CarritoContexto | null>(null);

export function CarritoProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [hidratado, setHidratado] = useState(false);

  useEffect(() => {
    try {
      const guardado = localStorage.getItem(STORAGE_KEY);
      if (guardado) setItems(JSON.parse(guardado));
    } catch {
      // carrito corrupto: se parte de cero
    }
    setHidratado(true);
  }, []);

  useEffect(() => {
    if (hidratado) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hidratado]);

  const agregar = useCallback(
    (item: Omit<ItemCarrito, "cantidad">, cantidad = 1) => {
      setItems((prev) => {
        const existente = prev.find((i) => i.sku === item.sku);
        if (existente) {
          return prev.map((i) =>
            i.sku === item.sku ? { ...i, cantidad: i.cantidad + cantidad } : i,
          );
        }
        return [...prev, { ...item, cantidad }];
      });
    },
    [],
  );

  const quitar = useCallback((sku: string) => {
    setItems((prev) => prev.filter((i) => i.sku !== sku));
  }, []);

  const actualizarCantidad = useCallback((sku: string, cantidad: number) => {
    if (cantidad <= 0) {
      setItems((prev) => prev.filter((i) => i.sku !== sku));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.sku === sku ? { ...i, cantidad } : i)),
    );
  }, []);

  const vaciar = useCallback(() => setItems([]), []);

  const valor = useMemo<CarritoContexto>(() => {
    const subtotal = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
    const totalItems = items.reduce((s, i) => s + i.cantidad, 0);
    const requiereReceta = items.some(
      (i) =>
        i.condicionVenta != null &&
        i.condicionVenta !== "directa" &&
        i.condicionVenta !== "no_vendible_online",
    );
    return {
      items,
      agregar,
      quitar,
      actualizarCantidad,
      vaciar,
      subtotal,
      totalItems,
      requiereReceta,
    };
  }, [items, agregar, quitar, actualizarCantidad, vaciar]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useCarrito() {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useCarrito debe usarse dentro de <CarritoProvider>");
  return ctx;
}
