import { EJERCICIOS, EQUIPOS, MUSCULOS, PATRONES, porId } from './ejercicios.js';
import {
  OBJETIVOS, METODOS, FRECUENCIAS, frecuenciaPosible, SEMANAS_CICLO, fase, prescribir, generarPrograma, generarAgenda, alternativas, unoRM,
  duracionEstimada, ajustarDuracion, sesionALaCarta, hoyIso, iso, deIso, lunes, sumarDias,
} from './generador.js';
import { volumenSesion, mejorSerie, recordAntes, recordsDeSesion, racha, volumenMuscular, recuperacion, historialCSV } from './stats.js';

// =====================================================================
// Estado
// =====================================================================
const CLAVE = 'mientrenamiento:v2';
const vacio = () => ({ perfil: null, plan: null, historial: [], enCurso: null, misSesiones: [], ajustes: { recordatorio: false, hora: '18:00', avisado: '' } });

let estado = cargar();
function cargar() {
  try {
    const v2 = JSON.parse(localStorage.getItem(CLAVE));
    if (v2) return { ...vacio(), ...v2, ajustes: { ...vacio().ajustes, ...v2.ajustes } };
    // Migración desde la primera versión: se conserva el historial y se pide de nuevo el perfil.
    const v1 = JSON.parse(localStorage.getItem('mientrenamiento:v1'));
    if (v1) return { ...vacio(), historial: v1.historial || [] };
  } catch { /* datos corruptos */ }
  return vacio();
}
function guardar() { localStorage.setItem(CLAVE, JSON.stringify(estado)); }

// =====================================================================
// Utilidades
// =====================================================================
const $ = sel => document.querySelector(sel);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const DIAS_CORTOS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const diaSemana = f => (deIso(f).getDay() + 6) % 7;
const fmtFecha = f => deIso(f).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtCorta = f => deIso(f.length > 10 ? iso(new Date(f)) : f).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtSeg = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const nombreEj = id => porId[id]?.nombre || id;
const objetivoTxt = p => p.tipo === 'tiempo' ? `${p.repsMax} s` : (p.repsMin === p.repsMax ? `${p.repsMin}` : `${p.repsMin}-${p.repsMax}`);
const musculosDe = ejs => [...new Set(ejs.map(e => porId[e.id]?.musculos[0]).filter(Boolean))];
const equipoTxt = e => e.equipo.length ? e.equipo.map(q => EQUIPOS[q]).join(', ') : 'Sin material';

// Semana del ciclo para una fecha cualquiera.
function semanaDe(fecha = hoyIso()) {
  if (!estado.plan) return 1;
  const ini = estado.plan.base || lunes(estado.plan.inicio || estado.plan.creado.slice(0, 10));
  const n = Math.floor((deIso(lunes(fecha)) - deIso(ini)) / (7 * 864e5)) + 1;
  return Math.min(SEMANAS_CICLO, Math.max(1, n));
}

const agenda = () => estado.plan?.agenda || [];
const hoy = () => hoyIso();
function estadoCita(c) {
  if (c.estado === 'hecha') return 'hecha';
  return c.fecha < hoy() ? 'perdida' : 'pendiente';
}
const citasSemana = (lun = lunes(hoy())) => agenda().filter(c => lunes(c.fecha) === lun);
const proxima = () => agenda().filter(c => c.estado !== 'hecha' && c.fecha >= hoy()).sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
const perdidasSemana = () => citasSemana().filter(c => estadoCita(c) === 'perdida');

// =====================================================================
// Coach: carga sugerida para cada serie
// =====================================================================
function ultimoRegistro(id) {
  for (let i = estado.historial.length - 1; i >= 0; i--) {
    const h = estado.historial[i];
    const e = h.ejercicios.find(x => x.id === id);
    if (e && e.series.length) return { ...e, valoracion: h.valoracion };
  }
  return null;
}

function sugerencia(item) {
  const ult = ultimoRegistro(item.id);
  if (!ult || item.tipo === 'tiempo') return null;
  const normales = ult.series.filter(s => !s.drop);
  const kgs = normales.map(s => s.kg).filter(k => k > 0);
  if (!kgs.length) {
    const todas = normales.every(s => s.reps >= item.repsMax);
    return { kg: 0, texto: todas ? 'Has superado el rango: ralentiza la bajada o pasa a una variante más difícil' : 'Intenta sumar una repetición por serie' };
  }
  const kg = Math.max(...kgs);
  const conKg = normales.filter(s => s.kg === kg);
  const superado = conKg.length >= Math.max(1, item.series - 1) && conKg.every(s => s.reps >= item.repsMax);
  const ej = porId[item.id];
  let inc = !ej?.compuesto ? 1 : ['sentadilla', 'bisagra'].includes(ej.patron) ? 5 : 2.5;
  if (item.fase?.descarga) return { kg: Math.round(kg * 0.9 * 2) / 2, texto: 'Semana de descarga: 90 % de tu última carga' };
  if (ult.valoracion === 'duro') return { kg, texto: 'La última sesión fue dura: mantén la carga' };
  if (superado) {
    if (ult.valoracion === 'facil') inc *= 2;
    return { kg: kg + inc, texto: `Completaste el rango: sube ${inc} kg` };
  }
  const flojas = normales.filter(s => s.reps < item.repsMin).length;
  if (flojas > normales.length / 2) return { kg: Math.round(kg * 0.95 * 2) / 2, texto: 'Te quedaste corto de repeticiones: baja un 5 %' };
  return { kg, texto: 'Repite la carga e intenta sumar repeticiones' };
}

// Objetivo de cada serie según el método de intensificación.
function seriesObjetivo(item) {
  const sug = sugerencia(item);
  const base = sug?.kg || 0;
  const n = item.series;
  const filas = [];
  for (let k = 0; k < n; k++) {
    let reps = item.repsMax, kg = base;
    if (item.metodo === 'piramide' && n > 1) {
      reps = Math.round(item.repsMax - (item.repsMax - item.repsMin) * k / (n - 1)) + (k === 0 ? 2 : 0);
      kg = base ? Math.round(base * (0.85 + 0.15 * k / (n - 1)) * 2) / 2 : 0;
    }
    filas.push({ objetivo: reps, kgSug: kg, kg: null, reps: null, hecho: false });
  }
  if (item.metodo === 'dropset') filas.push({ objetivo: 'fallo', kgSug: base ? Math.round(base * 0.75 * 2) / 2 : 0, kg: null, reps: null, hecho: false, drop: true });
  if (item.metodo === 'tabata') return [{ objetivo: 8, kgSug: 0, kg: null, reps: null, hecho: false, tabata: true }];
  return filas;
}

// =====================================================================
// Navegación: cada parte es una página con su propia dirección (#seguimiento/historial…)
// =====================================================================
const ui = { semanaVista: null, mesVista: null, ejSel: null, filtro: '', q: '', listaSesion: false, cartaPrev: null };

// [patrón de la dirección, página, pestaña de la barra inferior]
const RUTAS = [
  [/^(|hoy|inicio)$/, inicio, 'inicio'],
  [/^programa$/, programa, 'programa'],
  [/^programa\/sesiones$/, programaSesiones, 'programa'],
  [/^programa\/sesion\/(\d+)$/, programaSesion, 'programa'],
  [/^programa\/mias$/, programaMias, 'programa'],
  [/^programa\/mia\/(\d+)$/, programaMia, 'programa'],
  [/^programa\/carta$/, programaCarta, 'programa'],
  [/^sesion$/, sesion, 'sesion'],
  [/^seguimiento$/, seguimiento, 'seguimiento'],
  [/^seguimiento\/actividad$/, segActividad, 'seguimiento'],
  [/^seguimiento\/recuperacion$/, segRecuperacion, 'seguimiento'],
  [/^seguimiento\/equilibrio$/, segEquilibrio, 'seguimiento'],
  [/^seguimiento\/progreso$/, segProgreso, 'seguimiento'],
  [/^seguimiento\/records$/, segRecords, 'seguimiento'],
  [/^seguimiento\/historial$/, segHistorial, 'seguimiento'],
  [/^seguimiento\/calculadora$/, segCalculadora, 'seguimiento'],
  [/^historial\/(\d+)$/, historialDetalle, 'seguimiento'],
  [/^ejercicios$/, ejercicios, 'ejercicios'],
  [/^ejercicio\/([\w-]+)$/, ejercicioDetalle, 'ejercicios'],
  [/^ajustes$/, ajustes, 'ajustes'],
  [/^ajustes\/perfil$/, vistaPerfil, 'ajustes'],
  [/^ajustes\/recordatorios$/, ajRecordatorios, 'ajustes'],
  [/^ajustes\/datos$/, ajDatos, 'ajustes'],
  [/^ajustes\/acerca$/, ajAcerca, 'ajustes'],
  [/^bienvenida$/, bienvenida, 'bienvenida'],
];

const ruta = () => decodeURIComponent(location.hash.slice(1)).replace(/^\/+|\/+$/g, '');
function ir(v) { if (ruta() === v) render(); else location.hash = v; }
window.addEventListener('hashchange', render);

function render() {
  let r = ruta();
  if (!estado.plan) r = 'bienvenida';
  else if (r === 'bienvenida') r = 'hoy';
  if (r === 'sesion' && !estado.enCurso) r = 'hoy';
  let entrada = RUTAS.find(([re]) => re.test(r));
  if (!entrada) { r = 'hoy'; entrada = RUTAS[0]; }
  const [re, pagina, tab] = entrada;
  const html = pagina(...r.match(re).slice(1));
  if (html == null) { ir('hoy'); return; } // p. ej. una sesión o ejercicio que ya no existe
  document.body.dataset.vista = tab;
  const v = $('#vista');
  v.innerHTML = html;
  if (render.ultima !== r) {
    window.scrollTo(0, 0);
    v.classList.remove('entra'); void v.offsetWidth; v.classList.add('entra');
  }
  render.ultima = r;
  document.querySelectorAll('.nav a').forEach(a => a.classList.toggle('activo', a.dataset.v === tab));
  $('.nav').hidden = !estado.plan || tab === 'sesion' || tab === 'bienvenida';
  if ($('#grafica')) dibujarGrafica();
  if (tab === 'sesion') actualizarCrono();
  etiquetarIconos();
  pantallaEncendida();
}

// ---------- Piezas comunes de las páginas ----------
function pagina({ titulo, padre = null, sub = '', extra = '', cuerpo }) {
  return `<header class="barra ${padre ? 'con-atras' : ''}">
      ${padre ? `<a class="atras" href="#${padre}" aria-label="Volver">‹</a>` : ''}
      <div class="barra-tit"><h1>${titulo}</h1>${sub ? `<p class="tenue">${sub}</p>` : ''}</div>
      ${extra}
    </header>
    ${cuerpo}`;
}
const celda = (href, icono, titulo, sub = '', color = 'azul', valor = '') =>
  `<a class="celda" href="#${href}"><span class="ic ${color}">${icono}</span>
    <span class="celda-t"><b>${titulo}</b>${sub ? `<small>${sub}</small>` : ''}</span>
    ${valor !== '' ? `<span class="celda-v">${valor}</span>` : ''}<span class="chev">›</span></a>`;
const grupo = (titulo, html) => `<section class="grupo">${titulo ? `<h3>${titulo}</h3>` : ''}<div class="celdas">${html}</div></section>`;
const tile = (icono, valor, texto, color = 'azul') => `<div class="tile"><span class="ic ${color}">${icono}</span><b>${valor}</b><small>${texto}</small></div>`;
const fmtNum = n => Math.round(n).toLocaleString('es-ES');
const ICONO_PATRON = {
  sentadilla: '🦵', bisagra: '🍑', zancada: '🚶', empuje_h: '🫸', empuje_v: '⬆️', tiron_h: '🚣', tiron_v: '🧗',
  cuadriceps_aisl: '🦵', femoral: '🦵', gemelo: '🦶', pecho_aisl: '💪', hombro_lat: '🤷', hombro_post: '🎯',
  biceps: '💪', triceps: '💪', core: '🧱', metabolico: '🔥',
};
const vacioMsg = (icono, titulo, texto, boton = '') => `<div class="vacio"><div class="vacio-ic">${icono}</div><h2>${titulo}</h2><p class="tenue">${texto}</p>${boton}</div>`;

// Silueta de frente y de espalda con cada músculo coloreado.
function cuerpoSVG(colores = {}, { mini = false } = {}) {
  const c = m => colores[m] || 'var(--cuerpo)';
  const t = m => `<title>${MUSCULOS[m]}</title>`;
  const base = `<circle cx="50" cy="15" r="11"/><rect x="45" y="24" width="10" height="9" rx="3"/>
    <path d="M30 38 Q50 31 70 38 L67 104 Q50 112 33 104 Z"/><path d="M33 100 Q50 110 67 100 L67 118 Q50 124 33 118 Z"/>
    <ellipse cx="17" cy="98" rx="5" ry="15"/><ellipse cx="83" cy="98" rx="5" ry="15"/>
    <ellipse cx="41" cy="184" rx="6" ry="18"/><ellipse cx="59" cy="184" rx="6" ry="18"/>`;
  const par = (m, forma) => `<g fill="${c(m)}" class="musc">${t(m)}${forma}</g>`;
  const frente = `<g fill="var(--cuerpo-base)">${base}</g>
    ${par('hombros', '<ellipse cx="27" cy="44" rx="8" ry="8"/><ellipse cx="73" cy="44" rx="8" ry="8"/>')}
    ${par('pecho', '<path d="M34 46 Q42 41 49 45 L49 63 Q40 68 34 61 Z"/><path d="M51 45 Q58 41 66 46 L66 61 Q60 68 51 63 Z"/>')}
    ${par('biceps', '<ellipse cx="21" cy="69" rx="5.5" ry="12"/><ellipse cx="79" cy="69" rx="5.5" ry="12"/>')}
    ${par('abdomen', '<rect x="41" y="68" width="18" height="34" rx="6"/>')}
    ${par('cuadriceps', '<ellipse cx="41" cy="140" rx="8.5" ry="24"/><ellipse cx="59" cy="140" rx="8.5" ry="24"/>')}`;
  const espalda = `<g fill="var(--cuerpo-base)">${base}</g>
    ${par('hombros', '<ellipse cx="27" cy="44" rx="8" ry="8"/><ellipse cx="73" cy="44" rx="8" ry="8"/>')}
    ${par('espalda', '<path d="M34 44 Q50 38 66 44 L62 96 Q50 102 38 96 Z"/>')}
    ${par('triceps', '<ellipse cx="21" cy="69" rx="5.5" ry="12"/><ellipse cx="79" cy="69" rx="5.5" ry="12"/>')}
    ${par('gluteos', '<ellipse cx="42" cy="113" rx="9" ry="10"/><ellipse cx="58" cy="113" rx="9" ry="10"/>')}
    ${par('femorales', '<ellipse cx="41" cy="143" rx="7.5" ry="20"/><ellipse cx="59" cy="143" rx="7.5" ry="20"/>')}
    ${par('gemelos', '<ellipse cx="41" cy="183" rx="6.5" ry="15"/><ellipse cx="59" cy="183" rx="6.5" ry="15"/>')}`;
  return `<div class="cuerpo ${mini ? 'mini' : ''}">
    <figure><svg viewBox="0 0 100 205" role="img" aria-label="Músculos de frente">${frente}</svg><figcaption>Frente</figcaption></figure>
    <figure><svg viewBox="0 0 100 205" role="img" aria-label="Músculos de espalda">${espalda}</svg><figcaption>Espalda</figcaption></figure>
  </div>`;
}
const colorRec = pct => pct >= 90 ? 'var(--acento)' : pct >= 60 ? 'var(--amarillo)' : 'var(--peligro)';
const coloresRecuperacion = rec => Object.fromEntries(Object.entries(rec).map(([m, r]) => [m, r.horas == null ? 'var(--cuerpo-ok)' : colorRec(r.pct)]));
const leyendaRec = `<p class="leyenda centro"><i class="lg" style="background:var(--peligro)"></i>fatigado <i class="lg" style="background:var(--amarillo)"></i>recuperándose <i class="lg" style="background:var(--acento)"></i>listo</p>`;

