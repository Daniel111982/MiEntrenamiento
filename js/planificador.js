// Planificación adaptativa de MiEntrenamiento: funciones puras, sin DOM ni almacenamiento.
import { lunes, hoyIso, sumarDias } from './generador.js';
import { porId } from './ejercicios.js';

const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const DIAS_PREDET = [0, 2, 4];
const MAX_CITAS_POR_DIA = 2;
const CALENTAMIENTO = 5;
const MINUTOS_POR_EJERCICIO = 9; // Aproximación de 8-10 min por ejercicio contando descansos.
const MAX_SEMANAS_BUSQUEDA = 16;

// Copia profunda (structuredClone si está disponible; fallback para datos simples).
function copiar(valor) {
  if (typeof structuredClone === 'function') {
    try { return structuredClone(valor); } catch { /* se usa el fallback */ }
  }
  if (valor instanceof Date) return new Date(valor.getTime());
  if (Array.isArray(valor)) return valor.map(copiar);
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor).map(([clave, v]) => [clave, copiar(v)]));
  }
  return valor;
}

// Acepta Date, ISO con hora o cadena YYYY-MM-DD; si falla, usa hoy.
function aIso(fecha) {
  if (fecha instanceof Date && !Number.isNaN(fecha.getTime())) {
    const d = fecha;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  if (typeof fecha === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(fecha)) return fecha.slice(0, 10);
    const d = new Date(fecha);
    if (!Number.isNaN(d.getTime())) return aIso(d);
  }
  if (typeof fecha === 'number' && Number.isFinite(fecha)) return aIso(new Date(fecha));
  return hoyIso();
}

