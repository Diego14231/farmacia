-- Fix: la politica "solo admin administra staff" consultaba la tabla staff
-- dentro de su propio USING -> "infinite recursion detected in policy for
-- relation staff" en cualquier SELECT. Se reemplaza el subquery directo por
-- una funcion security definer (misma tecnica que is_staff()), que corre
-- como el dueno de la funcion y no re-evalua las politicas de staff.

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from staff
    where auth_user_id = auth.uid() and rol = 'admin' and activo = true
  );
$$;

grant execute on function is_admin() to anon, authenticated, service_role;

drop policy "solo admin administra staff" on staff;

create policy "solo admin administra staff" on staff
  for all using (is_admin()) with check (is_admin());
