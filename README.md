# MiEntrenamiento

App web instalable (PWA) de entrenamiento personal. Genera un programa a tu medida, te guía en cada sesión y registra tu progreso. Funciona sin conexión y guarda los datos solo en tu dispositivo.

**Probarla:** https://jobeb.github.io/MiEntrenamiento/

## Funciones

- **Programa personalizado:** objetivo (ganar músculo, recomposición corporal, fuerza, tonificar o perder grasa), nivel, días, frecuencia por músculo (1, 2 o 3 veces por semana), duración, material y músculos prioritarios.
- **Ciclos de 12 semanas** en tres fases (acumulación, intensificación y realización) con semanas de descarga.
- **Calendario semanal:** mover sesiones, sesiones perdidas, adelantar o añadir días.
- **Sesión guiada:** carga sugerida, botones −/+, temporizador de descanso, Tabata, drop set, pirámide y pantalla siempre encendida.
- **Seguimiento:** recuperación y equilibrio muscular sobre una silueta, récords, gráfica de 1RM por ejercicio, actividad, historial y calculadora de 1RM.
- **Biblioteca** de unos 70 ejercicios con técnica y alternativas.
- **Datos:** resumen en PDF, exportación CSV y copia de seguridad en JSON.

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
| `sw.js` | Funcionamiento sin conexión |
