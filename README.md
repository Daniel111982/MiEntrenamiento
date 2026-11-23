# DanTal (MiEntrenamiento)

App web instalable (PWA) de entrenamiento y nutrición. **Entrena · Nutre · Evoluciona.** Genera un programa a tu medida, te guía en cada sesión y registra tu progreso. Funciona sin conexión y, si tienes cuenta, copia tus datos a la nube para recuperarlos en otro móvil.

**Probarla:** https://dantal-app.pages.dev/ (copia en https://daniel111982.github.io/MiEntrenamiento/)

**Cuentas:** acceso con correo y contraseña (Supabase, plan gratis). La primera cuenta es la administradora; las demás entran con un código beta que reparte el dueño, con caducidad o sin límite. Sin conexión se sigue usando igual; al volver la red se sincroniza. El dueño gestiona desde el panel de administración los catálogos globales y las cuentas cloud.

## Funciones

- **Programa personalizado:** objetivo (ganar músculo, recomposición corporal, fuerza, tonificar o perder grasa), nivel, días, frecuencia por músculo (1, 2 o 3 veces por semana), duración, material y músculos prioritarios.
- **Ciclos de 12 semanas** en tres fases (acumulación, intensificación y realización) con semanas de descarga.
- **Calendario semanal:** mover sesiones, sesiones perdidas, adelantar o añadir días.
- **Sesión guiada:** carga sugerida, botones −/+, temporizador de descanso, Tabata, drop set, pirámide y pantalla siempre encendida.
- **Seguimiento:** recuperación y equilibrio muscular sobre una silueta, récords, gráfica de 1RM por ejercicio, actividad, historial y calculadora de 1RM. **`Seguimiento → Rendimiento`** reúne el volumen de las últimas 8 semanas, la recuperación estimada de los últimos 14 días y la evolución de fuerza del ejercicio que elijas, con gráficos SVG y solo datos registrados.
- **Peso y medidas:** registra peso, grasa corporal y perímetros (cintura, pecho, cadera, brazo y muslo) con gráfica de evolución, historial editable y notas.
- **Calorías y proteína:** calculadora de gasto diario (Mifflin-St Jeor), calorías objetivo según tu meta, reparto de macros, proteína, fibra, agua e IMC, tomando tu último peso registrado. Las **calorías son adaptativas**: DanTal ajusta hasta ±200 kcal según tu tendencia de peso (o tus comidas registradas), explica el motivo y te deja fijar tu propio número o desactivar el ajuste.
- **Gráficos del diario:** anillo de calorías, donut de proteínas/hidratos/grasas, barras por comida y evolución de los últimos 7 días, todo dibujado con lo que has anotado. Cada alimento muestra sus gramos de macro y fibra, y al añadir una comida aparece una tarjeta visual con su reparto.
- **Fibra y micronutrientes reales:** la fibra se muestra junto al resto de macros. Calcio, hierro, vitaminas D y C y potasio solo aparecen cuando Open Food Facts los declara en la ficha o los escribes a mano; nunca se estiman. Las referencias son orientativas para adultos y no sustituyen el consejo médico.
- **Informe nutricional semanal** (`Nutrición → Informe`): barras de calorías por día con línea de objetivo, donut y barras de macros medios, comparación con la semana anterior y micronutrientes declarados solo en los días que los tienen. Media de calorías, proteína, fibra y agua, con opción de copiar o descargar el informe. Nunca rellena días sin registrar.
- **Biblioteca** de 82 ejercicios con imagen/GIF real del movimiento, paso a paso, claves, errores comunes y respiración. La ficha añade **ilustraciones anatómicas de inicio y final** (dos posturas) cuando el ejercicio tiene imagen asignada. Ya no se muestran dibujos de palos: la lista y la ficha usan GIF o imagen real. Puedes guardar tu vídeo de YouTube y tu foto de cada ejercicio.
- **Ayudas** en todos los botones (ratón, teclado o pulsación larga) e iconos ⓘ en las zonas importantes.
- **Usuarios:** gestor para crear, editar, cambiar y borrar usuarios; cada uno con su propio programa y seguimiento.
- **Nube y beta:** cuentas reales, inicio de sesión persistente, sincronización entre dispositivos, códigos beta con duración elegida por el dueño y borrado de cuenta desde la app.
- **Fotos de progreso:** galería corporal privada que **nunca sale del dispositivo**, con fecha, ángulo y nota.
- **Meta corporal:** peso y grasa objetivo con fecha, y evolución frente al registro real.
- **Nutrición ampliada:** **menú semanal personalizable** (recetas favoritas o descartadas, cambiar la receta de cualquier día, editar gramos y quitar comidas; la lista de la compra se recalcula sola), **26.856 productos de supermercados españoles** (Lidl, Dia, Carrefour, Hacendado, Eroski, Aldi, Consum, Alcampo, Bonpreu, Gadis…) buscables por nombre o marca y **escáner de códigos de barras** con ficha editable, caché e historial. Solo se envía el EAN a Open Food Facts; los datos son colaborativos (ODbL) y la etiqueta manda.
- **Constancia:** insignias y retos mensuales e **informe semanal** con sesiones, minutos, volumen, racha, peso y agua.
- **Planificación adaptativa:** mueve las sesiones perdidas a huecos libres y ajusta cada sesión a tu material y tiempo.
- **Coach mejorado:** explica técnica con pasos reales, alternativas según tu material, detecta estancamiento y compara tus metas con tu ingesta real del día.
- **Privacidad (RGPD):** política y consentimiento dentro de la app, con finalidades claras y ejercicio del derecho a borrado.
- **Contenidos del dueño:** el administrador publica avisos globales que aparecen en «Hoy»; solo él puede escribirlos (el resto solo lee).
- **Panel de administración** (*Ajustes → Administración*): el dueño publica, edita, oculta y borra **ejercicios, alimentos y rutinas globales**, y puede editar o borrar **cuentas cloud**. Los cambios llegan a todas las cuentas; la base de datos solo permite escribir al administrador. Las rutinas globales se copian en «Mis sesiones» sin sustituir el programa de cada usuario.
- **Datos:** resumen en PDF, exportación CSV y copia de seguridad en JSON (de un usuario o de todos).

