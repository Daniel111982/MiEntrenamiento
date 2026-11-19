# Guía: montar el servidor gratis en Supabase

Supabase nos da, gratis: **base de datos**, **cuentas de usuario** (registro, acceso,
recuperar contraseña) y una **API** lista para usar. No hay que mantener ningún servidor.

Sigue estos pasos. Tardarás unos 10 minutos.

---

## Paso 1 — Crear la cuenta

1. Entra en **https://supabase.com** y pulsa **Start your project**.
2. Regístrate (con GitHub o con tu correo). Es gratis.

## Paso 2 — Crear el proyecto

1. Pulsa **New project**.
2. Rellena:
   - **Name:** `mientrenamiento`
   - **Database Password:** pulsa *Generate a password* y **guárdala** en un sitio seguro.
   - **Region:** la más cercana, por ejemplo **Europe (Frankfurt)** o **West EU (Ireland)**.
3. Pulsa **Create new project** y espera 1–2 minutos a que termine.

## Paso 3 — Crear las tablas

1. En el menú de la izquierda, entra en **SQL Editor**.
2. Pulsa **New query**.
3. Abre el archivo **`supabase/esquema.sql`** de este proyecto, copia **todo** su
   contenido y pégalo ahí.
4. Pulsa **Run** (abajo a la derecha).
5. Debe aparecer **«Success. No rows returned»**. Ya tienes las tablas, la seguridad y
   el alta automática de usuarios.
6. **Si el proyecto ya existía** (como es nuestro caso), abre otra *New query*, pega
   ahora **`supabase/esquema-admin.sql`** y pulsa **Run**. Crea la tabla `catalogos` y
   la función `borrar_usuario_admin(uuid)` que usa el panel de administración. Es
   incremental: también debe aparecer **«Success. No rows returned»** y se puede
   repetir sin problema. Para instalaciones nuevas, ese contenido ya está incluido
   al final de `esquema.sql`.

> **Ya ejecutado el 19-11-2026** en el proyecto real. El esquema incluye además la
> función `borrar_mi_cuenta()` (RGPD): el usuario autenticado puede borrar su cuenta
> y todos sus datos desde **Ajustes → Privacidad**. Verificada con un usuario de prueba:
> devuelve HTTP 204 y el perfil y el acceso dejan de existir. **No necesita ni usa
> `service_role`**: solo actúa sobre `auth.uid()`.
>
> El esquema también crea la tabla **`public.avisos`** para los contenidos globales del
> dueño: cualquier cuenta autenticada puede **leer** los avisos activos (RLS), y solo
> `public.es_admin()` puede insertar, editar o borrar. `anon` no tiene permisos. Se gestiona
> desde **Ajustes → Contenidos de la app** y aparece en la pantalla «Hoy». Verificado por
> API: usuario normal 200 al leer y 403 al escribir, anon 401, dueño 201/204.
>
> **Ya ejecutado el 19-11-2026:** `esquema-admin.sql`. El dueño puede publicar
> ejercicios, alimentos y rutinas globales y editar o borrar cuentas desde el panel.
> La RLS hace que las cuentas normales solo lean los elementos activos, `anon` no
> tenga acceso y solo `public.es_admin()` pueda escribir o borrar usuarios. La app
> **no necesita `service_role`** para nada de esto.

## Paso 4 — Ajustar el acceso (recomendado)

1. Menú izquierdo → **Authentication** → **Providers** → **Email**.
2. Para probar rápido, **desactiva** *Confirm email* (así los usuarios entran sin
   confirmar el correo). Para producción, déjalo activado.
3. En **Authentication → URL Configuration**, pon en **Site URL** la dirección de tu
   app: `https://dantal-app.pages.dev/`
   (la copia antigua `https://daniel111982.github.io/MiEntrenamiento/` sigue funcionando).
   **Ya está configurado** (19-11-2026): Site URL `https://dantal-app.pages.dev` y dos
   *Redirect URLs*: `https://dantal-app.pages.dev/**` y
   `https://daniel111982.github.io/MiEntrenamiento/**`.

## Paso 5 — Copiar las claves

