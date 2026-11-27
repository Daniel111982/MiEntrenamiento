// =====================================================================
// Coach DanTal · motor local de explicaciones y adaptación en tiempo real
// ---------------------------------------------------------------------
// Este módulo NO necesita internet. Analiza tu programa, tus series y tu
// historial, y devuelve sugerencias que tú confirmas con un toque.
// El chat puede usar además un modelo de lenguaje real (js/llm.js); cuando
// no hay clave, responde este mismo motor con respuestas basadas en datos.
//
// Regla de oro (igual que en el resto de la app): separo siempre el
// «Dato real» (lo registrado) de la «Estimación» (lo calculado).
// =====================================================================
import { porId, MUSCULOS } from './ejercicios.js';
import { OBJETIVOS, METODOS, SEMANAS_CICLO, fase, descansoRecomendado, unoRM, lunes, hoyIso, iso, sumarDias, alternativas } from './generador.js';
import { racha, volumenSesion, volumenMuscular, recuperacion, mejorSerie } from './stats.js';
import { guiaEjercicio } from './tecnica.js';
import { alimentoPorId, macrosDe, RECETAS, resumenReceta, sumarMacros } from './alimentos.js';
import { proponerComidasPlan } from './plan-comidas.js';
import { resumenIntegralParaIA } from './contexto-ia.js';

const n0 = v => Math.round(Number(v) || 0).toLocaleString('es-ES');
const comidasTxt = n => Number(n) === 1 ? '1 comida anotada' : `${n0(n)} comidas anotadas`;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nombresMus = ms => ms.map(m => MUSCULOS[m] || m).join(' y ');

// Cuánto subir la carga según el tipo de ejercicio y cómo fue la última sesión.
function incremento(ej, valoracion) {
  let inc = !ej?.compuesto ? 1 : ['sentadilla', 'bisagra'].includes(ej.patron) ? 5 : 2.5;
  if (valoracion === 'facil') inc *= 2;
  return inc;
}

// =====================================================================
// Contexto
// =====================================================================
/**
 * Reúne todo lo que el coach necesita saber en un objeto plano.
 * @param {object} estado  Estado del usuario (perfil, plan, historial, medidas…).
 * @param {object} objetivosNutri  Metas de nutrición calculadas.
 * @param {object} extras  { semana, enCurso } para forzar el contexto de una sesión concreta.
 */
export function construirContextoCoach(estado = {}, objetivosNutri = {}, extras = {}) {
  const hist = estado.historial || [];
  const perfil = estado.perfil || {};
  const semana = extras.semana || 1;
  const f = fase(semana);
  const rec = recuperacion(hist);
  const hoy = hoyIso();
  const lunesHoy = lunes(hoy);
  const deSemana = hist.filter(h => lunes(iso(new Date(h.fecha))) === lunesHoy);
  const agenda = estado.plan?.agenda || [];
  const pasadas = agenda.filter(c => c.fecha <= hoy);
  const hechas = pasadas.filter(c => c.estado === 'hecha');
  const ult = hist[hist.length - 1] || null;
  const pesos = (estado.medidas || []).filter(m => m.peso != null).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const pesoActual = pesos.length ? Number(pesos[pesos.length - 1].peso) : null;
  const peso30 = pesos.filter(p => p.fecha <= sumarDias(hoy, -30)).pop();

  // Ingesta REAL del día (lo registrado, nunca una estimación). Se calcula
  // aquí para que tanto el prompt del LLM como el motor local la vean.
  const consumoHoy = consumoDelDia(estado, hoy);
  const estancamiento = detectarEstancamiento(hist);

  return {
    perfil, semana, fase: f,
    objetivo: OBJETIVOS[perfil.objetivo] || OBJETIVOS.musculo,
    historial: hist,
    enCurso: extras.enCurso || estado.enCurso || null,
    planSesiones: estado.plan?.sesiones || [],
    proxima: agenda.filter(c => c.estado !== 'hecha' && c.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha))[0] || null,
    ultima: ult,
    racha: racha(hist),
    sesiones: hist.length,
    sesionesSemana: deSemana.length,
    volumenSemana: Math.round(deSemana.reduce((t, h) => t + volumenSesion(h), 0)),
    recuperacion: rec,
    fatigados: Object.keys(rec).filter(m => rec[m].pct < 60),
    listos: Object.keys(rec).filter(m => rec[m].horas != null && rec[m].pct >= 90),
    volumenMuscular: volumenMuscular(hist, 7),
    adherencia: { hechas: hechas.length, total: pasadas.length, pct: pasadas.length ? Math.round(hechas.length / pasadas.length * 100) : 0 },
    nutricion: objetivosNutri || {},
    recetasDisponibles: extras.recetas || RECETAS,
    consumoHoy,
    estancamiento,
    pesoActual,
    cambioPeso30: pesoActual && peso30 ? Math.round((pesoActual - Number(peso30.peso)) * 10) / 10 : null,
  };
}

// Suma las entradas REALES del diario de hoy con las mismas reglas que usa la
// pantalla de Nutrición: escaneados (macros por 100 g), recetas y catálogo.
function macrosEntradaCoach(en) {
  if (!en) return { kcal: 0, prot: 0, carbs: 0, grasa: 0, fibra: 0 };
  if (en.macros100) {
    const k = (Number(en.gramos) || 0) / 100;
    const m = en.macros100;
    return {
      kcal: (m.kcal || 0) * k, prot: (m.prot || 0) * k, carbs: (m.carbs || 0) * k,
      grasa: (m.grasa || 0) * k, fibra: (m.fibra || 0) * k,
    };
  }
  if (en.tipo === 'receta') {
    // Receta personalizada desde el menú: sus ingredientes son los que valen.
    if (Array.isArray(en.ingredientes) && en.ingredientes.length) {
      const t = sumarMacros(en.ingredientes.map(i => macrosDe(alimentoPorId(i.id), Number(i.gramos) || 0)));
      const k = Number(en.racion) || 1;
      return { kcal: t.kcal * k, prot: t.prot * k, carbs: t.carbs * k, grasa: t.grasa * k, fibra: (t.fibra || 0) * k };
    }
    const r = RECETAS.find(x => x.id === en.id);
    if (!r) return { kcal: 0, prot: 0, carbs: 0, grasa: 0, fibra: 0 };
    const k = Number(en.racion) || 1;
    const t = resumenReceta(r).total;
    return { kcal: t.kcal * k, prot: t.prot * k, carbs: t.carbs * k, grasa: t.grasa * k, fibra: (t.fibra || 0) * k };
  }
  return macrosDe(alimentoPorId(en.id), Number(en.gramos) || 0);
}

function consumoDelDia(estado, fecha) {
  const dia = estado.comidas?.[fecha] || {};
  const total = { kcal: 0, prot: 0, carbs: 0, grasa: 0 };
  let comidas = 0;
  for (const entradas of Object.values(dia)) {
    if (!Array.isArray(entradas) || !entradas.length) continue;
    comidas++;
    const s = sumarMacros(entradas.map(macrosEntradaCoach));
    total.kcal += s.kcal; total.prot += s.prot;
    total.carbs += s.carbs; total.grasa += s.grasa;
  }
  return {
    kcal: Math.round(total.kcal), prot: Math.round(total.prot),
    carbs: Math.round(total.carbs), grasa: Math.round(total.grasa),
    vasos: Number(estado.agua?.[fecha]) || 0, comidas,
  };
}

// Un ejercicio está estancado cuando lleva >= 3 registros y su mejor serie no
// mejora al menos un 2 % en las últimas 3 sesiones. También mira el volumen.
function detectarEstancamiento(hist) {
  const porEj = new Map();
  hist.forEach((h, idx) => {
    for (const e of h.ejercicios || []) {
      if (!e?.id) continue;
      if (!porEj.has(e.id)) porEj.set(e.id, []);
      const mejor = mejorSerie(e.series || []);
      porEj.get(e.id).push({
        idx, fecha: h.fecha, nombre: e.nombre || porId[e.id]?.nombre || e.id,
        val: mejor?.val || 0, kg: mejor?.kg || 0,
        volumen: (e.series || []).reduce((a, s) => a + (s.kg || 0) * (s.reps || 0), 0),
      });
    }
  });
  const parados = [];
  for (const [id, puntos] of porEj) {
    if (puntos.length < 3) continue;
    const recientes = puntos.slice(-3);
    const primeros = recientes[0].val;
    const ultimo = recientes[recientes.length - 1].val;
    const mejora = primeros > 0 ? (ultimo - primeros) / primeros : 0;
    const volAntes = recientes[0].volumen;
    const volAhora = recientes[recientes.length - 1].volumen;
    if (mejora < 0.02 && ultimo > 0) {
      parados.push({
        id, nombre: ultimo && recientes[recientes.length - 1].nombre,
        desde: primeros, hasta: ultimo,
        porcentaje: Math.round(mejora * 100),
        volumenCae: volAntes > 0 && volAhora < volAntes * 0.9,
      });
    }
  }
  return parados.sort((a, b) => a.porcentaje - b.porcentaje);
}

// Última vez que se hizo un ejercicio (con su valoración de sesión).
function ultimoDe(ctx, id) {
  for (let i = ctx.historial.length - 1; i >= 0; i--) {
    const h = ctx.historial[i];
    const e = h.ejercicios.find(x => x.id === id);
    if (e && e.series.length) return { ...e, valoracion: h.valoracion, fecha: h.fecha };
  }
  return null;
}

