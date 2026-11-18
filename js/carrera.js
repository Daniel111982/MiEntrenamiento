// =====================================================================
// Carrera: planes de entrenamiento para corredores
// =====================================================================
// Motor puro: no toca el DOM ni el almacenamiento. Genera planes adaptados
// al objetivo del corredor (resistencia, velocidad, 5K, 10K, media...),
// calcula los ritmos de entrenamiento a partir de una marca de referencia y
// predice tiempos en otras distancias. Quien pinta y guarda es app.js.
import { hoyIso, lunes, sumarDias } from './generador.js';

// ---------------------------------------------------------------------
// Objetivos
// ---------------------------------------------------------------------
export const OBJETIVOS_CARRERA = {
  iniciacion: {
    nombre: 'Empezar a correr', icono: '🌱', color: 'verde', semanas: 8,
    desc: 'De cero a correr 20-25 minutos seguidos.',
    ayuda: 'Ideal si hace tiempo que no corres o empiezas de nuevo. Combina caminar y correr y va subiendo poco a poco.',
  },
  resistencia: {
    nombre: 'Ganar resistencia', icono: '🫁', color: 'azul', semanas: 10,
    desc: 'Aguantar más tiempo y más kilómetros.',
    ayuda: 'Base aeróbica: rodajes cómodos y tiradas largas para que el esfuerzo te cueste cada vez menos.',
  },
  velocidad: {
    nombre: 'Ganar velocidad', icono: '⚡', color: 'naranja', semanas: 8,
    desc: 'Correr más rápido en distancias cortas.',
    ayuda: 'Series cortas, cuestas y cambios de ritmo para ganar potencia y zancada.',
  },
  cinco: {
    nombre: 'Mejorar en 5K', icono: '🏃', color: 'violeta', semanas: 8,
    desc: 'Bajar tu marca de 5 kilómetros.',
    ayuda: 'Mezcla de series, tempo y rodajes para rendir al máximo en 5 km.',
  },
  diez: {
    nombre: 'Mejorar en 10K', icono: '🏃‍♂️', color: 'violeta', semanas: 10,
    desc: 'Bajar tu marca de 10 kilómetros.',
    ayuda: 'Más volumen y trabajo de umbral: la distancia donde el ritmo sostenido manda.',
  },
  media: {
    nombre: 'Media maratón', icono: '🏅', color: 'rojo', semanas: 12,
    desc: 'Preparar los 21,097 km.',
    ayuda: 'Tiradas largas progresivas y trabajo de umbral para llegar fuerte a los 21 km.',
  },
  perder: {
    nombre: 'Perder grasa corriendo', icono: '🔥', color: 'naranja', semanas: 8,
    desc: 'Quemar calorías con sesiones variadas.',
    ayuda: 'Sesiones entretenidas y variadas, con cambios de ritmo para mantener el gasto alto.',
  },
};

export const NIVELES_CARRERA = {
  principiante: { nombre: 'Principiante', icono: '🌱', desc: 'Corro poco o acabo de empezar' },
  intermedio: { nombre: 'Intermedio', icono: '🌿', desc: 'Corro 2-3 veces por semana' },
  avanzado: { nombre: 'Avanzado', icono: '🌳', desc: 'Entreno en serio y compito' },
};

