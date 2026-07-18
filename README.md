# Farmacia AhorraBien — e-commerce

Tienda online de Farmacia AhorraBien (Chile) — proyecto independiente del CRM VentaPlay (`mrm-enrolapro`). No comparte base de datos ni código en runtime con el CRM; solo reutiliza sus patrones de arquitectura como referencia.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · TanStack Query · Supabase (Postgres + Auth + Storage) · Mercado Pago.

## Correr en local

```bash
npm install
npx supabase start        # requiere Docker Desktop abierto
npm run dev               # localhost:3000
```

Primera vez: copiar `.env.local.example` a `.env.local` con las keys que imprime `supabase start`, importar el catálogo y crear un usuario del panel:

```bash
npx tsx scripts/import-inventario.ts "C:\ruta\inventario1.xlsx"
npx tsx scripts/crear-staff.ts admin@ahorrabien.cl <password> "Nombre" admin
```

Panel interno: `/admin` (roles: admin, quimico_farmaceutico, bodega).

## Documentación

- [`docs/PLAN-FARMACIA-ONLINE.md`](docs/PLAN-FARMACIA-ONLINE.md) — plan completo: marco regulatorio ISP, arquitectura, modelo de datos y roadmap.

## Scripts

- `scripts/import-inventario.ts` — ETL: importa el Excel del inventario (parsea precios/stock, mapea categorías) con upsert por SKU.
- `scripts/crear-staff.ts` — crea usuarios del panel interno.
- `scripts/clasificar_medicamentos.py` — cruza el inventario contra el registro sanitario público del ISP para sugerir qué productos son medicamentos y si requieren receta (sección 9 del plan).
- `scripts/csv_a_excel_seguro.py` — convierte el CSV del clasificador a `.xlsx` sin que Excel dañe los códigos de barra.

## Estado actual

- [x] Setup del proyecto (Next.js + Supabase local + migraciones con RLS)
- [x] ETL del catálogo real (4.986 productos importados)
- [x] Storefront: home, búsqueda, categorías, detalle (con bioequivalentes), carrito, checkout
- [x] Checkout: pedido real (precios desde BD), receta adjunta, integración Mercado Pago (falta solo el token sandbox)
- [x] Flujo de receta médica: subida en checkout + cola de validación QF en el panel (verificado E2E)
- [x] Panel interno: login staff, pedidos, recetas, productos, reclamos
- [x] Contenido de compliance ISP (footer, marco regulatorio, políticas, privacidad, reclamos, infografía)
- [ ] Clasificación de catálogo (medicamento / receta) — corriendo `clasificar_medicamentos.py` + revisión de la Química Farmacéutica
- [ ] Trámite ISP de comercio electrónico — en paralelo (no bloquea el desarrollo)
- [ ] Datos reales de la farmacia en el footer (resolución sanitaria, Directora Técnica, dirección)
- [ ] Token sandbox de Mercado Pago + pruebas de pago
- [ ] Proyecto Supabase en la nube + deploy a Vercel (con protección) cuando se quiera compartir