## Ejecutar en local

No necesita instalación ni compilación:

```
python -m http.server 8765
```

y abre http://localhost:8765.

## Estructura

| Archivo | Contenido |
| --- | --- |
| `index.html` | Estructura de la página |
| `css/estilos.css` | Estilos (modo claro y oscuro) |
| `js/app.js` | Páginas, navegación y acciones |
| `js/generador.js` | Generador de programas, fases y fechas |
| `js/ejercicios.js` | Biblioteca de ejercicios |
| `js/stats.js` | Récords, rachas, volumen semanal, recuperación diaria y exportación CSV |
| `js/tecnica.js` | Dibujos animados y guía de técnica |
| `js/ayudas.js` | Ayudas contextuales |
| `js/nube.js` | Cliente Supabase: cuentas, sync, borrado y contenidos |
| `js/logros.js`, `js/informe.js` | Insignias, retos e informe semanal de entrenamiento |
| `js/informe-nutricion.js` | Datos del informe nutricional semanal y texto para copiar o descargar |
| `js/menu.js`, `js/escaner.js` | Menú personalizable (preferencias, recetas, gramos) y escáner (caché, historial, micronutrientes declarados y productos a mano) |
| `js/graficos.js` | Gráficos SVG del diario y del entrenamiento (calorías, macros, comidas, semana, volumen, recuperación y fuerza) |
| `supabase/catalogo-supermercados.json` | Catálogo completo de marcas españolas, ODbL, cargado bajo demanda y sin conexión |
| `supabase/importar-catalogo-supermercados.sql` | Muestra curada de 563 productos en `public.catalogos` para el panel del dueño |
| `js/planificador.js` | Reorganización y ajuste de sesiones |
| `js/rgpd.js` | Política de privacidad y consentimiento |
| `js/coach.js`, `js/llm.js` | Coach local y chat IA: clave propia, servidor de DanTal y motor local |
| `supabase/esquema.sql`, `supabase/esquema-admin.sql`, `supabase/esquema-ia.sql`, `supabase/GUIA.md` | Tablas, permisos, límite de uso del coach y pasos del backend gratis |
| `supabase/functions/coach-ia/index.ts` | Edge Function que sirve Gemini con una clave única guardada como secreto |
| `supabase/esquema-media-ejercicios.sql` | Bucket público `exercise-media`: lectura pública, escritura solo del dueño |
| `scripts/mapear-ejercicios.mjs` | Empareja los 82 ejercicios con el dataset de RepDB y genera `scripts/mapeo-revisar.json` |
| `scripts/subir-media-supabase.mjs` | Sube las ilustraciones y actualiza `public.catalogos` (variables de entorno, nunca en el repo) |
| `sw.js` | Funcionamiento sin conexión |
| `VERSIONES/` | Copias completas por versión, historial y scripts para guardar o restaurar |

## Ilustraciones anatómicas (RepDB)

