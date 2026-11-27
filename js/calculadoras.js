// FASE 9 · PARTE 1 — Motor de cálculos de energía, nutrición y fuerza.
// Funciones puras: no leen DOM, no guardan nada y no duplican el motor
// nutricional de alimentos.js ni el objetivo de metasNutricion() de app.js.
// La interfaz de app.js les pasa los datos ya validados del perfil.
import { unoRM } from './generador.js';
import { volumenSesion } from './stats.js';

const red = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;

// Dato desconocido (vacío/null) ≠ cero. Un 0 explícito es un valor válido.
export function numero(valor, { min = -Infinity, max = Infinity } = {}) {
  if (valor === null || valor === undefined || (typeof valor === 'string' && valor.trim() === '')) {
    return { ok: false, valor: null, motivo: 'desconocido' };
  }
  const n = Number(valor);
  if (!Number.isFinite(n)) return { ok: false, valor: null, motivo: 'no numérico' };
  if (n < min || n > max) return { ok: false, valor: null, motivo: `fuera de rango (${min}–${max})` };
  return { ok: true, valor: n, motivo: '' };
}

const faltanDe = (...datos) => datos.filter(d => !d.ok).map(d => d.motivo);

// Tasa metabólica basal · Mifflin-St Jeor (misma fórmula que metasNutricion).
export function tmbMifflin({ sexo, edad, alturaCm, pesoKg }) {
  const e = numero(edad, { min: 14, max: 100 });
  const h = numero(alturaCm, { min: 120, max: 230 });
  const p = numero(pesoKg, { min: 30, max: 400 });
  const faltan = [e, h, p].filter(x => !x.ok);
  if (faltan.length) {
    return {
      ok: false, tmb: null, faltan: faltanDe(e, h, p),
      avisos: ['Faltan edad, altura o peso: no se inventan datos para completar la TMB.'],
    };
  }
  const tmb = 10 * p.valor + 6.25 * h.valor - 5 * e.valor + (sexo === 'mujer' ? -161 : 5);
  return {
    ok: true, tmb: red(tmb, 1), pesoKg: p.valor, faltan: [],
    formula: 'Mifflin-St Jeor: 10·kg + 6,25·cm − 5·años + 5 (hombre) / −161 (mujer)',
    avisos: [],
  };
}

// Desglose del TDEE. El factor de actividad YA incluye NEAT, ejercicio y TEF:
// las cuatro cifras son partes del mismo total, no sumas adicionales.
export function desgloseEnergia(d = {}) {
  const t = tmbMifflin(d);
  if (!t.ok) return { ...t, tdee: null, avisos: t.avisos };
  const f = numero(d.factorActividad, { min: 1, max: 2.5 });
  if (!f.ok) return { ok: false, faltan: ['factor de actividad'], tmb: t.tmb, tdee: null, avisos: ['Factor de actividad no válido.'] };

  const tdee = t.tmb * f.valor;
  // TEF ≈ 10 % del gasto sin contar la propia TEF: TEF = TDEE − TDEE/1,1.
  const tef = tdee - tdee / 1.1;
  const actividad = tdee - t.tmb - tef; // NEAT + ejercicio, sin duplicarlos

  let ejercicio = 0;
  let ejercicioCalculado = false;
  const min = numero(d.ejercicioMinSemana, { min: 0, max: 1440 });
  const met = numero(d.ejercicioMET ?? 6, { min: 1, max: 12 });
  if (min.ok && met.ok && min.valor > 0) {
    // Gasto de ejercicio = MET · 3,5 · kg / 200 kcal por minuto (ACSM).
    const porMinuto = met.valor * 3.5 * t.pesoKg / 200;
    ejercicio = Math.min(actividad, porMinuto * min.valor / 7);
    ejercicioCalculado = true;
  }
  const neat = actividad - ejercicio;

  const obj = numero(d.objetivoFactor ?? 0, { min: -0.5, max: 0.5 });
  const base = tdee * (1 + (obj.ok ? obj.valor : 0));
  const manual = numero(d.kcalManual, { min: 800, max: 6000 });
  const fijado = numero(d.kcalObjetivo, { min: 800, max: 6000 });
  const kcal = fijado.ok ? fijado.valor : manual.ok ? manual.valor : base;

  const avisos = [
    'El factor de actividad ya incluye NEAT, ejercicio y TEF: estos conceptos son un desglose del mismo TDEE, no calorías que se suman.',
  ];
  if (!ejercicioCalculado) {
    avisos.push('Sin minutos de ejercicio no se separa la NEAT del entrenamiento: se muestran juntas y no se inventa una cifra.');
  } else if (ejercicio >= actividad - 0.01) {
    avisos.push('El ejercicio declarado agota todo el gasto por actividad; la NEAT estimada queda en 0 y puede estar infravalorada.');
  }

  return {
    ok: true, tmb: t.tmb, tdee: red(tdee, 0), tef: red(tef, 0), actividad: red(actividad, 0),
    ejercicio: red(ejercicio, 0), neat: red(neat, 0), ejercicioCalculado, mantenimiento: red(tdee, 0),
    base: red(base, 0), kcal: red(kcal, 0), ajuste: red(kcal - tdee, 0),
    formulas: {
      tmb: t.formula,
      tdee: 'TDEE = TMB × factor de actividad (1,2–1,9)',
      tef: 'TEF = TDEE − TDEE/1,1 (≈ 9 % del gasto)',
      neat: 'NEAT = TDEE − TMB − TEF − ejercicio',
      ejercicio: 'kcal/min = MET × 3,5 × kg / 200 (ACSM)',
    },
    avisos,
  };
}