// Resumen en texto plano del contexto (para el prompt del modelo de lenguaje).
export function resumenParaIA(ctx) {
  const l = [];
  const p = ctx.perfil || {};
  l.push(`Objetivo: ${ctx.objetivo.nombre}. Nivel: ${p.nivel || '—'}. Días/semana: ${(p.diasSemana || []).length}. Lugar: ${p.lugar || '—'}. Duración objetivo: ${p.duracion || '—'} min.`);
  l.push(`Semana ${ctx.semana} del ciclo de ${SEMANAS_CICLO} (fase ${ctx.fase.nombre}${ctx.fase.descarga ? ', semana de descarga' : ''}).`);
  l.push(`Sesiones completadas: ${ctx.sesiones}. Racha: ${ctx.racha} semanas. Esta semana: ${ctx.sesionesSemana} sesiones, ${n0(ctx.volumenSemana)} kg movidos.`);
  l.push(`Adherencia (sesiones previstas ya pasadas): ${ctx.adherencia.hechas}/${ctx.adherencia.total} (${ctx.adherencia.pct}%).`);
  if (ctx.pesoActual) l.push(`Peso actual: ${ctx.pesoActual} kg${ctx.cambioPeso30 != null ? ` (${ctx.cambioPeso30 > 0 ? '+' : ''}${ctx.cambioPeso30} kg en 30 días)` : ''}.`);
  if (ctx.ultima) l.push(`Última sesión: «${ctx.ultima.nombre}» (valoración: ${ctx.ultima.valoracion || 'sin valorar'}).`);
  if (ctx.proxima) l.push(`Próxima sesión prevista: «${ctx.planSesiones[ctx.proxima.sesion]?.nombre || '—'}» el ${ctx.proxima.fecha}.`);
  if (ctx.fatigados.length) l.push(`Músculos aún recuperándose: ${nombresMus(ctx.fatigados)}.`);
  else l.push('Músculos recuperados para entrenar.');
  const n = ctx.nutricion || {};
  if (n.kcal) l.push(`Metas de nutrición: ${n0(n.kcal)} kcal, ${n.protG} g de proteína, ${n.carbsG} g de hidratos, ${n.grasaG} g de grasa y ${(n.aguaMl / 1000).toFixed(1)} L de agua al día.`);
  const c = ctx.consumoHoy || {};
  const hoyDetalle = ctx.nutricionDetalle?.real?.hoy;
  l.push(hoyDetalle?.sinRegistros
    ? 'Consumo REAL registrado hoy: sin comidas anotadas. NO es 0 kcal; no des por cubiertos objetivos ni inventes ingestas.'
    : `Consumo REAL registrado hoy: ${n0(c.kcal)} kcal, ${c.prot || 0} g proteína, ${c.carbs || 0} g hidratos, ${c.grasa || 0} g grasa, ${c.vasos || 0} vasos de agua (${comidasTxt(c.comidas)}). Si faltan datos, no los inventes.`);
  if (ctx.estancamiento?.length) {
    l.push(`Posible estancamiento (datos reales): ${ctx.estancamiento.slice(0, 4).map(e => `${e.nombre} ${e.porcentaje}% en las últimas 3 sesiones${e.volumenCae ? ' y con volumen a la baja' : ''}`).join('; ')}.`);
  }
  if (ctx.planSesiones.length) l.push(`Sesiones del plan: ${ctx.planSesiones.map(s => s.nombre).join(', ')}.`);
  // FASE 9 · PARTE 4: observaciones ya calculadas por el módulo de adaptación,
  // dentro del mismo resumen. No cambia el contrato de chatear(): el modelo
  // sigue recibiendo un único texto de contexto y no aplica nada por su cuenta.
  if (ctx.adaptacion?.tendencia?.suficiente) {
    const t = ctx.adaptacion.tendencia;
    l.push(`Evolución corporal observada: ${t.clasificacion}, ${t.direccion}${t.ritmo != null ? ` (${t.ritmo > 0 ? '+' : ''}${t.ritmo} kg/semana)` : ''}. Es una observación, no una decisión; respeta los datos ausentes y las limitaciones registradas.`);
  }
  if (ctx.adaptacion?.pendientes) {
    l.push(`Hay ${ctx.adaptacion.pendientes} propuesta(s) de adaptación pendiente(s) de revisión en la app. Menciónalas, pero no las des por aceptadas ni las apliques sin consentimiento.`);
  }
  // FASE 7: el contexto integral entra en ESTE MISMO resumen (no hay segundo
  // prompt ni segundo endpoint). Se inserta antes del detalle nutricional
  // antiguo para que no se pierda si el servicio recorta el contexto a 6000.
  if (ctx.integral) l.push(resumenIntegralParaIA(ctx.integral));
  l.push(resumenNutricionParaIA(ctx));
  return l.join('\n');
}

/**
 * Serializa el detalle nutricional que app.js añade al contexto del coach.
 * Reglas explícitas para el modelo: solo registros reales, un día sin
 * anotaciones no es consumo cero, sin diagnósticos ni recetas médicas, y
 * siempre DATO REAL separado de ESTIMACIÓN. Se incluyen metas, los 7 DÍAS
 * con kcal reales, el peso y las preferencias de recetas.
 */
export function resumenNutricionParaIA(ctx) {
  const d = ctx?.nutricionDetalle;
  if (!d) return 'NUTRICIÓN: sin detalle de registros. No des por cubierto ningún objetivo ni inventes ingestas.';
  const real = d.real || {};
  const est = d.estimacion || {};
  const m = est.metas;
  const l = ['NUTRICIÓN · REGLAS: usa solo registros reales; un día sin registros NO es consumo cero; no diagnosticues ni recetes; separa DATO REAL de ESTIMACIÓN.'];
  l.push(`ESTIMACIÓN · metas: ${m
    ? `${n0(m.kcal)} kcal, ${m.protG} g proteína, ${m.carbsG} g hidratos, ${m.grasaG} g grasa, ${m.fibraG} g fibra, ${(m.aguaMl / 1000).toFixed(1)} L agua (${m.objetivo || 'objetivo sin definir'}, modo ${m.modo || '—'})`
    : 'sin calcular: faltan peso, altura o edad'}.`);

  const h = real.hoy || {};
  l.push(h.registrado
    ? `DATO REAL · hoy (${d.fecha || '—'}): ${n0(h.kcal)} kcal, ${h.prot || 0} g proteína, ${h.carbs || 0} g hidratos, ${h.grasa || 0} g grasa, ${h.fibra || 0} g fibra, ${h.vasos || 0} vasos (${comidasTxt(h.comidas)}).`
    : `DATO REAL · hoy (${d.fecha || '—'}): sin comidas registradas. NO es 0 kcal; no afirmes objetivos cubiertos ni déficits.`);

  const p7 = real.periodos?.['7d'] || {};
  const dias = (p7.porDia || []).map(x => `${String(x.fecha || '').slice(5)}:${x.kcal == null ? 'sin registro' : `${x.kcal} kcal`}`).join('; ');
  l.push(`DATO REAL · 7 DÍAS con kcal reales: ${p7.registrados || 0}/7 días registrados${dias ? ` (${dias})` : ''}.`);
  if (p7.medias) l.push(`ESTIMACIÓN · media de esos ${p7.registrados} días registrados: ${n0(p7.medias.kcal)} kcal, ${p7.medias.prot} g proteína, ${p7.medias.fibra} g fibra. No cuentes los días sin registro como 0.`);
  else l.push('DATO REAL · 7 DÍAS: sin registros; no hay media fiable.');
  const p30 = real.periodos?.['30d'] || {};
  const p90 = real.periodos?.['90d'] || {};
  l.push(`DATO REAL · periodos: 30 días ${p30.registrados || 0}/30 registrados, media ${p30.medias ? `${n0(p30.medias.kcal)} kcal` : 'no disponible'}${p30.previo ? ` (previos ${n0(p30.previo.kcal)} kcal)` : ''}; 90 días ${p90.registrados || 0}/90 registrados, media ${p90.medias ? `${n0(p90.medias.kcal)} kcal` : 'no disponible'}.`);
  if (p7.previo) l.push(`DATO REAL · semana anterior: media ${n0(p7.previo.kcal)} kcal sobre días registrados.`);

  const peso = real.peso;
  l.push(peso
    ? `DATO REAL · peso: ${peso.v} kg (${peso.fecha})${real.cambioPeso30 != null ? `; ${real.cambioPeso30 > 0 ? '+' : ''}${real.cambioPeso30} kg en 30 días` : ''}.${real.medidas?.cintura ? ` Cintura ${real.medidas.cintura.v} cm (${real.medidas.cintura.fecha}).` : ''}`
    : 'DATO REAL · peso: sin mediciones registradas.');
  const frec = (real.frecuentes || []).slice(0, 6).map(x => `${x.nombre} (${x.veces}${x.gramos ? ` · ~${x.gramos} g` : ''}: ${n0(x.kcal)} kcal, ${x.prot} g P)`).join('; ');
  if (frec) l.push(`DATO REAL · alimentos/recetas frecuentes: ${frec}.`);
  const pref = est.preferencias || {};
  l.push(`PREFERENCIAS DE RECETAS · favoritas: ${(pref.favoritas || []).length ? pref.favoritas.join(', ') : 'ninguna'}; excluidas: ${(pref.excluidas || []).length ? pref.excluidas.join(', ') : 'ninguna'}.`);
  const plan = d.planificador;
  if (plan) {
    const comidas = Object.entries(plan.comidas || {})
      .map(([c, x]) => `${c}: ${x.entradas.join(' + ')} (${x.kcal} kcal, ${x.prot} g P)`)
      .join('; ');
    l.push(`DATO REAL · planificador ${plan.fecha}: ${comidas || 'sin comidas planificadas'}; total ${plan.total?.kcal || 0} kcal y ${plan.total?.prot || 0} g P. El plan NO entra en el diario hasta que el usuario lo confirme.`);
  }
  const disp = d.disponibles;
  if (disp?.recetas?.length) l.push(`CATÁLOGO (macros calculados desde ingredientes) · recetas disponibles: ${disp.recetas.map(r => `${r.nombre} (${r.kcal} kcal, ${r.prot} g P${r.comidas?.length ? `, ${r.comidas.join('/')}` : ''})`).join('; ')}.`);
  if (disp?.alimentos?.length) l.push(`CATÁLOGO (valores por 100 g de alimentos.js) · alimentos disponibles: ${disp.alimentos.map(a => `${a.nombre} (${a.kcal} kcal, ${a.prot} g P)`).join('; ')}.`);
  const sug = (est.sugerencias || []).slice(0, 2).map(s => s.titulo).join('; ');
  if (sug) l.push(`ESTIMACIÓN · sugerencias calculadas: ${sug}. No son diagnósticos.`);
  return l.join('\n');
}