// =====================================================================
// Página: Hoy
// =====================================================================
function tiraSemana(lun = lunes(hoy()), interactiva = false) {
  const citas = citasSemana(lun);
  return `<div class="tira">${DIAS_CORTOS.map((d, i) => {
    const f = sumarDias(lun, i);
    const c = citas.find(x => x.fecha === f);
    const est = c ? estadoCita(c) : 'libre';
    return `<button class="dia ${est} ${f === hoy() ? 'hoy' : ''}" ${interactiva ? `data-a="verDia" data-f="${f}"` : 'tabindex="-1"'}>
      <small>${d}</small><b>${deIso(f).getDate()}</b><i>${est === 'hecha' ? '✓' : est === 'perdida' ? '!' : est === 'pendiente' ? '●' : ''}</i></button>`;
  }).join('')}</div>`;
}

function tarjetaSesion(cita, titulo) {
  const s = estado.plan.sesiones[cita.sesion];
  const ejs = s.ejercicios.map(e => prescribir(e, cita.semana));
  const f = fase(cita.semana);
  return `
    <div class="hero">
      <p class="eyebrow">${titulo}</p>
      <h2>${esc(s.nombre)}</h2>
      <div class="badges">
        <span class="badge">Semana ${f.semana} · ${f.nombre}</span>
        ${f.descarga ? '<span class="badge aviso-b">Descarga</span>' : ''}
        <span class="badge">⏱ ~${duracionEstimada(ejs)} min</span>
        <span class="badge">${ejs.length} ejercicios</span>
      </div>
      <p class="musculos">${musculosDe(ejs).map(m => MUSCULOS[m]).join(' · ')}</p>
      <div class="botones">
        <button class="btn" data-a="empezar" data-cita="${cita.id}">▶ Empezar</button>
        <button class="btn sec" data-a="acortar" data-cita="${cita.id}">Acortar</button>
        <a class="btn sec" href="#programa/sesion/${cita.sesion}">Ver</a>
      </div>
    </div>`;
}

function saludo() {
  const h = new Date().getHours();
  return h < 6 ? 'Buenas noches' : h < 14 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
}

function inicio() {
  const cabecera = extra => pagina({ titulo: saludo(), sub: fmtFecha(hoy()), extra, cuerpo: '' });
  const rachaBtn = `<a class="racha" href="#seguimiento" title="Semanas seguidas entrenando">🔥 ${racha(estado.historial)}</a>`;
  if (estado.enCurso) {
    return `${cabecera(rachaBtn)}
      <div class="hero"><p class="eyebrow">Sesión en curso</p><h2>${esc(estado.enCurso.nombre)}</h2>
      <p>${estado.enCurso.ejercicios.reduce((t, e) => t + e.series.filter(r => r.hecho).length, 0)} series hechas</p>
      <button class="btn" data-a="ir" data-v="sesion">Continuar entrenamiento</button></div>`;
  }
  const citaHoy = agenda().find(c => c.fecha === hoy());
  const prox = proxima();
  const perdidas = perdidasSemana();
  const hechasSemana = citasSemana().filter(c => c.estado === 'hecha').length;
  const totalSemana = citasSemana().length;
  const rec = recuperacion(estado.historial);
  const ultima = estado.historial[estado.historial.length - 1];

  let principal;
  if (citaHoy && citaHoy.estado !== 'hecha') principal = tarjetaSesion(citaHoy, 'Sesión de hoy');
  else if (citaHoy) principal = `<div class="hero ok"><p class="eyebrow">Hoy</p><h2>¡Sesión completada! 🎉</h2><p>Descansa y recupérate para la siguiente.</p></div>${prox ? tarjetaSesion(prox, `Próxima · ${fmtFecha(prox.fecha)}`) : ''}`;
  else if (prox) principal = `<div class="hero descanso-h"><p class="eyebrow">Hoy</p><h2>Día de descanso 😴</h2><p>La recuperación también es entrenamiento.</p></div>${tarjetaSesion(prox, `Próxima · ${fmtFecha(prox.fecha)}`)}`;
  else principal = `<div class="hero"><p class="eyebrow">Ciclo terminado</p><h2>¡Has completado tu ciclo de ${SEMANAS_CICLO} semanas! 🏆</h2>
    <button class="btn" data-a="nuevoCiclo">Empezar un ciclo nuevo</button></div>`;

  return `
    ${cabecera(rachaBtn)}
    ${tiraSemana(lunes(hoy()), true)}
    ${perdidas.length ? `<div class="alerta">
      <b>Tienes ${perdidas.length === 1 ? 'una sesión perdida' : `${perdidas.length} sesiones perdidas`} esta semana</b>
      ${perdidas.map(c => `<div class="fila"><span>${esc(estado.plan.sesiones[c.sesion].nombre)} · ${DIAS[diaSemana(c.fecha)]}</span>
        <span><button class="enlace" data-a="hacerHoy" data-cita="${c.id}">Hacer hoy</button> · <button class="enlace" data-a="mover" data-cita="${c.id}">Mover</button></span></div>`).join('')}
    </div>` : ''}
    ${principal}
    <div class="tiles">
      ${tile('📅', `${hechasSemana}/${totalSemana}`, 'esta semana', 'azul')}
      ${tile('🏋️', estado.historial.length, 'sesiones', 'violeta')}
      ${tile('📦', ultima ? fmtNum(volumenSesion(ultima)) : 0, 'kg última sesión', 'verde')}
    </div>
    <a class="tarjeta enlace-tarjeta" href="#seguimiento/recuperacion">
      <div class="fila"><h2>Recuperación muscular</h2><span class="chev">›</span></div>
      ${cuerpoSVG(coloresRecuperacion(rec), { mini: true })}
      ${leyendaRec}
    </a>
  `;
}

function barraRecuperacion(m, r) {
  return `<div class="barra-m"><span>${MUSCULOS[m]}</span><div><i style="width:${r.pct}%;background:${colorRec(r.pct)}"></i></div><b>${r.pct}%</b></div>`;
}

// =====================================================================
// Páginas: Programa
// =====================================================================
const TEXTO_FASE = {
  Acumulación: 'Más repeticiones y volumen para construir una buena base.',
  Intensificación: 'Repeticiones medias y más carga para progresar.',
  Realización: 'Menos repeticiones y más descanso para rendir al máximo.',
};

function barraCiclo(sem) {
  return `<div class="ciclo">${Array.from({ length: SEMANAS_CICLO }, (_, i) => {
    const fi = fase(i + 1);
    return `<span class="${i + 1 === sem ? 'act' : ''} ${i + 1 < sem ? 'pasada' : ''} ${fi.descarga ? 'desc' : ''} f-${fi.nombre[0]}" title="Semana ${i + 1}: ${fi.nombre}${fi.descarga ? ' (descarga)' : ''}"></span>`;
  }).join('')}</div>
  <p class="tenue centro leyenda-fases"><b class="f-A-t">● Acumulación</b> <b class="f-I-t">● Intensificación</b> <b class="f-R-t">● Realización</b></p>`;
}

function programa() {
  const p = estado.perfil;
  const sem = semanaDe();
  const f = fase(sem);
  const visibles = estado.plan.sesiones.filter(s => !s.oculta).length;
  return pagina({
    titulo: 'Programa',
    sub: `${OBJETIVOS[p.objetivo].icono} ${OBJETIVOS[p.objetivo].nombre} · ${p.diasSemana.length} días · ${frecTxt(p)} · ${p.duracion} min`,
    cuerpo: `
      <div class="tarjeta ciclo-card">
        <div class="fila">
          <div><p class="eyebrow">Ciclo de ${SEMANAS_CICLO} semanas</p><h2>Semana ${sem} · ${f.nombre}</h2></div>
          <div class="anillo-mini" style="--p:${sem / SEMANAS_CICLO}"><b>${sem}/${SEMANAS_CICLO}</b></div>
        </div>
        ${barraCiclo(sem)}
        <p class="tenue">${f.descarga ? 'Semana de descarga: una serie menos y un 10 % menos de carga para recuperarte.' : TEXTO_FASE[f.nombre]}</p>
      </div>
      ${vistaCalendario()}
      ${grupo('Tu programa',
        celda('programa/sesiones', '📋', 'Sesiones del programa', `${visibles} sesiones que se repiten cada semana`, 'azul') +
        celda('programa/mias', '⭐', 'Mis sesiones', estado.misSesiones.length ? `${estado.misSesiones.length} guardadas` : 'Tus sesiones propias', 'violeta') +
        celda('programa/carta', '✨', 'Crear sesión a la carta', 'Elige músculos, material y tiempo', 'verde') +
        celda('ajustes/perfil', '🎯', 'Cambiar objetivo, días, frecuencia o material', 'Regenera el programa', 'naranja'))}
    `,
  });
}

function vistaCalendario() {
  const base = estado.plan.base && estado.plan.base > lunes(hoy()) ? estado.plan.base : lunes(hoy());
  const lun = ui.semanaVista || base;
  const sem = semanaDe(lun);
  const f = fase(sem);
  const citas = citasSemana(lun);
  return `
    <div class="fila nav-semana">
      <button class="icono" data-a="semana" data-d="-7" aria-label="Semana anterior">‹</button>
      <div class="centro"><b>${lun === lunes(hoy()) ? 'Esta semana' : `Semana ${sem}`}</b> <span class="tenue">· ${f.nombre}${f.descarga ? ' · descarga' : ''}</span><br>
        <span class="tenue">${fmtCorta(lun)} – ${fmtCorta(sumarDias(lun, 6))}</span></div>
      <button class="icono" data-a="semana" data-d="7" aria-label="Semana siguiente">›</button>
    </div>
    <div class="semana-lista">
    ${DIAS.map((d, i) => {
      const fecha = sumarDias(lun, i);
      const c = citas.find(x => x.fecha === fecha);
      const est = c ? estadoCita(c) : 'libre';
      return `<div class="dia-fila ${est} ${fecha === hoy() ? 'hoy' : ''}">
        <div class="dia-fecha"><small>${d.slice(0, 3)}</small><b>${deIso(fecha).getDate()}</b></div>
        <div class="dia-cont">
          ${c ? `<a class="enlace fuerte" href="#${est === 'hecha' && c.hist != null ? `historial/${c.hist}` : `programa/sesion/${c.sesion}`}">${esc(estado.plan.sesiones[c.sesion].nombre)}</a><br>
            <span class="estado-${est}">${{ hecha: '✓ Hecha', perdida: '! Perdida', pendiente: fecha === hoy() ? 'Hoy' : 'Pendiente' }[est]}</span>`
            : `<span class="tenue">Descanso</span>`}
        </div>
        <div class="acciones">
          ${c && est !== 'hecha' ? `
            <button class="icono" title="Empezar" data-a="empezar" data-cita="${c.id}">▶</button>
            <button class="icono" title="Mover a otro día" data-a="mover" data-cita="${c.id}">⇆</button>` : ''}
          ${!c && fecha >= hoy() ? `<button class="icono" title="Entrenar este día" data-a="anadirDia" data-f="${fecha}">＋</button>` : ''}
        </div>
      </div>`;
    }).join('')}
    </div>`;
}

function listaEjercicios(ejs, { editable = false, i = null } = {}) {
  return `<ul class="lista">${ejs.map((e, j) => `
    <li>
      <span class="ic-ej">${ICONO_PATRON[porId[e.id]?.patron] || '🏋️'}</span>
      <div class="li-t">
        <a class="enlace fuerte" href="#ejercicio/${e.id}">${esc(nombreEj(e.id))}</a>
        ${e.foco ? '<span class="chip-mini">foco</span>' : ''}
        ${e.metodo && e.metodo !== 'normal' ? `<span class="chip-mini alt">${METODOS[e.metodo].nombre}</span>` : ''}
        <br><span class="tenue">${e.metodo === 'tabata' ? '8 × 20 s / 10 s' : `${e.series} × ${objetivoTxt(e)} · descanso ${e.descanso} s`}</span>
      </div>
      ${editable ? `<div class="acciones">
        <button class="icono" title="Método de intensificación" data-a="metodo" data-i="${i}" data-j="${j}">⚡</button>
        <button class="icono" title="Cambiar ejercicio" data-a="cambiar" data-i="${i}" data-j="${j}">⇄</button>
      </div>` : ''}
    </li>`).join('')}</ul>`;
}

function tarjetaResumenSesion(s, href, extra = '') {
  return `<a class="tarjeta enlace-tarjeta ses-card" href="#${href}">
    <div class="fila"><h2>${esc(s.nombre)}</h2><span class="chev">›</span></div>
    <div class="badges"><span class="badge">⏱ ~${duracionEstimada(s.ejercicios)} min</span><span class="badge">${s.ejercicios.length} ejercicios</span>${extra}</div>
    <p class="musculos">${musculosDe(s.ejercicios).map(m => MUSCULOS[m]).join(' · ')}</p>
  </a>`;
}

function programaSesiones() {
  const sem = semanaDe();
  return pagina({
    titulo: 'Sesiones', padre: 'programa', sub: `Valores de la semana ${sem} (${fase(sem).nombre.toLowerCase()})`,
    cuerpo: estado.plan.sesiones.map((s, i) => s.oculta ? '' :
      tarjetaResumenSesion({ ...s, ejercicios: s.ejercicios.map(e => prescribir(e, sem)) }, `programa/sesion/${i}`)).join('') + `
      <h2 class="sec-tit">🔁 Frecuencia por músculo</h2>
      <div class="tarjeta">
        <p class="tenue">Días por semana que cada músculo es protagonista (${frecTxt(estado.perfil)}).</p>
        <div class="frec-grid">${Object.entries(frecuenciaReal()).map(([m, n]) => `<div><span>${MUSCULOS[m]}</span><b>${'●'.repeat(n)}<i>${'●'.repeat(Math.max(0, 3 - n))}</i></b><small>${n}×</small></div>`).join('')}</div>
      </div>`,
  });
}

