-- Confirma en lote los productos de "confianza alta" del clasificador ISP:
-- los que el script pudo resolver sin ambigüedad (clasificacion_revisar_manual
-- = false) y que todavía no pasaron por revisión (clasificacion_revisada =
-- false). Los ambiguos NUNCA se tocan acá -- esos requieren que la Química
-- Farmacéutica los revise uno por uno desde /admin/clasificacion.
--
-- Idempotente: correrla dos veces no hace nada la segunda vez, porque solo
-- toca filas con clasificacion_revisada = false.

create or replace function confirmar_clasificacion_alta_confianza()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_filas integer;
begin
  update productos
  set
    es_medicamento = (clasificacion_sugerida_medicamento = 'SI'),
    condicion_venta = case clasificacion_sugerida_receta
      when 'NO (venta directa)' then 'directa'
      when 'SÍ - Receta Simple' then 'receta_simple'
      when 'SÍ - Receta Retenida' then 'receta_retenida'
      when 'SÍ - Receta Cheque' then 'receta_cheque'
      when 'SÍ - Receta Retenida con Control de Existencia' then 'receta_retenida_control_existencia'
      else condicion_venta
    end,
    clasificacion_revisada = true
  where clasificacion_revisar_manual = false
    and clasificacion_revisada = false
    and clasificacion_sugerida_medicamento is not null;

  get diagnostics v_filas = row_count;
  return v_filas;
end;
$$;

grant execute on function confirmar_clasificacion_alta_confianza() to service_role;