function parseIso(texto) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(texto ?? ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

function diaSemana(fecha) {
  const d = parseIso(fecha);
  return d ? (d.getDay() + 6) % 7 : 0;
}

function diasDelPerfil(perfil) {
  const brutos = Array.isArray(perfil?.diasSemana) ? perfil.diasSemana.map(Number) : [];
  const dias = [...new Set(brutos.filter(d => Number.isInteger(d) && d >= 0 && d <= 6))].sort((a, b) => a - b);
  return dias.length ? dias : [...DIAS_PREDET];
}

function semanaDe(fecha, base) {
  if (!parseIso(fecha) || !parseIso(base)) return 1;
  const inicio = parseIso(lunes(base));
  const actual = parseIso(lunes(fecha));
  return Math.max(1, Math.round((actual - inicio) / (7 * 864e5)) + 1);
}

function unir(items) {
  if (items.length <= 1) return items[0] || '';
  if (items.length === 2) return `${items[0]} y ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;
}

function cuenta(n, singular, plural) {
  return `${n} ${n === 1 ? singular : plural}`;
}

function perdida(cita, hoy) {
  if (!cita || cita.estado === 'hecha') return false;
  // Una cita ya reorganizada puede volver a recuperarse si tampoco se hizo.
  return cita.estado === 'perdida' || cita.fecha < hoy;
}

function mensajeDe(cambios, sinHueco) {
  if (!cambios.length) {
    return sinHueco
      ? 'No he encontrado hueco para recuperar la sesión perdida.'
      : 'No hay sesiones perdidas esta semana.';
  }
  const porFecha = new Map();
  cambios.forEach(c => porFecha.set(c.hasta, (porFecha.get(c.hasta) || 0) + 1));
  const dias = [...porFecha].map(([fecha, n]) =>
    `${DIAS[diaSemana(fecha)].toLowerCase()}${n > 1 ? ` (${n})` : ''}`);
  let texto = `He movido ${cuenta(cambios.length, 'sesión', 'sesiones')} al ${unir(dias)}.`;
  if (sinHueco) texto += ` No he encontrado hueco para ${cuenta(sinHueco, 'sesión', 'sesiones')}.`;
  return texto;
}

/**
 * Recupera las sesiones perdidas de la semana actual. Mantiene el id de cada
 * cita, le cambia la fecha y la marca como 'reorganizada'; el estado original
 * nunca se toca.
 */
export function reorganizarSemana(estado, { fecha = new Date() } = {}) {
  const original = estado?.plan?.agenda;
  if (!Array.isArray(original)) {
    return { agenda: [], cambios: [], mensaje: 'No hay planificación que reorganizar.' };
  }

  const agenda = copiar(original);
  const hoy = aIso(fecha);
  const lunActual = lunes(hoy);
  const dias = diasDelPerfil(estado?.perfil);
  const base = parseIso(estado?.plan?.base) ? lunes(aIso(estado.plan.base)) : lunActual;

  const perdidas = agenda
    .filter(c => parseIso(c?.fecha) && lunes(c.fecha) === lunActual && perdida(c, hoy))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || String(a.id).localeCompare(String(b.id)));

  if (!perdidas.length) {
    return { agenda, cambios: [], mensaje: 'No hay sesiones perdidas esta semana.' };
  }

  // Las citas que se mueven dejan sus huecos libres; las demás fijan ocupación.
  const enJuego = new Set(perdidas);
  const ocupacion = new Map();
  const fechaSesion = new Set();
  agenda.forEach(c => {
    if (enJuego.has(c) || !parseIso(c?.fecha)) return;
    ocupacion.set(c.fecha, (ocupacion.get(c.fecha) || 0) + 1);
    fechaSesion.add(`${c.fecha}|${c.sesion}`);
  });

  // Primero la semana actual (solo días futuros) y después las siguientes.
  const maxSemana = agenda.reduce((m, c) => Math.max(m, Number(c?.semana) || 0), 0);
  const totalSemanas = Math.min(MAX_SEMANAS_BUSQUEDA, Math.max(12, maxSemana + 2));
  const destinos = [];
  for (let s = 0; s < totalSemanas; s++) {
    for (const d of dias) {
      const f = sumarDias(lunActual, s * 7 + d);
      if (f >= hoy) destinos.push(f);
    }
  }

  const cambios = [];
  for (const cita of perdidas) {
    const desde = cita.fecha;
    const permitido = f => f !== desde &&
      (ocupacion.get(f) || 0) < MAX_CITAS_POR_DIA &&
      !fechaSesion.has(`${f}|${cita.sesion}`);
    // Se prefieren días totalmente libres antes que acumular dos sesiones.
    const destino = destinos.find(f => permitido(f) && !ocupacion.has(f)) || destinos.find(permitido);
    if (!destino) continue;

    cita.fecha = destino;
    cita.semana = semanaDe(destino, base);
    cita.estado = 'reorganizada';
    ocupacion.set(destino, (ocupacion.get(destino) || 0) + 1);
    fechaSesion.add(`${destino}|${cita.sesion}`);
    cambios.push({
      id: cita.id,
      desde,
      hasta: destino,
      motivo: destino < sumarDias(lunActual, 7)
        ? 'Sesión perdida recuperada en otro hueco de la semana'
        : 'Sin hueco en la semana: recuperada en una semana posterior',
    });
  }

  return {
    agenda,
    cambios,
    mensaje: mensajeDe(cambios, perdidas.length - cambios.length),
  };
}

// Minutos estimados de un ejercicio: cambio + trabajo + descansos.
function costeEjercicio(ej) {
  if (ej?.metodo === 'tabata') return 5;
  const series = Math.max(1, Number(ej?.series) || 1);
  const descanso = Math.max(0, Number(ej?.descanso) || 0);
  const trabajo = ej?.tipo === 'tiempo' ? (Math.max(0, Number(ej?.repsMax) || 0) / 60) : (40 / 60);
  return 1 + series * trabajo + (Math.max(0, series - 1) * descanso) / 60 +
    (ej?.metodo === 'dropset' ? 0.75 : 0);
}

function equipoRequerido(ej) {
  const fuente = porId[ej?.id] || ej || {};
  return Array.isArray(fuente.equipo) ? fuente.equipo.map(String) : [];
}

/**
 * Recorta una sesión al tiempo disponible y al equipo real. Siempre devuelve
 * una copia; si la original tenía ejercicios, conserva al menos uno.
 */
export function ajustarSesion(sesion, { minutos = 45, equipo = [], lugar = 'gimnasio' } = {}) {
  const copia = copiar(sesion && typeof sesion === 'object' ? sesion : {});
  const originales = Array.isArray(copia.ejercicios) ? copia.ejercicios : [];
  if (!originales.length) {
    copia.ajuste = 'No hay ejercicios que ajustar.';
    return copia;
  }

  const disponible = lugar === 'gimnasio' ? null : new Set((Array.isArray(equipo) ? equipo : []).map(String));
  const cabe = ej => !disponible || equipoRequerido(ej).every(q => disponible.has(q));
  const aptos = originales.filter(cabe);
  const sinEquipoTodos = aptos.length === 0;
  const candidatos = sinEquipoTodos
    ? [originales.slice().sort((a, b) => equipoRequerido(a).length - equipoRequerido(b).length)[0]]
    : aptos;
  const descartadosEquipo = sinEquipoTodos ? 0 : originales.length - aptos.length;

  const duracion = Number.isFinite(Number(minutos)) && Number(minutos) > 0 ? Number(minutos) : 45;
  const cupo = Math.max(1, Math.floor(duracion / MINUTOS_POR_EJERCICIO));
  const elegidos = [];
  let carga = CALENTAMIENTO;
  for (const ej of candidatos) {
    if (elegidos.length >= cupo) break;
    const coste = costeEjercicio(ej);
    if (elegidos.length && carga + coste > duracion) break;
    elegidos.push(ej);
    carga += coste;
  }
  if (!elegidos.length) elegidos.push(candidatos[0]);

  copia.ejercicios = elegidos;
  const porTiempo = candidatos.length - elegidos.length;
  const partes = [];
  if (porTiempo) partes.push(`se han quitado ${cuenta(porTiempo, 'ejercicio', 'ejercicios')} por falta de tiempo`);
  if (descartadosEquipo) partes.push(`${cuenta(descartadosEquipo, 'ejercicio', 'ejercicios')} descartados por equipo no disponible`);
  if (sinEquipoTodos) partes.push('se conserva el que menos equipo necesita para no dejar la sesión vacía');
  if (!partes.length) partes.push(`los ${cuenta(originales.length, 'ejercicio', 'ejercicios')} caben sin cambios`);
  copia.ajuste = `Ajuste para ${duracion} min en ${lugar}: ${partes.join('; ')}.`;
  return copia;
}

// Días entrenables de esta semana sin ninguna cita y que aún no han pasado.
export function huecosLibres(estado, { fecha = new Date() } = {}) {
  const agenda = estado?.plan?.agenda;
  if (!Array.isArray(agenda)) return [];
  const hoy = aIso(fecha);
  const lunActual = lunes(hoy);
  const ocupadas = new Set(agenda.filter(c => parseIso(c?.fecha)).map(c => c.fecha));
  return diasDelPerfil(estado?.perfil)
    .map(dia => ({ fecha: sumarDias(lunActual, dia), dia }))
    .filter(hueco => hueco.fecha >= hoy && !ocupadas.has(hueco.fecha));
}