// Reparto de macros. Los hidratos se calculan por diferencia para que
// proteína + grasa + hidratos cuadren exactamente con las calorías objetivo.
export function repartoMacros(d = {}) {
  const k = numero(d.kcal, { min: 800, max: 6000 });
  const p = numero(d.protG, { min: 0, max: 500 });
  const g = numero(d.grasaPct, { min: 5, max: 70 });
  const faltan = [k, p, g].filter(x => !x.ok);
  if (faltan.length) {
    return { ok: false, faltan: faltanDe(k, p, g), avisos: ['Faltan calorías, proteína o porcentaje de grasa válidos.'] };
  }

  const grasaG = k.valor * g.valor / 100 / 9;
  const protKcal = p.valor * 4;
  const grasaKcal = grasaG * 9;
  const carbsG = Math.max(0, (k.valor - protKcal - grasaKcal) / 4);
  const totalKcal = protKcal + grasaKcal + carbsG * 4;
  const coherente = Math.abs(totalKcal - k.valor) < 1;

  const peso = numero(d.pesoKg, { min: 30, max: 400 });
  const avisos = [];
  if (!coherente) {
    avisos.push('Proteína y grasa ya superan las calorías: los hidratos quedan en 0 g y el reparto no es coherente. Baja la proteína o el % de grasa.');
  }
  if (peso.ok && p.valor / peso.valor > 3) {
    avisos.push('La proteína supera 3 g/kg de peso; revisa si ese objetivo es necesario.');
  }
  if (!peso.ok) {
    avisos.push('Sin peso en el perfil no se calculan la hidratación ni la proteína por kg; el resto de macros sí es válido.');
  }

  return {
    ok: true, faltan: [], coherente,
    kcal: red(k.valor, 0), protG: red(p.valor, 0), grasaG: red(grasaG, 0), carbsG: red(carbsG, 0),
    pct: {
      prot: red(protKcal / k.valor * 100, 1),
      grasa: red(grasaKcal / k.valor * 100, 1),
      carbs: red(carbsG * 4 / k.valor * 100, 1),
    },
    totalKcal: red(totalKcal, 0),
    fibraG: red(k.valor * 14 / 1000, 0),
    aguaMl: peso.ok ? red((peso.valor * 0.035 + 0.5) * 1000, 0) : null,
    protPorKg: peso.ok ? red(p.valor / peso.valor, 1) : null,
    formulas: {
      grasa: 'grasa (g) = kcal × % grasa / 100 / 9',
      carbs: 'hidratos (g) = (kcal − proteína·4 − grasa·9) / 4',
      fibra: 'fibra ≈ 14 g por cada 1000 kcal',
      agua: 'agua ≈ 35 ml/kg + 500 ml',
    },
    avisos,
  };
}

