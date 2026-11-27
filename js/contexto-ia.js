// =====================================================================
// Contexto integral del Coach IA (FASE 7) · SOLO LECTURA
// ---------------------------------------------------------------------
// Reutiliza los motores ya existentes (informe nutricional, normalización de
// suplementos, resúmenes de carrera y estadísticas). No calcula macros por su
// cuenta, no escribe en el estado, no abre red y no crea otro chatbot ni otro
// prompt: entrega un objeto agregado que `resumenParaIA()` serializa dentro
// del único flujo `coachEnviar() → chatear() → coach-ia`.
//
// Privacidad: solo resúmenes agregados de los últimos 30 días. Nunca se
// incluyen nombre, correo, identificadores de persona, EAN/SKU ni rutas de
// fotos. Los nombres de alimentos, ejercicios o productos son datos de
// catálogo necesarios para interpretar la consulta.
//
// Reglas de etiquetado usadas al serializar:
//   DATO REAL     = lo que el usuario registró;
//   CALCULADO     = media, delta o frecuencia derivada de esos registros;
//   OBSERVACIÓN   = tendencia, sin implicar causalidad;
//   RECOMENDACIÓN = orientación no médica;
//   DESCONOCIDO   = dato ausente, que nunca se convierte en cero.
// =====================================================================
import { OBJETIVOS, hoyIso, sumarDias } from './generador.js';
import { informeNutricional } from './informe-nutricion.js';
import { resumenHechas, resumenPlan } from './carrera.js';
import { mejorSerie, racha, volumenSesion, volumenSemanas } from './stats.js';
import { porId } from './ejercicios.js';
import { etiquetaComponente } from './suplementos-ui.js';

