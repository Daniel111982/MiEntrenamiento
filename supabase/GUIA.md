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

## Paso 4 — Ajustar el acceso (recomendado)

1. Menú izquierdo → **Authentication** → **Providers** → **Email**.
2. Para probar rápido, **desactiva** *Confirm email* (así los usuarios entran sin
   confirmar el correo). Para producción, déjalo activado.
3. En **Authentication → URL Configuration**, pon en **Site URL** la dirección de tu
   app: `https://dantal-app.pages.dev/`
   (la copia antigua `https://daniel111982.github.io/MiEntrenamiento/` sigue funcionando)

## Paso 5 — Copiar las claves

1. Menú izquierdo → **Project Settings** (la rueda) → **API**.
2. Copia dos cosas:
   - **Project URL** → algo como `https://xxxxxxxx.supabase.co`
   - **anon public** (la clave larga que empieza por `eyJ...`)
3. Envíame esas dos cosas. **Son públicas por diseño** (van dentro de la app; la
   seguridad la pone el propio Supabase), así que se pueden compartir sin problema.

> ⚠️ **NUNCA** compartas ni pegues en la app la clave **`service_role`**. Esa es la
> maestra y salta toda la seguridad. Se queda solo para ti, en el panel.

---

## Cuando ya esté

Con eso yo puedo conectar la app a Supabase y empezar la **Fase 1**: cuentas reales y
**gestión de las betas a distancia** (ver, ampliar, cortar o borrar testers desde tu
móvil, sin depender de cada dispositivo).

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

1. Crear el proyecto en Supabase y ejecutar `esquema.sql` (pasos 1–3).
2. Mandarme el **Project URL** y la **clave anon public** (paso 5).

Con eso, sigo yo.
