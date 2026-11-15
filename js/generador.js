// Generador de programas de MiEntrenamiento.
import { EJERCICIOS, EQUIPOS, porId } from './ejercicios.js';

const NIVELES = ['principiante', 'intermedio', 'avanzado'];

export const OBJETIVOS = {
  musculo: { nombre: 'Ganar músculo', icono: '💪', series: 3, reps: [8, 12], descanso: 90, desc: 'Hipertrofia: volumen moderado-alto.' },
  recomp: { nombre: 'Recomposición corporal', icono: '⚖️', series: 3, reps: [6, 10], descanso: 90, desc: 'Ganar músculo y perder grasa a la vez: fuerza + final metabólico.', finalizador: true },
  fuerza: { nombre: 'Ganar fuerza', icono: '🏋️', series: 4, reps: [4, 6], descanso: 180, desc: 'Cargas altas y pocas repeticiones.' },
  tonificar: { nombre: 'Tonificar', icono: '✨', series: 3, reps: [12, 15], descanso: 60, desc: 'Repeticiones altas y descansos cortos.' },
  perder: { nombre: 'Perder grasa', icono: '🔥', series: 3, reps: [12, 15], descanso: 45, desc: 'Circuitos densos y final metabólico.', finalizador: true },
};

export const METODOS = {
  normal: { nombre: 'Normal', desc: 'Series rectas con la misma carga.' },
  piramide: { nombre: 'Pirámide', desc: 'Cada serie sube la carga y baja las repeticiones.' },
  dropset: { nombre: 'Drop set', desc: 'Tras la última serie, baja un 20-30 % la carga y sigue sin descanso hasta el fallo.' },
  tabata: { nombre: 'Tabata', desc: '8 rondas de 20 s de trabajo y 10 s de descanso (4 minutos).' },
};

// Ciclo de 12 semanas en tres fases de 4, con la última semana de cada fase de descarga.
export const SEMANAS_CICLO = 12;
export function fase(semana) {
  const s = ((semana - 1) % SEMANAS_CICLO) + 1;
  const nombre = s <= 4 ? 'Acumulación' : s <= 8 ? 'Intensificación' : 'Realización';
  return { semana: s, nombre, descarga: s % 4 === 0 };
}

// Huecos de cada tipo de sesión, por orden de prioridad.
const SESIONES = {
  fullA: { nombre: 'Cuerpo completo A', huecos: ['sentadilla', 'empuje_h', 'tiron_v', 'bisagra', 'hombro_lat', 'core', 'biceps'] },
  fullB: { nombre: 'Cuerpo completo B', huecos: ['bisagra', 'empuje_h', 'tiron_h', 'zancada', 'empuje_v', 'biceps', 'triceps', 'core', 'gemelo'] },
  fullC: { nombre: 'Cuerpo completo C', huecos: ['zancada', 'empuje_h', 'tiron_h', 'sentadilla', 'hombro_post', 'biceps', 'core'] },
  torso: { nombre: 'Torso', huecos: ['empuje_h', 'tiron_h', 'empuje_v', 'tiron_v', 'hombro_lat', 'biceps', 'triceps'] },
  pierna: { nombre: 'Pierna', huecos: ['sentadilla', 'bisagra', 'zancada', 'femoral', 'gemelo', 'core', 'cuadriceps_aisl'] },
  empuje: { nombre: 'Empuje', huecos: ['empuje_h', 'empuje_v', 'pecho_aisl', 'hombro_lat', 'triceps', 'core'] },
  tiron: { nombre: 'Tirón', huecos: ['tiron_v', 'tiron_h', 'hombro_post', 'biceps', 'core', 'tiron_h'] },
  piernaP: { nombre: 'Pierna', huecos: ['sentadilla', 'bisagra', 'zancada', 'cuadriceps_aisl', 'femoral', 'gemelo'] },
};

// Sesiones por grupos musculares (para trabajar cada músculo 1 vez por semana).
Object.assign(SESIONES, {
  pechoTri: { nombre: 'Pecho y tríceps', huecos: ['empuje_h', 'empuje_h', 'pecho_aisl', 'empuje_v', 'triceps', 'triceps'] },
  espaldaBi: { nombre: 'Espalda y bíceps', huecos: ['tiron_v', 'tiron_h', 'tiron_h', 'hombro_post', 'biceps', 'biceps'] },
  piernaCompleta: { nombre: 'Pierna completa', huecos: ['sentadilla', 'bisagra', 'zancada', 'cuadriceps_aisl', 'femoral', 'gemelo', 'core'] },
  hombrosCore: { nombre: 'Hombros y core', huecos: ['empuje_v', 'hombro_lat', 'hombro_post', 'hombro_lat', 'core', 'core'] },
  pecho: { nombre: 'Pecho', huecos: ['empuje_h', 'empuje_h', 'pecho_aisl', 'pecho_aisl', 'empuje_h', 'empuje_v', 'triceps'] },
  espalda: { nombre: 'Espalda', huecos: ['tiron_v', 'tiron_h', 'tiron_v', 'tiron_h', 'hombro_post'] },
  brazos: { nombre: 'Brazos', huecos: ['biceps', 'triceps', 'biceps', 'triceps', 'core'] },
  cuadriceps: { nombre: 'Pierna: cuádriceps', huecos: ['sentadilla', 'zancada', 'sentadilla', 'cuadriceps_aisl', 'gemelo'] },
  gluteoFemoral: { nombre: 'Pierna: glúteo y femoral', huecos: ['bisagra', 'zancada', 'femoral', 'bisagra', 'gemelo', 'core'] },
});

