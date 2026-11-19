// Logros y retos mensuales de MiEntrenamiento.
// Motor puro: deriva todo del estado, sin DOM, almacenamiento ni fetch.
import { racha } from './stats.js';
import { lunes, hoyIso, sumarDias } from './generador.js';

// --- Catálogos -----------------------------------------------------------

export const LOGROS = [
  { id: 'primera', nombre: 'Primer entrenamiento', desc: 'Registra tu primera sesión en el historial.', icono: '🎬', meta: 1, unidad: 'sesiones' },
  { id: 'sesiones25', nombre: '25 sesiones', desc: 'Completa 25 entrenamientos.', icono: '🏋️', meta: 25, unidad: 'sesiones' },
  { id: 'racha4', nombre: 'Racha de un mes', desc: 'Entrena 4 semanas seguidas.', icono: '🔥', meta: 4, unidad: 'semanas' },
  { id: 'racha12', nombre: 'Racha de tres meses', desc: 'Entrena 12 semanas seguidas.', icono: '🔥', meta: 12, unidad: 'semanas' },
  { id: 'series100', nombre: '100 series', desc: 'Completa 100 series en el historial.', icono: '💪', meta: 100, unidad: 'series' },
  { id: 'volumen', nombre: '100 toneladas', desc: 'Mueve 100.000 kg sumando peso por repeticiones.', icono: '🏋️‍♀️', meta: 100000, unidad: 'kg' },
  { id: 'records', nombre: '10 récords', desc: 'Supera tu marca anterior en 10 ejercicios.', icono: '🏆', meta: 10, unidad: 'récords' },
  { id: 'medidas', nombre: '10 medidas', desc: 'Anota peso o perímetros 10 veces.', icono: '📏', meta: 10, unidad: 'registros' },
  { id: 'agua', nombre: '30 días hidratados', desc: 'Registra agua en 30 días distintos.', icono: '💧', meta: 30, unidad: 'días' },
  { id: 'comidas', nombre: '30 días nutridos', desc: 'Registra comidas en 30 días distintos.', icono: '🥗', meta: 30, unidad: 'días' },
  { id: 'variedad', nombre: '20 ejercicios', desc: 'Entrena 20 ejercicios distintos.', icono: '🧩', meta: 20, unidad: 'ejercicios' },
  { id: 'madrugador', nombre: 'Madrugador', desc: 'Completa 10 sesiones antes de las 9:00.', icono: '🌅', meta: 10, unidad: 'sesiones' },
];

export const RETOS = [
  { id: 'sesiones', titulo: 'Reto de sesiones', desc: 'Completa 8 sesiones este mes.', icono: '📅', meta: 8, unidad: 'sesiones' },
  { id: 'series', titulo: 'Reto de series', desc: 'Completa 60 series este mes.', icono: '💪', meta: 60, unidad: 'series' },
  { id: 'agua', titulo: 'Reto de hidratación', desc: 'Bebe 90 vasos de agua este mes.', icono: '💧', meta: 90, unidad: 'vasos' },
  { id: 'comidas', titulo: 'Reto de comidas', desc: 'Registra comidas 20 días este mes.', icono: '🥗', meta: 20, unidad: 'días' },
  { id: 'km', titulo: 'Reto de carrera', desc: 'Corre 20 km este mes.', icono: '🏃', meta: 20, unidad: 'km' },
  { id: 'volumen', titulo: 'Reto de volumen', desc: 'Mueve 50.000 kg este mes.', icono: '🏋️', meta: 50000, unidad: 'kg' },
  { id: 'variedad', titulo: 'Reto de variedad', desc: 'Prueba 8 ejercicios distintos este mes.', icono: '🧩', meta: 8, unidad: 'ejercicios' },
  { id: 'semanas', titulo: 'Reto de constancia', desc: 'Entrena 4 semanas del mes.', icono: '🔥', meta: 4, unidad: 'semanas' },
  { id: 'medidas', titulo: 'Reto de seguimiento', desc: 'Tómate 2 medidas este mes.', icono: '📏', meta: 2, unidad: 'medidas' },
  { id: 'minutos', titulo: 'Reto de tiempo', desc: 'Entrena 600 minutos este mes.', icono: '⏱️', meta: 600, unidad: 'min' },
  { id: 'madrugador', titulo: 'Reto madrugador', desc: 'Entrena 4 veces antes de las 9:00.', icono: '🌅', meta: 4, unidad: 'sesiones' },
  { id: 'records', titulo: 'Reto de récords', desc: 'Bate 2 récords este mes.', icono: '🏆', meta: 2, unidad: 'récords' },
];

