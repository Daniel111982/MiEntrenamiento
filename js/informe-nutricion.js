// Informe nutricional semanal de DanTal.
// Solo lee datos y devuelve números: sin DOM, sin localStorage y sin red.
// La suma de macros y de micronutrientes la hacen las funciones que recibe
// por parametro, para no duplicar la logica del diario.

import { lunes, sumarDias, deIso, iso, hoyIso } from './generador.js';
import { CLAVES_MICROS } from './escaner.js';

const numero = v => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; };
const redondea = (n, d = 1) => { const f = 10 ** d; return Math.round(numero(n) * f) / f; };
const suma = (lista, clave) => redondea(lista.reduce((t, x) => t + numero(x[clave]), 0));
const media = (lista, clave) => lista.length ? redondea(suma(lista, clave) / lista.length) : 0;
const CLAVES = ['kcal', 'prot', 'carbs', 'grasa', 'fibra', 'vasos', 'aguaMl'];
const LETRAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']; // deIso().getDay(): 0 = domingo

const crudo = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const f0 = n => String(Math.round(numero(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const f1 = n => {
  const v = crudo(n), r = Math.round(Math.abs(v) * 10);
  return (v < 0 ? '-' : '') + Math.floor(r / 10) + ',' + (r % 10);
};
const conSigno = n => (crudo(n) > 0 ? '+' : '') + f1(n);
const conSigno0 = n => (crudo(n) < 0 ? '-' : crudo(n) > 0 ? '+' : '') + f0(Math.abs(crudo(n)));

function diasSemana(desde, { comidas, agua, vasoMl, hoy, macroDe, microDe }) {
  const out = [];
  for (let i = 0; i < 7; i++) {
    const fecha = sumarDias(desde, i);
    const entradas = Object.values(comidas[fecha] || {})
      .filter(Array.isArray).reduce((t, lista) => t.concat(lista), []);
    const macros = entradas.reduce((acc, en) => {
      const m = macroDe(en) || {};
      for (const k of ['kcal', 'prot', 'carbs', 'grasa', 'fibra']) acc[k] += numero(m[k]);
      return acc;
    }, { kcal: 0, prot: 0, carbs: 0, grasa: 0, fibra: 0 });
    const micros = {};
    for (const en of entradas) {
      const m = microDe(en) || {};
      for (const [k, v] of Object.entries(m)) {
        if (CLAVES_MICROS.includes(k) && numero(v) > 0) micros[k] = (micros[k] || 0) + numero(v);
      }
    }
    const vasos = numero(agua[fecha]);
    out.push({
      fecha,
      etiqueta: LETRAS[deIso(fecha).getDay()],
      hoy: fecha === hoy,
      futuro: fecha > hoy,
      registrado: entradas.length > 0,
      entradas: entradas.length,
      ...macros,
      vasos,
      aguaMl: vasos * vasoMl,
      micros,
    });
  }
  return out;
}

function observacionesDe(dias, medias, deltas, micros, metas) {
  const out = [];
  const utiles = dias.filter(d => d.registrado && !d.futuro);
  if (!utiles.length) {
    return [{ icono: '📝', texto: 'Todavía no has registrado comidas esta semana. Anota lo que comas para ver tu informe.' }];
  }
  out.push({
    icono: '🗓️',
    texto: `${utiles.length} de 7 días con comidas registradas; las medias se calculan solo sobre esos días.`,
  });
  if (numero(metas.kcal)) {
    const dif = Math.round((medias.kcal - numero(metas.kcal)) * 10) / 10;
    out.push({
      icono: '🔥',
      texto: `Media de ${f0(medias.kcal)} kcal/día frente a ${f0(metas.kcal)} de objetivo (${conSigno0(dif)} kcal).`,
    });
  } else {
    out.push({ icono: '🔥', texto: `Media de ${f0(medias.kcal)} kcal/día registradas.` });
  }
  if (numero(metas.protG)) {
    out.push({
      icono: '🥩',
      texto: `Media de ${f1(medias.prot)} g de proteína al día; objetivo ${f0(metas.protG)} g.`,
    });
  }
  if (numero(metas.fibraG)) {
    const pct = Math.round(medias.fibra / numero(metas.fibraG) * 100);
    out.push({
      icono: '🌾',
      texto: `Media de ${f1(medias.fibra)} g de fibra al día (${pct} % de la referencia de ${f0(metas.fibraG)} g).`,
    });
    if (pct < 80) {
      out.push({
        icono: '🥗',
        texto: 'Para acercarte a la fibra, añade fruta, verdura o legumbres a alguna comida; no hace falta cambiar toda la dieta.',
      });
    }
  }
  if (numero(metas.aguaMl)) {
    out.push({
      icono: '💧',
      texto: `Media de ${f1(medias.vasos)} vasos al día (≈${f1(medias.aguaMl / 1000)} L); objetivo ${f1(numero(metas.aguaMl) / 1000)} L.`,
    });
  }
  if (deltas.kcal != null) {
    out.push({
      icono: deltas.kcal >= 0 ? '📈' : '📉',
      texto: `Respecto a la semana anterior, ${conSigno0(deltas.kcal)} kcal/día de media y ${conSigno(deltas.fibra)} g de fibra.`,
    });
  }
  const conDato = CLAVES_MICROS.filter(k => micros[k].dias > 0);
  out.push(conDato.length
    ? {
      icono: '🧪',
      texto: `${conDato.length} micronutrientes declarados en tus registros. Solo aparecen los que la etiqueta indicaba; DanTal no los estima.`,
    }
    : {
      icono: '🧪',
      texto: 'Ningún producto registrado declara estos micronutrientes. DanTal prefiere dejar el dato vacío antes que inventarlo.',
    });
  return out;
}

export function informeNutricional(comidas = {}, opciones = {}) {
  const {
    fecha, metas = {}, agua = {}, vasoMl = 250,
    macroDe = () => ({}), microDe = () => ({}),
  } = opciones || {};
  const fin = fecha instanceof Date ? iso(fecha) : String(fecha || hoyIso()).slice(0, 10);
  const desde = lunes(fin);
  const hasta = sumarDias(desde, 6);
  const desdePrev = sumarDias(desde, -7);
  const hastaPrev = sumarDias(hasta, -7);
  const hoy = hoyIso();
  const cfg = { comidas: comidas || {}, agua: agua || {}, vasoMl, hoy, macroDe, microDe };

  const dias = diasSemana(desde, cfg);
  const diasPrevios = diasSemana(desdePrev, cfg);
  const utiles = dias.filter(d => d.registrado && !d.futuro);
  const utilesPrevios = diasPrevios.filter(d => d.registrado);
  const medias = Object.fromEntries(CLAVES.map(k => [k, media(utiles, k)]));
  const totales = Object.fromEntries(CLAVES.map(k => [k, suma(utiles, k)]));
  const previas = Object.fromEntries(CLAVES.map(k => [k, media(utilesPrevios, k)]));
  const deltas = Object.fromEntries(CLAVES.map(k => [
    k, utilesPrevios.length ? Math.round((medias[k] - previas[k]) * 10) / 10 : null,
  ]));

  const micros = {};
  for (const k of CLAVES_MICROS) {
    const conDato = utiles.filter(d => numero(d.micros[k]) > 0);
    const total = redondea(conDato.reduce((t, d) => t + numero(d.micros[k]), 0));
    micros[k] = {
      total,
      dias: conDato.length,
      media: conDato.length ? redondea(total / conDato.length) : 0,
    };
  }

  return {
    periodo: { desde, hasta, desdePrev, hastaPrev },
    dias,
    medias,
    totales,
    previas,
    deltas,
    micros,
    diasRegistrados: utiles.length,
    diasPreviosRegistrados: utilesPrevios.length,
    observaciones: observacionesDe(dias, medias, deltas, micros, metas),
  };
}

// Texto plano para copiar o descargar, con el mismo espiritu que el informe de entrenamiento.
export function textoInformeNutricional(inf, metas = {}) {
  const i = inf && typeof inf === 'object' ? inf : {};
  const p = i.periodo || {}, m = i.medias || {}, d = i.deltas || {};
  const lineas = [
    'Informe nutricional semanal',
    `Del ${p.desde || '—'} al ${p.hasta || '—'}`,
    '',
    `Dias con comidas registradas: ${numero(i.diasRegistrados)} de 7`,
    `Media diaria: ${f0(m.kcal)} kcal · ${f1(m.prot)} g proteinas · ${f1(m.carbs)} g hidratos · ${f1(m.grasa)} g grasa · ${f1(m.fibra)} g fibra`,
    `Agua: ${f1(m.vasos)} vasos/dia (≈${f1(numero(m.aguaMl) / 1000)} L)`,
  ];
  if (numero(metas.kcal)) lineas.push(`Objetivo: ${f0(metas.kcal)} kcal/dia · ${f0(metas.protG)} g proteina · ${f0(metas.fibraG)} g fibra`);
  if (d.kcal != null) {
    lineas.push(`Frente a la semana anterior: ${conSigno0(d.kcal)} kcal/dia · ${conSigno(d.fibra)} g fibra`);
  }
  const micros = i.micros || {};
  const declarados = CLAVES_MICROS.filter(k => numero(micros[k]?.dias) > 0);
  lineas.push('', declarados.length
    ? `Micronutrientes declarados (solo dias con dato): ${declarados.map(k => `${k} ${f1(micros[k].media)} (${micros[k].dias} d)`).join(' · ')}`
    : 'Micronutrientes: sin datos declarados; DanTal no los estima.');
  const obs = Array.isArray(i.observaciones) ? i.observaciones : [];
  if (obs.length) {
    lineas.push('', 'Tu registro');
    for (const o of obs) lineas.push(`${o?.icono || '•'} ${o?.texto || ''}`.trim());
  }
  lineas.push('', 'Datos reales registrados en DanTal. Referencias orientativas, no consejo medico.');
  return lineas.join('\n');
}
