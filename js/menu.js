// Plan alimenticio y menú semanal de MiEntrenamiento.
// Funciones puras: nada de DOM, localStorage ni fetch.
import {
  RECETAS, CATEGORIAS_ALIMENTO, alimentoPorId,
  macrosDe, sumarMacros, resumenReceta,
} from './alimentos.js';

const ORDEN_COMIDAS = ['desayuno', 'comida', 'snack', 'cena'];
const PORCENTAJES = { desayuno: 0.25, comida: 0.35, cena: 0.30, snack: 0.10 };

// Reparto diario de macronutrientes en kcal (4 kcal/g proteína e hidratos, 9 kcal/g grasa).
const MACROS_OBJETIVO = {
  mantener: { prot: 0.25, carbs: 0.45, grasa: 0.30 },
  perder_grasa: { prot: 0.35, carbs: 0.30, grasa: 0.35 }, // menos carbos, más proteína
  ganar_musculo: { prot: 0.25, carbs: 0.55, grasa: 0.20 }, // más carbos
};

const redondear1 = n => Math.round(n * 10) / 10;
const mod = (n, m) => ((n % m) + m) % m;

function normalizarObjetivo(objetivo) {
  const txt = String(objetivo || '').toLowerCase().replace(/[\s-]+/g, '_');
  if (txt === 'perder' || txt === 'perder_grasa') return 'perder_grasa';
  if (txt === 'ganar' || txt === 'ganar_musculo') return 'ganar_musculo';
  return 'mantener';
}

// Devuelve la clave canónica de CATEGORIAS_ALIMENTO, o 'otros' si no existe.
function categoriaDe(id, categoria = '') {
  for (const cat of [alimentoPorId(id)?.cat, categoria]) {
    if (cat && Object.prototype.hasOwnProperty.call(CATEGORIAS_ALIMENTO, cat)) return cat;
  }
  return 'otros';
}

// Macros de 4 campos (sin fibra) con números limpios.
function limpiarMacros(m) {
  return {
    kcal: Math.round(m.kcal),
    prot: redondear1(m.prot),
    carbs: redondear1(m.carbs),
    grasa: redondear1(m.grasa),
  };
}

export function planAlimentacion({ kcal = 2000, objetivo = 'mantener' } = {}) {
  const total = Math.max(0, Number(kcal) || 0);
  const macro = MACROS_OBJETIVO[normalizarObjetivo(objetivo)];
  const plan = {};
  for (const comida of ORDEN_COMIDAS) {
    const parte = total * PORCENTAJES[comida];
    plan[comida] = {
      kcal: Math.round(parte),
      prot: redondear1(total * macro.prot / 4 * PORCENTAJES[comida]),
      carbs: redondear1(total * macro.carbs / 4 * PORCENTAJES[comida]),
      grasa: redondear1(total * macro.grasa / 9 * PORCENTAJES[comida]),
    };
  }
  return plan;
}

// Rotación determinista: cambia con el día, la semilla y la comida (nunca Math.random).
// Las favoritas aparecen el doble de veces; las descartadas se omiten salvo que
// no quede ninguna receta para esa comida (nunca dejamos una comida vacía).
function elegirReceta(comida, dia, semilla, favoritas = [], excluidas = []) {
  const base = RECETAS.filter(r => r.comidas.includes(comida));
  if (!base.length) return null;
  const activas = base.filter(r => !excluidas.includes(r.id));
  const candidatas = activas.length ? activas : base;
  const ponderadas = candidatas.flatMap(r => favoritas.includes(r.id) ? [r, r] : [r]);
  const indice = mod(semilla + dia + ORDEN_COMIDAS.indexOf(comida), ponderadas.length);
  return ponderadas[indice];
}

// Escala todos los gramos por el mismo factor objetivo/base y redondea.
function escalarIngredientes(receta, kcalObjetivo) {
  const kcalBase = resumenReceta(receta).total.kcal;
  const factor = kcalBase > 0 ? kcalObjetivo / kcalBase : 1;
  return receta.ingredientes.map(ing => {
    const alimento = alimentoPorId(ing.id);
    const g = Math.max(0, (Number(ing.gramos) || 0) * factor);
    // Porciones pequeñas a enteros; el resto a múltiplos de 5.
    const gramos = g < 20 ? Math.max(1, Math.round(g)) : Math.max(5, Math.round(g / 5) * 5);
    return {
      id: ing.id,
      nombre: alimento?.nombre || ing.id,
      gramos,
      categoria: categoriaDe(ing.id, alimento?.cat),
    };
  });
}

