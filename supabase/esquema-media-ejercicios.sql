-- =====================================================================
-- DanTal · Media de ejercicios (dataset abierto de RepDB)
-- ---------------------------------------------------------------------
-- Pega ESTE archivo en Supabase → SQL Editor → New query → Run.
-- Es incremental y se puede ejecutar más de una vez sin problema.
--
-- Crea:
--   · bucket público `exercise-media` para las ilustraciones .webp
--   · políticas: lectura pública, escritura solo del dueño (admin)
--
-- La app SIGUE usando solo la clave pública anon/publishable. El bucket es
-- público de lectura, así que las imágenes cargan sin sesión; para subirlas
-- se usa el script `scripts/subir-media-supabase.mjs` fuera de la app,
-- con una clave de servicio en una variable de entorno (nunca en el repo).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Bucket público de imágenes de ejercicios
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('exercise-media', 'exercise-media', true)
on conflict (id) do update set public = true;

-- ---------------------------------------------------------------------
-- 2. Lectura pública (cualquier persona puede ver las ilustraciones)
-- ---------------------------------------------------------------------
drop policy if exists "exercise-media - lectura publica" on storage.objects;
create policy "exercise-media - lectura publica"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'exercise-media');

-- ---------------------------------------------------------------------
-- 3. Escritura y borrado solo del administrador.
--    public.es_admin() es SECURITY DEFINER y comprueba perfiles.admin,
--    igual que en el resto del panel del dueño.
-- ---------------------------------------------------------------------
drop policy if exists "exercise-media - admin escribe" on storage.objects;
create policy "exercise-media - admin escribe"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'exercise-media' and public.es_admin())
  with check (bucket_id = 'exercise-media' and public.es_admin());

-- ---------------------------------------------------------------------
-- 4. Permisos del script de subida (clave service_role)
-- ---------------------------------------------------------------------
-- Las secret keys nuevas de Supabase no traen estos permisos por defecto.
grant select, insert, update on public.catalogos to service_role;

-- Nota: `public.catalogos` ya permite al administrador escribir
-- `datos` (jsonb). No hace falta migrar columnas: la media y los pasos
-- se guardan dentro de `datos` con estas claves:
--   media_url, media_url_end, primary_muscles, secondary_muscles,
--   execution_steps, fuente_media