// 1RM: Epley (reutiliza generador.js) y Brzycki. Nunca sustituye a una medición real.
export function estimar1RM(d = {}) {
  const c = numero(d.kg, { min: 1, max: 1000 });
  const r = numero(d.reps, { min: 1, max: 40 });
  const real = numero(d.rmReal, { min: 1, max: 1000 });
  const faltan = [];
  if (!c.ok) faltan.push('carga');
  if (!r.ok) faltan.push('repeticiones');
  if (faltan.length) {
    return { ok: false, faltan, avisos: ['Faltan kg y repeticiones: no se estima un 1RM sin datos.'] };
  }
  const reps = Math.round(r.valor);
  const avisos = [];
  if (reps > 15) {
    return {
      ok: false, faltan: [], avisos: ['Con más de 15 repeticiones no se estima el 1RM: las fórmulas pierden fiabilidad. Usa una serie corta.'],
    };
  }
  if (reps > 10) avisos.push('Más de 10 repeticiones: estimación de baja fiabilidad. Usa 1–5 repeticiones si puedes.');
  if (real.ok) avisos.push('Hay un 1RM medido: se usa como referencia principal; las fórmulas son solo comparación.');

  const epley = unoRM(c.valor, reps); // Epley existente: kg × (1 + reps/30)
  const brzycki = reps === 1 ? red(c.valor, 1) : red(c.valor * 36 / (37 - reps), 1);
  const principal = real.ok ? red(real.valor, 1) : (d.formula === 'brzycki' ? brzycki : epley);

  return {
    ok: true, faltan: [], epley, brzycki, principal,
    real: real.ok ? red(real.valor, 1) : null,
    esEstimacion: !real.ok,
    fiabilidad: reps <= 5 ? 'alta' : reps <= 10 ? 'media' : 'baja',
    formulas: {
      epley: '1RM = kg × (1 + repeticiones / 30)',
      brzycki: '1RM = kg × 36 / (37 − repeticiones)',
    },
    avisos,
  };
}

// Cargas redondeadas a 0,5 kg para que sean cargables en la barra.
export function cargasPorPorcentaje(rm, porcentajes = [100, 95, 90, 85, 80, 75, 70, 65, 60]) {
  const r = numero(rm, { min: 1, max: 1000 });
  if (!r.ok) return { ok: false, filas: [], avisos: ['Falta un 1RM válido para calcular porcentajes.'] };
  const filas = porcentajes.map(pct => ({ pct, kg: Math.round(r.valor * pct / 100 * 2) / 2 }));
  return { ok: true, filas, avisos: ['Cargas redondeadas a 0,5 kg (lastre disponible en la barra).'] };
}

// Inversa: con un 1RM y una carga, estima repeticiones posibles.
export function repsEstimadas(rm, carga, formula = 'epley') {
  const r = numero(rm, { min: 1, max: 1000 });
  const c = numero(carga, { min: 1, max: 1000 });
  if (!r.ok || !c.ok) return { ok: false, reps: null, avisos: ['Faltan 1RM o carga válidos.'] };
  const crudo = formula === 'brzycki'
    ? 37 - 36 * c.valor / r.valor
    : 30 * (r.valor / c.valor - 1);
  if (!Number.isFinite(crudo) || crudo < 1) {
    return { ok: false, reps: null, avisos: ['La carga supera el 1RM o no permite ni una repetición.'] };
  }
  const reps = Math.round(crudo);
  const avisos = [];
  if (reps > 10) avisos.push('Más de 10 repeticiones estimadas: baja fiabilidad, usa la cifra solo como orientación.');
  return {
    ok: true, reps, formula: formula === 'brzycki' ? 'Brzycki' : 'Epley',
    fiabilidad: reps <= 5 ? 'alta' : reps <= 10 ? 'media' : 'baja', avisos,
  };
}

