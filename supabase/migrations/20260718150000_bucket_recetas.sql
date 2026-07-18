-- Bucket privado para las recetas medicas subidas por clientes.
-- Dato sensible de salud (Ley 21.719): SIN acceso publico. Todas las
-- lecturas/escrituras pasan por el servidor (service role) -- no hay
-- politicas para anon/authenticated a proposito.

insert into storage.buckets (id, name, public)
values ('recetas', 'recetas', false)
on conflict (id) do nothing;