// Tipos de sesión (icono y foco para pintarlos).
export const TIPOS_SESION = {
  caminar_correr: { nombre: 'Caminar y correr', icono: '🚶', foco: 'Iniciación' },
  suave: { nombre: 'Rodaje suave', icono: '🌿', foco: 'Aeróbico' },
  recuperacion: { nombre: 'Recuperación', icono: '🍃', foco: 'Recuperación' },
  largo: { nombre: 'Tirada larga', icono: '🛣️', foco: 'Resistencia' },
  fartlek: { nombre: 'Fartlek', icono: '🎲', foco: 'Cambios de ritmo' },
  tempo: { nombre: 'Tempo', icono: '🌡️', foco: 'Umbral' },
  umbral: { nombre: 'Series de umbral', icono: '📈', foco: 'Umbral' },
  series_cortas: { nombre: 'Series cortas', icono: '⚡', foco: 'Velocidad' },
  series_largas: { nombre: 'Series largas', icono: '🔁', foco: 'Potencia aeróbica' },
  cuestas: { nombre: 'Cuestas', icono: '⛰️', foco: 'Fuerza y velocidad' },
  progresivo: { nombre: 'Progresivo', icono: '↗️', foco: 'Aeróbico' },
  tecnica: { nombre: 'Técnica', icono: '🎯', foco: 'Técnica' },
  test: { nombre: 'Test', icono: '⏱️', foco: 'Control' },
};

// Semanas que puede durar un plan.
export const DURACIONES = [8, 10, 12];

