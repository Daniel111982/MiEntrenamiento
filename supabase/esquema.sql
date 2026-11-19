-- =====================================================================
-- MiEntrenamiento · Esquema de base de datos para Supabase
-- ---------------------------------------------------------------------
-- Pega TODO este archivo en el editor SQL de Supabase y pulsa "Run".
-- Se puede ejecutar más de una vez sin problema (usa IF NOT EXISTS).
--
-- Crea:
--   · perfiles  → datos públicos de cada cuenta (nombre, beta, plan...)
--   · datos     → el contenido de la app de cada usuario (sincronización)
--   · permisos  → cada uno solo ve lo suyo; el dueño ve y gestiona a todos
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tabla de perfiles
-- ---------------------------------------------------------------------
create table if not exists public.perfiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  nombre         text not null default 'Sin nombre',
  correo         text,
  avatar         text default '🙂',
  color          int  not null default 0,
  admin          boolean not null default false,
  beta           boolean not null default false,
  beta_etiqueta  text,
  beta_inicio    date,
  beta_expira    date,                       -- vacío = sin límite
  plan           text not null default 'gratis',   -- gratis | premium
  premium_hasta  timestamptz,
  creado         timestamptz not null default now(),
  actualizado    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. Tabla de datos (el contenido de la app de cada usuario)
-- ---------------------------------------------------------------------
create table if not exists public.datos (
  usuario     uuid primary key references auth.users(id) on delete cascade,
  contenido   jsonb not null default '{}'::jsonb,
  actualizado timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. Al crear una cuenta, se crea su perfil automáticamente.
--    La PRIMERA cuenta que se registre pasa a ser administradora (dueño).
-- ---------------------------------------------------------------------
create or replace function public.nuevo_perfil()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre, correo, admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', 'Sin nombre'),
    new.email,
    not exists (select 1 from public.perfiles where admin)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.nuevo_perfil();

-- ---------------------------------------------------------------------
-- 4. ¿El que hace la petición es administrador? (evita recursión en RLS)
-- ---------------------------------------------------------------------
create or replace function public.es_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select admin from public.perfiles where id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------
-- 5. Un usuario normal no puede cambiarse a sí mismo admin, beta ni plan.
--    Solo el administrador puede tocar esos campos.
-- ---------------------------------------------------------------------
create or replace function public.proteger_campos()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    new.admin         := old.admin;
    new.plan          := old.plan;
    new.premium_hasta := old.premium_hasta;
    new.beta          := old.beta;
    new.beta_etiqueta := old.beta_etiqueta;
    new.beta_inicio   := old.beta_inicio;
    new.beta_expira   := old.beta_expira;
  end if;
  new.actualizado := now();
  return new;
end;
$$;

drop trigger if exists proteger_campos on public.perfiles;
create trigger proteger_campos
  before update on public.perfiles
  for each row execute function public.proteger_campos();

-- ---------------------------------------------------------------------
-- 6. Seguridad por filas (RLS)
-- ---------------------------------------------------------------------
alter table public.perfiles enable row level security;
alter table public.datos    enable row level security;

-- Perfiles: cada uno ve y edita el suyo
drop policy if exists "perfil propio - leer"      on public.perfiles;
drop policy if exists "perfil propio - actualizar" on public.perfiles;
create policy "perfil propio - leer"
  on public.perfiles for select
  using (auth.uid() = id);
create policy "perfil propio - actualizar"
  on public.perfiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Perfiles: el administrador ve y edita todos
drop policy if exists "perfiles - admin lee"       on public.perfiles;
drop policy if exists "perfiles - admin actualiza" on public.perfiles;
create policy "perfiles - admin lee"
  on public.perfiles for select
  using (public.es_admin());
create policy "perfiles - admin actualiza"
  on public.perfiles for update
  using (public.es_admin())
  with check (public.es_admin());

-- Datos: solo el dueño de esos datos
drop policy if exists "datos propios" on public.datos;
create policy "datos propios"
  on public.datos for all
  using (auth.uid() = usuario)
  with check (auth.uid() = usuario);

-- ---------------------------------------------------------------------
-- 7. Permisos de acceso para las cuentas registradas
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
revoke all on public.perfiles from anon;
revoke all on public.datos    from anon;
grant select, insert, update, delete on public.perfiles to authenticated;
grant select, insert, update, delete on public.datos    to authenticated;

-- ---------------------------------------------------------------------
-- 8. Índices útiles
-- ---------------------------------------------------------------------
create index if not exists perfiles_beta_expira_idx on public.perfiles (beta_expira);
create index if not exists perfiles_admin_idx       on public.perfiles (admin);

-- =====================================================================
-- ¡Listo! Deberías ver "Success. No rows returned".
-- =====================================================================