// =====================================================================
// Explicación de un ejercicio («cuánto y por qué»)
// =====================================================================
/**
 * Explicación breve y concreta de un ejercicio prescrito.
 * @returns {{titulo:string, html:string}}
 */
export function explicarEjercicio(item, perfil = {}, semana = 1, ctx = null) {
  const ej = porId[item.id] || {};
  const f = fase(semana);
  const obj = OBJETIVOS[perfil.objetivo] || OBJETIVOS.musculo;
  const rec = descansoRecomendado(ej, perfil);
  const series = item.series || 0;
  const reps = item.metodo === 'tabata' ? '8 × 20 s / 10 s'
    : item.tipo === 'tiempo' ? `${item.repsMax} s`
      : (item.repsMin === item.repsMax ? `${item.repsMin} reps` : `${item.repsMin}-${item.repsMax} reps`);
  const desc = item.metodo === 'tabata' ? '10 s entre rondas' : item.descanso != null ? `${item.descanso} s` : '—';
  const tipo = ej.compuesto ? 'compuesto' : ej.patron === 'core' ? 'de core' : 'de aislamiento';
  const mus = ej.musculos ? nombresMus(ej.musculos) : 'varios músculos';

  const por = [];
  por.push(`Es un ejercicio <b>${tipo}</b> que trabaja sobre todo <b>${esc(mus)}</b>.`);
  if (ej.compuesto) por.push('Mueve varios músculos y bastante peso, así que va al principio de la sesión, cuando estás más fresco: así haces más repeticiones y con mejor técnica.');
  else por.push('Al ser más localizado, va después de los compuestos y ahí es más seguro acercarse al fallo.');

  por.push(`Haz <b>${series} series</b> de <b>${reps}</b>${item.metodo !== 'tabata' ? ` con <b>${desc}</b> de descanso` : ''}.`);

  if (item.metodo && item.metodo !== 'normal') por.push(`Usa el método <b>${esc(METODOS[item.metodo]?.nombre || item.metodo)}</b>: ${esc(METODOS[item.metodo]?.desc || '')}`);
  if (item.foco) por.push('Está marcado como <b>prioritario</b>: por eso va primero y lleva una serie extra. Es un músculo que has decidido reforzar.');
  if (f.nombre === 'Acumulación') por.push('Estás en <b>acumulación</b>: toca más volumen (repeticiones algo más altas y descansos más cortos) para construir base.');
  if (f.nombre === 'Realización') por.push('Estás en <b>realización</b>: menos repeticiones y más descanso para mover la carga más alta con buena técnica.');
  if (f.descarga) por.push('Esta semana es de <b>descarga</b>: una serie menos a propósito, para disipar la fatiga.');
  if (item.descanso != null && item.descanso !== rec && item.metodo !== 'tabata') por.push(`El descanso recomendado para este ejercicio y tu objetivo «${esc(obj.nombre)}» es de <b>${rec} s</b>; tú tienes ${item.descanso} s.`);

  const ult = ctx ? ultimoDe(ctx, item.id) : null;
  if (ult) {
    const m = mejorSerie(ult.series);
    if (m?.kg) por.push(`La última vez hiciste hasta <b>${m.kg} kg × ${m.reps}</b> (1RM estimado ${unoRM(m.kg, m.reps)} kg).`);
    else if (m?.reps) por.push(`La última vez hiciste hasta <b>${m.reps} repeticiones</b>.`);
  }

  return { titulo: `Por qué ${esc(ej.nombre || item.id)}`, html: `<ul class="ciencia-puntos">${por.map(x => `<li>${x}</li>`).join('')}</ul>` };
}

// =====================================================================
// Adaptación en tiempo real (mientras entrenas)
// =====================================================================
/**
 * Sugerencia para el ejercicio que estás haciendo, según las series ya hechas.
 * @returns {{id,icono,titulo,texto,motivo,label,accion}|null}
 */
export function sugerenciaEnVivo(item, perfil = {}, ctx = null) {
  const ej = porId[item.id];
  if (!ej || item.metodo === 'tabata') return null;
  const hechas = (item.series || []).filter(r => r.hecho && !r.tabata);
  const pend = (item.series || []).filter(r => !r.hecho);
  if (!hechas.length || !pend.length) return null;
  const norm = hechas.filter(r => !r.drop);
  if (!norm.length) return null;

  const ult = ctx ? ultimoDe(ctx, item.id) : null;
  const valoracion = ult?.valoracion || null;

  // Ejercicios por tiempo: segundos.
  if (item.tipo === 'tiempo') {
    const segs = norm.map(r => Number(r.reps) || 0);
    const obj = item.repsMax || 30;
    if (segs.every(s => s >= obj)) return {
      id: `tiempo-up:${item.id}:${hechas.length}`, icono: '⏫', titulo: 'Aguantas de sobra',
      texto: `Has llegado a ${obj} s en todas las series. La próxima vez apunta a ${obj + 5} s.`,
      motivo: 'Si completas el objetivo de tiempo en todas las series, el estímulo ya no crece: conviene añadir unos segundos.',
      label: 'Apuntar +5 s', accion: { tipo: 'objetivoTiempo', delta: 5 },
    };
    if (segs.every(s => s < obj - 5)) return {
      id: `tiempo-down:${item.id}:${hechas.length}`, icono: '⏬', titulo: 'Vas justo de tiempo',
      texto: `Te has quedado por debajo de ${obj} s. Baja el objetivo a ${Math.max(10, obj - 5)} s para mantener la técnica.`,
      motivo: 'Mejor menos tiempo con buena postura que aguantar mal la posición.',
      label: 'Bajar a ' + Math.max(10, obj - 5) + ' s', accion: { tipo: 'objetivoTiempo', delta: -5 },
    };
    return null;
  }

  const kgs = norm.map(r => Number(r.kg) || 0);
  const reps = norm.map(r => Number(r.reps) || 0);
  const conPeso = Math.max(...kgs) > 0;
  const alcanzaMax = norm.every(r => (Number(r.reps) || 0) >= item.repsMax);
  const bajoMin = norm.filter(r => (Number(r.reps) || 0) < item.repsMin).length > norm.length / 2;
  const caida = reps.length >= 2 && reps[0] - reps[reps.length - 1] >= 4;

  if (alcanzaMax && conPeso) {
    const inc = incremento(ej, valoracion);
    return {
      id: `carga-up:${item.id}:${hechas.length}`, icono: '⏫', titulo: 'Vas sobrado: sube la carga',
      texto: `Has llegado a ${item.repsMax} reps en todas las series. Suma ${inc} kg en las series que te quedan (${pend.length}).`,
      motivo: `Completar el tope del rango indica que el músculo ya tolera más. Subir ${inc} kg mantiene la sobrecarga progresiva.`,
      label: `Subir ${inc} kg`, accion: { tipo: 'carga', delta: inc },
    };
  }
  if (bajoMin && conPeso) {
    const kg = Math.round(Math.max(...kgs) * 0.95 * 2) / 2;
    return {
      id: `carga-down:${item.id}:${hechas.length}`, icono: '⏬', titulo: 'Te has quedado corto',
      texto: `Estás por debajo de ${item.repsMin} reps. Baja un 5 % (a ~${kg} kg) para recuperar el rango.`,
      motivo: 'Si no llegas al mínimo de repeticiones, la carga es demasiado alta: bajar un poco recupera la calidad del estímulo.',
      label: `Bajar a ${kg} kg`, accion: { tipo: 'cargaFija', kg },
    };
  }
  if (caida) {
    return {
      id: `descanso-up:${item.id}:${hechas.length}`, icono: '⏱', titulo: 'Se te está cayendo la fuerza',
      texto: `Has bajado ${reps[0] - reps[reps.length - 1]} repeticiones entre la primera y la última serie. Añade 15 s de descanso.`,
      motivo: 'Una caída grande de repeticiones suele indicar descanso insuficiente: con un poco más mantienes el rendimiento serie a serie.',
      label: '+15 s de descanso', accion: { tipo: 'descanso', delta: 15 },
    };
  }
  if (alcanzaMax && !conPeso) {
    return {
      id: `reps-up:${item.id}:${hechas.length}`, icono: '➕', titulo: 'Añade dificultad',
      texto: `Has llegado a ${item.repsMax} reps sin peso. Ralentiza la bajada o pasa a una variante más difícil.`,
      motivo: 'En ejercicios de peso corporal, la progresión se hace con el control del movimiento o una variante más exigente.',
      label: 'Entendido', accion: { tipo: 'nada' },
    };
  }
  return null;
}

