// Ayudas contextuales de MiEntrenamiento.
// - Botones: la ayuda aparece al pasar el ratón, al enfocarlos con el teclado o al mantenerlos pulsados en el móvil.
// - Zonas importantes: se añade un botón ⓘ que explica cómo funciona esa parte.

// [selector, texto]. El primero que coincide gana; un data-tip escrito a mano tiene prioridad.
const TIPS = [
  // Navegación
  ['.nav a[data-v=inicio]', 'Hoy: la sesión que te toca, tu semana y tu recuperación'],
  ['.nav a[data-v=programa]', 'Programa: ciclo, calendario y sesiones'],
  ['.nav a[data-v=seguimiento]', 'Seguimiento: progreso, récords, recuperación e historial'],
  ['.nav a[data-v=ejercicios]', 'Ejercicios: biblioteca con técnica y alternativas'],
  ['.nav a[data-v=ajustes]', 'Ajustes: perfil, recordatorios y tus datos'],
  ['.atras', 'Volver a la página anterior'],
  ['.racha', 'Semanas seguidas con al menos una sesión. Toca para ver tu seguimiento'],

  // Hoy y calendario
  ['.tira .dia.hecha', 'Sesión hecha. Toca para ver el resumen'],
  ['.tira .dia.pendiente', 'Sesión pendiente. Toca para ver qué ejercicios lleva'],
  ['.tira .dia.perdida', 'Sesión perdida. Puedes hacerla hoy o moverla a otro día'],
  ['.tira .dia', 'Día de descanso. Toca para abrir el calendario'],
  ['[data-a=empezar]', 'Empieza la sesión en modo guiado: serie a serie, con carga sugerida y descansos'],
  ['[data-a=acortar]', '¿Poco tiempo? Elige 20, 30, 45 o 60 min y quito accesorios y series manteniendo lo principal'],
  ['a.btn[href^="#programa/sesion"]', 'Ver los ejercicios, series y descansos de esta sesión'],
  ['[data-a=hacerHoy]', 'Hacer hoy esta sesión perdida'],
  ['[data-a=mover]', 'Mover esta sesión a otro día libre de la semana'],
  ['[data-a=anadirDia]', 'Convertir este día de descanso en un día de entreno extra'],
  ['[data-a=semana][data-d="-7"]', 'Semana anterior'],
  ['[data-a=semana][data-d="7"]', 'Semana siguiente'],
  ['[data-a=nuevoCiclo]', 'Crea un ciclo nuevo de 12 semanas con tu perfil actual'],

  // Programa y sesiones
  ['[data-a=metodo]', 'Método de intensificación: normal, pirámide, drop set o Tabata'],
  ['[data-a=cambiar]', 'Cambiar por otro ejercicio que trabaje lo mismo con tu material'],
  ['[data-a=adelantar]', 'Hacer esta sesión ahora; cuenta como la próxima de ese tipo'],
  ['[data-a=pdfPlan], [data-a=pdfMia], [data-a=pdfHist], [data-a=pdfCurso]', 'Abre un resumen para imprimir o guardar como PDF'],
  ['[data-a=empezarMia], [data-a=empezarCarta]', 'Empezar esta sesión ahora en modo guiado'],
  ['[data-a=guardarCarta]', 'Guardar en Mis sesiones para repetirla cuando quieras'],
  ['[data-a=borrarMia]', 'Borrar esta sesión guardada (podrás deshacerlo)'],
  ['a.icono[href="#programa/carta"]', 'Crear una sesión a la carta'],

  // Sesión en curso
  ['[data-a=salirSesion]', 'Salir sin perder nada: la sesión sigue abierta y puedes volver desde Hoy'],
  ['[data-a=pausa]', 'Pausar o reanudar el cronómetro de la sesión'],
  ['.guiado [data-a=hecho]', 'Registra la serie con los valores de arriba y empieza el descanso. También vale pulsar Intro'],
  ['.series [data-a=hecho]', 'Marcar o desmarcar esta serie como hecha'],
  ['[data-a=paso][data-d^="-"]', 'Restar'],
  ['[data-a=paso]', 'Sumar'],
  ['.guiado input[data-c=kg]', 'Kilos que has levantado. Ya viene con la carga sugerida'],
  ['.guiado input[data-c=reps]', 'Repeticiones (o segundos) que has hecho'],
  ['[data-a=saltarEj]', 'Pasa este ejercicio al final, por ejemplo si la máquina está ocupada'],
  ['[data-a=irEj]', 'Hacer este ejercicio ahora'],
  ['[data-a=cambiarSes]', 'Cambiar este ejercicio solo en la sesión de hoy'],
  ['[data-a=verLista]', 'Ver y corregir todas las series de la sesión'],
  ['[data-a=serie][data-d="1"]', 'Añadir una serie más a este ejercicio'],
  ['[data-a=serie]', 'Quitar la última serie de este ejercicio'],
  ['[data-a=cronoSerie]', 'Cuenta atrás para ejercicios por tiempo, como la plancha'],
  ['[data-a=tabata]', 'Empieza 8 rondas de 20 s de trabajo y 10 s de descanso con avisos sonoros'],
  ['[data-a=terminar]', 'Guardar la sesión con las series hechas y valorar cómo te ha ido'],
  ['[data-a=descartar]', 'Cerrar la sesión sin guardar nada'],
  ['[data-a=valorar][data-v=facil]', 'Fácil: la próxima vez subiré más la carga'],
  ['[data-a=valorar][data-v=bien]', 'Bien: progresión normal'],
  ['[data-a=valorar][data-v=duro]', 'Duro: mantendré la carga la próxima vez'],
  ['[data-a=descMenos]', 'Quitar 15 segundos al descanso'],
  ['[data-a=descMas]', 'Añadir 15 segundos al descanso'],
  ['[data-a=descSaltar]', 'Terminar el descanso ya y seguir con la siguiente serie'],
  ['[data-a=descDeshacer]', 'Deshacer la serie que acabas de marcar'],
  ['[data-a=detalle]', 'Ver cómo se hace este ejercicio'],
  ['a[href*="youtube.com"]', 'Abre YouTube en otra pestaña con vídeos de la técnica'],
  ['a[href*="google.com/search"]', 'Abre en otra pestaña fotos de referencia de este ejercicio'],
  ['[data-a=videoAdd]', 'Pega el enlace de un vídeo de YouTube para verlo siempre en esta ficha'],
  ['[data-a=videoQuitar]', 'Quitar el vídeo guardado'],
  ['[data-a=foto]', 'Haz o elige una foto; se guarda solo en este dispositivo'],
  ['[data-a=fotoQuitar]', 'Quitar tu foto'],

  // Seguimiento, ejercicios y ajustes
  ['[data-a=mes][data-d="-1"]', 'Mes anterior'],
  ['[data-a=mes]', 'Mes siguiente'],
  ['.mes a.si', 'Día entrenado. Toca para ver la sesión'],
  ['[data-a=borrarHist]', 'Borrar esta sesión del historial (podrás deshacerlo)'],
  ['[data-a=filtro]', 'Filtrar por músculo principal'],
  ['[data-a=buscar]', 'Escribe parte del nombre para buscar'],
  ['#rmKg', 'Kilos que levantaste en una serie'],
  ['#rmReps', 'Repeticiones que hiciste con ese peso (mejor si son 10 o menos)'],
  ['[data-a=exportar]', 'Descarga un archivo con todos tus datos para no perderlos'],
  ['[data-a=csv]', 'Descarga tu historial en una hoja de cálculo'],
  ['[data-a=borrarTodo]', 'Borra perfil, programa e historial de este dispositivo'],
  ['[data-a=recordatorio]', 'Activa un aviso a tu hora habitual los días que toca entrenar'],
  ['[data-a=hora]', 'Hora a la que quieres el recordatorio'],
  ['[data-a=menuUsuarios]', 'Cambiar de usuario o gestionar usuarios'],
  ['[data-a=usarUsuario]', 'Pasar a este usuario: verás su programa y su seguimiento'],
  ['[data-a=exportarTodos]', 'Descarga un archivo con los datos de todos los usuarios'],
  ['[data-a=exportarUsuario]', 'Descarga solo los datos de este usuario'],
  ['[data-a=borrarUsuario]', 'Borra el usuario con su programa e historial'],
  ['a.icono[href="#usuarios/nuevo"]', 'Crear un usuario nuevo'],
  ['a.icono[href^="#usuario/"]', 'Editar nombre, avatar y color'],
  ['[data-a=pasoSig]', 'Siguiente pregunta'],
  ['[data-a=pasoAnt]', 'Pregunta anterior'],
  ['[data-a=cerrar], .cerrar-x', 'Cerrar'],
];

