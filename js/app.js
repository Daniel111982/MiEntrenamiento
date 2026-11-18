import { EJERCICIOS, EJERCICIOS_BASE, EQUIPOS, MUSCULOS, PATRONES, porId, sincronizarEjerciciosUsuario } from './ejercicios.js';
import {
  OBJETIVOS, METODOS, FRECUENCIAS, frecuenciaPosible, SEMANAS_CICLO, fase, prescribir, generarPrograma, generarAgenda, alternativas, unoRM,
  duracionEstimada, ajustarDuracion, sesionALaCarta, descansoRecomendado, hoyIso, iso, deIso, lunes, sumarDias,
} from './generador.js';
import { dibujoSVG, pasosDibujo, guiaEjercicio } from './tecnica.js';
import { aplicarAyudas, esconder as esconderAyuda } from './ayudas.js';
import { volumenSesion, mejorSerie, recordAntes, recordsDeSesion, racha, volumenMuscular, recuperacion, historialCSV } from './stats.js';
import { MARCA, logoDantal, isotipoCuadrado, cabeceraMarca } from './marca.js';
import { COMIDAS, CATEGORIAS_ALIMENTO, ALIMENTOS, alimentoPorId, macrosDe, sumarMacros, buscarAlimentos, RECETAS, resumenReceta } from './alimentos.js';
import { generarInsightsDantal } from './ia.js';
import { EQUIPO_TECHNOGYM, urlVideoTechnogym, infoTechnogym, esTechnogym, ilustracionTechnogymSVG } from './technogym.js';
import { videoEjercicio } from './videos.js';
import {
  CLAVE_INCIDENCIAS, TIPOS_INCIDENCIA, CATEGORIAS_INCIDENCIA, ESTADOS_INCIDENCIA, cargarIncidencias, guardarIncidencias,
  contarNuevas, nuevaIncidencia, nombreCategoria, textoIncidencia,
} from './incidencias.js';
import { interpretarSalud, fusionarMedidas, fusionarActividad } from './salud.js';
import { htmlCiencia } from './ciencia.js';
import {
  construirContextoCoach, resumenParaIA, explicarEjercicio, sugerenciaEnVivo, sugerenciasSesion, sugerenciasSemana, preguntasSugeridas, responder,
} from './coach.js';
import { PROVEEDORES, leerConfig, guardarConfig, borrarConfig, chatear, probar, detectarNano, nanoActivo, nanoEstadoSync, activarNano, probarNano } from './llm.js';

// =====================================================================
// Estado
// =====================================================================
// Cada usuario guarda sus datos por separado: 'mientrenamiento:u:<id>'.
// La lista de usuarios y cuál está activo van en 'mientrenamiento:usuarios'.
const APP_VERSION = '2.00'; // versión de la app (ver VERSIONES/HISTORIAL.md)
const CLAVE = 'mientrenamiento:v2'; // formato anterior, de un solo usuario
const CLAVE_USUARIOS = 'mientrenamiento:usuarios';
const claveDe = id => `mientrenamiento:u:${id}`;
const NUTRICION_DEF = { sexo: 'hombre', edad: 30, altura: 175, peso: null, actividad: 'moderado', objetivo: 'mantener' };
const VASO_ML = 250; // capacidad de un vaso de agua
const vacio = () => ({
  perfil: null, plan: null, historial: [], enCurso: null, misSesiones: [], videos: {}, fotos: {}, medidas: [],
  actividad: [], saludUrl: '', saludSync: '',
  nutricion: { ...NUTRICION_DEF }, ajustes: { recordatorio: false, hora: '18:00', avisado: '', ayudas: true, consejoVisto: false },
  comidas: {}, agua: {}, ejerciciosPropios: [], seguridad: null,
});
const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const AVATARES = [
  '🙂', '😎', '🤠', '🥳', '😺', '🐯', '🦁', '🐻', '🦊', '🐺', '🐼', '🐨', '🐸', '🐵', '🦄', '🐲',
  '💪', '🏋️', '🏃', '🚴', '🧘', '🤸', '⛹️', '🏊', '🥊', '⛷️', '🧗', '🚶', '🤾', '🏄', '🥇', '🏆',
  '🔥', '⚡', '🌟', '🎯', '🚀', '👑', '💎', '🦾', '🧠', '❤️', '🍀', '🌙', '☀️', '🎮', '🎧', '🛡️',
];
// Los 6 primeros se mantienen igual para no cambiar el color de los usuarios ya existentes.
const COLORES = [
  'linear-gradient(135deg,#2563eb,#16a34a)', 'linear-gradient(135deg,#7c3aed,#db2777)', 'linear-gradient(135deg,#ea580c,#facc15)',
  'linear-gradient(135deg,#0891b2,#22d3ee)', 'linear-gradient(135deg,#dc2626,#f97316)', 'linear-gradient(135deg,#334155,#64748b)',
  'linear-gradient(135deg,#0ea5e9,#6366f1)', 'linear-gradient(135deg,#f43f5e,#f59e0b)', 'linear-gradient(135deg,#10b981,#84cc16)',
  'linear-gradient(135deg,#8b5cf6,#ec4899)', 'linear-gradient(135deg,#f97316,#ef4444)', 'linear-gradient(135deg,#14b8a6,#0ea5e9)',
  'linear-gradient(135deg,#eab308,#84cc16)', 'linear-gradient(135deg,#a855f7,#3b82f6)', 'linear-gradient(135deg,#f472b6,#a78bfa)',
  'linear-gradient(135deg,#64748b,#0f172a)', 'linear-gradient(135deg,#059669,#065f46)', 'linear-gradient(135deg,#b45309,#78350f)',
];
// Iconos de ojo (mostrar/ocultar contraseña) en SVG para un aspecto más cuidado.
const ICO_OJO = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>';
const ICO_OJO_OFF = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>';

let usuarios = cargarUsuarios();
let estado = cargar();

// Los ejercicios propios del usuario se añaden a la biblioteca al arrancar.
sincronizarEjerciciosUsuario(estado.ejerciciosPropios);
// El acceso se resuelve en cada sesión: nunca se guarda.
// La app siempre pide usuario y contraseña antes de entrar.
let desbloqueado = false;
let usuarioLogin = null; // usuario elegido en la pantalla de acceso
const estaBloqueado = () => !desbloqueado;
// Primera vez en este dispositivo: todavía no hay una cuenta real que se pueda abrir.
const esCuentaNueva = () => usuarios.lista.length === 1 && !estado.plan && !estado.seguridad
  && !(estado.historial || []).length && usuarioActual().nombre === 'Usuario 1';
// Datos guardados de un usuario, sea el activo o no.
const datosUsuario = id => (id === usuarios.activo ? estado : cargar(id));
const sincronizarPropios = () => sincronizarEjerciciosUsuario(estado.ejerciciosPropios || []);

function cargarUsuarios() {
  try {
    const u = JSON.parse(localStorage.getItem(CLAVE_USUARIOS));
    if (u?.lista?.length) return u;
  } catch { /* lista corrupta: se reconstruye */ }
  // Primera vez con usuarios: los datos que hubiera pasan a un primer usuario.
  const id = nuevoId();
  const v2 = localStorage.getItem(CLAVE);
  const v1 = localStorage.getItem('mientrenamiento:v1');
  if (v2) localStorage.setItem(claveDe(id), v2);
  else if (v1) { try { localStorage.setItem(claveDe(id), JSON.stringify({ ...vacio(), historial: JSON.parse(v1).historial || [] })); } catch { /* sin datos útiles */ } }
  const u = { activo: id, lista: [{ id, nombre: v2 || v1 ? 'Yo' : 'Usuario 1', avatar: '🙂', color: 0, creado: new Date().toISOString() }] };
  localStorage.setItem(CLAVE_USUARIOS, JSON.stringify(u));
  if (v2) localStorage.removeItem(CLAVE);
  return u;
}
function guardarUsuarios() { localStorage.setItem(CLAVE_USUARIOS, JSON.stringify(usuarios)); }

function cargar(id = usuarios.activo) {
  try {
    const d = JSON.parse(localStorage.getItem(claveDe(id)));
    if (d) return {
      ...vacio(), ...d,
      medidas: Array.isArray(d.medidas) ? d.medidas : [],
      actividad: Array.isArray(d.actividad) ? d.actividad : [],
      nutricion: { ...NUTRICION_DEF, ...(d.nutricion || {}) },
      ajustes: { ...vacio().ajustes, ...d.ajustes },
      comidas: d.comidas && typeof d.comidas === 'object' ? d.comidas : {},
      agua: d.agua && typeof d.agua === 'object' ? d.agua : {},
      ejerciciosPropios: Array.isArray(d.ejerciciosPropios) ? d.ejerciciosPropios : [],
      seguridad: d.seguridad && typeof d.seguridad === 'object' ? d.seguridad : null,
    };
  } catch { /* datos corruptos */ }
  return vacio();
}
function guardar() { localStorage.setItem(claveDe(usuarios.activo), JSON.stringify(estado)); }

const usuarioActual = () => usuarios.lista.find(u => u.id === usuarios.activo) || usuarios.lista[0];
const esImagenAvatar = a => /^(data:image\/|https?:\/\/|blob:)/i.test(String(a || ''));
const esColorHex = c => /^#[0-9a-fA-F]{3,8}$/.test(String(c || ''));
// u.color puede ser un índice de la paleta (datos antiguos) o un color CSS directo.
const colorAvatar = c => {
  const s = String(c ?? '');
  return /^\d+$/.test(s) ? (COLORES[Number(s) % COLORES.length] || COLORES[0]) : (s || COLORES[0]);
};
const avatarHTML = (u, clase = '') => {
  const img = esImagenAvatar(u?.avatar);
  const fondo = img ? 'var(--tarjeta2)' : colorAvatar(u?.color);
  return `<span class="avatar-u ${clase}${img ? ' foto' : ''}" style="background:${fondo}">${img ? `<img src="${esc(u.avatar)}" alt="" loading="lazy" decoding="async">` : esc(u?.avatar || '🙂')}</span>`;
};

// El «dueño» es la cuenta marcada como administradora: es la única que ve la
// bandeja de ideas e incidencias. Si todavía no hay ninguna, la primera cuenta
// que se cree pasa a serlo.
const esDueno = u => Boolean(u?.admin);
const hayDueno = () => usuarios.lista.some(esDueno);
const soyDueno = () => esDueno(usuarioActual());
const dueno = () => usuarios.lista.find(esDueno) || null;

// Estado de interfaz que se reinicia al cambiar de usuario.
const UI_INICIAL = { semanaVista: null, mesVista: null, ejSel: null, filtro: '', q: '', listaSesion: false, cartaPrev: null, medidaEdit: null, pasoEdit: null, metricaMedida: 'peso', diaNutri: null, comidaSel: null, nutriCat: '', nutriQ: '', soloPropios: false, soloTG: false, videoAbierto: null, verMaestro: false, recMetodo: null, incFiltro: 'nuevas', coachChat: [], coachPensando: false, coachIgnorados: [], coachIAOk: null, coachNanoOk: null, coachNanoDescargando: false };

// Cambia de usuario. Sin `entrar`, la sesión queda bloqueada y se pide la contraseña.
function cambiarUsuario(id, { entrar: entrarYa = false } = {}) {
  if (id === usuarios.activo) { if (entrarYa) desbloqueado = true; return; }
  guardar();
  pararDescanso();
  usuarios.activo = id;
  guardarUsuarios();
  estado = cargar(id);
  desbloqueado = Boolean(entrarYa);
  usuarioLogin = id;
  recuperacionProc.ok = false; recuperacionProc.codigo = null; recuperacionProc.usuario = null;
  sincronizarPropios();
  Object.assign(ui, UI_INICIAL);
  cerrarModal();
  ir(estado.plan ? 'hoy' : 'bienvenida');
  if (!entrarYa) toast(`Usuario activo: ${usuarioActual().nombre}`);
}

// Inicia sesión con un usuario cuya contraseña ya se ha comprobado.
function entrarComo(id) {
  usuarioLogin = id;
  if (id !== usuarios.activo) { cambiarUsuario(id, { entrar: true }); return; }
  desbloqueado = true;
  recuperacionProc.ok = false; recuperacionProc.codigo = null; recuperacionProc.usuario = null; ui.recMetodo = null;
  ir(estado.plan ? 'hoy' : 'bienvenida');
}

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
const fmtDia = f => deIso(f.length > 10 ? iso(new Date(f)) : f).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
const fmtDec = v => Number(v).toLocaleString('es-ES', { maximumFractionDigits: 1 });
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
const ui = { ...UI_INICIAL };

// [patrón de la dirección, página, pestaña de la barra inferior]
const RUTAS = [
  [/^(|hoy|inicio)$/, inicio, 'inicio'],
  [/^programa$/, programa, 'programa'],
  [/^programa\/sesiones$/, programaSesiones, 'programa'],
  [/^programa\/sesion\/(\d+)$/, programaSesion, 'programa'],
  [/^programa\/sesion\/(\d+)\/ciencia$/, programaSesionCiencia, 'programa'],
  [/^programa\/mias$/, programaMias, 'programa'],
  [/^programa\/mia\/(\d+)$/, programaMia, 'programa'],
  [/^programa\/mia\/(\d+)\/ciencia$/, programaMiaCiencia, 'programa'],
  [/^programa\/carta$/, programaCarta, 'programa'],
  [/^sesion$/, sesion, 'sesion'],
  [/^sesion\/ciencia$/, sesionCiencia, 'sesion'],
  [/^coach$/, coach, 'coach'],
  [/^seguimiento$/, seguimiento, 'seguimiento'],
  [/^seguimiento\/actividad$/, segActividad, 'seguimiento'],
  [/^seguimiento\/recuperacion$/, segRecuperacion, 'seguimiento'],
  [/^seguimiento\/equilibrio$/, segEquilibrio, 'seguimiento'],
  [/^seguimiento\/medidas$/, segMedidas, 'seguimiento'],
  [/^seguimiento\/pasos$/, segPasos, 'seguimiento'],
  [/^seguimiento\/nutricion$/, segNutricion, 'seguimiento'],
  [/^seguimiento\/progreso$/, segProgreso, 'seguimiento'],
  [/^seguimiento\/records$/, segRecords, 'seguimiento'],
  [/^seguimiento\/historial$/, segHistorial, 'seguimiento'],
  [/^seguimiento\/calculadora$/, segCalculadora, 'seguimiento'],
  [/^historial\/(\d+)$/, historialDetalle, 'seguimiento'],
  [/^nutricion$/, nutricion, 'nutricion'],
  [/^nutricion\/diario$/, nutricion, 'nutricion'],
  [/^nutricion\/recetas$/, nutricionRecetas, 'nutricion'],
  [/^nutricion\/receta\/([\w-]+)$/, nutricionReceta, 'nutricion'],
  [/^nutricion\/hidratacion$/, nutricionAgua, 'nutricion'],
  [/^nutricion\/ia$/, nutricionIA, 'nutricion'],
  [/^nutricion\/objetivos$/, nutricionObjetivos, 'nutricion'],
  [/^ejercicios$/, ejercicios, 'ejercicios'],
  [/^ejercicios\/nuevo$/, ejercicioNuevo, 'ejercicios'],
  [/^ejercicios\/mios$/, ejerciciosPropios, 'ejercicios'],
  [/^ejercicio\/([\w-]+)\/editar$/, ejercicioEditar, 'ejercicios'],
  [/^ejercicio\/([\w-]+)$/, ejercicioDetalle, 'ejercicios'],
  [/^ajustes$/, ajustes, 'ajustes'],
  [/^ajustes\/perfil$/, vistaPerfil, 'ajustes'],
  [/^ajustes\/recordatorios$/, ajRecordatorios, 'ajustes'],
  [/^ajustes\/seguridad$/, ajSeguridad, 'ajustes'],
  [/^ajustes\/datos$/, ajDatos, 'ajustes'],
  [/^ajustes\/acerca$/, ajAcerca, 'ajustes'],
  [/^ajustes\/idea$/, ajIdea, 'ajustes'],
  [/^ajustes\/incidencias$/, ajIncidencias, 'ajustes'],
  [/^ajustes\/salud$/, ajSalud, 'ajustes'],
  [/^ajustes\/coach$/, ajCoach, 'ajustes'],
  [/^bienvenida$/, bienvenida, 'bienvenida'],
  [/^login$/, login, 'login'],
  [/^recuperar$/, recuperar, 'recuperar'],
  [/^usuarios$/, gestorUsuarios, 'ajustes'],
  [/^usuarios\/nuevo$/, usuarioNuevo, 'ajustes'],
  [/^usuario\/([\w-]+)$/, usuarioEditar, 'ajustes'],
];

const ruta = () => decodeURIComponent(location.hash.slice(1)).replace(/^\/+|\/+$/g, '');
function ir(v) { if (ruta() === v) render(); else location.hash = v; }
window.addEventListener('hashchange', render);

function render() {
  let r = ruta();
  if (estaBloqueado()) {
    if (!/^(login|recuperar|usuarios|usuarios\/nuevo|usuario\/[\w-]+)$/.test(r)) r = 'login';
    if (esCuentaNueva() && r === 'login') r = 'usuarios/nuevo';
  } else if (!estado.plan && !/^usuario/.test(r)) {
    r = 'bienvenida';
  } else if (r === 'bienvenida') {
    r = 'hoy';
  }
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
  // Aviso al dueño: puntito con los mensajes sin leer en la pestaña de Ajustes.
  const navAjustes = document.querySelector('.nav a[data-v="ajustes"]');
  if (navAjustes) {
    const sinLeer = soyDueno() ? contarNuevas() : 0;
    let b = navAjustes.querySelector('.nav-badge');
    if (sinLeer) {
      if (!b) { b = document.createElement('i'); b.className = 'nav-badge'; navAjustes.appendChild(b); }
      b.textContent = sinLeer > 9 ? '9+' : String(sinLeer);
    } else if (b) b.remove();
  }
  $('.nav').hidden = !estado.plan || tab === 'sesion' || tab === 'bienvenida' || tab === 'login' || tab === 'recuperar';
  coachFab(tab);
  if ($('#grafica')) dibujarGrafica();
  if ($('#graficaMedidas')) dibujarGraficaMedidas();
  if ($('#graficaPasos')) dibujarGraficaPasos();
  if ($('#nutriResultados')) actualizarNutricion();
  const chat = $('#coachChat');
  if (chat) chat.scrollTop = chat.scrollHeight;
  if (tab === 'sesion') actualizarCrono();
  document.body.classList.toggle('sin-ayudas', estado.ajustes.ayudas === false);
  esconderAyuda();
  aplicarAyudas();
  pantallaEncendida();
  consejoAyudas(tab);
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
const subnav = (items, actual) => `<nav class="subnav">${items.map(([h, t]) => `<a href="#${h}" class="${h === actual ? 'on' : ''}">${t}</a>`).join('')}</nav>`;
const SUBNAV_NUTRICION = [['nutricion', 'Diario'], ['nutricion/recetas', 'Recetas'], ['nutricion/hidratacion', 'Agua'], ['nutricion/ia', 'Asistente'], ['nutricion/objetivos', 'Objetivos']];

// =====================================================================
// Nutrición: objetivos, consumo del día y agua
// =====================================================================
const ceroMacros = () => ({ kcal: 0, prot: 0, carbs: 0, grasa: 0, fibra: 0 });

// Gasto energético y reparto de macros a partir del perfil nutricional.
function metasNutricion(n = estado.nutricion) {
  const ult = ultimoPeso();
  const peso = Number(n?.peso) || Number(ult?.v) || 0;
  const cm = Number(n?.altura) || 0;
  const edad = Number(n?.edad) || 0;
  if (!peso || !cm || !edad) return null;
  const act = ACTIVIDADES[n.actividad] || ACTIVIDADES.moderado;
  const obj = OBJETIVOS_NUTRI[n.objetivo] || OBJETIVOS_NUTRI.mantener;
  const bmr = 10 * peso + 6.25 * cm - 5 * edad + (n.sexo === 'mujer' ? -161 : 5);
  const tdee = bmr * act.factor;
  const kcal = Math.round(tdee * (1 + obj.factor));
  if (!Number.isFinite(kcal) || kcal <= 0) return null;
  const protMin = Math.round(peso * obj.prot[0]);
  const protMax = Math.round(peso * obj.prot[1]);
  const protG = Math.round((protMin + protMax) / 2);
  const grasaG = Math.round(kcal * 0.25 / 9);
  const carbsG = Math.max(0, Math.round((kcal - protG * 4 - grasaG * 9) / 4));
  const fibraG = Math.round(kcal * 14 / 1000);
  const aguaMl = Math.round((peso * 0.035 + 0.5) * 1000);
  const imc = peso / Math.pow(cm / 100, 2);
  return { peso, cm, edad, bmr, tdee, kcal, protMin, protMax, protG, grasaG, carbsG, fibraG, aguaMl, imc, act, obj };
}

const diaNutri = () => ui.diaNutri || hoy();
const comidasDia = (fecha = diaNutri()) => (estado.comidas || {})[fecha] || {};
const vasosDia = (fecha = diaNutri()) => Number((estado.agua || {})[fecha]) || 0;

function macrosEntrada(en) {
  if (!en) return ceroMacros();
  if (en.tipo === 'receta') {
    const r = RECETAS.find(x => x.id === en.id);
    if (!r) return ceroMacros();
    const k = Number(en.racion) || 1;
    const t = resumenReceta(r).total;
    return { kcal: t.kcal * k, prot: t.prot * k, carbs: t.carbs * k, grasa: t.grasa * k, fibra: t.fibra * k };
  }
  return macrosDe(alimentoPorId(en.id), Number(en.gramos) || 0);
}
const macrosComida = entradas => sumarMacros((entradas || []).map(macrosEntrada));
function macrosDia(fecha = diaNutri()) {
  const dia = comidasDia(fecha);
  return sumarMacros(Object.keys(COMIDAS).map(c => macrosComida(dia[c])));
}

function barrasMacros(consumo, metas) {
  if (!metas) return '';
  const filas = [
    ['prot', 'Proteína', consumo.prot, metas.protG, 'g'],
    ['carbs', 'Carbohidratos', consumo.carbs, metas.carbsG, 'g'],
    ['grasa', 'Grasas', consumo.grasa, metas.grasaG, 'g'],
    ['fibra', 'Fibra', consumo.fibra, metas.fibraG, 'g'],
  ];
  return `<div class="macro-barras">${filas.map(([cls, nombre, val, meta, u]) => {
    const pct = meta ? Math.min(100, Math.round(val / meta * 100)) : 0;
    return `<div class="macro-barra p-${cls}"><span>${nombre}</span><div class="macro-pista"><i style="width:${pct}%"></i></div><b>${Math.round(val)}/${Math.round(meta)} ${u}</b></div>`;
  }).join('')}</div>`;
}

// =====================================================================
// Seguridad local: contraseña con SHA-256 + salt, pregunta y código maestro
// =====================================================================
async function sha256Hex(txt) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
const nuevoSalt = () => [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
const hashClave = (clave, salt) => sha256Hex(`${salt}::${clave}`);
function generarMaestro() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const blk = n => Array.from(crypto.getRandomValues(new Uint8Array(n))).map(x => abc[x % abc.length]).join('');
  return `DNT-${blk(4)}-${blk(4)}`;
}
const PREGUNTAS_SEG = [
  '¿Cuál es el nombre de tu primera mascota?',
  '¿En qué ciudad naciste?',
  '¿Cuál es tu comida favorita?',
  '¿Cómo se llamaba tu primer entrenador?',
  '¿Cuál es tu grupo o cantante favorito?',
];
// Estado temporal del proceso de recuperación (no se guarda).
const recuperacionProc = { ok: false, codigo: null, expira: 0, usuario: null };

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
  const cabecera = extra => pagina({ titulo: `${saludo()}, ${esc(usuarioActual().nombre)}`, sub: fmtFecha(hoy()), extra, cuerpo: '' });
  const rachaBtn = `<a class="racha" href="#seguimiento" title="Semanas seguidas entrenando">🔥 ${racha(estado.historial)}</a>
    <button class="avatar-btn" data-a="menuUsuarios" title="Cambiar de usuario">${avatarHTML(usuarioActual())}</button>`;
  if (estado.enCurso) {
    return `${cabecera(rachaBtn)}
      ${avisoIncidencias()}
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
    ${avisoIncidencias()}
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
    ${(() => {
      const metas = metasNutricion();
      const consumo = macrosDia(hoy());
      const vasos = vasosDia(hoy());
      return `<a class="tarjeta enlace-tarjeta" href="#nutricion">
        <div class="fila"><h2>🍎 Nutrición de hoy</h2><span class="chev">›</span></div>
        <div class="tiles">
          ${tile('🔥', fmtNum(consumo.kcal), metas ? `de ${fmtNum(metas.kcal)} kcal` : 'kcal', 'naranja')}
          ${tile('🥩', `${Math.round(consumo.prot)} g`, metas ? `de ${metas.protG} g proteína` : 'proteína', 'verde')}
          ${tile('💧', `${(vasos * VASO_ML / 1000).toFixed(2)} L`, metas ? `de ${(metas.aguaMl / 1000).toFixed(1)} L` : 'agua', 'azul')}
        </div></a>`;
    })()}
    ${tarjetaCoach()}
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

// Control para ajustar el descanso de un ejercicio desde el programa.
function restControl(e, i, j) {
  const rec = descansoRecomendado(porId[e.id] || e, estado.perfil);
  return `<span class="rest-edit">descanso
    <input type="number" inputmode="numeric" min="0" max="600" step="5" value="${e.descanso}" data-a="rest" data-i="${i}" data-j="${j}" aria-label="Descanso en segundos">s
    ${e.descanso !== rec ? `<button class="chip-mini" data-a="restRec" data-i="${i}" data-j="${j}" data-d="${rec}" title="Descanso recomendado para este ejercicio">sugerido ${rec} s</button>` : ''}
  </span>`;
}

function listaEjercicios(ejs, { editable = false, i = null } = {}) {
  return `<ul class="lista">${ejs.map((e, j) => {
    const ej = porId[e.id];
    const abierto = videoAbierto(ej);
    return `
    <li class="${abierto ? 'con-video' : ''}">
      ${iconoEjercicio(ej)}
      <div class="li-t">
        <a class="enlace fuerte" href="#ejercicio/${e.id}">${esc(nombreEj(e.id))}</a>
        ${e.foco ? '<span class="chip-mini">foco</span>' : ''}
        ${e.metodo && e.metodo !== 'normal' ? `<span class="chip-mini alt">${METODOS[e.metodo].nombre}</span>` : ''}
        <br><span class="tenue">${e.metodo === 'tabata' ? '8 × 20 s / 10 s' : `${e.series} × ${objetivoTxt(e)}`}</span>
        ${e.metodo === 'tabata' ? '' : editable ? restControl(e, i, j) : `<span class="tenue"> · descanso ${e.descanso} s</span>`}
      </div>
      ${editable ? `<div class="acciones">
        <button class="icono" title="Método de intensificación" data-a="metodo" data-i="${i}" data-j="${j}">⚡</button>
        <button class="icono" title="Cambiar ejercicio" data-a="cambiar" data-i="${i}" data-j="${j}">⇄</button>
      </div>` : ''}
      ${abierto ? playerVideo(ej) : ''}
    </li>`;
  }).join('')}</ul>`;
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
      ${tarjetaCiencia(`programa/sesion/${i}`)}
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
      ${tarjetaCiencia(`programa/mia/${i}`)}
      <button class="btn peligro" data-a="borrarMia" data-i="${i}">Borrar esta sesión</button>
    `,
  });
}