/**
 * Sugerencias para toda la sesión en curso (tiempo, fatiga, finalizador…).
 */
export function sugerenciasSesion(enCurso, perfil = {}, ctx = null, { minutos = null } = {}) {
  const out = [];
  if (!enCurso) return out;
  const ejs = enCurso.ejercicios || [];
  const pendientes = ejs.filter(e => e.series.some(r => !r.hecho));

  // 1) Se está alargando: el finalizador sobra.
  const finalizador = pendientes.find(e => e.final || e.metodo === 'tabata');
  if (finalizador && minutos != null && minutos > 75) {
    out.push({
      id: 'skip-final', icono: '🏁', titulo: 'La sesión se alarga',
      texto: `Llevas ${minutos} min. El bloque metabólico del final es lo primero que puedes quitar hoy sin perder lo importante.`,
      motivo: 'Los compuestos y accesorios ya han hecho el trabajo principal. Si el tiempo aprieta, el finalizador es prescindible.',
      label: 'Quitar el finalizador', accion: { tipo: 'saltarFinal' },
    });
  }

  // 2) Fatiga alta: venimos de una sesión dura y hoy las repeticiones caen.
  const conCaida = pendientes.filter(e => {
    const h = (e.series || []).filter(r => r.hecho && !r.drop);
    return h.length >= 2 && (Number(h[0].reps) || 0) - (Number(h[h.length - 1].reps) || 0) >= 4;
  });
  if (conCaida.length >= 2) {
    out.push({
      id: 'fatiga', icono: '😮‍💨', titulo: 'Hoy acumulas fatiga',
      texto: 'Varias series te están bajando el rendimiento. Prioriza los ejercicios que quedan y no fuerces el fallo.',
      motivo: 'Cuando el rendimiento cae en varios ejercicios a la vez, suele ser fatiga acumulada. Mantener la técnica vale más que una serie extra.',
      label: 'Vale', accion: { tipo: 'nada' },
    });
  }

  // 3) Un músculo que ibas a trabajar aún no está recuperado.
  if (ctx) {
    const musSesion = [...new Set(ejs.map(e => porId[e.id]?.musculos[0]).filter(Boolean))];
    const cansados = musSesion.filter(m => ctx.recuperacion[m]?.pct < 60);
    if (cansados.length) out.push({
      id: `rec-${cansados.join('-')}`, icono: '💤', titulo: 'Músculo aún cargado',
      texto: `${nombresMus(cansados)} ${cansados.length === 1 ? 'viene' : 'vienen'} de entrenar hace poco. Baja una serie o un poco el peso en esos ejercicios.`,
      motivo: 'Entrenar un músculo que no se ha recuperado del todo reduce la calidad de la sesión y puede acumular fatiga.',
      label: 'Entendido', accion: { tipo: 'nada' },
    });
  }
  return out;
}

/**
 * Adaptación del programa entre sesiones (semanal). Devuelve sugerencias
 * que el usuario puede aplicar o ignorar.
 */
export function sugerenciasSemana(ctx) {
  const out = [];
  if (!ctx) return out;

  // Poca adherencia: mejor menos días bien hechos que muchos a medias.
  if (ctx.adherencia.total >= 4 && ctx.adherencia.pct < 60) {
    out.push({
      id: 'adherencia', icono: '🗓️', titulo: 'Te está costando cumplir',
      texto: `Has completado ${ctx.adherencia.hechas} de ${ctx.adherencia.total} sesiones previstas (${ctx.adherencia.pct} %). Puede que hayas elegido demasiados días.`,
      motivo: 'La adherencia es el factor que más influye en el resultado. Es mejor bajar un día y cumplirlo que mantener una rutina que no cabe en tu semana.',
      label: 'Ajustar mi perfil', accion: { tipo: 'perfil' },
    });
  }

  // Volumen muy alto + fatiga: proponer descarga antes de tiempo.
  const volAlto = Object.values(ctx.volumenMuscular || {}).some(v => v >= 22);
  if (volAlto && ctx.fatigados.length >= 3) {
    out.push({
      id: 'descarga', icono: '🌙', titulo: 'Mucho volumen y poca recuperación',
      texto: `Llevas ${n0(ctx.volumenSemana)} kg esta semana y tienes ${ctx.fatigados.length} músculos aún cargados. Considera una semana más ligera.`,
      motivo: 'Cuando el volumen semanal es muy alto y la recuperación no llega, bajar el volumen una semana permite volver más fuerte (descarga).',
      label: 'Entendido', accion: { tipo: 'nada' },
    });
  }

  // Buen progreso: reforzar lo que funciona.
  if (ctx.adherencia.total >= 3 && ctx.adherencia.pct >= 80 && ctx.racha >= 2) {
    out.push({
      id: 'buen-progreso', icono: '🔥', titulo: 'Vas muy bien',
      texto: `${ctx.adherencia.pct} % de adherencia y ${ctx.racha} semanas seguidas. Mantén el plan: las cargas suben solas cuando completas el rango.`,
      motivo: 'La constancia es lo que hace subir las cargas y el volumen. Con esta adherencia, no hace falta cambiar nada.',
      label: 'Vale', accion: { tipo: 'nada' },
    });
  }

  // Sin récords recientes: mirar recuperación y comida.
  if (ctx.sesiones >= 8 && ctx.pesoActual) {
    const hace = ctx.cambioPeso30;
    if (ctx.objetivo.nombre === 'Ganar músculo' && hace != null && hace <= 0) {
      out.push({
        id: 'peso-estancado', icono: '🍽️', titulo: 'El peso no sube',
        texto: 'Para ganar músculo necesitas energía extra. Tu peso no ha subido en 30 días: prueba a añadir 150-200 kcal al día.',
        motivo: 'Sin superávit calórico, el cuerpo no tiene material para construir músculo aunque entrenes bien. Es una estimación, ajústala según tu evolución.',
        label: 'Ver mis objetivos', accion: { tipo: 'nutricion' },
      });
    }
  }
  return out;
}

// =====================================================================
// Chat integrado (sin modelo de lenguaje)
// =====================================================================
/** Preguntas rápidas según el contexto. */
export function preguntasSugeridas(ctx) {
  const q = [];
  if (ctx.enCurso) {
    const ej = ctx.enCurso.ejercicios.find(e => e.series.some(r => !r.hecho));
    if (ej) q.push(`¿Cuánto peso pongo en ${porId[ej.id]?.nombre || 'el siguiente ejercicio'}?`);
  }
  q.push('¿Por qué este orden de ejercicios?');
  q.push('¿Cuánto debo descansar?');
  q.push('¿Cuántas series son suficientes?');
  q.push('¿Estoy progresando?');
  q.push('¿Cómo se hace este ejercicio?');
  q.push('¿Qué como hoy? ¿Cuánta proteína me falta?');
  q.push('¿Cuánta proteína necesito?');
  if (ctx.fatigados.length) q.push('¿Qué músculos puedo entrenar hoy?');
  return q.slice(0, 6);
}

// ---------------------------------------------------------------------
// Respuestas nutricionales del motor local (mismo chat, mismo contexto)
// ---------------------------------------------------------------------
// Un vaso del diario son 250 ml, igual que en la pantalla de Hidratación.
const VASO_ML_COACH = 250;
const COMIDA_NOMBRES = { desayuno: 'desayuno', comida: 'comida', snack: 'merienda', cena: 'cena' };
const NUTRIENTES_COACH = [
  { k: 'prot', meta: 'protG', nombre: 'proteína', uni: 'g', umbral: 5, icono: '🥩' },
  { k: 'carbs', meta: 'carbsG', nombre: 'hidratos', uni: 'g', umbral: 15, icono: '🍚' },
  { k: 'grasa', meta: 'grasaG', nombre: 'grasa', uni: 'g', umbral: 3, icono: '🥑' },
  { k: 'fibra', meta: 'fibraG', nombre: 'fibra', uni: 'g', umbral: 2, icono: '🌾' },
];
const numC = v => Number.isFinite(Number(v)) ? Number(v) : 0;

function datosNutri(ctx) {
  const detalle = ctx?.nutricionDetalle || {};
  const real = detalle.real || {};
  const est = detalle.estimacion || {};
  return {
    fecha: detalle.fecha || '', real, est,
    metas: est.metas && Object.keys(est.metas).length ? est.metas : (ctx?.nutricion || {}),
    hoy: real.hoy || {}, periodos: real.periodos || {},
    planificador: detalle.planificador || null,
    disponibles: detalle.disponibles || null,
    recetas: ctx?.recetasDisponibles || RECETAS,
  };
}

// Défices recalculados al momento: solo con registros reales de hoy y metas.
// Si no hay registro o no hay meta, no se devuelve ningún déficit.
function huecosNutri(d) {
  if (!d.hoy.registrado || !numC(d.metas.kcal)) return [];
  const todos = [{ k: 'kcal', meta: 'kcal', nombre: 'calorías', uni: 'kcal', umbral: 120, icono: '🔥' }, ...NUTRIENTES_COACH];
  return todos.map(x => {
    const meta = numC(d.metas[x.meta]);
    const cons = numC(d.hoy[x.k]);
    return { ...x, meta, cons, falta: Math.round(meta - cons) };
  })
    .filter(x => x.meta > 0 && x.falta >= x.umbral)
    .sort((a, b) => b.falta / b.umbral - a.falta / a.umbral);
}