// [selector de la zona, título, explicación]
const ZONAS = [
  ['.tira', 'Tu semana', '✓ sesión hecha · ● pendiente · ! perdida. El día de hoy va recuadrado. Toca un día para ver su sesión.'],
  ['.ciclo-card', 'Ciclo y fases', 'El programa dura 12 semanas en tres fases: acumulación (más repeticiones), intensificación (más carga) y realización (menos repeticiones, más descanso). Cada 4.ª semana es de descarga para recuperarte. La barra marca la semana en la que estás.'],
  ['.semana-lista', 'Calendario', '▶ empezar · ⇆ mover a otro día libre · ＋ entrenar un día de descanso. Las sesiones no hechas de días pasados se marcan como perdidas. Usa ‹ › para cambiar de semana.'],
  ['.enlace-tarjeta:has(.cuerpo)', 'Recuperación muscular', 'Rojo: fatigado · amarillo: recuperándose · verde: listo. Se calcula con las series de cada músculo y las horas desde que lo entrenaste (36-72 h).'],
  ['.guiado', 'Modo guiado', 'Ajusta kilos y repeticiones con − / + (ya vienen con lo sugerido) y pulsa «Serie hecha». Empezará el descanso y verás qué viene después. «?» explica la técnica.'],
  ['.sugerencia', 'Carga sugerida', 'Se calcula con tu última sesión de este ejercicio: si completaste el rango, sube; si te quedaste corto, mantiene o baja. Tu valoración (fácil, bien o duro) también cuenta.'],
  ['.progreso-ses', 'Progreso de la sesión', 'Series hechas sobre el total. Arriba tienes el cronómetro; ❚❚ lo pausa.'],
  ['#descanso', 'Descanso', 'Cuenta atrás hasta la siguiente serie. Pitará en los últimos 3 segundos y al terminar. Puedes sumar o quitar 15 s, saltarlo o deshacer la serie.'],
  ['.frec-grid', 'Frecuencia por músculo', 'Cuántos días por semana es protagonista cada músculo. Para ganar músculo se recomienda trabajar cada uno unas 2 veces por semana.'],
  ['.tarjeta:has(.barra-m.vol)', 'Equilibrio muscular', 'Series efectivas por músculo en los últimos 7 días. La franja verde (10-20) es el rango orientativo para ganar músculo. Los músculos secundarios cuentan media serie.'],
  ['.tarjeta:has(#grafica)', 'Gráfica de progreso', 'Con carga: 1RM estimado de tu mejor serie en cada sesión. Sin carga: repeticiones. El punto amarillo es tu récord.'],
  ['.tarjeta:has(.mes)', 'Calendario de actividad', 'Verde: días entrenados (toca para ver la sesión). Borde azul: sesiones planificadas.'],
  ['.tarjeta:has(.rm-res)', 'Calculadora de 1RM', 'Estima el peso máximo que podrías levantar una vez. La tabla te da la carga para cada porcentaje, útil si un programa te pide trabajar al 80 %, por ejemplo.'],
  ['.tecnica', 'Dibujo del movimiento', 'La figura grande muestra el movimiento completo en bucle. Debajo, la posición inicial (1) y la final (2).'],
  ['.guia', 'Paso a paso', 'Sigue los pasos en orden. Las claves y los errores comunes te ayudan a revisar tu técnica.'],
  ['.usuario-card.activo', 'Usuarios', 'Cada usuario tiene su propio programa, historial, récords, vídeos y fotos. El marcado como «activo» es el que estás usando. Cambia de usuario con el botón de cada tarjeta o tocando tu avatar en Hoy.'],
  ['.ses-card:first-of-type', 'Sesiones', 'Estas sesiones se repiten cada semana. Las repeticiones y descansos cambian según la fase del ciclo.'],
];