function programaSesion(i) {
  const s = estado.plan.sesiones[i];
  if (!s) return null;
  const sem = semanaDe();
  const ejs = s.ejercicios.map(e => prescribir(e, sem));
  const musc = musculosDe(ejs);
  return pagina({
    titulo: esc(s.nombre), padre: s.oculta ? 'programa' : 'programa/sesiones',
    cuerpo: `
      <div class="hero compacto">
        <div class="badges"><span class="badge">Semana ${sem} · ${fase(sem).nombre}</span><span class="badge">⏱ ~${duracionEstimada(ejs)} min</span><span class="badge">${ejs.length} ejercicios</span></div>
        <div class="hero-cuerpo">${cuerpoSVG(Object.fromEntries(musc.map(m => [m, '#fff'])), { mini: true })}</div>
        <div class="botones">
          <button class="btn" data-a="adelantar" data-i="${i}" ${estado.enCurso ? 'disabled' : ''}>▶ Hacer ahora</button>
          <button class="btn sec" data-a="pdfPlan" data-i="${i}">📄 PDF</button>
        </div>
      </div>
      <div class="fila"><h2>Ejercicios</h2><span class="tenue">⚡ método · ⇄ cambiar</span></div>
      <div class="tarjeta">${listaEjercicios(ejs, { editable: true, i })}</div>
    `,
  });
}

function programaMias() {
  const m = estado.misSesiones;
  return pagina({
    titulo: 'Mis sesiones', padre: 'programa',
    extra: '<a class="icono" href="#programa/carta" title="Crear sesión">＋</a>',
    cuerpo: m.length ? m.map((s, i) => tarjetaResumenSesion(s, `programa/mia/${i}`)).join('')
      : vacioMsg('⭐', 'Aún no tienes sesiones propias', 'Crea una sesión a la carta y guárdala para repetirla cuando quieras.', '<a class="btn" href="#programa/carta">Crear sesión a la carta</a>'),
  });
}

function programaMia(i) {
  const s = estado.misSesiones[i];
  if (!s) return null;
  return pagina({
    titulo: esc(s.nombre), padre: 'programa/mias',
    cuerpo: `
      <div class="hero compacto violeta">
        <div class="badges"><span class="badge">Sesión propia</span><span class="badge">⏱ ~${duracionEstimada(s.ejercicios)} min</span><span class="badge">${s.ejercicios.length} ejercicios</span></div>
        <div class="hero-cuerpo">${cuerpoSVG(Object.fromEntries(musculosDe(s.ejercicios).map(m => [m, '#fff'])), { mini: true })}</div>
        <div class="botones">
          <button class="btn" data-a="empezarMia" data-i="${i}" ${estado.enCurso ? 'disabled' : ''}>▶ Empezar</button>
          <button class="btn sec" data-a="pdfMia" data-i="${i}">📄 PDF</button>
        </div>
      </div>
      <div class="tarjeta">${listaEjercicios(s.ejercicios)}</div>
      <button class="btn peligro" data-a="borrarMia" data-i="${i}">Borrar esta sesión</button>
    `,
  });
}

function programaCarta() {
  const p = estado.perfil;
  const prev = ui.cartaPrev;
  return pagina({
    titulo: 'Sesión a la carta', padre: 'programa', sub: 'Te preparo una sesión al momento',
    cuerpo: `
      <form id="formCarta" class="tarjeta">
        <label class="campo">Nombre<input type="search" name="nombre" value="${esc(prev?.nombre || 'Mi sesión')}" maxlength="40"></label>
        <fieldset><legend>¿Qué quieres trabajar?</legend><div class="chips">${Object.entries(MUSCULOS).map(([k, v]) => `<label class="chip"><input type="checkbox" name="musculos" value="${k}" ${prev?.musculos?.includes(k) ? 'checked' : ''}>${v}</label>`).join('')}</div></fieldset>
        <fieldset><legend>¿Dónde?</legend><div class="chips">
          <label class="chip"><input type="radio" name="lugar" value="gimnasio" ${p.lugar === 'gimnasio' ? 'checked' : ''}>🏢 Gimnasio</label>
          <label class="chip"><input type="radio" name="lugar" value="casa" ${p.lugar === 'casa' ? 'checked' : ''}>🏠 Casa (mi material)</label>
          <label class="chip"><input type="radio" name="lugar" value="corporal">🤸 Sin material</label>
        </div></fieldset>
        <fieldset><legend>¿Cuánto tiempo tienes?</legend><div class="chips">${[20, 30, 45, 60, 75].map(d => `<label class="chip"><input type="radio" name="duracion" value="${d}" ${d === 45 ? 'checked' : ''}>${d} min</label>`).join('')}</div></fieldset>
        <button class="btn" type="submit">✨ Generar sesión</button>
      </form>
      ${prev ? `<section id="cartaPrev">
        <div class="fila"><h2>${esc(prev.nombre)}</h2><span class="badge">⏱ ~${duracionEstimada(prev.ejercicios)} min</span></div>
        <div class="tarjeta">${listaEjercicios(prev.ejercicios)}</div>
        <div class="botones"><button class="btn" data-a="empezarCarta">▶ Empezar ahora</button><button class="btn sec" data-a="guardarCarta">⭐ Guardar</button></div>
      </section>` : ''}
    `,
  });
}

// =====================================================================
// Vista: Sesión en curso (modo guiado)
// =====================================================================
function tiempoSesion() {
  const s = estado.enCurso;
  return (s.acumulado + (s.pausado ? 0 : Date.now() - s.reanudado)) / 1000;
}

function actual() {
  const s = estado.enCurso;
  for (let i = 0; i < s.ejercicios.length; i++) {
    const k = s.ejercicios[i].series.findIndex(r => !r.hecho);
    if (k !== -1) return { i, k };
  }
  return null;
}

function sesion() {
  const s = estado.enCurso;
  const total = s.ejercicios.reduce((t, e) => t + e.series.length, 0);
  const hechas = s.ejercicios.reduce((t, e) => t + e.series.filter(r => r.hecho).length, 0);
  const pos = actual();
  return `
    <header class="cab-sesion">
      <button class="icono" data-a="salirSesion" title="Salir (la sesión queda guardada)">‹ Salir</button>
      <div class="centro"><b>${esc(s.nombre)}</b><br><span id="crono" class="crono"></span></div>
      <button class="icono" data-a="pausa" title="${s.pausado ? 'Reanudar' : 'Pausar'}">${s.pausado ? '▶' : '❚❚'}</button>
    </header>
    <div class="progreso-ses"><i style="width:${total ? hechas / total * 100 : 0}%"></i></div>
    <p class="tenue centro">${hechas} de ${total} series${s.fase ? ` · Semana ${s.fase.semana} · ${s.fase.nombre}${s.fase.descarga ? ' (descarga)' : ''}` : ''}</p>
    ${s.pausado ? '<div class="alerta centro"><b>Sesión en pausa</b><br><button class="btn" data-a="pausa">Reanudar</button></div>' : ''}
    ${pos && !s.pausado ? guiado(pos) : ''}
    ${!pos ? `<div class="hero ok"><h2>¡Todas las series hechas! 💪</h2><button class="btn" data-a="terminar">Terminar sesión</button></div>` : ''}
    <div class="fila"><h2>Ejercicios</h2><button class="enlace" data-a="verLista">${ui.listaSesion ? 'Ocultar series' : 'Ver y editar series'}</button></div>
    ${s.ejercicios.map((e, i) => `
      <div class="tarjeta ${pos?.i === i ? 'activo' : ''} ${e.series.every(r => r.hecho) ? 'completo' : ''}">
        <div class="fila">
          <div><button class="enlace fuerte" data-a="detalle" data-id="${e.id}">${esc(nombreEj(e.id))}</button>
            ${e.metodo !== 'normal' ? `<span class="chip-mini alt">${METODOS[e.metodo].nombre}</span>` : ''}<br>
            <span class="tenue">${e.series.filter(r => r.hecho).length}/${e.series.length} series · ${e.metodo === 'tabata' ? 'Tabata' : objetivoTxt(e)}</span></div>
          <div class="acciones">
            ${pos && pos.i !== i && e.series.some(r => !r.hecho) ? `<button class="icono" title="Hacer este ejercicio ahora" data-a="irEj" data-i="${i}">▶</button>` : ''}
            ${e.series.some(r => r.hecho) ? '' : `<button class="icono" title="Cambiar ejercicio" data-a="cambiarSes" data-i="${i}">⇄</button>`}
          </div>
        </div>
        ${ui.listaSesion ? tablaSeries(e, i) : ''}
      </div>`).join('')}
    <button class="btn" data-a="terminar">Terminar sesión</button>
    <button class="btn sec" data-a="pdfCurso">📄 Resumen PDF</button>
    <button class="btn peligro" data-a="descartar">Descartar sesión</button>
  `;
}

function tablaSeries(e, i) {
  const tiempo = e.tipo === 'tiempo';
  return `<table class="series">
    <thead><tr><th>Serie</th>${tiempo ? '' : '<th>kg</th>'}<th>${tiempo ? 's' : 'Reps'}</th><th></th></tr></thead>
    <tbody>${e.series.map((r, k) => `
      <tr class="${r.hecho ? 'hecho' : ''}">
        <td>${r.drop ? 'Drop' : r.tabata ? 'Tabata' : k + 1}</td>
        ${tiempo ? '' : `<td><input type="number" inputmode="decimal" step="0.5" min="0" value="${r.kg ?? ''}" placeholder="${r.kgSug || 0}" data-a="dato" data-i="${i}" data-k="${k}" data-c="kg"></td>`}
        <td><input type="number" inputmode="numeric" min="0" value="${r.reps ?? ''}" placeholder="${r.objetivo}" data-a="dato" data-i="${i}" data-k="${k}" data-c="reps"></td>
        <td><button class="check" data-a="hecho" data-i="${i}" data-k="${k}" aria-label="Serie hecha">${r.hecho ? '✓' : ''}</button></td>
      </tr>`).join('')}</tbody>
  </table>
  <div class="fila"><button class="enlace" data-a="serie" data-i="${i}" data-d="1">+ Serie</button>
  ${e.series.length > 1 ? `<button class="enlace" data-a="serie" data-i="${i}" data-d="-1">− Serie</button>` : ''}</div>`;
}

function guiado({ i, k }) {
  const e = estado.enCurso.ejercicios[i];
  const r = e.series[k];
  const ej = porId[e.id];
  const tiempo = e.tipo === 'tiempo';
  const sug = sugerencia(e);
  const nSeries = e.series.filter(x => !x.drop).length;
  if (r.tabata) {
    return `<div class="guiado">
      <p class="eyebrow">Tabata · ${esc(ej.nombre)}</p>
      <h2>8 rondas · 20 s trabajo / 10 s descanso</h2>
      <p class="tenue">${esc(ej.desc)}</p>
      <button class="btn grande" data-a="tabata" data-i="${i}" data-k="${k}">▶ Empezar Tabata</button>
    </div>`;
  }
  // Los campos vienen ya rellenos con lo sugerido: si lo haces tal cual, basta con pulsar «Serie hecha».
  const kgVal = r.kg ?? (r.kgSug || '');
  const repsVal = r.reps ?? (typeof r.objetivo === 'number' ? r.objetivo : '');
  const paso = !ej.compuesto ? 1 : 2.5;
  const ult = ultimoRegistro(e.id)?.series.filter(x => !!x.drop === !!r.drop)[r.drop ? 0 : k];
  const sig = siguienteTexto(i, k);
  return `<div class="guiado">
    <div class="fila">
      <p class="eyebrow">${r.drop ? 'Drop set · sin descanso' : `Serie ${k + 1} de ${nSeries}`}${e.foco ? ' · prioritario' : ''}</p>
      <button class="icono peq" data-a="detalle" data-id="${e.id}" title="Cómo se hace">?</button>
    </div>
    <h2>${esc(ej.nombre)}</h2>
    <p class="tenue">Objetivo: <b>${tiempo ? `${r.objetivo} s` : r.objetivo === 'fallo' ? 'al fallo' : `${r.objetivo} reps`}</b>${!tiempo && !ej.equipo.length ? ' · peso corporal' : ''}${ult ? ` · la última vez: <b>${ult.kg ? `${ult.kg} kg × ${ult.reps}` : `${ult.reps}`}</b>` : ''}</p>
    ${sug && k === 0 ? `<p class="sugerencia">🤖 ${esc(sug.texto)}</p>` : ''}
    <div class="entradas">
      ${tiempo || !ej.equipo.length ? '' : stepper('kg', kgVal, paso, i, k, 'decimal')}
      ${stepper(tiempo ? 'segundos' : 'repeticiones', repsVal, tiempo ? 5 : 1, i, k, 'numeric', 'reps')}
    </div>
    ${tiempo ? `<button class="btn sec" data-a="cronoSerie" data-s="${r.objetivo}">⏱ Cronometrar ${r.objetivo} s</button>` : ''}
    <button class="btn grande" data-a="hecho" data-i="${i}" data-k="${k}">✓ Serie hecha</button>
    ${sig ? `<p class="tenue centro siguiente">Después: ${esc(sig)}</p>` : ''}
    ${estado.enCurso.ejercicios.length - i > 1 ? `<button class="enlace centro bloque" data-a="saltarEj" data-i="${i}">Hacer este ejercicio más tarde</button>` : ''}
  </div>`;
}

function stepper(etiqueta, valor, paso, i, k, modo, campo = 'kg') {
  return `<div class="stepper">
    <small>${etiqueta}</small>
    <div>
      <button type="button" data-a="paso" data-i="${i}" data-k="${k}" data-c="${campo}" data-d="${-paso}" aria-label="Restar ${paso} ${etiqueta}">−</button>
      <input type="number" inputmode="${modo}" step="${campo === 'kg' ? 0.5 : 1}" min="0" value="${valor}" placeholder="0" data-a="dato" data-i="${i}" data-k="${k}" data-c="${campo}" aria-label="${etiqueta}" enterkeyhint="done">
      <button type="button" data-a="paso" data-i="${i}" data-k="${k}" data-c="${campo}" data-d="${paso}" aria-label="Sumar ${paso} ${etiqueta}">+</button>
    </div>
  </div>`;
}

// Texto de lo que viene después de la serie (i, k).
function siguienteTexto(i, k) {
  const ejs = estado.enCurso.ejercicios;
  const e = ejs[i];
  const resto = e.series.slice(k + 1).findIndex(r => !r.hecho);
  if (resto !== -1) {
    const r = e.series[k + 1 + resto];
    return r.drop ? 'drop set' : `serie ${k + 2 + resto} de ${nombreEj(e.id)}`;
  }
  for (let j = i + 1; j < ejs.length; j++) if (ejs[j].series.some(r => !r.hecho)) return nombreEj(ejs[j].id);
  for (let j = 0; j < i; j++) if (ejs[j].series.some(r => !r.hecho)) return nombreEj(ejs[j].id);
  return null;
}