// Opciones reales del contexto: alimentos frecuentes y recetas de la app,
// respetando las recetas excluidas y priorizando las favoritas.
function opcionesNutri(d, nutrient, { comida = null, max = 2 } = {}) {
  const pref = d.est.preferencias || {};
  const excluidas = new Set((pref.excluidasIds || []).map(String));
  const favoritas = new Set((pref.favoritasIds || []).map(String));
  const minPorRacion = { prot: 8, carbs: 12, grasa: 4, fibra: 2, kcal: 100 }[nutrient.k] || 1;
  const vistos = new Set();
  const alimentos = (d.real.frecuentes || [])
    .filter(x => x.nombre && !excluidas.has(String(x.id || '')) && numC(x[nutrient.k]) >= minPorRacion)
    .slice(0, max)
    .map(x => ({
      nombre: x.nombre,
      detalle: `~${n0(x[nutrient.k])} ${nutrient.uni} por ración habitual${x.gramos ? ` (~${x.gramos} g)` : ''}`,
      href: d.recetas.some(r => r.id === x.id) ? `#nutricion/receta/${x.id}` : '#nutricion',
    }));
  alimentos.forEach(x => vistos.add(x.nombre));

  let candidatas = d.recetas.filter(r => !excluidas.has(r.id) && (!comida || r.comidas.includes(comida)));
  if (!candidatas.length) candidatas = d.recetas.filter(r => !excluidas.has(r.id));
  const recetas = candidatas
    .map(r => ({ r, total: resumenReceta(r).total }))
    .sort((a, b) => (favoritas.has(b.r.id) ? 1 : 0) - (favoritas.has(a.r.id) ? 1 : 0)
      || numC(b.total[nutrient.k]) - numC(a.total[nutrient.k]))
    .slice(0, max)
    .filter(x => !vistos.has(x.r.nombre))
    .map(({ r, total }) => ({
      nombre: r.nombre,
      detalle: `${n0(total.kcal)} kcal · ${n0(total[nutrient.k])} ${nutrient.uni} por ración`,
      href: `#nutricion/receta/${r.id}`,
    }));
  return { alimentos, recetas };
}

function opcionesNutriHTML(opciones) {
  const filas = [...(opciones?.alimentos || []), ...(opciones?.recetas || [])].slice(0, 4);
  if (!filas.length) return '';
  return `<ul class="ciencia-puntos">${filas.map(o =>
    `<li>${o.href ? `<a href="${esc(o.href)}">${esc(o.nombre)}</a>` : esc(o.nombre)} · ${esc(o.detalle)}</li>`).join('')}</ul>`;
}

function metasNutriTxt(d) {
  const m = d.metas;
  if (!numC(m.kcal)) return 'sin metas calculadas: añade peso, altura y edad en <a href="#nutricion/objetivos">Objetivos</a>';
  return `${n0(m.kcal)} kcal, ${n0(m.protG)} g proteína, ${n0(m.carbsG)} g hidratos, ${n0(m.grasaG)} g grasa, ${n0(m.fibraG)} g fibra y ${(numC(m.aguaMl) / 1000).toFixed(1)} L de agua`;
}

const AVISO_NUTRI = '<p class="tenue">Solo cuento lo que has anotado. Un día sin registros no es consumo cero. Es orientación, no consejo médico: no diagnostico ni receto.</p>';