// ---------------------------------------------------------------------
const tip = document.createElement('div');
tip.id = 'tip';
tip.className = 'tip';
tip.setAttribute('role', 'tooltip');
tip.hidden = true;
document.body.append(tip);

let temporizador = null, ocultar = null, actual = null, suprimirClick = false;

export function aplicarAyudas(raiz = document) {
  // Los title nativos pasan a ser ayudas propias (y nombre accesible en los botones de icono).
  raiz.querySelectorAll('[title]:not(svg *)').forEach(el => {
    if (!el.dataset.tip) el.dataset.tip = el.title;
    if (!el.getAttribute('aria-label') && !el.textContent.trim().match(/[a-záéíóú]{3}/i)) el.setAttribute('aria-label', el.title);
    el.removeAttribute('title');
  });
  for (const [sel, texto] of TIPS) raiz.querySelectorAll(sel).forEach(el => { if (!el.dataset.tip) el.dataset.tip = texto; });
  if (document.body.classList.contains('sin-ayudas')) return;
  for (const [sel, titulo, texto] of ZONAS) raiz.querySelectorAll(sel).forEach(zona => {
    if (zona.querySelector(':scope > .info, :scope h2 > .info')) return;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'info';
    b.textContent = 'i';
    b.setAttribute('aria-label', `Ayuda: ${titulo}`);
    b.dataset.info = `${titulo}|${texto}`;
    const h2 = zona.querySelector(':scope > h2, :scope > .fila > h2, :scope > .fila h2');
    if (h2) h2.append(b);
    else { zona.classList.add('con-info'); zona.prepend(b); }
  });
}