// =====================================================================
// Páginas: Seguimiento
// =====================================================================
const ejerciciosEntrenados = () => [...new Set(estado.historial.flatMap(h => h.ejercicios.map(e => e.id)))];
const totalRecords = () => estado.historial.reduce((t, _, i) => t + recordsDeSesion(estado.historial, i).length, 0);
const VALORACION = { facil: '😌 Fácil', bien: '🙂 Bien', duro: '🥵 Duro' };

function seguimiento() {
  const hist = estado.historial;
  const volSemana = hist.filter(h => lunes(iso(new Date(h.fecha))) === lunes(hoy())).reduce((t, h) => t + volumenSesion(h), 0);
  const recs = totalRecords();
  const ids = ejerciciosEntrenados();
  return pagina({
    titulo: 'Seguimiento', sub: hist.length ? `Última sesión: ${fmtCorta(hist[hist.length - 1].fecha)}` : 'Tu evolución aparecerá aquí',
    cuerpo: `
      <div class="tiles cuatro">
        ${tile('🔥', racha(hist), 'semanas seguidas', 'naranja')}
        ${tile('🏋️', hist.length, 'sesiones', 'azul')}
        ${tile('🏆', recs, 'récords', 'amarillo')}
        ${tile('📦', fmtNum(volSemana), 'kg esta semana', 'verde')}
      </div>
      <a class="tarjeta enlace-tarjeta" href="#seguimiento/recuperacion">
        <div class="fila"><h2>Recuperación muscular</h2><span class="chev">›</span></div>
        ${cuerpoSVG(coloresRecuperacion(recuperacion(hist)), { mini: true })}
        ${leyendaRec}
      </a>
      ${grupo('Análisis',
        celda('seguimiento/actividad', '📅', 'Actividad', 'Calendario de tus entrenamientos', 'azul') +
        celda('seguimiento/equilibrio', '⚖️', 'Equilibrio muscular', 'Series por músculo en 7 días', 'violeta') +
        celda('seguimiento/progreso', '📈', 'Progreso por ejercicio', 'Evolución del 1RM y mejores series', 'verde', ids.length || '') +
        celda('seguimiento/records', '🏆', 'Récords personales', 'Tus mejores marcas', 'amarillo', recs || ''))}
      ${grupo('Registro',
        celda('seguimiento/historial', '🗂️', 'Historial de sesiones', 'Todas tus sesiones con detalle', 'azul', hist.length || '') +
        celda('seguimiento/calculadora', '🧮', 'Calculadora de 1RM', 'Estima tu máximo y tus porcentajes', 'naranja'))}
    `,
  });
}

function segActividad() {
  const base = ui.mesVista ? deIso(ui.mesVista) : new Date();
  const delMes = estado.historial.map((h, i) => ({ h, i })).filter(({ h }) => { const d = new Date(h.fecha); return d.getMonth() === base.getMonth() && d.getFullYear() === base.getFullYear(); });
  return pagina({
    titulo: 'Actividad', padre: 'seguimiento',
    cuerpo: `
      <div class="tarjeta">
        <div class="fila nav-semana">
          <button class="icono" data-a="mes" data-d="-1" aria-label="Mes anterior">‹</button>
          <b class="mes-tit">${base.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</b>
          <button class="icono" data-a="mes" data-d="1" aria-label="Mes siguiente">›</button>
        </div>
        ${calendarioMes()}
      </div>
      <div class="tiles">
        ${tile('🏋️', delMes.length, 'sesiones este mes', 'azul')}
        ${tile('⏱', fmtNum(delMes.reduce((t, { h }) => t + h.duracion, 0) / 60), 'minutos', 'violeta')}
        ${tile('📦', fmtNum(delMes.reduce((t, { h }) => t + volumenSesion(h), 0)), 'kg movidos', 'verde')}
      </div>
      ${delMes.length ? `<div class="celdas">${delMes.reverse().map(({ h, i }) => celda(`historial/${i}`, '🏋️', esc(h.nombre), `${fmtCorta(h.fecha)} · ${Math.round(h.duracion / 60)} min`, 'azul', `${fmtNum(volumenSesion(h))} kg`)).join('')}</div>`
        : '<p class="tenue centro">No hay sesiones este mes.</p>'}
    `,
  });
}

function segRecuperacion() {
  const rec = recuperacion(estado.historial);
  return pagina({
    titulo: 'Recuperación', padre: 'seguimiento', sub: 'Estimada según las series y las horas desde que entrenaste cada músculo',
    cuerpo: `
      <div class="tarjeta">${cuerpoSVG(coloresRecuperacion(rec))}${leyendaRec}</div>
      <div class="tarjeta">${Object.entries(rec).sort((a, b) => a[1].pct - b[1].pct).map(([m, r]) => barraRecuperacion(m, r)).join('')}</div>
      <p class="tenue">Un músculo se considera listo a partir del 90 %. Más series exigen más descanso: entre 36 y 72 horas.</p>
    `,
  });
}

function segEquilibrio() {
  const vol = volumenMuscular(estado.historial);
  const color = v => !v ? 'var(--cuerpo)' : v < 10 ? 'var(--acento2)' : v <= 20 ? 'var(--acento)' : 'var(--amarillo)';
  return pagina({
    titulo: 'Equilibrio muscular', padre: 'seguimiento', sub: 'Series efectivas por músculo en los últimos 7 días',
    cuerpo: `
      <div class="tarjeta">${cuerpoSVG(Object.fromEntries(Object.entries(vol).map(([m, v]) => [m, color(v)])))}
        <p class="leyenda centro"><i class="lg" style="background:var(--acento2)"></i>menos de 10 <i class="lg" style="background:var(--acento)"></i>10-20 <i class="lg" style="background:var(--amarillo)"></i>más de 20</p></div>
      <div class="tarjeta">
        ${Object.entries(vol).sort((a, b) => b[1] - a[1]).map(([m, v]) => `<div class="barra-m vol"><span>${MUSCULOS[m]}</span>
          <div><em></em><i style="width:${Math.min(100, v / 25 * 100)}%"></i></div><b>${Math.round(v * 10) / 10}</b></div>`).join('')}
      </div>
      <p class="tenue">La franja verde marca el rango orientativo para ganar músculo (10-20 series por semana). Los músculos secundarios de un ejercicio cuentan media serie.</p>
    `,
  });
}

function datosEjercicio(id) {
  const puntos = estado.historial.map(h => {
    const e = h.ejercicios.find(x => x.id === id);
    const m = e && mejorSerie(e.series);
    return m ? { fecha: h.fecha, v: m.val, m } : null;
  }).filter(Boolean);
  return puntos;
}

function segProgreso() {
  const ids = ejerciciosEntrenados();
  return pagina({
    titulo: 'Progreso', padre: 'seguimiento', sub: 'Toca un ejercicio para ver su gráfica',
    cuerpo: ids.length ? `<div class="celdas">${ids.map(id => {
      const p = datosEjercicio(id);
      const ult = p[p.length - 1], pri = p[0];
      const dif = ult && pri ? Math.round((ult.v - pri.v) * 10) / 10 : 0;
      return celda(`ejercicio/${id}`, ICONO_PATRON[porId[id]?.patron] || '🏋️', esc(nombreEj(id)),
        `${p.length} ${p.length === 1 ? 'sesión' : 'sesiones'}${ult?.m.kg ? ` · 1RM est. ${ult.v} kg` : ult ? ` · ${ult.v} reps` : ''}`,
        'verde', dif > 0 ? `<span class="sube">▲ ${dif}</span>` : dif < 0 ? `<span class="baja">▼ ${-dif}</span>` : '');
    }).join('')}</div>`
      : vacioMsg('📈', 'Sin datos todavía', 'Completa tu primera sesión para empezar a ver tu progreso.', '<a class="btn" href="#hoy">Ir a Hoy</a>'),
  });
}

function segRecords() {
  const lista = ejerciciosEntrenados().map(id => {
    const p = datosEjercicio(id);
    if (!p.length) return null;
    const mejor = p.reduce((a, b) => b.v > a.v ? b : a);
    return { id, ...mejor };
  }).filter(Boolean).sort((a, b) => b.v - a.v);
  return pagina({
    titulo: 'Récords', padre: 'seguimiento', sub: 'Tu mejor marca en cada ejercicio',
    cuerpo: lista.length ? `<div class="celdas">${lista.map(r => celda(`ejercicio/${r.id}`, '🏆', esc(nombreEj(r.id)),
      `${r.m.kg ? `${r.m.kg} kg × ${r.m.reps}` : `${r.m.reps} reps`} · ${fmtCorta(r.fecha)}`, 'amarillo', r.m.kg ? `${r.v} kg` : `${r.v}`)).join('')}</div>
      <p class="tenue">Con carga, el récord es el 1RM estimado de tu mejor serie. Sin carga, las repeticiones.</p>`
      : vacioMsg('🏆', 'Aún no hay récords', 'Tus mejores marcas aparecerán aquí según entrenes.'),
  });
}

