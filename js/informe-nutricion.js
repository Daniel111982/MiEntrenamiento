// Informe nutricional y de suplementación de DanTal.
// Solo lee datos y devuelve números: sin DOM, sin localStorage y sin red.
// La suma de macros y de micronutrientes la hacen las funciones que recibe
// por parametro, para no duplicar la logica del diario.
//
// Los suplementos se contabilizan en un bloque APARTE. El bloque clásico
// (`medias`, `previas`, `deltas`, `micros`, observaciones) sigue significando
// "alimentos", igual que antes. El total combinado solo se ofrece cuando
// ambos bloques usan datos declarados y comparables (mismas unidades).

import { lunes, sumarDias, deIso, iso, hoyIso } from './generador.js';
import { CLAVES_MICROS } from './escaner.js';
import { alimentoPorId, COMIDAS } from './alimentos.js'; // solo consulta de declaraciones; los calculos siguen llegando por parametro
import {
  ALIAS_AMINOACIDOS, normalizarComponentes, esSuplemento,
} from './suplementos.js';

const numero = v => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; };
const redondea = (n, d = 1) => { const f = 10 ** d; return Math.round(numero(n) * f) / f; };
const suma = (lista, clave) => redondea(lista.reduce((t, x) => t + numero(x[clave]), 0));
const media = (lista, clave) => lista.length ? redondea(suma(lista, clave) / lista.length) : 0;
const CLAVES = ['kcal', 'prot', 'carbs', 'grasa', 'fibra', 'vasos', 'aguaMl'];
const CLAVES_COMBINABLES = ['kcal', 'prot', 'carbs', 'grasa', 'fibra'];
const LETRAS = ['D', 'L', 'M', 'X', 'J', 'V', 'S']; // deIso().getDay(): 0 = domingo
const TIPOS_PERIODO = Object.freeze({
  diario: 'Diario', semanal: 'Semanal', mensual: 'Mensual', personalizado: 'Personalizado',
});