// Reparto según cuántas veces por semana se entrena cada músculo.
export const FRECUENCIAS = {
  auto: { nombre: 'Automática', desc: 'Elijo el reparto más eficaz para tus días.' },
  1: { nombre: '1 vez', desc: 'Un grupo muscular por día. Sesiones con mucho volumen por músculo.' },
  2: { nombre: '2 veces', desc: 'El equilibrio recomendado para ganar músculo y fuerza.' },
  3: { nombre: '3 veces', desc: 'Cuerpo completo o torso/pierna. Menos volumen por sesión, más práctica.' },
};
const DIVISIONES_FREC = {
  1: {
    1: ['fullA'], 2: ['torso', 'pierna'], 3: ['empuje', 'tiron', 'piernaCompleta'],
    4: ['pechoTri', 'espaldaBi', 'piernaCompleta', 'hombrosCore'],
    5: ['pecho', 'espalda', 'piernaCompleta', 'hombrosCore', 'brazos'],
    6: ['pecho', 'espalda', 'cuadriceps', 'hombrosCore', 'brazos', 'gluteoFemoral'],
  },
  2: {
    2: ['fullA', 'fullB'], 3: ['torso', 'pierna', 'fullC'], 4: ['torso', 'pierna', 'torso', 'pierna'],
    5: ['empuje', 'tiron', 'piernaP', 'torso', 'pierna'], 6: ['empuje', 'tiron', 'piernaP', 'empuje', 'tiron', 'piernaP'],
  },
  3: {
    3: ['fullA', 'fullB', 'fullC'], 4: ['torso', 'pierna', 'fullA', 'fullB'], 5: ['fullA', 'fullB', 'fullC', 'torso', 'pierna'],
    6: ['torso', 'pierna', 'torso', 'pierna', 'torso', 'pierna'],
  },
};
// Frecuencias posibles con un número de días (no se puede trabajar un músculo más veces que días).
export const frecuenciaPosible = (f, dias) => f === 'auto' || Boolean(DIVISIONES_FREC[f]?.[dias]);

const DIVISIONES = {
  1: ['fullA'],
  2: ['fullA', 'fullB'],
  3: ['fullA', 'fullB', 'fullC'],
  4: ['torso', 'pierna', 'torso', 'pierna'],
  5: ['empuje', 'tiron', 'piernaP', 'torso', 'pierna'],
  6: ['empuje', 'tiron', 'piernaP', 'empuje', 'tiron', 'piernaP'],
};

// Hueco que refuerza cada músculo cuando el usuario lo prioriza.
const HUECO_ENFOQUE = {
  pecho: 'pecho_aisl', espalda: 'tiron_h', hombros: 'hombro_lat', biceps: 'biceps', triceps: 'triceps',
  cuadriceps: 'cuadriceps_aisl', femorales: 'femoral', gluteos: 'bisagra', gemelos: 'gemelo', abdomen: 'core',
};

export function equipoDisponible(perfil) {
  if (perfil.lugar === 'gimnasio') return new Set(Object.keys(EQUIPOS));
  return new Set(perfil.equipo || []);
}

export function candidatos(patron, perfil, equipo = equipoDisponible(perfil)) {
  const nivel = NIVELES.indexOf(perfil.nivel);
  return EJERCICIOS.filter(e =>
    e.patron === patron &&
    e.equipo.every(q => equipo.has(q)) &&
    NIVELES.indexOf(e.nivelMin || 'principiante') <= nivel);
}