// --- Utilidades locales --------------------------------------------------

const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const pad2 = n => String(n).padStart(2, '0');
const fechaIso = v => {
  const s = String(v ?? '').slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};
const enMes = (v, anio, mes) => String(v ?? '').startsWith(`${anio}-${pad2(mes + 1)}-`);
const pct = (actual, meta) => meta > 0
  ? Math.min(100, Math.max(0, Math.round(actual / meta * 100)))
  : 0;

// Devuelve la fecha del primer punto que alcanza la meta (o null).
function fechaMeta(puntos, meta) {
  if (meta <= 0) return null;
  return puntos.find(p => p.total >= meta)?.fecha ?? null;
}

// Convierte una lista ordenada en una serie acumulada con su fecha.
function acumular(items, valor, fecha) {
  let total = 0;
  return items.map(item => {
    total += valor(item);
    return { fecha: fecha(item), total };
  });
}

const porFecha = (a, b) => String(a.fecha ?? '').localeCompare(String(b.fecha ?? ''));

function historial(estado) {
  return (Array.isArray(estado?.historial) ? estado.historial : [])
    .filter(h => h && fechaIso(h.fecha))
    .map(h => ({ ...h, fechaOriginal: h.fecha, fecha: fechaIso(h.fecha) }))
    .sort(porFecha);
}

function seriesDe(h) {
  return Array.isArray(h?.ejercicios) ? h.ejercicios : [];
}

function seriesHechas(h) {
  return seriesDe(h).reduce((t, e) =>
    t + (Array.isArray(e?.series) ? e.series.filter(s => s && s.hecho !== false).length : 0), 0);
}

function volumenDe(h) {
  return Math.round(seriesDe(h).reduce((t, e) =>
    t + (Array.isArray(e?.series) ? e.series.reduce((a, s) =>
      a + (s?.hecho === false ? 0 : num(s?.kg) * num(s?.reps)), 0) : 0), 0));
}

// Valor comparable de una serie, parecido al 1RM usado en stats.js.
function mejorValor(series) {
  let mejor = 0;
  for (const s of Array.isArray(series) ? series : []) {
    const kg = num(s?.kg), reps = num(s?.reps);
    const val = kg && reps ? kg * (1 + reps / 30) : (kg || reps);
    if (val > mejor) mejor = val;
  }
  return mejor;
}

// Récords batidos por sesión; el primer entrenamiento de un ejercicio no cuenta.
function cuantosRecords(hist) {
  const mejores = new Map();
  return hist.map(h => {
    let n = 0;
    for (const e of seriesDe(h)) {
      const id = e.id ?? e.nombre ?? '';
      const anterior = mejores.get(id) ?? 0;
      const valor = mejorValor(e.series);
      if (anterior > 0 && valor > anterior) { mejores.set(id, valor); n++; }
      else if (!anterior && valor) mejores.set(id, valor);
    }
    return { fecha: h.fecha, n };
  });
}