// Volumen = Σ series × repeticiones × carga. Reutiliza volumenSesion(stats.js).
export function volumenEntrenamiento(filas = []) {
  if (!Array.isArray(filas) || !filas.length) {
    return { ok: false, volumen: 0, avisos: ['Añade al menos una serie para calcular el volumen.'] };
  }
  const avisos = [];
  const series = [];
  filas.forEach((fila, i) => {
    const s = numero(fila.series, { min: 1, max: 50 });
    const r = numero(fila.reps, { min: 1, max: 100 });
    const k = numero(fila.kg, { min: 0, max: 1000 });
    if (!s.ok || !r.ok || !k.ok) {
      avisos.push(`Fila ${i + 1}: revisa series, repeticiones y carga (0 kg es válido; vacío no).`);
      return;
    }
    for (let n = 0; n < s.valor; n++) series.push({ kg: k.valor, reps: r.valor });
  });
  if (!series.length) return { ok: false, volumen: 0, avisos };
  const volumen = volumenSesion({ ejercicios: [{ series }] });
  return {
    ok: true, volumen, series: series.length,
    avisos: [...avisos, 'El volumen cuenta kg movidos; no distingue intensidad ni recorrido.'],
  };
}

// ---------------------------------------------------------------------
// FASE 9 · PARTE 2 — propuesta inicial y objetivos editables.
// Sigue siendo un motor puro: no lee DOM, no guarda y no decide qué se
// persiste. app.js integra el resultado en estado.nutricion y metasNutricion().
// ---------------------------------------------------------------------
export const CAMPOS_META = ['kcal', 'protG', 'grasaG', 'carbsG', 'fibraG', 'aguaMl'];
export const ETIQUETAS_META = {
  kcal: 'Calorías', protG: 'Proteína', grasaG: 'Grasas',
  carbsG: 'Hidratos', fibraG: 'Fibra', aguaMl: 'Agua',
};

const LIMITES_META = {
  kcal: [800, 6000], protG: [0, 500], grasaG: [0, 1000],
  carbsG: [0, 1000], fibraG: [0, 200], aguaMl: [0, 10000],
};

function validarMeta(campo, valor) {
  const [min, max] = LIMITES_META[campo];
  return numero(valor, { min, max });
}

// Solo 'manual' y 'aceptado' son valores elegidos por la persona.
// 'calculado' se ignora: se recalcula desde el perfil en cada llamada.
function tomaOverride(overrides, campo) {
  const o = overrides?.[campo];
  if (!o || typeof o !== 'object') return null;
  if (o.origen !== 'manual' && o.origen !== 'aceptado') return null;
  const v = validarMeta(campo, o.valor);
  return v.ok ? { valor: v.valor, origen: o.origen } : null;
}

// Propuesta inicial: TMB, TDEE, mantenimiento, objetivo y reparto completo
// usando el mismo motor de la Parte 1. No inventa datos que falten.
export function propuestaNutricionInicial(d = {}) {
  const e = desgloseEnergia({
    sexo: d.sexo, edad: d.edad, alturaCm: d.altura, pesoKg: d.peso,
    factorActividad: d.factorActividad, objetivoFactor: d.objetivoFactor,
    kcalManual: d.kcalManual, kcalObjetivo: d.kcalObjetivo,
    ejercicioMinSemana: d.ejercicioMinSemana, ejercicioMET: d.ejercicioMET,
  });
  if (!e.ok) {
    return { ok: false, faltan: e.faltan || ['datos del perfil'], avisos: e.avisos, propuesta: null };
  }
  const prot = validarMeta('protG', d.protG);
  if (!prot.ok) {
    return {
      ok: false, faltan: ['proteína objetivo'],
      avisos: [...e.avisos, 'No se puede repartir la energía sin una proteína objetivo válida.'],
      propuesta: null,
    };
  }
  const m = repartoMacros({ kcal: e.kcal, protG: prot.valor, grasaPct: d.grasaPct ?? 25, pesoKg: e.pesoKg ?? d.peso });
  if (!m.ok) {
    return { ok: false, faltan: m.faltan, avisos: [...e.avisos, ...m.avisos], propuesta: null };
  }
  return {
    ok: true, faltan: [],
    propuesta: {
      tmb: e.tmb, tdee: e.tdee, mantenimiento: e.mantenimiento,
      kcal: e.kcal, ajuste: e.ajuste,
      protG: m.protG, grasaG: m.grasaG, carbsG: m.carbsG,
      fibraG: m.fibraG, aguaMl: m.aguaMl,
    },
    formulas: { ...e.formulas, ...m.formulas },
    avisos: [...e.avisos, ...m.avisos],
  };
}