const texto = v => String(v ?? '').trim();
const crudo = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const f0 = n => String(Math.round(numero(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const f1 = n => {
  const v = crudo(n), r = Math.round(Math.abs(v) * 10);
  return (v < 0 ? '-' : '') + Math.floor(r / 10) + ',' + (r % 10);
};
const conSigno = n => (crudo(n) > 0 ? '+' : '') + f1(n);
const conSigno0 = n => (crudo(n) < 0 ? '-' : crudo(n) > 0 ? '+' : '') + f0(Math.abs(crudo(n)));

const MACROS_ESENCIALES = ['kcal', 'prot', 'carbs', 'grasa'];
// Un valor ausente, null, NaN o una conversion no confirmada NO son cero.
// El 0 si es un dato declarado y por eso cuenta en las medias.
const datoNumero = v => v !== null && v !== undefined && v !== ''
  && Number.isFinite(Number(v));
const cantidadPositiva = v => {
  if (!datoNumero(v)) return null;
  const n = Number(v);
  return n > 0 ? n : null;
};

function declaracionMacros(en) {
  if (en?.macros100 && typeof en.macros100 === 'object') return en.macros100;
  if (esSuplemento(en) || en?.tipo === 'receta') return null;
  return alimentoPorId(en?.id);
}

function declaracionMicros(en) {
  if (en?.micros100 && typeof en.micros100 === 'object') return en.micros100;
  if (esSuplemento(en) || en?.tipo === 'receta') return null;
  return alimentoPorId(en?.id)?.micros100;
}

// Clasifica el APORTE declarado, sin calcular nada: solo mira si los campos
// estan presentes con numeros reales. Las recetas se consideran declaradas
// porque sus ingredientes son registros reales del diario.
export function aporteNutricional(en) {
  if (!en) return { estado: 'sin-registro', macros: [], micros: [] };
  const receta = en.tipo === 'receta';
  const fuenteMacros = receta ? null : declaracionMacros(en);
  const macros = receta
    ? MACROS_ESENCIALES.slice()
    : MACROS_ESENCIALES.filter(k => datoNumero(fuenteMacros?.[k]));
  const micros = CLAVES_MICROS.filter(k => datoNumero(declaracionMicros(en)?.[k]));
  const conversionPerdida = esSuplemento(en)
    && en.conversionEstado != null && en.conversionEstado !== 'confirmado';
  const marcaDesconocida = esSuplemento(en)
    && (en.estadoComposicion === 'desconocido' || en.estado === 'desconocido');

  let estado;
  if (en.composicionDesconocida === true || conversionPerdida || marcaDesconocida) {
    estado = 'desconocido';
  } else if (receta) {
    estado = 'conocido';
  } else if (!macros.length && !micros.length) {
    estado = 'desconocido';
  } else if (macros.length < MACROS_ESENCIALES.length) {
    estado = 'parcial';
  } else {
    estado = 'conocido';
  }
  return { estado, macros, micros };
}

export const clasificarAporte = en => aporteNutricional(en).estado;
// Una toma sin datos declarados NO entra en las sumas como cero; una parcial
// si entra, con los nutrientes que la ficha si declara.
const datoValido = en => clasificarAporte(en) !== 'desconocido';

const fechaIso = v => {
  if (v instanceof Date) return iso(v);
  const s = texto(v);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : hoyIso();
};
const inicioMes = f => `${fechaIso(f).slice(0, 7)}-01`;
function finMes(f) {
  const d = deIso(inicioMes(f));
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return iso(d);
}
function mesAnterior(f, n = 1) {
  const d = deIso(inicioMes(f));
  d.setMonth(d.getMonth() - n);
  return iso(d);
}
function diasEntre(desde, hasta) {
  const a = Date.parse(`${desde}T00:00:00Z`);
  const b = Date.parse(`${hasta}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.round((b - a) / 86400000) + 1;
}

// Todos los periodos comparten la misma forma: el actual y un anterior del
// mismo tamano, para que la comparativa nunca mezcle semanas con meses.
export function rangoInforme(opciones = {}) {
  const tipo = TIPOS_PERIODO[texto(opciones.periodo || opciones.tipoPeriodo)] ? texto(opciones.periodo || opciones.tipoPeriodo) : 'semanal';
  const fecha = fechaIso(opciones.fecha || hoyIso());
  let desde = fecha;
  let hasta = fecha;
  if (tipo === 'semanal') {
    desde = lunes(fecha);
    hasta = sumarDias(desde, 6);
  } else if (tipo === 'mensual') {
    desde = inicioMes(fecha);
    hasta = finMes(fecha);
  } else if (tipo === 'personalizado') {
    desde = fechaIso(opciones.desde || fecha);
    hasta = fechaIso(opciones.hasta || desde);
    if (desde > hasta) [desde, hasta] = [hasta, desde];
    // Un rango desproporcionado no debe bloquear la interfaz con miles de dias.
    if (diasEntre(desde, hasta) > 366) desde = sumarDias(hasta, -365);
  }
  const longitud = Math.max(1, diasEntre(desde, hasta));
  let anteriorDesde;
  let anteriorHasta;
  if (tipo === 'semanal') {
    anteriorDesde = sumarDias(desde, -7);
    anteriorHasta = sumarDias(hasta, -7);
  } else if (tipo === 'mensual') {
    anteriorDesde = mesAnterior(desde);
    anteriorHasta = finMes(anteriorDesde);
  } else if (tipo === 'personalizado') {
    anteriorHasta = sumarDias(desde, -1);
    anteriorDesde = sumarDias(anteriorHasta, -(longitud - 1));
  } else {
    anteriorDesde = anteriorHasta = sumarDias(desde, -1);
  }
  return {
    tipo, etiqueta: TIPOS_PERIODO[tipo], fecha,
    desde, hasta, anteriorDesde, anteriorHasta, dias: longitud,
  };
}

function diasPeriodo(desde, hasta, cfg, filtro = () => true, { conAgua = false } = {}) {
  const out = [];
  const { comidas, agua, vasoMl, hoy, macroDe, microDe } = cfg;
  let fecha = desde;
  let guarda = 0;
  while (fecha <= hasta && guarda < 400) {
    guarda++;
    const todas = Object.entries(comidas[fecha] || {}).flatMap(([comida, lista]) =>
      Array.isArray(lista) ? lista.map(en => ({ ...en, __fecha: fecha, __comida: comida })) : []);
    const filtradas = todas.filter(filtro);
    const estados = filtradas.map(clasificarAporte);
    const entradas = filtradas.filter((_, i) => estados[i] !== 'desconocido');
    const sinDato = estados.filter(e => e === 'desconocido').length;
    const parciales = estados.filter(e => e === 'parcial').length;
    const macros = entradas.reduce((acc, en) => {
      const m = macroDe(en) || {};
      for (const k of ['kcal', 'prot', 'carbs', 'grasa', 'fibra']) acc[k] += numero(m[k]);
      return acc;
    }, { kcal: 0, prot: 0, carbs: 0, grasa: 0, fibra: 0 });
    const micros = {};
    for (const en of entradas) {
      const m = microDe(en) || {};
      for (const [k, v] of Object.entries(m)) {
        // 0 es un valor declarado: cuenta como dia con dato, no como ausencia.
        if (CLAVES_MICROS.includes(k) && datoNumero(v)) micros[k] = (micros[k] || 0) + Number(v);
      }
    }
    const vasos = conAgua ? numero(agua[fecha]) : 0;
    out.push({
      fecha,
      etiqueta: cfg.tipoPeriodo === 'semanal'
        ? LETRAS[deIso(fecha).getDay()] : String(deIso(fecha).getDate()),
      hoy: fecha === hoy,
      futuro: fecha > hoy,
      registrado: entradas.length > 0,
      conRegistros: filtradas.length > 0,
      registros: filtradas.length,
      entradas: entradas.length,
      sinDato,
      parciales,
      ...macros,
      vasos,
      aguaMl: vasos * vasoMl,
      micros,
      todas,
      entradasValidas: entradas,
    });
    fecha = sumarDias(fecha, 1);
  }
  return out;
}

function microsResumen(dias) {
  const micros = {};
  for (const k of CLAVES_MICROS) {
    const conDato = dias.filter(d => Object.prototype.hasOwnProperty.call(d.micros || {}, k));
    const total = redondea(conDato.reduce((t, d) => t + numero(d.micros[k]), 0));
    micros[k] = {
      total,
      dias: conDato.length,
      media: conDato.length ? redondea(total / conDato.length) : 0,
    };
  }
  return micros;
}

function resumenBloque(dias) {
  // `registrado` sigue significando "con datos para medias". `conRegistros`
  // permite contar tomas sin composicion sin convertirlas en dias vacios.
  const utiles = dias.filter(d => d.registrado && !d.futuro);
  const conRegistros = dias.filter(d => d.conRegistros && !d.futuro);
  return {
    diasRegistrados: utiles.length,
    diasConRegistros: conRegistros.length,
    registros: conRegistros.reduce((t, d) => t + numero(d.registros), 0),
    sinDato: conRegistros.reduce((t, d) => t + numero(d.sinDato), 0),
    parciales: conRegistros.reduce((t, d) => t + numero(d.parciales), 0),
    medias: Object.fromEntries(CLAVES.map(k => [k, media(utiles, k)])),
    totales: Object.fromEntries(CLAVES.map(k => [k, suma(utiles, k)])),
    micros: microsResumen(utiles),
  };
}

function bloqueCombinado(alimentos, suplementos) {
  const dias = alimentos.map((d, i) => {
    const s = suplementos[i] || {};
    const total = Object.fromEntries(CLAVES_COMBINABLES.map(k =>
      [k, redondea(numero(d[k]) + numero(s[k]))]));
    return {
      fecha: d.fecha,
      etiqueta: d.etiqueta,
      futuro: d.futuro,
      comparable: Boolean(d.registrado || s.registrado),
      ambos: Boolean(d.registrado && s.registrado),
      alimentos: Object.fromEntries(CLAVES_COMBINABLES.map(k => [k, d[k]])),
      suplementos: Object.fromEntries(CLAVES_COMBINABLES.map(k => [k, s[k] || 0])),
      total,
    };
  });
  const utiles = dias.filter(d => d.comparable && !d.futuro);
  return {
    dias,
    diasConDatos: utiles.length,
    diasConAmbos: dias.filter(d => d.ambos && !d.futuro).length,
    medias: Object.fromEntries(CLAVES_COMBINABLES.map(k =>
      [k, utiles.length ? redondea(utiles.reduce((t, d) => t + numero(d.total[k]), 0) / utiles.length) : 0])),
    totales: Object.fromEntries(CLAVES_COMBINABLES.map(k =>
      [k, redondea(utiles.reduce((t, d) => t + numero(d.total[k]), 0))])),
    nota: 'Suma solo datos declarados: kcal y gramos se suman entre sí; cafeína, creatina, aminoácidos y otros componentes se muestran aparte, nunca dentro de macros o micronutrientes.',
  };
}

const mismoComponente = (a, b) => Boolean(a && b
  && a.valor === b.valor && (a.unidad || null) === (b.unidad || null)
  && a.base === b.base && a.estado === b.estado);
const canonComponente = clave => ALIAS_AMINOACIDOS[clave] || clave;

// Normaliza una vez cada toma usando el MISMO normalizador del catálogo.
// Cuando una ficha antigua trae canonica + alias con valores distintos, se
// muestra una sola fila: gana la clave canonica y el alias queda como
// procedencia avisada, nunca como una suma duplicada.
function componentesDeToma(entrada, origen) {
  const { componentes, componentesAlias } = normalizarComponentes(origen || {});
  const previos = entrada?.componentesAlias || {};
  const grupos = {};
  for (const [clave, dato] of Object.entries(componentes)) {
    const canonica = canonComponente(clave);
    (grupos[canonica] ||= []).push({ clave, ...dato });
  }
  const out = {};
  for (const [canonica, miembros] of Object.entries(grupos)) {
    const elegido = miembros.find(m => m.clave === canonica) || miembros[0];
    const distintos = miembros.filter(m => !mismoComponente(m, elegido));
    const alias = [...new Set([
      ...(Array.isArray(previos[canonica]) ? previos[canonica] : []),
      ...(componentesAlias[canonica] || []),
      ...miembros.filter(m => m.clave !== canonica).map(m => m.clave),
    ])].sort();
    out[canonica] = {
      clave: canonica,
      valor: elegido.valor,
      unidad: elegido.unidad || null,
      base: elegido.base,
      estado: elegido.estado,
      alias,
      conflicto: distintos.length > 0,
      alternativas: distintos.map(m => ({
        clave: m.clave, valor: m.valor, unidad: m.unidad, base: m.base, estado: m.estado,
      })),
    };
  }
  return out;
}

function componentesResumen(entradas = []) {
  const lista = (Array.isArray(entradas) ? entradas : []).filter(esSuplemento);
  const grupos = new Map();
  const declarados = new Map();
  let conComponentes = 0;
  let sinComponentes = 0;
  let conflictos = 0;

  for (const en of lista) {
    const fecha = en.__fecha || texto(en.fecha) || '—';
    const escalados = componentesDeToma(en, en.componentes);
    if (Object.keys(escalados).length) conComponentes++; else sinComponentes++;
    for (const c of Object.values(escalados)) {
      const unidad = texto(c.unidad) || 'sin unidad';
      const base = c.base === 'racion' ? 'racion' : '100g';
      const clave = `${c.clave}|${unidad}|${base}`;
      if (!grupos.has(clave)) {
        grupos.set(clave, {
          clave: c.clave, unidad, base, valor: 0, tomas: 0, sinDato: 0, conflictos: 0,
          dias: new Set(), porDia: {}, alias: new Set(), alternativas: [],
        });
      }
      const g = grupos.get(clave);
      g.tomas++;
      for (const a of c.alias) g.alias.add(a);
      if (c.conflicto) {
        g.conflictos++;
        conflictos++;
        for (const alt of c.alternativas) g.alternativas.push({ fecha, ...alt });
      }
      if (c.estado === 'desconocido') { g.sinDato++; continue; }
      g.valor += numero(c.valor);
      g.dias.add(fecha);
      g.porDia[fecha] = (g.porDia[fecha] || 0) + numero(c.valor);
    }

    const decl = componentesDeToma(en, en.componentesDeclarados);
    for (const c of Object.values(decl)) {
      const unidad = texto(c.unidad) || 'sin unidad';
      const base = c.base === 'racion' ? 'racion' : '100g';
      const clave = `${c.clave}|${unidad}|${base}`;
      if (!declarados.has(clave)) {
        declarados.set(clave, {
          clave: c.clave, unidad, base, estado: c.estado, alias: new Set(),
          tomas: 0, valores: new Set(),
        });
      }
      const d = declarados.get(clave);
      d.tomas++;
      d.valores.add(c.valor);
      for (const a of c.alias) d.alias.add(a);
    }
  }

  const filas = [...grupos.values()].map(g => ({
    clave: g.clave,
    unidad: g.unidad,
    base: g.base,
    total: redondea(g.valor, 4),
    media: g.dias.size ? redondea(g.valor / g.dias.size, 4) : 0,
    tomas: g.tomas,
    diasConDato: g.dias.size,
    sinDato: g.sinDato,
    conflictos: g.conflictos,
    alias: [...g.alias].sort(),
    alternativas: g.alternativas,
    porDia: Object.fromEntries(Object.entries(g.porDia).map(([k, v]) => [k, redondea(v, 4)])),
  })).sort((a, b) => a.clave.localeCompare(b.clave, 'es')
    || a.unidad.localeCompare(b.unidad, 'es'));
  const declaraciones = [...declarados.values()].map(d => ({
    clave: d.clave,
    unidad: d.unidad,
    base: d.base,
    valores: [...d.valores].sort((a, b) => a - b),
    tomas: d.tomas,
    alias: [...d.alias].sort(),
    estado: d.estado,
  })).sort((a, b) => a.clave.localeCompare(b.clave, 'es'));
  return { filas, declaraciones, conComponentes, sinComponentes, conflictos };
}

function productosResumen(entradas = []) {
  const grupos = new Map();
  for (const en of (Array.isArray(entradas) ? entradas : []).filter(esSuplemento)) {
    const id = texto(en.suplementoId || en.id || en.nombre || 'suplemento');
    const esVariante = Boolean(en.varianteId || en.esVarianteHSN
      || (en.productoBaseId && en.productoBaseId !== id));
    const sello = en.esPack ? 'pack' : esVariante ? `variante:${texto(en.varianteId || id)}` : 'base';
    const clave = `${id}|${sello}`;
    if (!grupos.has(clave)) {
      grupos.set(clave, {
        clave, id, esVariante, esPack: Boolean(en.esPack),
        nombre: texto(en.nombreComercial || en.nombre || id),
        nombreBase: texto(en.nombreBase || null),
        marca: texto(en.marca || null),
        baseId: texto(en.productoBaseId || null),
        ean: texto(en.ean || en.gtin || null),
        gtin: texto(en.gtin || null),
        sku: texto(en.sku || null),
        entradas: [],
      });
    }
    grupos.get(clave).entradas.push(en);
  }

  return [...grupos.values()].map(g => {
    const cantidades = g.entradas.map(en => ({
      fecha: en.__fecha || texto(en.fecha) || '—',
      comida: en.__comida || null,
      cantidad: cantidadPositiva(en.cantidadConsumida),
      unidad: texto(en.unidad || null),
      gramos: cantidadPositiva(en.gramos),
      conversionEstado: texto(en.conversionEstado || 'desconocido'),
    })).sort((a, b) => a.fecha.localeCompare(b.fecha)
      || texto(a.comida).localeCompare(texto(b.comida), 'es'));
    const porUnidad = new Map();
    for (const c of cantidades) {
      if (c.cantidad == null || !c.unidad) continue;
      porUnidad.set(c.unidad, (porUnidad.get(c.unidad) || 0) + c.cantidad);
    }
    const unicaUnidad = porUnidad.size === 1 ? [...porUnidad.keys()][0] : null;
    const totalCantidad = unicaUnidad ? redondea(porUnidad.get(unicaUnidad), 4) : null;
    const conCantidad = cantidades.filter(c => c.cantidad != null && c.unidad === unicaUnidad).length;
    const mediaCantidad = totalCantidad != null && conCantidad
      ? redondea(totalCantidad / conCantidad, 4) : null;
    const todosGramos = cantidades.length > 0 && cantidades.every(c => c.gramos != null);
    const totalGramos = todosGramos
      ? redondea(cantidades.reduce((t, c) => t + c.gramos, 0), 4) : null;
    const mediaGramos = totalGramos != null
      ? redondea(totalGramos / cantidades.length, 4) : null;
    const dias = [...new Set(cantidades.map(c => c.fecha))];
    const comidas = Object.fromEntries(Object.keys(COMIDAS).map(k => [k, 0]));
    for (const c of cantidades) {
      if (c.comida && c.comida in comidas) comidas[c.comida]++;
      else comidas.sinComida = (comidas.sinComida || 0) + 1;
    }
    const estados = g.entradas.map(clasificarAporte);
    const sinDato = g.entradas.filter((en, i) =>
      estados[i] === 'desconocido' || en.composicionDesconocida === true).length;
    const parciales = estados.filter(e => e === 'parcial').length;
    const motivos = [];
    if (sinDato) motivos.push(`${sinDato} toma(s) sin composición aprovechable`);
    if (cantidades.some(c => c.conversionEstado !== 'confirmado')) {
      motivos.push('cantidad sin conversión declarada');
    }
    if (!g.entradas.some(en => Object.keys(en.componentes || {}).length)) {
      motivos.push('sin componentes cuantificados en el registro');
    }
    return {
      clave: g.clave,
      id: g.id,
      nombre: g.nombre,
      marca: g.marca || null,
      esVariante: g.esVariante,
      esPack: g.esPack,
      nombreBase: g.nombreBase || g.baseId || null,
      baseId: g.baseId || null,
      ean: g.ean || null,
      gtin: g.gtin || null,
      sku: g.sku || null,
      tomas: g.entradas.length,
      dias: dias.length,
      frecuencia: `${g.entradas.length} ${g.entradas.length === 1 ? 'toma' : 'tomas'} en ${dias.length} ${dias.length === 1 ? 'día' : 'días'}`,
      cantidades,
      unidad: unicaUnidad,
      totalCantidad,
      mediaCantidad,
      totalGramos,
      mediaGramos,
      comidas,
      componentes: componentesResumen(g.entradas),
      sinDato,
      parciales,
      estado: sinDato ? 'incompleto' : parciales ? 'parcial' : 'completo',
      motivos,
    };
  }).sort((a, b) => b.tomas - a.tomas || a.nombre.localeCompare(b.nombre, 'es'));
}

function evolucionResumen(dias, diasSup, componentes) {
  const porFecha = new Map();
  const asegura = fecha => {
    if (!porFecha.has(fecha)) {
      porFecha.set(fecha, {
        fecha, kcal: 0, prot: 0, carbs: 0, grasa: 0, fibra: 0,
        supKcal: 0, supProt: 0, tomasSup: 0, sinDatoSup: 0, componentes: {},
      });
    }
    return porFecha.get(fecha);
  };
  for (const d of dias.filter(x => !x.futuro)) {
    const r = asegura(d.fecha);
    for (const k of CLAVES_COMBINABLES) r[k] = redondea(r[k] + numero(d[k]));
  }
  for (const s of diasSup.filter(x => !x.futuro)) {
    const r = asegura(s.fecha);
    r.supKcal = redondea(r.supKcal + numero(s.kcal));
    r.supProt = redondea(r.supProt + numero(s.prot));
    r.tomasSup += numero(s.registros);
    r.sinDatoSup += numero(s.sinDato);
  }
  for (const fila of componentes.filas) {
    for (const [fecha, valor] of Object.entries(fila.porDia)) {
      const r = asegura(fecha);
      const k = `${fila.clave}|${fila.unidad}|${fila.base}`;
      r.componentes[k] = redondea((r.componentes[k] || 0) + numero(valor), 4);
    }
  }
  return [...porFecha.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
}

function compararComponentes(actual, anterior) {
  const a = new Map((actual?.filas || []).map(f => [`${f.clave}|${f.unidad}|${f.base}`, f]));
  const b = new Map((anterior?.filas || []).map(f => [`${f.clave}|${f.unidad}|${f.base}`, f]));
  return [...new Set([...a.keys(), ...b.keys()])].map(k => {
    const x = a.get(k) || {};
    const y = b.get(k) || {};
    return {
      clave: x.clave || y.clave,
      unidad: x.unidad || y.unidad,
      base: x.base || y.base,
      actual: numero(x.media),
      anterior: numero(y.media),
      delta: Math.round((numero(x.media) - numero(y.media)) * 1e4) / 1e4,
      calculable: Boolean(x.diasConDato || y.diasConDato),
    };
  }).filter(f => f.calculable);
}

function comparacionResumen({ dias, diasPrevios, diasSup, diasSupPrevios, componentes, componentesPrevios }) {
  const actuales = dias.filter(d => d.registrado && !d.futuro);
  const anteriores = diasPrevios.filter(d => d.registrado);
  const supActuales = diasSup.filter(d => d.registrado && !d.futuro);
  const supAnteriores = diasSupPrevios.filter(d => d.registrado);
  const medias = Object.fromEntries(CLAVES.map(k => [k, media(actuales, k)]));
  const previas = Object.fromEntries(CLAVES.map(k => [k, media(anteriores, k)]));
  const deltas = Object.fromEntries(CLAVES.map(k => [
    k, anteriores.length ? Math.round((medias[k] - previas[k]) * 10) / 10 : null,
  ]));
  const motivos = [];
  if (!actuales.length) motivos.push('sin días con datos válidos en el periodo actual');
  if (!anteriores.length) motivos.push('sin días con datos válidos en el periodo anterior');
  if (actuales.length && actuales.length < 2) motivos.push('un solo día válido en el periodo actual');
  if (anteriores.length && anteriores.length < 2) motivos.push('un solo día válido en el periodo anterior');
  return {
    disponible: Boolean(actuales.length || anteriores.length || supActuales.length || supAnteriores.length),
    suficiente: actuales.length >= 2 && anteriores.length >= 2,
    motivos,
    diasActuales: actuales.length,
    diasAnteriores: anteriores.length,
    medias,
    previas,
    deltas,
    suplementos: {
      tomas: diasSup.filter(d => !d.futuro).reduce((t, d) => t + numero(d.registros), 0),
      tomasPrevias: diasSupPrevios.reduce((t, d) => t + numero(d.registros), 0),
      dias: supActuales.length,
      diasPrevios: supAnteriores.length,
      componentes: compararComponentes(componentes, componentesPrevios),
    },
  };
}

function observacionesDe(ctx) {
  const {
    periodo, dias, alimentos, suplementos, combinado, medias, micros, metas,
    comparacion, componentes, productos,
  } = ctx;
  const out = [];
  const utiles = dias.filter(d => d.registrado && !d.futuro);
  const sinDato = numero(alimentos.sinDato) + numero(suplementos.sinDato);
  const parciales = numero(alimentos.parciales) + numero(suplementos.parciales);
  const avisoIncompletos = sinDato + parciales
    ? {
      icono: '⚠️',
      texto: `${sinDato + parciales} registro(s) con aporte nutricional desconocido o incompleto (${sinDato} sin dato, ${parciales} parciales). No se han contado como cero ni han falseado las medias.`,
    }
    : null;
  if (!utiles.length && !suplementos.diasRegistrados) {
    if (avisoIncompletos) return [avisoIncompletos];
    return [{ icono: '📝', texto: `Todavía no has registrado comidas ni suplementos en este ${periodo.etiqueta.toLowerCase()}. Anota lo que tomes para ver tu informe.` }];
  }
  if (utiles.length) {
    out.push({
      icono: '🗓️',
      texto: `${utiles.length} de ${periodo.dias} días con comidas registradas; las medias se calculan solo sobre esos días.`,
    });
  }
  const conRegistros = dias.filter(d => d.conRegistros && !d.futuro).length;
  if (conRegistros > utiles.length) {
    out.push({
      icono: '❓',
      texto: `${conRegistros - utiles.length} día(s) tienen registros cuyo contenido nutricional es desconocido: cuentan como consumo registrado, pero no como cero ni como dato válido.`,
    });
  }
  if (numero(metas.kcal)) {
    const dif = Math.round((medias.kcal - numero(metas.kcal)) * 10) / 10;
    out.push({
      icono: '🔥',
      texto: `Media de ${f0(medias.kcal)} kcal/día de alimentos frente a ${f0(metas.kcal)} de objetivo (${conSigno0(dif)} kcal).`,
    });
  } else {
    out.push({ icono: '🔥', texto: `Media de ${f0(medias.kcal)} kcal/día de alimentos registrados.` });
  }
  if (numero(metas.protG)) {
    out.push({
      icono: '🥩',
      texto: `Media de ${f1(medias.prot)} g de proteína de alimentos al día; objetivo ${f0(metas.protG)} g.`,
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
  if (comparacion.suficiente && comparacion.deltas.kcal != null) {
    out.push({
      icono: comparacion.deltas.kcal >= 0 ? '📈' : '📉',
      texto: `Frente al ${periodo.etiqueta.toLowerCase()} anterior, ${conSigno0(comparacion.deltas.kcal)} kcal/día de alimentos y ${conSigno(comparacion.deltas.fibra)} g de fibra.`,
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
  if (suplementos.diasRegistrados || suplementos.registros) {
    out.push({
      icono: '💊',
      texto: `${suplementos.registros} toma(s) en ${suplementos.diasRegistrados} día(s) con suplementos. Sus nutrientes aparecen separados de los alimentos; el combinado solo suma datos declarados.`,
    });
  }
  const incompletos = productos.filter(p => p.estado === 'incompleto');
  if (incompletos.length) {
    out.push({
      icono: '🔎',
      texto: `${incompletos.length} producto(s) con información nutricional incompleta siguen contando como consumidos; falta composición o conversión, no consumo.`,
    });
  }
  if (componentes.conflictos) {
    out.push({
      icono: '🧬',
      texto: `${componentes.conflictos} registro(s) de componentes tenían alias con valores distintos. Se muestra una sola fila canónica; el alias con otro valor no se ha sumado dos veces.`,
    });
  }
  if (combinado.diasConDatos && combinado.diasConAmbos) {
    out.push({
      icono: '🧾',
      texto: `${combinado.diasConAmbos} día(s) con alimentos y suplementos a la vez. Revisa que no sea la misma toma contada dos veces; los avisos de duplicidad se muestran en Nutrición.`,
    });
  }
  // Un solo aviso para todo el informe, aunque afecte a ambos bloques.
  if (avisoIncompletos) out.push(avisoIncompletos);
  return out;
}

export function informeNutricional(comidas = {}, opciones = {}) {
  const {
    metas = {}, agua = {}, vasoMl = 250,
    macroDe = () => ({}), microDe = () => ({}), filtrarEntradas = null,
  } = opciones || {};
  const periodo = rangoInforme(opciones || {});
  const hoy = hoyIso();
  const soloAlimentos = filtrarEntradas || (en => !esSuplemento(en));
  const cfg = {
    comidas: comidas || {}, agua: agua || {}, vasoMl, hoy, macroDe, microDe,
    tipoPeriodo: periodo.tipo,
  };

  const dias = diasPeriodo(periodo.desde, periodo.hasta, cfg, soloAlimentos, { conAgua: true });
  const diasPrevios = diasPeriodo(periodo.anteriorDesde, periodo.anteriorHasta, cfg, soloAlimentos, { conAgua: true });
  const diasSup = diasPeriodo(periodo.desde, periodo.hasta, cfg, esSuplemento);
  const diasSupPrevios = diasPeriodo(periodo.anteriorDesde, periodo.anteriorHasta, cfg, esSuplemento);
  const tomasSup = diasSup.filter(d => !d.futuro).flatMap(d => d.todas);
  const tomasSupPrevias = diasSupPrevios.flatMap(d => d.todas);

  const alimentos = resumenBloque(dias);
  const suplementos = resumenBloque(diasSup);
  const combinado = bloqueCombinado(dias, diasSup);
  const componentes = componentesResumen(tomasSup);
  const componentesPrevios = componentesResumen(tomasSupPrevias);
  const productos = productosResumen(tomasSup);
  const evolucion = evolucionResumen(dias, diasSup, componentes);
  const comparacion = comparacionResumen({
    dias, diasPrevios, diasSup, diasSupPrevios, componentes, componentesPrevios,
  });

  return {
    periodo,
    dias,
    medias: alimentos.medias,
    totales: alimentos.totales,
    previas: comparacion.previas,
    deltas: comparacion.deltas,
    micros: alimentos.micros,
    alimentos,
    suplementos,
    combinado,
    componentes,
    productos,
    evolucion,
    comparacion,
    sinDato: numero(alimentos.sinDato) + numero(suplementos.sinDato),
    parciales: numero(alimentos.parciales) + numero(suplementos.parciales),
    diasRegistrados: alimentos.diasRegistrados,
    diasConRegistros: dias.filter(d => d.conRegistros && !d.futuro).length,
    diasPreviosRegistrados: comparacion.diasAnteriores,
    observaciones: observacionesDe({
      periodo, dias, alimentos, suplementos, combinado,
      medias: alimentos.medias, micros: alimentos.micros, metas,
      comparacion, componentes, productos,
    }),
  };
}

// Texto plano para copiar o descargar, con el mismo espiritu que el informe de entrenamiento.
export function textoInformeNutricional(inf, metas = {}) {
  const i = inf && typeof inf === 'object' ? inf : {};
  const p = i.periodo || {}, m = i.medias || {}, c = i.comparacion || {};
  const ali = i.alimentos || {}, sup = i.suplementos || {}, comb = i.combinado || {};
  const lineas = [
    `Informe nutricional ${texto(p.etiqueta || p.tipo || 'semanal').toLowerCase()}`,
    `Del ${p.desde || '—'} al ${p.hasta || '—'}`,
    '',
    `Días con comidas registradas: ${numero(i.diasRegistrados)} de ${numero(p.dias) || 7}`,
    `Días con algún registro: ${numero(i.diasConRegistros)} (incluye tomas sin composición conocida)`,
    ` Media de alimentos: ${f0(m.kcal)} kcal · ${f1(m.prot)} g proteínas · ${f1(m.carbs)} g hidratos · ${f1(m.grasa)} g grasa · ${f1(m.fibra)} g fibra`,
    `Agua: ${f1(m.vasos)} vasos/día (≈${f1(numero(m.aguaMl) / 1000)} L)`,
  ];
  if (numero(metas.kcal)) {
    lineas.push(`Objetivo: ${f0(metas.kcal)} kcal/día · ${f0(metas.protG)} g proteína · ${f0(metas.carbsG)} g hidratos · ${f0(metas.grasaG)} g grasa · ${f0(metas.fibraG)} g fibra · ${f1(numero(metas.aguaMl) / 1000)} L agua`);
    if (texto(metas.objetivoNombre)) lineas.push(`Modalidad: ${texto(metas.objetivoNombre)} · modo ${texto(metas.modo || 'base')}`);
  }
  if (c.suficiente && c.deltas?.kcal != null) {
    lineas.push(`Frente al periodo anterior: ${conSigno0(c.deltas.kcal)} kcal/día · ${conSigno(c.deltas.fibra)} g fibra`);
  }
  const micros = ali.micros || {};
  const declarados = CLAVES_MICROS.filter(k => numero(micros[k]?.dias) > 0);
  lineas.push('', declarados.length
    ? `Micronutrientes de alimentos declarados (solo días con dato): ${declarados.map(k => `${k} ${f1(micros[k].media)} (${micros[k].dias} d)`).join(' · ')}`
    : 'Micronutrientes de alimentos: sin datos declarados; DanTal no los estima.');

  lineas.push('', `Suplementos: ${numero(sup.registros)} toma(s) en ${numero(sup.diasRegistrados)} día(s) · ${f0(sup.medias?.kcal)} kcal/día · ${f1(sup.medias?.prot)} g proteína/día`);
  const productos = Array.isArray(i.productos) ? i.productos : [];
  for (const pr of productos) {
    lineas.push(` • ${pr.nombre}${pr.marca ? ` · ${pr.marca}` : ''}${pr.esVariante ? ' · variante' : ''}: ${pr.frecuencia}${pr.unidad ? ` · ${f1(pr.totalCantidad ?? 0)} ${pr.unidad} en total` : ''}${pr.sinDato ? ` · ${pr.sinDato} toma(s) sin composición` : ''}`);
  }
  const comps = i.componentes?.filas || [];
  lineas.push(comps.length
    ? `Componentes declarados consumidos (por día con dato): ${comps.map(x => `${x.clave} ${f1(x.media)} ${x.unidad || ''}${x.base === 'racion' ? '/ración' : '/100 g'}${x.alias?.length ? ` [alias: ${x.alias.join(', ')}]` : ''}`).join(' · ')}`
    : 'Componentes de suplementos: sin valores cuantificados en los registros.');
  if (numero(i.componentes?.conflictos)) {
    lineas.push('Los alias con valores distintos se muestran en una sola fila canónica; no se han sumado dos veces.');
  }
  lineas.push('Los datos de suplementos NO se han mezclado con los objetivos ni con los micronutrientes de alimentos.');

  if (numero(comb.diasConDatos)) {
    lineas.push(`Total combinado (solo datos declarados): ${f0(comb.medias?.kcal)} kcal/día · ${f1(comb.medias?.prot)} g proteína/día`);
  }
  const obs = Array.isArray(i.observaciones) ? i.observaciones : [];
  if (obs.length) {
    lineas.push('', 'Tu registro');
    for (const o of obs) lineas.push(`${o?.icono || '•'} ${o?.texto || ''}`.trim());
  }
  lineas.push('', 'Datos reales registrados en DanTal. Referencias orientativas, no consejo médico.');
  return lineas.join('\n');
}
