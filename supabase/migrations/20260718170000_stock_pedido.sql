-- Descuento/restauracion de stock al confirmar o cancelar un pedido.
--
-- Hasta ahora crearPedido() solo VALIDABA stock_actual >= cantidad, pero
-- nunca lo restaba -- dos pedidos concurrentes del ultimo item podian pasar
-- ambos la validacion y sobrevender. Estas funciones son atomicas (bloquean
-- la fila del pedido con FOR UPDATE) e idempotentes via el flag
-- stock_descontado, para que llamarlas dos veces (ej. el webhook de MP como
-- respaldo del camino sincrono) no descuente el stock dos veces.

alter table pedidos
  add column if not exists stock_descontado boolean not null default false;

create or replace function descontar_stock_pedido(p_pedido_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ya_descontado boolean;
begin
  select stock_descontado into v_ya_descontado
  from pedidos where id = p_pedido_id
  for update;

  if v_ya_descontado is null or v_ya_descontado then
    return;
  end if;

  update productos p
  set stock_actual = greatest(p.stock_actual - pi.cantidad, 0)
  from pedido_items pi
  where pi.pedido_id = p_pedido_id
    and pi.producto_id = p.id;

  update pedidos set stock_descontado = true where id = p_pedido_id;
end;
$$;

-- Simetrica a descontar_stock_pedido: se usa cuando un pedido ya pagado se
-- cancela (ej. receta rechazada por el quimico farmaceutico, o el admin
-- cancela manualmente) para no perder stock real que nunca se vendio.
create or replace function restaurar_stock_pedido(p_pedido_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_descontado boolean;
begin
  select stock_descontado into v_descontado
  from pedidos where id = p_pedido_id
  for update;

  if v_descontado is null or not v_descontado then
    return;
  end if;

  update productos p
  set stock_actual = p.stock_actual + pi.cantidad
  from pedido_items pi
  where pi.pedido_id = p_pedido_id
    and pi.producto_id = p.id;

  update pedidos set stock_descontado = false where id = p_pedido_id;
end;
$$;

grant execute on function descontar_stock_pedido(uuid) to service_role;
grant execute on function restaurar_stock_pedido(uuid) to service_role;
