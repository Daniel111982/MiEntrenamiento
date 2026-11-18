// Asistente DanTal: contexto y avisos inteligentes.
// Separa siempre «Dato real» (lo que el usuario ha registrado) de «Estimación»
// (cálculos metabólicos o de recuperación).

import { racha, volumenSesion, volumenMuscular, recuperacion } from './stats.js';
import { lunes, hoyIso, iso, fase } from './generador.js';

const claves = o => Object.keys(o);

// Contexto completo que se usa para redactar los avisos.
export function construirContextoIA(estado = {}, objetivosNutri = {}) {
  const hist = estado.historial || [];
  const semana = lunes(hoyIso());
  const deSemana = hist.filter(h => lunes(iso(new Date(h.fecha))) === semana);
  const rec = recuperacion(hist);
  const vol = volumenMuscular(hist, 7);

  // ---- Datos reales (medidos o registrados) ----
  const medidas = (estado.medidas || []).slice().sort((a, b) => a.fecha.localeCompare(b.fecha));
  const pesos = medidas.filter(m => m.peso != null).map(m => ({ fecha: m.fecha, v: Number(m.peso) }));
  const pesoActual = pesos.length ? pesos[pesos.length - 1] : null;
  const pesoHace30 = pesos.filter(p => p.fecha <= sumarDiasIso(hoyIso(), -30)).pop() || null;

  const real = {
    sesiones: hist.length,
    sesionesSemana: deSemana.length,
    racha: racha(hist),
    volumenSemana: Math.round(deSemana.reduce((t, h) => t + volumenSesion(h), 0)),
    pesoActual,
    cambioPeso30: pesoActual && pesoHace30 ? Math.round((pesoActual.v - pesoHace30.v) * 10) / 10 : null,
    ultimaSesion: hist.length ? hist[hist.length - 1].fecha : null,
    recuperacion: rec,
    volumenMuscular: vol,
    musculosFatigados: claves(rec).filter(m => rec[m].pct < 60),
    musculosListos: claves(rec).filter(m => rec[m].horas != null && rec[m].pct >= 90),
  };

  // ---- Estimaciones (metabólicas / de recuperación) ----
  const estimacion = {
    kcal: objetivosNutri.kcal ?? null,
    protG: objetivosNutri.protG ?? null,
    carbsG: objetivosNutri.carbsG ?? null,
    grasaG: objetivosNutri.grasaG ?? null,
    fibraG: objetivosNutri.fibraG ?? null,
    aguaMl: objetivosNutri.aguaMl ?? null,
    tdee: objetivosNutri.tdee ?? null,
    bmr: objetivosNutri.bmr ?? null,
  };

  return { real, estimacion };
}

function sumarDiasIso(f, n) {
  const [y, m, d] = f.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return iso(dt);
}

const n0 = v => Math.round(v || 0).toLocaleString('es-ES');

// Genera una lista de avisos. Cada uno indica si es Dato real o Estimación.
export function generarInsightsDantal(estado = {}, objetivosNutri = {}, consumoHoy = null) {
  const ctx = construirContextoIA(estado, objetivosNutri);
  const { real, estimacion } = ctx;
  const out = [];

  // --- Datos reales ---
  if (ctx.real.sesiones === 0) {
    out.push({
      tipo: 'Dato real', icono: '🚀', titulo: 'Empieza tu registro',
      texto: 'Aún no hay sesiones guardadas. En cuanto completes la primera, verás aquí tu evolución y tus avisos personalizados.',
    });
  } else {
    out.push({
      tipo: 'Dato real', icono: '🏋️', titulo: `${real.sesionesSemana} ${real.sesionesSemana === 1 ? 'sesión' : 'sesiones'} esta semana`,
      texto: real.volumenSemana
        ? `Has movido ${n0(real.volumenSemana)} kg en total. Racha de ${real.racha} ${real.racha === 1 ? 'semana' : 'semanas'} seguidas.`
        : `Llevas ${real.racha} ${real.racha === 1 ? 'semana' : 'semanas'} seguidas entrenando.`,
    });
  }

  if (real.pesoActual && real.cambioPeso30 != null) {
    const s = real.cambioPeso30 > 0 ? '+' : '−';
    out.push({
      tipo: 'Dato real', icono: '⚖️', titulo: 'Tu peso de los últimos 30 días',
      texto: `Peso actual ${real.pesoActual.v} kg (${s}${Math.abs(real.cambioPeso30)} kg en 30 días).`,
    });
  }

  if (real.musculosFatigados.length) {
    out.push({
      tipo: 'Estimación', icono: '💤', titulo: 'Músculos aún recuperándose',
      texto: `Todavía cargados: ${real.musculosFatigados.slice(0, 4).join(', ')}. Deja 24-48 h antes de volver a trabajarlos con intensidad.`,
    });
  } else if (real.sesiones > 0) {
    out.push({
      tipo: 'Estimación', icono: '✅', titulo: 'Listo para entrenar',
      texto: 'Tus músculos están recuperados. Buen momento para una sesión exigente.',
    });
  }

  // --- Estimaciones ---
  if (estimacion.kcal) {
    out.push({
      tipo: 'Estimación', icono: '🔥', titulo: 'Tu objetivo energético',
      texto: `Gasto total estimado ${n0(estimacion.tdee)} kcal/día. Objetivo ${n0(estimacion.kcal)} kcal con ${estimacion.protG} g de proteína.`,
    });
  }
  if (estimacion.aguaMl) {
    out.push({
      tipo: 'Estimación', icono: '💧', titulo: 'Hidratación recomendada',
      texto: `Unos ${(estimacion.aguaMl / 1000).toFixed(1)} L de líquidos al día, incluida el agua de los alimentos y el extra por entrenar.`,
    });
  }

  if (consumoHoy) {
    const restante = Math.round((estimacion.kcal || 0) - (consumoHoy.kcal || 0));
    const protRest = Math.round((estimacion.protG || 0) - (consumoHoy.prot || 0));
    out.push({
      tipo: 'Dato real', icono: '🍽️', titulo: 'Hoy llevas registrado',
      texto: restante > 0
        ? `Te quedan ~${n0(restante)} kcal y ${protRest > 0 ? `${protRest} g de proteína` : 'proteína cubierta'}.`
        : `Has superado el objetivo en ~${n0(-restante)} kcal. Ajusta la próxima comida.`,
    });
  }

  return out;
}