function horasDe(h) {
  if (h?.hora != null) return Number(String(h.hora).slice(0, 2));
  if (typeof h?.inicio === 'number') return new Date(h.inicio).getHours();
  const m = String(h?.fechaOriginal ?? h?.fecha ?? '').match(/[T ](\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) : null;
}

const esTemprano = h => { const hora = horasDe(h); return hora != null && hora < 9; };

function medidasDe(estado) {
  return (Array.isArray(estado?.medidas) ? estado.medidas : [])
    .filter(m => m && fechaIso(m.fecha))
    .map(m => ({ ...m, fecha: fechaIso(m.fecha) }))
    .sort(porFecha);
}

function diasConAgua(estado) {
  return Object.entries(estado?.agua ?? {})
    .filter(([, vasos]) => num(vasos) > 0)
    .map(([fecha]) => ({ fecha: fechaIso(fecha) }))
    .filter(d => d.fecha)
    .sort(porFecha);
}

function tieneComidas(dia) {
  if (!dia || typeof dia !== 'object') return false;
  return Object.values(dia).some(v => Array.isArray(v) ? v.length > 0 : Boolean(v));
}

function diasConComidas(estado) {
  return Object.entries(estado?.comidas ?? {})
    .filter(([, comidas]) => tieneComidas(comidas))
    .map(([fecha]) => ({ fecha: fechaIso(fecha) }))
    .filter(d => d.fecha)
    .sort(porFecha);
}

// Ejercicios distintos acumulados fecha a fecha (variedad).
function puntosVariedad(hist) {
  const vistos = new Set();
  return hist.map(h => {
    for (const e of seriesDe(h)) {
      const id = e.id ?? e.nombre;
      if (id) vistos.add(id);
    }
    return { fecha: h.fecha, total: vistos.size };
  });
}

// --- Logros --------------------------------------------------------------

export function calcularLogros(estado, reto = null) {
  const hist = historial(estado);
  const puntosSesiones = acumular(hist, () => 1, h => h.fecha);
  const puntosSeries = acumular(hist, seriesHechas, h => h.fecha);
  const puntosVolumen = acumular(hist, volumenDe, h => h.fecha);
  const puntosRecords = acumular(cuantosRecords(hist), r => r.n, r => r.fecha);
  const puntosMedidas = acumular(medidasDe(estado), () => 1, m => m.fecha);
  const puntosAgua = acumular(diasConAgua(estado), () => 1, d => d.fecha);
  const puntosComidas = acumular(diasConComidas(estado), () => 1, d => d.fecha);
  const puntosVariedadLogro = puntosVariedad(hist);
  const puntosTemprano = acumular(hist.filter(esTemprano), () => 1, h => h.fecha);
  const semanas = racha(estado?.historial ?? []);

  // Cada logro apunta a la serie acumulada que mide y a la fecha en que se alcanzó.
  const medidas = {
    primera: { puntos: puntosSesiones, actual: hist.length },
    sesiones25: { puntos: puntosSesiones, actual: hist.length },
    racha4: { actual: semanas, fecha: semanas >= 4 ? hoyIso() : null },
    racha12: { actual: semanas, fecha: semanas >= 12 ? hoyIso() : null },
    series100: { puntos: puntosSeries, actual: puntosSeries[puntosSeries.length - 1]?.total ?? 0 },
    volumen: { puntos: puntosVolumen, actual: puntosVolumen[puntosVolumen.length - 1]?.total ?? 0 },
    records: { puntos: puntosRecords, actual: puntosRecords[puntosRecords.length - 1]?.total ?? 0 },
    medidas: { puntos: puntosMedidas, actual: puntosMedidas[puntosMedidas.length - 1]?.total ?? 0 },
    agua: { puntos: puntosAgua, actual: puntosAgua[puntosAgua.length - 1]?.total ?? 0 },
    comidas: { puntos: puntosComidas, actual: puntosComidas[puntosComidas.length - 1]?.total ?? 0 },
    variedad: { puntos: puntosVariedadLogro, actual: puntosVariedadLogro[puntosVariedadLogro.length - 1]?.total ?? 0 },
    madrugador: { puntos: puntosTemprano, actual: puntosTemprano[puntosTemprano.length - 1]?.total ?? 0 },
  };

  const lista = LOGROS.map(def => {
    const m = medidas[def.id] ?? { actual: 0 };
    const actual = Math.max(0, num(m.actual));
    const conseguido = def.meta > 0 && actual >= def.meta;
    return {
      id: def.id, nombre: def.nombre, desc: def.desc, icono: def.icono,
      conseguido, actual, meta: def.meta, progreso: pct(actual, def.meta),
      fecha: conseguido ? (m.fecha ?? fechaMeta(m.puntos ?? [], def.meta) ?? hoyIso()) : null,
    };
  });

  // El reto del mes se añade como entrada extra para poder mostrarlo junto a los logros.
  if (reto && typeof reto === 'object') {
    const p = progresoReto(estado, reto);
    lista.push({
      id: `reto:${reto.id ?? 'mes'}`,
      nombre: reto.titulo ?? reto.nombre ?? 'Reto del mes',
      desc: reto.desc ?? '', icono: reto.icono ?? '🎯',
      conseguido: p.completado, actual: p.actual, meta: p.meta,
      progreso: p.porcentaje, fecha: p.completado ? hoyIso() : null,
    });
  }
  return lista;
}

// --- Retos mensuales -----------------------------------------------------

// El índice depende solo del mes, así que todos los meses dan el mismo reto.
export function retoDelMes(fecha = new Date()) {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  const safe = Number.isNaN(d.getTime()) ? new Date() : d;
  const i = (safe.getFullYear() * 12 + safe.getMonth()) % RETOS.length;
  return { ...RETOS[i] };
}

const IDS_RETO = {
  sesiones: 'sesiones', series: 'series', agua: 'agua', comidas: 'comidas', km: 'km',
  volumen: 'volumen', variedad: 'variedad', semanas: 'semanas', medidas: 'medidas',
  minutos: 'minutos', madrugador: 'madrugador', records: 'records',
};
const UNIDADES_RETO = {
  sesiones: 'sesiones', series: 'series', vasos: 'agua', agua: 'agua',
  dias: 'comidas', 'días': 'comidas', km: 'km', kg: 'volumen',
  ejercicios: 'variedad', semanas: 'semanas', medidas: 'medidas',
  min: 'minutos', minutos: 'minutos', records: 'records', 'récords': 'records',
  madrugador: 'madrugador',
};

function claveReto(reto) {
  const id = String(reto?.id ?? '').toLowerCase();
  if (IDS_RETO[id]) return IDS_RETO[id];
  return UNIDADES_RETO[String(reto?.unidad ?? '').toLowerCase()] ?? null;
}

// Cuenta solo los eventos del mes indicado, según la medida del reto.
function medidaReto(estado, clave, anio, mes) {
  const hist = historial(estado).filter(h => enMes(h.fecha, anio, mes));
  switch (clave) {
    case 'sesiones': return hist.length;
    case 'series': return hist.reduce((t, h) => t + seriesHechas(h), 0);
    case 'volumen': return hist.reduce((t, h) => t + volumenDe(h), 0);
    case 'minutos': return Math.round(hist.reduce((t, h) => t + num(h.duracion) / 60, 0));
    case 'madrugador': return hist.filter(esTemprano).length;
    case 'variedad':
      return new Set(hist.flatMap(h => seriesDe(h).map(e => e.id ?? e.nombre).filter(Boolean))).size;
    case 'semanas':
      return new Set(hist.map(h => lunes(h.fecha)).filter(Boolean)).size;
    case 'medidas':
      return medidasDe(estado).filter(m => enMes(m.fecha, anio, mes)).length;
    case 'records':
      return cuantosRecords(historial(estado))
        .filter(r => enMes(r.fecha, anio, mes)).reduce((t, r) => t + r.n, 0);
    case 'agua':
      return Object.entries(estado?.agua ?? {})
        .filter(([f, v]) => enMes(f, anio, mes)).reduce((t, [, v]) => t + Math.max(0, num(v)), 0);
    case 'comidas':
      return diasConComidas(estado).filter(d => enMes(d.fecha, anio, mes)).length;
    case 'km':
      return (Array.isArray(estado?.carrera?.hechas) ? estado.carrera.hechas : [])
        .filter(c => enMes(c?.fecha, anio, mes)).reduce((t, c) => t + Math.max(0, num(c?.km)), 0);
    default: return 0;
  }
}

export function progresoReto(estado, reto, fecha = new Date()) {
  const f = fecha instanceof Date ? fecha : new Date(fecha);
  const d = Number.isNaN(f.getTime()) ? new Date() : f;
  const anio = d.getFullYear(), mes = d.getMonth();
  const meta = Math.max(0, num(reto?.meta));
  const actual = Math.max(0, num(medidaReto(estado, claveReto(reto), anio, mes)));
  // Último día del mes calculado con sumarDias para respetar años bisiestos.
  const ultimoDia = sumarDias(`${anio}-${pad2(mes + 1)}-01`, -1);
  const diasDelMes = Number(ultimoDia.slice(8, 10));
  const diasRestantes = Math.max(0, diasDelMes - d.getDate() + 1); // incluye hoy
  return {
    actual, meta, porcentaje: pct(actual, meta), diasRestantes,
    completado: meta > 0 && actual >= meta,
  };
}
