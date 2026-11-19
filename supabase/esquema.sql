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
  -- Un usuario normal no puede tocar estos campos... salvo que lo haga la
  -- función de canje de código beta (que marca «dantal.canje = si»).
  if not public.es_admin()
     and coalesce(current_setting('dantal.canje', true), '') <> 'si' then
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

-- ---------------------------------------------------------------------
-- 9. Canjear un código de invitación beta (lo llama la app del tester).
--    El servidor comprueba la firma del código y, si es válida, le pone
--    la fecha de fin en SU perfil. Así el tester no puede inventarse el
--    acceso: la base de datos solo lo concede con un código correcto.
-- ---------------------------------------------------------------------
create or replace function public.canjear_beta(p_codigo text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_alpha  text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_limpio text;
  v_m      text[];
  v_dias   int;
  v_token  text;
  v_check  text;
  v_hash   bytea;
  v_calc   text := '';
  i        int;
  v_uid    uuid := auth.uid();
  v_inicio date := current_date;
  v_expira date;
  v_etq    text;
begin
  if v_uid is null then
    raise exception 'Tienes que iniciar sesión.';
  end if;

  v_limpio := upper(coalesce(p_codigo, ''));
  v_limpio := regexp_replace(v_limpio, '[^0-9A-Z]+', '-', 'g');
  v_limpio := regexp_replace(v_limpio, '-{2,}', '-', 'g');
  v_limpio := trim(both '-' from v_limpio);

  v_m := regexp_match(v_limpio, '^DTB-([0-9A-Z]{3})-([0-9A-Z]{8})-([0-9A-Z]{4})$');
  if v_m is null then
    raise exception 'El código no tiene el formato correcto. Debe ser parecido a DTB-030-XXXXXXXX-XXXX.';
  end if;

  -- Días en base 36.
  v_dias := 0;
  for i in 1..length(v_m[1]) loop
    v_dias := v_dias * 36 + (position(substr(v_m[1], i, 1) in '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ') - 1);
  end loop;
  v_token := v_m[2];
  v_check := v_m[3];

  -- Firma: SHA-256 de «secreto|dias36|token» y los 4 primeros bytes.
  v_hash := digest(convert_to('dantal-beta-v1|' || v_m[1] || '|' || v_token, 'UTF8'), 'sha256');
  for i in 0..3 loop
    v_calc := v_calc || substr(v_alpha, (get_byte(v_hash, i) % 32) + 1, 1);
  end loop;

  if v_calc <> v_check then
    raise exception 'Ese código no es válido. Revisa que esté completo y bien copiado.';
  end if;

  v_expira := case when v_dias > 0 then v_inicio + v_dias else null end;
  v_etq := case
    when v_dias = 0   then 'Sin límite'
    when v_dias = 1   then '1 día'
    when v_dias = 7   then '1 semana'
    when v_dias = 14  then '2 semanas'
    when v_dias = 21  then '3 semanas'
    when v_dias = 30  then '1 mes'
    when v_dias = 60  then '2 meses'
    when v_dias = 90  then '3 meses'
    when v_dias = 180 then '6 meses'
    when v_dias = 365 then '1 año'
    else v_dias || ' días'
  end;

  -- Autoriza a esta transacción a tocar los campos beta.
  perform set_config('dantal.canje', 'si', true);

  update public.perfiles
     set beta          = true,
         beta_inicio   = v_inicio,
         beta_expira   = v_expira,
         beta_etiqueta = v_etq
   where id = v_uid;

  return json_build_object('ok', true, 'dias', v_dias, 'expira', v_expira, 'etiqueta', v_etq);
end;
$$;

grant execute on function public.canjear_beta(text) to authenticated;

-- ---------------------------------------------------------------------
-- 10. Ping: mantiene despierto el proyecto (evita la pausa por inactividad).
--     Lo llama una tarea programada (GitHub Actions) a diario. Cualquier
--     visita a la API cuenta como actividad; con esto sobra.
-- ---------------------------------------------------------------------
create or replace function public.ping()
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object('ok', true, 'hora', now());
$$;

grant execute on function public.ping() to anon, authenticated;

-- =====================================================================
-- ¡Listo! Deberías ver "Success. No rows returned".
-- =====================================================================
