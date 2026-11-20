# MiEntrenamiento — Plan de servidor, tiendas y monetización

> Documento de trabajo. Explica **qué vamos a montar, en qué orden, cuánto cuesta y qué
> necesitas**. Empieza por lo gratis y deja preparado el camino para crecer y publicar
> en Google Play y en la App Store.

---

## Aplicación MiEntrenamiento

- **Tecnología:** HTML · CSS · JavaScript ES6 (módulos). Sin npm ni compilación.
- **Tipo:** PWA (web instalable) con **backend en Supabase (plan gratis)**.
- **Dónde vive ahora:** Cloudflare Pages → **https://dantal-app.pages.dev**
  (GitHub Pages sigue como copia: https://daniel111982.github.io/MiEntrenamiento/)
- **Qué ya hace:** programa personalizado, sesiones guiadas, nutrición, Running,
  seguimiento, usuarios, avisos, ideas e incidencias, **cuentas beta con código de
  invitación y caducidad**, **gestión de betas a distancia**, **sincronización de
  datos entre dispositivos**, fotos de progreso, meta corporal, menú semanal y
  compra, escáner de alimentos, insignias y retos, informe semanal, planificación
  adaptativa, coach con IA incluida desde el servidor, RGPD, **avisos globales
  publicados por el dueño** y **panel de administración con catálogos globales y
  gestión de cuentas cloud**.

### El límite actual
Los datos viven en el dispositivo (funciona sin conexión) y **se copian a la cuenta**
en Supabase, así que ya se pueden recuperar en otro móvil. Las fotos y los datos
de seguridad local no salen del dispositivo. Quedan para más adelante: **dominio de
pago, suscripciones/pago en tienda e integración nativa de relojes**.

---

## Servidor y alojamiento web

**Componentes:** Dominio HTTPS · Base de datos · Usuarios · Sincronización.

### 1. Para qué sirve el servidor

| Ahora (sin servidor) | Con servidor |
| --- | --- |
| Datos solo en cada móvil | Cuentas reales y datos centralizados |
| No ves a los testers beta | Gestionas las betas a distancia (ver, ampliar, cortar, borrar) |
| Nada se sincroniza | Sincronización entre móvil y ordenador |
| Sin copias en la nube | Copia de seguridad y recuperación |
| Imposible cobrar bien | Suscripciones controladas por el servidor |

### 2. Arquitectura (en simple)

```
   Móvil / ordenador                Servidor                 Base de datos
 ┌───────────────────┐        ┌───────────────────┐       ┌───────────────┐
 │  App (la PWA)     │  HTTPS │  API (programa     │       │  Usuarios     │
 │  HTML/CSS/JS      │ ─────► │  que atiende       │ ────► │  Datos        │
 │  + llamadas a la  │ ◄───── │  peticiones)       │ ◄──── │  Betas        │
 │    API            │  JSON  │                   │       │  Suscripciones│
 └───────────────────┘        └───────────────────┘       └───────────────┘
```

La app sigue siendo la misma; se le añade una capa que "habla" con la API.

### 3. Opciones de alojamiento (empezamos por lo gratis)

| Opción | Coste | Ventajas | Inconvenientes |
| --- | --- | --- | --- |
| **Ordenador de casa + túnel** (recomendado para empezar) | 0 € | Gratis, privado, control total | Debe estar encendido; tú lo mantienes |
| **VPS** (servidor en la nube) | ~5 €/mes | Siempre encendido, más fiable | Cuesta dinero cada mes |
| **Servicio gestionado** (Supabase) | 0 € hasta cierto uso | Cero mantenimiento, base de datos lista | Menos control; límites del plan gratis |

**Decidido:** montamos el backend en **Supabase (plan gratis)**. Nos da base de datos,
cuentas de usuario y API **sin mantener ningún servidor**. Si la app crece mucho, se
pasa al plan de pago de Supabase o se migra a otro sitio, **sin rehacer el código**.
Los pasos están en **`supabase/GUIA.md`** y las tablas en **`supabase/esquema.sql`**.

### 4. Dominio y HTTPS

- **La API ya va por HTTPS** sola: Supabase sirve en `https://tuproyecto.supabase.co`.
  No hay que configurar certificados ni túneles.
- **El dominio propio** (~10 €/año, p. ej. `mientrenamiento.app`) sigue siendo útil para
  **la web de la app**: da imagen profesional y es **obligatorio para publicar en Google
  Play con TWA** (Android necesita que la web esté en tu dominio).
- Mientras tanto, la web puede seguir en **GitHub Pages**, que ya da HTTPS gratis.

### 5. Base de datos

- **Al principio: SQLite.** Es un único archivo, cero instalación, cero mantenimiento.
  De sobra para cientos o miles de usuarios.
- **Si escala mucho: PostgreSQL.** Se cambia cuando haga falta; el código se escribe
  para que el cambio sea sencillo.

### 6. Usuarios y autenticación

- Cuentas con **correo + contraseña** (la contraseña se guarda **cifrada**, nunca en
  claro).
- **Tokens de sesión** para que el móvil no pida la contraseña en cada visita.
- Recuperación de contraseña por correo.
- **Borrado de cuenta** (obligatorio para las tiendas).

### 7. Sincronización

- Cada dato lleva una **fecha de modificación**. Al sincronizar, gana el más reciente
  ("última escritura gana") y lo demás se une.
- Se sincroniza **por usuario** y solo lo que cambie, para gastar pocos datos.
- La app **sigue funcionando sin conexión** y sincroniza cuando vuelve la red.

**Estado: hecho (Fase 2).** Se guarda en el dispositivo (fuente principal) y se copia a
la tabla `datos` de Supabase. Al abrir o volver a la app, se compara la fecha y gana el
más nuevo. Botón «Sincronizar ahora» en *Ajustes → Tus datos*. Se sube todo salvo la
contraseña local, las fotos de técnica y las fotos de progreso (se quedan en el
dispositivo). Los avisos globales del dueño viven aparte, en la tabla `avisos`, y no
forman parte de la copia de cada usuario. Lo mismo pasa con los catálogos globales
(`catalogos`): no se copian dentro de cada usuario, sino que se leen del servidor al
abrir la app, para que un cambio del dueño llegue a todas las cuentas sin pisar sus
datos. Las rutinas globales se añaden a «Mis sesiones» solo si el usuario pulsa *Copiar*.

### 8. Qué necesitas para montarlo (lista de la compra)

- [ ] Una **cuenta gratis de Supabase** (https://supabase.com).
- [ ] Crear el proyecto y ejecutar `supabase/esquema.sql` → ver `supabase/GUIA.md`.
- [ ] En un proyecto que ya tuviera las tablas, ejecutar además
      `supabase/esquema-admin.sql` para crear `catalogos` y `borrar_usuario_admin(uuid)`.
      Es incremental y se puede ejecutar más de una vez.
- [ ] El **Project URL** y la clave **anon public** (públicas: van dentro de la app).
- [ ] (Opcional pero recomendado) un **dominio** propio para la web.
- [ ] (Para más adelante) cuenta de **Google Play** y de **Apple**.

> **Seguridad:** la clave **`service_role`** de Supabase **nunca** va en la app ni en el
> proyecto publicado. La que va en la app es la **anon**, que es pública por diseño y
> está protegida por las reglas de la base de datos.

---

## Web

**Ordenador y navegador.** Es lo que ya tienes: la app se abre en cualquier navegador.

- **Hoy:** servida por **Cloudflare Pages** en https://dantal-app.pages.dev (gratis, HTTPS
  y publicación automática). GitHub Pages sigue activa como copia.
- **Fase 3 (hecha):** migración a Cloudflare Pages. Ver «Fase 3» más abajo.
- **Instalable:** al ser PWA, se puede "Añadir a pantalla de inicio" en móvil y
  escritorio, y funciona sin conexión.
- **Ventaja:** la web es la base de todo lo demás (Android e iOS reutilizan esta misma
  app).

---

## Android

**Google Play mediante TWA** (Trusted Web Activity).

**Qué es:** Google permite publicar una PWA como app de Android "de verdad" envolviendo
la web en un contenedor nativo (TWA). La app de la tienda **es** tu web, siempre
actualizada.

**Requisitos:**
- Cuenta de **Google Play Console**: **25 $ pago único**.
- Un **dominio con HTTPS** (por eso el dominio propio es importante aquí).
- **Digital Asset Links**: un archivo `assetlinks.json` que se pone en el dominio para
  demostrar que la app y la web son del mismo dueño.
- **Iconos** (ya los tienes) y una **ficha** (descripción, capturas, política de
  privacidad).
- Política de privacidad y borrado de cuenta.

**Cómo se genera (dos caminos):**
1. **PWABuilder.com** (el más fácil): metes la URL y te descarga el paquete Android
   listo para subir. Sin instalar nada.
2. **Bubblewrap** (línea de comandos): más control, pero pide instalar Node, Java y el
   Android SDK.

**Ventaja:** muy poco mantenimiento y la web se actualiza sola.
**Límite:** solo Android; y si algún día necesitas funciones nativas muy concretas,
habría que pasar a **Capacitor** (envoltorio más completo).

---

## iOS

**App Store.** Apple **no** admite TWA. Hay que envolver la web en un contenedor de iOS.

**Requisitos:**
- Cuenta de **Apple Developer Program**: **99 €/año**.
- Un **Mac con Xcode** para compilar y subir la app.
- Política de privacidad y borrado de cuenta.

**Cómo se hace:** con **Capacitor** (o el paquete de iOS de PWABuilder) se envuelve la
misma web en una app de iOS.

**Aviso honesto:** Apple es más estricta. Puede **rechazar** una app que sea "solo una
web" (norma 4.2). Para que la aprueben conviene que se note que es una app de verdad:
funcionar sin conexión, notificaciones, guardar datos en el dispositivo, etc. (la
mayoría ya lo tienes).

---

## Monetización

**Modelo recomendado: suscripción** (mensual / anual) con una parte gratis.

| Plan | Qué incluye (ejemplo) |
| --- | --- |
| **Gratis** | Programa, sesiones y seguimiento básico |
| **Premium** | Nutrición avanzada, Running, sincronización en la nube, copias, sin límites |

**Cómo se cobra:**
- **Dentro de la app** hay que usar el sistema de pago de la tienda
  (**Google Play Billing** / **Apple StoreKit**). Las tiendas se llevan una comisión
  (15–30 %).
- **En la web** se puede cobrar con **Stripe** (comisión menor), pero las tiendas
  obligan a usar su pago para lo que se consuma dentro de la app.
- **El servidor valida** la suscripción y decide qué ve cada usuario.

**Qué necesitas:**
- Productos creados en Play Console y en App Store Connect.
- El servidor comprobando los recibos de compra.
- Páginas de **términos** y **privacidad**.

---

## Costes (resumen)

| Concepto | Ahora | Más adelante |
| --- | --- | --- |
| Supabase (plan gratis) | **0 €** | ~25 $/mes si escala mucho |
| Dominio propio | 0 € (GitHub Pages) | ~10 €/año |
| Google Play Console | 0 € | **25 $ una vez** |
| Apple Developer Program | 0 € | **99 €/año** |
| Comisión de las tiendas | — | 15–30 % de lo cobrado |

---

## Plan por fases

- [x] **Fase 1 — Servidor mínimo (gratis).** Proyecto en Supabase, cuentas reales y API
  para **gestionar las betas a distancia**. La app se conecta. *(hecho: v30 y v31)*
- [x] **Fase 2 — Cuentas y sincronización.** Usuarios reales en el servidor y datos
  sincronizados entre dispositivos. *(hecho: v32, más un ping diario que evita que
  Supabase se pause a los 7 días sin visitas)*
- [x] **Fase 3 — URL propia (gratis).** Un dominio de verdad cuesta ~10 €/año; mientras
  tanto se usa **Cloudflare Pages** en https://dantal-app.pages.dev (hecho el 19-11-2026),
  con HTTPS, actualización automática y lista para Android/TWA.
- [x] **Fase 3B — Funciones de producto y RGPD.** Fotos de progreso, meta corporal,
  menú y compra, escáner, logros/retos, informe semanal, planificación adaptativa,
  coach con ingesta real, consentimiento y avisos globales del dueño. *(hecha: v39)*
- [x] **Fase 3C — Panel de administración completo.** Catálogos globales de ejercicios,
  alimentos y rutinas, gestión de cuentas cloud y permisos reforzados en Supabase.
  Requiere ejecutar `supabase/esquema-admin.sql` en el proyecto existente. *(hecha: app 2.01)*
- [x] **Fase 3D — Coach IA incluido.** Edge Function `coach-ia` en Supabase con una
  clave de Gemini guardada como secreto y límite de 25 consultas por cuenta y día.
  Orden: clave propia > servidor > motor local. La IA del navegador se retiró en la
  app 2.04: confundía y era difícil de activar. *(hecha: app 2.03, simplificada: 2.04)*
- [x] **Fase 3E — Nutrición: escáner y supermercados.** Escáner corregido (macros reales,
  español, ingredientes, alérgenos, fibra, caché e historial), producto a mano y catálogo
  de 26.856 productos de supermercados españoles de Open Food Facts. El catálogo completo
  va en la PWA para buscar sin red; una muestra curada de 563 productos se importó en
  `public.catalogos` para que el dueño pueda editarla. *(hecha: app 2.05)*
- [x] **Fase 3F — Menú personalizable.** El usuario marca recetas favoritas o las descarta,
  cambia la receta de cualquier día/comida, edita los gramos de cada ingrediente y puede
  dejar una comida libre. Se recalculan las calorías del día y la lista de la compra, y
  al añadir la comida al diario se conservan las cantidades elegidas (también ve el coach).
  No es un plan rígido: no hay ayunos ni comidas obligatorias. Siguiente: 2.07 calorías
  adaptativas. *(hecha: app 2.06)*
- [ ] **Fase 4 — Android.** Paquete TWA y publicación en Google Play (requiere dominio propio).
- [ ] **Fase 5 — iOS.** Envoltorio con Capacitor y publicación en la App Store.
- [ ] **Fase 6 — Monetización y relojes.** Suscripciones con el pago de las tiendas
  (Stripe en web) e integración **nativa** de relojes (HealthKit / Google Health Connect),
  que no se mezcla con la importación de CSV actual.

### Fase 3 — URL propia gratis (Cloudflare Pages) — HECHA

Un **dominio propio de verdad** (tipo `dantal.com`) **no es gratis**: cuesta unos
8–12 € al año. Mientras tanto, **Cloudflare Pages** (plan gratis) da una dirección limpia
y profesional, con HTTPS y actualización automática desde GitHub. Además sirve para
**Android/TWA**, porque Google Play solo pide un dominio que tú controles con HTTPS.

**Resultado (19-11-2026): la app está publicada en https://dantal-app.pages.dev**
(se comprobó que abre la pantalla de acceso de DanTal y no da errores de consola).
El nombre `dantal` ya estaba ocupado, así que se usó `dantal-app`. GitHub Pages sigue
disponible como copia.

**Pasos que se hicieron (una sola vez):**

1. Cuenta gratis en https://dash.cloudflare.com/sign-up y verificación del correo.
2. En el panel: **Workers & Pages → Create application → Pages → Connect to Git**.
   Se autorizó la app **Cloudflare Workers and Pages** en GitHub con acceso **solo al
   repositorio `MiEntrenamiento`**.
3. Repositorio `Daniel111982/MiEntrenamiento`, rama `main`.
4. Configuración de compilación usada:
   - **Project name:** `dantal-app` → `https://dantal-app.pages.dev`
   - **Production branch:** `main`
   - **Framework preset:** `None`
   - **Build command:** `exit 0`
   - **Build output directory:** `/`
5. **Save and Deploy.** El despliegue terminó correctamente.
6. A partir de ahí, **cada `push` a `main` se publica solo** (comprobado con el commit
   `133b927`).
7. En Supabase se actualizó **Authentication → URL Configuration**: Site URL
   `https://dantal-app.pages.dev` y *Redirect URLs* para Cloudflare y GitHub Pages.
   Así los futuros correos de acceso apuntan al dominio bueno.

> El día que se quiera un dominio real, se compra (Cloudflare Registrar lo vende casi a
> precio, ~10 €/año) y se añade en *Custom domains* sin rehacer nada.

### Fase 3B — Funciones de producto y RGPD — HECHA (v39)

Se cierran los huecos que faltaban para la beta, sin coste adicional:

- **Fotos de progreso** (`#seguimiento/fotos`): galería privada en el dispositivo; nunca se suben.
- **Meta corporal** (`#seguimiento/objetivo`): peso/grasa objetivo con fecha y comparación con el último registro.
- **Menú semanal y lista de la compra** (`#nutricion/menu`) y **escáner** (`#nutricion/escaner`) con Open Food Facts; solo se envía el código de barras.
- **Logros y retos del mes** (`#seguimiento/logros`) e **informe semanal** (`#seguimiento/informe`).
- **Planificación adaptativa**: sesiones perdidas se mueven a huecos libres y cada sesión se ajusta al material y al tiempo disponible.
- **Coach**: usa la ingesta real (catálogo, recetas y escaneados), detecta estancamiento, da pasos de técnica y alternativas concretas; el historial del chat se guarda con el usuario.
- **RGPD**: política, consentimiento por finalidades y borrado de cuenta (RPC `borrar_mi_cuenta()` verificada).
- **Contenidos del dueño**: tabla `avisos` con RLS; lectura para cuentas autenticadas y escritura solo para `public.es_admin()`. Se gestiona en *Ajustes → Contenidos de la app* y aparece en «Hoy».

La sincronización incluye los campos nuevos (`coachChat`, `rgpd`, `metaCorporal`, `menu`,
`logrosVistos`) y **nunca** envía `seguridad`, `fotos` ni `progresoFotos` (comprobado).

### Mantener despierto el proyecto (anti-pausa)

El plan gratis de Supabase **pausa el proyecto tras 7 días sin ninguna visita**. Para
una beta con uso intermitente, se usa un **servicio externo de ping**
([cron-job.org](https://cron-job.org), gratis) que entra a la API **una vez al día** y lo
mantiene despierto. No depende del repositorio ni de GitHub.

**Ya configurado (19-11-2026):** cronjob `Ping Supabase DanTal` (id `8898034`), activo,
con ejecución diaria a las **06:00 (Europe/Madrid)** expresión `0 6 * * *`. Comprobado:
la llamada responde HTTP 200 con `{"ok" : true, "hora" : "..."}`.

**Cómo se configura (una sola vez):**

1. Crear una cuenta gratis en https://cron-job.org.
2. *Create cronjob* con estos datos:
   - **Título:** Ping Supabase DanTal
   - **URL:**
     `https://xeblpmdrqbaalkkwqaxh.supabase.co/rest/v1/rpc/ping`
   - **Schedule:** cada día (p. ej. a las 06:00).
   - **Advanced → Request method:** `POST`
   - **Advanced → Headers:**
     - `apikey: sb_publishable_x_jgGp3cBoqYr-E9vCK6hQ_PJjBW3T9`
     - `Authorization: Bearer sb_publishable_x_jgGp3cBoqYr-E9vCK6hQ_PJjBW3T9`
     - `Content-Type: application/json`
   - **Advanced → Request body:** `{}`
3. Guardar. La primera ejecución se puede probar con *Run now* (o comprobando la
   respuesta de la API como se hizo aquí).

La clave que se usa es la **pública** (anon), la misma que va dentro de la app; nunca la
`service_role`.

---

## Decisiones que necesito de ti

1. ~~Crear el proyecto en Supabase y conectar la app~~ **Hecho** (Fases 1 y 2).
2. ~~¿Tienes dominio propio?~~ **Hecho:** se usa `dantal-app.pages.dev` gratis; un dominio
   real (~10 €/año) se podrá añadir después en *Custom domains*.
3. **¿Tienes un Mac** para el día de iOS? (si no, iOS se deja para el final)
4. **Modelo de negocio:** ¿suscripción, pago único, o gratis con extras?

Lo siguiente será la **Fase 4** (Android/TWA), la **Fase 5** (iOS) o la **Fase 6**
(pagos y relojes nativos), según lo que prefieras. Antes conviene comprobar en el móvil
que las sesiones antiguas se recuperaron siguiendo el orden de URLs indicado: entrar
primero en GitHub Pages, iniciar sesión y esperar «Todo al día ✅», y solo después abrir
Cloudflare Pages (sin borrar datos del sitio).