Usamos el dataset abierto de [RepDB](https://repdb.co) (708 ejercicios, ilustraciones WebP y nombres e instrucciones en español) bajo su licencia gratuita. El dataset se descarga solo en local, en `.tmp/repdb/` (ignorado por git): **no se redistribuye** y nunca entra en el build público.

Flujo para el dueño:

1. Ejecutar `supabase/esquema-media-ejercicios.sql` en el editor SQL de Supabase (crea el bucket `exercise-media`).
2. Clonar el dataset en `.tmp/repdb/`: `git clone --depth 1 https://github.com/RepDB/exercise-dataset .tmp/repdb`.
3. `node scripts/mapear-ejercicios.mjs` → genera `scripts/mapeo-revisar.json` con 67 coincidencias automáticas, 9 para revisar y 6 sin coincidencia. Revisar ese archivo antes de subir.
4. `SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/subir-media-supabase.mjs --dry-run` y, si todo cuadra, sin `--dry-run`. Añadir `--include-review` para incluir los 9 casos a revisar.

Las imágenes se suben a `exercise-media/ejercicios/<id>-start.webp` y `-end.webp`. La app recibe las URL y los datos técnicos dentro de `public.catalogos.datos` (`media_url`, `media_url_end`, `primary_muscles`, `secondary_muscles`, `execution_steps`), sin columnas nuevas. La clave `service_role` solo vive en la variable de entorno del script: **nunca se guarda en el proyecto ni viaja a la app**.

**Ilustraciones de ejercicios por [RepDB (repdb.co)](https://repdb.co).**

### Animaciones de los ejercicios

La lista y la ficha de cada ejercicio muestran un **GIF animado del movimiento** de [Exercise Gym GIFs DB](https://github.com/JahelCuadrado/ExerciseGymGifsDB), servido desde su CDN pública (jsDelivr), sin subir nada a Supabase ni usar claves. Si el GIF no carga, se prueba la imagen de RepDB y después el emoji; nunca aparece un dibujo de palos.

- `scripts/mapear-gifs.mjs` genera candidatos; `scripts/generar-gifs.mjs` comprueba las 82 rutas y escribe `js/gifs.js`.
- `js/gifs.js` contiene el emparejamiento de los 82 ejercicios; `urlGif(id)` devuelve la URL o `null`.
- **Aviso de licencia:** el repositorio de los GIFs indica que las imágenes se recopilaron de Internet y que sus autores son otros. Conviene revisar ese punto antes de usar la app con fines comerciales.

### Mapa corporal anatómico

El mapa de «Zonas trabajadas» ya no es una silueta de círculos: muestra un cuerpo con foto gris recortada a la silueta y **cada músculo dibujado por separado**. Los 26 identificadores de RepDB siguen agrupándose en las 10 zonas de siempre, así que el color principal/secundario funciona igual que antes.

- `js/cuerpo-real.js`: paths musculares y mapeo de zonas, extraídos de [MuscleMap](https://github.com/Jsplice/MuscleMap) (MIT). Se generó con `.tmp/generar-cuerpo-real.mjs` desde los assets del repositorio citado.
- `icons/cuerpo-frente.webp` e `icons/cuerpo-espalda.webp`: fotos base incluidas en el build y en la caché offline.
- La ficha del ejercicio muestra el crédito «Mapa muscular por MuscleMap (MIT)» junto a las atribuciones existentes de RepDB y de los GIFs.

## Versiones

El proyecto guarda una copia completa de cada versión en `VERSIONES/`, para poder deshacer cambios.

- `VERSIONES/HISTORIAL.md` — árbol de versiones y qué cambia en cada una.
- `VERSIONES/nueva-version.cmd -Nota "..."` — guarda el estado actual como versión nueva.
- `VERSIONES/restaurar.cmd -Version v1.00` — vuelve a una versión anterior.

La versión que ve el usuario está en `js/app.js` → `const APP_VERSION` (ahora `2.16`). La caché del service worker es `dantal-v5.9` y los archivos estáticos usan `?v=5.9`. Además, cada `commit` guarda automáticamente una copia fechada en `C:\Users\talaso\Desktop\Proyectos open code\Versiones\` (índice en `INDICE.md`).

## Privacidad y seguridad

- La clave de Supabase que va en la app es **pública** (anon/publishable). La clave `service_role` **nunca** se incluye.
- Las fotos, los datos de seguridad locales y las fotos de progreso **no se sincronizan**.
- Los reportes de «Ideas e incidencias» son privados del dueño.
- Los avisos globales se guardan en la tabla `avisos` de Supabase: lectura para cuentas autenticadas, escritura solo para el administrador.
- Los catálogos globales viven en la tabla `catalogos`: las cuentas normales solo leen los activos; el dueño ve también los ocultos y puede escribir. Las cuentas normales no pueden borrar usuarios: la función `borrar_usuario_admin(uuid)` comprueba `es_admin()` en la base de datos.
- Las tablas nuevas ya están creadas en el proyecto real; si faltaran, la app sigue funcionando con sus catálogos de serie y el panel indica qué archivo SQL hay que ejecutar.
- El coach IA del servidor usa una sola clave de Gemini como secreto `IA_CLAVE` en Supabase. Nunca viaja a la app ni se guarda en el dispositivo. Cada cuenta tiene un límite de 25 consultas al día (`public.ia_uso` / `registrar_ia_uso()`), **excepto la cuenta del dueño (administradora), que no tiene límite**: la exención se comprueba en la base de datos con `public.es_admin()`, no en la app. Si no hay cuenta o el servidor falla, el chat lo avisa y responde con el motor local. La IA del navegador se ha retirado: era confusa y difícil de activar para el usuario.
- Política y consentimiento RGPD disponibles en **Ajustes → Privacidad y RGPD**.
