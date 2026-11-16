# MiEntrenamiento

App web instalable (PWA) de entrenamiento personal. Genera un programa a tu medida, te guía en cada sesión y registra tu progreso. Funciona sin conexión, admite varios usuarios y guarda los datos solo en tu dispositivo.

**Probarla:** https://daniel111982.github.io/MiEntrenamiento/

## Funciones

- **Programa personalizado:** objetivo (ganar músculo, recomposición corporal, fuerza, tonificar o perder grasa), nivel, días, frecuencia por músculo (1, 2 o 3 veces por semana), duración, material y músculos prioritarios.
- **Ciclos de 12 semanas** en tres fases (acumulación, intensificación y realización) con semanas de descarga.
- **Calendario semanal:** mover sesiones, sesiones perdidas, adelantar o añadir días.
- **Sesión guiada:** carga sugerida, botones −/+, temporizador de descanso, Tabata, drop set, pirámide y pantalla siempre encendida.
- **Seguimiento:** recuperación y equilibrio muscular sobre una silueta, récords, gráfica de 1RM por ejercicio, actividad, historial y calculadora de 1RM.
- **Peso y medidas:** registra peso, grasa corporal y perímetros (cintura, pecho, cadera, brazo y muslo) con gráfica de evolución, historial editable y notas.
- **Calorías y proteína:** calculadora de gasto diario (Mifflin-St Jeor), calorías objetivo según tu meta, reparto de macros, proteína, fibra, agua e IMC, tomando tu último peso registrado.
- **Biblioteca** de 68 ejercicios con dibujo animado del movimiento, paso a paso, claves, errores comunes y respiración. Puedes guardar tu vídeo de YouTube y tu foto de cada ejercicio.
- **Ayudas** en todos los botones (ratón, teclado o pulsación larga) e iconos ⓘ en las zonas importantes.
- **Usuarios:** gestor para crear, editar, cambiar y borrar usuarios; cada uno con su propio programa y seguimiento.
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
| `js/stats.js` | Récords, rachas, volumen y recuperación |
| `js/tecnica.js` | Dibujos animados y guía de técnica |
| `js/ayudas.js` | Ayudas contextuales |
| `sw.js` | Funcionamiento sin conexión |
| `VERSIONES/` | Copias completas por versión, historial y scripts para guardar o restaurar |

## Versiones

El proyecto guarda una copia completa de cada versión en `VERSIONES/`, para poder deshacer cambios.

- `VERSIONES/HISTORIAL.md` — árbol de versiones y qué cambia en cada una.
- `VERSIONES/nueva-version.cmd -Nota "..."` — guarda el estado actual como versión nueva.
- `VERSIONES/restaurar.cmd -Version v1.00` — vuelve a una versión anterior.

La versión que ve el usuario está en `js/app.js` → `const APP_VERSION`.