function segHistorial() {
  const hist = estado.historial;
  if (!hist.length) return pagina({ titulo: 'Historial', padre: 'seguimiento', cuerpo: vacioMsg('🗂️', 'Sin sesiones todavía', 'Cuando termines una sesión aparecerá aquí.') });
  const porMes = {};
  hist.forEach((h, i) => { const k = h.fecha.slice(0, 7); (porMes[k] = porMes[k] || []).push(i); });
  return pagina({
    titulo: 'Historial', padre: 'seguimiento', sub: `${hist.length} sesiones`,
    cuerpo: Object.keys(porMes).sort().reverse().map(k => grupo(
      new Date(k + '-01T12:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
      porMes[k].reverse().map(i => {
        const h = hist[i];
        const prs = recordsDeSesion(hist, i).length;
        return celda(`historial/${i}`, prs ? '🏆' : '🏋️', esc(h.nombre), `${fmtCorta(h.fecha)} · ${Math.round(h.duracion / 60)} min${h.valoracion ? ` · ${VALORACION[h.valoracion]}` : ''}`, prs ? 'amarillo' : 'azul', `${fmtNum(volumenSesion(h))} kg`);
      }).join(''))).join(''),
  });
}

function segCalculadora() {
  return pagina({
    titulo: 'Calculadora de 1RM', padre: 'seguimiento', sub: 'Tu máximo estimado a una repetición',
    cuerpo: `
      <div class="tarjeta">
        <div class="entradas">
          <div class="stepper"><small>kg levantados</small><div><input type="number" id="rmKg" inputmode="decimal" data-a="calc" placeholder="0"></div></div>
          <div class="stepper"><small>repeticiones</small><div><input type="number" id="rmReps" inputmode="numeric" data-a="calc" placeholder="0"></div></div>
        </div>
        <div class="rm-res"><small>1RM estimado</small><b id="rmRes">–</b></div>
        <table class="tabla-pct" id="rmTabla"></table>
      </div>
      <p class="tenue">Fórmula de Epley. Con más de 10 repeticiones la estimación pierde precisión. Usa la tabla para elegir la carga según el porcentaje que pida tu programa.</p>
    `,
  });
}

function historialDetalle(i) {
  const h = estado.historial[i];
  if (!h) return null;
  const prs = recordsDeSesion(estado.historial, i);
  const series = h.ejercicios.reduce((t, e) => t + e.series.length, 0);
  return pagina({
    titulo: esc(h.nombre), padre: 'seguimiento/historial', sub: fmtFecha(iso(new Date(h.fecha))),
    cuerpo: `
      <div class="tiles cuatro">
        ${tile('⏱', Math.round(h.duracion / 60), 'minutos', 'violeta')}
        ${tile('🔁', series, 'series', 'azul')}
        ${tile('📦', fmtNum(volumenSesion(h)), 'kg movidos', 'verde')}
        ${tile(h.valoracion ? VALORACION[h.valoracion].split(' ')[0] : '—', h.valoracion ? VALORACION[h.valoracion].split(' ')[1] : '—', 'sensación', 'naranja')}
      </div>
      ${prs.length ? `<div class="tarjeta records"><h2>🏆 Nuevos récords</h2>${prs.map(p => `<p><b>${esc(nombreEj(p.id))}</b>: ${p.antes} → ${p.ahora}${p.kg ? ' kg' : ' reps'}</p>`).join('')}</div>` : ''}
      ${h.ejercicios.map(e => {
        const m = mejorSerie(e.series);
        return `<div class="tarjeta">
          <div class="fila"><a class="enlace fuerte" href="#ejercicio/${e.id}">${esc(nombreEj(e.id))}</a>${prs.some(p => p.id === e.id) ? '<span class="chip-mini oro">récord</span>' : ''}</div>
          <div class="series-chips">${e.series.map((s, k) => `<span class="${s.drop ? 'drop' : ''}"><small>${s.drop ? 'drop' : k + 1}</small>${s.kg ? `${s.kg} kg × ${s.reps}` : `${s.reps}`}</span>`).join('')}</div>
          ${m?.rm ? `<p class="tenue">1RM estimado: <b>${m.rm} kg</b></p>` : ''}
        </div>`;
      }).join('')}
      <div class="botones"><button class="btn sec" data-a="pdfHist" data-i="${i}">📄 Resumen PDF</button>
      <button class="btn peligro" data-a="borrarHist" data-i="${i}">Borrar</button></div>
    `,
  });
}

function calendarioMes() {
  const base = ui.mesVista ? deIso(ui.mesVista) : new Date();
  const y = base.getFullYear(), m = base.getMonth();
  const primero = new Date(y, m, 1);
  const dias = new Date(y, m + 1, 0).getDate();
  const offset = (primero.getDay() + 6) % 7;
  const porDia = {};
  estado.historial.forEach((h, i) => { const f = iso(new Date(h.fecha)); (porDia[f] = porDia[f] || []).push(i); });
  const celdas = [];
  for (let i = 0; i < offset; i++) celdas.push('<span class="hueco"></span>');
  for (let d = 1; d <= dias; d++) {
    const f = iso(new Date(y, m, d));
    const hs = porDia[f];
    const plan = agenda().find(c => c.fecha === f && c.estado !== 'hecha');
    celdas.push(hs ? `<a class="si ${f === hoy() ? 'hoy' : ''}" href="#historial/${hs[hs.length - 1]}" title="${esc(estado.historial[hs[hs.length - 1]].nombre)}">${d}</a>`
      : `<span class="${plan && f >= hoy() ? 'plan' : ''} ${f === hoy() ? 'hoy' : ''}">${d}</span>`);
  }
  return `<div class="mes">${DIAS_CORTOS.map(d => `<small>${d}</small>`).join('')}${celdas.join('')}</div>
    <p class="tenue leyenda"><i class="lg si"></i> entrenado <i class="lg plan"></i> planificado</p>`;
}

function dibujarGrafica() {
  const cont = $('#grafica');
  if (!cont) return;
  const id = ui.ejSel;
  const tiempo = porId[id]?.tipo === 'tiempo';
  const puntos = estado.historial.map(h => {
    const e = h.ejercicios.find(x => x.id === id);
    if (!e) return null;
    const m = mejorSerie(e.series);
    return m ? { fecha: h.fecha, v: m.val, m } : null;
  }).filter(Boolean);
  if (!puntos.length) { cont.innerHTML = '<p class="tenue">Sin datos.</p>'; return; }
  const conKg = puntos.some(p => p.m.kg);
  const unidad = conKg ? 'kg (1RM est.)' : tiempo ? 's' : 'reps';
  const W = 320, H = 150, P = 30;
  const vals = puntos.map(p => p.v);
  const min = Math.min(...vals) * 0.95, max = Math.max(...vals) * 1.05;
  const x = i => P + (puntos.length === 1 ? (W - 2 * P) / 2 : i * (W - 2 * P) / (puntos.length - 1));
  const y = v => H - P - (v - min) / (max - min || 1) * (H - 2 * P);
  const linea = puntos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const area = `${linea} L${x(puntos.length - 1).toFixed(1)},${H - P} L${x(0).toFixed(1)},${H - P} Z`;
  const record = Math.max(...vals);
  const mejor = puntos.find(p => p.v === record).m;
  const ult = puntos[puntos.length - 1];
  cont.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" class="svg-graf" role="img" aria-label="Evolución de ${esc(nombreEj(id))}">
      <defs><linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--acento)" stop-opacity=".35"/><stop offset="1" stop-color="var(--acento)" stop-opacity="0"/></linearGradient></defs>
      <line x1="${P}" y1="${H - P}" x2="${W - P}" y2="${H - P}" class="eje"/>
      <text x="${P - 4}" y="${y(Math.max(...vals)) + 4}" text-anchor="end" class="etq">${Math.round(Math.max(...vals))}</text>
      <text x="${P - 4}" y="${y(Math.min(...vals)) + 4}" text-anchor="end" class="etq">${Math.round(Math.min(...vals))}</text>
      <path d="${area}" fill="url(#gr)"/>
      <path d="${linea}" class="trazo"/>
      ${puntos.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.v)}" r="${p.v === record ? 5 : 3.5}" class="punto ${p.v === record ? 'rec' : ''}"><title>${fmtCorta(p.fecha)}: ${p.v} ${unidad}</title></circle>`).join('')}
    </svg>
    <div class="stats mini">
      <div><b>${ult.v}</b><span>actual · ${unidad}</span></div>
      <div><b>🏆 ${record}</b><span>récord</span></div>
      <div><b>${mejor.kg ? `${mejor.kg}×${mejor.reps}` : mejor.reps}</b><span>mejor serie</span></div>
    </div>
    <p class="tenue">${puntos.length} sesiones registradas.</p>`;
}

// =====================================================================
// Páginas: Ejercicios
// =====================================================================
function itemEjercicio(e) {
  return `<a class="celda" href="#ejercicio/${e.id}"><span class="ic azul">${ICONO_PATRON[e.patron] || '🏋️'}</span>
    <span class="celda-t"><b>${esc(e.nombre)}</b><small>${e.musculos.map(m => MUSCULOS[m]).join(', ')} · ${equipoTxt(e)}</small></span><span class="chev">›</span></a>`;
}

function ejercicios() {
  const q = ui.q.toLowerCase();
  const lista = EJERCICIOS.filter(e => (!ui.filtro || e.musculos.includes(ui.filtro)) && (!q || e.nombre.toLowerCase().includes(q)));
  let cuerpo;
  if (!lista.length) cuerpo = vacioMsg('🔍', 'Sin resultados', 'Prueba con otra palabra o quita el filtro.');
  else if (ui.filtro || q) cuerpo = `<div class="celdas">${lista.map(itemEjercicio).join('')}</div>`;
  else cuerpo = Object.entries(MUSCULOS).map(([m, nombre]) => {
    const deEste = lista.filter(e => e.musculos[0] === m);
    return deEste.length ? grupo(`${nombre} · ${deEste.length}`, deEste.map(itemEjercicio).join('')) : '';
  }).join('');
  return pagina({
    titulo: 'Ejercicios', sub: `${EJERCICIOS.length} ejercicios con su técnica`,
    cuerpo: `
      <div class="buscador"><span>🔍</span><input type="search" placeholder="Buscar ejercicio" value="${esc(ui.q)}" data-a="buscar" class="buscar" aria-label="Buscar ejercicio"></div>
      <div class="chips scroll">
        <button class="chip ${!ui.filtro ? 'on' : ''}" data-a="filtro" data-m="">Todos</button>
        ${Object.entries(MUSCULOS).map(([k, v]) => `<button class="chip ${ui.filtro === k ? 'on' : ''}" data-a="filtro" data-m="${k}">${v}</button>`).join('')}
      </div>
      <div id="listaEj">${cuerpo}</div>
    `,
  });
}

function ejercicioDetalle(id) {
  const e = porId[id];
  if (!e) return null;
  ui.ejSel = id;
  const puntos = datosEjercicio(id);
  const alt = alternativas(id, estado.perfil).slice(0, 5);
  const colores = Object.fromEntries(e.musculos.map((m, i) => [m, i ? 'var(--acento2)' : 'var(--acento)']));
  const enPlan = estado.plan.sesiones.filter(s => !s.oculta && s.ejercicios.some(x => x.id === id)).map(s => s.nombre);
  return pagina({
    titulo: esc(e.nombre), padre: 'ejercicios', sub: PATRONES[e.patron],
    cuerpo: `
      <div class="tarjeta">
        ${cuerpoSVG(colores)}
        <p class="leyenda centro"><i class="lg" style="background:var(--acento)"></i>principal <i class="lg" style="background:var(--acento2)"></i>secundario</p>
        <div class="badges centro-flex">${e.musculos.map((m, i) => `<span class="badge ${i ? '' : 'prim'}">${MUSCULOS[m]}</span>`).join('')}
          <span class="badge">🧰 ${equipoTxt(e)}</span>${e.compuesto ? '<span class="badge">Multiarticular</span>' : '<span class="badge">Aislamiento</span>'}</div>
      </div>
      <div class="tarjeta">
        <h2>📝 Técnica</h2>
        <p>${esc(e.desc)}</p>
        <h2>🛡️ Seguridad</h2>
        <p class="tenue">Calienta con 1-2 series ligeras. Controla el movimiento en todo el recorrido y para si notas dolor articular.</p>
        <a class="btn sec" href="https://www.youtube.com/results?search_query=${encodeURIComponent(e.nombre + ' técnica')}" target="_blank" rel="noopener">▶ Ver vídeos de técnica</a>
      </div>
      ${enPlan.length ? `<p class="tenue">📋 Está en tu programa: ${enPlan.map(esc).join(', ')}</p>` : ''}
      <h2 class="sec-tit">📈 Tu progreso</h2>
      ${puntos.length ? '<div class="tarjeta"><div id="grafica"></div></div>' : '<div class="tarjeta"><p class="tenue">Aún no lo has registrado. Cuando lo hagas verás aquí tu evolución.</p></div>'}
      ${alt.length ? `<h2 class="sec-tit">⇄ Alternativas con tu material</h2><div class="celdas">${alt.map(itemEjercicio).join('')}</div>` : ''}
    `,
  });
}

// =====================================================================
// Páginas: Ajustes
// =====================================================================
function ajustes() {
  const p = estado.perfil;
  const o = OBJETIVOS[p.objetivo];
  return pagina({
    titulo: 'Ajustes',
    cuerpo: `
      <a class="tarjeta enlace-tarjeta perfil-card" href="#ajustes/perfil">
        <span class="avatar">${o.icono}</span>
        <span class="celda-t"><b>${o.nombre}</b><small>${p.nivel[0].toUpperCase() + p.nivel.slice(1)} · ${p.diasSemana.map(d => DIAS[d].slice(0, 3)).join(', ')} · ${frecTxt(p)} · ${p.duracion} min · ${p.lugar === 'gimnasio' ? 'Gimnasio' : 'Casa'}</small></span>
        <span class="chev">›</span>
      </a>
      ${grupo('Programa', celda('ajustes/perfil', '🎯', 'Perfil y programa', 'Objetivo, días, frecuencia, duración, material y enfoque', 'verde'))}
      ${grupo('Aplicación',
        celda('ajustes/recordatorios', '🔔', 'Recordatorios', 'Aviso los días de entrenamiento', 'naranja', estado.ajustes.recordatorio ? estado.ajustes.hora : 'No') +
        celda('ajustes/datos', '💾', 'Tus datos', 'Copia de seguridad, CSV y borrado', 'azul'))}
      ${grupo('Información', celda('ajustes/acerca', 'ℹ️', 'Cómo funciona', 'Ciclos, fases y cargas sugeridas', 'violeta'))}
    `,
  });
}

function ajRecordatorios() {
  const a = estado.ajustes;
  return pagina({
    titulo: 'Recordatorios', padre: 'ajustes',
    cuerpo: `
      <div class="tarjeta">
        <label class="interruptor"><span><b>Avisarme los días de entreno</b><br><small class="tenue">Solo los días que tienes sesión</small></span>
          <input type="checkbox" role="switch" data-a="recordatorio" ${a.recordatorio ? 'checked' : ''}></label>
        <label class="fila campo-fila"><b>Hora habitual</b><input type="time" value="${a.hora}" data-a="hora" class="hora"></label>
      </div>
      <p class="tenue">El aviso llega si la app está abierta o instalada en segundo plano a esa hora. No se usa ningún servidor externo.</p>
    `,
  });
}

function ajDatos() {
  return pagina({
    titulo: 'Tus datos', padre: 'ajustes', sub: 'Todo se guarda solo en este dispositivo',
    cuerpo: `
      ${grupo('Copia de seguridad', `
        <button class="celda" data-a="exportar"><span class="ic azul">⬇️</span><span class="celda-t"><b>Exportar copia</b><small>Archivo JSON con todo: perfil, programa e historial</small></span></button>
        <label class="celda"><span class="ic verde">⬆️</span><span class="celda-t"><b>Importar copia</b><small>Recupera los datos desde un archivo exportado</small></span><input type="file" accept="application/json" data-a="importar" hidden></label>
        <button class="celda" data-a="csv"><span class="ic violeta">📊</span><span class="celda-t"><b>Exportar historial (CSV)</b><small>Para abrirlo en Excel o Google Sheets</small></span></button>`)}
      ${grupo('Zona peligrosa', `<button class="celda peligro-c" data-a="borrarTodo"><span class="ic rojo">🗑️</span><span class="celda-t"><b>Borrar todos los datos</b><small>No se puede deshacer</small></span></button>`)}
      <p class="tenue">${estado.historial.length} sesiones · ${estado.misSesiones.length} sesiones propias · ${(JSON.stringify(estado).length / 1024).toFixed(1)} KB</p>
    `,
  });
}

function ajAcerca() {
  return pagina({
    titulo: 'Cómo funciona', padre: 'ajustes',
    cuerpo: `
      <div class="tarjeta"><h2>📅 Ciclos de ${SEMANAS_CICLO} semanas</h2>
        <p>El programa se organiza en tres fases de 4 semanas: <b class="f-A-t">acumulación</b> (más volumen), <b class="f-I-t">intensificación</b> (más carga) y <b class="f-R-t">realización</b> (menos repeticiones, más descanso). La última semana de cada fase es de descarga.</p></div>
      <div class="tarjeta"><h2>🤖 Cargas sugeridas</h2>
        <p>Si completas todas las series en lo alto del rango, la próxima vez te propone subir peso. Si te quedas corto, lo mantiene o lo baja un poco. Tu valoración al terminar (fácil, bien o duro) ajusta cuánto sube.</p></div>
      <div class="tarjeta"><h2>🎯 Músculos prioritarios</h2>
        <p>Sus ejercicios van al principio de la sesión, cuando estás más fresco, y llevan una serie extra. El resto del cuerpo se mantiene.</p></div>
      <div class="tarjeta"><h2>💚 Recuperación</h2>
        <p>Se estima con las series de cada músculo y las horas desde que lo entrenaste (de 36 a 72 horas).</p></div>
      <p class="tenue centro">MiEntrenamiento · funciona sin conexión · tus datos no salen de tu dispositivo</p>
    `,
  });
}

// =====================================================================
// Perfil: asistente por pasos (primera vez) y formulario completo (editar)
// =====================================================================
const PASOS = ['objetivo', 'nivel', 'dias', 'frecuencia', 'duracion', 'lugar', 'enfoque', 'inicio'];

function formPerfil(asistente) {
  const p = { frecuencia: 'auto', ...(estado.perfil || { objetivo: 'musculo', nivel: 'principiante', diasSemana: [0, 2, 4], duracion: 60, lugar: 'gimnasio', equipo: [], enfoque: [], inicio: hoy() }) };
  const radio = (name, val, txt, extra = '') => `<label class="chip ${extra}"><input type="radio" name="${name}" value="${val}" ${String(p[name]) === String(val) ? 'checked' : ''} required>${txt}</label>`;
  const check = (name, val, txt) => `<label class="chip"><input type="checkbox" name="${name}" value="${val}" ${(p[name] || []).map(String).includes(String(val)) ? 'checked' : ''}>${txt}</label>`;
  const paso = (n, titulo, ayuda, html) => `<fieldset data-paso="${n}" class="${asistente && n === 0 ? 'on' : ''}">
    <legend>${asistente ? '' : `${n + 1}. `}${titulo}</legend>${ayuda ? `<p class="tenue ayuda">${ayuda}</p>` : ''}${html}</fieldset>`;
  return `<form id="formPerfil" class="${asistente ? 'asistente' : ''}" novalidate>
    ${paso(0, '¿Cuál es tu objetivo?', 'Define el rango de repeticiones y los descansos.', `<div class="opciones">${Object.entries(OBJETIVOS).map(([k, o]) => radio('objetivo', k, `<span class="op-ic">${o.icono}</span>${o.nombre}<small>${o.desc}</small>`, 'grande')).join('')}</div>`)}
    ${paso(1, '¿Qué experiencia tienes?', 'Ajusta el número de series y los ejercicios.', `<div class="opciones col">
      ${radio('nivel', 'principiante', '<span class="op-ic">🌱</span><span><b>Principiante</b><small>Menos de 6 meses entrenando</small></span>', 'grande fila-op')}
      ${radio('nivel', 'intermedio', '<span class="op-ic">🌿</span><span><b>Intermedio</b><small>Entre 6 meses y 2 años</small></span>', 'grande fila-op')}
      ${radio('nivel', 'avanzado', '<span class="op-ic">🌳</span><span><b>Avanzado</b><small>Más de 2 años de forma constante</small></span>', 'grande fila-op')}</div>`)}
    ${paso(2, '¿Qué días puedes entrenar?', 'Elige entre 1 y 6 días. Repartiré las sesiones en esos días.', `<div class="chips dias-sel">${DIAS.map((d, i) => check('diasSemana', i, d.slice(0, 3))).join('')}</div><p class="tenue" id="avisoDias"></p>`)}
    ${paso(3, '¿Cuántas veces por semana quieres trabajar cada músculo?', 'Es la frecuencia de entrenamiento. No puede ser mayor que los días que entrenas.', `<div class="opciones col">
      ${Object.entries(FRECUENCIAS).map(([k, f]) => radio('frecuencia', k, `<span class="op-ic">${k === 'auto' ? '🤖' : `${k}×`}</span><span><b>${f.nombre}</b><small>${f.desc}</small></span>`, 'grande fila-op')).join('')}</div>
      <p class="tenue" id="avisoFrec"></p>`)}
    ${paso(4, '¿Cuánto tiempo tienes por sesión?', 'Incluye unos 5 minutos de calentamiento.', `<div class="opciones cinco">${[30, 45, 60, 75, 90].map(d => radio('duracion', d, `<b class="op-num">${d}</b><small>min</small>`, 'grande')).join('')}</div>`)}
    ${paso(5, '¿Dónde entrenas?', '', `<div class="opciones">${radio('lugar', 'gimnasio', '<span class="op-ic">🏢</span>Gimnasio', 'grande')}${radio('lugar', 'casa', '<span class="op-ic">🏠</span>Casa', 'grande')}</div>
      <div id="fsEquipo" ${p.lugar === 'gimnasio' ? 'hidden' : ''}><p class="sub-leg">¿Qué material tienes?</p><p class="tenue">Si no marcas nada, el programa será solo con peso corporal.</p>
      <div class="chips">${Object.entries(EQUIPOS).map(([k, v]) => check('equipo', k, v)).join('')}</div></div>`)}
    ${paso(6, '¿Quieres priorizar algún músculo?', 'Opcional. Sus ejercicios irán al principio con una serie extra.', `<div class="chips">${Object.entries(MUSCULOS).map(([k, v]) => check('enfoque', k, v)).join('')}</div>`)}
    ${paso(7, '¿Cuándo empiezas?', 'Puedes empezar hoy o en los próximos 30 días.', `<input type="date" name="inicio" value="${p.inicio && p.inicio >= hoy() ? p.inicio : hoy()}" min="${hoy()}" max="${sumarDias(hoy(), 30)}" required>`)}
    ${asistente ? `<div class="asistente-nav">
        <button type="button" class="btn sec" data-a="pasoAnt" hidden>Atrás</button>
        <button type="button" class="btn" data-a="pasoSig">Siguiente</button>
        <button type="submit" class="btn" hidden>Crear mi programa ✨</button>
      </div>`
      : `<button class="btn grande" type="submit">Guardar y regenerar programa</button>`}
  </form>`;
}

function vistaPerfil() {
  return pagina({ titulo: 'Perfil y programa', padre: 'ajustes', sub: 'Al guardar se crea un programa nuevo; tu historial se conserva', cuerpo: formPerfil(false) });
}

function bienvenida() {
  return `
    <div class="bienvenida">
      <div class="logo">🏋️</div>
      <h1>MiEntrenamiento</h1>
      <p class="tenue">${estado.perfil ? 'Revisa tus respuestas para crear tu programa.' : '8 preguntas y tendrás tu programa personalizado.'}</p>
      <div class="pasos-barra"><i style="width:${100 / PASOS.length}%"></i></div>
      <p class="tenue centro" id="pasoTxt">Paso 1 de ${PASOS.length}</p>
    </div>
    ${formPerfil(true)}
  `;
}

function textoFrecImposible(fr, dias) {
  return Number(fr) > dias ? `Con ${dias} ${dias === 1 ? 'día' : 'días'} no puedes trabajar cada músculo ${fr} veces. Añade días o elige otra frecuencia.`
    : `Con ${dias} días y 1 vez por semana necesitarías más días; elige otra frecuencia.`;
}
const frecTxt = p => !p.frecuencia || p.frecuencia === 'auto' ? 'frecuencia automática' : `cada músculo ${p.frecuencia}×/sem`;

// Cuántos días por semana se trabaja cada músculo (como principal) en el programa.
function frecuenciaReal() {
  const veces = Object.fromEntries(Object.keys(MUSCULOS).map(m => [m, 0]));
  estado.plan.sesiones.filter(s => !s.oculta).forEach(s => new Set(s.ejercicios.map(e => porId[e.id]?.musculos[0]).filter(Boolean)).forEach(m => veces[m]++));
  return veces;
}

// Avanza o retrocede un paso del asistente, validando el paso actual.
function moverPaso(d) {
  const form = $('#formPerfil');
  const pasos = [...form.querySelectorAll('fieldset')];
  const n = pasos.findIndex(f => f.classList.contains('on'));
  if (d > 0) {
    const f = pasos[n];
    if (f.querySelector('[type=radio]') && !f.querySelector('[type=radio]:checked')) { toast('Elige una opción para continuar'); return; }
    if (f.dataset.paso === '2') {
      const k = f.querySelectorAll('[name=diasSemana]:checked').length;
      if (!k) { avisoCampo('#avisoDias', 'Elige al menos un día de entrenamiento.'); return; }
      if (k > 6) { avisoCampo('#avisoDias', 'Deja al menos un día de descanso a la semana.'); return; }
    }
    if (f.dataset.paso === '3') {
      const fr = form.querySelector('[name=frecuencia]:checked').value;
      const k = form.querySelectorAll('[name=diasSemana]:checked').length;
      if (!frecuenciaPosible(fr === 'auto' ? fr : Number(fr), k)) { avisoCampo('#avisoFrec', textoFrecImposible(fr, k)); return; }
    }
  }
  const m = Math.max(0, Math.min(pasos.length - 1, n + d));
  pasos[n].classList.remove('on');
  pasos[m].classList.add('on');
  form.querySelector('[data-a=pasoAnt]').hidden = m === 0;
  form.querySelector('[data-a=pasoSig]').hidden = m === pasos.length - 1;
  form.querySelector('[type=submit]').hidden = m !== pasos.length - 1;
  $('.pasos-barra i').style.width = `${(m + 1) / pasos.length * 100}%`;
  $('#pasoTxt').textContent = `Paso ${m + 1} de ${pasos.length}`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =====================================================================
// Modal
// =====================================================================
function modal(html, { cerrar = true } = {}) {
  const d = $('#modal');
  d.innerHTML = `<div class="modal-cont">${cerrar ? '<button class="cerrar-x" data-a="cerrar" aria-label="Cerrar">✕</button>' : ''}${html}</div>`;
  if (cerrar) delete d.dataset.fija; else d.dataset.fija = '1';
  if (!d.open) d.showModal();
  d.scrollTop = 0;
}
const cerrarModal = () => $('#modal').open && $('#modal').close();

// Pulsar fuera de la ventana la cierra.
$('#modal').addEventListener('click', e => { if (e.target === e.currentTarget && !e.currentTarget.dataset.fija) cerrarModal(); });
$('#modal').addEventListener('cancel', e => { if (e.currentTarget.dataset.fija) e.preventDefault(); });

// Confirmación propia (sustituye a confirm() del navegador). Devuelve una promesa con true/false.
function confirmar(texto, { titulo = '¿Seguro?', ok = 'Aceptar', peligro = false } = {}) {
  const d = $('#confirmar');
  d.innerHTML = `<div class="modal-cont"><h2>${esc(titulo)}</h2><p>${esc(texto)}</p>
    <div class="botones"><button class="btn sec" value="no">Cancelar</button><button class="btn ${peligro ? 'rojo' : ''}" value="si">${esc(ok)}</button></div></div>`;
  d.showModal();
  d.querySelector('[value=si]').focus();
  return new Promise(res => {
    d.onclick = e => {
      const b = e.target.closest('button');
      if (b || e.target === d) { d.close(); res(b?.value === 'si'); }
    };
    d.oncancel = () => res(false);
  });
}

// Aviso breve en la parte inferior, con acción opcional (p. ej. «Deshacer»).
function toast(texto, { accion, alPulsar, ms = 4000 } = {}) {
  const t = $('#toast');
  t.innerHTML = `<span>${esc(texto)}</span>${accion ? `<button>${esc(accion)}</button>` : ''}`;
  t.hidden = false;
  t.classList.remove('sale'); void t.offsetWidth; t.classList.add('entra');
  clearTimeout(toast.id);
  toast.id = setTimeout(() => { t.hidden = true; }, ms);
  const b = t.querySelector('button');
  if (b) b.onclick = () => { t.hidden = true; alPulsar?.(); };
}

// Guarda una foto del estado para poder deshacer la última acción.
function conDeshacer(texto, accion) {
  const antes = JSON.stringify(estado);
  accion();
  guardar(); render();
  toast(texto, { accion: 'Deshacer', alPulsar: () => { estado = JSON.parse(antes); guardar(); render(); } });
}

function detalle(id) {
  const e = porId[id];
  const ult = ultimoRegistro(id);
  const rec = recordAntes(estado.historial, id);
  modal(`
    <p class="eyebrow">${PATRONES[e.patron]}</p>
    <h2>${esc(e.nombre)}</h2>
    <div class="badges">${e.musculos.map((m, i) => `<span class="badge ${i ? '' : 'prim'}">${MUSCULOS[m]}</span>`).join('')}</div>
    <p class="tenue">Material: ${equipoTxt(e)}</p>
    <h3>Técnica</h3>
    <p>${esc(e.desc)}</p>
    <h3>Seguridad</h3>
    <p class="tenue">Calienta antes con 1-2 series ligeras. Mantén el control en todo el recorrido y para si notas dolor articular.</p>
    ${ult ? `<p>Última vez: <b>${ult.series.map(s => s.kg ? `${s.kg}×${s.reps}` : s.reps).join(' · ')}</b>${rec ? ` · récord ${rec}` : ''}</p>` : ''}
    <a class="enlace" href="https://www.youtube.com/results?search_query=${encodeURIComponent(e.nombre + ' técnica')}" target="_blank" rel="noopener">▶ Buscar vídeos de técnica</a>
  `);
}

// =====================================================================
// Acciones de sesión
// =====================================================================
function iniciarSesion({ nombre, ejercicios, semana, citaId = null, faseSes = null }) {
  const pres = semana ? ejercicios.map(e => prescribir(e, semana)) : ejercicios.map(e => ({ ...e }));
  estado.enCurso = {
    citaId, nombre, semana, fase: faseSes || (semana ? fase(semana) : null),
    inicio: Date.now(), acumulado: 0, reanudado: Date.now(), pausado: false,
    ejercicios: pres.map(e => ({ ...e, series: seriesObjetivo(e) })),
  };
  ui.listaSesion = false;
  guardar();
  cerrarModal();
  ir('sesion');
}

function empezarCita(citaId, minutos) {
  const c = agenda().find(x => x.id === citaId);
  const s = estado.plan.sesiones[c.sesion];
  let ejs = s.ejercicios.map(e => prescribir(e, c.semana));
  if (minutos) ejs = ajustarDuracion(ejs, minutos);
  iniciarSesion({ nombre: s.nombre, ejercicios: ejs, semana: null, citaId, faseSes: fase(c.semana) });
}

function marcarSerie(i, k) {
  const s = estado.enCurso;
  const e = s.ejercicios[i], r = e.series[k];
  const antes = JSON.stringify(estado.enCurso);
  r.hecho = !r.hecho;
  if (r.hecho) {
    navigator.vibrate?.(30);
    if (r.reps == null) r.reps = typeof r.objetivo === 'number' ? r.objetivo : e.repsMin;
    if (r.kg == null && e.tipo !== 'tiempo') r.kg = r.kgSug || 0;
    // Las series siguientes proponen la carga que acabas de usar (salvo pirámide, que la calcula).
    if (r.kg && e.metodo !== 'piramide') e.series.slice(k + 1).forEach(x => { if (!x.hecho) x.kgSug = x.drop ? Math.round(r.kg * 0.75 * 2) / 2 : r.kg; });
    const sig = e.series[k + 1];
    const pos = actual();
    if (pos && !(sig && sig.drop && !sig.hecho)) {
      const proximo = pos.i !== i ? nombreEj(s.ejercicios[pos.i].id) : `Serie ${pos.k + 1} de ${nombreEj(e.id)}`;
      empezarDescanso(e.descanso, proximo, 'Descanso', () => { estado.enCurso = JSON.parse(antes); guardar(); render(); });
    } else if (!pos) {
      toast('¡Última serie hecha!', { accion: 'Deshacer', alPulsar: () => { estado.enCurso = JSON.parse(antes); guardar(); render(); } });
    }
  }
  guardar(); render();
}

async function terminar() {
  const s = estado.enCurso;
  const ejercicios = s.ejercicios.map(e => ({
    id: e.id,
    series: e.series.filter(r => r.hecho).map(r => ({ kg: Number(r.kg) || 0, reps: Number(r.reps) || 0, ...(r.drop ? { drop: true } : {}) })),
  })).filter(e => e.series.length);
  if (!ejercicios.length) {
    if (await confirmar('No has marcado ninguna serie, así que no hay nada que guardar.', { titulo: '¿Salir de la sesión?', ok: 'Salir sin guardar', peligro: true })) {
      estado.enCurso = null; pararDescanso(); guardar(); ir('inicio');
    }
    return;
  }
  const pendientes = s.ejercicios.reduce((t, e) => t + e.series.filter(r => !r.hecho).length, 0);
  if (pendientes && !await confirmar(`Te quedan ${pendientes} ${pendientes === 1 ? 'serie' : 'series'} sin hacer. Se guardará solo lo que has completado.`, { titulo: '¿Terminar ya?', ok: 'Terminar' })) return;
  pararDescanso();
  terminar.ejercicios = ejercicios;
  modal(`<h2>¿Cómo te ha ido?</h2><p class="tenue">Lo uso para ajustar las cargas de las próximas sesiones.</p>
    <div class="opciones">
      <button class="chip grande" data-a="valorar" data-v="facil"><span class="op-ic">😌</span>Fácil</button>
      <button class="chip grande" data-a="valorar" data-v="bien"><span class="op-ic">🙂</span>Bien</button>
      <button class="chip grande" data-a="valorar" data-v="duro"><span class="op-ic">🥵</span>Duro</button>
    </div>
    <button class="btn sec" data-a="cerrar">Volver a la sesión</button>`, { cerrar: false });
}

function guardarSesion(valoracion) {
  const s = estado.enCurso;
  const h = { fecha: new Date().toISOString(), nombre: s.nombre, duracion: tiempoSesion(), valoracion, ejercicios: terminar.ejercicios };
  estado.historial.push(h);
  const idx = estado.historial.length - 1;
  if (s.citaId) {
    const c = agenda().find(x => x.id === s.citaId);
    if (c) { c.estado = 'hecha'; c.hist = idx; }
  }
  estado.enCurso = null;
  pararDescanso();
  guardar();
  ir('inicio');
  const prs = recordsDeSesion(estado.historial, idx);
  modal(`
    <div class="centro"><div class="logo">${prs.length ? '🏆' : '💪'}</div><h2>¡Sesión completada!</h2></div>
    <div class="stats mini">
      <div><b>${Math.round(h.duracion / 60)}</b><span>minutos</span></div>
      <div><b>${h.ejercicios.reduce((t, e) => t + e.series.length, 0)}</b><span>series</span></div>
      <div><b>${volumenSesion(h).toLocaleString('es-ES')}</b><span>kg movidos</span></div>
    </div>
    ${prs.length ? `<h3>Nuevos récords</h3>${prs.map(p => `<p>🏆 <b>${esc(nombreEj(p.id))}</b>: ${p.antes} → ${p.ahora}${p.kg ? ' kg (1RM est.)' : ' reps'}</p>`).join('')}` : ''}
    <button class="btn sec" data-a="pdfHist" data-i="${idx}">📄 Resumen PDF</button>
  `);
  if (prs.length) confeti();
}

function confeti() {
  const c = document.createElement('div');
  c.className = 'confeti';
  c.innerHTML = Array.from({ length: 40 }, (_, i) => `<i style="left:${Math.random() * 100}%;animation-delay:${Math.random() * .5}s;background:hsl(${i * 37 % 360} 80% 60%)"></i>`).join('');
  document.body.append(c);
  setTimeout(() => c.remove(), 2500);
}

// =====================================================================
// PDF (vía impresión del navegador)
// =====================================================================
function imprimir(titulo, subtitulo, filas) {
  const w = window.open('', '_blank');
  if (!w) { toast('Permite las ventanas emergentes para generar el PDF.', { ms: 6000 }); return; }
  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
    <style>body{font:14px system-ui,sans-serif;margin:32px;color:#111}h1{margin:0}p.s{color:#555;margin:4px 0 20px}
    table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #ddd;padding:8px;text-align:left;vertical-align:top}
    th{background:#f3f4f6}small{color:#666}footer{margin-top:24px;color:#888;font-size:12px}</style></head><body>
    <h1>${esc(titulo)}</h1><p class="s">${esc(subtitulo)}</p>
    <table><thead><tr><th>#</th><th>Ejercicio</th><th>Series</th><th>Descanso</th><th>Notas</th></tr></thead><tbody>
    ${filas.map((f, i) => `<tr><td>${i + 1}</td><td><b>${esc(f.nombre)}</b><br><small>${esc(f.musculos)}</small></td><td>${f.series}</td><td>${esc(f.descanso)}</td><td><small>${esc(f.notas)}</small></td></tr>`).join('')}
    </tbody></table><footer>Generado con MiEntrenamiento · ${new Date().toLocaleDateString('es-ES')}</footer>
    <script>onload=()=>{print()}<\/script></body></html>`);
  w.document.close();
}

