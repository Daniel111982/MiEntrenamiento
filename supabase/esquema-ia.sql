-- =====================================================================
-- Coach IA incluido · control de uso
-- ---------------------------------------------------------------------
-- Ejecutar una vez en SQL Editor. La Edge Function `coach-ia` llama a
-- `registrar_ia_uso` con la sesión del usuario: nadie puede leer ni
-- escribir esta tabla directamente (solo la función security definer).
-- La cuenta del dueño (administradora) no tiene límite: la exención se decide
-- en la base de datos con public.es_admin(), no en el código de la app.
-- No se usa service_role: la clave de Gemini queda como secreto de la
-- Edge Function y jamás viaja a la app.
-- =====================================================================

create table if not exists public.ia_uso (
  usuario uuid primary key references auth.users(id) on delete cascade,
  dia date not null default current_date,
  consultas integer not null default 0 check (consultas >= 0)
);

alter table public.ia_uso enable row level security;

-- Sin políticas: la tabla solo se toca desde la función de abajo.
revoke all on public.ia_uso from anon, authenticated;

create or replace function public.registrar_ia_uso(p_limite integer default 25)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  usadas integer;
begin
  if uid is null then
    raise exception 'Necesitas una sesión para usar el coach IA.'
      using errcode = '42501';
  end if;
  if p_limite is null or p_limite < 1 then
    p_limite := 25;
  end if;

  -- El dueño usa el coach sin tope. Se comprueba en servidor; "-" indica ilimitado.
  if public.es_admin() then
    return -1;
  end if;

  insert into public.ia_uso as u (usuario, dia, consultas)
  values (uid, current_date, 1)
  on conflict (usuario) do update
    set dia = current_date,
        consultas = case when u.dia = current_date then u.consultas + 1 else 1 end
  where u.dia <> current_date or u.consultas < p_limite
  returning consultas into usadas;

  if not found then
    raise exception 'Has llegado al límite diario del coach IA (% consultas). Vuelve mañana.', p_limite
      using errcode = 'P0001';
  end if;

  return usadas;
end;
$$;

revoke all on function public.registrar_ia_uso(integer) from public, anon;
grant execute on function public.registrar_ia_uso(integer) to authenticated;