// Enlace a «Entender tu sesión» desde una sesión concreta.
function tarjetaCiencia(href) {
  return `<a class="tarjeta enlace-tarjeta" href="#${href}/ciencia">
    <div class="fila"><h2>🧠 Entender tu sesión</h2><span class="chev">›</span></div>
    <p class="tenue">Ciencia y método: cómo se organiza, por qué este orden de ejercicios, los descansos, el calentamiento y cómo ajustar el esfuerzo y la recuperación. Con los estudios que lo respaldan.</p>
  </a>`;
}

function programaSesionCiencia(i) {
  const s = estado.plan?.sesiones[i];
  if (!s) return null;
  const sem = semanaDe();
  const ejs = s.ejercicios.map(e => prescribir(e, sem));
  return pagina({
    titulo: 'Entender tu sesión', padre: `programa/sesion/${i}`, sub: esc(s.nombre),
    cuerpo: htmlCiencia({ nombre: s.nombre, ejercicios: ejs }, estado.perfil, sem),
  });
}

function programaMiaCiencia(i) {
  const s = estado.misSesiones[i];
  if (!s) return null;
  return pagina({
    titulo: 'Entender tu sesión', padre: `programa/mia/${i}`, sub: esc(s.nombre),
    cuerpo: htmlCiencia({ nombre: s.nombre, ejercicios: s.ejercicios }, estado.perfil, null),
  });
}

function sesionCiencia() {
  const s = estado.enCurso;
  if (!s) return null;
  return pagina({
    titulo: 'Entender tu sesión', padre: 'sesion', sub: esc(s.nombre),
    cuerpo: htmlCiencia({ nombre: s.nombre, ejercicios: s.ejercicios }, estado.perfil, s.semana || (s.fase ? s.fase.semana : null)),
  });
}

// =====================================================================
// Coach DANTAL: explicaciones, adaptación en tiempo real y chat
// ---------------------------------------------------------------------
// El motor (js/coach.js) funciona siempre, sin conexión. Si el usuario
// conecta un modelo de lenguaje real (js/llm.js), el chat lo usa; si falla,
// se responde con el motor local para que nunca te quedes sin respuesta.
// =====================================================================

// Contexto del coach a partir del estado actual (y de la sesión en curso, si la hay).
function coachContexto(extras = {}) {
  return construirContextoCoach(estado, metasNutricion() || {}, {
    semana: extras.semana || estado.enCurso?.fase?.semana || semanaDe(),
    ...extras,
  });
}

// Qué motor de conversación está disponible ahora mismo:
// 'clave' (modelo real con tu clave) > 'navegador' (IA integrada gratis) > 'local'.
function motorCoach() {
  const cfg = leerConfig();
  if (cfg.proveedor && cfg.clave) return { tipo: 'clave', nombre: PROVEEDORES[cfg.proveedor]?.nombre || 'IA real' };
  if (nanoActivo()) return { tipo: 'navegador' };
  return { tipo: 'local' };
}

// Renderizador seguro de un texto del modelo: negritas, código y listas.
function markdownSeguro(texto) {
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>');
  const out = [];
  let enLista = false;
  for (const cruda of String(texto ?? '').split('\n')) {
    const l = cruda.trim();
    if (!l) { if (enLista) { out.push('</ul>'); enLista = false; } continue; }
    if (/^[-*•]\s+/.test(l)) {
      if (!enLista) { out.push('<ul class="ciencia-puntos">'); enLista = true; }
      out.push(`<li>${inline(l.replace(/^[-*•]\s+/, ''))}</li>`);
    } else {
      if (enLista) { out.push('</ul>'); enLista = false; }
      out.push(`<p>${inline(l)}</p>`);
    }
  }
  if (enLista) out.push('</ul>');
  return out.join('');
}

const soloTexto = html => String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

// Una sugerencia del coach, con su acción para confirmar o descartar.
function tarjetaSugerencia(sug, { i = null } = {}) {
  const conAccion = sug.accion && sug.accion.tipo && sug.accion.tipo !== 'nada';
  return `<div class="coach-sug" data-sug="${esc(sug.id)}">
    <span class="cs-ic">${sug.icono}</span>
    <div class="cs-t">
      <b>${esc(sug.titulo)}</b>
      <p>${esc(sug.texto)}</p>
      <details class="cs-por"><summary>¿Por qué?</summary><p>${esc(sug.motivo)}</p></details>
    </div>
    <div class="cs-acc">
      <button class="btn ${conAccion ? '' : 'sec'} peq" ${conAccion
        ? `data-a="coachAccion" data-acc="${esc(JSON.stringify(sug.accion))}"`
        : `data-a="coachIgnorar"`} data-sug="${esc(sug.id)}" ${i != null ? `data-i="${i}"` : ''}>${esc(sug.label || 'Vale')}</button>
      ${conAccion ? `<button class="enlace cs-x" data-a="coachIgnorar" data-sug="${esc(sug.id)}">Ignorar</button>` : ''}
    </div>
  </div>`;
}

// Panel que aparece dentro de la sesión, sobre el ejercicio en curso.
function panelCoach(pos) {
  const s = estado.enCurso;
  if (!s) return '';
  const ctx = coachContexto();
  const minutos = Math.round(tiempoSesion() / 60);
  const lista = [];
  let expl = '';
  if (pos) {
    const item = s.ejercicios[pos.i];
    const viva = sugerenciaEnVivo(item, estado.perfil, ctx);
    if (viva) lista.push({ ...viva, i: pos.i });
    // Explicación «cuánto y por qué» del ejercicio actual. En la sesión las
    // series son filas, así que se le pasa el número de series efectivas.
    const nSeries = (item.series || []).filter(r => !r.drop).length;
    const e = explicarEjercicio({ ...item, series: nSeries }, estado.perfil, ctx.semana, ctx);
    expl = `<details class="coach-expl"><summary>¿Cuánto y por qué este ejercicio?</summary>${e.html}</details>`;
  }
  lista.push(...sugerenciasSesion(s, estado.perfil, ctx, { minutos }));
  const visibles = lista.filter(x => !ui.coachIgnorados.includes(x.id));
  if (!visibles.length && !expl) return '';
  return `<div class="coach-panel">
    <p class="coach-panel-t"><span aria-hidden="true">🧠</span> Coach DANTAL</p>
    ${expl}
    ${visibles.map(x => tarjetaSugerencia(x, { i: x.i ?? null })).join('')}
  </div>`;
}

// Aplica la acción de una sugerencia. Solo se ejecuta si el usuario la confirma.
function coachAplicar(d) {
  let accion = { tipo: 'nada' };
  try { accion = JSON.parse(d.acc || '{}'); } catch { /* descriptor ilegible: se ignora */ }
  const i = Number(d.i);
  const s = estado.enCurso;
  const e = Number.isInteger(i) ? s?.ejercicios?.[i] : null;
  const descartar = () => { if (d.sug && !ui.coachIgnorados.includes(d.sug)) ui.coachIgnorados.push(d.sug); };
  switch (accion.tipo) {
    case 'carga': case 'cargaFija': {
      if (!e) break;
      e.series.filter(r => !r.hecho && !r.tabata).forEach(r => {
        if (accion.tipo === 'cargaFija') { r.kgSug = accion.kg; if (r.kg != null) r.kg = accion.kg; }
        else {
          r.kgSug = Math.max(0, Math.round(((Number(r.kgSug) || 0) + accion.delta) * 2) / 2);
          if (r.kg != null) r.kg = Math.max(0, Math.round((Number(r.kg) + accion.delta) * 2) / 2);
        }
      });
      descartar(); guardar(); render();
      toast(`Carga ajustada en ${nombreEj(e.id)}`);
      return;
    }
    case 'descanso': {
      if (!e) break;
      e.descanso = Math.max(0, Math.round(((Number(e.descanso) || 0) + accion.delta) / 5) * 5);
      descartar(); guardar(); render();
      toast(`Descanso de ${nombreEj(e.id)}: ${e.descanso} s`);
      return;
    }
    case 'objetivoTiempo': {
      if (!e) break;
      const nuevo = Math.max(5, (Number(e.repsMax) || 30) + accion.delta);
      e.repsMax = nuevo; e.repsMin = Math.max(5, (Number(e.repsMin) || nuevo) + accion.delta);
      e.series.filter(r => !r.hecho).forEach(r => { r.objetivo = nuevo; });
      descartar(); guardar(); render();
      toast(`Objetivo: ${nuevo} s`);
      return;
    }
    case 'saltarFinal': {
      if (!s) break;
      s.ejercicios = s.ejercicios.filter(x => !((x.final || x.metodo === 'tabata') && x.series.some(r => !r.hecho)));
      descartar(); guardar(); render();
      toast('Bloque final quitado de esta sesión');
      return;
    }
    case 'perfil': ir('ajustes/perfil'); return;
    case 'nutricion': ir('nutricion/objetivos'); return;
    default: descartar(); render(); return;
  }
}

function coachIgnorar(id) {
  if (id && !ui.coachIgnorados.includes(id)) ui.coachIgnorados.push(id);
  render();
}

function burbujaChat(m) {
  if (m.rol === 'usuario') return `<div class="chat-b usuario"><p>${esc(m.texto)}</p></div>`;
  let cuerpo;
  if (m.error) cuerpo = `<p class="chat-error">⚠️ ${esc(m.texto)}</p>`;
  else if (m.html) cuerpo = m.html;
  else cuerpo = markdownSeguro(m.texto);
  const etiqueta = m.local ? 'Motor local · funciona sin conexión'
    : m.fuente === 'navegador' ? 'IA del navegador · gratis y sin clave'
      : m.fuente === 'clave' ? 'IA real · modelo conectado' : '';
  return `<div class="chat-b coach">${cuerpo}${etiqueta ? `<span class="chat-fuente">${etiqueta}</span>` : ''}</div>`;
}

function mensajeBienvenidaCoach(ctx) {
  return `<div class="chat-b coach">
    <p>¡Hola! Soy tu coach. Te explico <b>cuánto</b> y <b>por qué</b> de tu programa, y lo adapto a cómo vas. Nada cambia sin tu permiso.</p>
    <p class="tenue">${ctx.sesiones ? `Llevas ${ctx.sesiones} sesiones y una racha de ${ctx.racha} semanas.` : 'Cuando registres tus primeras sesiones tendré más que decirte.'}</p>
  </div>`;
}

// Envía una pregunta al coach: usa el modelo real si está conectado y, si falla,
// responde siempre el motor local.
async function coachEnviar(texto) {
  const q = String(texto || '').trim();
  if (!q || ui.coachPensando) return;
  ui.coachChat.push({ rol: 'usuario', texto: q });
  const ctx = coachContexto();
  const local = () => {
    const r = responder(q, ctx);
    return { rol: 'coach', texto: `${r.titulo}. ${soloTexto(r.html)}`, html: `<b class="chat-titulo">${esc(r.titulo)}</b>${r.html}`, local: true };
  };
  if (motorCoach().tipo === 'local') {
    ui.coachChat.push(local());
    render();
    return;
  }
  const mensajes = ui.coachChat.filter(m => m.texto).map(m => ({ rol: m.rol, texto: m.texto }));
  ui.coachPensando = true;
  render();
  const res = await chatear({ mensajes, contexto: resumenParaIA(ctx) });
  ui.coachPensando = false;
  if (res.ok) ui.coachChat.push({ rol: 'coach', texto: res.texto, fuente: res.fuente });
  else { ui.coachChat.push({ rol: 'coach', error: true, texto: `${res.error} Te respondo con el motor local.` }); ui.coachChat.push(local()); }
  render();
}