const filasPlan = ejs => ejs.map(e => ({
  nombre: nombreEj(e.id), musculos: porId[e.id].musculos.map(m => MUSCULOS[m]).join(', '),
  series: e.metodo === 'tabata' ? '8 × 20 s / 10 s' : `${e.series} × ${objetivoTxt(e)}${e.metodo !== 'normal' ? ` (${METODOS[e.metodo].nombre})` : ''}`,
  descanso: e.metodo === 'tabata' ? '—' : `${e.descanso} s`, notas: porId[e.id].desc,
}));

function pdfHist(i) {
  const h = estado.historial[i];
  imprimir(h.nombre, `${fmtCorta(h.fecha)} · ${Math.round(h.duracion / 60)} min · ${volumenSesion(h)} kg movidos`,
    h.ejercicios.map(e => ({
      nombre: nombreEj(e.id), musculos: porId[e.id]?.musculos.map(m => MUSCULOS[m]).join(', ') || '',
      series: e.series.map(s => `${s.drop ? 'drop ' : ''}${s.kg ? `${s.kg} kg × ${s.reps}` : `${s.reps}`}`).join('<br>'),
      descanso: '', notas: (() => { const m = mejorSerie(e.series); return m?.rm ? `1RM estimado: ${m.rm} kg` : ''; })(),
    })));
}