const lista = v => Array.isArray(v) ? v : [];
const texto = v => String(v ?? '').trim();
const numero = v => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; };
const red = (v, d = 1) => { const f = 10 ** d; return Math.round(numero(v) * f) / f; };
const fechaOk = f => /^\d{4}-\d{2}-\d{2}$/.test(String(f || '')) && !Number.isNaN(Date.parse(`${f}T12:00`));
const fechaCorta = f => fechaOk(f)
  ? new Date(`${f}T12:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  : String(f || '—');
const ritmo = s => {
  const n = numero(s);
  return n ? `${Math.floor(n / 60)}:${String(Math.round(n % 60)).padStart(2, '0')}/km` : 'desconocido';
};
const seguro = (fn, alternativa) => { try { return fn(); } catch { return alternativa; } };

function opcionesInforme(estado, opciones) {
  return {
    metas: (opciones.metas && typeof opciones.metas === 'object') ? opciones.metas : {},
    agua: (estado.agua && typeof estado.agua === 'object') ? estado.agua : {},
    vasoMl: numero(opciones.vasoMl) || 250,
    macroDe: typeof opciones.macroDe === 'function' ? opciones.macroDe : () => ({}),
    microDe: typeof opciones.microDe === 'function' ? opciones.microDe : () => ({}),
  };
}

// Compara solo días con registro real: un día sin anotaciones nunca cuenta
// como 0 kcal. La etiqueta deja claro que es una observación, no una causa.
function tendenciaKcal(inf) {
  const conRegistro = new Set(lista(inf?.dias).filter(d => d.registrado && !d.futuro).map(d => d.fecha));
  const filas = lista(inf?.evolucion).filter(d => conRegistro.has(d.fecha));
  if (filas.length < 4) return { disponible: false, motivo: 'menos de 4 días con registros en el periodo' };
  const mitad = Math.ceil(filas.length / 2);
  const media = parte => red(parte.reduce((t, d) => t + numero(d.kcal), 0) / Math.max(1, parte.length));
  const primera = media(filas.slice(0, mitad));
  const segunda = media(filas.slice(mitad));
  return { disponible: true, primera, segunda, delta: red(segunda - primera), dias: filas.length };
}

function resumenEjercicios(historial) {
  const grupos = new Map();
  for (const h of historial) {
    for (const e of lista(h.ejercicios)) {
      if (!e?.id) continue;
      const g = grupos.get(e.id) || {
        id: e.id, nombre: texto(e.nombre) || porId[e.id]?.nombre || e.id,
        sesiones: 0, series: 0, reps: 0, kgMax: 0, mejor: 0,
      };
      const series = lista(e.series).filter(s => !s.drop);
      g.sesiones++;
      g.series += series.length;
      g.reps += series.reduce((t, s) => t + numero(s.reps), 0);
      g.kgMax = Math.max(g.kgMax, series.reduce((t, s) => Math.max(t, numero(s.kg)), 0));
      g.mejor = Math.max(g.mejor, numero(mejorSerie(lista(e.series))?.val));
      grupos.set(e.id, g);
    }
  }
  return [...grupos.values()]
    .sort((a, b) => b.sesiones - a.sesiones || b.series - a.series)
    .slice(0, 6)
    .map(g => ({
      nombre: g.nombre, sesiones: g.sesiones, series: g.series, reps: Math.round(g.reps),
      kgMax: red(g.kgMax), mejor: red(g.mejor),
    }));
}

/**
 * Agrega el contexto integral de los últimos 30 días sin modificar nada.
 * @param {object} estado Estado local de DanTal (solo se lee).
 * @param {object} opciones { hoy, metas, macroDe, microDe, vasoMl }.
 */
export function contextoIntegralCoach(estado = {}, opciones = {}) {
  const hoy = fechaOk(opciones.hoy) ? opciones.hoy : hoyIso();
  const desde = sumarDias(hoy, -29);
  const comidas = (estado.comidas && typeof estado.comidas === 'object') ? estado.comidas : {};
  const base = opcionesInforme(estado, opciones);
  const cfg = extra => ({ ...base, ...extra });

  // Los tres informes son los que ya usa la pantalla de informes: no se
  // reimplementa ningún cálculo nutricional ni de suplementos.
  const inf30 = informeNutricional(comidas, cfg({ periodo: 'personalizado', desde, hasta: hoy }));
  const infSem = informeNutricional(comidas, cfg({ periodo: 'semanal', fecha: hoy }));
  const infMes = informeNutricional(comidas, cfg({ periodo: 'mensual', fecha: hoy }));

  const alimentos = inf30.alimentos || {};
  const suplementosInf = inf30.suplementos || {};
  const combinado = inf30.combinado || {};
  const micros = Object.entries(inf30.micros || {})
    .filter(([, v]) => numero(v?.dias) > 0)
    .map(([clave, v]) => ({ nombre: etiquetaComponente(clave), media: red(v.media), dias: numero(v.dias) }))
    .slice(0, 8);

  const productos = lista(inf30.productos).slice(0, 5).map(p => ({
    nombre: texto(p.nombre) || 'producto sin nombre',
    marca: texto(p.marca) || null,
    base: texto(p.nombreBase) || null,
    variante: Boolean(p.esVariante), pack: Boolean(p.esPack),
    frecuencia: texto(p.frecuencia),
    cantidad: p.unidad && p.mediaCantidad != null ? `${red(p.mediaCantidad)} ${texto(p.unidad)}` : null,
    gramos: p.mediaGramos != null ? red(p.mediaGramos) : null,
    estado: texto(p.estado), sinDato: numero(p.sinDato), parciales: numero(p.parciales),
    motivos: lista(p.motivos).slice(0, 2),
  }));
  const componentes = lista(inf30.componentes?.filas).slice(0, 8).map(f => {
    const nombre = etiquetaComponente(f.clave);
    return {
      nombre, media: red(f.media, 3), unidad: texto(f.unidad) || '—', base: texto(f.base),
      tomas: numero(f.tomas), dias: numero(f.diasConDato), sinDato: numero(f.sinDato),
      conflictos: numero(f.conflictos),
      alias: [...new Set(lista(f.alias).map(a => etiquetaComponente(a).replace(/\bl\b/g, 'L')))].filter(a => a !== nombre).slice(0, 3),
    };
  });

  const historial = lista(estado.historial).filter(h => fechaOk(h?.fecha));
  const historial30 = historial.filter(h => h.fecha >= desde && h.fecha <= hoy);
  const volumenSemanas30 = seguro(() => volumenSemanas(historial30, 4, hoy), []);
  const planes = lista(estado.plan?.sesiones);
  const entrenamiento = {
    sesiones: historial30.length,
    frecuenciaSemana: red(historial30.length / (30 / 7)),
    volumenKg: Math.round(historial30.reduce((t, h) => t + volumenSesion(h), 0)),
    racha: seguro(() => racha(historial30), 0),
    ejercicios: resumenEjercicios(historial30),
    semanas: volumenSemanas30.map(s => ({
      fecha: s.fecha, sesiones: numero(s.sesiones), kg: numero(s.kg),
    })),
    objetivo: OBJETIVOS[estado.perfil?.objetivo]?.nombre || null,
    diasPlan: lista(estado.perfil?.diasSemana).length,
    plan: texto(estado.plan?.nombre) || null,
    planSesiones: planes.length,
    ultimaSesion: historial.length ? texto(historial[historial.length - 1].nombre) || null : null,
  };

  const carreraDatos = (estado.carrera && typeof estado.carrera === 'object') ? estado.carrera : {};
  const hechas = lista(carreraDatos.hechas).filter(h => fechaOk(h?.fecha));
  const hechas30 = hechas.filter(h => h.fecha >= desde && h.fecha <= hoy);
  const planCarrera = carreraDatos.plan && typeof carreraDatos.plan === 'object' ? carreraDatos.plan : null;
  const carrera = {
    resumen: resumenHechas(hechas30),
    recientes: hechas30.slice(-5).reverse().map(h => ({
      fecha: h.fecha, nombre: texto(h.nombre) || 'Carrera',
      km: red(h.km), min: Math.round(numero(h.min)), ritmoSeg: numero(h.ritmo),
    })),
    plan: planCarrera ? resumenPlan(planCarrera) : null,
    objetivo: texto(planCarrera?.objetivo) || null,
  };

  const faltantes = [];
  if (!numero(alimentos.diasRegistrados) && !numero(suplementosInf.registros)) {
    faltantes.push('sin registros de alimentación ni suplementos en los 30 días revisados');
  }
  if (!opciones.metas) faltantes.push('faltan peso, altura o edad para calcular metas estimadas');
  if (!micros.length) faltantes.push('sin micronutrientes declarados en etiquetas del periodo');
  if (!numero(suplementosInf.registros)) faltantes.push('sin tomas de suplementos registradas en el periodo');
  if (numero(inf30.sinDato) || numero(inf30.parciales)) {
    faltantes.push(`${numero(inf30.sinDato)} aportes sin dato (no se cuentan como 0) y ${numero(inf30.parciales)} parciales`);
  }
  if (!historial30.length) faltantes.push('sin sesiones de entrenamiento registradas en el periodo');
  if (!entrenamiento.objetivo) faltantes.push('objetivo de entrenamiento sin definir');
  if (!hechas30.length) faltantes.push('sin sesiones de carrera registradas en el periodo');

  return {
    periodo: {
      desde, hasta: hoy, dias: 30,
      etiqueta: `${fechaCorta(desde)} – ${fechaCorta(hoy)}`,
    },
    disponible: {
      semanal: { desde: infSem.periodo?.desde, hasta: infSem.periodo?.hasta, diasRegistrados: numero(infSem.alimentos?.diasRegistrados) },
      mensual: { desde: infMes.periodo?.desde, hasta: infMes.periodo?.hasta, diasRegistrados: numero(infMes.alimentos?.diasRegistrados) },
    },
    nutricion: {
      diasRegistrados: numero(alimentos.diasRegistrados),
      diasConRegistros: numero(inf30.diasConRegistros),
      registros: numero(alimentos.registros),
      medias: inf30.medias || {},
      suplementos: {
        registros: numero(suplementosInf.registros),
        diasConRegistros: numero(suplementosInf.diasConRegistros),
        medias: suplementosInf.medias || {},
      },
      combinado: { medias: combinado.medias || {} },
      micros,
      deltas: inf30.deltas || {},
      comparacion: {
        suficiente: Boolean(inf30.comparacion?.suficiente),
        diasActuales: numero(inf30.comparacion?.diasActuales),
        diasPrevios: numero(inf30.comparacion?.diasPrevios),
        motivos: lista(inf30.comparacion?.motivos).slice(0, 2),
      },
      tendencia: tendenciaKcal(inf30),
      sinDato: numero(inf30.sinDato),
      parciales: numero(inf30.parciales),
    },
    suplementos: {
      productos, componentes,
      tomas: numero(suplementosInf.registros),
      sinComponentes: numero(inf30.componentes?.sinComponentes),
      conflictos: numero(inf30.componentes?.conflictos),
    },
    entrenamiento,
    carrera,
    faltantes,
  };
}

// Serialización corta para el mismo `contexto` que ya consume la Edge
// Function. Se trunca por líneas (nunca a mitad de frase) para no superar el
// límite de 6000 caracteres de `consultarCoachIA()`.
export function resumenIntegralParaIA(i, { max = 2500 } = {}) {
  if (!i) return '';
  const p = i.periodo || {};
  const n = i.nutricion || {};
  const s = i.suplementos || {};
  const t = i.entrenamiento || {};
  const c = i.carrera || {};
  const macros = m => m
    ? `${red(m.kcal)} kcal, ${red(m.prot)} g proteína, ${red(m.carbs)} g hidratos, ${red(m.grasa)} g grasa, ${red(m.fibra)} g fibra`
    : 'sin media fiable';
  const lineas = [];

  lineas.push(`CONTEXTO INTEGRAL · PERIODO DE DATOS: ${p.etiqueta || '—'} (${p.desde || '?'} a ${p.hasta || '?'}), ${p.dias || 30} días. Solo agregados, sin identificadores personales.`);
  lineas.push('REGLAS: DATO REAL=registrado; CALCULADO=derivado; OBSERVACIÓN=tendencia sin causalidad; RECOMENDACIÓN=orientación no médica; DESCONOCIDO=falta. No presentes correlaciones como causa; no diagnostiques ni recomiendes suplementos ni fármacos.');
  lineas.push(`NUTRICIÓN · DATO REAL: ${n.diasRegistrados || 0}/${p.dias || 30} días con comidas. Alimentos (sin suplementos): ${macros(n.medias)}. Suplementos aparte: ${s.tomas || 0} tomas en ${n.suplementos?.diasConRegistros || 0} días, media ${macros(n.suplementos?.medias)}. Combinado: ${macros(n.combinado?.medias)}.`);
  lineas.push(`NUTRICIÓN · DATO REAL · micros declarados: ${(n.micros || []).length ? n.micros.map(m => `${m.nombre} ${m.media} (${m.dias} días)`).join('; ') : 'DESCONOCIDO: sin declaración; no los des por cero'}.`);
  const d = n.deltas || {};
  lineas.push(`NUTRICIÓN · CALCULADO: cambio frente al periodo anterior: kcal ${d.kcal == null ? 'DESCONOCIDO' : `${d.kcal > 0 ? '+' : ''}${d.kcal}/día`}, proteína ${d.prot == null ? 'DESCONOCIDO' : `${d.prot > 0 ? '+' : ''}${d.prot} g/día`}. Comparación ${n.comparacion?.suficiente ? 'suficiente' : `insuficiente (${lista(n.comparacion?.motivos).join(', ') || 'pocos días'})`}: no concluyas tendencia si no es suficiente.`);
  if (n.tendencia?.disponible) {
    lineas.push(`NUTRICIÓN · OBSERVACIÓN: media de kcal en días registrados ${n.tendencia.primera} → ${n.tendencia.segunda} (${n.tendencia.delta > 0 ? '+' : ''}${n.tendencia.delta}; ${n.tendencia.dias} días). Es una tendencia descriptiva, no prueba de causa.`);
  }
  lineas.push(`SUPLEMENTACIÓN · DATO REAL: ${(s.productos || []).length ? s.productos.map(pr => {
    const id = `${pr.nombre}${pr.marca ? ` · ${pr.marca}` : ''}${pr.variante ? ' · variante' : ''}${pr.pack ? ' · pack' : ''}${pr.base ? ` · base ${pr.base}` : ''}`;
    return `${id} (${pr.frecuencia || 'frecuencia desconocida'}${pr.cantidad ? `, ${pr.cantidad}/toma` : ''}${pr.estado && pr.estado !== 'completo' ? `, ${pr.estado}` : ''})`;
  }).join('; ') : 'sin productos registrados'}. Las fichas del catálogo no cuentan como consumo.`);
  lineas.push(`SUPLEMENTACIÓN · CALCULADO: componentes normalizados (alias únicos, sin duplicar aportes): ${(s.componentes || []).length ? s.componentes.map(x => `${x.nombre} ${x.media} ${x.unidad}/${x.base} (${x.tomas} tomas${x.sinDato ? `, ${x.sinDato} sin dato` : ''}${x.conflictos ? `, ${x.conflictos} conflictos` : ''}${x.alias?.length ? `, alias: ${x.alias.join('/')}` : ''})`).join('; ') : 'sin componentes cuantificados'}. No asumas ingredientes ni cantidades no declarados.`);
  lineas.push(`ENTRENAMIENTO · DATO REAL: ${t.sesiones || 0} sesiones en el periodo (${t.frecuenciaSemana || 0}/semana), ${t.volumenKg ? `${t.volumenKg} kg movidos con carga declarada` : 'sin cargas declaradas'}, racha ${t.racha || 0} semanas. Ejercicios con registro: ${(t.ejercicios || []).length ? t.ejercicios.map(e => `${e.nombre} (${e.sesiones} sesiones, ${e.series} series, ${e.reps} reps, ${e.kgMax} kg máx.)`).join('; ') : 'sin ejercicios registrados'}.`);
  lineas.push(`ENTRENAMIENTO · CALCULADO: objetivo ${t.objetivo || 'DESCONOCIDO'}; plan ${t.plan || 'sin plan'}${t.planSesiones ? ` (${t.planSesiones} sesiones)` : ''}; ${t.diasPlan || 0} días/semana previstos. Volumen semanal real: ${(t.semanas || []).map(x => `${fechaCorta(x.fecha)} ${x.sesiones} sesiones/${x.kg} kg`).join(', ') || 'sin datos'}.`);
  const kmHechos = numero(c.resumen?.km);
  const minHechos = numero(c.resumen?.min);
  lineas.push(`CARRERA · DATO REAL: ${c.resumen?.veces || 0} ${c.resumen?.veces === 1 ? 'sesión' : 'sesiones'}, ${kmHechos ? `${kmHechos} km` : 'distancia DESCONOCIDA'}, ${minHechos ? `${minHechos} min` : 'tiempo DESCONOCIDO'}, ritmo ${ritmo(c.resumen?.ritmo)}. Recientes: ${(c.recientes || []).length ? c.recientes.map(h => `${fechaCorta(h.fecha)} ${h.km} km/${ritmo(h.ritmoSeg)}`).join('; ') : 'sin sesiones'}.`);
  const partesPlan = c.plan ? [
    `${c.plan.sesiones} ${c.plan.sesiones === 1 ? 'sesión' : 'sesiones'} previstas`,
    c.plan.km ? `${c.plan.km} km previstos` : null,
    c.plan.horas ? `${c.plan.horas} h previstas` : null,
  ].filter(Boolean).join(', ') : null;
  lineas.push(`CARRERA · CALCULADO: plan ${c.objetivo || 'sin objetivo'}${partesPlan ? ` · ${partesPlan}` : ' · sin plan'}.`);
  lineas.push(`DESCONOCIDO: ${(i.faltantes || []).length ? i.faltantes.join('; ') : 'ninguno detectado en los datos revisados'}. RECOMENDACIÓN: pide lo que falta antes de concluir; separa registro, cálculo, observación y recomendación.`);

  const salida = [];
  let usado = 0;
  for (const linea of lineas) {
    if (usado + linea.length + 1 > max) break;
    salida.push(linea);
    usado += linea.length + 1;
  }
  return salida.join('\n');
}
