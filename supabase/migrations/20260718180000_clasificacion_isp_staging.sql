-- Columnas de STAGING para la clasificación ISP sugerida por
-- scripts/clasificar_medicamentos.py (ver plan, sección 9).
--
-- A propósito NO tocan es_medicamento/condicion_venta/registro_isp (los
-- campos reales que usa toda la lógica de negocio: checkout, catálogo
-- público, etc.) -- esos solo los debe fijar la Química Farmacéutica desde
-- /admin/clasificacion, revisando la sugerencia. Un script no reemplaza su
-- firma (requisito legal del ISP).

alter table productos
  add column if not exists clasificacion_sugerida_medicamento text,
  add column if not exists clasificacion_sugerida_receta text,
  add column if not exists clasificacion_detalle text,
  add column if not exists clasificacion_revisar_manual boolean not null default false,
  add column if not exists clasificacion_revisada boolean not null default false;

create index if not exists productos_clasificacion_pendiente_idx
  on productos (clasificacion_revisada, clasificacion_revisar_manual);