// ---------------------------------------------------------------------
// Formato y lectura de tiempos y ritmos
// ---------------------------------------------------------------------
const pad2 = n => String(Math.round(n)).padStart(2, '0');
export const fmtRitmo = seg => (!seg ? '' : `${Math.floor(seg / 60)}:${pad2(seg % 60)}/km`);
export const fmtTiempo = seg => {
  const h = Math.floor(seg / 3600), m = Math.floor((seg % 3600) / 60), s = Math.round(seg % 60);
  return h ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`;
};
export const fmtKm = km => (km == null ? '' : `${(Math.round(km * 10) / 10).toString().replace('.', ',')} km`);

// «25:30» o «1:45:00» → segundos. «5:30» como ritmo → seg/km.
export function leerTiempo(txt) {
  const p = String(txt ?? '').trim().replace(',', ':').split(':').map(Number);
  if (!p.length || p.some(n => !Number.isFinite(n) || n < 0)) return null;
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  if (p.length === 2) return p[0] * 60 + p[1];
  if (p.length === 1) return p[0] * 60;
  return null;
}

// ---------------------------------------------------------------------
// Ritmos de entrenamiento a partir del ritmo fácil (seg/km)
// ---------------------------------------------------------------------
export function ritmosDe(facilSeg) {
  if (!facilSeg || facilSeg < 150 || facilSeg > 720) return null;
  return {
    recuperacion: facilSeg + 40,
    suave: facilSeg,
    largo: facilSeg + 15,
    progresivo: facilSeg - 25,
    fartlek: facilSeg - 55,
    tempo: facilSeg - 45,
    umbral: facilSeg - 60,
    series_largas: facilSeg - 75,
    series_cortas: facilSeg - 95,
    cuestas: facilSeg - 80,
  };
}

// ---------------------------------------------------------------------
// Marcas: predicción y ritmos a partir de una marca real
// ---------------------------------------------------------------------
export const DISTANCIAS = [
  { id: '3K', km: 3, nombre: '3 km' },
  { id: '5K', km: 5, nombre: '5 km' },
  { id: '10K', km: 10, nombre: '10 km' },
  { id: '21K', km: 21.097, nombre: 'Media maratón' },
  { id: '42K', km: 42.195, nombre: 'Maratón' },
];

// Fórmula de Riegel: T2 = T1 · (D2/D1)^1,06.
export const predecir = (distKm, tiempoSeg, objetivoKm) => Math.round(tiempoSeg * Math.pow(objetivoKm / distKm, 1.06));

export function marcasDesde(distKm, tiempoSeg) {
  return DISTANCIAS.map(d => ({ id: d.id, nombre: d.nombre, km: d.km, seg: predecir(distKm, tiempoSeg, d.km), ritmo: Math.round(predecir(distKm, tiempoSeg, d.km) / d.km) }));
}

// Ritmo fácil (conversacional) estimado a partir de una marca.
export function facilDesdeMarca(distKm, tiempoSeg) {
  const t5 = predecir(distKm, tiempoSeg, 5);
  return Math.round(t5 / 5 + 70);
}

// ---------------------------------------------------------------------
// Progresión del plan
// ---------------------------------------------------------------------
// Cada 4ª semana es de descarga y la última es la del test.
export function progresoCarrera(w, total) {
  const test = w >= total;
  const descarga = !test && w % 4 === 0;
  const frac = total > 1 ? (w - 1) / (total - 1) : 1;
  const factor = descarga ? 0.82 : test ? 0.7 : 1 + 0.4 * frac;
  const nombre = test ? 'Semana del test' : descarga ? 'Descarga' : 'Carga';
  return { semana: w, nombre, descarga, test, factor, frac };
}

// ---------------------------------------------------------------------
// Composición semanal: qué tipo de sesión va cada día según objetivo y días
// ---------------------------------------------------------------------
const COMPOSICION = {
  iniciacion: {
    2: ['caminar_correr', 'caminar_correr'],
    3: ['caminar_correr', 'caminar_correr', 'caminar_correr'],
    4: ['caminar_correr', 'recuperacion', 'caminar_correr', 'caminar_correr'],
    5: ['caminar_correr', 'recuperacion', 'caminar_correr', 'caminar_correr', 'caminar_correr'],
    6: ['caminar_correr', 'recuperacion', 'caminar_correr', 'caminar_correr', 'recuperacion', 'caminar_correr'],
  },
  resistencia: {
    2: ['suave', 'largo'],
    3: ['suave', 'fartlek', 'largo'],
    4: ['suave', 'fartlek', 'recuperacion', 'largo'],
    5: ['suave', 'series_cortas', 'recuperacion', 'tempo', 'largo'],
    6: ['suave', 'series_cortas', 'recuperacion', 'fartlek', 'suave', 'largo'],
  },
  velocidad: {
    2: ['suave', 'series_cortas'],
    3: ['suave', 'series_cortas', 'largo'],
    4: ['suave', 'series_cortas', 'recuperacion', 'cuestas'],
    5: ['suave', 'series_cortas', 'recuperacion', 'cuestas', 'largo'],
    6: ['suave', 'series_cortas', 'recuperacion', 'cuestas', 'series_largas', 'largo'],
  },
  cinco: {
    2: ['suave', 'series_cortas'],
    3: ['suave', 'series_cortas', 'largo'],
    4: ['suave', 'series_cortas', 'recuperacion', 'tempo'],
    5: ['suave', 'series_cortas', 'recuperacion', 'tempo', 'largo'],
    6: ['suave', 'series_cortas', 'recuperacion', 'series_largas', 'suave', 'largo'],
  },
  diez: {
    2: ['suave', 'series_largas'],
    3: ['suave', 'series_largas', 'largo'],
    4: ['suave', 'series_largas', 'recuperacion', 'largo'],
    5: ['suave', 'series_cortas', 'recuperacion', 'tempo', 'largo'],
    6: ['suave', 'series_cortas', 'recuperacion', 'tempo', 'suave', 'largo'],
  },
  media: {
    2: ['suave', 'largo'],
    3: ['suave', 'tempo', 'largo'],
    4: ['suave', 'series_largas', 'recuperacion', 'largo'],
    5: ['suave', 'series_largas', 'recuperacion', 'tempo', 'largo'],
    6: ['suave', 'series_largas', 'recuperacion', 'tempo', 'suave', 'largo'],
  },
  perder: {
    2: ['suave', 'fartlek'],
    3: ['suave', 'fartlek', 'largo'],
    4: ['suave', 'fartlek', 'recuperacion', 'largo'],
    5: ['suave', 'fartlek', 'recuperacion', 'tempo', 'largo'],
    6: ['suave', 'fartlek', 'recuperacion', 'tempo', 'suave', 'largo'],
  },
};

export const composicion = (objetivo, nDias) => {
  const tabla = COMPOSICION[objetivo] || COMPOSICION.resistencia;
  return [...(tabla[Math.min(6, Math.max(2, nDias))] || tabla[3])];
};

const CALIDAD = new Set(['fartlek', 'tempo', 'umbral', 'series_cortas', 'series_largas', 'cuestas']);
export const esCalidad = tipo => CALIDAD.has(tipo);

const DIST_TEST = { iniciacion: 3.5, resistencia: 5, velocidad: 3, cinco: 5, diez: 10, media: 21.097, perder: 5 };

// ---------------------------------------------------------------------
// Fábricas de sesiones
// ---------------------------------------------------------------------
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const r5 = n => Math.max(5, Math.round(n / 5) * 5);
const kmDe = (min, seg) => (seg ? +(min * 60 / seg).toFixed(1) : null);
const minDeKm = (km, seg) => (seg ? (km * seg) / 60 : 0);

const bCal = (ritmos, min, extra = '') => ({
  etiqueta: 'Calentamiento',
  texto: `${min} min de trote suave para subir pulsaciones y activar tobillos, cadera y rodillas.${extra ? ' ' + extra : ''}`,
  min, ritmo: ritmos?.suave || null,
});
const bEnf = (ritmos, min) => ({
  etiqueta: 'Enfriamiento',
  texto: `${min} min de trote muy suave y estiramientos de gemelos, cuádriceps e isquios.`,
  min, ritmo: ritmos?.recuperacion || null,
});
const bRodaje = (texto, min, ritmo) => ({ etiqueta: 'Rodaje', texto, min, ritmo: ritmo || null });
const bPrincipal = (texto, extra = {}) => ({ etiqueta: 'Parte principal', texto, ...extra });

function sesCaminarCorrer(ctx) {
  const { semana, total } = ctx;
  const idx = Math.min(7, Math.round(((semana - 1) / Math.max(1, total - 1)) * 7));
  const p = [
    { rep: 6, correr: 1, andar: 2 }, { rep: 6, correr: 2, andar: 2 }, { rep: 6, correr: 3, andar: 2 },
    { rep: 5, correr: 5, andar: 2 }, { rep: 4, correr: 8, andar: 2 }, { rep: 3, correr: 10, andar: 2 },
    { rep: 2, correr: 15, andar: 1 }, { rep: 1, correr: 25, andar: 0 },
  ][idx];
  const cal = 6;
  const min = cal + p.rep * (p.correr + p.andar);
  const desc = p.andar
    ? `${p.rep}×(${p.correr} min corriendo + ${p.andar} min andando).`
    : `Corre ${p.correr} min seguidos, sin parar. ¡Ya eres corredor!`;
  return {
    tipo: 'caminar_correr', nombre: 'Caminar y correr', foco: 'Iniciación', desc, min,
    km: null,
    bloques: [
      bRodaje(`${cal} min de caminata rápida para entrar en calor.`, cal, null),
      bPrincipal(desc + ' Alterna siempre en el mismo orden: nunca corras tan rápido que te falte el aire.', { reps: p.rep, min: p.correr }),
      bRodaje('5 min de caminata suave y estiramientos para acabar.', 5, null),
    ],
  };
}

function sesSuave(ctx) {
  const { nivel, factor, ritmos } = ctx;
  const base = nivel === 'principiante' ? 30 : nivel === 'avanzado' ? 50 : 40;
  const min = r5(base * factor);
  return {
    tipo: 'suave', nombre: 'Rodaje suave', foco: 'Aeróbico',
    desc: `Trote cómodo de ${min} min. Debes poder hablar sin ahogarte.`,
    min, km: kmDe(min, ritmos?.suave),
    bloques: [bRodaje(`Corre ${min} min a ritmo cómodo y constante. Si te cuesta respirar solo por la nariz, baja el ritmo.`, min, ritmos?.suave)],
  };
}

function sesRecuperacion(ctx) {
  const { ritmos } = ctx;
  const min = 25;
  return {
    tipo: 'recuperacion', nombre: 'Rodaje de recuperación', foco: 'Recuperación',
    desc: `${min} min muy suaves para soltar las piernas.`,
    min, km: kmDe(min, ritmos?.recuperacion),
    bloques: [bRodaje(`${min} min a ritmo muy suave, más lento que un rodaje normal. El objetivo es recuperar, no entrenar.`, min, ritmos?.recuperacion)],
  };
}

function sesLargo(ctx) {
  const { nivel, factor, ritmos, objetivo } = ctx;
  const base = objetivo === 'media' ? 75 : nivel === 'principiante' ? 45 : nivel === 'avanzado' ? 80 : 60;
  const min = r5(base * factor);
  return {
    tipo: 'largo', nombre: 'Tirada larga', foco: 'Resistencia',
    desc: `${min} min a ritmo cómodo para construir tu base.`,
    min, km: kmDe(min, ritmos?.largo),
    bloques: [bRodaje(`Corre ${min} min a ritmo suave y constante, más lento que en un 10K. Bebe cada 20-25 min si hace calor y cuida la zancada cuando llegue el cansancio.`, min, ritmos?.largo)],
  };
}

function sesFartlek(ctx) {
  const { nivel, ritmos, descarga } = ctx;
  const n = clamp((nivel === 'principiante' ? 6 : nivel === 'avanzado' ? 10 : 8) - (descarga ? 2 : 0), 4, 12);
  const cal = 12, enf = 8;
  const min = cal + n * 3 + enf;
  return {
    tipo: 'fartlek', nombre: 'Fartlek', foco: 'Cambios de ritmo',
    desc: `${n}×(1 min rápido + 2 min suave) entre calentamiento y enfriamiento.`,
    min, km: kmDe(min, ritmos?.suave),
    bloques: [
      bCal(ritmos, cal),
      bPrincipal(`${n} repeticiones de 1 min a ritmo vivo (sin llegar al máximo) seguidas de 2 min de trote suave para recuperar.${ritmos ? ` El minuto fuerte, en torno a ${fmtRitmo(ritmos.fartlek)}.` : ' El minuto fuerte debe notarse, pero controlando la respiración.'}`, { reps: n, min: 1, ritmo: ritmos?.fartlek || null }),
      bEnf(ritmos, enf),
    ],
  };
}

function sesTempo(ctx) {
  const { nivel, factor, ritmos } = ctx;
  const bloque = clamp(Math.round((nivel === 'avanzado' ? 25 : nivel === 'principiante' ? 15 : 20) * factor), 10, 35);
  const cal = 12, enf = 8;
  const min = cal + bloque + enf;
  return {
    tipo: 'tempo', nombre: 'Tempo', foco: 'Umbral',
    desc: `${bloque} min seguidos a ritmo "cómodamente duro" (umbral).`,
    min, km: kmDe(min, ritmos?.suave),
    bloques: [
      bCal(ritmos, cal),
      bPrincipal(`${bloque} min seguidos a ritmo de umbral: fuerte pero controlado, sin llegar a esprintar.${ritmos ? ` Busca unos ${fmtRitmo(ritmos.tempo)}.` : ' Deberías poder decir frases cortas, no mantener una conversación.'}`, { min: bloque, ritmo: ritmos?.tempo || null }),
      bEnf(ritmos, enf),
    ],
  };
}

function sesUmbral(ctx) {
  const { nivel, ritmos, descarga } = ctx;
  const reps = clamp((nivel === 'principiante' ? 3 : nivel === 'avanzado' ? 5 : 4) - (descarga ? 1 : 0), 2, 6);
  const dur = nivel === 'avanzado' ? 8 : 5;
  const rec = 90;
  const cal = 12, enf = 8;
  const min = Math.round(cal + reps * (dur + rec / 60) + enf);
  return {
    tipo: 'umbral', nombre: 'Series de umbral', foco: 'Umbral',
    desc: `${reps}×${dur} min a ritmo de umbral con 1:30 de recuperación.`,
    min, km: kmDe(min, ritmos?.suave),
    bloques: [
      bCal(ritmos, cal),
      bPrincipal(`${reps} series de ${dur} min a ritmo de umbral, con 1:30 de trote suave entre ellas.${ritmos ? ` Ritmo objetivo: ${fmtRitmo(ritmos.umbral)}.` : ''}`, { reps, min: dur, ritmo: ritmos?.umbral || null, rec: '1:30 suave' }),
      bEnf(ritmos, enf),
    ],
  };
}

function sesSeriesCortas(ctx) {
  const { nivel, ritmos, descarga } = ctx;
  const reps = clamp(Math.round((nivel === 'principiante' ? 6 : nivel === 'avanzado' ? 10 : 8) * (descarga ? 0.7 : 1)), 4, 12);
  const dist = nivel === 'avanzado' ? 600 : nivel === 'principiante' ? 300 : 400;
  const rec = nivel === 'avanzado' ? 90 : 120;
  const cal = 15, enf = 10;
  const workKm = (reps * dist) / 1000;
  const min = Math.round(cal + minDeKm(workKm, ritmos?.series_cortas || 280) + (reps * rec) / 60 + enf);
  const km = ritmos ? +(workKm + kmDe((reps * rec) / 60, ritmos.recuperacion) + kmDe(cal + enf, ritmos.suave)).toFixed(1) : null;
  return {
    tipo: 'series_cortas', nombre: 'Series cortas', foco: 'Velocidad',
    desc: `${reps}×${dist} m rápidos con ${fmtTiempo(rec)} de recuperación.`,
    min, km: km || null,
    bloques: [
      bCal(ritmos, cal, 'Incluye 4 rectas de 20 s para activar las piernas.'),
      bPrincipal(`${reps} repeticiones de ${dist} m a ritmo rápido (el de un 3-5K), con ${fmtTiempo(rec)} de trote suave o caminata entre series.${ritmos ? ` Ritmo objetivo: ${fmtRitmo(ritmos.series_cortas)}.` : ''}`, { reps, dist, ritmo: ritmos?.series_cortas || null, rec: fmtTiempo(rec) }),
      bEnf(ritmos, enf),
    ],
  };
}

function sesSeriesLargas(ctx) {
  const { nivel, ritmos, descarga } = ctx;
  const reps = clamp((nivel === 'principiante' ? 3 : nivel === 'avanzado' ? 5 : 4) - (descarga ? 1 : 0), 2, 6);
  const dist = nivel === 'principiante' ? 800 : 1000;
  const rec = 120;
  const cal = 15, enf = 10;
  const workKm = (reps * dist) / 1000;
  const min = Math.round(cal + minDeKm(workKm, ritmos?.series_largas || 300) + (reps * rec) / 60 + enf);
  const km = ritmos ? +(workKm + kmDe((reps * rec) / 60, ritmos.recuperacion) + kmDe(cal + enf, ritmos.suave)).toFixed(1) : null;
  return {
    tipo: 'series_largas', nombre: 'Series largas', foco: 'Potencia aeróbica',
    desc: `${reps}×${dist} m a ritmo vivo con 2 min de recuperación.`,
    min, km,
    bloques: [
      bCal(ritmos, cal),
      bPrincipal(`${reps} repeticiones de ${dist} m a ritmo de 5-10K, con 2 min de trote suave entre ellas.${ritmos ? ` Ritmo objetivo: ${fmtRitmo(ritmos.series_largas)}.` : ''}`, { reps, dist, ritmo: ritmos?.series_largas || null, rec: '2:00 suave' }),
      bEnf(ritmos, enf),
    ],
  };
}

function sesCuestas(ctx) {
  const { nivel, ritmos, descarga } = ctx;
  const reps = clamp((nivel === 'principiante' ? 6 : nivel === 'avanzado' ? 12 : 8) - (descarga ? 2 : 0), 4, 12);
  const dur = 30;
  const cal = 15, enf = 10;
  const min = Math.round(cal + reps * (dur + 75) / 60 + enf);
  return {
    tipo: 'cuestas', nombre: 'Cuestas', foco: 'Fuerza y velocidad',
    desc: `${reps} subidas de ${dur} s a tope, bajando andando para recuperar.`,
    min, km: ritmos ? kmDe(cal + enf, ritmos.suave) : null,
    bloques: [
      bCal(ritmos, cal, 'Busca una cuesta de 80-120 m con pendiente moderada.'),
      bPrincipal(`${reps} subidas de ${dur} s con zancada potente y brazos activos. Baja andando o trotando muy suave para recuperar del todo antes de la siguiente.`, { reps, min: dur / 60, ritmo: ritmos?.cuestas || null }),
      bEnf(ritmos, enf),
    ],
  };
}

function sesProgresivo(ctx) {
  const { nivel, factor, ritmos } = ctx;
  const min = r5((nivel === 'principiante' ? 35 : 45) * factor);
  const fuerte = Math.max(8, Math.round(min * 0.3));
  return {
    tipo: 'progresivo', nombre: 'Progresivo', foco: 'Aeróbico',
    desc: `${min} min empezando suave y acabando a buen ritmo.`,
    min, km: kmDe(min, ritmos?.suave),
    bloques: [
      bRodaje(`Corre ${min - fuerte} min a ritmo cómodo y, sin parar, los últimos ${fuerte} min ve subiendo el ritmo hasta acabar fuerte pero controlado.${ritmos ? ` Termina en torno a ${fmtRitmo(ritmos.progresivo)}.` : ''}`, min, ritmos?.suave),
    ],
  };
}

function sesTecnica(ctx) {
  const { ritmos } = ctx;
  const min = 40;
  return {
    tipo: 'tecnica', nombre: 'Técnica y educativos', foco: 'Técnica',
    desc: 'Rodaje con ejercicios de técnica para correr más eficiente.',
    min, km: kmDe(min, ritmos?.suave),
    bloques: [
      bCal(ritmos, 10),
      bPrincipal('Intercala cada 3-4 min un ejercicio de 30 s: skipping, talones al glúteo, zancada amplia y rodillas altas. Fíjate en correr con el tronco erguido y los hombros relajados.', { min: 20 }),
      bEnf(ritmos, 10),
    ],
  };
}

function sesTest(ctx) {
  const { objetivo, ritmos } = ctx;
  const dist = DIST_TEST[objetivo] || 5;
  const cal = 15, enf = 10;
  const seg = ritmos ? dist * ritmos.series_cortas : dist * 300;
  const min = Math.round(cal + seg / 60 + enf);
  const esMedia = dist > 15;
  return {
    tipo: 'test', nombre: esMedia ? 'Test: media maratón' : `Test de ${String(dist).replace('.', ',')} km`,
    foco: 'Control',
    desc: esMedia
      ? 'Recorre los 21,097 km a ritmo de competición. Es tu objetivo.'
      : `Corre ${String(dist).replace('.', ',')} km a tope para ver tu progreso y ajustar tus ritmos.`,
    min, km: dist,
    bloques: [
      bCal(ritmos, cal, 'Incluye 4-6 rectas de 20 s para activar.'),
      bPrincipal(esMedia ? 'Corre la media maratón a ritmo constante, dosificando desde el principio y apretando los últimos 3 km.' : `Recorre ${String(dist).replace('.', ',')} km a ritmo de competición, dando lo máximo que puedas mantener. Apunta tu tiempo.`, { km: dist, ritmo: ritmos?.series_cortas || null }),
      bEnf(ritmos, enf),
    ],
  };
}

const FABRICAS = {
  caminar_correr: sesCaminarCorrer, suave: sesSuave, recuperacion: sesRecuperacion, largo: sesLargo,
  fartlek: sesFartlek, tempo: sesTempo, umbral: sesUmbral, series_cortas: sesSeriesCortas,
  series_largas: sesSeriesLargas, cuestas: sesCuestas, progresivo: sesProgresivo, tecnica: sesTecnica, test: sesTest,
};

export function crearSesion(tipo, ctx) {
  const f = FABRICAS[tipo] || sesSuave;
  const s = f(ctx);
  const meta = TIPOS_SESION[s.tipo] || { nombre: s.nombre, icono: '🏃', foco: '' };
  return { ...s, icono: meta.icono, foco: s.foco || meta.foco };
}

// ---------------------------------------------------------------------
// Generación del plan completo
// ---------------------------------------------------------------------
export function generarPlanCarrera(perfil) {
  const dias = [...(perfil.dias || [0, 2, 4])].map(Number).sort((a, b) => a - b);
  const total = perfil.semanas || OBJETIVOS_CARRERA[perfil.objetivo]?.semanas || 8;
  const ritmos = ritmosDe(perfil.ritmo);
  const inicio = perfil.inicio || hoyIso();
  let lun = lunes(inicio);
  if (!dias.some(d => sumarDias(lun, d) >= inicio)) lun = sumarDias(lun, 7);

  const sesiones = [];
  for (let w = 1; w <= total; w++) {
    const prog = progresoCarrera(w, total);
    let kinds = composicion(perfil.objetivo, dias.length);
    if (prog.test) kinds = kinds.map((k, i) => (i === kinds.length - 1 ? 'test' : 'suave'));
    kinds.forEach((kind, idx) => {
      const fecha = sumarDias(lun, (w - 1) * 7 + dias[idx]);
      if (fecha < inicio) return;
      const s = crearSesion(kind, { ...prog, objetivo: perfil.objetivo, nivel: perfil.nivel, ritmos, semana: w, total });
      sesiones.push({ ...s, id: `c${w}-${idx}`, semana: w, dia: dias[idx], fecha, estado: 'pendiente', hist: null });
    });
  }

  return {
    creado: new Date().toISOString(), inicio, base: lun, semanas: total,
    objetivo: perfil.objetivo, nivel: perfil.nivel, dias, ritmo: perfil.ritmo || null,
    sesiones,
  };
}

// ---------------------------------------------------------------------
// Ayudas para pintar y resumir
// ---------------------------------------------------------------------
export const sesionesSemana = (plan, semana) => (plan?.sesiones || []).filter(s => s.semana === semana);
export const sesionesDeFecha = (plan, fecha) => (plan?.sesiones || []).filter(s => s.fecha === fecha);
export const proximaCarrera = plan => (plan?.sesiones || []).filter(s => s.estado !== 'hecha' && s.fecha >= hoyIso()).sort((a, b) => a.fecha.localeCompare(b.fecha))[0] || null;

export function semanaCarrera(plan, fecha = hoyIso()) {
  if (!plan?.base) return 1;
  const n = Math.floor((new Date(lunes(fecha)) - new Date(plan.base)) / (7 * 864e5)) + 1;
  return Math.min(plan.semanas, Math.max(1, n));
}

export function resumenPlan(plan) {
  const sesiones = plan?.sesiones || [];
  const km = sesiones.reduce((t, s) => t + (s.km || 0), 0);
  const min = sesiones.reduce((t, s) => t + (s.min || 0), 0);
  return { sesiones: sesiones.length, km: Math.round(km), horas: Math.round(min / 60) };
}

export function resumenHechas(hechas = []) {
  const km = hechas.reduce((t, h) => t + (Number(h.km) || 0), 0);
  const min = hechas.reduce((t, h) => t + (Number(h.min) || 0), 0);
  const seg = km > 0 ? Math.round((min * 60) / km) : null;
  return { veces: hechas.length, km: Math.round(km * 10) / 10, min, ritmo: seg };
}