function coach() {
  const ctx = coachContexto();
  const motor = motorCoach();
  const nano = nanoEstadoSync();
  const semana = sugerenciasSemana(ctx).filter(x => !ui.coachIgnorados.includes(x.id));
  const chips = preguntasSugeridas(ctx).filter(q => !ui.coachChat.some(m => m.rol === 'usuario' && m.texto === q));
  const sub = motor.tipo === 'clave' ? `IA real conectada · ${esc(motor.nombre)}`
    : motor.tipo === 'navegador' ? 'IA del navegador · gratis y sin clave'
      : 'Tu entrenador, siempre disponible';
  const cta = motor.tipo !== 'local' ? ''
    : nano === 'downloadable' || nano === 'downloading'
      ? `<a class="tarjeta enlace-tarjeta coach-cta" href="#ajustes/coach">
        <span class="celda-t"><b>Activa la IA gratis de tu navegador ✨</b><small>Sin clave y sin salir del dispositivo. Solo hay que descargarla una vez.</small></span><span class="chev">›</span></a>`
      : `<a class="tarjeta enlace-tarjeta coach-cta" href="#ajustes/coach">
        <span class="celda-t"><b>¿Quieres conversar con un modelo real?</b><small>Conecta tu clave de OpenAI, Gemini o Claude. Es opcional.</small></span><span class="chev">›</span></a>`;
  return pagina({
    titulo: 'Coach DANTAL',
    sub,
    extra: `<button class="icono" data-a="ir" data-v="ajustes/coach" title="Configurar el coach" aria-label="Configurar el coach">⚙️</button>`,
    cuerpo: `
      <div class="coach-chat" id="coachChat">
        ${ui.coachChat.length ? ui.coachChat.map(burbujaChat).join('') : mensajeBienvenidaCoach(ctx)}
        ${ui.coachPensando ? '<div class="chat-b coach pensando"><span></span><span></span><span></span></div>' : ''}
      </div>
      <form id="formCoach" class="coach-entrada">
        <input type="text" name="q" placeholder="Pregúntame el cuánto y el porqué…" autocomplete="off" enterkeyhint="send" aria-label="Escribe tu pregunta">
        <button class="btn" type="submit" aria-label="Enviar">➤</button>
      </form>
      ${chips.length ? `<div class="chips coach-chips">${chips.map(q => `<button class="chip" data-a="coachPreg" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>` : ''}
      ${semana.length ? `<h2 class="coach-h">Sugerencias para tu semana</h2>${semana.map(x => tarjetaSugerencia(x)).join('')}` : ''}
      ${ui.coachChat.length ? '<button class="enlace centro bloque" data-a="coachLimpiar">🗑 Empezar una conversación nueva</button>' : ''}
      ${cta}
      <p class="tenue">DANTAL no es un servicio médico. Ante cualquier duda de salud, consulta con un profesional.</p>
    `,
  });
}

// Tarjeta de la IA integrada del navegador (Gemini Nano): gratis y sin clave.
function tarjetaNano() {
  const est = nanoEstadoSync();
  const activo = nanoActivo();
  const descargando = ui.coachNanoDescargando || est === 'downloading';
  const ok = ui.coachNanoOk;
  let cuerpo;
  if (activo) {
    cuerpo = `<p class="tenue">✅ Activada. El chat usará la IA del propio navegador: <b>gratis, sin clave</b> y sin enviar tus datos a ningún servidor.</p>`;
  } else if (descargando) {
    cuerpo = `<p class="tenue">Descargando el modelo… puede tardar unos minutos y solo ocurre una vez.</p>
      <div class="nano-barra" id="nanoProg"><i style="width:2%"></i></div>`;
  } else if (est === 'downloadable') {
    cuerpo = `<p class="tenue">Tu navegador puede usar su <b>IA integrada</b> (Gemini Nano): gratis, sin clave y sin salir del dispositivo. Hay que descargarla una vez.</p>
      <button class="btn" type="button" data-a="coachNanoActivar">Descargar y activar</button>`;
  } else if (est === 'desconocido') {
    cuerpo = `<p class="tenue">Comprobando si tu navegador tiene IA integrada…</p>`;
  } else {
    cuerpo = `<p class="tenue">Tu navegador no ofrece IA integrada. Está disponible en <b>Chrome de escritorio</b> (versión 148 o superior); en el móvil, el coach sigue funcionando en local sin problema.</p>`;
  }
  return `<div class="tarjeta">
    <div class="fila"><h2>✨ IA gratis del navegador</h2><span class="chip-mini ${activo ? 'ok' : 'mudo'}">${activo ? 'Activa' : 'Opcional'}</span></div>
    ${cuerpo}
    ${activo ? '<div class="botones"><button class="btn sec" type="button" data-a="coachNanoProbar">Probar la IA del navegador</button></div>' : ''}
    ${ok ? `<p class="aviso-ia ${ok.ok ? 'ok' : 'mal'}">${ok.ok ? `✅ Responde: «${esc(ok.texto)}»` : `⚠️ ${esc(ok.error)}`}</p>` : ''}
  </div>`;
}

function ajCoach() {
  const cfg = leerConfig();
  const prov = PROVEEDORES[cfg.proveedor];
  const ok = ui.coachIAOk;
  const motor = motorCoach();
  return pagina({
    titulo: 'Coach IA', padre: 'ajustes', sub: 'Opcional: mejora el chat con IA real',
    cuerpo: `
      <div class="tarjeta">
        <h2>🧠 Cómo funciona</h2>
        <p>El coach de DANTAL <b>ya funciona sin configurar nada</b>: te explica el cuánto y el porqué y adapta tus cargas con reglas basadas en tus datos.</p>
        <p>Además, puedes <b>conversar en lenguaje natural</b>. Hay dos formas de mejorar el chat, de más sencilla a más potente:</p>
        <ol class="ciencia-puntos">
          <li><b>IA del navegador</b> (abajo): gratis, sin clave y sin salir del dispositivo. Solo en Chrome de escritorio.</li>
          <li><b>Tu propia clave</b> de OpenAI, Gemini, Claude… Funciona en cualquier dispositivo, pero tiene coste por uso.</li>
        </ol>
        <p class="tenue">Si configuras una clave, esa manda; si no, se usa la IA del navegador cuando existe; y si no, el motor local. En cualquier caso, nada cambia en tu programa sin tu permiso.</p>
      </div>
      ${tarjetaNano()}
      <form id="formCoachIA" class="tarjeta">
        <h2>🔑 Tu clave de API</h2>
        <label class="campo">Proveedor
          <select name="proveedor">
            <option value="">— Sin clave (usa la IA del navegador o el motor local) —</option>
            ${Object.entries(PROVEEDORES).map(([k, p]) => `<option value="${k}" ${cfg.proveedor === k ? 'selected' : ''}>${p.icono} ${esc(p.nombre)}</option>`).join('')}
          </select>
        </label>
        <label class="campo">Clave de la API
          <span class="clave-fila">
            <input type="password" name="clave" value="${esc(cfg.clave)}" placeholder="${prov ? esc(prov.claveEjemplo) : 'Pega aquí tu clave'}" autocomplete="off" spellcheck="false">
            <button type="button" class="icono" data-a="verClave" data-f="clave" aria-label="Mostrar u ocultar la clave">${ICO_OJO}</button>
          </span>
        </label>
        <label class="campo">Modelo
          <input type="text" name="modelo" list="modelosIA" value="${esc(cfg.modelo)}" placeholder="${prov ? esc(prov.defecto) : 'modelo'}" autocomplete="off" spellcheck="false">
          <datalist id="modelosIA">${prov ? prov.modelos.map(m => `<option value="${esc(m)}"></option>`).join('') : ''}</datalist>
        </label>
        ${prov ? `<p class="tenue">Consigue tu clave en <a href="${prov.claveUrl}" target="_blank" rel="noopener">${esc(prov.nombre)}</a>. El modelo se puede escribir a mano.</p>` : ''}
        <div class="botones">
          <button class="btn" type="submit">Guardar</button>
          ${cfg.proveedor && cfg.clave ? '<button class="btn sec" type="button" data-a="coachIAProbar">Probar conexión</button>' : ''}
          ${cfg.proveedor ? '<button class="btn peligro" type="button" data-a="coachIABorrar">Quitar la clave</button>' : ''}
        </div>
        ${ok ? `<p class="aviso-ia ${ok.ok ? 'ok' : 'mal'}">${ok.ok ? '✅ Funciona: el modelo ha respondido.' : `⚠️ ${esc(ok.error)}`}</p>` : ''}
      </form>
      <p class="tenue">Tu clave se guarda <b>solo en este navegador</b>. No forma parte de tus datos, no se exporta y no se comparte. DANTAL no tiene servidor propio: tus preguntas van directamente del navegador al proveedor que elijas. Las claves son personales y pueden tener coste por uso.</p>
      <p class="tenue">Estado actual: <b>${motor.tipo === 'clave' ? `IA real (${esc(motor.nombre)})` : motor.tipo === 'navegador' ? 'IA del navegador' : 'motor local'}</b>.</p>
    `,
  });
}

// Botón flotante para abrir el coach desde cualquier pantalla principal.
function coachFab(tab) {
  const oculto = !estado.plan || ['sesion', 'bienvenida', 'login', 'recuperar', 'coach'].includes(tab);
  let fab = $('#coachFab');
  if (oculto) { if (fab) fab.remove(); return; }
  if (!fab) {
    fab = document.createElement('button');
    fab.id = 'coachFab';
    fab.className = 'coach-fab';
    fab.dataset.a = 'ir';
    fab.dataset.v = 'coach';
    fab.title = 'Coach DANTAL';
    fab.setAttribute('aria-label', 'Abrir el coach DANTAL');
    fab.innerHTML = '<span aria-hidden="true">🧠</span>';
    document.body.appendChild(fab);
  }
}

// Tarjeta resumen del coach para la pantalla de Hoy.
function tarjetaCoach() {
  const ctx = coachContexto();
  const sug = sugerenciasSemana(ctx).find(x => !ui.coachIgnorados.includes(x.id));
  const motor = motorCoach();
  const texto = sug ? `${sug.icono} ${esc(sug.texto)}`
    : ctx.sesiones ? `Llevas ${ctx.sesiones} sesiones y ${ctx.racha} semanas de racha. Pregúntame el cuánto y el porqué.`
      : 'Te explico cuánto entrenar y por qué, y adapto tus cargas según cómo vas.';
  const chip = motor.tipo === 'clave' ? 'IA real conectada'
    : motor.tipo === 'navegador' ? 'IA del navegador · gratis' : 'Siempre disponible';
  return `<a class="tarjeta enlace-tarjeta" href="#coach">
    <div class="fila"><h2>🧠 Coach DANTAL</h2><span class="chev">›</span></div>
    <p class="tenue">${texto}</p>
    <span class="chip-mini ${motor.tipo === 'local' ? 'mudo' : 'ok'}">${chip}</span>
  </a>`;
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
    ${!s.pausado ? panelCoach(pos) : ''}
    ${pos && !s.pausado ? guiado(pos) : ''}
    ${!pos ? `<div class="hero ok"><h2>¡Todas las series hechas! 💪</h2><button class="btn" data-a="terminar">Terminar sesión</button></div>` : ''}
    <div class="fila"><h2>Ejercicios</h2><button class="enlace" data-a="verLista">${ui.listaSesion ? 'Ocultar series' : 'Ver y editar series'}</button></div>
    ${s.ejercicios.map((e, i) => {
      const ej = porId[e.id];
      const abierto = videoAbierto(ej);
      return `
      <div class="tarjeta ${pos?.i === i ? 'activo' : ''} ${e.series.every(r => r.hecho) ? 'completo' : ''}">
        <div class="fila">
          ${iconoEjercicio(ej)}
          <div><button class="enlace fuerte" data-a="detalle" data-id="${e.id}">${esc(nombreEj(e.id))}</button>
            ${e.metodo !== 'normal' ? `<span class="chip-mini alt">${METODOS[e.metodo].nombre}</span>` : ''}<br>
            <span class="tenue">${e.series.filter(r => r.hecho).length}/${e.series.length} series · ${e.metodo === 'tabata' ? 'Tabata' : objetivoTxt(e)}</span></div>
          <div class="acciones">
            ${pos && pos.i !== i && e.series.some(r => !r.hecho) ? `<button class="icono" title="Hacer este ejercicio ahora" data-a="irEj" data-i="${i}">▶</button>` : ''}
            ${e.series.some(r => r.hecho) ? '' : `<button class="icono" title="Cambiar ejercicio" data-a="cambiarSes" data-i="${i}">⇄</button>`}
          </div>
        </div>
        ${abierto ? playerVideo(ej) : ''}
        ${ui.listaSesion ? tablaSeries(e, i) : ''}
      </div>`;
    }).join('')}
    <button class="btn" data-a="terminar">Terminar sesión</button>
    <a class="btn sec" href="#sesion/ciencia">🧠 Entender esta sesión</a>
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
      ${grupo('Cuerpo y nutrición',
        celda('seguimiento/pasos', '👟', 'Actividad diaria', 'Pasos, distancia y calorías del día', 'azul', (estado.actividad || []).length || '') +
        celda('seguimiento/medidas', '⚖️', 'Peso y medidas', 'Peso, grasa y perímetros en el tiempo', 'verde', (estado.medidas || []).length || '') +
        celda('seguimiento/nutricion', '🍎', 'Calorías y proteína', 'Gasto diario, macros, fibra y agua', 'naranja'))}
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

// =====================================================================
// Páginas: Peso, medidas y nutrición
// =====================================================================
const MEDIDAS_CAMPOS = {
  peso: { nombre: 'Peso', unidad: 'kg', paso: 0.1, min: 20, max: 400 },
  grasa: { nombre: 'Grasa corporal', unidad: '%', paso: 0.1, min: 1, max: 75 },
  cintura: { nombre: 'Cintura', unidad: 'cm', paso: 0.5, min: 30, max: 250 },
  pecho: { nombre: 'Pecho', unidad: 'cm', paso: 0.5, min: 30, max: 250 },
  cadera: { nombre: 'Cadera', unidad: 'cm', paso: 0.5, min: 30, max: 250 },
  brazo: { nombre: 'Brazo', unidad: 'cm', paso: 0.5, min: 10, max: 100 },
  muslo: { nombre: 'Muslo', unidad: 'cm', paso: 0.5, min: 20, max: 150 },
};

const medidasDe = () => (estado.medidas || []).slice().sort((a, b) => a.fecha.localeCompare(b.fecha));

function valoresMedida(campo) {
  return medidasDe()
    .filter(m => m[campo] != null && m[campo] !== '')
    .map(m => ({ fecha: m.fecha, v: Number(m[campo]) }))
    .filter(p => Number.isFinite(p.v));
}
const ultimaMedida = campo => valoresMedida(campo).pop() || null;
const ultimoPeso = () => ultimaMedida('peso');
const fmtMedida = (v, campo) => v == null ? '—' : `${fmtDec(v)} ${MEDIDAS_CAMPOS[campo].unidad}`;

function fmtDeltaMedida(d, campo) {
  if (d == null) return '—';
  if (Math.abs(d) < 0.05) return `0 ${MEDIDAS_CAMPOS[campo].unidad}`;
  return `${d > 0 ? '+' : '−'}${fmtDec(Math.abs(d))} ${MEDIDAS_CAMPOS[campo].unidad}`;
}

function cambioMedida(campo, dias = null) {
  const p = valoresMedida(campo);
  if (p.length < 2) return null;
  let base = p[0];
  if (dias != null) {
    const corte = sumarDias(hoy(), -dias);
    const anteriores = p.filter(x => x.fecha <= corte);
    if (!anteriores.length) return null;
    base = anteriores[anteriores.length - 1];
  }
  return p[p.length - 1].v - base.v;
}

function notaPesoHTML(n, ult) {
  if (!ult) return 'Aún no tienes un peso registrado. Escríbelo o <a class="enlace" href="#seguimiento/medidas">añádelo en Peso y medidas</a>.';
  if (n.peso == null) return `Usando tu último registro de peso (${fmtCorta(ult.fecha)}). Si escribes otro, se usará el tuyo.`;
  if (Math.abs(n.peso - ult.v) > 0.05) return `Peso manual. Tu último registro es <b>${fmtMedida(ult.v, 'peso')}</b> · <button type="button" class="enlace" data-a="usarUltimoPeso">Usar el último</button>`;
  return `Usando tu último registro (${fmtCorta(ult.fecha)}).`;
}

function segMedidas() {
  let edit = ui.medidaEdit ? (estado.medidas || []).find(m => m.fecha === ui.medidaEdit) : null;
  if (ui.medidaEdit && !edit) ui.medidaEdit = null;
  const lista = medidasDe().slice().reverse();
  const fechaForm = edit?.fecha || hoy();
  const valorForm = c => edit && edit[c] != null ? edit[c] : '';
  const ultPeso = ultimoPeso();
  const ultGrasa = ultimaMedida('grasa');
  const ultCintura = ultimaMedida('cintura');
  const cambioPeso = cambioMedida('peso');
  const cambio30 = cambioMedida('peso', 30);
  return pagina({
    titulo: 'Peso y medidas', padre: 'seguimiento', sub: 'Tu evolución corporal, sin servidores ni cuentas',
    cuerpo: `
      <div class="tiles cuatro">
        ${tile('⚖️', ultPeso ? fmtDec(ultPeso.v) : '—', 'kg · peso actual', 'verde')}
        ${tile('📉', ultGrasa ? `${fmtDec(ultGrasa.v)} %` : '—', 'grasa corporal', 'violeta')}
        ${tile('📏', ultCintura ? `${fmtDec(ultCintura.v)} cm` : '—', 'cintura', 'azul')}
        ${tile('🗓️', lista.length, lista.length === 1 ? 'registro' : 'registros', 'amarillo')}
      </div>
      ${cambioPeso != null || cambio30 != null ? `<p class="tenue centro">
        ${cambioPeso != null ? `Peso: <b>${fmtDeltaMedida(cambioPeso, 'peso')}</b> desde el primer registro` : ''}
        ${cambioPeso != null && cambio30 != null ? ' · ' : ''}
        ${cambio30 != null ? `<b>${fmtDeltaMedida(cambio30, 'peso')}</b> en los últimos 30 días` : ''}
      </p>` : ''}
      <div class="tarjeta">
        <div class="fila chart-cab">
          <h2>📈 Evolución</h2>
          <select class="sel-mini" data-a="metrica" aria-label="Dato que quieres ver en la gráfica">
            ${Object.entries(MEDIDAS_CAMPOS).map(([k, c]) => `<option value="${k}" ${ui.metricaMedida === k ? 'selected' : ''}>${c.nombre}</option>`).join('')}
          </select>
        </div>
        <div id="graficaMedidas"></div>
      </div>
      <form id="formMedida" class="tarjeta" novalidate>
        <div class="fila">
          <h2>${edit ? '✏️ Editar medición' : '➕ Nueva medición'}</h2>
          ${edit ? '<button type="button" class="enlace" data-a="cancelarMedida">Cancelar</button>' : ''}
        </div>
        <p class="tenue">${edit ? `Editando el ${fmtCorta(edit.fecha)}.` : 'Rellena solo lo que hayas medido; los campos vacíos se ignoran.'}</p>
        <label class="campo">Fecha<input type="date" name="fecha" value="${fechaForm}" max="${hoy()}" ${edit ? 'disabled' : ''} required></label>
        <div class="medida-grid">
          ${Object.entries(MEDIDAS_CAMPOS).map(([k, c]) => `<label class="campo"><span>${c.nombre} <small class="tenue">(${c.unidad})</small></span>
            <input type="number" name="${k}" inputmode="decimal" step="${c.paso}" min="${c.min}" max="${c.max}" value="${valorForm(k)}" placeholder="—"></label>`).join('')}
        </div>
        <label class="campo">Nota (opcional)<input type="text" name="nota" maxlength="90" value="${esc(edit?.nota || '')}" placeholder="En ayunas, después de entrenar…"></label>
        <button class="btn" type="submit">${edit ? 'Guardar cambios' : 'Guardar medición'}</button>
      </form>
      ${lista.length ? `<div class="tarjeta">
        <div class="fila"><h2>🗂️ Historial</h2><span class="tenue">${lista.length} ${lista.length === 1 ? 'registro' : 'registros'}</span></div>
        ${lista.map(m => `<div class="medida-item">
          <div class="fila"><b>${fmtCorta(m.fecha)}</b><div class="acciones">
            <button class="icono peq" data-a="editarMedida" data-f="${m.fecha}" title="Editar esta medición">✎</button>
            <button class="icono peq" data-a="borrarMedida" data-f="${m.fecha}" title="Borrar esta medición">🗑️</button>
          </div></div>
          <div class="series-chips">${Object.entries(MEDIDAS_CAMPOS).filter(([k]) => m[k] != null && m[k] !== '').map(([k, c]) => `<span><small>${c.nombre}</small>${fmtDec(m[k])} ${c.unidad}</span>`).join('')}</div>
          ${m.nota ? `<p class="tenue nota-medida">${esc(m.nota)}</p>` : ''}
        </div>`).join('')}
      </div>` : ''}
      <a class="tarjeta enlace-tarjeta" href="#seguimiento/nutricion">
        <div class="fila"><div><h2>🍎 Calorías y proteína</h2><p class="tenue">Calcula tu gasto diario y los macros con tu peso actual.</p></div><span class="chev">›</span></div>
      </a>
      <a class="tarjeta enlace-tarjeta" href="#ajustes/salud">
        <div class="fila"><div><h2>📥 Importar datos de salud</h2><p class="tenue">Trae tu peso y medidas desde otra app (CSV o JSON).</p></div><span class="chev">›</span></div>
      </a>
      <p class="tenue">Consejo: mide siempre en las mismas condiciones (por la mañana, en ayunas y con la misma cinta) para que la tendencia sea fiable.</p>
    `,
  });
}

// =====================================================================
// Páginas: actividad diaria (pasos, distancia y calorías)
// =====================================================================
const ACTIVIDAD_CAMPOS = {
  pasos: { nombre: 'Pasos', unidad: 'pasos', min: 0, max: 200000, paso: 1 },
  distancia: { nombre: 'Distancia', unidad: 'km', min: 0, max: 500, paso: 0.1 },
  calorias: { nombre: 'Calorías', unidad: 'kcal', min: 0, max: 20000, paso: 1 },
  minutos: { nombre: 'Minutos activos', unidad: 'min', min: 0, max: 1440, paso: 1 },
};

const actividadDe = () => (estado.actividad || []).slice().sort((a, b) => a.fecha.localeCompare(b.fecha));
const diaActividad = f => (estado.actividad || []).find(a => a.fecha === f) || null;
const ultimosDias = n => Array.from({ length: n }, (_, i) => sumarDias(hoy(), i - (n - 1)));
const fmtFechaHora = iso => { const d = new Date(iso); return isNaN(d) ? '' : `${d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`; };
const esEntero = k => k === 'pasos' || k === 'calorias' || k === 'minutos';
const fmtActividad = (k, v) => esEntero(k) ? fmtNum(v) : fmtDec(v);

function segPasos() {
  intentarSyncAutomatico();
  const hoyF = hoy();
  const lista = actividadDe();
  const hoyD = diaActividad(hoyF);
  const conDatos = ultimosDias(7).map(diaActividad).filter(Boolean);
  const media = conDatos.length ? Math.round(conDatos.reduce((t, d) => t + (d.pasos || 0), 0) / conDatos.length) : 0;
  const mejor = lista.reduce((m, d) => Math.max(m, d.pasos || 0), 0);
  const total = lista.reduce((t, d) => t + (d.pasos || 0), 0);
  let edit = ui.pasoEdit ? lista.find(d => d.fecha === ui.pasoEdit) : null;
  if (ui.pasoEdit && !edit) ui.pasoEdit = null;
  const v = k => edit && edit[k] != null ? edit[k] : '';
  const recientes = lista.slice().reverse().slice(0, 30);
  return pagina({
    titulo: 'Actividad diaria', padre: 'seguimiento', sub: 'Pasos, distancia y calorías, día a día',
    cuerpo: `
      <div class="tiles cuatro">
        ${tile('👟', hoyD && hoyD.pasos != null ? fmtNum(hoyD.pasos) : '—', 'pasos hoy', 'azul')}
        ${tile('📊', media ? fmtNum(media) : '—', 'media 7 días', 'violeta')}
        ${tile('🏅', mejor ? fmtNum(mejor) : '—', 'mejor día', 'amarillo')}
        ${tile('🗓️', lista.length, lista.length === 1 ? 'día registrado' : 'días registrados', 'verde')}
      </div>
      <div class="tarjeta">
        <div class="fila"><h2>📈 Últimos 14 días</h2><span class="tenue">${total ? `${fmtNum(total)} pasos en total` : ''}</span></div>
        <div id="graficaPasos"></div>
      </div>
      ${estado.saludUrl ? `<div class="tarjeta">
        <div class="fila"><div><h2>🔁 Sincronización automática</h2><p class="tenue">${estado.saludSync ? `Última vez: ${fmtFechaHora(estado.saludSync)}` : 'Todavía no se ha sincronizado'}</p></div>
        <button class="btn sec" data-a="syncSalud">🔄 Sincronizar</button></div>
      </div>` : `<a class="tarjeta enlace-tarjeta" href="#ajustes/salud">
        <div class="fila"><div><h2>🔁 Traer los pasos desde otra app</h2><p class="tenue">Conecta una hoja de Google y DANTAL los leerá solo.</p></div><span class="chev">›</span></div>
      </a>`}
      <form id="formPasos" class="tarjeta" novalidate>
        <div class="fila"><h2>${edit ? '✏️ Editar día' : '➕ Añadir día'}</h2>${edit ? '<button type="button" class="enlace" data-a="cancelarPaso">Cancelar</button>' : ''}</div>
        <p class="tenue">${edit ? `Editando el ${fmtCorta(edit.fecha)}.` : 'Anota lo que te marque el reloj o el móvil. Solo hacen falta los pasos.'}</p>
        <label class="campo">Fecha<input type="date" name="fecha" value="${edit?.fecha || hoyF}" max="${hoyF}" ${edit ? 'disabled' : ''} required></label>
        <div class="medida-grid">
          ${Object.entries(ACTIVIDAD_CAMPOS).map(([k, c]) => `<label class="campo"><span>${c.nombre} <small class="tenue">(${c.unidad})</small></span>
            <input type="number" name="${k}" inputmode="numeric" step="${c.paso}" min="${c.min}" max="${c.max}" value="${v(k)}" placeholder="—"></label>`).join('')}
        </div>
        <button class="btn" type="submit">${edit ? 'Guardar cambios' : 'Guardar día'}</button>
      </form>
      ${recientes.length ? `<div class="tarjeta">
        <div class="fila"><h2>🗂️ Días registrados</h2><span class="tenue">${lista.length} en total</span></div>
        ${recientes.map(d => `<div class="medida-item">
          <div class="fila"><b>${fmtCorta(d.fecha)}</b><div class="acciones">
            <button class="icono peq" data-a="editarPaso" data-f="${d.fecha}" title="Editar este día">✎</button>
            <button class="icono peq" data-a="borrarPaso" data-f="${d.fecha}" title="Borrar este día">🗑️</button>
          </div></div>
          <div class="series-chips">${Object.entries(ACTIVIDAD_CAMPOS).filter(([k]) => d[k] != null && d[k] !== '').map(([k, c]) => `<span><small>${c.nombre}</small>${fmtActividad(k, d[k])} ${c.unidad}</span>`).join('')}</div>
        </div>`).join('')}
      </div>` : ''}
      <p class="tenue">🔒 Estos datos se guardan solo en tu dispositivo. Una web no puede leer Google Health directamente, así que los pasos se traen importando un archivo o conectando una hoja publicada.</p>
    `,
  });
}

function guardarPasos(f) {
  const fecha = ui.pasoEdit || String(f.get('fecha') || hoy());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha > hoy()) { toast('Elige una fecha válida que no sea futura.'); return; }
  const datos = { fecha };
  let alguno = false;
  for (const [k, c] of Object.entries(ACTIVIDAD_CAMPOS)) {
    const raw = String(f.get(k) ?? '').trim();
    if (raw === '') { datos[k] = null; continue; }
    const num = Number(raw);
    if (!Number.isFinite(num)) { toast(`Revisa el campo ${c.nombre.toLowerCase()}.`); return; }
    if (num < c.min || num > c.max) { toast(`${c.nombre}: usa un valor entre ${c.min} y ${c.max} ${c.unidad}.`); return; }
    datos[k] = esEntero(k) ? Math.round(num) : Math.round(num * 10) / 10;
    alguno = true;
  }
  if (!alguno) { toast('Anota al menos los pasos del día.'); return; }
  const lista = estado.actividad || (estado.actividad = []);
  const idx = lista.findIndex(a => a.fecha === fecha);
  const actualizada = idx !== -1;
  if (actualizada) lista[idx] = { ...lista[idx], ...datos };
  else lista.push(datos);
  lista.sort((a, b) => a.fecha.localeCompare(b.fecha));
  ui.pasoEdit = null;
  guardar(); render();
  toast(actualizada ? 'Día actualizado' : 'Día guardado');
}

function dibujarGraficaPasos() {
  const cont = $('#graficaPasos');
  if (!cont) return;
  const dias = ultimosDias(14);
  const mapa = new Map(actividadDe().map(d => [d.fecha, d]));
  const vals = dias.map(f => Number(mapa.get(f)?.pasos || 0));
  if (!vals.some(v => v > 0)) {
    cont.innerHTML = `<p class="tenue centro">Aún no hay pasos. Añádelos a mano o conecta una hoja para verlos aquí.</p>`;
    return;
  }
  const W = 320, H = 150, P = 28, base = H - P;
  const max = Math.max(1000, ...vals);
  const n = dias.length;
  const ancho = (W - 2 * P) / n;
  const hoyF = hoy();
  cont.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" class="svg-graf" role="img" aria-label="Pasos de los últimos 14 días">
      <line x1="${P}" y1="${base}" x2="${W - P}" y2="${base}" class="eje"/>
      <text x="${P - 4}" y="26" text-anchor="end" class="etq">${fmtNum(max)}</text>
      ${vals.map((v, i) => {
        const h = v ? Math.max(2, (base - 16) * (v / max)) : 0;
        const x = P + i * ancho + ancho * 0.16, w = ancho * 0.68;
        return `<rect class="barra ${dias[i] === hoyF ? 'hoy' : ''}" x="${x.toFixed(1)}" y="${(base - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="2"><title>${fmtCorta(dias[i])}: ${fmtNum(v)} pasos</title></rect>`;
      }).join('')}
      <text x="${P}" y="${H - 6}" class="etq">${fmtDia(dias[0])}</text>
      <text x="${W - P}" y="${H - 6}" text-anchor="end" class="etq">${fmtDia(dias[n - 1])}</text>
    </svg>`;
}

// ------------------ Sincronización automática ------------------------
let syncEnCurso = false;
let saludIntento = 0;

// Intenta traer datos de la dirección guardada, como mucho una vez por hora.
function intentarSyncAutomatico() {
  if (!estado.saludUrl) return;
  const ahora = Date.now();
  const ultima = Date.parse(estado.saludSync || '') || 0;
  if (ahora - saludIntento < 3600000 || ahora - ultima < 3600000) return;
  saludIntento = ahora;
  sincronizarSalud({ silencioso: true });
}

async function sincronizarSalud({ silencioso = false } = {}) {
  const url = String(estado.saludUrl || '').trim();
  if (!url) { if (!silencioso) toast('Primero pega la dirección de tu hoja o archivo.'); return; }
  if (syncEnCurso) return;
  syncEnCurso = true;
  try {
    const resp = await fetch(url, { cache: 'no-store' });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const r = interpretarSalud(await resp.text(), url);
    if (!r.ok) { if (!silencioso) toast(r.error, { ms: 7000 }); return; }
    const antes = JSON.stringify(estado);
    const m = fusionarMedidas(estado.medidas || (estado.medidas = []), r.filas || []);
    const a = fusionarActividad(estado.actividad || (estado.actividad = []), r.actividad || []);
    estado.saludSync = new Date().toISOString();
    guardar();
    const cambios = m.nuevas + m.completadas + a.nuevas + a.actualizadas;
    if (!silencioso || cambios) {
      render();
      toast(cambios
        ? `Sincronizado: ${a.nuevas} ${a.nuevas === 1 ? 'día nuevo' : 'días nuevos'} de actividad y ${m.nuevas} de medidas`
        : 'Todo estaba al día',
        { accion: 'Deshacer', alPulsar: () => { estado = JSON.parse(antes); guardar(); render(); } });
    }
  } catch {
    if (!silencioso) toast('No he podido leer esa dirección. Comprueba que la hoja esté publicada y que tengas internet.', { ms: 7000 });
  } finally { syncEnCurso = false; }
}

function dibujarGraficaMedidas() {
  const cont = $('#graficaMedidas');
  if (!cont) return;
  const campo = MEDIDAS_CAMPOS[ui.metricaMedida] ? ui.metricaMedida : 'peso';
  const puntos = valoresMedida(campo);
  const meta = MEDIDAS_CAMPOS[campo];
  if (!puntos.length) {
    cont.innerHTML = `<p class="tenue centro">Aún no hay datos de ${meta.nombre.toLowerCase()}. Anota una medición para ver la evolución.</p>`;
    return;
  }
  const W = 320, H = 150, P = 30;
  const t0 = deIso(puntos[0].fecha).getTime();
  const t1 = deIso(puntos[puntos.length - 1].fecha).getTime();
  const x = p => puntos.length === 1 ? W / 2 : P + (deIso(p.fecha).getTime() - t0) / (t1 - t0 || 1) * (W - 2 * P);
  const vals = puntos.map(p => p.v);
  const min = Math.min(...vals), max = Math.max(...vals);
  const margen = (max - min) || Math.max(1, Math.abs(max) * 0.05);
  const yMin = min - margen * 0.15, yMax = max + margen * 0.15;
  const y = v => H - P - (v - yMin) / ((yMax - yMin) || 1) * (H - 2 * P);
  const linea = puntos.map((p, i) => `${i ? 'L' : 'M'}${x(p).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const area = `${linea} L${x(puntos[puntos.length - 1]).toFixed(1)},${H - P} L${x(puntos[0]).toFixed(1)},${H - P} Z`;
  const ult = puntos[puntos.length - 1];
  const cambio = ult.v - puntos[0].v;
  cont.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" class="svg-graf" role="img" aria-label="Evolución de ${meta.nombre}">
      <defs><linearGradient id="grM" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--acento)" stop-opacity=".35"/><stop offset="1" stop-color="var(--acento)" stop-opacity="0"/></linearGradient></defs>
      <line x1="${P}" y1="${H - P}" x2="${W - P}" y2="${H - P}" class="eje"/>
      <text x="${P - 4}" y="${y(max) + 4}" text-anchor="end" class="etq">${fmtDec(max)}</text>
      <text x="${P - 4}" y="${y(min) + 4}" text-anchor="end" class="etq">${fmtDec(min)}</text>
      <path d="${area}" fill="url(#grM)"/>
      <path d="${linea}" class="trazo"/>
      ${puntos.map((p, i) => `<circle cx="${x(p).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="${i === puntos.length - 1 ? 5 : 3.5}" class="punto ${i === puntos.length - 1 ? 'rec' : ''}"><title>${fmtCorta(p.fecha)}: ${fmtDec(p.v)} ${meta.unidad}</title></circle>`).join('')}
      ${puntos.length === 1
        ? `<text x="${W / 2}" y="${H - 6}" text-anchor="middle" class="etq">${fmtDia(puntos[0].fecha)}</text>`
        : `<text x="${P}" y="${H - 6}" class="etq">${fmtDia(puntos[0].fecha)}</text><text x="${W - P}" y="${H - 6}" text-anchor="end" class="etq">${fmtDia(ult.fecha)}</text>`}
    </svg>
    <div class="stats mini">
      <div><b>${fmtDec(ult.v)}</b><span>actual · ${meta.unidad}</span></div>
      <div><b>${fmtDeltaMedida(cambio, campo)}</b><span>desde el inicio</span></div>
      <div><b>${fmtDec(min)}–${fmtDec(max)}</b><span>rango · ${meta.unidad}</span></div>
    </div>
    <p class="tenue">${puntos.length} ${puntos.length === 1 ? 'medición' : 'mediciones'} de ${meta.nombre.toLowerCase()}.</p>`;
}

// Nutrición: gasto energético y reparto de macronutrientes.
const ACTIVIDADES = {
  sedentario: { nombre: 'Sedentario', factor: 1.2, desc: 'Poco o nada de ejercicio' },
  ligero: { nombre: 'Ligero', factor: 1.375, desc: '1-3 días de entrenamiento por semana' },
  moderado: { nombre: 'Moderado', factor: 1.55, desc: '3-5 días de entrenamiento por semana' },
  alto: { nombre: 'Alto', factor: 1.725, desc: '6-7 días de entrenamiento por semana' },
  muyalto: { nombre: 'Muy alto', factor: 1.9, desc: 'Trabajo físico o doble sesión' },
};
const OBJETIVOS_NUTRI = {
  perder: { nombre: 'Perder grasa', factor: -0.2, prot: [2, 2.4], desc: 'Déficit moderado con proteína alta para conservar músculo.' },
  recomp: { nombre: 'Recomposición', factor: -0.1, prot: [1.8, 2.2], desc: 'Déficit suave: fuerza + proteína para cambiar composición.' },
  mantener: { nombre: 'Mantener', factor: 0, prot: [1.6, 2], desc: 'Mantén tu peso y mejora el rendimiento.' },
  ganar: { nombre: 'Ganar músculo', factor: 0.1, prot: [1.8, 2.2], desc: 'Superávit pequeño para ganar músculo sin grasa de más.' },
};

function nutricionDeForm(f) {
  const actividad = String(f.get('actividad') || '');
  const objetivo = String(f.get('objetivo') || '');
  return {
    sexo: f.get('sexo') === 'mujer' ? 'mujer' : 'hombre',
    edad: Number(f.get('edad')) || 0,
    altura: Number(f.get('altura')) || 0,
    peso: String(f.get('peso') || '').trim() === '' ? null : Number(f.get('peso')),
    actividad: ACTIVIDADES[actividad] ? actividad : 'moderado',
    objetivo: OBJETIVOS_NUTRI[objetivo] ? objetivo : 'mantener',
  };
}

function leerNutricion() {
  const form = $('#formNutricion');
  if (!form) return null;
  return nutricionDeForm(new FormData(form));
}

function guardarNutricion() {
  const n = leerNutricion();
  if (!n) return;
  estado.nutricion = n;
  guardar();
}

function guardarMedida(f) {
  const editando = ui.medidaEdit;
  const fecha = editando || String(f.get('fecha') || hoy());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha > hoy()) { toast('Elige una fecha válida que no sea futura.'); return; }
  const datos = { fecha, nota: String(f.get('nota') || '').trim().slice(0, 90) };
  let alguno = false;
  for (const [k, c] of Object.entries(MEDIDAS_CAMPOS)) {
    const raw = String(f.get(k) ?? '').trim();
    if (raw === '') { datos[k] = null; continue; }
    const v = Number(raw);
    if (!Number.isFinite(v)) { toast(`Revisa el campo ${c.nombre.toLowerCase()}.`); return; }
    if (v < c.min || v > c.max) { toast(`${c.nombre}: usa un valor entre ${c.min} y ${c.max} ${c.unidad}.`); return; }
    datos[k] = Math.round(v * 10) / 10;
    alguno = true;
  }
  if (!alguno) { toast('Anota al menos un dato para guardar la medición.'); return; }
  const lista = estado.medidas || (estado.medidas = []);
  const idx = lista.findIndex(m => m.fecha === fecha);
  const actualizada = idx !== -1;
  if (actualizada) lista[idx] = { ...lista[idx], ...datos };
  else lista.push(datos);
  lista.sort((a, b) => a.fecha.localeCompare(b.fecha));
  ui.medidaEdit = null;
  guardar(); render();
  toast(actualizada ? 'Medición actualizada' : 'Medición guardada');
}

function formNutricionHTML() {
  const n = { ...NUTRICION_DEF, ...(estado.nutricion || {}) };
  const ult = ultimoPeso();
  const peso = n.peso ?? ult?.v ?? '';
  return `<form id="formNutricion" class="tarjeta" novalidate>
    <div class="nutri-grid">
      <label class="campo">Sexo<select name="sexo" data-a="nutricion">
        <option value="hombre" ${n.sexo === 'hombre' ? 'selected' : ''}>Hombre</option>
        <option value="mujer" ${n.sexo === 'mujer' ? 'selected' : ''}>Mujer</option>
      </select></label>
      <label class="campo">Edad<input type="number" name="edad" inputmode="numeric" min="14" max="100" value="${n.edad || 30}" data-a="nutricion"></label>
      <label class="campo">Altura (cm)<input type="number" name="altura" inputmode="numeric" min="120" max="230" value="${n.altura || 175}" data-a="nutricion"></label>
      <label class="campo">Peso (kg)<input type="number" name="peso" inputmode="decimal" step="0.1" min="30" max="400" value="${peso}" placeholder="—" data-a="nutricion"></label>
    </div>
    <div class="nutri-grid">
      <label class="campo">Actividad<select name="actividad" data-a="nutricion">
        ${Object.entries(ACTIVIDADES).map(([k, a]) => `<option value="${k}" ${n.actividad === k ? 'selected' : ''}>${a.nombre} · ${a.desc}</option>`).join('')}
      </select></label>
      <label class="campo">Objetivo<select name="objetivo" data-a="nutricion">
        ${Object.entries(OBJETIVOS_NUTRI).map(([k, o]) => `<option value="${k}" ${n.objetivo === k ? 'selected' : ''}>${o.nombre}</option>`).join('')}
      </select></label>
    </div>
    <p class="tenue" id="nutriPesoNota">${notaPesoHTML(n, ult)}</p>
    <p class="tenue">Los resultados se actualizan al escribir. Fórmula de Mifflin-St Jeor.</p>
  </form>`;
}

function segNutricion() {
  return pagina({
    titulo: 'Calorías y proteína', padre: 'seguimiento', sub: 'Gasto diario, macros, fibra, agua e IMC',
    cuerpo: `
      ${formNutricionHTML()}
      <div id="nutriResultados"></div>
      <div class="botones"><a class="btn sec" href="#seguimiento/medidas">⚖️ Registrar mi peso</a></div>
      <p class="tenue">Es una estimación, no consejo médico. Ajusta las calorías según tu evolución real: si en 2-3 semanas no cambia tu peso, mueve 100-200 kcal.</p>
    `,
  });
}

function actualizarNutricion() {
  const cont = $('#nutriResultados');
  if (!cont) return;
  const n = leerNutricion() || estado.nutricion;
  const ult = ultimoPeso();
  const nota = $('#nutriPesoNota');
  if (nota) nota.innerHTML = notaPesoHTML(n, ult);
  const kg = Number(n.peso) || 0;
  const cm = Number(n.altura) || 0;
  const edad = Number(n.edad) || 0;
  if (!kg || !cm || !edad) {
    cont.innerHTML = '<div class="tarjeta"><p class="tenue centro">Completa peso, altura y edad para ver el cálculo.</p></div>';
    return;
  }
  const act = ACTIVIDADES[n.actividad] || ACTIVIDADES.moderado;
  const obj = OBJETIVOS_NUTRI[n.objetivo] || OBJETIVOS_NUTRI.mantener;
  const bmr = 10 * kg + 6.25 * cm - 5 * edad + (n.sexo === 'mujer' ? -161 : 5);
  const tdee = bmr * act.factor;
  const kcal = Math.round(tdee * (1 + obj.factor));
  if (!Number.isFinite(kcal) || kcal <= 0) {
    cont.innerHTML = '<div class="tarjeta"><p class="tenue centro">Revisa los datos: el cálculo no sale con esos valores.</p></div>';
    return;
  }
  const protMin = Math.round(kg * obj.prot[0]);
  const protMax = Math.round(kg * obj.prot[1]);
  const protG = Math.round((protMin + protMax) / 2);
  const grasaG = Math.round(kcal * 0.25 / 9);
  const carbsG = Math.max(0, Math.round((kcal - protG * 4 - grasaG * 9) / 4));
  const fibraG = Math.round(kcal * 14 / 1000);
  const aguaL = Math.round((kg * 0.035 + 0.5) * 10) / 10;
  const imc = kg / Math.pow(cm / 100, 2);
  const imcCat = imc < 18.5 ? 'Bajo peso' : imc < 25 ? 'Normopeso' : imc < 30 ? 'Sobrepeso' : 'Obesidad';
  const signo = obj.factor > 0 ? '+' : obj.factor < 0 ? '−' : '';
  const ajuste = Math.abs(kcal - tdee);
  const exceso = protG * 4 + grasaG * 9 > kcal;
  cont.innerHTML = `
    <div class="tiles cuatro">
      ${tile('🔥', fmtNum(kcal), 'kcal al día', 'naranja')}
      ${tile('🥩', `${protG} g`, 'proteína', 'verde')}
      ${tile('⚖️', `${fmtDec(kg)} kg`, 'peso usado', 'azul')}
      ${tile('📊', imc.toFixed(1), imcCat.toLowerCase(), 'violeta')}
    </div>
    <div class="tarjeta">
      <h2>🔥 Cómo sale el número</h2>
      <div class="nutri-linea"><span>Tasa metabólica basal (TMB)</span><b>${fmtNum(bmr)} kcal</b></div>
      <div class="nutri-linea"><span>Gasto total · ${act.nombre}</span><b>${fmtNum(tdee)} kcal</b></div>
      <div class="nutri-linea destacada"><span>${obj.nombre}${obj.factor ? ` (${signo}${Math.abs(Math.round(obj.factor * 100))} %)` : ''}</span><b>${fmtNum(kcal)} kcal</b></div>
      <p class="tenue">${obj.desc}${obj.factor ? `<br>${obj.factor < 0 ? 'Déficit' : 'Superávit'} de ${fmtNum(ajuste)} kcal al día.` : ''}</p>
    </div>
    <div class="tarjeta">
      <h2>🍽️ Reparto diario</h2>
      <div class="tiles">
        <div class="tile"><span class="ic verde">🥩</span><b>${protG} g</b><small>proteína · ${obj.prot[0]}–${obj.prot[1]} g/kg</small></div>
        <div class="tile"><span class="ic amarillo">🥑</span><b>${grasaG} g</b><small>grasas · 25 % de las kcal</small></div>
        <div class="tile"><span class="ic azul">🍚</span><b>${carbsG} g</b><small>carbohidratos · el resto</small></div>
      </div>
      <div class="nutri-linea"><span>Rango de proteína</span><b>${protMin}–${protMax} g</b></div>
      <div class="nutri-linea"><span>Fibra orientativa</span><b>${fibraG} g</b></div>
      <div class="nutri-linea"><span>Agua orientativa</span><b>${aguaL} L</b></div>
      <div class="nutri-linea"><span>Proteína por comida (4 comidas)</span><b>${Math.round(protG / 4)} g</b></div>
      ${exceso ? '<p class="tenue">Con este objetivo, la proteína y la grasa ocupan casi todas las calorías: reduce un poco la grasa o elige un objetivo con más margen.</p>' : ''}
    </div>
    <div class="tarjeta">
      <h2>⚖️ IMC</h2>
      <p><b>${imc.toFixed(1)}</b> · ${imcCat}</p>
      <p class="tenue">El IMC es solo una referencia: no distingue masa muscular de grasa. Para valorar tu composición, usa también el peso, la cintura y las fotos.</p>
    </div>
  `;
}

// =====================================================================
// Páginas: Nutrición (diario, recetas, agua, asistente y objetivos)
// =====================================================================
const fechaLargaNutri = f => deIso(f).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

function resumenDia(fecha = diaNutri()) {
  const metas = metasNutricion();
  const consumo = macrosDia(fecha);
  const vasos = vasosDia(fecha);
  return { metas, consumo, vasos, aguaMl: vasos * VASO_ML, aguaMeta: metas ? metas.aguaMl : 0 };
}

function navegadorDiasNutri() {
  const f = diaNutri();
  return `<div class="fila nav-semana">
    <button class="icono" data-a="nutriDia" data-d="-1" aria-label="Día anterior">‹</button>
    <div class="centro"><b>${f === hoy() ? 'Hoy' : fmtCorta(f)}</b><br><span class="tenue">${fechaLargaNutri(f)}</span></div>
    <button class="icono" data-a="nutriDia" data-d="1" ${f >= hoy() ? 'disabled' : ''} aria-label="Día siguiente">›</button>
  </div>`;
}

function nutricion() {
  const f = diaNutri();
  const { metas, consumo, vasos, aguaMl, aguaMeta } = resumenDia(f);
  const kcalMeta = metas ? metas.kcal : 0;
  const restante = Math.max(0, kcalMeta - consumo.kcal);
  const comidas = comidasDia(f);
  return pagina({
    titulo: 'Nutrición', sub: MARCA.eslogan,
    cuerpo: `
      ${subnav(SUBNAV_NUTRICION, 'nutricion')}
      ${navegadorDiasNutri()}
      <div class="tiles cuatro">
        ${tile('🔥', fmtNum(consumo.kcal), kcalMeta ? `de ${fmtNum(kcalMeta)} kcal` : 'kcal registradas', 'naranja')}
        ${tile('🥩', `${Math.round(consumo.prot)} g`, metas ? `de ${metas.protG} g de proteína` : 'proteína', 'verde')}
        ${tile('💧', `${(aguaMl / 1000).toFixed(2)} L`, aguaMeta ? `de ${(aguaMeta / 1000).toFixed(1)} L` : 'agua', 'azul')}
        ${tile('🍽️', kcalMeta ? fmtNum(restante) : '—', kcalMeta ? (restante ? 'kcal disponibles' : 'objetivo cubierto') : 'sin objetivo', 'violeta')}
      </div>
      ${metas ? `<div class="tarjeta"><h2>📊 Macros del día</h2>${barrasMacros(consumo, metas)}
        <p class="tenue">${fmtNum(consumo.kcal)} kcal registradas de ${fmtNum(kcalMeta)}.</p></div>`
        : `<div class="tarjeta"><h2>Configura tus objetivos</h2><p class="tenue">Añade sexo, edad, altura y peso en <a class="enlace" href="#nutricion/objetivos">Objetivos</a> para ver tus metas diarias de calorías y macros.</p></div>`}
      <div class="fila"><h2>Comidas</h2><a class="enlace" href="#nutricion/ia">🤖 Asistente</a></div>
      ${Object.entries(COMIDAS).map(([k, c]) => bloqueComida(k, c, comidas[k] || [])).join('')}
      <a class="tarjeta enlace-tarjeta" href="#nutricion/recetas"><div class="fila"><div><h2>🍳 Recetas equilibradas</h2><p class="tenue">Añádelas a tu diario con un toque.</p></div><span class="chev">›</span></div></a>
      <p class="tenue">${vasos} ${vasos === 1 ? 'vaso' : 'vasos'} de agua (${VASO_ML} ml cada uno). <a class="enlace" href="#nutricion/hidratacion">Registrar agua</a></p>
    `,
  });
}

function bloqueComida(clave, c, entradas) {
  const macros = macrosComida(entradas);
  return `<div class="comida-bloque">
    <div class="fila"><h3>${c.icono} ${c.nombre}</h3><span class="kcal-comida">${fmtNum(macros.kcal)} kcal</span></div>
    ${entradas.length ? entradas.map((en, idx) => itemComida(en, clave, idx)).join('') : '<p class="tenue">Sin registros todavía.</p>'}
    <div class="botones">
      <button class="btn sec" data-a="addAlimento" data-comida="${clave}">＋ Alimento</button>
      <button class="btn sec" data-a="addReceta" data-comida="${clave}">🍳 Receta</button>
    </div>
  </div>`;
}

function itemComida(en, clave, idx) {
  const esReceta = en.tipo === 'receta';
  const receta = esReceta ? RECETAS.find(r => r.id === en.id) : null;
  const al = esReceta ? null : alimentoPorId(en.id);
  const macros = macrosEntrada(en);
  const nombre = esReceta ? (receta?.nombre || en.id) : (al?.nombre || en.id);
  const sub = esReceta ? `${fmtDec(en.racion || 1)} ${Number(en.racion || 1) === 1 ? 'ración' : 'raciones'}` : `${en.gramos} g`;
  return `<div class="alimento-item">
    <div class="ai-t"><b>${esc(nombre)}</b><small>${sub}</small></div>
    <div class="ai-m"><b>${fmtNum(macros.kcal)}</b><small>kcal · ${Math.round(macros.prot)} P</small></div>
    <div class="acciones">
      <button class="icono peq" data-a="editCantidad" data-comida="${clave}" data-i="${idx}" title="Cambiar cantidad">✎</button>
      <button class="icono peq" data-a="quitarComida" data-comida="${clave}" data-i="${idx}" title="Quitar">🗑️</button>
    </div>
  </div>`;
}

function listaAlimentosHTML() {
  const lista = buscarAlimentos(ui.nutriQ, ui.nutriCat);
  if (!lista.length) return '<p class="tenue centro">Sin resultados. Prueba con otra palabra.</p>';
  return lista.map(a => `<button class="celda" data-a="ponerAlimento" data-id="${a.id}">
    <span class="ic verde">🍽️</span>
    <span class="celda-t"><b>${esc(a.nombre)}</b><small>${a.porcion} g · ${fmtNum(a.kcal * a.porcion / 100)} kcal · ${fmtNum(a.prot * a.porcion / 100)} g proteína</small></span>
    <span class="chev">＋</span></button>`).join('');
}

// Vuelve a pintar la lista dentro del modal de alimentos (sin cerrarlo).
function refrescarListaAlimentos() {
  const cont = $('#listaAlimentos');
  if (!cont) return;
  cont.innerHTML = listaAlimentosHTML();
  document.querySelectorAll('#modal .chip[data-a="nutriCat"]').forEach(c =>
    c.classList.toggle('on', (c.dataset.m || '') === (ui.nutriCat || '')));
}

function elegirAlimento(comida) {
  ui.comidaSel = comida;
  ui.nutriQ = '';
  ui.nutriCat = '';
  modal(`<h2>${COMIDAS[comida].icono} Añadir a ${COMIDAS[comida].nombre}</h2>
    <div class="buscador"><span>🔍</span><input type="search" placeholder="Buscar alimento" data-a="nutriBuscar" class="buscar" aria-label="Buscar alimento"></div>
    <div class="chips scroll">
      <button class="chip ${!ui.nutriCat ? 'on' : ''}" data-a="nutriCat" data-m="">Todos</button>
      ${Object.entries(CATEGORIAS_ALIMENTO).map(([k, v]) => `<button class="chip ${ui.nutriCat === k ? 'on' : ''}" data-a="nutriCat" data-m="${k}">${v}</button>`).join('')}
    </div>
    <div id="listaAlimentos">${listaAlimentosHTML()}</div>`);
  setTimeout(() => $('#listaAlimentos')?.closest('.modal-cont')?.querySelector('input')?.focus(), 50);
}

function elegirReceta(comida) {
  ui.comidaSel = comida;
  modal(`<h2>${COMIDAS[comida].icono} Recetas para ${COMIDAS[comida].nombre}</h2>
    <div class="celdas">${RECETAS.map(r => {
      const t = resumenReceta(r).total;
      return `<button class="celda" data-a="ponerReceta" data-id="${r.id}">
        <span class="ic naranja">${r.icono}</span>
        <span class="celda-t"><b>${esc(r.nombre)}</b><small>${fmtNum(t.kcal)} kcal · ${Math.round(t.prot)} g proteína</small></span>
        <span class="chev">＋</span></button>`;
    }).join('')}</div>`);
}

function nutricionRecetas() {
  return pagina({
    titulo: 'Recetas', sub: 'Ideas equilibradas con sus macros',
    cuerpo: `
      ${subnav(SUBNAV_NUTRICION, 'nutricion/recetas')}
      ${RECETAS.map(r => {
        const t = resumenReceta(r).total;
        return `<a class="tarjeta enlace-tarjeta receta-card" href="#nutricion/receta/${r.id}">
          <div class="fila"><h2>${r.icono} ${esc(r.nombre)}</h2><span class="chev">›</span></div>
          <div class="receta-macros"><span>${fmtNum(t.kcal)} kcal</span><span>${Math.round(t.prot)} g P</span><span>${Math.round(t.carbs)} g C</span><span>${Math.round(t.grasa)} g G</span></div>
          <p class="tenue">${r.comidas.map(c => COMIDAS[c].nombre).join(' · ')}</p></a>`;
      }).join('')}
    `,
  });
}

function nutricionReceta(id) {
  const r = RECETAS.find(x => x.id === id);
  if (!r) return null;
  const res = resumenReceta(r);
  return pagina({
    titulo: esc(r.nombre), padre: 'nutricion/recetas', sub: r.comidas.map(c => COMIDAS[c].nombre).join(' · '),
    cuerpo: `
      <div class="tarjeta receta-card">
        <div class="receta-macros"><span>${fmtNum(res.total.kcal)} kcal</span><span>${Math.round(res.total.prot)} g proteína</span><span>${Math.round(res.total.carbs)} g hidratos</span><span>${Math.round(res.total.grasa)} g grasas</span><span>${Math.round(res.total.fibra)} g fibra</span></div>
        <h2>🧾 Ingredientes</h2>
        ${res.items.map(i => `<div class="alimento-item"><div class="ai-t"><b>${esc(i.alimento.nombre)}</b><small>${i.gramos} g</small></div><div class="ai-m"><b>${fmtNum(i.macros.kcal)}</b><small>kcal</small></div></div>`).join('')}
        <h2>👩‍🍳 Preparación</h2><ol class="pasos">${r.pasos.map(p => `<li>${esc(p)}</li>`).join('')}</ol>
      </div>
      <div class="tarjeta"><h2>Añadir a mi diario de hoy</h2>
        <div class="botones">${r.comidas.map(c => `<button class="btn sec" data-a="recetaA" data-receta="${r.id}" data-comida="${c}">＋ ${COMIDAS[c].icono} ${COMIDAS[c].nombre}</button>`).join('')}</div>
      </div>
    `,
  });
}

function nutricionAgua() {
  const f = diaNutri();
  const { vasos, aguaMl, aguaMeta } = resumenDia(f);
  const objetivo = aguaMeta || 2500;
  const nVasos = Math.max(8, Math.ceil(objetivo / VASO_ML));
  const pct = Math.min(100, Math.round(aguaMl / objetivo * 100));
  return pagina({
    titulo: 'Hidratación', sub: 'Agua del día',
    cuerpo: `
      ${subnav(SUBNAV_NUTRICION, 'nutricion/hidratacion')}
      ${navegadorDiasNutri()}
      <div class="tarjeta">
        <div class="fila"><h2>💧 ${(aguaMl / 1000).toFixed(2)} L</h2><span class="tenue">objetivo ${(objetivo / 1000).toFixed(1)} L · ${pct} %</span></div>
        <div class="macro-pista" style="margin:6px 0 14px"><i style="width:${pct}%"></i></div>
        <div class="agua-vasos">${Array.from({ length: nVasos }, (_, i) => `<button class="vaso-btn ${i < vasos ? 'lleno' : ''}" data-a="vaso" data-n="${i + 1}" aria-label="Vaso ${i + 1} de ${nVasos}"></button>`).join('')}</div>
        <div class="botones">
          <button class="btn sec" data-a="aguaMenos" ${vasos ? '' : 'disabled'}>− Un vaso</button>
          <button class="btn" data-a="aguaMas">＋ Un vaso</button>
        </div>
        <p class="tenue">Cada vaso son ${VASO_ML} ml. Toca un vaso para marcar hasta ahí.</p>
      </div>
      <p class="tenue">La recomendación incluye el agua de los alimentos y sube los días de entrenamiento o con calor. Si tienes sed, bebe.</p>
    `,
  });
}

function nutricionIA() {
  const metas = metasNutricion();
  const consumo = macrosDia();
  const avisos = generarInsightsDantal(estado, metas || {}, consumo);
  return pagina({
    titulo: 'Asistente DANTAL', sub: 'Avisos a partir de tus datos',
    cuerpo: `
      ${subnav(SUBNAV_NUTRICION, 'nutricion/ia')}
      <div class="tarjeta"><h2>🤖 Tu resumen</h2>
        <p class="tenue">DANTAL separa siempre el <b>Dato real</b> (lo que has registrado) de la <b>Estimación</b> (cálculos metabólicos o de recuperación).</p></div>
      ${avisos.map(a => `<div class="insight ${a.tipo === 'Estimación' ? 'estimacion' : ''}">
        <span class="ins-ic">${a.icono}</span>
        <div class="ins-t"><span class="ins-tipo">${a.tipo}</span><b>${esc(a.titulo)}</b><p>${esc(a.texto)}</p></div></div>`).join('')}
      <p class="tenue">DANTAL no es un servicio médico. Ante cualquier duda sobre alimentación o salud, consulta con un profesional.</p>
    `,
  });
}

function nutricionObjetivos() {
  return pagina({
    titulo: 'Objetivos', sub: 'Gasto diario, macros, fibra, agua e IMC',
    cuerpo: `
      ${subnav(SUBNAV_NUTRICION, 'nutricion/objetivos')}
      ${formNutricionHTML()}
      <div id="nutriResultados"></div>
      <div class="botones"><a class="btn sec" href="#seguimiento/medidas">⚖️ Registrar mi peso</a></div>
      <p class="tenue">Es una estimación, no consejo médico. Ajusta las calorías según tu evolución real: si en 2-3 semanas no cambia tu peso, mueve 100-200 kcal.</p>
    `,
  });
}

// Añade o quita entradas del diario (fecha, comida).
function guardarComidas() { guardar(); render(); }
function anadirEntrada(comida, entrada, fecha = diaNutri()) {
  const dia = (estado.comidas[fecha] = estado.comidas[fecha] || {});
  (dia[comida] = dia[comida] || []).push(entrada);
  guardarComidas();
}
function quitarEntrada(comida, idx, fecha = diaNutri()) {
  const dia = estado.comidas[fecha];
  if (dia?.[comida]) { dia[comida].splice(idx, 1); guardarComidas(); }
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
  const tg = videoEjercicio(e) ? '<span class="tg-badge" title="Con vídeo de técnica">🎬</span>' : '';
  return `<a class="celda ${e.propio ? 'ej-propio' : ''}" href="#ejercicio/${e.id}"><span class="ic azul">${ICONO_PATRON[e.patron] || '🏋️'}</span>
    <span class="celda-t"><b>${esc(e.nombre)}${tg}</b><small>${e.musculos.map(m => MUSCULOS[m]).join(', ')} · ${equipoTxt(e)}${e.propio ? ' · propio' : ''}</small></span><span class="chev">›</span></a>`;
}

function ejercicios() {
  const q = ui.q.toLowerCase();
  const lista = EJERCICIOS.filter(e =>
    (!ui.filtro || e.musculos.includes(ui.filtro)) &&
    (!ui.soloPropios || e.propio) &&
    (!ui.soloTG || infoTechnogym(e)?.video) &&
    (!q || e.nombre.toLowerCase().includes(q)));
  let cuerpo;
  if (!lista.length) cuerpo = vacioMsg('🔍', 'Sin resultados', 'Prueba con otra palabra o quita el filtro.');
  else if (ui.filtro || q || ui.soloPropios || ui.soloTG) cuerpo = `<div class="celdas">${lista.map(itemEjercicio).join('')}</div>`;
  else cuerpo = Object.entries(MUSCULOS).map(([m, nombre]) => {
    const deEste = lista.filter(e => e.musculos[0] === m);
    return deEste.length ? grupo(`${nombre} · ${deEste.length}`, deEste.map(itemEjercicio).join('')) : '';
  }).join('');
  const nPropios = EJERCICIOS.filter(e => e.propio).length;
  const nTG = EJERCICIOS.filter(e => infoTechnogym(e)?.video).length;
  return pagina({
    titulo: 'Ejercicios', sub: `${EJERCICIOS.length} ejercicios con su técnica`,
    extra: '<a class="icono" href="#ejercicios/nuevo" title="Crear ejercicio propio">＋</a>',
    cuerpo: `
      <div class="buscador"><span>🔍</span><input type="search" placeholder="Buscar ejercicio" value="${esc(ui.q)}" data-a="buscar" class="buscar" aria-label="Buscar ejercicio"></div>
      <div class="chips scroll">
        <button class="chip ${!ui.filtro && !ui.soloPropios && !ui.soloTG ? 'on' : ''}" data-a="filtro" data-m="">Todos</button>
        ${nTG ? `<button class="chip ${ui.soloTG ? 'on' : ''}" data-a="soloTG">🎬 Technogym (${nTG})</button>` : ''}
        <button class="chip ${ui.soloPropios ? 'on' : ''}" data-a="soloPropios">🧩 Míos${nPropios ? ` (${nPropios})` : ''}</button>
        ${Object.entries(MUSCULOS).map(([k, v]) => `<button class="chip ${ui.filtro === k && !ui.soloPropios && !ui.soloTG ? 'on' : ''}" data-a="filtro" data-m="${k}">${v}</button>`).join('')}
      </div>
      <div id="listaEj">${cuerpo}</div>
      ${nPropios ? `<a class="tarjeta enlace-tarjeta" href="#ejercicios/mios"><div class="fila"><div><h2>🧩 Mis ejercicios</h2><p class="tenue">${nPropios} ${nPropios === 1 ? 'ejercicio propio' : 'ejercicios propios'}</p></div><span class="chev">›</span></div></a>` : ''}
    `,
  });
}

function technogymHTML(e) {
  const info = infoTechnogym(e);
  if (!info) return '';
  const vid = info.video || '';
  const esId = /^[A-Za-z0-9_-]{11}$/.test(vid); // identificador de YouTube incrustable
  const esUrl = /^https?:/i.test(vid);
  return `<div class="tarjeta">
    <div class="tg-ficha">
      ${ilustracionTechnogymSVG(e, { postura: 'A', ancho: 160 })}
      <div>
        <p class="tg-linea">${esc(info.linea)}${info.personalizada ? ' · propia' : ''}</p>
        <p class="tg-maquina">${esc(info.maquina)}</p>
        ${info.musculo ? `<p class="tenue">${esc(info.musculo)}</p>` : ''}
        ${info.ajuste ? `<p class="tg-ajuste">${esc(info.ajuste)}</p>` : ''}
      </div>
    </div>
    ${esId ? `<div class="tg-video"><iframe src="${urlVideoTechnogym(vid)}" title="Vídeo de técnica: ${esc(info.maquina)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" allowfullscreen></iframe></div>
      <p class="tenue centro"><a class="enlace" href="https://www.youtube.com/watch?v=${esc(vid)}" target="_blank" rel="noopener">▶ Abrir en YouTube</a></p>`
      : esUrl ? `<p><a class="btn sec" href="${esc(vid)}" target="_blank" rel="noopener">▶ Vídeo de la máquina</a></p>` : ''}
    <p class="tenue centro">Ajusta la máquina a tu cuerpo antes de empezar: el recorrido correcto empieza por una buena postura.</p>
  </div>`;
}

// ---- Vídeo de técnica por ejercicio (en español) reutilizable en listas y sesión ----
// Identificador de YouTube incrustable del vídeo del ejercicio, o null.
const idVideo = e => videoEjercicio(e);

// Reproductor incrustado (16:9) del vídeo del ejercicio.
function playerVideo(e, clase = '') {
  const vid = idVideo(e);
  if (!vid) return '';
  return `<div class="tg-video ${clase}"><iframe src="${urlVideoTechnogym(vid)}" title="Vídeo de técnica: ${esc(nombreEj(e.id))}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen" allowfullscreen></iframe></div>`;
}

// Cuadrado de cada ejercicio: miniatura del vídeo (representa el movimiento real)
// que abre el reproductor; si no hay vídeo, el icono de siempre.
function iconoEjercicio(e) {
  const vid = idVideo(e);
  if (!vid) return `<span class="ic-ej">${ICONO_PATRON[e?.patron] || '🏋️'}</span>`;
  const abierto = ui.videoAbierto === e.id;
  return `<button class="ic-ej ic-video ${abierto ? 'on' : ''}" data-a="videoMaquina" data-id="${e.id}"
    title="${abierto ? 'Ocultar' : 'Ver'} el vídeo de técnica" aria-label="Vídeo de técnica" aria-expanded="${abierto}">
    <img src="https://i.ytimg.com/vi/${vid}/mqdefault.jpg" alt="" loading="lazy"><span class="play">▶</span></button>`;
}

const videoAbierto = e => Boolean(idVideo(e)) && ui.videoAbierto === e.id;

function ejercicioDetalle(id) {
  const e = porId[id];
  if (!e) return null;
  ui.ejSel = id;
  const puntos = datosEjercicio(id);
  const alt = alternativas(id, estado.perfil).slice(0, 5);
  const colores = Object.fromEntries(e.musculos.map((m, i) => [m, i ? 'var(--acento2)' : 'var(--acento)']));
  const enPlan = estado.plan.sesiones.filter(s => !s.oculta && s.ejercicios.some(x => x.id === id)).map(s => s.nombre);
  return pagina({
    titulo: esc(e.nombre), padre: e.propio ? 'ejercicios/mios' : 'ejercicios', sub: PATRONES[e.patron],
    extra: e.propio ? `<a class="icono" href="#ejercicio/${id}/editar" title="Editar ejercicio">✎</a>` : '',
    cuerpo: `
      <div class="tarjeta">
        ${cuerpoSVG(colores)}
        <p class="leyenda centro"><i class="lg" style="background:var(--acento)"></i>principal <i class="lg" style="background:var(--acento2)"></i>secundario</p>
        <div class="badges centro-flex">${e.musculos.map((m, i) => `<span class="badge ${i ? '' : 'prim'}">${MUSCULOS[m]}</span>`).join('')}
          <span class="badge">🧰 ${equipoTxt(e)}</span>${e.compuesto ? '<span class="badge">Multiarticular</span>' : '<span class="badge">Aislamiento</span>'}${e.propio ? '<span class="badge">🧩 Propio</span>' : ''}</div>
      </div>
      ${technogymHTML(e)}
      ${tecnicaHTML(e)}
      ${videoHTML(e)}
      ${fotoHTML(e)}
      ${enPlan.length ? `<p class="tenue">📋 Está en tu programa: ${enPlan.map(esc).join(', ')}</p>` : ''}
      <h2 class="sec-tit">📈 Tu progreso</h2>
      ${puntos.length ? '<div class="tarjeta"><div id="grafica"></div></div>' : '<div class="tarjeta"><p class="tenue">Aún no lo has registrado. Cuando lo hagas verás aquí tu evolución.</p></div>'}
      ${alt.length ? `<h2 class="sec-tit">⇄ Alternativas con tu material</h2><div class="celdas">${alt.map(itemEjercicio).join('')}</div>` : ''}
      ${e.propio ? `<div class="botones"><a class="btn sec" href="#ejercicio/${id}/editar">✎ Editar ejercicio</a>
        <button class="btn peligro" data-a="borrarEjPropio" data-id="${id}">Borrar ejercicio</button></div>` : ''}
    `,
  });
}

// =====================================================================
// Páginas: ejercicios propios (crear, editar y listar)
// =====================================================================
function formEjercicio(e = null, nuevo = true) {
  const p = e || { nombre: '', patron: 'empuje_h', musculos: [], equipo: [], compuesto: true, tipo: 'reps', desc: '', maquinaCustom: '', lineaCustom: '', musculoCustom: '', ajusteCustom: '', videoCustom: '' };
  const video = p.videoCustom && !/^https?:/.test(p.videoCustom) ? `https://www.youtube.com/watch?v=${p.videoCustom}` : (p.videoCustom || '');
  return `<form id="formEjercicio" class="tarjeta" data-id="${nuevo ? '' : esc(e.id)}" novalidate>
    <label class="campo">Nombre<input type="search" name="nombre" value="${esc(p.nombre)}" maxlength="40" required placeholder="Por ejemplo: Press inclinado en Smith"></label>
    <label class="campo">Patrón de movimiento<select name="patron">${Object.entries(PATRONES).map(([k, v]) => `<option value="${k}" ${p.patron === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <fieldset><legend>Músculos</legend><div class="chips">${Object.entries(MUSCULOS).map(([k, v]) => `<label class="chip"><input type="checkbox" name="musculos" value="${k}" ${(p.musculos || []).includes(k) ? 'checked' : ''}>${v}</label>`).join('')}</div></fieldset>
    <fieldset><legend>Material</legend><div class="chips">${Object.entries(EQUIPOS).map(([k, v]) => `<label class="chip"><input type="checkbox" name="equipo" value="${k}" ${(p.equipo || []).includes(k) ? 'checked' : ''}>${v}</label>`).join('')}</div></fieldset>
    <div class="nutri-grid">
      <label class="campo">Tipo<select name="tipo"><option value="reps" ${p.tipo !== 'tiempo' ? 'selected' : ''}>Repeticiones</option><option value="tiempo" ${p.tipo === 'tiempo' ? 'selected' : ''}>Por tiempo</option></select></label>
      <label class="campo">¿Multiarticular?<select name="compuesto"><option value="si" ${p.compuesto ? 'selected' : ''}>Sí (compuesto)</option><option value="no" ${!p.compuesto ? 'selected' : ''}>No (aislamiento)</option></select></label>
    </div>
    <label class="campo">Descripción / técnica<textarea name="desc" rows="3" maxlength="300" placeholder="Cómo se hace, en una o dos frases.">${esc(p.desc)}</textarea></label>
    <fieldset><legend>Máquina (opcional)</legend>
      <p class="tenue">Si lo haces en una máquina concreta, guarda sus datos para verlos en la ficha con su ilustración.</p>
      <div class="nutri-grid">
        <label class="campo">Máquina<input type="search" name="maquinaCustom" value="${esc(p.maquinaCustom || '')}" placeholder="Leg Press" maxlength="40"></label>
        <label class="campo">Línea<input type="search" name="lineaCustom" value="${esc(p.lineaCustom || '')}" placeholder="Selection 900" maxlength="40"></label>
      </div>
      <label class="campo">Músculo principal (texto)<input type="search" name="musculoCustom" value="${esc(p.musculoCustom || '')}" placeholder="Cuádriceps y glúteos" maxlength="60"></label>
      <label class="campo">Ajuste recomendado<textarea name="ajusteCustom" rows="2" maxlength="200" placeholder="Altura del asiento, posición de los pies…">${esc(p.ajusteCustom || '')}</textarea></label>
      <label class="campo">Vídeo de YouTube (opcional)<input type="url" name="videoCustom" value="${esc(video)}" placeholder="https://youtu.be/…"></label>
    </fieldset>
    <button class="btn" type="submit">${nuevo ? 'Crear ejercicio' : 'Guardar cambios'}</button>
  </form>`;
}

const slugEjercicio = nombre => 'propio-' + String(nombre).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32);

function ejercicioNuevo() {
  return pagina({ titulo: 'Nuevo ejercicio', padre: 'ejercicios', sub: 'Se añadirá a tu biblioteca', cuerpo: formEjercicio(null, true) });
}

function ejercicioEditar(id) {
  const e = (estado.ejerciciosPropios || []).find(x => x.id === id);
  if (!e) return null;
  return pagina({ titulo: 'Editar ejercicio', padre: `ejercicio/${id}`, sub: esc(e.nombre), cuerpo: formEjercicio(e, false) });
}

function ejerciciosPropios() {
  const lista = estado.ejerciciosPropios || [];
  return pagina({
    titulo: 'Mis ejercicios', padre: 'ejercicios', sub: `${lista.length} ${lista.length === 1 ? 'ejercicio propio' : 'ejercicios propios'}`,
    extra: '<a class="icono" href="#ejercicios/nuevo" title="Nuevo ejercicio">＋</a>',
    cuerpo: lista.length ? `<div class="celdas">${lista.map(e => `<div class="celda ej-propio">
        <span class="ic azul">${ICONO_PATRON[e.patron] || '🏋️'}</span>
        <span class="celda-t"><a class="enlace fuerte" href="#ejercicio/${e.id}">${esc(e.nombre)}</a><small>${(e.musculos || []).map(m => MUSCULOS[m]).join(', ') || 'Sin músculos'} · ${equipoTxt({ equipo: e.equipo || [] })}</small></span>
        <div class="acciones"><a class="icono peq" href="#ejercicio/${e.id}/editar" title="Editar">✎</a>
        <button class="icono peq" data-a="borrarEjPropio" data-id="${e.id}" title="Borrar">🗑️</button></div></div>`).join('')}</div>
      <a class="btn" href="#ejercicios/nuevo">＋ Crear ejercicio</a>`
      : vacioMsg('🧩', 'Aún no tienes ejercicios propios', 'Crea un ejercicio para tus máquinas o variantes concretas y aparecerá junto al resto.', '<a class="btn" href="#ejercicios/nuevo">＋ Crear ejercicio</a>'),
  });
}

async function borrarEjPropio(id) {
  const e = (estado.ejerciciosPropios || []).find(x => x.id === id);
  if (!e) return;
  const usado = estado.plan?.sesiones.some(s => s.ejercicios.some(x => x.id === id))
    || (estado.misSesiones || []).some(s => s.ejercicios.some(x => x.id === id));
  const enHistorial = estado.historial.some(h => h.ejercicios.some(x => x.id === id));
  if (!await confirmar(usado || enHistorial
    ? `«${e.nombre}» está en tu programa o historial. Se quitará de las sesiones (el historial conserva el registro).`
    : `Se borrará «${e.nombre}» de tu biblioteca.`,
    { titulo: '¿Borrar ejercicio?', ok: 'Borrar', peligro: true })) return;
  estado.ejerciciosPropios = (estado.ejerciciosPropios || []).filter(x => x.id !== id);
  if (estado.plan) estado.plan.sesiones.forEach(s => { s.ejercicios = s.ejercicios.filter(x => x.id !== id); });
  estado.misSesiones = (estado.misSesiones || []).map(s => ({ ...s, ejercicios: s.ejercicios.filter(x => x.id !== id) }));
  if (estado.enCurso) estado.enCurso.ejercicios = estado.enCurso.ejercicios.filter(x => x.id !== id);
  sincronizarPropios();
  guardar();
  ir('ejercicios/mios');
  toast('Ejercicio borrado');
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
        ${avatarHTML(usuarioActual(), 'grande')}
        <span class="celda-t"><b>${esc(usuarioActual().nombre)} · ${o.icono} ${o.nombre}</b><small>${p.nivel[0].toUpperCase() + p.nivel.slice(1)} · ${p.diasSemana.map(d => DIAS[d].slice(0, 3)).join(', ')} · ${frecTxt(p)} · ${p.duracion} min · ${p.lugar === 'gimnasio' ? 'Gimnasio' : 'Casa'}</small></span>
        <span class="chev">›</span>
      </a>
      ${grupo('Usuarios', celda('usuarios', '👥', 'Gestor de usuarios', `Activo: ${esc(usuarioActual().nombre)}`, 'azul', usuarios.lista.length))}
      ${grupo('Programa', celda('ajustes/perfil', '🎯', 'Perfil y programa', 'Objetivo, días, frecuencia, duración, material y enfoque', 'verde'))}
      ${grupo('Coach', celda('ajustes/coach', '🧠', 'Coach IA', motorCoach().tipo === 'clave' ? 'IA real conectada' : motorCoach().tipo === 'navegador' ? 'IA del navegador · gratis' : 'Motor local siempre activo', 'violeta', motorCoach().tipo === 'local' ? '' : 'IA'))}
      ${grupo('Aplicación',
        celda('ajustes/recordatorios', '🔔', 'Recordatorios', 'Aviso los días de entrenamiento', 'naranja', estado.ajustes.recordatorio ? estado.ajustes.hora : 'No') +
        celda('ajustes/seguridad', '🔒', 'Seguridad', estado.seguridad?.activa ? 'Bloqueo activo con contraseña' : 'Protege la app con una contraseña', 'violeta') +
        celda('ajustes/datos', '💾', 'Tus datos', 'Copia de seguridad, CSV y borrado', 'azul'))}
      ${grupo('Ayuda',
        `<label class="celda"><span class="ic violeta">💡</span><span class="celda-t"><b>Iconos de ayuda ⓘ</b><small>Explicaciones en las zonas importantes</small></span>
          <span class="interruptor solo"><input type="checkbox" role="switch" data-a="ayudas" ${estado.ajustes.ayudas !== false ? 'checked' : ''} aria-label="Mostrar iconos de ayuda"></span></label>` +
        celda('ajustes/idea', '💡', '¿Una idea o un problema?', 'Cuéntame qué mejorar o qué no funciona', 'amarillo') +
        celda('ajustes/acerca', 'ℹ️', 'Cómo funciona', 'Ciclos, fases y cargas sugeridas', 'violeta'))}
      ${soyDueno() || !hayDueno() ? grupo('Administración',
        soyDueno()
          ? celda('ajustes/incidencias', '📥', 'Ideas e incidencias', 'Lo que envían los usuarios de este dispositivo', 'rojo', contarNuevas() ? `${contarNuevas()} sin leer` : '')
          : celda('ajustes/incidencias', '👑', 'Activar el modo dueño', 'Marca esta cuenta como administradora de la app', 'rojo')) : ''}
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
      ${grupo('Datos de salud', celda('ajustes/salud', '❤️', 'Datos de salud', 'Importar peso, medidas y actividad, o sincronizar una hoja', 'rojo'))}
      ${grupo('Zona peligrosa', `<button class="celda peligro-c" data-a="borrarTodo"><span class="ic rojo">🗑️</span><span class="celda-t"><b>Borrar los datos de ${esc(usuarioActual().nombre)}</b><small>Perfil, programa e historial. No se puede deshacer</small></span></button>`)}
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
      <div class="tarjeta"><h2>🍎 Nutrición</h2>
        <p>Registra lo que comes y bebes en el diario. DANTAL calcula tus objetivos con la fórmula de Mifflin-St Jeor y te avisa de lo que te falta, separando siempre los datos reales de las estimaciones.</p></div>
      <div class="tarjeta"><h2>🔒 Seguridad</h2>
        <p>Puedes proteger la app con una contraseña que se guarda cifrada (SHA-256 con salt) en este dispositivo. Si la olvidas, tienes tres formas de recuperar el acceso: la pregunta de seguridad, un código por correo o el código maestro.</p></div>
      <p class="tenue centro">${MARCA.nombre} · versión ${APP_VERSION} · funciona sin conexión · tus datos no salen de tu dispositivo</p>
    `,
  });
}

