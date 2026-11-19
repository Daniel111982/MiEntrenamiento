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
  l.push(`Consumo REAL registrado hoy: ${n0(c.kcal)} kcal, ${c.prot || 0} g proteína, ${c.carbs || 0} g hidratos, ${c.grasa || 0} g grasa, ${c.vasos || 0} vasos de agua (${comidasTxt(c.comidas)}). Si faltan datos, no los inventes.`);
  if (ctx.estancamiento?.length) {
    l.push(`Posible estancamiento (datos reales): ${ctx.estancamiento.slice(0, 4).map(e => `${e.nombre} ${e.porcentaje}% en las últimas 3 sesiones${e.volumenCae ? ' y con volumen a la baja' : ''}`).join('; ')}.`);
  }
  if (ctx.planSesiones.length) l.push(`Sesiones del plan: ${ctx.planSesiones.map(s => s.nombre).join(', ')}.`);
  return l.join('\n');
}

// Resumen muy corto para la IA integrada del navegador. Su ventana de
// contexto es pequeña: si le pasamos el resumen completo responde
// "The input is too large" y el chat cae al motor local sin avisar.
export function resumenCortoParaIA(ctx) {
  const p = ctx.perfil || {};
  const c = ctx.consumoHoy || {};
  const l = [
    `Objetivo: ${ctx.objetivo?.nombre || '—'}. Nivel: ${p.nivel || '—'}. Semana ${ctx.semana} (${ctx.fase?.nombre || '—'}).`,
    `Sesiones: ${ctx.sesiones}. Racha: ${ctx.racha}. Adherencia: ${ctx.adherencia?.pct ?? 0}%. Volumen semana: ${n0(ctx.volumenSemana)} kg.`,
  ];
  if (ctx.ultima) l.push(`Última sesión: ${ctx.ultima.nombre} (${ctx.ultima.valoracion || 'sin valorar'}).`);
  if (ctx.proxima) l.push(`Próxima: ${ctx.planSesiones[ctx.proxima.sesion]?.nombre || '—'} el ${ctx.proxima.fecha}.`);
  if (ctx.fatigados.length) l.push(`Cargados: ${nombresMus(ctx.fatigados)}.`);
  if (ctx.nutricion?.kcal) l.push(`Metas: ${n0(ctx.nutricion.kcal)} kcal, ${ctx.nutricion.protG} g proteína.`);
  l.push(`Hoy registrado: ${n0(c.kcal)} kcal, ${c.prot || 0} g proteína, ${c.vasos || 0} vasos.`);
  if (ctx.estancamiento?.length) l.push(`Estancamiento: ${ctx.estancamiento.slice(0, 2).map(e => e.nombre).join(', ')}.`);
  return l.join('\n').slice(0, 700);
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

/**
 * Respuesta del motor local a una pregunta en lenguaje natural.
 * @returns {{titulo:string, html:string, fuente?:string}}
 */
export function responder(pregunta, ctx) {
  const p = String(pregunta || '').toLowerCase();
  const tiene = (...ws) => ws.some(w => p.includes(w));

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
