-- Esquema inicial -- ver docs/PLAN-FARMACIA-ONLINE.md seccion 4.3
-- Catalogo, clientes, recetas, pedidos, staff y contenido de compliance.

create extension if not exists "pgcrypto";

-- =========================================================================
-- Catalogo
-- =========================================================================

create table categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  slug text not null unique,
  parent_id uuid references categorias(id) on delete set null,
  orden integer not null default 0,
  created_at timestamptz not null default now()
);

create table productos (
  id uuid primary key default gen_random_uuid(),
  sku_codigo text not null unique,
  nombre text not null,
  descripcion text,
  categoria_id uuid references categorias(id) on delete set null,
  precio_costo numeric(12, 2),
  precio_venta numeric(12, 2) not null,
  precio_mayorista numeric(12, 2),
  stock_actual integer not null default 0,
  stock_minimo integer not null default 0,
  stock_maximo integer,
  -- clasificacion ISP -- ver seccion 9 del plan: se llena via
  -- scripts/clasificar_medicamentos.py + revision de la Quimica
  -- Farmaceutica, nunca automaticamente sin revision humana.
  es_medicamento boolean not null default false,
  registro_isp text,
  condicion_venta text check (
    condicion_venta in (
      'directa', 'receta_simple', 'receta_retenida', 'receta_cheque',
      'receta_retenida_control_existencia', 'no_vendible_online'
    )
  ),
  principio_activo text,
  requiere_cadena_frio boolean not null default false,
  -- controla que se puede vender publicamente sin tocar codigo
  -- (ver seccion 2.4 del plan: Opcion A vs B de lanzamiento)
  activo_online boolean not null default false,
  imagen_url text,
  -- valor crudo de la columna "Departamento" del Excel original, solo para
  -- trazabilidad mientras se migra a la taxonomia nueva (seccion 3 del plan)
  departamento_original text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index productos_categoria_id_idx on productos (categoria_id);
create index productos_es_medicamento_idx on productos (es_medicamento);
create index productos_activo_online_idx on productos (activo_online);

-- Agrupa productos bioequivalentes por principio activo (requisito ISP:
-- mostrar alternativas bioequivalentes en la busqueda, ver seccion 2.1)
create table bioequivalentes (
  producto_id uuid not null references productos(id) on delete cascade,
  bioequivalente_de_id uuid not null references productos(id) on delete cascade,
  primary key (producto_id, bioequivalente_de_id)
);

-- =========================================================================
-- Clientes y direcciones
-- =========================================================================

create table clientes (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  nombre text not null,
  rut text,
  email text,
  telefono text,
  created_at timestamptz not null default now()
);

create unique index clientes_auth_user_id_idx on clientes (auth_user_id);

create table direcciones (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  calle text not null,
  numero text,
  comuna text not null,
  ciudad text not null,
  referencia text,
  es_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index direcciones_cliente_id_idx on direcciones (cliente_id);

-- =========================================================================
-- Staff / panel interno
-- =========================================================================

create table staff (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  nombre text not null,
  rol text not null check (rol in ('admin', 'quimico_farmaceutico', 'bodega')),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index staff_auth_user_id_idx on staff (auth_user_id);

-- =========================================================================
-- Recetas medicas -- dato sensible de salud, guardar minimo 6 meses
-- (ver seccion 2.1 del plan)
-- =========================================================================

create table recetas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete cascade,
  archivo_url text not null,
  tipo text not null check (tipo in ('simple', 'retenida', 'cheque')),
  estado text not null default 'pendiente' check (
    estado in ('pendiente', 'validada', 'rechazada')
  ),
  validada_por_staff_id uuid references staff(id) on delete set null,
  validada_at timestamptz,
  motivo_rechazo text,
  created_at timestamptz not null default now()
);

create index recetas_cliente_id_idx on recetas (cliente_id);
create index recetas_estado_idx on recetas (estado);

-- =========================================================================
-- Pedidos
-- =========================================================================

create table pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(id) on delete restrict,
  direccion_id uuid references direcciones(id) on delete set null,
  -- 'pendiente_validacion_qf' cubre el hallazgo de la seccion 8.4: toda
  -- venta debe quedar visada por la Quimica Farmaceutica, no solo las con
  -- receta -- se puede usar o saltar este estado segun lo que se confirme
  -- legalmente, sin cambiar el esquema.
  estado text not null default 'carrito' check (
    estado in (
      'carrito', 'pendiente_pago', 'pagado', 'pendiente_validacion_qf',
      'en_preparacion', 'despachado', 'entregado', 'cancelado'
    )
  ),
  requiere_receta boolean not null default false,
  receta_id uuid references recetas(id) on delete set null,
  subtotal numeric(12, 2) not null default 0,
  costo_despacho numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  metodo_pago text,
  referencia_pago_externo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pedidos_cliente_id_idx on pedidos (cliente_id);
create index pedidos_estado_idx on pedidos (estado);

create table pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references pedidos(id) on delete cascade,
  producto_id uuid not null references productos(id) on delete restrict,
  cantidad integer not null check (cantidad > 0),
  precio_unitario numeric(12, 2) not null,
  lote text,
  fecha_vencimiento date
);

create index pedido_items_pedido_id_idx on pedido_items (pedido_id);

-- =========================================================================
-- Contenido de compliance (seccion 5 del plan)
-- =========================================================================

create table resoluciones_sanitarias (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,
  numero text not null,
  fecha date not null,
  archivo_url text,
  vigente boolean not null default true,
  created_at timestamptz not null default now()
);

create table reclamos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) on delete set null,
  pedido_id uuid references pedidos(id) on delete set null,
  mensaje text not null,
  estado text not null default 'abierto' check (
    estado in ('abierto', 'en_proceso', 'resuelto')
  ),
  respuesta text,
  created_at timestamptz not null default now()
);