// =====================================================================
// Páginas: importar datos de salud
// =====================================================================
function ajSalud() {
  return pagina({
    titulo: 'Datos de salud', padre: 'ajustes', sub: 'Peso, medidas y actividad desde otra app',
    cuerpo: `
      <div class="tarjeta">
        <h2>📥 Trae tus datos desde otra app</h2>
        <p>Exporta de <b>Google Fit</b>, <b>Health Connect</b>, tu reloj o cualquier app de salud un archivo <b>CSV</b> o <b>JSON</b>, y DANTAL leerá el <b>peso</b>, la <b>grasa</b>, los <b>perímetros</b> y la <b>actividad diaria</b> (pasos, distancia y calorías) que encuentre.</p>
        <p class="tenue">Los días que ya tenías se completan sin borrar nada; los días nuevos se añaden. La actividad de un día se actualiza con el valor más reciente.</p>
        <label class="btn" for="archivoSalud">📄 Elegir archivo CSV o JSON</label>
        <input id="archivoSalud" type="file" accept=".csv,text/csv,.json,application/json" data-a="importarSalud" hidden>
      </div>
      <div class="tarjeta">
        <h2>🔁 Sincronizar automáticamente</h2>
        <p>Si prefieres no importar a mano, pega aquí la dirección de una <b>hoja de Google publicada como CSV</b> (o de cualquier archivo CSV/JSON en internet). DANTAL la leerá sola y traerá los datos nuevos.</p>
        <form id="formSaludFuente">
          <label class="campo">Dirección (URL)<input type="url" name="url" value="${esc(estado.saludUrl || '')}" placeholder="https://docs.google.com/spreadsheets/d/e/…/pub?output=csv" inputmode="url" autocomplete="off"></label>
          <div class="botones">
            <button class="btn" type="submit">Guardar dirección</button>
            ${estado.saludUrl ? '<button class="btn sec" type="button" data-a="syncSalud">🔄 Sincronizar ahora</button>' : ''}
          </div>
        </form>
        ${estado.saludUrl ? `<p class="tenue">Última sincronización: ${estado.saludSync ? fmtFechaHora(estado.saludSync) : 'todavía no'}. Se intenta sola al abrir la app, como mucho una vez por hora. Deja la dirección vacía para desactivarla.</p>` : ''}
      </div>
      <div class="tarjeta">
        <h2>🧭 Qué columnas reconozco</h2>
        <p class="tenue">Fecha: <b>fecha · date · day</b>. Peso: <b>peso · weight</b>. Grasa: <b>grasa · body fat</b>. Perímetros: <b>cintura/waist</b>, <b>pecho/chest</b>, <b>cadera/hip</b>, <b>brazo/arm</b>, <b>muslo/thigh</b>.</p>
        <p class="tenue">Actividad: <b>pasos/steps</b>, <b>distancia/distance</b> (la paso a km), <b>calorías/calories</b> y <b>minutos activos/active minutes</b>.</p>
        <p class="tenue">Admite decimales con coma o punto, fechas como <b>2026-11-17</b> o <b>17/11/2026</b>, y pesos en libras (los convierto a kilos).</p>
      </div>
      <p class="tenue">🔒 El archivo se lee aquí mismo, en tu dispositivo. No se sube a ningún sitio.</p>
    `,
  });
}