// =====================================================================
// Programa: mover, añadir, regenerar
// =====================================================================
function moverCita(citaId) {
  const c = agenda().find(x => x.id === citaId);
  const lun = lunes(c.fecha < hoy() ? hoy() : c.fecha);
  const ocupados = new Set(citasSemana(lun).map(x => x.fecha));
  const libres = Array.from({ length: 7 }, (_, i) => sumarDias(lun, i)).filter(f => f >= hoy() && !ocupados.has(f));
  modal(`<h2>Mover ${esc(estado.plan.sesiones[c.sesion].nombre)}</h2>
    <p class="tenue">Elige un día libre de la semana.</p>
    ${libres.length ? `<div class="chips">${libres.map(f => `<button class="chip" data-a="moverA" data-cita="${c.id}" data-f="${f}">${DIAS[diaSemana(f)]} ${deIso(f).getDate()}</button>`).join('')}</div>`
      : '<p>No quedan días libres esta semana.</p>'}`);
}

function anadirDia(fecha) {
  const opciones = estado.plan.sesiones.map((s, i) => `<button class="tarjeta item" data-a="anadirSes" data-f="${fecha}" data-i="${i}"><b>${esc(s.nombre)}</b></button>`).join('');
  const mias = estado.misSesiones.map((s, i) => `<button class="tarjeta item" data-a="anadirMia" data-f="${fecha}" data-i="${i}"><b>${esc(s.nombre)}</b> <span class="chip-mini alt">mía</span></button>`).join('');
  modal(`<h2>Entrenar el ${fmtFecha(fecha)}</h2><p class="tenue">Convierte este día de descanso en un día de entrenamiento extra.</p>${opciones}${mias}`);
}

function regenerar(perfil) {
  // Se conservan las sesiones ya hechas de la agenda anterior para el calendario.
  const hechas = agenda().filter(c => c.estado === 'hecha');
  estado.perfil = perfil;
  estado.plan = generarPrograma(perfil);
  const desde = perfil.inicio;
  estado.plan.agenda = [...hechas.filter(c => c.fecha < desde).map(c => ({ ...c, id: 'h' + c.id, sesion: Math.min(c.sesion, estado.plan.sesiones.length - 1) })), ...estado.plan.agenda];
  guardar();
}


// =====================================================================
// Eventos
// =====================================================================
document.addEventListener('click', ev => {
  const b = ev.target.closest('[data-a]');
  if (!b || b.tagName === 'INPUT' || b.tagName === 'SELECT') return;
  const d = b.dataset;
  const i = Number(d.i), k = Number(d.k);
  switch (d.a) {
    case 'ir': cerrarModal(); ir(d.v); break;
    case 'cerrar': cerrarModal(); break;
    case 'detalle': detalle(d.id); break;
    case 'semana': ui.semanaVista = sumarDias(ui.semanaVista || (estado.plan.base > lunes(hoy()) ? estado.plan.base : lunes(hoy())), Number(d.d)); render(); break;
    case 'mes': { const base = ui.mesVista ? deIso(ui.mesVista) : new Date(); ui.mesVista = iso(new Date(base.getFullYear(), base.getMonth() + Number(d.d), 1)); render(); break; }
    case 'verDia': {
      const c = agenda().find(x => x.fecha === d.f);
      ui.semanaVista = lunes(d.f);
      if (c?.hist != null) ir(`historial/${c.hist}`);
      else if (c) ir(`programa/sesion/${c.sesion}`);
      else ir('programa');
      break;
    }
    case 'verSesion': ir(`programa/sesion/${i}`); break;
    case 'pasoSig': moverPaso(1); break;
    case 'pasoAnt': moverPaso(-1); break;
    case 'empezar': if (!estado.enCurso) empezarCita(d.cita); else ir('sesion'); break;
    case 'acortar': {
      const c = agenda().find(x => x.id === d.cita);
      const ejs = estado.plan.sesiones[c.sesion].ejercicios.map(e => prescribir(e, c.semana));
      const dur = duracionEstimada(ejs);
      const ops = [20, 30, 45, 60].filter(m => m < dur);
      modal(`<h2>Acortar sesión</h2><p class="tenue">Duración completa: ~${dur} min. Elige cuánto tiempo tienes y quito accesorios y series, manteniendo lo principal.</p>
        <div class="chips">${ops.map(m => `<button class="chip" data-a="empezarCorta" data-cita="${c.id}" data-m="${m}">${m} min · ${ajustarDuracion(ejs, m).length} ejercicios</button>`).join('') || '<p>Ya es una sesión corta.</p>'}</div>`);
      break;
    }
    case 'empezarCorta': empezarCita(d.cita, Number(d.m)); break;
    case 'hacerHoy': {
      // Se pasa a hoy si el día está libre; si no, se hace igualmente y queda en su día original.
      const c = agenda().find(x => x.id === d.cita);
      if (!agenda().some(x => x.fecha === hoy())) c.fecha = hoy();
      guardar(); empezarCita(c.id); break;
    }
    case 'mover': moverCita(d.cita); break;
    case 'moverA': {
      cerrarModal();
      conDeshacer(`Sesión movida al ${DIAS[diaSemana(d.f)].toLowerCase()}`, () => { agenda().find(x => x.id === d.cita).fecha = d.f; });
      break;
    }
    case 'anadirDia': anadirDia(d.f); break;
    case 'anadirSes': case 'anadirMia': {
      const extra = { id: 'x' + Date.now(), fecha: d.f, semana: semanaDe(d.f), sesion: i, estado: 'pendiente', extra: true };
      if (d.a === 'anadirMia') {
        estado.plan.sesiones.push({ ...estado.misSesiones[i], oculta: true });
        extra.sesion = estado.plan.sesiones.length - 1;
      }
      cerrarModal();
      conDeshacer('Sesión añadida al calendario', () => estado.plan.agenda.push(extra));
      break;
    }
    case 'adelantar': {
      // Usa la siguiente cita pendiente de esa sesión y la marca como hecha por adelantado.
      const c = agenda().filter(x => x.sesion === i && x.estado !== 'hecha' && x.fecha >= hoy()).sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
      if (c) empezarCita(c.id);
      else iniciarSesion({ nombre: estado.plan.sesiones[i].nombre, ejercicios: estado.plan.sesiones[i].ejercicios, semana: semanaDe() });
      break;
    }
    case 'metodo': {
      const item = estado.plan.sesiones[i].ejercicios[Number(d.j)];
      modal(`<h2>Método de intensificación</h2><p class="tenue">${esc(nombreEj(item.id))}</p>
        ${Object.entries(METODOS).map(([key, m]) => `<button class="tarjeta item ${item.metodo === key ? 'activo' : ''}" data-a="ponerMetodo" data-i="${i}" data-j="${d.j}" data-m="${key}"><b>${m.nombre}</b><br><span class="tenue">${m.desc}</span></button>`).join('')}`);
      break;
    }
    case 'ponerMetodo': cerrarModal(); conDeshacer(`Método: ${METODOS[d.m].nombre}`, () => { estado.plan.sesiones[i].ejercicios[Number(d.j)].metodo = d.m; }); break;
    case 'cambiar': case 'cambiarSes': {
      const id = d.a === 'cambiar' ? estado.plan.sesiones[i].ejercicios[Number(d.j)].id : estado.enCurso.ejercicios[i].id;
      const alt = alternativas(id, estado.perfil);
      modal(`<h2>Cambiar ${esc(nombreEj(id))}</h2><p class="tenue">Ejercicios equivalentes que trabajan los mismos músculos con tu material.</p>
        ${alt.length ? alt.map(e => `<button class="tarjeta item" data-a="${d.a === 'cambiar' ? 'sustituir' : 'sustituirSes'}" data-i="${i}" data-j="${d.j ?? ''}" data-id="${e.id}"><b>${esc(e.nombre)}</b><br><span class="tenue">${equipoTxt(e)}</span></button>`).join('')
          : '<p class="tenue">No hay alternativas con tu material.</p>'}`);
      break;
    }
    case 'sustituir': case 'sustituirSes': {
      const nuevo = porId[d.id];
      const conv = item => {
        const tipo = nuevo.tipo === 'tiempo' ? 'tiempo' : 'reps';
        if (tipo === item.tipo) return { ...item, id: d.id };
        const seg = { principiante: 30, intermedio: 45, avanzado: 60 }[estado.perfil.nivel];
        return { ...item, id: d.id, tipo, ...(tipo === 'tiempo' ? { repsMin: seg, repsMax: seg } : { repsMin: 10, repsMax: 15 }) };
      };
      cerrarModal();
      conDeshacer(`Cambiado por ${nuevo.nombre}`, () => {
        if (d.a === 'sustituir') {
          const lista = estado.plan.sesiones[i].ejercicios; lista[Number(d.j)] = conv(lista[Number(d.j)]);
        } else {
          const e = conv(estado.enCurso.ejercicios[i]);
          e.series = seriesObjetivo({ ...e, series: e.series.filter(r => !r.drop).length });
          estado.enCurso.ejercicios[i] = e;
        }
      });
      break;
    }
    case 'hecho': marcarSerie(i, k); break;
    case 'saltarEj': {
      const nombre = nombreEj(estado.enCurso.ejercicios[i].id);
      conDeshacer(`${nombre} pasa al final`, () => estado.enCurso.ejercicios.push(...estado.enCurso.ejercicios.splice(i, 1)));
      break;
    }
    case 'paso': {
      // Botones − / + junto a kg y repeticiones.
      const inp = b.parentElement.querySelector('input');
      const v = Math.max(0, Math.round(((Number(inp.value) || 0) + Number(d.d)) * 2) / 2);
      inp.value = v;
      estado.enCurso.ejercicios[i].series[k][d.c] = v;
      guardar(); break;
    }
    case 'irEj': {
      // Pone el ejercicio elegido justo antes del actual (p. ej. si la máquina está ocupada).
      const ejs = estado.enCurso.ejercicios, pos = actual();
      const [e] = ejs.splice(i, 1);
      ejs.splice(i < pos.i ? pos.i - 1 : pos.i, 0, e);
      guardar(); render(); window.scrollTo({ top: 0, behavior: 'smooth' });
      break;
    }
    case 'salirSesion': ir('inicio'); toast('La sesión sigue abierta. Vuelve cuando quieras desde Hoy.'); break;
    case 'verLista': ui.listaSesion = !ui.listaSesion; render(); break;
    case 'serie': {
      const e = estado.enCurso.ejercicios[i];
      if (Number(d.d) > 0) { const u = e.series.filter(r => !r.drop).pop(); const pos = e.series.findIndex(r => r.drop); const fila = { objetivo: u?.objetivo ?? e.repsMax, kgSug: u?.kgSug || 0, kg: u?.kg ?? null, reps: null, hecho: false }; pos === -1 ? e.series.push(fila) : e.series.splice(pos, 0, fila); }
      else e.series.pop();
      guardar(); render(); break;
    }
    case 'pausa': {
      const s = estado.enCurso;
      if (s.pausado) { s.pausado = false; s.reanudado = Date.now(); }
      else { s.acumulado += Date.now() - s.reanudado; s.pausado = true; pararDescanso(); }
      guardar(); render(); break;
    }
    case 'cronoSerie': empezarDescanso(Number(d.s), null, 'Serie'); break;
    case 'tabata': tabata(i, k); break;
    case 'terminar': terminar(); break;
    case 'valorar': guardarSesion(d.v); break;
    case 'descartar':
      confirmar('Se perderán las series que has registrado en esta sesión.', { titulo: '¿Descartar la sesión?', ok: 'Descartar', peligro: true })
        .then(ok => { if (ok) { estado.enCurso = null; pararDescanso(); guardar(); ir('inicio'); } });
      break;
    case 'nuevoCiclo': regenerar({ ...estado.perfil, inicio: hoy() }); render(); toast('Nuevo ciclo de 12 semanas creado 💪'); break;
    case 'aLaCarta': ir('programa/carta'); break;
    case 'guardarCarta': {
      const { musculos, ...s } = ui.cartaPrev;
      estado.misSesiones.push(s); ui.cartaPrev = null; guardar();
      ir(`programa/mia/${estado.misSesiones.length - 1}`); toast('Guardada en Mis sesiones ⭐'); break;
    }
    case 'empezarCarta': iniciarSesion({ nombre: ui.cartaPrev.nombre, ejercicios: ui.cartaPrev.ejercicios }); ui.cartaPrev = null; break;
    case 'empezarMia': iniciarSesion({ nombre: estado.misSesiones[i].nombre, ejercicios: estado.misSesiones[i].ejercicios }); break;
    case 'borrarMia': ir('programa/mias'); conDeshacer('Sesión borrada', () => estado.misSesiones.splice(i, 1)); break;
    case 'pdfPlan': { const s = estado.plan.sesiones[i]; const sem = semanaDe(); const ejs = s.ejercicios.map(e => prescribir(e, sem)); imprimir(s.nombre, `Semana ${sem} · ${fase(sem).nombre} · ~${duracionEstimada(ejs)} min`, filasPlan(ejs)); break; }
    case 'pdfMia': { const s = estado.misSesiones[i]; imprimir(s.nombre, `Sesión a la carta · ~${duracionEstimada(s.ejercicios)} min`, filasPlan(s.ejercicios)); break; }
    case 'pdfCurso': { const s = estado.enCurso; imprimir(s.nombre, 'Sesión en curso', filasPlan(s.ejercicios.map(e => ({ ...e, series: e.series.length })))); break; }
    case 'pdfHist': pdfHist(i); break;
    case 'filtro': ui.filtro = d.m; render(); break;
    case 'borrarHist':
      if (ruta().startsWith('historial/')) ir('seguimiento/historial');
      conDeshacer('Sesión borrada del historial', () => {
        estado.historial.splice(i, 1);
        agenda().forEach(c => { if (c.hist === i) { c.estado = 'pendiente'; delete c.hist; } else if (c.hist > i) c.hist--; });
      });
      break;
    case 'exportar': descargar(JSON.stringify(estado, null, 2), 'application/json', 'json'); toast('Copia descargada'); break;
    case 'csv': toast('Historial descargado en CSV'); descargar('﻿' + historialCSV(estado.historial), 'text/csv', 'csv'); break;
    case 'borrarTodo':
      confirmar('Se borrarán tu perfil, el programa y todo el historial. No se puede deshacer. Si quieres conservarlos, exporta antes una copia.', { titulo: '¿Borrar todos los datos?', ok: 'Borrar todo', peligro: true })
        .then(ok => { if (ok) { estado = vacio(); guardar(); ir('bienvenida'); } });
      break;
    case 'descMas': temporizador.fin += 15000; temporizador.total += 15; tic(); break;
    case 'descMenos': temporizador.fin -= 15000; tic(); break;
    case 'descSaltar': pararDescanso(); break;
    case 'descDeshacer': { const f = temporizador.deshacer; pararDescanso(); f?.(); break; }
  }
});