-- =========================================================================
-- updated_at automatico
-- =========================================================================

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger productos_set_updated_at
  before update on productos
  for each row execute function set_updated_at();

create trigger pedidos_set_updated_at
  before update on pedidos
  for each row execute function set_updated_at();

-- =========================================================================
-- RLS
-- =========================================================================

alter table categorias enable row level security;
alter table productos enable row level security;
alter table bioequivalentes enable row level security;
alter table clientes enable row level security;
alter table direcciones enable row level security;
alter table staff enable row level security;
alter table recetas enable row level security;
alter table pedidos enable row level security;
alter table pedido_items enable row level security;
alter table resoluciones_sanitarias enable row level security;
alter table reclamos enable row level security;

-- true si el usuario autenticado actual es staff activo (cualquier rol)
create or replace function is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from staff where auth_user_id = auth.uid() and activo = true
  );
$$;

-- Catalogo: publico ve solo lo activo_online; staff ve y edita todo
create policy "catalogo publico lee activo" on productos
  for select using (activo_online = true or is_staff());
create policy "staff administra productos" on productos
  for all using (is_staff()) with check (is_staff());

create policy "categorias publicas" on categorias
  for select using (true);
create policy "staff administra categorias" on categorias
  for all using (is_staff()) with check (is_staff());

create policy "bioequivalentes publicos" on bioequivalentes
  for select using (true);
create policy "staff administra bioequivalentes" on bioequivalentes
  for all using (is_staff()) with check (is_staff());

-- Clientes: cada uno ve/edita su propia fila; staff ve todo
create policy "cliente ve su propia fila" on clientes
  for select using (auth_user_id = auth.uid() or is_staff());
create policy "cliente edita su propia fila" on clientes
  for update using (auth_user_id = auth.uid()) with check (auth_user_id = auth.uid());
create policy "cliente crea su propia fila" on clientes
  for insert with check (auth_user_id = auth.uid());
create policy "staff administra clientes" on clientes
  for all using (is_staff()) with check (is_staff());

-- Direcciones: solo del propio cliente (o staff)
create policy "direcciones del propio cliente" on direcciones
  for all using (
    exists (
      select 1 from clientes c
      where c.id = direcciones.cliente_id and c.auth_user_id = auth.uid()
    ) or is_staff()
  ) with check (
    exists (
      select 1 from clientes c
      where c.id = direcciones.cliente_id and c.auth_user_id = auth.uid()
    ) or is_staff()
  );

-- Staff: solo staff ve la tabla staff; solo admin la administra
create policy "solo staff ve staff" on staff
  for select using (is_staff());
create policy "solo admin administra staff" on staff
  for all using (
    exists (
      select 1 from staff s
      where s.auth_user_id = auth.uid() and s.rol = 'admin' and s.activo
    )
  ) with check (
    exists (
      select 1 from staff s
      where s.auth_user_id = auth.uid() and s.rol = 'admin' and s.activo
    )
  );

-- Recetas: dato sensible -- solo el propio cliente y staff
create policy "cliente ve sus propias recetas" on recetas
  for select using (
    exists (
      select 1 from clientes c
      where c.id = recetas.cliente_id and c.auth_user_id = auth.uid()
    ) or is_staff()
  );
create policy "cliente sube sus propias recetas" on recetas
  for insert with check (
    exists (
      select 1 from clientes c
      where c.id = recetas.cliente_id and c.auth_user_id = auth.uid()
    )
  );
create policy "staff valida recetas" on recetas
  for update using (is_staff()) with check (is_staff());

-- Pedidos: del propio cliente; staff ve/administra todo
create policy "cliente ve sus propios pedidos" on pedidos
  for select using (
    exists (
      select 1 from clientes c
      where c.id = pedidos.cliente_id and c.auth_user_id = auth.uid()
    ) or is_staff()
  );
create policy "cliente crea sus propios pedidos" on pedidos
  for insert with check (
    exists (
      select 1 from clientes c
      where c.id = pedidos.cliente_id and c.auth_user_id = auth.uid()
    )
  );
create policy "staff administra pedidos" on pedidos
  for update using (is_staff()) with check (is_staff());

create policy "items de pedidos propios" on pedido_items
  for select using (
    exists (
      select 1 from pedidos p
      join clientes c on c.id = p.cliente_id
      where p.id = pedido_items.pedido_id
        and (c.auth_user_id = auth.uid() or is_staff())
    )
  );
create policy "cliente crea items de su pedido" on pedido_items
  for insert with check (
    exists (
      select 1 from pedidos p
      join clientes c on c.id = p.cliente_id
      where p.id = pedido_items.pedido_id and c.auth_user_id = auth.uid()
    )
  );
create policy "staff administra items" on pedido_items
  for all using (is_staff()) with check (is_staff());

-- Compliance: resoluciones publicas (para el footer), reclamos protegidos
create policy "resoluciones publicas" on resoluciones_sanitarias
  for select using (true);
create policy "staff administra resoluciones" on resoluciones_sanitarias
  for all using (is_staff()) with check (is_staff());

create policy "cliente ve sus reclamos" on reclamos
  for select using (
    exists (
      select 1 from clientes c
      where c.id = reclamos.cliente_id and c.auth_user_id = auth.uid()
    ) or is_staff()
  );
create policy "cualquiera crea un reclamo" on reclamos
  for insert with check (true);
create policy "staff responde reclamos" on reclamos
  for update using (is_staff()) with check (is_staff());