async function importarSalud(file) {
  try {
    const r = interpretarSalud(await file.text(), file.name);
    if (!r.ok) { toast(r.error, { ms: 7000 }); return; }
    const hayM = (r.filas || []).length, hayA = (r.actividad || []).length;
    const partes = [];
    if (hayM) partes.push(`${hayM} ${hayM === 1 ? 'día' : 'días'} de peso y medidas (${r.campos.map(k => MEDIDAS_CAMPOS[k].nombre).join(', ')})`);
    if (hayA) partes.push(`${hayA} ${hayA === 1 ? 'día' : 'días'} de actividad (${r.camposAct.map(k => ACTIVIDAD_CAMPOS[k].nombre).join(', ')})`);
    const copiaM = (estado.medidas || []).map(m => ({ ...m }));
    const copiaA = (estado.actividad || []).map(a => ({ ...a }));
    const prevM = hayM ? fusionarMedidas(copiaM, r.filas) : { nuevas: 0, completadas: 0 };
    const prevA = hayA ? fusionarActividad(copiaA, r.actividad) : { nuevas: 0, actualizadas: 0 };
    const detalle = [];
    if (hayM) detalle.push(`${prevM.nuevas} ${prevM.nuevas === 1 ? 'día nuevo' : 'días nuevos'} y ${prevM.completadas} completados de peso y medidas`);
    if (hayA) detalle.push(`${prevA.nuevas} ${prevA.nuevas === 1 ? 'día nuevo' : 'días nuevos'} y ${prevA.actualizadas} actualizados de actividad`);
    if (!await confirmar(`He leído ${partes.join(' y ')}. Se añadirán: ${detalle.join('; ')}. Tus datos no se borran.`,
      { titulo: '¿Importar estos datos?', ok: 'Importar' })) return;
    conDeshacer('Datos de salud importados', () => {
      if (hayM) fusionarMedidas(estado.medidas || (estado.medidas = []), r.filas);
      if (hayA) fusionarActividad(estado.actividad || (estado.actividad = []), r.actividad);
    });
    ir(hayM ? 'seguimiento/medidas' : 'seguimiento/pasos');
  } catch {
    toast('No he podido leer ese archivo.');
  }
}

// =====================================================================
// Páginas: ideas e incidencias («¿Una idea o un problema?»)
// =====================================================================
function cambiarEstadoInc(id, estado) {
  const inc = cargarIncidencias();
  const item = inc.items.find(i => i.id === id);
  if (item) item.estado = estado;
  guardarIncidencias(inc);
}

// Tras enviar: agradecimiento y, si el dueño dejó contacto, botones de envío.
function abrirEnvio(item) {
  const d = cargarIncidencias();
  const cuerpo = textoIncidencia(item);
  const num = String(d.whatsapp || '').replace(/[^\d]/g, '');
  const enlaces = [];
  if (d.correo) enlaces.push(`<a class="btn sec" href="mailto:${encodeURIComponent(d.correo)}?subject=${encodeURIComponent('[DANTAL] ' + item.titulo)}&body=${encodeURIComponent(cuerpo)}">✉️ Enviar por correo</a>`);
  if (num) enlaces.push(`<a class="btn sec" href="https://wa.me/${num}?text=${encodeURIComponent(cuerpo)}" target="_blank" rel="noopener">💬 Enviar por WhatsApp</a>`);
  render();
  modal(`<h2>¡Gracias! 🙌</h2>
    <p>${enlaces.length ? 'He guardado tu mensaje. Si quieres, mándamelo también con un toque:' : 'He guardado tu mensaje. Llegará a quien administra la app.'}</p>
    ${enlaces.join('')}
    <div class="botones"><button class="btn" data-a="cerrar">Cerrar</button></div>`);
}

async function borrarIncidencia(id) {
  const item = cargarIncidencias().items.find(i => i.id === id);
  if (!item) return;
  if (!await confirmar(`Se borrará «${item.titulo}». No se puede deshacer.`, { titulo: '¿Borrar el mensaje?', ok: 'Borrar', peligro: true })) return;
  conDeshacerInc('Mensaje borrado', () => { const inc = cargarIncidencias(); inc.items = inc.items.filter(i => i.id !== id); guardarIncidencias(inc); });
}

function incCard(i) {
  const nuevo = i.estado === 'nueva';
  return `<div class="tarjeta ${nuevo ? 'activo' : ''}">
    <div class="fila"><b>${TIPOS_INCIDENCIA[i.tipo]?.icono || '📝'} ${esc(i.titulo)}</b><span class="badge ${nuevo ? 'prim' : ''}">${ESTADOS_INCIDENCIA[i.estado]?.nombre || i.estado}</span></div>
    <div class="badges"><span class="badge">${esc(nombreCategoria(i.categoria))}</span><span class="badge">${esc(i.autorNombre)}</span><span class="badge">${fmtCorta(i.fecha)}</span></div>
    <p style="white-space:pre-wrap">${esc(i.texto)}</p>
    <div class="botones">
      ${nuevo ? `<button class="btn sec" data-a="incLeida" data-id="${i.id}">👀 Leída</button>` : ''}
      ${i.estado !== 'hecha' ? `<button class="btn sec" data-a="incHecha" data-id="${i.id}">✅ Hecha</button>` : ''}
      ${i.estado !== 'archivada' ? `<button class="btn sec" data-a="incArchivar" data-id="${i.id}">📦 Archivar</button>` : ''}
      <button class="btn sec" data-a="incCopiar" data-id="${i.id}">📋 Copiar</button>
      <button class="btn peligro" data-a="incBorrar" data-id="${i.id}">🗑️ Borrar</button>
    </div>
  </div>`;
}

// Aviso para el dueño en la pantalla de inicio: mensajes sin leer.
function avisoIncidencias() {
  if (!soyDueno()) return '';
  const n = contarNuevas();
  if (!n) return '';
  return `<a class="tarjeta enlace-tarjeta aviso-inc" href="#ajustes/incidencias">
    <div class="fila"><b>📥 ${n === 1 ? 'Tienes 1 mensaje nuevo' : `Tienes ${n} mensajes nuevos`}</b><span class="chev">›</span></div>
    <p class="tenue">Ideas y problemas enviados por los usuarios de este dispositivo.</p>
  </a>`;
}