function mostrar(el, html, fija = false) {
  actual = el;
  tip.innerHTML = html;
  tip.classList.toggle('fija', fija);
  tip.hidden = false;
  const r = el.getBoundingClientRect();
  const t = tip.getBoundingClientRect();
  const margen = 8;
  let top = r.top - t.height - 10;
  let abajo = false;
  if (top < margen) { top = r.bottom + 10; abajo = true; }
  let left = r.left + r.width / 2 - t.width / 2;
  left = Math.max(margen, Math.min(left, innerWidth - t.width - margen));
  tip.style.top = `${Math.max(margen, Math.min(top, innerHeight - t.height - margen))}px`;
  tip.style.left = `${left}px`;
  tip.style.setProperty('--flecha', `${Math.min(t.width - 16, Math.max(16, r.left + r.width / 2 - left))}px`);
  tip.classList.toggle('abajo', abajo);
  clearTimeout(ocultar);
  if (fija) ocultar = setTimeout(esconder, 9000);
}

export function esconder() {
  clearTimeout(temporizador); clearTimeout(ocultar);
  tip.hidden = true; actual = null;
}

const escapar = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const htmlTip = el => escapar(el.dataset.tip);
const htmlInfo = el => { const [t, x] = el.dataset.info.split('|'); return `<b>${escapar(t)}</b><span>${escapar(x)}</span>`; };

// Ratón: aparece tras una breve pausa sobre el elemento.
document.addEventListener('pointerover', e => {
  if (e.pointerType !== 'mouse') return;
  const el = e.target.closest('[data-tip]');
  if (!el || el === actual) return;
  clearTimeout(temporizador);
  temporizador = setTimeout(() => mostrar(el, htmlTip(el)), 400);
});
document.addEventListener('pointerout', e => {
  if (e.pointerType !== 'mouse') return;
  const el = e.target.closest('[data-tip]');
  if (el && !el.contains(e.relatedTarget) && !tip.classList.contains('fija')) esconder();
});

// Teclado: al enfocar con Tab.
document.addEventListener('focusin', e => {
  const el = e.target.closest?.('[data-tip]');
  if (el && el.matches(':focus-visible')) mostrar(el, htmlTip(el));
});
document.addEventListener('focusout', () => { if (!tip.classList.contains('fija')) esconder(); });

// Táctil: mantener pulsado medio segundo muestra la ayuda sin activar el botón.
document.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse') return;
  const el = e.target.closest('[data-tip]');
  if (!el) return;
  clearTimeout(temporizador);
  temporizador = setTimeout(() => { suprimirClick = true; navigator.vibrate?.(15); mostrar(el, htmlTip(el), true); }, 500);
});
['pointerup', 'pointercancel', 'pointermove'].forEach(t => document.addEventListener(t, e => {
  if (e.type === 'pointermove' && Math.abs(e.movementX) + Math.abs(e.movementY) < 6) return;
  clearTimeout(temporizador);
}));
// Evita el menú contextual del móvil al mantener pulsado un elemento con ayuda.
let ultimoPuntero = 'mouse';
document.addEventListener('pointerdown', e => { ultimoPuntero = e.pointerType; }, true);
document.addEventListener('contextmenu', e => { if (ultimoPuntero !== 'mouse' && e.target.closest('[data-tip]')) e.preventDefault(); });

// Clic: los ⓘ muestran su explicación; tras una pulsación larga se anula el clic; un clic fuera cierra la ayuda.
document.addEventListener('click', e => {
  if (suprimirClick) { suprimirClick = false; e.preventDefault(); e.stopImmediatePropagation(); return; }
  const info = e.target.closest('.info');
  if (info) {
    e.preventDefault(); e.stopImmediatePropagation();
    if (actual === info && !tip.hidden) esconder(); else mostrar(info, htmlInfo(info), true);
    return;
  }
  if (!e.target.closest('#tip')) esconder();
}, true);

addEventListener('scroll', () => { if (!tip.classList.contains('fija')) esconder(); }, { passive: true });
addEventListener('resize', esconder);
document.addEventListener('keydown', e => { if (e.key === 'Escape') esconder(); });
addEventListener('hashchange', esconder);

// Las ventanas (modal, confirmación) también reciben ayudas cuando se abren.
for (const id of ['modal', 'confirmar']) {
  const d = document.getElementById(id);
  if (d) new MutationObserver(() => { aplicarAyudas(d); if (d.open && tip.parentElement !== d) d.append(tip); else if (!d.open && tip.parentElement === d) document.body.append(tip); })
    .observe(d, { childList: true, attributes: true, attributeFilter: ['open'] });
}
