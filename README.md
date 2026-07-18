# farmacia-ecommerce

Tienda online para una farmacia chilena — proyecto nuevo e independiente del CRM VentaPlay (`mrm-enrolapro`). No comparte base de datos ni código en tiempo de ejecución con el CRM; solo reutiliza sus patrones de arquitectura como referencia.

Nombre placeholder hasta tener el nombre de fantasía definitivo de la farmacia.

## Documentación

- [`docs/PLAN-FARMACIA-ONLINE.md`](docs/PLAN-FARMACIA-ONLINE.md) — plan completo: marco regulatorio ISP, arquitectura, modelo de datos y roadmap.

## Scripts

- `scripts/clasificar_medicamentos.py` — cruza el inventario de la farmacia contra el registro sanitario público del ISP para sugerir qué productos son medicamentos y si requieren receta (ver sección 9 del plan).
- `scripts/csv_a_excel_seguro.py` — convierte el CSV de salida del clasificador a `.xlsx` sin que Excel dañe los códigos de barra largos.

## Estado actual

- [ ] Setup del proyecto (Next.js + Supabase) — **próximo paso**
- [ ] ETL del catálogo real
- [ ] Storefront (catálogo, carrito, checkout)
- [ ] Flujo de receta médica
- [ ] Panel interno
- [ ] Clasificación de catálogo (medicamento / receta) — en curso, ver `scripts/clasificar_medicamentos.py`
- [ ] Trámite ISP de comercio electrónico — en curso, en paralelo