// Prescripción base de un ejercicio dentro del programa.
export function prescripcion(ej, perfil, enfoque = perfil.enfoque || []) {
  const obj = OBJETIVOS[perfil.objetivo];
  let series = obj.series + (perfil.nivel === 'principiante' ? -1 : perfil.nivel === 'avanzado' ? 1 : 0);
  let [min, max] = obj.reps;
  let descanso = obj.descanso;
  if (!ej.compuesto) {
    min = Math.max(min, 8) + 2; max = Math.max(max, 12) + 3;
    descanso = Math.min(descanso, 75);
    series = Math.min(series, 3);
  }
  if (ej.musculos.some(m => enfoque.includes(m))) series += 1;
  series = Math.max(2, series);
  const base = { id: ej.id, series, metodo: 'normal', foco: ej.musculos.some(m => enfoque.includes(m)) };
  if (ej.tipo === 'tiempo') {
    const seg = perfil.nivel === 'principiante' ? 30 : perfil.nivel === 'avanzado' ? 60 : 45;
    return { ...base, tipo: 'tiempo', repsMin: seg, repsMax: seg, descanso: Math.min(descanso, 60) };
  }
  if (ej.patron === 'metabolico') return { ...base, tipo: 'reps', repsMin: 10, repsMax: 15, descanso: 45 };
  return { ...base, tipo: 'reps', repsMin: min, repsMax: max, descanso };
}

// Ajusta la prescripción a la semana del ciclo (fase y descarga).
export function prescribir(item, semana) {
  const f = fase(semana);
  const ej = porId[item.id];
  let { series, repsMin, repsMax, descanso } = item;
  if (item.tipo !== 'tiempo' && ej?.compuesto && item.metodo !== 'tabata') {
    if (f.nombre === 'Acumulación') { repsMin += 2; repsMax += 2; descanso = Math.max(45, descanso - 15); }
    if (f.nombre === 'Realización') { repsMin = Math.max(3, repsMin - 2); repsMax = Math.max(4, repsMax - 2); descanso += 30; }
  }
  if (f.descarga) series = Math.max(1, series - 1);
  return { ...item, series, repsMin, repsMax, descanso, fase: f };
}

// Duración estimada en minutos: ~40 s por serie + descansos + 1 min de cambio por ejercicio.
export function duracionEstimada(ejercicios) {
  const seg = ejercicios.reduce((t, e) => {
    if (e.metodo === 'tabata') return t + 240 + 60;
    const trabajo = e.tipo === 'tiempo' ? e.repsMax : 40;
    return t + e.series * trabajo + Math.max(0, e.series - 1) * e.descanso + 60 + (e.metodo === 'dropset' ? 45 : 0);
  }, 0);
  return Math.round(seg / 60) + 5; // + calentamiento
}

// Recorta una lista de ejercicios hasta que quepa en los minutos dados.
export function ajustarDuracion(ejercicios, minutos) {
  let lista = ejercicios.map(e => ({ ...e }));
  // 1) quita accesorios no prioritarios desde el final
  while (duracionEstimada(lista) > minutos && lista.length > 3) {
    let idx = -1;
    for (let i = lista.length - 1; i >= 0; i--) if (!lista[i].foco && !lista[i].final && !porId[lista[i].id]?.compuesto) { idx = i; break; }
    if (idx === -1) for (let i = lista.length - 1; i >= 0; i--) if (!lista[i].foco && !lista[i].final) { idx = i; break; }
    if (idx === -1) idx = lista.length - 1;
    lista.splice(idx, 1);
  }
  // 2) recorta series
  let guard = 50;
  while (duracionEstimada(lista) > minutos && guard--) {
    const e = [...lista].sort((a, b) => b.series - a.series)[0];
    if (e.series <= 2) break;
    e.series--;
  }
  return lista;
}

function construirSesion(nombre, huecos, perfil, usoPatron, equipo) {
  const enfoque = perfil.enfoque || [];
  const max = 9;
  const usados = new Set();
  let ejercicios = [];
  for (const h of huecos) {
    if (ejercicios.length >= max) break;
    const lista = candidatos(h, perfil, equipo).filter(e => !usados.has(e.id));
    if (!lista.length) continue;
    const n = usoPatron[h] || 0;
    usoPatron[h] = n + 1;
    const ej = lista[n % lista.length];
    usados.add(ej.id);
    ejercicios.push(prescripcion(ej, perfil, enfoque));
  }
  // Los ejercicios de los músculos prioritarios pasan al principio.
  ejercicios = [...ejercicios.filter(e => e.foco), ...ejercicios.filter(e => !e.foco)];
  // Enfoque abdominal: bloque de core al final.
  if (enfoque.includes('abdomen')) {
    const core = candidatos('core', perfil, equipo).filter(e => !usados.has(e.id)).slice(0, 2);
    core.forEach(e => { usados.add(e.id); ejercicios.push(prescripcion(e, perfil, enfoque)); });
  }
  // Perder grasa y recomposición terminan con un bloque metabólico (Tabata).
  if (OBJETIVOS[perfil.objetivo]?.finalizador) {
    const met = candidatos('metabolico', perfil, equipo).filter(e => !usados.has(e.id))[0];
    if (met) ejercicios.push({ ...prescripcion(met, perfil, enfoque), metodo: 'tabata', final: true });
  }
  return { nombre, ejercicios: ajustarDuracion(ejercicios, perfil.duracion || 60) };
}