1. Menú izquierdo → **Project Settings** (la rueda) → **API**.
2. Copia dos cosas:
   - **Project URL** → algo como `https://xxxxxxxx.supabase.co`
   - **anon public** (la clave larga que empieza por `eyJ...`)
3. Envíame esas dos cosas. **Son públicas por diseño** (van dentro de la app; la
   seguridad la pone el propio Supabase), así que se pueden compartir sin problema.

> ⚠️ **NUNCA** compartas ni pegues en la app la clave **`service_role`**. Esa es la
> maestra y salta toda la seguridad. Se queda solo para ti, en el panel.

## Paso 6 — Coach IA incluido (ya desplegado)

1. En **SQL Editor → New query**, pega **`supabase/esquema-ia.sql`** y pulsa **Run**.
   Crea `public.ia_uso` y la función `registrar_ia_uso()`, que limita cada cuenta a
   25 consultas al día. Sin políticas RLS: solo la función `security definer` toca la
   tabla, usando `auth.uid()`.
2. Consigue una clave gratuita en **https://aistudio.google.com/apikey**. Las nuevas
   claves empiezan por `AQ.` y son válidas; copia la clave completa desde *Copy key*.
3. En **Edge Functions → Secrets**, añade el secreto **`IA_CLAVE`** con esa clave.
   No hace falta marcar `IA_MODELO`: la función usa `gemini-3.5-flash-lite` y prueba
   `gemini-2.5-flash-lite` si el primero no existiera.
4. Despliega la función `coach-ia` desde **`supabase/functions/coach-ia/index.ts`**
   con `verify_jwt = true`. La clave nunca se incluye en el código ni viaja a la app.

> **Ya ejecutado y verificado el 19-11-2026** en el proyecto real: SQL aplicado,
> secreto `IA_CLAVE` creado y función `coach-ia` activa. Comprobado con la cuenta del
> dueño: responde con etiqueta «IA de DanTal · servidor», `anon` recibe 401 y el
> límite diario devuelve el aviso correcto. Los datos de prueba se borraron.
>
> Si usaste un token de Management API para desplegarlo, **revócalo** en
> https://supabase.com/dashboard/account/tokens cuando termines.

---

## Estado actual

Ya están hechas la **Fase 1** (cuentas reales y betas a distancia), la **Fase 2**
(sincronización), la **Fase 3** (URL propia gratis en Cloudflare Pages), la **Fase 3C**
(panel de administración) y la **Fase 3D** (coach IA con servidor). La app usa esta
misma clave pública para avisos, catálogos, betas, sync, borrado de cuenta y coach IA.
Para publicar, basta con hacer `push` a `main`: Cloudflare Pages actualiza la web sola.

---

## Cosas que conviene saber del plan gratis

- **Límites:** 500 MB de base de datos, 1 GB de archivos, 5 GB de tráfico al mes y
  hasta 50.000 usuarios activos. De sobra para empezar.
- **Se pausa por inactividad:** si el proyecto **no recibe ninguna visita en 7 días**,
  Supabase lo pausa. Se reactiva solo al entrar al panel, pero mientras tanto la app no
  podría conectar. **Ya resuelto (Fase 2):** hay una función `ping()` en la base de datos
  y un **servicio externo de ping** (cron-job.org, gratis) que entra a la API **una vez
  al día**, así el proyecto nunca se queda 7 días sin visitas. Los pasos están en
  `PLAN.md` («Mantener despierto el proyecto»).
- **Si algún día crece:** se pasa al plan de pago (unos 25 $/mes) o se migra a otro
  sitio, sin rehacer el código.

---

## Lo que necesito de ti ahora

1. ~~Crear el proyecto en Supabase y ejecutar `esquema.sql` (pasos 1–3).~~ **Hecho.**
2. ~~Mandarme el **Project URL** y la **clave anon public** (paso 5).~~ **Hecho.**
3. ~~Ejecutar `esquema-admin.sql` y estrenar el panel completo.~~ **Hecho.**
4. ~~Crear la clave de Gemini, el secreto `IA_CLAVE` y desplegar `coach-ia`.~~ **Hecho.**

**Único pendiente:** revocar el token de Management API que se usó para desplegar,
si ya no lo necesitas. Con eso, el servidor queda con solo la clave pública en la app.