// Formulario para que cualquier usuario cuente una idea o un problema.
function ajIdea() {
  const yo = usuarioActual();
  const d = cargarIncidencias();
  const mios = d.items.filter(i => i.autorId === yo.id);
  const destino = dueno()?.nombre || 'quien administra la app';
  return pagina({
    titulo: '¿Una idea o un problema?',
    padre: 'ajustes',
    sub: 'Cuéntame qué mejorarías o qué no funciona',
    cuerpo: `
      <form id="formIncidencia" class="tarjeta">
        <fieldset><legend>¿Qué quieres contarme?</legend>
          <div class="chips">
            <label class="chip grande"><input type="radio" name="tipo" value="idea" checked>💡<span>Una idea</span></label>
            <label class="chip grande"><input type="radio" name="tipo" value="problema">⚠️<span>Un problema</span></label>
          </div>
        </fieldset>
        <label class="campo">Sobre qué es
          <select name="categoria">${Object.entries(CATEGORIAS_INCIDENCIA).map(([k, v]) => `<option value="${k}">${esc(v)}</option>`).join('')}</select>
        </label>
        <label class="campo">Título<input type="search" name="titulo" maxlength="70" required autocomplete="off" placeholder="Resúmelo en una frase"></label>
        <label class="campo">Cuéntame más<textarea name="texto" rows="5" maxlength="1500" required placeholder="¿Qué te gustaría que hiciera la app? ¿Qué pasó exactamente?"></textarea></label>
        <button class="btn" type="submit">Enviar a ${esc(destino)}</button>
      </form>
      <p class="tenue">Tu mensaje se guarda en este dispositivo y solo lo ve la cuenta de administrador. Nadie más lo lee.</p>
      ${mios.length ? `<h3 class="sub-leg">Tus mensajes</h3>` + mios.map(i => `<div class="tarjeta">
        <div class="fila"><b>${TIPOS_INCIDENCIA[i.tipo]?.icono || '📝'} ${esc(i.titulo)}</b><span class="badge">${ESTADOS_INCIDENCIA[i.estado]?.nombre || i.estado}</span></div>
        <div class="badges"><span class="badge">${esc(nombreCategoria(i.categoria))}</span><span class="badge">${fmtCorta(i.fecha)}</span></div>
      </div>`).join('') : ''}
    `,
  });
}

// Bandeja privada del dueño: solo la ve la cuenta administradora.
function ajIncidencias() {
  if (!soyDueno()) {
    return pagina({
      titulo: 'Ideas e incidencias', padre: 'ajustes',
      cuerpo: vacioMsg('🔒', 'Sección privada', 'Solo la cuenta marcada como administradora puede ver las ideas y los problemas que envían los usuarios.',
        !hayDueno() ? '<button class="btn" data-a="incSerDueno">👑 Marcar mi cuenta como dueño</button>' : ''),
    });
  }
  const d = cargarIncidencias();
  const filtro = ui.incFiltro || 'nuevas';
  const leidas = d.items.filter(i => i.estado === 'leida').length;
  const cuenta = {
    nuevas: d.items.filter(i => i.estado === 'nueva').length,
    hechas: d.items.filter(i => i.estado === 'hecha').length,
    archivadas: d.items.filter(i => i.estado === 'archivada').length,
    todas: d.items.length,
  };
  const lista = d.items.filter(i => filtro === 'todas' ? true
    : filtro === 'nuevas' ? (i.estado === 'nueva' || i.estado === 'leida') : i.estado === filtro);
  const chipFiltro = (f, txt) => `<button class="chip ${filtro === f ? 'on' : ''}" data-a="incFiltro" data-f="${f}">${txt}</button>`;
  return pagina({
    titulo: 'Ideas e incidencias', padre: 'ajustes',
    sub: `${cuenta.todas} ${cuenta.todas === 1 ? 'mensaje' : 'mensajes'} · ${cuenta.nuevas} sin leer`,
    cuerpo: `
      <div class="chips">
        ${chipFiltro('nuevas', `Pendientes (${cuenta.nuevas + leidas})`)}
        ${chipFiltro('todas', `Todas (${cuenta.todas})`)}
        ${chipFiltro('hecha', `Hechas (${cuenta.hechas})`)}
        ${chipFiltro('archivada', `Archivadas (${cuenta.archivadas})`)}
      </div>
      ${lista.length ? lista.map(incCard).join('') : vacioMsg('📭', 'Nada por aquí', filtro === 'todas' ? 'Todavía no te han enviado ideas ni problemas.' : 'No hay mensajes en este apartado.')}
      <h3 class="sub-leg">Datos de contacto (opcional)</h3>
      <div class="tarjeta">
        <p class="tenue">Si los rellenas, quien envíe una idea o un problema podrá mandártela también con un botón de correo o WhatsApp.</p>
        <label class="campo">Correo<input type="email" name="correo" data-a="incContacto" data-c="correo" value="${esc(d.correo)}" placeholder="tucorreo@ejemplo.com" autocomplete="off"></label>
        <label class="campo">WhatsApp<input type="tel" name="whatsapp" data-a="incContacto" data-c="whatsapp" value="${esc(d.whatsapp)}" placeholder="+34 600 000 000" autocomplete="off"></label>
      </div>
      ${grupo('Acciones', `
        ${cuenta.nuevas ? `<button class="celda" data-a="incTodasLeidas"><span class="ic verde">👀</span><span class="celda-t"><b>Marcar todo como leído</b><small>${cuenta.nuevas} sin leer</small></span></button>` : ''}
        <button class="celda" data-a="incExportar"><span class="ic azul">⬇️</span><span class="celda-t"><b>Exportar todo</b><small>Archivo JSON con las ideas y los problemas</small></span></button>
        ${cuenta.archivadas ? `<button class="celda peligro-c" data-a="incBorrarArchivadas"><span class="ic rojo">🗑️</span><span class="celda-t"><b>Borrar las archivadas</b><small>${cuenta.archivadas} archivadas</small></span></button>` : ''}`)}
    `,
  });
}

