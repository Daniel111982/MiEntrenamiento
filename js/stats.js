// Cálculos del seguimiento: récords, rachas, volumen y recuperación muscular.
import { porId, MUSCULOS } from './ejercicios.js';
import { unoRM, lunes, hoyIso, sumarDias, iso } from './generador.js';

export const volumenSesion = h => Math.round(h.ejercicios.reduce((t, e) => t + e.series.reduce((a, s) => a + (s.kg || 0) * (s.reps || 0), 0), 0));

export function mejorSerie(series) {
  let mejor = null;
  for (const s of series) {
    const rm = s.kg ? unoRM(s.kg, s.reps) : 0;
    const val = rm || s.reps;
    if (!mejor || val > mejor.val) mejor = { ...s, rm, val };
  }
  return mejor;
}

// Récord por ejercicio hasta (sin incluir) el índice dado del historial.
export function recordAntes(historial, id, hasta = historial.length) {
  let r = 0;
  for (let i = 0; i < hasta; i++) {
    const e = historial[i].ejercicios.find(x => x.id === id);
    if (e) r = Math.max(r, mejorSerie(e.series)?.val || 0);
  }
  return r;
}

export function recordsDeSesion(historial, idx) {
  const h = historial[idx];
  return h.ejercicios.map(e => {
    const prev = recordAntes(historial, e.id, idx);
    const m = mejorSerie(e.series);
    return prev > 0 && m && m.val > prev ? { id: e.id, antes: prev, ahora: m.val, kg: m.kg } : null;
  }).filter(Boolean);
}

// Semanas seguidas (hasta la actual) con al menos una sesión.
export function racha(historial) {
  const semanas = new Set(historial.map(h => lunes(iso(new Date(h.fecha)))));
  let lun = lunes(hoyIso());
  let n = 0;
  if (!semanas.has(lun)) lun = sumarDias(lun, -7); // la semana actual aún puede completarse
  while (semanas.has(lun)) { n++; lun = sumarDias(lun, -7); }
  return n;
}

// Series efectivas por músculo en los últimos 7 días (primario cuenta 1, secundario 0,5).
export function volumenMuscular(historial, dias = 7) {
  const desde = Date.now() - dias * 864e5;
  const res = Object.fromEntries(Object.keys(MUSCULOS).map(m => [m, 0]));
  for (const h of historial) {
    if (new Date(h.fecha).getTime() < desde) continue;
    for (const e of h.ejercicios) {
      const ej = porId[e.id];
      if (!ej) continue;
      ej.musculos.forEach((m, i) => { res[m] += e.series.length * (i === 0 ? 1 : 0.5); });
    }
  }
  return res;
}

// Semanas naturales (lunes a domingo) con volumen real de las últimas n semanas.
// Las semanas sin sesiones se devuelven a cero para dibujarlas como "sin dato".
export function volumenSemanas(historial, semanas = 8, hoy = hoyIso()) {
  const inicio = lunes(hoy);
  const porSemana = new Map();
  for (const h of historial || []) {
    if (!h?.fecha || Number.isNaN(Date.parse(h.fecha))) continue;
    const clave = lunes(String(h.fecha).slice(0, 10));
    const actual = porSemana.get(clave) || { kg: 0, sesiones: 0 };
    actual.kg += volumenSesion(h);
    actual.sesiones += 1;
    porSemana.set(clave, actual);
  }
  return Array.from({ length: semanas }, (_, i) => {
    const fecha = sumarDias(inicio, -7 * (semanas - 1 - i));
    const datos = porSemana.get(fecha) || { kg: 0, sesiones: 0 };
    return {
      fecha,
      etiqueta: new Date(fecha + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      kg: Math.round(datos.kg),
      sesiones: datos.sesiones,
    };
  });
}

// Recuperación estimada de cada músculo (0-100 %) según series y horas desde el último trabajo.
// `momento` permite calcularla también en días pasados para las gráficas.
export function recuperacion(historial, momento = Date.now()) {
  const ahora = momento;
  const res = Object.fromEntries(Object.keys(MUSCULOS).map(m => [m, { pct: 100, horas: null }]));
  for (const h of historial) {
    const t = new Date(h.fecha).getTime();
    const horas = (ahora - t) / 36e5;
    if (horas < 0 || horas > 96) continue;
    const carga = {};
    for (const e of h.ejercicios) {
      const ej = porId[e.id];
      if (!ej) continue;
      ej.musculos.forEach((m, i) => { carga[m] = (carga[m] || 0) + e.series.length * (i === 0 ? 1 : 0.5); });
    }
    for (const [m, series] of Object.entries(carga)) {
      // Más series => más tiempo de recuperación (de 36 h a 72 h).
      const total = Math.min(72, 36 + series * 4);
      const pct = Math.min(100, Math.round(horas / total * 100));
      if (pct < res[m].pct) res[m] = { pct, horas: Math.round(horas) };
    }
  }
  return res;
}

// Recuperación media de los últimos días, calculada solo con sesiones reales.
// Se suma cada músculo por igual; también se indica el músculo más fatigado.
export function recuperacionDiaria(historial, dias = 14, hoy = hoyIso()) {
  return Array.from({ length: dias }, (_, i) => {
    const fecha = sumarDias(hoy, -dias + 1 + i);
    const finDelDia = new Date(fecha + 'T23:59:59').getTime();
    const rec = recuperacion(historial, finDelDia);
    const entries = Object.entries(rec);
    const pct = Math.round(entries.reduce((t, [, r]) => t + r.pct, 0) / entries.length);
    let peor = null;
    for (const [m, r] of entries) if (!peor || r.pct < peor.r.pct) peor = { m, r };
    return {
      fecha,
      etiqueta: new Date(fecha + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
      pct,
      masFatigado: peor ? MUSCULOS[peor.m] : '',
      masFatigadoPct: peor ? peor.r.pct : 100,
    };
  });
}

export function historialCSV(historial) {
  const filas = [['fecha', 'sesion', 'ejercicio', 'serie', 'kg', 'reps', '1rm_estimado']];
  for (const h of historial) for (const e of h.ejercicios) e.series.forEach((s, i) =>
    filas.push([h.fecha.slice(0, 10), h.nombre, porId[e.id]?.nombre || e.id, i + 1, s.kg || 0, s.reps || 0, unoRM(s.kg, s.reps) || '']));
  return filas.map(f => f.map(v => /[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v).join(';')).join('\n');
}