function macrosDeIngredientes(ingredientes) {
  return limpiarMacros(sumarMacros(ingredientes.map(i => macrosDe(alimentoPorId(i.id), i.gramos))));
}

export function generarMenu({ kcal = 2000, objetivo = 'mantener', dias = 7, semilla = 0, favoritas = [], excluidas = [] } = {}) {
  const objetivoPorComida = planAlimentacion({ kcal, objetivo });
  const totalDias = Math.max(0, Math.min(7, Math.trunc(Number(dias) || 0)));
  const sem = Math.trunc(Number(semilla) || 0);
  const menu = [];

  for (let dia = 0; dia < totalDias; dia++) {
    const comidas = {};
    let totalDia = { kcal: 0, prot: 0, carbs: 0, grasa: 0 };

    for (const nombreComida of ORDEN_COMIDAS) {
      const receta = elegirReceta(nombreComida, dia, sem, favoritas, excluidas);
      // Sin recetas de snack: la comida es null y no aporta kcal.
      if (!receta) {
        comidas[nombreComida] = null;
        continue;
      }
      const ingredientes = escalarIngredientes(receta, objetivoPorComida[nombreComida].kcal);
      const macros = macrosDeIngredientes(ingredientes);
      comidas[nombreComida] = { receta, ingredientes, macros }; // receta = definición original
      totalDia = limpiarMacros(sumarMacros([totalDia, macros]));
    }
    menu.push({ dia, comidas, macros: totalDia });
  }
  return menu;
}

// Recetas que el usuario puede elegir para una comida (favoritas primero).
export function candidatasReceta(comida, favoritas = [], excluidas = []) {
  const base = RECETAS.filter(r => r.comidas.includes(comida));
  const activas = base.filter(r => !excluidas.includes(r.id));
  const lista = activas.length ? activas : base;
  return [...lista].sort((a, b) =>
    Number(favoritas.includes(b.id)) - Number(favoritas.includes(a.id)) ||
    a.nombre.localeCompare(b.nombre, 'es'));
}

// Crea una comida del menú a partir de una receta y un objetivo de calorías.
export function comidaConReceta(receta, kcalObjetivo) {
  if (!receta) return null;
  const ingredientes = escalarIngredientes(receta, Number(kcalObjetivo) || 0);
  return { receta, ingredientes, macros: macrosDeIngredientes(ingredientes) };
}

// Recalcula una comida después de editar sus gramos a mano.
export function recalcularComida(comida, ingredientes) {
  const limpios = (ingredientes || []).map(i => ({
    ...i,
    nombre: i.nombre || alimentoPorId(i.id)?.nombre || i.id,
    gramos: Math.max(1, Math.round(Number(i.gramos) || 0)),
  }));
  return { ...(comida || {}), ingredientes: limpios, macros: macrosDeIngredientes(limpios), personalizada: true };
}

// Recalcula el total del día tras cambiar, editar o quitar una comida.
export function recalcularDia(dia) {
  let total = { kcal: 0, prot: 0, carbs: 0, grasa: 0 };
  for (const comida of ORDEN_COMIDAS) {
    const m = dia?.comidas?.[comida]?.macros;
    if (m) total = limpiarMacros(sumarMacros([total, m]));
  }
  return { ...(dia || {}), macros: total };
}

export function listaCompra(menu) {
  const agrupado = new Map();
  for (const dia of menu || []) {
    for (const comida of ORDEN_COMIDAS) {
      for (const ing of dia?.comidas?.[comida]?.ingredientes || []) {
        if (!ing?.id) continue;
        const previo = agrupado.get(ing.id);
        if (previo) {
          previo.gramos += Number(ing.gramos) || 0;
        } else {
          agrupado.set(ing.id, {
            id: ing.id,
            nombre: ing.nombre || alimentoPorId(ing.id)?.nombre || ing.id,
            gramos: Number(ing.gramos) || 0,
            categoria: categoriaDe(ing.id, ing.categoria),
          });
        }
      }
    }
  }
  return [...agrupado.values()]
    .map(i => ({ ...i, gramos: Math.round(i.gramos) }))
    .sort((a, b) => a.categoria.localeCompare(b.categoria, 'es') ||
                    a.nombre.localeCompare(b.nombre, 'es'));
}

export function textoListaCompra(lista) {
  return (lista || []).map(i => `- [ ] ${i.gramos} g ${i.nombre}`).join('\n');
}