// Aplica los objetivos elegidos por la persona sobre los valores automáticos.
// Un valor manual nunca se sobrescribe; los dependientes se recalculan y se
// explican en `cambios`. Los valores 'aceptados' sí se recalculan si cambia
// el perfil del que salieron, y se vuelven a explicar.
export function aplicarObjetivosNutricion(d = {}) {
  const auto = d.auto || {};
  const overrides = d.overrides || {};
  const autoN = {};
  const faltan = [];

  CAMPOS_META.forEach(campo => {
    const ov = tomaOverride(overrides, campo);
    const v = validarMeta(campo, auto[campo]);
    if (v.ok) autoN[campo] = v.valor;
    else if (ov?.origen === 'manual') autoN[campo] = 0; // el manual manda
    else faltan.push(campo);
  });
  if (faltan.length) {
    return {
      ok: false, faltan, valores: {}, origen: {}, cambios: [],
      avisos: ['Faltan valores automáticos válidos; no se aplican objetivos manuales sobre datos incompletos.'],
    };
  }

  const valores = {};
  const origen = {};
  CAMPOS_META.forEach(campo => {
    const ov = tomaOverride(overrides, campo);
    valores[campo] = ov?.origen === 'manual' ? ov.valor : autoN[campo];
    origen[campo] = ov?.origen === 'manual' ? 'manual'
      : ov?.origen === 'aceptado' ? 'aceptado' : 'calculado';
  });

  const avisos = [];
  const motivos = {};
  const pct = numero(d.grasaPct ?? 25, { min: 5, max: 70 });
  const difiere = campo => Math.abs(valores[campo] - autoN[campo]) >= 0.5;

  if (origen.grasaG !== 'manual' && pct.ok) {
    valores.grasaG = red(valores.kcal * pct.valor / 100 / 9, 0);
    if (difiere('kcal')) motivos.grasaG = 'se recalcula con las calorías objetivo';
  } else if (!pct.ok) {
    avisos.push('El porcentaje de grasa no es válido; se conserva la grasa calculada.');
  }

  if (origen.carbsG !== 'manual') {
    valores.carbsG = red(Math.max(0, (valores.kcal - valores.protG * 4 - valores.grasaG * 9) / 4), 0);
    const dependencias = [
      difiere('kcal') && 'calorías',
      difiere('protG') && 'proteína',
      difiere('grasaG') && 'grasa',
    ].filter(Boolean);
    if (dependencias.length) motivos.carbsG = `se recalcula al cambiar ${dependencias.join(', ')}`;
  }

  if (origen.fibraG !== 'manual') {
    valores.fibraG = red(valores.kcal * 14 / 1000, 0);
    if (difiere('kcal')) motivos.fibraG = 'se recalcula con las calorías';
  }

  const cambios = CAMPOS_META
    .filter(campo => Math.abs(valores[campo] - autoN[campo]) >= 0.5)
    .map(campo => ({
      campo, antes: autoN[campo], despues: valores[campo],
      motivo: motivos[campo] || (origen[campo] === 'manual'
        ? 'valor introducido manualmente'
        : 'recalculado desde el perfil'),
    }));

  const totalKcal = red(valores.protG * 4 + valores.grasaG * 9 + valores.carbsG * 4, 0);
  const coherente = Math.abs(totalKcal - valores.kcal) < 2;
  if (!coherente) {
    avisos.push('El reparto no cuadra con las calorías: revisa los valores manuales de proteína, grasa o hidratos.');
    if (valores.carbsG === 0) avisos.push('Los hidratos quedan en 0 g porque proteína y grasa ocupan todo el objetivo.');
  }

  return {
    ok: true, faltan: [], valores, origen, cambios, avisos, coherente, totalKcal,
    grasaPct: pct.ok ? pct.valor : null,
  };
}