/** Respuesta estructurada del coach nutricional con los datos del contexto. */
function responderNutricion(pregunta, ctx, tipo) {
  const d = datosNutri(ctx);
  const h = d.hoy;
  const metas = metasNutriTxt(d);
  const huecos = huecosNutri(d);
  const p7 = d.periodos['7d'] || {};
  const p30 = d.periodos['30d'] || {};
  const sinRegistro = !h.registrado;
  if (!numC(d.metas.kcal)) return {
    titulo: 'Nutrición sin metas calculadas',
    html: `<p><b>Dato real:</b> ${sinRegistro ? 'hoy no hay comidas registradas (no es 0 kcal)' : `${n0(h.kcal)} kcal y ${h.prot || 0} g de proteína anotados`}.</p>
      <p>Añade peso, altura y edad en <a href="#nutricion/objetivos">Nutrición → Objetivos</a> para tener metas estimadas y poder comparar.</p>${AVISO_NUTRI}`,
  };
  const huecosHTML = lista => lista.length
    ? `<ul class="ciencia-puntos">${lista.map(x => `<li><b>${x.nombre}:</b> ${n0(x.cons)} de ${n0(x.meta)} ${x.uni}; faltan ${n0(x.falta)} ${x.uni}.</li>`).join('')}</ul>`
    : '';

  if (tipo === 'plan') {
    const plan = d.planificador || { fecha: d.fecha || hoyIso(), comidas: {}, total: null };
    const fecha = plan.fecha || hoyIso();
    const comida = /desayuno/i.test(pregunta) ? 'desayuno'
      : /merienda|snack/i.test(pregunta) ? 'snack'
        : /\bcomida\b|comer/i.test(pregunta) ? 'comida' : 'cena';
    const pref = d.est.preferencias || {};
    const excluidasSet = new Set((pref.excluidasIds || []).map(String));
    const favoritasSet = new Set((pref.favoritasIds || []).map(String));
    const yaEnPlan = new Set(Object.values(plan.comidas || {}).flatMap(x => x.entradas || []));
    const recetas = d.recetas.filter(r => !excluidasSet.has(String(r.id)) && !yaEnPlan.has(r.nombre))
      .sort((a, b) => Number(favoritasSet.has(String(b.id))) - Number(favoritasSet.has(String(a.id))));
    const propuestas = proponerComidasPlan({
      recetas, metas: d.metas, consumo: plan.total || {}, comida, fecha, limite: 3,
    });
    return {
      titulo: `Propuestas para tu plan del ${fecha}`,
      html: `<p><b>Dato real del planificador:</b> ${plan.total
        ? `${n0(plan.total.kcal)} kcal y ${plan.total.prot} g de proteína previstos`
        : 'sin comidas planificadas'} para ${esc(fecha)}. Lo planificado NO está en el diario.</p>
        <p><b>Estimación:</b> ${metas}. Opciones para ${esc(COMIDA_NOMBRES[comida] || comida)} con recetas de la app: sus macros están calculados desde los ingredientes con alimentos.js${favoritasSet.size ? '; priorizo tus favoritas' : ''}.</p>
        ${propuestas.length ? propuestas.map(p => `<div class="coach-sug" data-sug="${esc(p.id)}">
          <span class="cs-ic">${p.icono}</span>
          <div class="cs-t"><b>${esc(p.titulo)}</b><p>${esc(p.texto)}</p>
            <details class="cs-por"><summary>¿Por qué?</summary><p>${esc(p.motivo)}</p></details></div>
          <div class="cs-acc">
            <button class="btn peq" data-a="coachAccion" data-acc="${esc(JSON.stringify(p.accion))}" data-sug="${esc(p.id)}">Añadir al plan</button>
            <button class="enlace cs-x" data-a="coachIgnorar" data-sug="${esc(p.id)}">Ignorar</button>
          </div></div>`).join('') : '<p class="tenue">No hay recetas disponibles para esa comida con tus filtros actuales.</p>'}
        <p class="tenue">Revisa cada opción antes de añadirla. No se apunta nada al diario automáticamente.</p>${AVISO_NUTRI}`,
    };
  }

  if (tipo === 'dia') {
    if (sinRegistro) return {
      titulo: 'Tu día de hoy: sin registros',
      html: `<p><b>Dato real (${esc(d.fecha)}):</b> no hay comidas anotadas hoy. No lo interpreto como 0 kcal ni doy por cubiertos tus objetivos.</p>
        <p><b>Estimación:</b> ${metas}.</p>
        <p>Anota lo que has tomado en <a href="#nutricion">Nutrición → Diario</a> y te digo con cifras reales qué falta y qué opciones tienes.</p>${AVISO_NUTRI}`,
    };
    const opciones = huecos.length ? opcionesNutri(d, huecos[0]) : null;
    return {
      titulo: 'Análisis de tu día de hoy',
      html: `<p><b>Dato real (${esc(d.fecha)}):</b> ${n0(h.kcal)} kcal · ${h.prot || 0} g proteína · ${h.carbs || 0} g hidratos · ${h.grasa || 0} g grasa · ${h.fibra || 0} g fibra · ${h.vasos || 0} vasos (${comidasTxt(h.comidas)}).</p>
        <p><b>Estimación:</b> ${metas}.</p>
        ${huecos.length ? `<p>Huecos claros con lo registrado:</p>${huecosHTML(huecos.slice(0, 4))}${opcionesHTML(opciones)}` : '<p>No veo un déficit claro con lo registrado; no voy a inventar carencias.</p>'}
        <p class="tenue">${numC(d.metas.aguaMl) ? `Agua: ${h.vasos || 0} vasos de ${Math.round(numC(d.metas.aguaMl) / VASO_ML_COACH)} (${(numC(d.metas.aguaMl) / 1000).toFixed(1)} L estimados).` : ''}</p>${AVISO_NUTRI}`,
    };
  }

  if (tipo === 'semana') {
    if (!p7.registrados) return {
      titulo: 'Tu última semana: sin registros',
      html: `<p><b>Dato real:</b> no hay comidas anotadas en los últimos 7 días. Eso no son 7 días a 0 kcal: simplemente falta información.</p>
        <p><b>Estimación:</b> ${metas}.</p>
        <p>Registra aunque sea una comida al día en <a href="#nutricion">Nutrición → Diario</a> para poder comparar medias reales.</p>${AVISO_NUTRI}`,
    };
    const m = p7.medias || {};
    const tend = p7.previo && numC(p7.previo.kcal)
      ? ` La semana anterior tuvo una media de ${n0(p7.previo.kcal)} kcal sobre sus días registrados (${Math.round(numC(m.kcal) - numC(p7.previo.kcal)) >= 0 ? '+' : '−'}${n0(Math.abs(Math.round(numC(m.kcal) - numC(p7.previo.kcal))))} kcal).`
      : '';
    const porDia = (p7.porDia || []).map(x => `${String(x.fecha).slice(5)} ${x.kcal == null ? 'sin registro' : `${n0(x.kcal)} kcal`}`).join(' · ');
    return {
      titulo: 'Análisis de tu última semana',
      html: `<p><b>Dato real:</b> ${p7.registrados}/7 días con comidas. Media calculada solo sobre esos días: ${n0(m.kcal)} kcal, ${n0(m.prot)} g proteína, ${n0(m.fibra)} g fibra.${tend}</p>
        <p><b>Kcal reales por día:</b> ${esc(porDia)}. Los días sin registro no cuentan como 0.</p>
        <p><b>Estimación:</b> ${metas}.</p>
        ${numC(m.kcal) && numC(d.metas.kcal) && Math.round(numC(d.metas.kcal) - numC(m.kcal)) >= 120 ? `<p>La media semanal queda ${n0(numC(d.metas.kcal) - numC(m.kcal))} kcal por debajo de la meta estimada. Revisa si faltan comidas por anotar antes de ajustar nada.</p>` : '<p>Con los días registrados no aparece un déficit semanal claro; no invento carencias.</p>'}
        ${AVISO_NUTRI}`,
    };
  }

  if (tipo === 'mes') {
    const actual = p30.medias;
    const anterior = p30.previo;
    if (!p30.registrados || !actual || !anterior || !numC(anterior.kcal)) return {
      titulo: 'Comparación con el mes pasado',
      html: `<p><b>Dato real:</b> tienes ${p30.registrados} días registrados en los últimos 30 y no hay medias fiables de los 30 días anteriores. No puedo decir si mejoras sin ambos periodos; un día sin registro no es consumo cero.</p>
        <p><b>Estimación:</b> ${metas}.</p>
        <p>Sigue anotando comidas y vuelve a preguntarme dentro de unos días.</p>${AVISO_NUTRI}`,
    };
    const dK = Math.round(numC(actual.kcal) - numC(anterior.kcal));
    const dP = Math.round(numC(actual.prot) - numC(anterior.prot));
    const dF = Math.round(numC(actual.fibra) - numC(anterior.fibra));
    const objetivo = String(d.est.metas?.objetivo || '');
    const haciaObjetivo = /perder|recompo/i.test(objetivo) ? dK <= -80
      : /ganar/i.test(objetivo) ? dK >= 80 : Math.abs(dK) <= 80;
    return {
      titulo: '¿Estoy mejorando respecto al mes pasado?',
      html: `<p><b>Dato real (medias sobre días registrados):</b> últimos 30 días ${p30.registrados}/30 · ${n0(actual.kcal)} kcal, ${n0(actual.prot)} g proteína y ${n0(actual.fibra)} g fibra; 30 días anteriores ${n0(anterior.kcal)} kcal, ${n0(anterior.prot)} g proteína y ${n0(anterior.fibra)} g fibra.</p>
        <p><b>Cambio:</b> ${dK >= 0 ? '+' : '−'}${n0(Math.abs(dK))} kcal, ${dP >= 0 ? '+' : '−'}${n0(Math.abs(dP))} g proteína, ${dF >= 0 ? '+' : '−'}${n0(Math.abs(dF))} g fibra de media.${d.real.cambioPeso30 != null ? ` Peso: ${d.real.cambioPeso30 > 0 ? '+' : ''}${d.real.cambioPeso30} kg en 30 días (dato real).` : ''}</p>
        <p><b>Estimación:</b> objetivo ${esc(objetivo || 'sin definir')}, ${metas}. ${haciaObjetivo ? 'La media se mueve en la dirección de ese objetivo estimado.' : 'La media no se mueve claramente en esa dirección; revisa primero los registros.'} No afirmo que hayas alcanzado nada solo con estas medias.</p>${AVISO_NUTRI}`,
    };
  }

  if (tipo === 'cena') {
    if (sinRegistro) {
      const opciones = opcionesNutri(d, NUTRIENTES_COACH[0], { comida: 'cena' });
      return {
        titulo: 'Ideas para cenar',
        html: `<p><b>Dato real:</b> hoy no hay comidas registradas, así que no puedo calcular cuánto te falta para cenar sin inventar datos.</p>
          <p><b>Estimación:</b> ${metas}. Estas cenas salen de tus recetas y de lo que sueles anotar:</p>
          ${opcionesNutriHTML(opciones)}${AVISO_NUTRI}`,
      };
    }
    const principal = huecos.find(x => x.k === 'prot') || huecos[0] || NUTRIENTES_COACH[0];
    const opciones = opcionesNutri(d, principal, { comida: 'cena' });
    const restoProt = Math.round(numC(d.metas.protG) - numC(h.prot));
    return {
      titulo: 'Qué podrías cenar',
      html: `<p><b>Dato real de hoy:</b> ${n0(h.kcal)} kcal y ${h.prot || 0} g de proteína anotados.</p>
        <p><b>Estimación:</b> ${metas}.${huecos.length ? ` Con lo registrado, el hueco principal es ${esc(principal.nombre)} (${n0(principal.falta)} ${principal.uni}).` : ' No veo un hueco claro: una cena ligera es suficiente.'}</p>
        ${opcionesNutriHTML(opciones)}
        <p class="tenue">${restoProt > 0 ? `Si quieres cerrar la proteína del día, busca ~${n0(restoProt)} g más repartidos en la cena.` : 'La proteína registrada ya cubre la referencia estimada.'} Ajusta raciones a tu hambre; no es una receta médica.</p>${AVISO_NUTRI}`,
    };
  }

  if (tipo === 'proteinas') {
    const prot = NUTRIENTES_COACH[0];
    if (sinRegistro) return {
      titulo: 'Tu proteína de hoy',
      html: `<p><b>Dato real:</b> hoy no hay comidas anotadas, así que no puedo afirmar cuánta proteína te falta.</p>
        <p><b>Estimación:</b> ${metas}. Anota lo que comas en <a href="#nutricion">Nutrición → Diario</a> y te lo calculo con datos reales.</p>${AVISO_NUTRI}`,
    };
    const falta = Math.round(numC(d.metas.protG) - numC(h.prot));
    if (falta < prot.umbral) return {
      titulo: 'Tu proteína de hoy',
      html: `<p><b>Dato real:</b> ${n0(h.prot)} g de proteína anotados. <b>Estimación:</b> ${n0(d.metas.protG)} g de meta.</p>
        <p>Con lo registrado no aparece un déficit claro de proteína; no voy a inventar una carencia.</p>${AVISO_NUTRI}`,
    };
    const opciones = opcionesNutri(d, prot);
    return {
      titulo: `Te faltan ${n0(falta)} g de proteína`,
      html: `<p><b>Dato real:</b> ${n0(h.prot)} g anotados de ${n0(d.metas.protG)} g estimados.</p>
        <p><b>Opciones con tus datos</b> (alimentos que sueles registrar y recetas de la app):</p>${opcionesNutriHTML(opciones)}
        <p class="tenue">Reparte el objetivo entre comidas en lugar de concentrarlo todo en una. No es consejo médico.</p>${AVISO_NUTRI}`,
    };
  }

  // Pregunta libre de nutrición: resumen corto con lo que hay y opciones reales.
  const principal = huecos[0];
  return {
    titulo: 'Tu nutrición con datos reales',
    html: `<p><b>Dato real de hoy:</b> ${sinRegistro ? 'sin comidas registradas (no es 0 kcal)' : `${n0(h.kcal)} kcal, ${h.prot || 0} g proteína, ${h.carbs || 0} g hidratos, ${h.grasa || 0} g grasa, ${h.fibra || 0} g fibra`}.</p>
      <p><b>Estimación:</b> ${metas}.</p>
      ${principal ? `<p>El hueco más claro hoy es ${esc(principal.nombre)} (${n0(principal.falta)} ${principal.uni}).</p>${opcionesNutriHTML(opcionesNutri(d, principal))}` : '<p>No veo un déficit claro con lo registrado; no invento carencias.</p>'}
      <p class="tenue">Puedes preguntarme «Analiza mi día de hoy», «Analiza mi última semana», qué te falta, qué cenar o cómo va el mes.</p>${AVISO_NUTRI}`,
  };
}

/**
 * Respuesta del motor local a una pregunta en lenguaje natural.
 * @returns {{titulo:string, html:string, fuente?:string}}
 */