function descargar(texto, tipo, ext) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([texto], { type: tipo }));
  a.download = `mientrenamiento-${hoy()}.${ext}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importar(file) {
  try {
    const datos = JSON.parse(await file.text());
    if (!datos || !Array.isArray(datos.historial)) throw new Error('formato');
    if (!await confirmar(`El archivo tiene ${datos.historial.length} sesiones. Sustituirá todos los datos actuales.`, { titulo: '¿Importar la copia?', ok: 'Importar' })) return;
    estado = { ...vacio(), ...datos };
    guardar(); ir('inicio'); toast('Copia importada');
  } catch {
    toast('Ese archivo no es una copia válida de MiEntrenamiento.');
  }
}

document.addEventListener('input', ev => {
  const t = ev.target, d = t.dataset;
  if (d.a === 'dato') {
    estado.enCurso.ejercicios[Number(d.i)].series[Number(d.k)][d.c] = t.value === '' ? null : Number(t.value);
    guardar();
  } else if (d.a === 'calc') {
    const kg = Number($('#rmKg').value), reps = Number($('#rmReps').value);
    const rm = kg && reps ? unoRM(kg, reps) : 0;
    $('#rmRes').textContent = rm ? `${rm} kg` : '–';
    const tabla = $('#rmTabla');
    if (tabla) tabla.innerHTML = rm ? `<tr><th>%</th><th>Carga</th><th>Reps aprox.</th></tr>${[100, 95, 90, 85, 80, 75, 70, 65, 60].map(p =>
      `<tr><td>${p} %</td><td><b>${Math.round(rm * p / 100 * 2) / 2} kg</b></td><td>${p === 100 ? 1 : Math.max(1, Math.round(30 * (100 / p - 1)))}</td></tr>`).join('')}` : '';
  } else if (d.a === 'buscar') {
    ui.q = t.value;
    const pos = t.selectionStart;
    render();
    const inp = $('.buscar'); inp.focus(); inp.setSelectionRange(pos, pos);
  } else if (t.name === 'diasSemana') {
    const n = document.querySelectorAll('[name=diasSemana]:checked').length;
    $('#avisoDias').classList.remove('error');
    $('#avisoFrec')?.classList.remove('error'); if ($('#avisoFrec')) $('#avisoFrec').textContent = '';
    $('#avisoDias').textContent = n ? `${n} ${n === 1 ? 'sesión' : 'sesiones'} por semana` : '';
  }
});

document.addEventListener('change', async ev => {
  const t = ev.target;
  if (t.dataset.a === 'selEj') { ui.ejSel = t.value; dibujarGrafica(); }
  if (t.dataset.a === 'importar' && t.files[0]) importar(t.files[0]);
  if (t.name === 'lugar' && $('#fsEquipo')) $('#fsEquipo').hidden = t.value === 'gimnasio';
  if (t.dataset.a === 'hora') { estado.ajustes.hora = t.value; guardar(); }
  if (t.dataset.a === 'recordatorio') {
    if (t.checked && 'Notification' in window && Notification.permission !== 'granted') {
      const p = await Notification.requestPermission();
      if (p !== 'granted') { t.checked = false; toast('Sin permiso de notificaciones no puedo avisarte. Actívalo en los ajustes del navegador.', { ms: 6000 }); return; }
    }
    estado.ajustes.recordatorio = t.checked; guardar();
    toast(t.checked ? `Te avisaré a las ${estado.ajustes.hora} los días de entreno` : 'Recordatorios desactivados');
  }
});

document.addEventListener('submit', async ev => {
  ev.preventDefault();
  const f = new FormData(ev.target);
  if (ev.target.id === 'formPerfil') {
    const diasSemana = f.getAll('diasSemana').map(Number);
    if (!diasSemana.length) { avisoCampo('#avisoDias', 'Elige al menos un día de entrenamiento.'); return; }
    if (diasSemana.length > 6) { avisoCampo('#avisoDias', 'Deja al menos un día de descanso a la semana.'); return; }
    const frecuencia = f.get('frecuencia') === 'auto' ? 'auto' : Number(f.get('frecuencia'));
    if (!frecuenciaPosible(frecuencia, diasSemana.length)) { avisoCampo('#avisoFrec', textoFrecImposible(frecuencia, diasSemana.length)); return; }
    const perfil = {
      objetivo: f.get('objetivo'), nivel: f.get('nivel'), diasSemana, frecuencia, duracion: Number(f.get('duracion')),
      lugar: f.get('lugar'), equipo: f.getAll('equipo'), enfoque: f.getAll('enfoque'), inicio: f.get('inicio') || hoy(),
    };
    const nuevo = !estado.plan;
    if (!nuevo && !await confirmar('Se creará un programa nuevo desde la fecha elegida. Tu historial y tus récords se conservan.', { titulo: '¿Regenerar el programa?', ok: 'Regenerar' })) return;
    regenerar(perfil);
    ui.semanaVista = null;
    ir('inicio');
    toast(nuevo ? '¡Tu programa está listo! Aquí verás cada día qué te toca.' : 'Programa actualizado', { ms: 5000 });
  } else if (ev.target.id === 'formCarta') {
    const musculos = f.getAll('musculos');
    if (!musculos.length) { toast('Elige al menos un músculo.'); return; }
    const lugar = f.get('lugar');
    const s = sesionALaCarta({
      musculos, nombre: f.get('nombre') || 'Mi sesión', duracion: Number(f.get('duracion')),
      lugar: lugar === 'gimnasio' ? 'gimnasio' : 'casa', equipo: lugar === 'casa' ? estado.perfil.equipo : [],
    }, estado.perfil);
    ui.cartaPrev = { ...s, musculos };
    render();
    $('#cartaPrev')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

// =====================================================================
// Temporizadores
// =====================================================================
const temporizador = { fin: 0, total: 0, id: null };

function empezarDescanso(seg, siguiente, etiqueta = 'Descanso', deshacer = null) {
  temporizador.deshacer = deshacer;
  $('#descDeshacer').hidden = !deshacer;
  temporizador.fin = Date.now() + seg * 1000;
  temporizador.total = seg;
  clearInterval(temporizador.id);
  temporizador.id = setInterval(tic, 200);
  $('#descansoEtq').textContent = etiqueta;
  $('#descansoSig').textContent = siguiente ? `Después: ${siguiente}` : '';
  $('#descanso').hidden = false;
  tic();
}
function pararDescanso() { clearInterval(temporizador.id); $('#descanso').hidden = true; }
function tic() {
  const quedan = Math.max(0, (temporizador.fin - Date.now()) / 1000);
  $('#descansoTxt').textContent = fmtSeg(Math.ceil(quedan));
  $('#descansoAnillo').style.setProperty('--p', Math.min(1, quedan / temporizador.total));
  if (quedan <= 3 && quedan > 0 && Math.ceil(quedan) !== tic.ultimo) { tic.ultimo = Math.ceil(quedan); pitido(660, 0.08); }
  if (quedan <= 0) { pararDescanso(); avisar(); }
}

let audio;
function pitido(freq = 880, dur = 0.15, retraso = 0) {
  try {
    audio = audio || new AudioContext();
    const o = audio.createOscillator(), g = audio.createGain();
    o.frequency.value = freq; o.connect(g); g.connect(audio.destination);
    g.gain.setValueAtTime(0.2, audio.currentTime + retraso);
    o.start(audio.currentTime + retraso); o.stop(audio.currentTime + retraso + dur);
  } catch { /* sin audio */ }
}
function avisar() { navigator.vibrate?.([200, 100, 200]); pitido(880, 0.15); pitido(880, 0.15, 0.25); }

// Tabata: 8 rondas de 20 s trabajo + 10 s descanso.
function tabata(i, k) {
  let ronda = 1, trabajo = true, fin = Date.now() + 20000;
  const ov = $('#tabata');
  ov.hidden = false;
  pitido(990, 0.2);
  const id = setInterval(() => {
    const q = Math.max(0, (fin - Date.now()) / 1000);
    ov.className = 'tabata ' + (trabajo ? 'trabajo' : 'pausa');
    ov.innerHTML = `<p>Ronda ${ronda} de 8</p><b>${Math.ceil(q)}</b><p>${trabajo ? '¡DALE!' : 'Descansa'}</p><button class="btn sec" id="tabataStop">Parar</button>`;
    if (q <= 0) {
      if (trabajo) { trabajo = false; fin = Date.now() + 10000; pitido(440, 0.2); }
      else if (ronda < 8) { ronda++; trabajo = true; fin = Date.now() + 20000; pitido(990, 0.2); }
      else { acabar(8); }
    }
  }, 200);
  function acabar(rondas) {
    clearInterval(id); ov.hidden = true; avisar();
    const r = estado.enCurso.ejercicios[i].series[k];
    r.reps = rondas; r.hecho = true; guardar(); render();
  }
  ov.onclick = e => { if (e.target.id === 'tabataStop') acabar(trabajo ? ronda - 1 : ronda); };
}

// Cronómetro de la sesión.
function actualizarCrono() {
  const c = $('#crono');
  if (c && estado.enCurso) c.textContent = fmtSeg(tiempoSesion()) + (estado.enCurso.pausado ? ' · en pausa' : '');
}
setInterval(actualizarCrono, 1000);

// Recordatorios: comprueba cada minuto si toca entrenar hoy.
function comprobarRecordatorio() {
  const a = estado.ajustes;
  if (!a.recordatorio || !estado.plan || a.avisado === hoy()) return;
  const ahora = new Date();
  const [h, m] = a.hora.split(':').map(Number);
  if (ahora.getHours() * 60 + ahora.getMinutes() < h * 60 + m) return;
  const c = agenda().find(x => x.fecha === hoy() && x.estado !== 'hecha');
  if (!c || estado.enCurso) return;
  a.avisado = hoy(); guardar();
  const texto = `Hoy toca ${estado.plan.sesiones[c.sesion].nombre}. ¡Vamos!`;
  if ('Notification' in window && Notification.permission === 'granted') {
    navigator.serviceWorker?.ready.then(r => r.showNotification('MiEntrenamiento', { body: texto, icon: 'icons/icono-192.png', tag: 'recordatorio' }))
      .catch(() => new Notification('MiEntrenamiento', { body: texto }));
  }
}
setInterval(comprobarRecordatorio, 60000);

// Mensaje de error junto a un campo del formulario.
function avisoCampo(sel, texto) {
  const el = $(sel);
  el.textContent = texto; el.classList.add('error');
  el.closest('fieldset')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Enter en los campos de una serie la marca como hecha.
document.addEventListener('keydown', ev => {
  const d = ev.target.dataset;
  if (ev.key === 'Enter' && d?.a === 'dato' && ev.target.closest('.guiado')) {
    ev.preventDefault();
    ev.target.dispatchEvent(new Event('input', { bubbles: true }));
    marcarSerie(Number(d.i), Number(d.k));
  }
});

// Mantiene la pantalla encendida durante la sesión (si el navegador lo permite).
let bloqueo = null;
async function pantallaEncendida() {
  const quiere = !!estado.enCurso && !estado.enCurso.pausado && document.visibilityState === 'visible';
  try {
    if (quiere && !bloqueo && 'wakeLock' in navigator) { bloqueo = await navigator.wakeLock.request('screen'); bloqueo.onrelease = () => { bloqueo = null; }; }
    if (!quiere && bloqueo) { await bloqueo.release(); bloqueo = null; }
  } catch { /* no disponible */ }
}
document.addEventListener('visibilitychange', pantallaEncendida);

// Los botones con icono heredan su descripción para lectores de pantalla.
function etiquetarIconos() {
  document.querySelectorAll('button[title]:not([aria-label])').forEach(b => b.setAttribute('aria-label', b.title));
}

// =====================================================================
// Arranque
// =====================================================================
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
render();
comprobarRecordatorio();
