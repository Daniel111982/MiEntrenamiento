// Planificador de alimentación de DanTal.
// Funciones puras: nada de DOM, localStorage ni fetch. Todos los nutrientes
// salen de alimentos.js, que es la única fuente de cálculo de la app.
import {
  COMIDAS, CATEGORIAS_ALIMENTO, RECETAS, alimentoPorId,
  resumenReceta, resumenRecetaPorRacion, sumarMacros, macrosEntrada, microsEntrada,
} from './alimentos.js';
import { hoyIso, lunes, sumarDias } from './generador.js';

export const COMIDA_KEYS = Object.keys(COMIDAS);
const clon = v => JSON.parse(JSON.stringify(v));
const numero = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const texto = v => String(v ?? '');
const nuevoId = () => `pe-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const comidaValida = c => Object.prototype.hasOwnProperty.call(COMIDAS, c);
const fechaValida = f => /^\d{4}-\d{2}-\d{2}$/.test(texto(f));

export const planVacio = () => ({});

// Acepta planes guardados con versiones anteriores y descarta entradas rotas.
export function normalizarPlan(plan) {
  const out = planVacio();
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) return out;
  for (const [fecha, dia] of Object.entries(plan)) {
    if (!fechaValida(fecha) || !dia || typeof dia !== 'object') continue;
    const comidas = {};
    for (const c of COMIDA_KEYS) {
      const lista = Array.isArray(dia.comidas?.[c]) ? dia.comidas[c] : [];
      comidas[c] = lista
        .filter(e => e && typeof e === 'object' && e.id && (e.tipo === 'alimento' || e.tipo === 'receta'))
        .map(e => ({
          ...e,
          entradaId: texto(e.entradaId) || nuevoId(),
          gramos: e.tipo === 'alimento' ? Math.max(1, Math.round(numero(e.gramos))) : undefined,
          racion: e.tipo === 'receta' ? Math.max(0.25, numero(e.racion) || 1) : undefined,
          ingredientes: e.tipo === 'receta' && Array.isArray(e.ingredientes)
            ? e.ingredientes.map(i => ({ ...i, gramos: Math.max(1, Math.round(numero(i.gramos))) }))
            : undefined,
          pasadoAlDiario: e.pasadoAlDiario || null,
        }));
    }
    out[fecha] = { comidas };
  }
  return out;
}

export function diaDelPlan(plan, fecha) {
  const p = normalizarPlan(plan);
  return clon(p[fecha] || { comidas: Object.fromEntries(COMIDA_KEYS.map(c => [c, []])) });
}

export function semanaDelPlan(plan, fecha = hoyIso(), consumo = {}) {
  const inicio = lunes(fechaValida(fecha) ? fecha : hoyIso());
  const p = normalizarPlan(plan);
  return Array.from({ length: 7 }, (_, i) => {
    const f = sumarDias(inicio, i);
    const dia = p[f] || { comidas: Object.fromEntries(COMIDA_KEYS.map(c => [c, []])) };
    return {
      fecha: f,
      indice: i,
      comidas: dia.comidas,
      macros: macrosDiaPlan(dia),
      consumo: consumo?.[f] ? macrosComidaPlan(Object.values(consumo[f]).flat()) : null,
    };
  });
}

export function macrosEntradaPlan(entrada) {
  return macrosEntrada(entrada);
}

export function microsEntradaPlan(entrada) {
  return microsEntrada(entrada);
}

export function macrosComidaPlan(entradas = []) {
  return sumarMacros((Array.isArray(entradas) ? entradas : []).map(macrosEntrada));
}

export function macrosDiaPlan(dia) {
  return macrosComidaPlan(COMIDA_KEYS.flatMap(c => dia?.comidas?.[c] || []));
}

export function crearEntradaAlimento(alimentoId, gramos, meta = {}) {
  const a = alimentoPorId(alimentoId);
  if (!a) return null;
  return {
    entradaId: nuevoId(),
    tipo: 'alimento',
    id: a.id,
    nombre: a.nombre,
    gramos: Math.max(1, Math.round(numero(gramos) || a.porcion || 100)),
    marca: a.marca || '',
    ean: a.ean || '',
    origen: a.origen || '',
    macros100: a.macros100 || null,
    micros100: a.micros100 || null,
    pasadoAlDiario: null,
    ...meta,
  };
}

export function crearEntradaReceta(receta, { racion = 1, ingredientes = null, meta = {} } = {}) {
  if (!receta?.id) return null;
  const ings = (ingredientes || receta.ingredientes || []).map(i => ({
    id: i.id,
    nombre: i.nombre || alimentoPorId(i.id)?.nombre || i.id,
    gramos: Math.max(1, Math.round(numero(i.gramos))),
  }));
  if (!ings.length) return null;
  return {
    entradaId: nuevoId(),
    tipo: 'receta',
    id: receta.id,
    nombre: receta.nombre || receta.id,
    racion: Math.max(0.25, numero(racion) || 1),
    // Los ingredientes guardados son los de la receta completa. Este campo
    // permite que `racion: 1` signifique una ración y no la receta entera.
    racionesReceta: Math.max(1, numero(receta.raciones) || 1),
    ingredientes: ings,
    estado: receta.estado || 'calculado',
    fuente: receta.fuente || null,
    pasadoAlDiario: null,
    ...meta,
  };
}

function conDia(plan, fecha, fn) {
  const out = normalizarPlan(plan);
  if (!fechaValida(fecha)) return out;
  const dia = out[fecha] || { comidas: Object.fromEntries(COMIDA_KEYS.map(c => [c, []])) };
  dia.comidas = fn(clon(dia.comidas));
  out[fecha] = dia;
  return out;
}

export function anadirEntradaPlan(plan, fecha, comida, entrada) {
  if (!comidaValida(comida) || !entrada?.entradaId) return normalizarPlan(plan);
  return conDia(plan, fecha, comidas => {
    comidas[comida] = [...(comidas[comida] || []), clon(entrada)];
    return comidas;
  });
}

export function actualizarEntradaPlan(plan, fecha, comida, entradaId, cambios) {
  if (!comidaValida(comida)) return normalizarPlan(plan);
  return conDia(plan, fecha, comidas => {
    comidas[comida] = (comidas[comida] || []).map(e =>
      e.entradaId === entradaId ? { ...e, ...clon(cambios), entradaId } : e);
    return comidas;
  });
}

export function quitarEntradaPlan(plan, fecha, comida, entradaId) {
  if (!comidaValida(comida)) return normalizarPlan(plan);
  return conDia(plan, fecha, comidas => {
    comidas[comida] = (comidas[comida] || []).filter(e => e.entradaId !== entradaId);
    return comidas;
  });
}

function clonarEntradas(entradas, meta) {
  return (entradas || []).map(e => ({
    ...clon(e),
    entradaId: nuevoId(),
    pasadoAlDiario: null,
    copiadoDe: meta,
  }));
}

export function copiarComidaPlan(plan, origenFecha, comida, destinoFecha, destinoComida = comida) {
  if (!comidaValida(comida) || !comidaValida(destinoComida)) return normalizarPlan(plan);
  const dia = diaDelPlan(plan, origenFecha);
  const entradas = clonarEntradas(dia.comidas[comida], { fecha: origenFecha, comida, tipo: 'comida' });
  if (!entradas.length) return normalizarPlan(plan);
  return conDia(plan, destinoFecha, comidas => {
    comidas[destinoComida] = [...(comidas[destinoComida] || []), ...entradas];
    return comidas;
  });
}

export function copiarDiaPlan(plan, origenFecha, destinoFecha) {
  const dia = diaDelPlan(plan, origenFecha);
  let out = normalizarPlan(plan);
  for (const c of COMIDA_KEYS) {
    const entradas = clonarEntradas(dia.comidas[c], { fecha: origenFecha, comida: c, tipo: 'dia' });
    if (entradas.length) {
      out = conDia(out, destinoFecha, comidas => {
        comidas[c] = [...(comidas[c] || []), ...entradas];
        return comidas;
      });
    }
  }
  return out;
}

export function vaciarComidaPlan(plan, fecha, comida) {
  if (!comidaValida(comida)) return normalizarPlan(plan);
  return conDia(plan, fecha, comidas => { comidas[comida] = []; return comidas; });
}

// Una entrada del plan se convierte en una entrada del diario sin recalcular
// nada: los gramos y las raciones viajan tal cual y se guarda su origen.
export function entradaParaDiario(entrada, fecha, comida) {
  if (!entrada?.entradaId) return null;
  const base = clon(entrada);
  delete base.entradaId;
  delete base.pasadoAlDiario;
  delete base.copiadoDe;
  return {
    ...base,
    nombre: base.nombre || (base.tipo === 'receta' ? 'Receta' : alimentoPorId(base.id)?.nombre || base.id),
    origenPlan: { entradaId: entrada.entradaId, fecha, comida },
  };
}

export function yaPasadaAlDiario(comidas, entradaId) {
  if (!entradaId) return false;
  for (const dia of Object.values(comidas || {})) {
    for (const lista of Object.values(dia || {})) {
      if ((lista || []).some(e => e?.origenPlan?.entradaId === entradaId)) return true;
    }
  }
  return false;
}

export function pasarComidaAlDiario(plan, comidas, fecha, comida) {
  if (!comidaValida(comida)) return { plan: normalizarPlan(plan), comidas: clon(comidas || {}), n: 0 };
  const dia = diaDelPlan(plan, fecha);
  const destino = clon(comidas || {});
  const diaDiario = (destino[fecha] = destino[fecha] || {});
  const actualizadas = clon(dia.comidas[comida] || []);
  let n = 0;
  for (const entrada of actualizadas) {
    if (entrada.pasadoAlDiario || yaPasadaAlDiario(comidas, entrada.entradaId)) continue;
    (diaDiario[comida] = diaDiario[comida] || []).push(entradaParaDiario(entrada, fecha, comida));
    entrada.pasadoAlDiario = fecha;
    n += 1;
  }
  const nuevoPlan = clon(normalizarPlan(plan));
  const diaPlan = (nuevoPlan[fecha] = nuevoPlan[fecha] || { comidas: {} });
  diaPlan.comidas = diaPlan.comidas || {};
  diaPlan.comidas[comida] = actualizadas;
  return { plan: nuevoPlan, comidas: destino, n };
}

export function compararConObjetivos(macros, metas) {
  const out = {};
  // Las metas usan sufijos G (protG, carbsG…) y los macros no; acepto ambos.
  const equivalencias = { protG: 'prot', carbsG: 'carbs', grasaG: 'grasa', fibraG: 'fibra' };
  for (const [clave, meta] of Object.entries(metas || {})) {
    const valor = numero(macros?.[clave] ?? macros?.[equivalencias[clave]]);
    const objetivo = numero(meta);
    out[clave] = objetivo > 0 ? Math.round(valor / objetivo * 100) : null;
  }
  return out;
}

// Propuestas locales del Coach para el planificador. Usan recetas existentes y
// sus macros calculados por resumenReceta(); nunca inventan valores.
export function proponerComidasPlan({ recetas = [], metas = {}, consumo = {}, comida = 'cena', fecha = hoyIso(), limite = 3 } = {}) {
  const candidatas = (Array.isArray(recetas) ? recetas : []).filter(r =>
    (r.comidas || []).includes(comida) && r.estado !== 'incompleto');
  const deficit = {};
  for (const k of ['kcal', 'prot', 'carbs', 'grasa', 'fibra']) {
    deficit[k] = Math.max(0, numero(metas[k] || metas[`${k}G`]) - numero(consumo[k]));
  }
  const hayDeficit = Object.values(deficit).some(v => v > 0);
  const ordenadas = candidatas.map(r => {
    const m = resumenRecetaPorRacion(r).total;
    const puntos = hayDeficit
      ? ['prot', 'kcal', 'fibra'].reduce((s, k) => s + Math.min(numero(m[k]), deficit[k]), 0)
        / Math.max(1, ['prot', 'kcal', 'fibra'].reduce((s, k) => s + deficit[k], 0))
      : numero(m.prot) / Math.max(1, numero(m.kcal)) * 100;
    return { receta: r, macros: m, puntos };
  }).sort((a, b) => b.puntos - a.puntos).slice(0, Math.max(1, limite));

  return ordenadas.map(({ receta, macros, puntos }) => ({
    id: `plan-${receta.id}`,
    icono: receta.icono || '🍽️',
    titulo: receta.nombre,
    texto: `${Math.round(macros.kcal)} kcal · ${Math.round(macros.prot)} g proteína · ${Math.round(macros.fibra)} g fibra por ración.`,
    motivo: hayDeficit
      ? 'Cubre mejor el déficit calculado a partir de tus metas y de lo que ya has registrado.'
      : 'No hay un déficit claro; es una opción equilibrada con tus objetivos.',
    label: 'Añadir al plan',
    accion: { tipo: 'planificadorAnadir', recetaId: receta.id, fecha, comida, racion: 1 },
    puntos,
  }));
}

// Las entradas guardadas antes de distinguir raciones no tenían este campo.
// Se completa al cargar para que «1 ración» pase a ser siempre una ración real,
// sin alterar los gramos que el usuario ya tenía guardados.
export function normalizarRacionesReceta({ planComidas, comidas, recetasPropias = [] } = {}) {
  const recetas = new Map([...(Array.isArray(recetasPropias) ? recetasPropias : []), ...RECETAS]
    .map(r => [r.id, r]).filter(([id]) => id));
  const arreglar = e => {
    if (!e || e.tipo !== 'receta' || numero(e.racionesReceta) > 1) return e;
    const n = Math.max(1, numero(recetas.get(e.id)?.raciones) || 1);
    return n > 1 ? { ...e, racionesReceta: n } : e;
  };
  const plan = normalizarPlan(planComidas);
  for (const dia of Object.values(plan)) {
    for (const c of COMIDA_KEYS) dia.comidas[c] = (dia.comidas[c] || []).map(arreglar);
  }
  const diario = clon(comidas || {});
  for (const dia of Object.values(diario)) {
    if (!dia || typeof dia !== 'object') continue;
    for (const c of COMIDA_KEYS) {
      if (Array.isArray(dia[c])) dia[c] = dia[c].map(arreglar);
    }
  }
  return { planComidas: plan, comidas: diario };
}

// Lista de la compra de la semana visible del planificador. Suma ingredientes
// repetidos y cantidades compatibles (gramos) tanto de recetas como de alimentos
// sueltos. El factor de una receta es raciones elegidas / raciones de la receta.
export function listaCompraPlan(plan, fecha = null, dias = 7) {
  const inicio = lunes(fechaValida(fecha) ? fecha : hoyIso());
  const agrupado = new Map();
  const sumar = (id, nombre, gramos) => {
    if (!id || !(gramos > 0)) return;
    const previo = agrupado.get(id);
    if (previo) previo.gramos += gramos;
    else agrupado.set(id, {
      id,
      nombre: nombre || alimentoPorId(id)?.nombre || id,
      gramos,
      categoria: CATEGORIAS_ALIMENTO[alimentoPorId(id)?.cat] || 'Otros',
    });
  };
  for (let i = 0; i < dias; i++) {
    const dia = diaDelPlan(plan, sumarDias(inicio, i));
    for (const c of COMIDA_KEYS) {
      for (const e of dia.comidas[c] || []) {
        if (e.tipo === 'alimento') {
          sumar(e.id, e.nombre, numero(e.gramos));
        } else if (e.tipo === 'receta') {
          const porReceta = Math.max(1, numero(e.racionesReceta) || 1);
          const factor = (numero(e.racion) || 1) / porReceta;
          for (const ing of e.ingredientes || []) {
            sumar(ing.id, ing.nombre, numero(ing.gramos) * factor);
          }
        }
      }
    }
  }
  return [...agrupado.values()]
    .map(i => ({ ...i, gramos: Math.max(1, Math.round(i.gramos)) }))
    .sort((a, b) => a.categoria.localeCompare(b.categoria, 'es') ||
      a.nombre.localeCompare(b.nombre, 'es'));
}