export function responder(pregunta, ctx) {
  const p = String(pregunta || '').toLowerCase();
  const tiene = (...ws) => ws.some(w => p.includes(w));

  // --- Nutrición: se atiende antes que las reglas genéricas de "semana" o
  // "progreso" para que las preguntas del coach nutricional no se desvien.
  const nutriDia = tiene('analiza mi día', 'analiza mi dia', 'mi día de hoy', 'mi dia de hoy', 'qué he comido', 'que he comido', 'comido hoy', 'resumen de hoy', 'cómo voy hoy', 'como voy hoy');
  const nutriSemana = tiene('analiza mi última semana', 'analiza mi ultima semana', 'mi última semana', 'mi ultima semana', 'balance semanal', 'resumen semanal', 'semana de comidas', 'semana nutricional', 'cómo he comido esta semana', 'como he comido esta semana');
  const nutriMes = tiene('mes pasado', 'último mes', 'ultimo mes', '30 días', '30 dias', 'comparación mensual', 'comparacion mensual', 'respecto al mes');
  const nutriCena = tiene('cenar', 'para cenar', 'qué cena', 'que cena', 'comer para completar', 'comida para completar');
  const nutriProt = tiene('proteína', 'proteina', 'proteínas', 'proteinas');
  const nutriLibre = tiene('nutrición', 'nutricion', 'déficit', 'deficit', 'hidratos', 'carbohidratos', 'fibra', 'grasa corporal', 'kcal', 'caloría', 'caloria', 'dieta', 'alimentación', 'alimentacion', 'registro de comidas', 'objetivos nutricionales');
  const nutriPlan = tiene('completar mi plan', 'propuestas para mi plan', 'opciones para mi plan', 'mi plan del', 'plan de comidas');
  if (nutriPlan || nutriDia || nutriSemana || nutriMes || nutriCena || nutriProt || nutriLibre) {
    const tipo = nutriPlan ? 'plan'
      : nutriDia ? 'dia'
      : nutriSemana ? 'semana'
        : nutriMes ? 'mes'
          : nutriCena ? 'cena'
            : nutriProt ? 'proteinas' : 'libre';
    return responderNutricion(pregunta, ctx, tipo);
  }

  // --- Peso / cuánto poner ---
  if (tiene('cuanto peso', 'cuánto peso', 'que peso', 'qué peso', 'carga', 'kg pongo', 'cuanto pongo', 'cuánto pongo', 'cuantas series pongo')) {
    const item = ctx.enCurso?.ejercicios.find(e => e.series.some(r => !r.hecho));
    if (item) {
      const ult = ultimoDe(ctx, item.id);
      const m = ult ? mejorSerie(ult.series) : null;
      const ej = porId[item.id] || {};
      const inc = incremento(ej, ult?.valoracion);
      const base = m?.kg ? m.kg : null;
      return {
        titulo: `Cuánto poner en ${porId[item.id]?.nombre || 'el ejercicio'}`,
        html: `<p>${base ? `La última vez usaste <b>${base} kg</b> y llegaste a <b>${m.reps} reps</b>.` : 'No tengo una referencia tuya todavía para este ejercicio.'}</p>
          <ul class="ciencia-puntos">
            <li>Objetivo de hoy: <b>${item.repsMin}-${item.repsMax} reps</b>.</li>
            ${base ? `<li>Si la última vez completaste el rango con margen: sube <b>${inc} kg</b> (${base + inc} kg).</li>
            <li>Si te costó o la sesión fue dura: repite <b>${base} kg</b> e intenta sumar una repetición.</li>` : '<li>Empieza con un peso que te deje hacer el rango con buena técnica, dejando 2-3 repeticiones en reserva.</li>'}
          </ul>
          <p class="tenue">Regla: <b>RIR 2-3</b> en los compuestos, <b>RIR 1-2</b> en los de aislamiento.</p>`,
      };
    }
    return { titulo: 'Cuánto peso poner', html: '<p>Empieza el primer ejercicio con un peso que te deje 2-3 repeticiones en reserva (RIR 2-3). A partir de ahí, si completas el tope del rango con margen, sube; si no llegas al mínimo, baja un 5 %. La app te sugiere la carga en cada serie.</p>' };
  }

  // --- Técnica dentro del chat ("cómo se hace") ---
  if (tiene('como se hace', 'cómo se hace', 'tecnica', 'técnica', 'postura', 'forma correcta', 'bien hecho')) {
    const item = ctx.enCurso?.ejercicios.find(e => e.series.some(r => !r.hecho))
      || ctx.enCurso?.ejercicios[0]
      || ctx.planSesiones.flatMap(s => s.ejercicios || [])[0];
    const e = item ? (porId[item.id] || {}) : {};
    const nombre = item ? (e.nombre || item.nombre || 'ese ejercicio') : 'ese ejercicio';
    const guia = item && e.desc ? guiaEjercicio(e) : { pasos: [], claves: [], errores: [], resp: '' };
    const pasos = (guia.pasos || []).slice(0, 4);
    const claves = (guia.claves || []).slice(0, 3);
    const errores = (guia.errores || []).slice(0, 3);
    return {
      titulo: `Cómo hacer ${nombre}`,
      html: `<p>La guía completa (dibujo, pasos y vídeo) está en <a href="#ejercicio/${item?.id || ''}">la ficha del ejercicio</a>. Te resumo lo importante:</p>
        ${pasos.length ? `<ol class="ciencia-puntos">${pasos.map(c => `<li>${esc(c)}</li>`).join('')}</ol>` : ''}
        ${claves.length ? `<ul class="ciencia-puntos">${claves.map(c => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
        ${guia.resp ? `<p><b>Respiración:</b> ${esc(guia.resp)}.</p>` : ''}
        ${errores.length ? `<p><b>Errores que conviene evitar:</b> ${errores.map(c => esc(c)).join(' · ')}.</p>` : ''}
        <p class="tenue">Si al hacerlo notas dolor articular, para y consúltalo con un profesional. La técnica va antes que la carga.</p>`,
    };
  }

  // --- Orden ---
  if (tiene('orden', 'por que este orden', 'por qué este orden', 'primero', 'piramide', 'pirámide', 'ascendente')) {
    return {
      titulo: 'Por qué este orden',
      html: `<p>Lo más exigente va primero. Los <b>compuestos</b> (sentadilla, press, remo…) mueven más músculo y peso, así que se hacen cuando el sistema nervioso está fresco: así haces más repeticiones y con mejor técnica.</p>
      <p>Después van los <b>accesorios de aislamiento</b>, luego el <b>core</b> y, si toca, un <b>finalizador metabólico</b>. Los ejercicios que marcas como prioritarios (foco) suben al principio a propósito.</p>
      <p class="tenue">En la <b>pirámide ascendente</b> empiezas ligero y subes: una o dos series de aproximación y series de trabajo cada vez más pesadas con menos repeticiones.</p>
      <p class="tenue">Lo tienes detallado en <a href="#sesion/ciencia">🧠 Entender tu sesión</a>.</p>`,
    };
  }

  // --- Descanso ---
  if (tiene('descanso', 'descansar', 'cuanto espero', 'cuánto espero', 'pausa entre')) {
    const d = ctx.enCurso ? (ctx.enCurso.ejercicios.find(e => e.series.some(r => !r.hecho))?.descanso ?? null) : null;
    return {
      titulo: 'Cuánto descansar',
      html: `<p>El descanso sirve para recargar la fosfocreatina del músculo. Si descansas poco, la siguiente serie baja en repeticiones y peso.</p>
      <ul class="ciencia-puntos">
        <li><b>Fuerza:</b> 2-3 min.</li><li><b>Músculo:</b> 1,5-2 min.</li><li><b>Tonificar/perder grasa:</b> 45-60 s.</li><li><b>Aislamiento:</b> algo menos que los compuestos.</li>
      </ul>
      ${d != null ? `<p>En tu objetivo actual y este ejercicio: <b>${d} s</b>.</p>` : ''}
      <p class="tenue">Puedes ajustarlo por ejercicio desde la pantalla de la sesión.</p>`,
    };
  }

  // --- Series / volumen ---
  if (tiene('cuantas series', 'cuántas series', 'volumen', 'cuanto entrenar', 'cuánto entrenar', 'suficiente')) {
    const vol = ctx.volumenMuscular || {};
    const top = Object.entries(vol).sort((a, b) => b[1] - a[1]).filter(([, v]) => v > 0).slice(0, 4);
    return {
      titulo: 'Cuántas series son suficientes',
      html: `<p>Como referencia, entre <b>10 y 20 series por músculo a la semana</b> suponen buen crecimiento, repartidas en 2 sesiones. El programa apunta a un volumen alto pero recuperable.</p>
      ${top.length ? `<p>Esta semana llevas (series efectivas): ${top.map(([m, v]) => `<b>${MUSCULOS[m]}</b> ${Math.round(v)}`).join(' · ')}.</p>` : ''}
      <p class="tenue">Más no siempre es mejor: si no te recuperas, la calidad baja. Si te sobra energía, añade una serie a un ejercicio prioritario antes que alargar la sesión.</p>`,
    };
  }

  // --- Fallo / RIR ---
  if (tiene('fallo', 'rir', 'hasta el fallo', 'apretar', 'intensidad')) {
    return {
      titulo: '¿Hasta el fallo?',
      html: `<p>No hace falta llegar siempre al fallo. Lo eficaz es <b>quedarte cerca</b>, medido en repeticiones en reserva (RIR).</p>
      <ul class="ciencia-puntos">
        <li><b>Compuestos: RIR 2-3</b> (deja margen para no romper la técnica).</li>
        <li><b>Aislamiento: RIR 1-2</b> en la última serie.</li>
        <li><b>Finalizador / Tabata:</b> al máximo, sin perder la forma.</li>
      </ul>
      <p class="tenue">Ir al fallo estimula de forma parecida, pero añade mucha más fatiga que luego hay que recuperar.</p>`,
    };
  }

  // --- Progreso / estancamiento ---
  if (tiene('progres', 'mejorando', 'evolucion', 'evolución', 'como voy', 'cómo voy', 'avanzando', 'estanc', 'atascado', 'no subo')) {
    const parados = ctx.estancamiento || [];
    return {
      titulo: '¿Estoy progresando?',
      html: `<p>${ctx.sesiones ? `Llevas <b>${ctx.sesiones} sesiones</b> registradas, racha de <b>${ctx.racha} semanas</b> y <b>${n0(ctx.volumenSemana)} kg</b> movidos esta semana.` : 'Todavía no tienes sesiones registradas.'}</p>
      ${ctx.ultima ? `<p>Última sesión: <b>${esc(ctx.ultima.nombre)}</b>${ctx.ultima.valoracion ? ` (${ctx.ultima.valoracion})` : ''}.</p>` : ''}
      ${parados.length ? `<div class="alerta"><b>He detectado un posible estancamiento</b>
        <p>${parados.slice(0, 3).map(e => `<b>${esc(e.nombre)}</b> lleva ${e.porcentaje}% de cambio en sus últimas 3 sesiones${e.volumenCae ? ' y su volumen baja' : ''}`).join('; ')}.</p>
        <p class="tenue">Son tus datos reales. Prueba a subir 1-2 kg o una repetición en esos ejercicios, o revisa descanso y comida antes de añadir volumen.</p></div>` : ''}
      <p class="tenue">La mejor señal de progreso es hacer más repeticiones o mover más peso con la misma técnica. Mira tus récords en <a href="#seguimiento/records">Seguimiento → Récords</a> y tu <a href="#seguimiento/informe">informe semanal</a>.</p>`,
    };
  }

  // --- Recuperación / qué entrenar hoy ---
  if (tiene('recuper', 'cansado', 'descansar hoy', 'que entreno hoy', 'qué entreno hoy', 'agujetas', 'dolor', 'lesion', 'lesión')) {
    if (tiene('dolor', 'lesion', 'lesión')) return {
      titulo: 'Sobre el dolor o una molestia',
      html: `<p>Si notas dolor articular, pinchazos o una molestia que no es simple agujetas, <b>para ese ejercicio</b> y no entrenes a través del dolor.</p>
      <p>DanTal no es un servicio médico. Ante cualquier duda, consulta con un fisio o un profesional sanitario antes de seguir.</p>`,
    };
    return {
      titulo: 'Recuperación',
      html: `<p>${ctx.fatigados.length ? `Aún están cargados: <b>${nombresMus(ctx.fatigados)}</b>.` : 'Tus músculos están recuperados.'}</p>
      <ul class="ciencia-puntos">
        <li>Deja <b>48-72 h</b> antes de volver a trabajar el mismo músculo con intensidad.</li>
        <li>Los días de descanso, la <b>recuperación activa</b> (caminar, moverte suave) ayuda más que el reposo total.</li>
        <li><b>Proteína</b> (~1,6 g/kg al día) y <b>sueño</b> son la base para que el entrenamiento se convierta en músculo.</li>
      </ul>`,
    };
  }

  // --- Nutrición (metas estimadas VS ingesta real) ---
  if (tiene('proteina', 'proteína', 'comer', 'caloria', 'caloría', 'kcal', 'dieta', 'aliment', 'agua', 'hidrat', 'he comido', 'comido hoy', 'que como', 'qué como')) {
    const n = ctx.nutricion || {};
    const c = ctx.consumoHoy || {};
    const faltaKcal = n.kcal && c.kcal ? Math.round(n.kcal - c.kcal) : null;
    const faltaProt = n.protG && c.prot ? Math.round(n.protG - c.prot) : null;
    return {
      titulo: 'Nutrición para tu objetivo',
      html: `${n.kcal ? `<p><b>Objetivo estimado:</b> ${n0(n.kcal)} kcal, ${n.protG} g de proteína, ${n.carbsG} g de hidratos, ${n.grasaG} g de grasa y ${(n.aguaMl / 1000).toFixed(1)} L de agua al día.</p>`
          : `<p>Configura tus objetivos en <a href="#nutricion/objetivos">Nutrición → Objetivos</a> para calcular tus calorías y macros.</p>`}
        <p><b>Dato real de hoy:</b> ${n0(c.kcal || 0)} kcal, ${c.prot || 0} g de proteína, ${c.carbs || 0} g de hidratos, ${c.grasa || 0} g de grasa y ${c.vasos || 0} vasos de agua${c.comidas ? ` (${comidasTxt(c.comidas)})` : ''}.</p>
        ${faltaKcal != null ? `<p class="tenue">${faltaKcal > 0 ? `Te quedan <b>${n0(faltaKcal)} kcal</b> para llegar a tu objetivo estimado.` : `Ya has superado la estimación en <b>${n0(Math.abs(faltaKcal))} kcal</b>. No pasa nada: ajusta mañana, no hoy.`}${faltaProt != null && faltaProt > 0 ? ` Y te faltan <b>${faltaProt} g</b> de proteína.` : ''}</p>` : ''}
        <p class="tenue">Solo cuento lo que has registrado. Si comes algo fuera de la app, anótalo en <a href="#nutricion">Nutrición → Diario</a> para que el dato real sea fiable. No es consejo médico.</p>`,
    };
  }

  // --- Descarga / ciclo ---
  if (tiene('descarga', 'deload', 'ciclo', 'fase', 'semana')) {
    return {
      titulo: 'Tu ciclo',
      html: `<p>Estás en la <b>semana ${ctx.semana}</b> del ciclo de ${SEMANAS_CICLO}, fase de <b>${ctx.fase.nombre}</b>${ctx.fase.descarga ? ' y es semana de <b>descarga</b>' : ''}.</p>
      <p>El ciclo tiene tres fases de 4 semanas (acumulación → intensificación → realización). La cuarta semana de cada fase es más ligera para disipar la fatiga y volver más fuerte.</p>`,
    };
  }

  // --- Cambiar un ejercicio (con alternativas concretas del catálogo) ---
  if (tiene('cambiar', 'sustituir', 'alternativa', 'otro ejercicio', 'no tengo', 'maquina', 'máquina', 'ocupada')) {
    const item = ctx.enCurso?.ejercicios.find(e => e.series.some(r => !r.hecho))
      || ctx.enCurso?.ejercicios[0]
      || ctx.planSesiones.flatMap(s => s.ejercicios || [])[0];
    const actual = item ? (porId[item.id] || {}) : {};
    const opciones = item ? alternativas(item.id, ctx.perfil || {}) : [];
    const nombres = (opciones || []).slice(0, 3).map(a => esc(a.nombre || porId[a.id]?.nombre || a.id));
    return {
      titulo: 'Cambiar un ejercicio',
      html: `<p>${item ? `Para <b>${esc(actual.nombre || item.nombre || 'ese ejercicio')}</b>, mantén el mismo patrón y elige una de estas opciones:` : 'Mantén el mismo patrón (empuje, tirón, sentadilla, bisagra…) para no desequilibrar el programa.'}</p>
      ${nombres.length ? `<ul class="ciencia-puntos">${nombres.map(n => `<li>${n}</li>`).join('')}</ul>` : ''}
      <ul class="ciencia-puntos">
        <li>Desde la sesión, pulsa <b>⇄</b> en el ejercicio para ver y aplicar las alternativas.</li>
        <li>Si una máquina está ocupada, pulsa <b>▶</b> para hacer otro ejercicio antes.</li>
      </ul>
      <p class="tenue">Las alternativas se filtran por el material que marcaste en tu perfil.</p>`,
    };
  }

  // --- Adherencia / tiempo ---
  if (tiene('tiempo', 'no tengo tiempo', 'acortar', 'duracion', 'duración', 'cuanto dura', 'cuánto dura')) {
    return {
      titulo: 'Si vas justo de tiempo',
      html: `<p>Tus sesiones están pensadas para ~${ctx.perfil.duracion || 60} min. Si un día vas justo:</p>
      <ul class="ciencia-puntos">
        <li>Quita primero el <b>finalizador metabólico</b> y los accesorios, nunca los compuestos.</li>
        <li>Mantén el <b>calentamiento</b> (5 min): te protege y mejora el rendimiento.</li>
        <li>Puedes usar el botón <b>Acortar</b> en la tarjeta de la sesión.</li>
      </ul>`,
    };
  }

  // --- Resumen por defecto ---
  return {
    titulo: '¿En qué te ayudo?',
    html: `<p>Puedo explicarte el <b>cuánto y el porqué</b> de tu programa y adaptarlo a cómo vas. Prueba a preguntarme:</p>
    <ul class="ciencia-puntos">
      <li>«¿Cuánto peso pongo?»</li>
      <li>«¿Por qué este orden de ejercicios?»</li>
      <li>«¿Cuánto debo descansar?»</li>
      <li>«¿Estoy progresando?»</li>
    </ul>
    <p class="tenue">Resumen de hoy: ${ctx.sesiones ? `${ctx.sesiones} sesiones, racha de ${ctx.racha} semanas` : 'aún sin sesiones'}, semana ${ctx.semana} (${ctx.fase.nombre})${ctx.proxima ? `, próxima sesión «${esc(ctx.planSesiones[ctx.proxima.sesion]?.nombre || '')}»` : ''}.</p>`,
  };
}
