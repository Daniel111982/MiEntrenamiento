-- =====================================================================
-- DanTal · Panel de administración (ejercicios, alimentos, rutinas y usuarios)
-- ---------------------------------------------------------------------
-- Pega ESTE archivo en Supabase → SQL Editor → New query → Run.
-- Es incremental: el esquema principal (esquema.sql) no se toca.
-- Se puede ejecutar más de una vez sin problema.
--
-- Crea:
--   · catalogos  → ejercicios, alimentos y rutinas globales del dueño
--   · borrar_usuario_admin(uid) → borrar cuentas desde el panel (solo admin)
--
-- Seguridad: la app sigue usando SOLO la clave pública anon/publishable.
-- Nunca aparece aquí ni en la app la clave service_role.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 13. Catálogos globales (ejercicios, alimentos y rutinas)
--     · tipo: 'ejercicio' | 'alimento' | 'rutina'
--     · datos: el objeto que usa la app (jsonb)
--     · activo: false lo oculta a los usuarios, pero el dueño sí lo ve
-- ---------------------------------------------------------------------
create table if not exists public.catalogos (
  tipo        text not null check (tipo in ('ejercicio', 'alimento', 'rutina')),
  id          text not null,
  datos       jsonb not null default '{}'::jsonb,
  activo      boolean not null default true,
  orden       int not null default 0,
  actualizado timestamptz not null default now(),
  autor       uuid references auth.users(id) on delete set null,
  primary key (tipo, id)
);

alter table public.catalogos enable row level security;

-- Cualquier cuenta autenticada puede LEER los elementos activos.
drop policy if exists "catalogos - leer activos" on public.catalogos;
create policy "catalogos - leer activos"
  on public.catalogos for select
  to authenticated
  using (activo);

-- Solo el administrador puede escribirlos (y por tanto ver también los ocultos).
drop policy if exists "catalogos - admin escribe" on public.catalogos;
create policy "catalogos - admin escribe"
  on public.catalogos for all
  to authenticated
  using (public.es_admin())
  with check (public.es_admin());

revoke all on public.catalogos from anon;
grant select, insert, update, delete on public.catalogos to authenticated;

create index if not exists catalogos_tipo_orden_idx on public.catalogos (tipo, orden, id);

-- ---------------------------------------------------------------------
-- 14. Borrar una cuenta desde el panel del dueño.
--     Es SECURITY DEFINER para poder borrar también la fila de auth.users,
--     pero comprueba public.es_admin() y prohíbe borrarse a sí mismo.
--     El usuario normal NO puede ejecutarla (revoke ... from public).
-- ---------------------------------------------------------------------
create or replace function public.borrar_usuario_admin(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.es_admin() then
    raise exception 'Solo el administrador puede borrar cuentas.';
  end if;
  if p_id is null or p_id = auth.uid() then
    raise exception 'No puedes borrar tu propia cuenta desde aquí.';
  end if;
  if not exists (select 1 from public.perfiles where id = p_id) then
    raise exception 'No existe esa cuenta.';
  end if;

  delete from public.datos    where usuario = p_id;
  delete from public.perfiles where id     = p_id;
  delete from auth.users      where id     = p_id;
end;
$$;

revoke all on function public.borrar_usuario_admin(uuid) from public;
grant execute on function public.borrar_usuario_admin(uuid) to authenticated;

-- =====================================================================
-- ¡Listo! Deberías ver "Success. No rows returned".
-- =====================================================================