export function generarPrograma(perfil) {
  const dias = perfil.diasSemana?.length || 3;
  const enfoque = perfil.enfoque || [];
  const usoPatron = {};
  const equipo = equipoDisponible(perfil);

  const d = Math.min(6, Math.max(1, dias));
  const division = DIVISIONES_FREC[perfil.frecuencia]?.[d] || DIVISIONES[d];
  const sesiones = division.map(clave => {
    const plantilla = SESIONES[clave];
    const huecos = [...plantilla.huecos];
    for (const m of enfoque) {
      const h = HUECO_ENFOQUE[m];
      if (h && h !== 'core' && !huecos.slice(0, 4).includes(h)) huecos.splice(Math.min(3, huecos.length), 0, h);
    }
    return construirSesion(plantilla.nombre, huecos, perfil, usoPatron, equipo);
  });

  const cuenta = {};
  sesiones.forEach(s => { cuenta[s.nombre] = (cuenta[s.nombre] || 0) + 1; });
  const visto = {};
  sesiones.forEach(s => {
    if (cuenta[s.nombre] > 1 && !/ [A-C]$/.test(s.nombre)) {
      visto[s.nombre] = (visto[s.nombre] || 0) + 1;
      s.nombre += ' ' + 'ABC'[visto[s.nombre] - 1];
    }
  });

  const plan = { creado: new Date().toISOString(), inicio: perfil.inicio, sesiones };
  plan.agenda = generarAgenda(plan, perfil);
  return plan;
}

// ---- Fechas (formato YYYY-MM-DD en hora local) ----
export const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const deIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const hoyIso = () => iso(new Date());
export function lunes(fechaIso) {
  const d = deIso(fechaIso); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(d);
}
export function sumarDias(fechaIso, n) { const d = deIso(fechaIso); d.setDate(d.getDate() + n); return iso(d); }

// Reparte las sesiones del ciclo en los días de la semana elegidos (0 = lunes).
export function generarAgenda(plan, perfil) {
  const dias = [...(perfil.diasSemana || [0, 2, 4])].sort((a, b) => a - b);
  const inicio = perfil.inicio || hoyIso();
  let lun = lunes(inicio);
  // Si en la semana de inicio ya no queda ningún día de entrenamiento, el ciclo empieza el lunes siguiente.
  if (!dias.some(d => sumarDias(lun, d) >= inicio)) lun = sumarDias(lun, 7);
  plan.base = lun;
  const agenda = [];
  let k = 0;
  for (let s = 0; s < SEMANAS_CICLO; s++) {
    for (const d of dias) {
      const fecha = sumarDias(lun, s * 7 + d);
      if (fecha < inicio) continue;
      agenda.push({ id: `${s + 1}-${d}`, fecha, semana: s + 1, sesion: k % plan.sesiones.length, estado: 'pendiente' });
      k++;
    }
  }
  return agenda;
}

// Sesión a la carta: músculos elegidos, material y duración.
const HUECOS_MUSCULO = {
  pecho: ['empuje_h', 'pecho_aisl'], espalda: ['tiron_v', 'tiron_h'], hombros: ['empuje_v', 'hombro_lat', 'hombro_post'],
  biceps: ['biceps'], triceps: ['triceps'], cuadriceps: ['sentadilla', 'zancada', 'cuadriceps_aisl'],
  femorales: ['bisagra', 'femoral'], gluteos: ['bisagra', 'zancada'], gemelos: ['gemelo'], abdomen: ['core', 'core'],
};
export function sesionALaCarta({ musculos, lugar, equipo, duracion, nombre }, perfil) {
  const p = { ...perfil, lugar, equipo, duracion, enfoque: [] };
  const eq = equipoDisponible(p);
  const huecos = [];
  const colas = musculos.map(m => [...(HUECOS_MUSCULO[m] || [])]);
  while (colas.some(c => c.length)) colas.forEach(c => { if (c.length) huecos.push(c.shift()); });
  const s = construirSesion(nombre || 'Sesión a la carta', huecos, p, {}, eq);
  s.personal = true;
  return s;
}

export function alternativas(id, perfil) {
  const ej = porId[id];
  if (!ej) return [];
  return candidatos(ej.patron, perfil).filter(e => e.id !== id);
}

// 1RM estimado (fórmula de Epley).
export function unoRM(kg, reps) {
  if (!kg || !reps) return 0;
  if (reps === 1) return kg;
  return Math.round(kg * (1 + reps / 30) * 10) / 10;
}