// =====================================================================
// Páginas: acceso (login) y recuperación de contraseña
// =====================================================================
const SEG_PREG = i => PREGUNTAS_SEG[Number(i)] || PREGUNTAS_SEG[0];
const normalizarResp = t => String(t ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const normalizarNombre = t => String(t ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
const normalizarCorreo = t => String(t ?? '').trim().toLowerCase();
// Busca un usuario por su nombre (coincidencia exacta o por principio único), sin distinguir mayúsculas ni tildes.
function usuarioPorNombre(nombre) {
  const n = normalizarNombre(nombre);
  if (!n) return null;
  const lista = usuarios.lista;
  const exacto = lista.find(u => normalizarNombre(u.nombre) === n);
  if (exacto) return exacto;
  const prefijo = lista.filter(u => normalizarNombre(u.nombre).startsWith(n));
  return prefijo.length === 1 ? prefijo[0] : null;
}
// Busca un usuario por el correo con el que recupera su contraseña.
function usuarioPorCorreo(correo) {
  const c = normalizarCorreo(correo);
  if (!c) return null;
  return usuarios.lista.find(u => normalizarCorreo(datosUsuario(u.id)?.seguridad?.correo) === c) || null;
}
// Datos de seguridad del usuario que está recuperando la contraseña (o del usuario activo).
const seguridadRecuperacion = () => {
  const id = recuperacionProc.usuario;
  return (id ? datosUsuario(id) : estado)?.seguridad || null;
};

async function verificarClaveDe(d, clave) {
  const s = d?.seguridad;
  if (!s?.hash) return false;
  return await hashClave(String(clave ?? ''), s.salt) === s.hash;
}
async function verificarClave(clave) {
  return verificarClaveDe(estado, clave);
}
async function verificarRespuesta(txt) {
  const s = seguridadRecuperacion();
  if (!s?.respuesta) return false;
  return await hashClave(normalizarResp(txt), s.salt) === s.respuesta;
}

// Construye el objeto de seguridad (contraseña con SHA-256 + salt).
async function construirSeguridad({ clave, pregunta = 0, respuesta = '', correo = '' }) {
  const salt = nuevoSalt();
  return {
    activa: true, salt,
    hash: await hashClave(clave, salt),
    pregunta: Number(pregunta) || 0,
    respuesta: respuesta ? await hashClave(normalizarResp(respuesta), salt) : '',
    correo: String(correo || '').trim(),
    maestro: generarMaestro(),
    creado: new Date().toISOString(),
  };
}

// Activa el bloqueo del usuario activo.
async function crearSeguridad(datos) {
  estado.seguridad = await construirSeguridad(datos);
}

function login() {
  const lista = usuarios.lista;
  const sel = lista.some(u => u.id === usuarioLogin) ? usuarioLogin : usuarios.activo;
  const u = lista.find(x => x.id === sel) || lista[0];
  const tieneClave = Boolean(datosUsuario(u.id).seguridad?.activa);
  const correo = datosUsuario(u.id).seguridad?.correo || '';
  const campoUsuario = `<label class="campo">Usuario
      <input type="text" name="usuarioNombre" data-a="loginUsuarioNombre" list="listaUsuarios" value="${esc(u.nombre)}" autocomplete="username" spellcheck="false" autocapitalize="off" required ${lista.length > 1 ? 'autofocus' : ''}>
      <datalist id="listaUsuarios">${lista.map(x => `<option value="${esc(x.nombre)}"></option>`).join('')}</datalist>
    </label>`;
  const campoCorreo = `<label class="campo">Correo
      <input type="email" name="correo" autocomplete="email" value="${esc(correo)}" placeholder="tucorreo@ejemplo.com" spellcheck="false">
    </label>`;
  const formulario = tieneClave
    ? `<form id="formLogin" class="tarjeta" novalidate>
        ${campoUsuario}
        ${campoCorreo}
        <label class="campo">Contraseña
          <span class="clave-fila">
            <input type="password" name="clave" autocomplete="current-password" required ${lista.length > 1 ? '' : 'autofocus'}>
            <button type="button" class="icono peq" data-a="verClave" data-f="clave" aria-label="Mostrar u ocultar la contraseña" title="Mostrar u ocultar">${ICO_OJO}</button>
          </span>
        </label>
        <p class="tenue error" id="avisoLogin"></p>
        <button class="btn" type="submit">🔓 Entrar</button>
      </form>
      <a class="btn sec" href="#recuperar">He olvidado la contraseña</a>`
    : `<form id="formLoginClave" class="tarjeta" novalidate>
        ${campoUsuario}
        <p class="tenue"><b>${esc(u.nombre)}</b> todavía no tiene contraseña. Crea una para entrar.</p>
        <label class="campo">Correo
          <input type="email" name="correo" autocomplete="email" placeholder="tucorreo@ejemplo.com" spellcheck="false">
        </label>
        <label class="campo">Contraseña
          <span class="clave-fila">
            <input type="password" name="clave" minlength="4" autocomplete="new-password" required placeholder="Al menos 4 caracteres" ${lista.length > 1 ? '' : 'autofocus'}>
            <button type="button" class="icono peq" data-a="verClave" data-f="clave" aria-label="Mostrar u ocultar la contraseña" title="Mostrar u ocultar">${ICO_OJO}</button>
          </span>
        </label>
        <label class="campo">Repite la contraseña
          <span class="clave-fila">
            <input type="password" name="clave2" minlength="4" autocomplete="new-password" required>
            <button type="button" class="icono peq" data-a="verClave" data-f="clave2" aria-label="Mostrar u ocultar la contraseña" title="Mostrar u ocultar">${ICO_OJO}</button>
          </span>
        </label>
        <p class="tenue error" id="avisoLogin"></p>
        <button class="btn" type="submit">🔒 Crear contraseña y entrar</button>
      </form>`;
  return `<div class="login">
    ${isotipoCuadrado({ tam: 72, clase: 'login-logo' })}
    <h1>${MARCA.nombre}</h1>
    <p class="tenue">${lista.length > 1 ? 'Escribe tu usuario y tu contraseña para entrar.' : (tieneClave ? 'Entra con tu contraseña.' : 'Crea tu contraseña de acceso.')}</p>
    ${formulario}
    <a class="btn sec" href="#usuarios/nuevo">＋ Crear cuenta nueva</a>
    <p class="tenue centro">Tus datos se guardan solo en este dispositivo.</p>
  </div>`;
}

function recIdentificar() {
  return `<form id="formRecIdent" class="tarjeta" novalidate>
    <p class="tenue">Escribe el correo con el que creaste tu cuenta (y tu usuario, si lo recuerdas) para encontrar tu acceso.</p>
    <label class="campo">Correo<input type="email" name="correo" autocomplete="email" placeholder="tucorreo@ejemplo.com" spellcheck="false" required autofocus></label>
    <label class="campo">Usuario (opcional)<input type="text" name="usuarioNombre" list="listaUsuariosRec" autocomplete="username" spellcheck="false" autocapitalize="off" placeholder="Tu nombre de usuario"></label>
    <datalist id="listaUsuariosRec">${usuarios.lista.map(x => `<option value="${esc(x.nombre)}"></option>`).join('')}</datalist>
    <p class="tenue error" id="avisoRec"></p>
    <button class="btn" type="submit">Buscar mi cuenta</button>
  </form>`;
}

function recElegir(s) {
  return `
    <p class="tenue">Elige cómo quieres demostrar que eres tú y poner una contraseña nueva.</p>
    <div class="celdas">
      <button class="celda" data-a="recMetodo" data-m="pregunta"><span class="ic azul">❓</span>
        <span class="celda-t"><b>Pregunta de seguridad</b><small>${esc(SEG_PREG(s.pregunta))}</small></span><span class="chev">›</span></button>
      <button class="celda" data-a="recMetodo" data-m="correo"><span class="ic verde">✉️</span>
        <span class="celda-t"><b>Código por correo</b><small>${s.correo ? esc(s.correo) : 'No hay correo configurado'}</small></span><span class="chev">›</span></button>
      <button class="celda" data-a="recMetodo" data-m="maestro"><span class="ic violeta">🆘</span>
        <span class="celda-t"><b>Código maestro</b><small>El código que guardaste al activar el bloqueo</small></span><span class="chev">›</span></button>
    </div>`;
}

function recPregunta(s) {
  return `<form id="formPregunta" class="tarjeta" novalidate>
    <h2>❓ ${esc(SEG_PREG(s.pregunta))}</h2>
    <label class="campo">Tu respuesta<input type="search" name="respuesta" autocomplete="off" required autofocus></label>
    <p class="tenue error" id="avisoRec"></p>
    <button class="btn" type="submit">Comprobar respuesta</button>
  </form>`;
}

function recCorreo(s) {
  if (!s.correo) return `<div class="tarjeta"><p class="tenue">No configuraste un correo de recuperación. Usa la pregunta de seguridad o el código maestro.</p></div>`;
  return `<form id="formCodigo" class="tarjeta" novalidate>
    <p>Generaré un código de 6 dígitos y abriré tu correo para enviártelo a <b>${esc(s.correo)}</b>.</p>
    ${recuperacionProc.codigo ? `<div class="codigo-maestro">${recuperacionProc.codigo}</div>
      <p class="tenue centro">Si el correo no llega, usa este código. Caduca en 10 minutos.</p>` : ''}
    <button class="btn sec" type="button" data-a="enviarCodigo">✉️ ${recuperacionProc.codigo ? 'Generar otro código' : 'Enviar código'}</button>
    <label class="campo">Código recibido<input type="search" name="codigo" inputmode="numeric" maxlength="6" autocomplete="one-time-code" required></label>
    <p class="tenue error" id="avisoRec"></p>
    <button class="btn" type="submit">Comprobar código</button>
  </form>`;
}

function recMaestro() {
  return `<form id="formMaestro" class="tarjeta" novalidate>
    <p class="tenue">Escribe el código maestro que guardaste al activar el bloqueo (con el formato DNT-XXXX-XXXX).</p>
    <label class="campo">Código maestro<input type="search" name="maestro" autocomplete="off" required autofocus></label>
    <p class="tenue error" id="avisoRec"></p>
    <button class="btn" type="submit">Comprobar código</button>
  </form>`;
}

function recNueva() {
  return `<form id="formNuevaClave" class="tarjeta" novalidate>
    <h2>Nueva contraseña</h2>
    <p class="tenue">Has verificado tu identidad. Elige una contraseña nueva para volver a entrar.</p>
    <label class="campo">Nueva contraseña<input type="password" name="clave" minlength="4" autocomplete="new-password" required autofocus></label>
    <label class="campo">Repite la contraseña<input type="password" name="clave2" minlength="4" autocomplete="new-password" required></label>
    <p class="tenue error" id="avisoRec"></p>
    <button class="btn" type="submit">Guardar y entrar</button>
  </form>`;
}

function recuperar() {
  const hayBloqueo = usuarios.lista.some(x => datosUsuario(x.id).seguridad?.activa);
  if (!hayBloqueo) {
    return `<div class="login">${isotipoCuadrado({ tam: 64, clase: 'login-logo' })}
      <h1>Sin bloqueo</h1><p class="tenue">Todavía no hay ninguna cuenta con contraseña. Créala en el acceso.</p>
      <a class="btn" href="#login">Volver al acceso</a></div>`;
  }
  const id = recuperacionProc.usuario;
  const s = id ? seguridadRecuperacion() : null;
  const u = id ? usuarios.lista.find(x => x.id === id) : null;
  const paso = recuperacionProc.ok ? 'nueva' : (!s?.activa ? 'identificar' : (ui.recMetodo || 'elegir'));
  const cuerpo = paso === 'pregunta' ? recPregunta(s)
    : paso === 'correo' ? recCorreo(s)
      : paso === 'maestro' ? recMaestro(s)
        : paso === 'nueva' ? recNueva()
          : paso === 'identificar' ? recIdentificar()
            : recElegir(s);
  const enMetodo = paso === 'pregunta' || paso === 'correo' || paso === 'maestro';
  return `<div class="login">
    ${isotipoCuadrado({ tam: 64, clase: 'login-logo' })}
    <h1>Recuperar acceso</h1>
    ${u ? `<p class="tenue">Cuenta: <b>${esc(u.nombre)}</b>${s?.correo ? ` · ${esc(s.correo)}` : ''}</p>` : ''}
    ${enMetodo ? '<button class="enlace centro" data-a="recVolver">‹ Elegir otro método</button>' : ''}
    ${cuerpo}
    <a class="btn sec" href="#login">Volver al acceso</a>
  </div>`;
}

// Genera un código de 6 dígitos y abre el correo del usuario (sin servidor).
function enviarCodigo() {
  const s = seguridadRecuperacion();
  if (!s?.correo) { toast('No hay correo configurado'); return; }
  const codigo = String(Math.floor(100000 + Math.random() * 900000));
  recuperacionProc.codigo = codigo;
  recuperacionProc.expira = Date.now() + 10 * 60 * 1000;
  const asunto = encodeURIComponent(`${MARCA.nombre}: código de recuperación`);
  const cuerpo = encodeURIComponent(`Tu código para recuperar el acceso a ${MARCA.nombre} es:\n\n${codigo}\n\nCaduca en 10 minutos.`);
  window.location.href = `mailto:${s.correo}?subject=${asunto}&body=${cuerpo}`;
  render();
  toast('Código generado. Revisa tu correo (o usa el que se muestra).', { ms: 6000 });
}

// =====================================================================
// Páginas: Seguridad (activar, cambiar y desactivar el bloqueo)
// =====================================================================
function segInactivaHTML() {
  return `
    <div class="seg-aviso">🔒 Al activar la contraseña, la app pedirá desbloquearla cada vez que la abras en este dispositivo. Tus datos siguen guardados solo aquí.</div>
    <form id="formSeguridad" class="tarjeta" novalidate>
      <label class="campo">Contraseña
        <div class="clave-fila"><input type="password" name="clave" minlength="4" autocomplete="new-password" required>
          <button class="icono peq" type="button" data-a="verClave" data-f="clave" title="Mostrar u ocultar">${ICO_OJO}</button></div></label>
      <label class="campo">Repite la contraseña
        <div class="clave-fila"><input type="password" name="clave2" minlength="4" autocomplete="new-password" required>
          <button class="icono peq" type="button" data-a="verClave" data-f="clave2" title="Mostrar u ocultar">${ICO_OJO}</button></div></label>
      <label class="campo">Pregunta de seguridad<select name="pregunta">
        ${PREGUNTAS_SEG.map((p, i) => `<option value="${i}">${esc(p)}</option>`).join('')}
      </select></label>
      <label class="campo">Tu respuesta<input type="search" name="respuesta" autocomplete="off" required placeholder="No distingue mayúsculas ni tildes"></label>
      <label class="campo">Correo (para recuperar)<input type="email" name="correo" autocomplete="email" required placeholder="tucorreo@ejemplo.com" spellcheck="false"></label>
      <p class="tenue error" id="avisoSeg"></p>
      <p class="tenue">Guarda bien la contraseña. Si la olvidas, podrás recuperarla con tu correo y tu pregunta de seguridad, o con el código maestro.</p>
      <button class="btn" type="submit">🔒 Activar contraseña</button>
    </form>`;
}

function segActivaHTML(s) {
  return `
    <div class="tarjeta">
      <div class="fila"><h2>🔒 Bloqueo activo</h2><span class="badge">Activado</span></div>
      <p class="tenue">La app pide la contraseña al abrirse en este dispositivo.</p>
      <div class="botones">
        <button class="btn sec" data-a="bloquearAhora">🔒 Bloquear ahora</button>
        <button class="btn sec" data-a="cambiarClaveBtn">Cambiar contraseña</button>
      </div>
    </div>
    <div class="tarjeta"><h2>🔑 Recuperación</h2>
      <p><b>Pregunta:</b> ${esc(SEG_PREG(s.pregunta))}</p>
      <p><b>Correo:</b> ${s.correo ? esc(s.correo) : '<span class="tenue">no indicado</span>'}</p>
      <button class="btn sec" data-a="cambiarPreguntaBtn">Cambiar pregunta o correo</button>
    </div>
    <div class="tarjeta"><h2>🆘 Código maestro</h2>
      <p class="tenue">Guárdalo en un lugar seguro. Es la última forma de entrar si olvidas todo lo demás.</p>
      <div class="codigo-maestro">${ui.verMaestro ? esc(s.maestro) : '•••• ••••'}</div>
      <div class="botones">
        <button class="btn sec" data-a="verMaestro">${ui.verMaestro ? `${ICO_OJO_OFF} Ocultar` : `${ICO_OJO} Mostrar código`}</button>
        ${ui.verMaestro ? '<button class="btn sec" data-a="copiarMaestro">📋 Copiar</button>' : ''}
      </div>
    </div>
    <div class="tarjeta"><h2>⚠️ Desactivar</h2>
      <p class="tenue">Quita la contraseña. La app se abrirá sin pedir nada.</p>
      <button class="btn peligro" data-a="desactivarSeg">Desactivar bloqueo</button>
    </div>`;
}

function ajSeguridad() {
  const s = estado.seguridad;
  return pagina({
    titulo: 'Seguridad', padre: 'ajustes', sub: s?.activa ? 'Bloqueo con contraseña activo' : 'Protege la app con una contraseña',
    cuerpo: s?.activa ? segActivaHTML(s) : segInactivaHTML(),
  });
}

function modalCambiarClave() {
  modal(`<h2>Cambiar contraseña</h2>
    <form id="formCambiarClave" novalidate>
      <label class="campo">Contraseña actual<input type="password" name="actual" autocomplete="current-password" required></label>
      <label class="campo">Nueva contraseña<input type="password" name="clave" minlength="4" autocomplete="new-password" required></label>
      <label class="campo">Repite la nueva<input type="password" name="clave2" minlength="4" autocomplete="new-password" required></label>
      <button class="btn" type="submit">Guardar contraseña</button>
    </form>`);
  setTimeout(() => $('#formCambiarClave input')?.focus(), 50);
}

function modalCambiarPregunta() {
  const s = estado.seguridad;
  modal(`<h2>Pregunta y correo</h2>
    <form id="formCambiarPregunta" novalidate>
      <label class="campo">Pregunta de seguridad<select name="pregunta">
        ${PREGUNTAS_SEG.map((p, i) => `<option value="${i}" ${Number(s?.pregunta) === i ? 'selected' : ''}>${esc(p)}</option>`).join('')}
      </select></label>
      <label class="campo">Respuesta nueva<input type="search" name="respuesta" autocomplete="off" required></label>
      <label class="campo">Correo (para recuperar)<input type="email" name="correo" autocomplete="email" value="${esc(s?.correo || '')}" placeholder="tucorreo@ejemplo.com" required></label>
      <button class="btn" type="submit">Guardar cambios</button>
    </form>`);
  setTimeout(() => $('#formCambiarPregunta input')?.focus(), 50);
}

// =====================================================================
// Páginas: Gestor de usuarios
// =====================================================================
// Resumen de un usuario leyendo sus datos guardados (o los actuales si es el activo).
function resumenUsuario(u) {
  const d = u.id === usuarios.activo ? estado : cargar(u.id);
  const h = d.historial;
  const ult = h[h.length - 1];
  const estaSemana = h.filter(x => lunes(iso(new Date(x.fecha))) === lunes(hoy())).length;
  const objetivo = d.perfil ? OBJETIVOS[d.perfil.objetivo] : null;
  return {
    sesiones: h.length, estaSemana, racha: racha(h), objetivo,
    ultima: ult ? fmtCorta(ult.fecha) : null, plan: !!d.plan, enCurso: !!d.enCurso,
    porSemana: d.perfil?.diasSemana?.length || 0,
  };
}

function gestorUsuarios() {
  const lista = usuarios.lista;
  return pagina({
    titulo: 'Usuarios', padre: estado.plan ? 'ajustes' : 'bienvenida', sub: `${lista.length} ${lista.length === 1 ? 'usuario' : 'usuarios'} en este dispositivo`,
    extra: '<a class="icono" href="#usuarios/nuevo" title="Nuevo usuario">＋</a>',
    cuerpo: `
      ${lista.map(u => {
        const r = resumenUsuario(u);
        const activo = u.id === usuarios.activo;
        return `<div class="tarjeta usuario-card ${activo ? 'activo' : ''}">
          <div class="usuario-cab">
            ${avatarHTML(u, 'grande')}
            <div class="celda-t"><b>${esc(u.nombre)} ${activo ? '<span class="chip-mini">activo</span>' : ''}${r.enCurso ? '<span class="chip-mini alt">entrenando</span>' : ''}</b>
              <small>${r.objetivo ? `${r.objetivo.icono} ${r.objetivo.nombre} · ${r.porSemana} días/sem` : 'Sin programa todavía'}</small></div>
            <a class="icono" href="#usuario/${u.id}" title="Editar usuario">✎</a>
          </div>
          <div class="mini-stats">
            <div><b>${r.sesiones}</b><small>sesiones</small></div>
            <div><b>${r.estaSemana}${r.porSemana ? `/${r.porSemana}` : ''}</b><small>esta semana</small></div>
            <div><b>🔥 ${r.racha}</b><small>racha</small></div>
            <div><b>${r.ultima || '—'}</b><small>última sesión</small></div>
          </div>
          ${activo ? '' : `<button class="btn" data-a="usarUsuario" data-id="${u.id}">Cambiar a ${esc(u.nombre)}</button>`}
        </div>`;
      }).join('')}
      <a class="btn sec" href="#usuarios/nuevo">＋ Nuevo usuario</a>
      ${grupo('Copia de seguridad de todos', `
        <button class="celda" data-a="exportarTodos"><span class="ic azul">⬇️</span><span class="celda-t"><b>Exportar todos los usuarios</b><small>Un archivo con los datos de cada uno</small></span></button>
        <label class="celda"><span class="ic verde">⬆️</span><span class="celda-t"><b>Importar copia</b><small>De todos los usuarios o de uno solo</small></span><input type="file" accept="application/json" data-a="importarTodos" hidden></label>`)}
      <p class="tenue">Los usuarios y sus datos se guardan solo en este dispositivo. Para pasarlos a otro, exporta la copia e impórtala allí.</p>
    `,
  });
}

function formUsuario(u, nuevo) {
  return `<form id="formUsuario" class="tarjeta" data-id="${nuevo ? '' : u.id}">
    <div class="usuario-prev">${avatarHTML(u, 'enorme')}</div>
    <label class="campo">Nombre<input type="search" name="nombre" value="${esc(nuevo ? '' : u.nombre)}" maxlength="24" placeholder="Por ejemplo: Ana" required autocomplete="off"></label>
    ${nuevo ? `
      <label class="campo">Correo (para recuperar la contraseña)<input type="email" name="correo" autocomplete="email" required placeholder="tucorreo@ejemplo.com" spellcheck="false"></label>
      <label class="campo">Contraseña
        <span class="clave-fila"><input type="password" name="clave" minlength="4" autocomplete="new-password" required placeholder="Al menos 4 caracteres">
          <button type="button" class="icono peq" data-a="verClave" data-f="clave" aria-label="Mostrar u ocultar la contraseña" title="Mostrar u ocultar">${ICO_OJO}</button></span></label>
      <label class="campo">Repite la contraseña
        <span class="clave-fila"><input type="password" name="clave2" minlength="4" autocomplete="new-password" required>
          <button type="button" class="icono peq" data-a="verClave" data-f="clave2" aria-label="Mostrar u ocultar la contraseña" title="Mostrar u ocultar">${ICO_OJO}</button></span></label>` : ''}
    <fieldset><legend>Avatar</legend>
      <input type="hidden" name="avatar" value="${esc(u.avatar)}">
      <div class="chips avatares scroll">${AVATARES.map(a => `<label class="chip"><input type="radio" name="avatarEmoji" value="${a}" ${a === u.avatar ? 'checked' : ''}>${a}</label>`).join('')}</div>
      <div class="avatar-extra">
        <label class="btn sec peq">📷 Subir una foto<input type="file" accept="image/*" data-a="avatarArchivo" hidden></label>
        <input type="url" name="avatarUrl" data-a="avatarUrl" placeholder="https://… pega la dirección de una foto" spellcheck="false" autocomplete="off" value="${esImagenAvatar(u.avatar) && /^https?:/i.test(String(u.avatar)) ? esc(u.avatar) : ''}">
      </div>
    </fieldset>
    <fieldset><legend>Color</legend>
      <div class="chips colores">
        ${COLORES.map((c, i) => `<label class="chip color" style="background:${c}"><input type="radio" name="color" value="${i}" ${String(u.color) === String(i) ? 'checked' : ''} aria-label="Color ${i + 1}"></label>`).join('')}
        <label class="chip color" style="background:${esColorHex(u.color) ? u.color : 'conic-gradient(from 90deg,#ef4444,#f59e0b,#84cc16,#06b6d4,#6366f1,#ec4899,#ef4444)'}" title="Color personalizado">
          <input type="radio" name="color" value="custom" ${esColorHex(u.color) ? 'checked' : ''} aria-label="Color personalizado">
          <span class="color-custom-ico">🎨</span>
        </label>
      </div>
      <label class="campo">Tu color personalizado<input type="color" name="colorCustom" data-a="colorCustom" value="${esColorHex(u.color) ? u.color : '#2563eb'}"></label>
    </fieldset>
    ${nuevo ? formMedidasHTML() : ''}
    ${!nuevo && (soyDueno() || !hayDueno()) ? `<label class="interruptor"><span><b>Cuenta de administrador</b><br><small class="tenue">Podrá ver la bandeja de ideas e incidencias de la app</small></span>
      <input type="checkbox" name="admin" value="si" ${esDueno(u) ? 'checked' : ''}></label>` : ''}
    <button class="btn" type="submit">${nuevo ? 'Crear cuenta y continuar' : 'Guardar cambios'}</button>
  </form>`;
}

// Medidas iniciales al crear la cuenta: alimentan la nutrición y el programa.
function formMedidasHTML() {
  const n = NUTRICION_DEF;
  return `
    <h3 class="sub-leg">Tus medidas</h3>
    <p class="tenue">Con estos datos calculo tus calorías, tu proteína y ajusto tus sesiones desde el primer día.</p>
    <div class="nutri-grid">
      <label class="campo">Sexo<select name="sexo">
        <option value="hombre">Hombre</option><option value="mujer">Mujer</option>
      </select></label>
      <label class="campo">Edad<input type="number" name="edad" inputmode="numeric" min="14" max="100" value="30" required></label>
      <label class="campo">Altura (cm)<input type="number" name="altura" inputmode="numeric" min="120" max="230" value="175" required></label>
      <label class="campo">Peso (kg)<input type="number" name="peso" inputmode="decimal" step="0.1" min="30" max="400" placeholder="—" required></label>
    </div>
    <div class="nutri-grid">
      <label class="campo">Actividad<select name="actividad">
        ${Object.entries(ACTIVIDADES).map(([k, a]) => `<option value="${k}" ${k === n.actividad ? 'selected' : ''}>${a.nombre} · ${a.desc}</option>`).join('')}
      </select></label>
      <label class="campo">Objetivo<select name="objetivo">
        ${Object.entries(OBJETIVOS_NUTRI).map(([k, o]) => `<option value="${k}" ${k === n.objetivo ? 'selected' : ''}>${o.nombre}</option>`).join('')}
      </select></label>
    </div>`;
}

function usuarioNuevo() {
  const u = { avatar: AVATARES[usuarios.lista.length % AVATARES.length], color: usuarios.lista.length % COLORES.length };
  const primeraVez = esCuentaNueva();
  return pagina({
    titulo: primeraVez ? 'Crear cuenta' : 'Nuevo usuario',
    padre: primeraVez ? null : (estaBloqueado() ? 'login' : 'usuarios'),
    sub: 'Con tus medidas calculo tus calorías y ajusto tu programa',
    cuerpo: formUsuario(u, true),
  });
}

function usuarioEditar(id) {
  const u = usuarios.lista.find(x => x.id === id);
  if (!u) return null;
  const r = resumenUsuario(u);
  return pagina({
    titulo: esc(u.nombre), padre: 'usuarios', sub: `Creado el ${fmtCorta(u.creado)} · ${r.sesiones} sesiones`,
    cuerpo: `${formUsuario(u, false)}
      ${grupo('Datos', `
        <button class="celda" data-a="exportarUsuario" data-id="${u.id}"><span class="ic azul">⬇️</span><span class="celda-t"><b>Exportar sus datos</b><small>Archivo JSON solo de ${esc(u.nombre)}</small></span></button>
        <button class="celda peligro-c" data-a="borrarUsuario" data-id="${u.id}" ${usuarios.lista.length === 1 ? 'disabled' : ''}><span class="ic rojo">🗑️</span>
          <span class="celda-t"><b>Borrar usuario</b><small>${usuarios.lista.length === 1 ? 'No se puede borrar el único usuario' : 'Se borran su programa y su historial'}</small></span></button>`)}`,
  });
}

function menuUsuarios() {
  modal(`<h2>¿Quién va a entrenar?</h2>
    <div class="celdas">${usuarios.lista.map(u => `<button class="celda" data-a="usarUsuario" data-id="${u.id}">${avatarHTML(u)}
      <span class="celda-t"><b>${esc(u.nombre)}</b><small>${u.id === usuarios.activo ? 'Usuario activo' : `${resumenUsuario(u).sesiones} sesiones`}</small></span>
      ${u.id === usuarios.activo ? '<span class="celda-v">✓</span>' : ''}</button>`).join('')}</div>
    <div class="botones"><a class="btn sec" href="#usuarios/nuevo" data-a="cerrar">＋ Nuevo</a><a class="btn sec" href="#usuarios" data-a="cerrar">Gestionar</a></div>`);
}

function crearUsuario({ nombre, avatar, color, nutricion, medidas, seguridad, admin = false }) {
  const id = nuevoId();
  usuarios.lista.push({ id, nombre, avatar, color, creado: new Date().toISOString(), ...(admin ? { admin: true } : {}) });
  const datos = vacio();
  if (nutricion) datos.nutricion = { ...NUTRICION_DEF, ...nutricion };
  if (Array.isArray(medidas) && medidas.length) datos.medidas = medidas;
  if (seguridad) datos.seguridad = seguridad;
  localStorage.setItem(claveDe(id), JSON.stringify(datos));
  guardarUsuarios();
  return id;
}

async function borrarUsuario(id) {
  const u = usuarios.lista.find(x => x.id === id);
  if (!u || usuarios.lista.length === 1) return;
  const r = resumenUsuario(u);
  if (!await confirmar(`Se borrarán el programa y las ${r.sesiones} sesiones de ${u.nombre}. No se puede deshacer; si quieres conservarlos, exporta antes sus datos.`,
    { titulo: `¿Borrar a ${u.nombre}?`, ok: 'Borrar usuario', peligro: true })) return;
  usuarios.lista = usuarios.lista.filter(x => x.id !== id);
  localStorage.removeItem(claveDe(id));
  if (usuarios.activo === id) { usuarios.activo = usuarios.lista[0].id; estado = cargar(); }
  guardarUsuarios();
  ir('usuarios');
  toast(`${u.nombre} borrado`);
}

function exportarTodos() {
  guardar();
  const datos = Object.fromEntries(usuarios.lista.map(u => [u.id, cargar(u.id)]));
  descargar(JSON.stringify({ app: 'MiEntrenamiento', version: 3, usuarios, datos }, null, 2), 'application/json', 'json');
  toast('Copia de todos los usuarios descargada');
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
  const primerUsuario = usuarios.lista.length === 1 && usuarioActual().nombre === 'Usuario 1';
  return `
    <div class="bienvenida">
      ${usuarios.lista.length > 1 ? '<a class="enlace usuarios-link" href="#usuarios">‹ Usuarios</a>' : ''}
      ${logoDantal({ conEslogan: true })}
      ${primerUsuario ? '' : `<div class="usuario-prev">${avatarHTML(usuarioActual(), 'enorme')}</div>`}
      <h1>${primerUsuario ? 'Entrenamiento y nutrición' : `Programa de ${esc(usuarioActual().nombre)}`}</h1>
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

// Igual que conDeshacer, pero para las incidencias: se guardan aparte y no
// pertenecen a ningún usuario, así que se copia la clave entera.
function conDeshacerInc(texto, accion) {
  const antes = localStorage.getItem(CLAVE_INCIDENCIAS);
  accion();
  render();
  toast(texto, { accion: 'Deshacer', alPulsar: () => { antes == null ? localStorage.removeItem(CLAVE_INCIDENCIAS) : localStorage.setItem(CLAVE_INCIDENCIAS, antes); render(); } });
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
    ${ult ? `<p>Última vez: <b>${ult.series.map(s => s.kg ? `${s.kg}×${s.reps}` : s.reps).join(' · ')}</b>${rec ? ` · récord ${rec}` : ''}</p>` : ''}
    ${technogymHTML(e)}
    ${tecnicaHTML(e, { compacta: true })}
    ${idVideo(e) ? '' : ((estado.videos || {})[e.id] ? videoHTML(e) : `<a class="btn sec" href="${urlBusqueda(e, 'videos')}" target="_blank" rel="noopener">▶ Ver vídeos de técnica</a>`)}
  `);
}

// ---------- Técnica: dibujos, paso a paso, vídeo y foto ----------
const urlBusqueda = (e, tipo) => tipo === 'videos'
  ? `https://www.youtube.com/results?search_query=${encodeURIComponent(e.nombre + ' técnica correcta')}`
  : `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(e.nombre + ' ejercicio técnica')}`;

function tecnicaHTML(e, { compacta = false } = {}) {
  const g = guiaEjercicio(e);
  const [ini, fin] = pasosDibujo(e);
  const lista = (cls, items) => `<ul class="${cls}">${items.map(t => `<li>${esc(t)}</li>`).join('')}</ul>`;
  return `
    <div class="tarjeta tecnica">
      <h2>🎬 Cómo se hace</h2>
      <div class="dibujo-zona">
        <div class="dibujo-grande">${dibujoSVG(e)}<span class="badge en-vivo">● Movimiento</span></div>
        <div class="posturas">
          <figure>${dibujoSVG(e, { postura: 'A' })}<figcaption><b>1</b>${esc(ini)}</figcaption></figure>
          <figure>${dibujoSVG(e, { postura: 'B' })}<figcaption><b>2</b>${esc(fin)}</figcaption></figure>
        </div>
      </div>
      <p class="tenue centro nota-dibujo">Dibujo orientativo. Fíjate en la postura y el recorrido.</p>
      ${esTechnogym(e) ? '' : playerVideo(e)}
    </div>
    <div class="tarjeta guia">
      <h2>📝 Paso a paso</h2>
      <ol class="pasos">${g.pasos.map(p => `<li>${esc(p)}</li>`).join('')}</ol>
      <h2>✅ Claves</h2>${lista('claves', g.claves)}
      <h2>⚠️ Errores comunes</h2>${lista('errores', g.errores)}
      ${compacta ? '' : `<h2>🌬️ Respiración</h2><p>${esc(g.resp)}</p>
      <h2>🛡️ Seguridad</h2><p class="tenue">Calienta con 1-2 series ligeras. Controla el movimiento en todo el recorrido y para si notas dolor articular.</p>`}
    </div>`;
}

function idYouTube(url) {
  const m = String(url).trim().match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function videoHTML(e) {
  const vid = (estado.videos || {})[e.id];
  return `<div class="tarjeta">
    <h2>▶ Vídeo</h2>
    ${vid ? `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${vid}?rel=0" title="Vídeo de ${esc(e.nombre)}" loading="lazy"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div>
      <div class="botones"><button class="btn sec" data-a="videoAdd" data-id="${e.id}">Cambiar vídeo</button><button class="btn sec" data-a="videoQuitar" data-id="${e.id}">Quitar</button></div>`
      : `<p class="tenue">Busca un vídeo de la técnica y guarda el que más te guste: lo verás aquí siempre que abras este ejercicio.</p>
      <div class="botones"><a class="btn sec" href="${urlBusqueda(e, 'videos')}" target="_blank" rel="noopener">🔎 Buscar en YouTube</a>
        <button class="btn" data-a="videoAdd" data-id="${e.id}">＋ Guardar un vídeo</button></div>`}
  </div>`;
}

function fotoHTML(e) {
  const foto = (estado.fotos || {})[e.id];
  return `<div class="tarjeta">
    <h2>📷 Fotos</h2>
    ${foto ? `<img class="foto-ej" src="${foto}" alt="Tu foto de ${esc(e.nombre)}">` : '<p class="tenue">Mira fotos de referencia o guarda una tuya (por ejemplo, para revisar tu postura).</p>'}
    <div class="botones">
      <a class="btn sec" href="${urlBusqueda(e, 'fotos')}" target="_blank" rel="noopener">🔎 Ver fotos de referencia</a>
      <label class="btn ${foto ? 'sec' : ''}">${foto ? 'Cambiar mi foto' : '＋ Añadir mi foto'}<input type="file" accept="image/*" data-a="foto" data-id="${e.id}" hidden></label>
      ${foto ? `<button class="btn sec" data-a="fotoQuitar" data-id="${e.id}">Quitar</button>` : ''}
    </div>
  </div>`;
}

// Reduce la foto (máx. 720 px, JPEG) para que quepa en el almacenamiento del navegador.
async function guardarFoto(id, file) {
  const img = await createImageBitmap(file);
  const k = Math.min(1, 720 / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  estado.fotos = { ...(estado.fotos || {}), [id]: c.toDataURL('image/jpeg', 0.72) };
  try { guardar(); render(); toast('Foto guardada'); }
  catch { delete estado.fotos[id]; toast('No queda espacio para más fotos. Quita alguna antes.', { ms: 6000 }); }
}

// Convierte una foto en un avatar cuadrado (256 px, JPEG) para guardarlo en el usuario.
async function imagenAAvatar(file) {
  const img = await createImageBitmap(file);
  const lado = 256;
  const c = document.createElement('canvas');
  c.width = lado; c.height = lado;
  const k = Math.max(lado / img.width, lado / img.height);
  const w = Math.round(img.width * k), h = Math.round(img.height * k);
  c.getContext('2d').drawImage(img, Math.round((lado - w) / 2), Math.round((lado - h) / 2), w, h);
  return c.toDataURL('image/jpeg', 0.82);
}

// Refresca la vista previa del avatar en el formulario de usuario (emoji, foto o URL).
function pintarPreviewUsuario(form) {
  const prev = $('.usuario-prev .avatar-u');
  if (!prev || !form) return;
  const fd = new FormData(form);
  const avatar = String(fd.get('avatar') || '🙂');
  const colorSel = String(fd.get('color') || '0');
  const fondo = colorSel === 'custom' ? String(fd.get('colorCustom') || '#2563eb') : colorAvatar(colorSel);
  if (esImagenAvatar(avatar)) {
    prev.classList.add('foto');
    prev.style.background = 'var(--tarjeta2)';
    prev.innerHTML = `<img src="${esc(avatar)}" alt="">`;
  } else {
    prev.classList.remove('foto');
    prev.style.background = fondo;
    prev.textContent = avatar;
  }
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

const filasPlan = ejs => ejs.map(e => {
  const base = porId[e.id];
  return {
    nombre: nombreEj(e.id),
    musculos: base ? base.musculos.map(m => MUSCULOS[m]).join(', ') : '',
    series: e.metodo === 'tabata' ? '8 × 20 s / 10 s' : `${e.series} × ${objetivoTxt(e)}${e.metodo && e.metodo !== 'normal' ? ` (${METODOS[e.metodo]?.nombre || e.metodo})` : ''}`,
    descanso: e.metodo === 'tabata' ? '—' : `${e.descanso} s`,
    notas: base?.desc || '',
  };
});

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
document.addEventListener('click', async ev => {
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
    case 'editarMedida': ui.medidaEdit = d.f; render(); $('#formMedida')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
    case 'cancelarMedida': ui.medidaEdit = null; render(); break;
    case 'borrarMedida': conDeshacer('Medición borrada', () => {
      estado.medidas = (estado.medidas || []).filter(m => m.fecha !== d.f);
      if (ui.medidaEdit === d.f) ui.medidaEdit = null;
    }); break;
    case 'cienciaIr': document.getElementById(d.sec)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
    case 'editarPaso': ui.pasoEdit = d.f; render(); $('#formPasos')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
    case 'cancelarPaso': ui.pasoEdit = null; render(); break;
    case 'borrarPaso': conDeshacer('Día borrado', () => {
      estado.actividad = (estado.actividad || []).filter(a => a.fecha !== d.f);
      if (ui.pasoEdit === d.f) ui.pasoEdit = null;
    }); break;
    case 'syncSalud': sincronizarSalud({}); break;
    case 'usarUltimoPeso': estado.nutricion.peso = null; guardar(); render(); toast('Usando tu último peso registrado'); break;
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
    case 'filtro': ui.filtro = d.m; ui.soloPropios = false; ui.soloTG = false; render(); break;
    case 'soloPropios': ui.soloPropios = !ui.soloPropios; ui.filtro = ''; ui.soloTG = false; render(); break;
    case 'soloTG': ui.soloTG = !ui.soloTG; ui.filtro = ''; ui.soloPropios = false; render(); break;
    case 'videoMaquina': ui.videoAbierto = ui.videoAbierto === d.id ? null : d.id; render(); break;
    case 'borrarEjPropio': borrarEjPropio(d.id); break;
    case 'restRec': {
      const s = estado.plan?.sesiones[Number(d.i)];
      if (s?.ejercicios[Number(d.j)]) { s.ejercicios[Number(d.j)].descanso = Number(d.d); guardar(); render(); }
      break;
    }
    // ---- Nutrición: diario, alimentos, recetas y agua ----
    case 'nutriDia': ui.diaNutri = sumarDias(diaNutri(), Number(d.d)); render(); break;
    case 'addAlimento': elegirAlimento(d.comida); break;
    case 'addReceta': elegirReceta(d.comida); break;
    case 'ponerAlimento': {
      const a = alimentoPorId(d.id);
      if (!a) break;
      cerrarModal();
      anadirEntrada(ui.comidaSel, { id: a.id, gramos: a.porcion });
      toast(`${a.nombre} añadido`);
      break;
    }
    case 'ponerReceta': {
      const r = RECETAS.find(x => x.id === d.id);
      if (!r) break;
      cerrarModal();
      anadirEntrada(ui.comidaSel, { tipo: 'receta', id: r.id, racion: 1 });
      toast(`${r.nombre} añadida`);
      break;
    }
    case 'recetaA': {
      const r = RECETAS.find(x => x.id === d.receta);
      if (!r) break;
      anadirEntrada(d.comida, { tipo: 'receta', id: r.id, racion: 1 });
      toast(`${r.nombre} añadida a ${COMIDAS[d.comida].nombre}`);
      break;
    }
    case 'quitarComida': quitarEntrada(d.comida, Number(d.i)); break;
    case 'editCantidad': {
      const entrada = (estado.comidas[diaNutri()]?.[d.comida] || [])[Number(d.i)];
      if (!entrada) break;
      const esReceta = entrada.tipo === 'receta';
      const rec = esReceta ? RECETAS.find(r => r.id === entrada.id) : null;
      const al = esReceta ? null : alimentoPorId(entrada.id);
      modal(`<h2>Cambiar cantidad</h2><p class="tenue">${esc((esReceta ? rec?.nombre : al?.nombre) || entrada.id)}</p>
        <form id="formCantidad" data-comida="${d.comida}" data-i="${d.i}">
          ${esReceta
            ? `<label class="campo">Raciones<input type="number" name="racion" inputmode="decimal" step="0.25" min="0.25" value="${entrada.racion || 1}" required></label>`
            : `<label class="campo">Gramos<input type="number" name="gramos" inputmode="numeric" step="1" min="1" value="${entrada.gramos}" required></label>`}
          <button class="btn" type="submit">Guardar</button>
        </form>`);
      setTimeout(() => $('#formCantidad input')?.focus(), 50);
      break;
    }
    case 'nutriCat': ui.nutriCat = d.m; refrescarListaAlimentos(); break;
    case 'vaso': estado.agua[diaNutri()] = Number(d.n); guardar(); render(); break;
    case 'aguaMas': estado.agua[diaNutri()] = vasosDia() + 1; guardar(); render(); break;
    case 'aguaMenos': estado.agua[diaNutri()] = Math.max(0, vasosDia() - 1); guardar(); render(); break;
    // ---- Acceso y seguridad ----
    case 'bloquearUsuario': ir('usuarios'); break;
    case 'recMetodo': ui.recMetodo = d.m; render(); break;
    case 'recVolver': ui.recMetodo = null; recuperacionProc.ok = false; recuperacionProc.codigo = null; render(); break;
    case 'enviarCodigo': enviarCodigo(); break;
    case 'verClave': {
      const inp = document.querySelector(`#${b.closest('form')?.id || 'vista'} input[name="${d.f}"]`) || b.parentElement.querySelector('input');
      if (inp) { inp.type = inp.type === 'password' ? 'text' : 'password'; b.innerHTML = inp.type === 'password' ? ICO_OJO : ICO_OJO_OFF; }
      break;
    }
    case 'bloquearAhora': desbloqueado = false; ui.recMetodo = null; recuperacionProc.ok = false; recuperacionProc.usuario = null; ir('login'); toast('App bloqueada 🔒'); break;
    case 'cambiarClaveBtn': modalCambiarClave(); break;
    case 'cambiarPreguntaBtn': modalCambiarPregunta(); break;
    case 'verMaestro': ui.verMaestro = !ui.verMaestro; render(); break;
    case 'copiarMaestro':
      navigator.clipboard?.writeText(estado.seguridad?.maestro || '')
        .then(() => toast('Código copiado'), () => toast('No he podido copiarlo. Anótalo a mano.'));
      break;
    case 'desactivarSeg':
      confirmar('La app se abrirá sin pedir contraseña. Podrás volver a activarla cuando quieras.', { titulo: '¿Desactivar el bloqueo?', ok: 'Desactivar', peligro: true })
        .then(ok => { if (ok) { estado.seguridad = null; desbloqueado = true; ui.verMaestro = false; guardar(); render(); toast('Bloqueo desactivado'); } });
      break;
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
      confirmar(`Se borrarán el perfil, el programa y todo el historial de ${usuarioActual().nombre}. Los demás usuarios no se tocan. No se puede deshacer.`, { titulo: '¿Borrar sus datos?', ok: 'Borrar', peligro: true })
        .then(ok => { if (ok) { estado = vacio(); guardar(); ir('bienvenida'); } });
      break;
    case 'descMas': temporizador.fin += 15000; temporizador.total += 15; tic(); break;
    case 'descMenos': temporizador.fin -= 15000; tic(); break;
    case 'descSaltar': pararDescanso(); break;
    case 'menuUsuarios': menuUsuarios(); break;
    case 'usarUsuario': cambiarUsuario(d.id); break;
    case 'borrarUsuario': borrarUsuario(d.id); break;
    case 'exportarTodos': exportarTodos(); break;
    case 'exportarUsuario': {
      if (d.id === usuarios.activo) guardar();
      const u = usuarios.lista.find(x => x.id === d.id);
      descargar(JSON.stringify(cargar(d.id), null, 2), 'application/json', `${u.nombre.replace(/[^\wáéíóúñ-]+/gi, '_')}.json`);
      toast(`Datos de ${u.nombre} descargados`); break;
    }
    // ---- Ideas e incidencias ----
    case 'incFiltro': ui.incFiltro = d.f; render(); break;
    case 'incLeida': conDeshacerInc('Marcada como leída', () => cambiarEstadoInc(d.id, 'leida')); break;
    case 'incHecha': conDeshacerInc('Marcada como hecha ✅', () => cambiarEstadoInc(d.id, 'hecha')); break;
    case 'incArchivar': conDeshacerInc('Archivada', () => cambiarEstadoInc(d.id, 'archivada')); break;
    case 'incTodasLeidas':
      conDeshacerInc('Todo marcado como leído', () => { const inc = cargarIncidencias(); inc.items.forEach(i => { if (i.estado === 'nueva') i.estado = 'leida'; }); guardarIncidencias(inc); });
      break;
    case 'incBorrar': borrarIncidencia(d.id); break;
    case 'incBorrarArchivadas':
      confirmar('Se borrarán las ideas y los problemas que hayas archivado. No se puede deshacer.', { titulo: '¿Borrar las archivadas?', ok: 'Borrar', peligro: true })
        .then(ok => { if (ok) conDeshacerInc('Archivadas borradas', () => { const inc = cargarIncidencias(); inc.items = inc.items.filter(i => i.estado !== 'archivada'); guardarIncidencias(inc); }); });
      break;
    case 'incExportar': {
      const inc = cargarIncidencias();
      descargar(JSON.stringify({ app: 'DANTAL', tipo: 'incidencias', exportado: new Date().toISOString(), ...inc }, null, 2), 'application/json', 'incidencias');
      toast('Ideas e incidencias descargadas'); break;
    }
    case 'incCopiar': {
      const item = cargarIncidencias().items.find(i => i.id === d.id);
      navigator.clipboard?.writeText(textoIncidencia(item || {})).then(() => toast('Copiado'), () => toast('No he podido copiarlo'));
      break;
    }
    case 'incSerDueno':
      usuarios.lista.forEach(u => delete u.admin);
      usuarioActual().admin = true;
      guardarUsuarios(); render();
      toast(`Ahora ${usuarioActual().nombre} es el dueño de la app 👑`);
      break;
    case 'videoAdd':
      modal(`<h2>Guardar un vídeo</h2>
        <p class="tenue">Abre el vídeo en YouTube, copia su enlace (Compartir → Copiar enlace) y pégalo aquí.</p>
        <form id="formVideo" data-id="${d.id}">
          <input type="url" name="url" placeholder="https://youtu.be/…" required autocomplete="off" inputmode="url">
          <button class="btn" type="submit">Guardar vídeo</button>
        </form>
        <a class="btn sec" href="${urlBusqueda(porId[d.id], 'videos')}" target="_blank" rel="noopener">🔎 Buscar en YouTube</a>`);
      setTimeout(() => $('#formVideo input')?.focus(), 50);
      break;
    case 'videoQuitar': conDeshacer('Vídeo quitado', () => { delete estado.videos[d.id]; }); break;
    case 'fotoQuitar': conDeshacer('Foto quitada', () => { delete estado.fotos[d.id]; }); break;
    case 'descDeshacer': { const f = temporizador.deshacer; pararDescanso(); f?.(); break; }
    // ---- Coach DANTAL ----
    case 'coachAccion': coachAplicar(d); break;
    case 'coachIgnorar': coachIgnorar(d.sug); break;
    case 'coachPreg': coachEnviar(d.q); break;
    case 'coachLimpiar': ui.coachChat = []; ui.coachIgnorados = []; render(); break;
    case 'coachIAProbar': {
      ui.coachIAOk = null; render();
      toast('Probando la conexión…');
      const r = await probar();
      ui.coachIAOk = r; render();
      toast(r.ok ? 'El modelo responde ✅' : 'No ha funcionado. Revisa la clave.');
      break;
    }
    case 'coachIABorrar':
      confirmar('El coach seguirá funcionando con el motor local, sin modelo de lenguaje.', { titulo: '¿Quitar la clave de IA?', ok: 'Quitar', peligro: true })
        .then(ok => { if (ok) { borrarConfig(); ui.coachIAOk = null; render(); toast('Clave eliminada'); } });
      break;
    case 'coachNanoActivar': {
      if (ui.coachNanoDescargando) break;
      ui.coachNanoDescargando = true; ui.coachNanoOk = null; render();
      const r = await activarNano(({ loaded, total }) => {
        const i = $('#nanoProg i');
        if (i && total) i.style.width = `${Math.max(2, Math.round(loaded / total * 100))}%`;
      });
      ui.coachNanoDescargando = false;
      if (!r.ok) ui.coachNanoOk = { ok: false, error: r.error };
      render();
      toast(r.ok ? 'IA del navegador lista ✅' : 'No he podido activar la IA del navegador');
      break;
    }
    case 'coachNanoProbar': {
      ui.coachNanoOk = null; render();
      toast('Probando la IA del navegador…');
      const r = await probarNano();
      ui.coachNanoOk = r; render();
      toast(r.ok ? 'La IA del navegador responde ✅' : 'No ha funcionado');
      break;
    }
  }
});


function descargar(texto, tipo, ext) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([texto], { type: tipo }));
  a.download = ext.includes('.') ? `mientrenamiento-${ext.replace(/\.json$/, '')}-${hoy()}.json` : `mientrenamiento-${hoy()}.${ext}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importar(file) {
  try {
    const datos = JSON.parse(await file.text());
    if (datos?.usuarios?.lista && datos.datos) {
      const n = datos.usuarios.lista.length;
      if (!await confirmar(`La copia tiene ${n} ${n === 1 ? 'usuario' : 'usuarios'} (${datos.usuarios.lista.map(u => u.nombre).join(', ')}). Sustituirá a todos los usuarios actuales de este dispositivo.`, { titulo: '¿Importar todos los usuarios?', ok: 'Importar' })) return;
      usuarios.lista.forEach(u => localStorage.removeItem(claveDe(u.id)));
      usuarios = datos.usuarios;
      for (const u of usuarios.lista) localStorage.setItem(claveDe(u.id), JSON.stringify(datos.datos[u.id] || vacio()));
      if (!usuarios.lista.some(u => u.id === usuarios.activo)) usuarios.activo = usuarios.lista[0].id;
      guardarUsuarios(); estado = cargar();
      ir('usuarios'); toast('Usuarios importados');
      return;
    }
    if (!datos || !Array.isArray(datos.historial)) throw new Error('formato');
    if (!await confirmar(`El archivo tiene ${datos.historial.length} sesiones. Sustituirá los datos de ${usuarioActual().nombre}.`, { titulo: '¿Importar la copia?', ok: 'Importar' })) return;
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
  } else if (d.a === 'nutricion') {
    guardarNutricion();
    actualizarNutricion();
  } else if (d.a === 'nutriBuscar') {
    ui.nutriQ = t.value;
    refrescarListaAlimentos();
  } else if (d.a === 'rest') {
    const s = estado.plan?.sesiones[Number(d.i)];
    const item = s?.ejercicios[Number(d.j)];
    if (item) { item.descanso = Math.max(0, Math.min(600, Math.round((Number(t.value) || 0) / 5) * 5)); guardar(); }
  } else if (d.a === 'incContacto') {
    const inc = cargarIncidencias();
    inc[d.c] = t.value.trim();
    guardarIncidencias(inc);
  } else if (t.name === 'diasSemana') {
    const n = document.querySelectorAll('[name=diasSemana]:checked').length;
    $('#avisoDias').classList.remove('error');
    $('#avisoFrec')?.classList.remove('error'); if ($('#avisoFrec')) $('#avisoFrec').textContent = '';
    $('#avisoDias').textContent = n ? `${n} ${n === 1 ? 'sesión' : 'sesiones'} por semana` : '';
  }
});

document.addEventListener('change', async ev => {
  const t = ev.target;
  if (t.dataset.a === 'loginUsuarioNombre') {
    const u = usuarioPorNombre(t.value);
    if (!u) return;
    const antes = Boolean(usuarioLogin && datosUsuario(usuarioLogin)?.seguridad?.activa);
    const ahora = Boolean(datosUsuario(u.id)?.seguridad?.activa);
    usuarioLogin = u.id;
    if (antes !== ahora) render();
    return;
  }
  if (t.dataset.a === 'selEj') { ui.ejSel = t.value; dibujarGrafica(); }
  if (t.dataset.a === 'metrica') { ui.metricaMedida = MEDIDAS_CAMPOS[t.value] ? t.value : 'peso'; dibujarGraficaMedidas(); }
  if (t.dataset.a === 'nutricion') { guardarNutricion(); actualizarNutricion(); }
  if ((t.dataset.a === 'importar' || t.dataset.a === 'importarTodos') && t.files[0]) { importar(t.files[0]); t.value = ''; }
  if (t.dataset.a === 'importarSalud' && t.files[0]) { importarSalud(t.files[0]); t.value = ''; }
  if (t.dataset.a === 'foto' && t.files[0]) guardarFoto(t.dataset.id, t.files[0]).catch(() => toast('No he podido leer esa imagen.'));
  if (t.name === 'lugar' && $('#fsEquipo')) $('#fsEquipo').hidden = t.value === 'gimnasio';
  if (t.dataset.a === 'avatarArchivo' && t.files[0]) {
    try {
      const data = await imagenAAvatar(t.files[0]);
      const hidden = t.form?.querySelector('input[name=avatar]');
      if (hidden) hidden.value = data;
      t.form?.querySelectorAll('input[name=avatarEmoji]').forEach(r => { r.checked = false; });
      const url = t.form?.querySelector('input[name=avatarUrl]'); if (url) url.value = '';
      pintarPreviewUsuario(t.form);
      toast('Foto lista. Guarda los cambios para aplicarla.');
    } catch { toast('No he podido leer esa imagen.'); }
    t.value = '';
  }
  if (t.form?.id === 'formUsuario') {
    if (t.name === 'avatarEmoji') {
      const hidden = t.form.querySelector('input[name=avatar]');
      if (hidden) hidden.value = t.value;
      pintarPreviewUsuario(t.form);
    } else if (t.dataset.a === 'colorCustom') {
      const r = t.form.querySelector('input[name=color][value=custom]'); if (r) r.checked = true;
      pintarPreviewUsuario(t.form);
    } else if (t.name === 'color') {
      pintarPreviewUsuario(t.form);
    } else if (t.dataset.a === 'avatarUrl') {
      const url = t.value.trim();
      if (url) {
        const hidden = t.form.querySelector('input[name=avatar]');
        if (hidden) hidden.value = url;
        t.form.querySelectorAll('input[name=avatarEmoji]').forEach(r => { r.checked = false; });
        pintarPreviewUsuario(t.form);
      }
    }
  }
  if (t.dataset.a === 'hora') { estado.ajustes.hora = t.value; guardar(); }
  if (t.dataset.a === 'ayudas') {
    estado.ajustes.ayudas = t.checked; guardar(); render();
    toast(t.checked ? 'Iconos de ayuda activados' : 'Iconos de ayuda ocultos. Las ayudas de los botones siguen disponibles');
  }
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
  // ---- Acceso y recuperación ----
  if (ev.target.id === 'formLogin') {
    const u = usuarioPorNombre(f.get('usuarioNombre')) || usuarioPorCorreo(f.get('correo'));
    if (!u) { $('#avisoLogin').textContent = 'No encuentro ese usuario. Revisa el nombre o el correo.'; return; }
    usuarioLogin = u.id;
    if (!datosUsuario(u.id).seguridad?.activa) { render(); return; }
    if (await verificarClaveDe(datosUsuario(u.id), f.get('clave'))) {
      entrarComo(u.id);
      toast(`Hola, ${usuarioActual().nombre} 👋`);
    } else {
      $('#avisoLogin').textContent = 'Contraseña incorrecta. Inténtalo de nuevo.';
      $('#formLogin input[name=clave]')?.select();
    }
    return;
  }
  if (ev.target.id === 'formLoginClave') {
    const u = usuarioPorNombre(f.get('usuarioNombre')) || usuarioPorCorreo(f.get('correo'));
    if (!u) { $('#avisoLogin').textContent = 'No encuentro ese usuario. Revisa el nombre o el correo.'; return; }
    usuarioLogin = u.id;
    if (datosUsuario(u.id).seguridad?.activa) { render(); return; }
    const clave = String(f.get('clave') || ''), clave2 = String(f.get('clave2') || '');
    const correo = String(f.get('correo') || '').trim();
    if (!correo) { $('#avisoLogin').textContent = 'Escribe tu correo: lo usaré para recuperar la contraseña.'; return; }
    if (clave.length < 4) { $('#avisoLogin').textContent = 'Usa al menos 4 caracteres.'; return; }
    if (clave !== clave2) { $('#avisoLogin').textContent = 'Las dos contraseñas no coinciden.'; return; }
    const seguridad = await construirSeguridad({ clave, correo });
    if (u.id === usuarios.activo) { estado.seguridad = seguridad; guardar(); }
    else { const d = cargar(u.id); d.seguridad = seguridad; localStorage.setItem(claveDe(u.id), JSON.stringify(d)); }
    entrarComo(u.id);
    toast(`Contraseña creada. ¡Dentro, ${usuarioActual().nombre}! 🔓`);
    return;
  }
  if (ev.target.id === 'formRecIdent') {
    const u = usuarioPorCorreo(f.get('correo')) || usuarioPorNombre(f.get('usuarioNombre'));
    if (!u || !datosUsuario(u.id).seguridad?.activa) {
      $('#avisoRec').textContent = 'No encuentro ninguna cuenta con esos datos.';
      return;
    }
    recuperacionProc.usuario = u.id;
    ui.recMetodo = null;
    render();
    return;
  }
  if (ev.target.id === 'formPregunta') {
    if (await verificarRespuesta(f.get('respuesta'))) { recuperacionProc.ok = true; render(); }
    else $('#avisoRec').textContent = 'Esa respuesta no es correcta.';
    return;
  }
  if (ev.target.id === 'formCodigo') {
    const c = String(f.get('codigo') || '').trim();
    if (recuperacionProc.codigo && c === recuperacionProc.codigo && Date.now() < recuperacionProc.expira) { recuperacionProc.ok = true; render(); }
    else $('#avisoRec').textContent = 'Código incorrecto o caducado. Genera uno nuevo.';
    return;
  }
  if (ev.target.id === 'formMaestro') {
    const c = String(f.get('maestro') || '').trim().toUpperCase();
    if (c && c === String(seguridadRecuperacion()?.maestro || '').toUpperCase()) { recuperacionProc.ok = true; render(); }
    else $('#avisoRec').textContent = 'Ese código maestro no es correcto.';
    return;
  }
  if (ev.target.id === 'formNuevaClave') {
    const clave = String(f.get('clave') || ''), clave2 = String(f.get('clave2') || '');
    if (clave.length < 4) { $('#avisoRec').textContent = 'Usa al menos 4 caracteres.'; return; }
    if (clave !== clave2) { $('#avisoRec').textContent = 'Las dos contraseñas no coinciden.'; return; }
    const id = recuperacionProc.usuario || usuarios.activo;
    const salt = nuevoSalt();
    const nueva = { ...(seguridadRecuperacion() || {}), salt, hash: await hashClave(clave, salt), actualizado: new Date().toISOString() };
    if (id === usuarios.activo) { estado.seguridad = nueva; guardar(); }
    else { const d = cargar(id); d.seguridad = nueva; localStorage.setItem(claveDe(id), JSON.stringify(d)); }
    desbloqueado = true; recuperacionProc.ok = false; recuperacionProc.codigo = null; recuperacionProc.usuario = null; ui.recMetodo = null;
    entrarComo(id);
    toast('Contraseña actualizada. ¡Dentro! 🔓');
    return;
  }
  if (ev.target.id === 'formSeguridad') {
    const clave = String(f.get('clave') || ''), clave2 = String(f.get('clave2') || '');
    if (clave.length < 4) { avisoCampo('#avisoSeg', 'Usa al menos 4 caracteres.'); return; }
    if (clave !== clave2) { avisoCampo('#avisoSeg', 'Las dos contraseñas no coinciden.'); return; }
    if (!String(f.get('respuesta') || '').trim()) { avisoCampo('#avisoSeg', 'Escribe una respuesta a la pregunta.'); return; }
    if (!String(f.get('correo') || '').trim()) { avisoCampo('#avisoSeg', 'Escribe tu correo para poder recuperar la contraseña.'); return; }
    await crearSeguridad({ clave, pregunta: f.get('pregunta'), respuesta: f.get('respuesta'), correo: f.get('correo') });
    desbloqueado = true; guardar(); render();
    toast('Contraseña activada 🔒');
    return;
  }
  if (ev.target.id === 'formCambiarClave') {
    if (!await verificarClave(f.get('actual'))) { toast('La contraseña actual no es correcta'); return; }
    const clave = String(f.get('clave') || ''), clave2 = String(f.get('clave2') || '');
    if (clave.length < 4) { toast('Usa al menos 4 caracteres'); return; }
    if (clave !== clave2) { toast('Las dos contraseñas no coinciden'); return; }
    const salt = nuevoSalt();
    estado.seguridad = { ...estado.seguridad, salt, hash: await hashClave(clave, salt), actualizado: new Date().toISOString() };
    guardar(); cerrarModal(); render();
    toast('Contraseña cambiada');
    return;
  }
  if (ev.target.id === 'formCambiarPregunta') {
    const respuesta = String(f.get('respuesta') || '').trim();
    if (!respuesta) { toast('Escribe una respuesta'); return; }
    const correo = String(f.get('correo') || '').trim();
    if (!correo) { toast('Escribe tu correo de recuperación'); return; }
    estado.seguridad = {
      ...estado.seguridad,
      pregunta: Number(f.get('pregunta')) || 0,
      respuesta: await hashClave(normalizarResp(respuesta), estado.seguridad.salt),
      correo,
    };
    guardar(); cerrarModal(); render();
    toast('Datos de recuperación actualizados');
    return;
  }
  // ---- Ejercicios propios ----
  if (ev.target.id === 'formEjercicio') {
    const nombre = String(f.get('nombre') || '').trim();
    if (!nombre) { toast('Ponle un nombre al ejercicio'); return; }
    const musculos = f.getAll('musculos');
    if (!musculos.length) { toast('Elige al menos un músculo'); return; }
    const equipo = f.getAll('equipo');
    const datos = {
      nombre, patron: String(f.get('patron') || 'empuje_h'), musculos,
      equipo: equipo.length ? equipo : ['corporal'],
      compuesto: f.get('compuesto') === 'si',
      tipo: f.get('tipo') === 'tiempo' ? 'tiempo' : 'reps',
      desc: String(f.get('desc') || '').trim().slice(0, 300),
      maquinaCustom: String(f.get('maquinaCustom') || '').trim(),
      lineaCustom: String(f.get('lineaCustom') || '').trim(),
      musculoCustom: String(f.get('musculoCustom') || '').trim(),
      ajusteCustom: String(f.get('ajusteCustom') || '').trim(),
      videoCustom: idYouTube(f.get('videoCustom')) || String(f.get('videoCustom') || '').trim(),
    };
    const idEdit = ev.target.dataset.id;
    if (idEdit) {
      const e = (estado.ejerciciosPropios || []).find(x => x.id === idEdit);
      if (e) Object.assign(e, datos);
    } else {
      let id = slugEjercicio(nombre) || ('propio-' + Date.now().toString(36));
      if (porId[id]) id += '-' + Math.random().toString(36).slice(2, 5);
      estado.ejerciciosPropios = estado.ejerciciosPropios || [];
      estado.ejerciciosPropios.push({ id, ...datos, propio: true });
    }
    sincronizarPropios();
    guardar();
    ir('ejercicios/mios');
    toast(idEdit ? 'Ejercicio actualizado' : 'Ejercicio creado 🧩');
    return;
  }
  // ---- Cantidad de una entrada del diario ----
  if (ev.target.id === 'formCantidad') {
    const comida = ev.target.dataset.comida;
    const entrada = (estado.comidas[diaNutri()]?.[comida] || [])[Number(ev.target.dataset.i)];
    if (entrada) {
      if (entrada.tipo === 'receta') entrada.racion = Math.max(0.25, Number(f.get('racion')) || 1);
      else entrada.gramos = Math.max(1, Math.round(Number(f.get('gramos')) || 0));
      guardar();
    }
    cerrarModal(); render();
    toast('Cantidad actualizada');
    return;
  }
  if (ev.target.id === 'formUsuario') {
    const nombre = String(f.get('nombre') || '').trim();
    if (!nombre) { toast('Escribe un nombre'); return; }
    const avatar = String(f.get('avatar') || '').trim() || '🙂';
    const colorSel = String(f.get('color') || '0');
    const color = colorSel === 'custom' ? (String(f.get('colorCustom') || '').trim() || 0) : (Number(colorSel) || 0);
    const id = ev.target.dataset.id;
    if (usuarios.lista.some(u => u.id !== id && u.nombre.toLowerCase() === nombre.toLowerCase())) { toast('Ya hay un usuario con ese nombre'); return; }
    if (id) {
      const u = usuarios.lista.find(x => x.id === id);
      Object.assign(u, { nombre, avatar, color });
      if (u && ev.target.querySelector('[name=admin]')) u.admin = f.get('admin') === 'si';
      guardarUsuarios(); ir('usuarios'); toast('Usuario actualizado');
      return;
    }
    // Cuenta nueva: contraseña, correo y medidas obligatorias.
    const clave = String(f.get('clave') || ''), clave2 = String(f.get('clave2') || '');
    const correo = String(f.get('correo') || '').trim();
    if (clave.length < 4) { toast('Usa al menos 4 caracteres en la contraseña'); return; }
    if (clave !== clave2) { toast('Las dos contraseñas no coinciden'); return; }
    if (!correo) { toast('Escribe tu correo: lo usaré para recuperar tu contraseña'); return; }
    if (usuarios.lista.some(u => normalizarCorreo(datosUsuario(u.id)?.seguridad?.correo) === normalizarCorreo(correo))) { toast('Ya hay una cuenta con ese correo'); return; }
    const nutricion = nutricionDeForm(f);
    if (!nutricion.peso || !nutricion.altura || !nutricion.edad) { toast('Completa tu peso, tu altura y tu edad'); return; }
    const seguridad = await construirSeguridad({ clave, correo });
    const nuevoId = crearUsuario({
      nombre, avatar, color, nutricion, seguridad,
      medidas: [{ fecha: hoy(), peso: nutricion.peso, nota: 'Peso inicial' }],
      admin: !hayDueno(),
    });
    entrarComo(nuevoId);
    toast(`Cuenta de ${nombre} creada. Vamos a preparar su programa.`, { ms: 6000 });
    return;
  }
  if (ev.target.id === 'formIncidencia') {
    const titulo = String(f.get('titulo') || '').trim();
    const texto = String(f.get('texto') || '').trim();
    if (!titulo) { toast('Ponle un título'); return; }
    if (!texto) { toast('Cuéntame un poco más'); return; }
    const item = nuevaIncidencia({
      tipo: f.get('tipo') === 'problema' ? 'problema' : 'idea',
      categoria: String(f.get('categoria') || 'otro'),
      titulo, texto, autorId: usuarioActual().id, autorNombre: usuarioActual().nombre,
    });
    ev.target.reset();
    abrirEnvio(item);
    return;
  }
  if (ev.target.id === 'formVideo') {
    const vid = idYouTube(f.get('url'));
    if (!vid) { toast('Ese enlace no parece de YouTube. Copia el enlace del vídeo y pégalo.'); return; }
    estado.videos = { ...(estado.videos || {}), [ev.target.dataset.id]: vid };
    guardar(); cerrarModal(); render(); toast('Vídeo guardado ▶');
    return;
  }
  if (ev.target.id === 'formMedida') {
    guardarMedida(f);
    return;
  }
  if (ev.target.id === 'formPasos') {
    guardarPasos(f);
    return;
  }
  if (ev.target.id === 'formSaludFuente') {
    estado.saludUrl = String(f.get('url') || '').trim();
    guardar(); render();
    toast(estado.saludUrl ? 'Dirección guardada. Traeré los datos solo, cada vez que abras la app.' : 'Sincronización automática desactivada');
    return;
  }
  if (ev.target.id === 'formCoach') {
    const q = String(f.get('q') || '');
    ev.target.reset();
    await coachEnviar(q);
    return;
  }
  if (ev.target.id === 'formCoachIA') {
    const proveedor = String(f.get('proveedor') || '');
    if (!proveedor) { borrarConfig(); ui.coachIAOk = null; render(); toast('Coach en modo local'); return; }
    const clave = String(f.get('clave') || '').trim();
    if (!clave) { toast('Pega tu clave de la API'); return; }
    guardarConfig({ proveedor, clave, modelo: String(f.get('modelo') || '') });
    ui.coachIAOk = null; render();
    toast('Clave guardada. Prueba la conexión 👇');
    return;
  }
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

// La primera vez que se usa la app explica cómo ver las ayudas.
function consejoAyudas(tab) {
  if (estado.ajustes.consejoVisto || tab === 'bienvenida' || tab === 'login' || tab === 'recuperar' || !estado.plan) return;
  estado.ajustes.consejoVisto = true; guardar();
  const tactil = matchMedia('(pointer: coarse)').matches;
  setTimeout(() => toast(`Consejo: ${tactil ? 'mantén pulsado' : 'pasa el ratón por'} un botón para ver qué hace, y toca ⓘ para saber cómo funciona cada parte.`, { ms: 8000 }), 1200);
}

// =====================================================================
// Arranque
// =====================================================================
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
render();
comprobarRecordatorio();
// La IA integrada del navegador (Gemini Nano) tarda un instante en responder:
// cuando sepamos si está disponible, refresco las pantallas donde se muestra.
detectarNano().then(est => {
  if (est !== 'available' && est !== 'downloadable') return;
  if (['', 'hoy', 'inicio', 'coach', 'ajustes', 'ajustes/coach'].includes(ruta())) render();
});
