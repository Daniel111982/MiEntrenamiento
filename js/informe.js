// Informe semanal y exportación en texto. Solo lee el estado: sin DOM, localStorage ni red.
import { volumenSesion, racha, mejorSerie } from './stats.js';
import { unoRM, lunes, sumarDias, hoyIso } from './generador.js';

const array = v => (Array.isArray(v) ? v : []);
const numero = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const redondea = (n, d = 1) => { const f = 10 ** d; return Math.round(numero(n) * f) / f; };
const ultimo = lista => (lista && lista.length ? lista[lista.length - 1] : null);

// Fecha local en YYYY-MM-DD (misma convención que el generador).
function aIso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function diaDe(v) {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? '' : aIso(v);
  const s = typeof v === 'string' ? v : '';
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : '';
}
const enRango = (v, desde, hasta) => { const d = diaDe(v); return Boolean(d && d >= desde && d <= hasta); };
const marca = s => { const [a, m, d] = s.split('-').map(Number); return Date.UTC(a, m - 1, d); };
const diasEntre = (a, b) => Math.max(1, Math.round((marca(b) - marca(a)) / 864e5) + 1);

const f0 = n => String(Math.round(numero(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const f1 = n => {
  const v = numero(n), r = Math.round(Math.abs(v) * 10);
  return (v < 0 ? '-' : '') + Math.floor(r / 10) + ',' + (r % 10);
};
const conSigno = n => (numero(n) > 0 ? '+' : '') + f1(n);
const porcentaje = n => `${f0(Math.round(Math.abs(numero(n)) * 100))} %`;

// La app guarda la duración en segundos; los valores pequeños ya vienen en minutos.
const minutosDe = v => { const d = numero(v); return d > 1440 ? Math.round(d / 60) : Math.round(d); };

// Las series marcadas como no hechas no cuentan como trabajo realizado.
function seriesHechas(ejercicios) {
  return array(ejercicios).map(e => ({
    id: e?.id || '',
    nombre: e?.nombre || e?.id || 'Ejercicio',
    series: array(e?.series).filter(s => s && s.hecho !== false),
  }));
}

// Métricas de un rango y mejor serie (1RM) de cada ejercicio.
function resumenSesiones(lista) {
  const cargas = new Map();
  const duros = [];
  let series = 0, volumen = 0, minutos = 0;
  for (const h of lista) {
    const ejercicios = seriesHechas(h?.ejercicios);
    series += ejercicios.reduce((t, e) => t + e.series.length, 0);
    volumen += volumenSesion({ ejercicios });
    minutos += minutosDe(h?.duracion);
    if (h?.valoracion === 'duro') {
      duros.push({ fecha: diaDe(h.fecha), nombres: ejercicios.filter(e => e.series.length).map(e => e.nombre) });
    }
    for (const e of ejercicios) {
      if (!e.series.length) continue;
      const m = mejorSerie(e.series);
      if (!m) continue;
      const registro = {
        fecha: diaDe(h.fecha), id: e.id, nombre: e.nombre,
        val: numero(m.val), kg: numero(m.kg), reps: numero(m.reps),
        rm: numero(m.rm) || unoRM(numero(m.kg), numero(m.reps)),
      };
      const delEjercicio = cargas.get(e.id) || [];
      delEjercicio.push(registro);
      cargas.set(e.id, delEjercicio);
    }
  }
  return { sesiones: lista.length, series, volumen, minutos, cargas, duros };
}

function pesosEn(medidas, desde, hasta) {
  const lista = array(medidas)
    .filter(m => m && enRango(m.fecha, desde, hasta) && numero(m.peso) > 0)
    .sort((a, b) => diaDe(a.fecha).localeCompare(diaDe(b.fecha)));
  return {
    n: lista.length,
    inicial: lista.length ? numero(lista[0].peso) : 0,
    final: lista.length ? numero(lista[lista.length - 1].peso) : 0,
  };
}

function agendaEn(agenda, desde, hasta) {
  const items = array(agenda).filter(a => a && enRango(a.fecha, desde, hasta));
  return {
    planificadas: items.length,
    pendientes: items.filter(a => a.estado === 'pendiente').length,
    perdidas: items.filter(a => a.estado === 'perdida').length,
    hechas: items.filter(a => a.estado === 'hecha').length,
  };
}

function adherencia(ag, sesiones) {
  if (!ag.planificadas) return { pct: 0, hechas: 0 };
  const hechas = Math.max(ag.hechas, Math.min(sesiones, ag.planificadas));
  return { pct: Math.round(hechas / ag.planificadas * 100), hechas };
}

// Con >=3 registros, una subida menor al 2 % se considera estancamiento.
function estancamientos(actual, anterior) {
  const out = [];
  for (const [id, regsActuales] of actual.cargas) {
    const regs = [...array(anterior.cargas.get(id)), ...regsActuales]
      .sort((a, b) => a.fecha.localeCompare(b.fecha));
    if (regs.length < 3) continue;
    const primero = regs[0].val, ultimoReg = ultimo(regs).val;
    if (primero <= 0 || (ultimoReg - primero) / primero >= 0.02) continue;
    out.push({ id, nombre: ultimo(regs).nombre, n: regs.length, val: ultimoReg });
  }
  return out;
}

function bajadasCarga(actual, anterior) {
  const out = [];
  for (const [id, regs] of actual.cargas) {
    const antes = ultimo(anterior.cargas.get(id));
    const ahora = ultimo(regs);
    if (!antes || !ahora || antes.val <= 0) continue;
    if ((ahora.val - antes.val) / antes.val <= -0.05) {
      out.push({ id, nombre: ahora.nombre, antes: antes.val, ahora: ahora.val });
    }
  }
  return out.slice(0, 2);
}

function metaVasos(estado) {
  const n = (estado.nutricion && typeof estado.nutricion === 'object') ? estado.nutricion : {};
  const ml = numero(n.aguaMl) || (numero(n.peso) ? Math.round((numero(n.peso) * 0.035 + 0.5) * 1000) : 0);
  return ml ? Math.max(1, Math.round(ml / 250)) : 8; // 8 vasos (~2 L) si no hay datos
}

export function informeSemanal(estado, { fecha = new Date(), semanas = 1 } = {}) {
  const e = estado && typeof estado === 'object' ? estado : {};
  const hasta = fecha instanceof Date && !Number.isNaN(fecha.getTime()) ? aIso(fecha) : hoyIso();
  const nSemanas = Math.max(1, Math.round(numero(semanas) || 1));
  const desde = sumarDias(lunes(hasta), -(nSemanas - 1) * 7);
  const dias = diasEntre(desde, hasta);
  const desdePrev = sumarDias(desde, -dias);
  const hastaPrev = sumarDias(desde, -1);

  const historial = array(e.historial).filter(h => h && diaDe(h.fecha));
  const ordena = (a, b) => diaDe(a.fecha).localeCompare(diaDe(b.fecha));
  const actuales = historial.filter(h => enRango(h.fecha, desde, hasta)).sort(ordena);
  const anteriores = historial.filter(h => enRango(h.fecha, desdePrev, hastaPrev)).sort(ordena);
  const actual = resumenSesiones(actuales);
  const anterior = resumenSesiones(anteriores);

  const agenda = array(e.plan?.agenda);
  const ag = agendaEn(agenda, desde, hasta);
  const agPrev = agendaEn(agenda, desdePrev, hastaPrev);
  const adhesion = adherencia(ag, actual.sesiones);
  const adhesionPrev = adherencia(agPrev, anterior.sesiones);

  const medidas = array(e.medidas);
  const peso = pesosEn(medidas, desde, hasta);
  const pesoPrevio = pesosEn(medidas, desdePrev, hastaPrev);
  const cambioPeso = peso.final && pesoPrevio.final ? redondea(peso.final - pesoPrevio.final) : null;
  const objetivo = e.perfil?.objetivo || e.nutricion?.objetivo || '';

  const agua = (e.agua && typeof e.agua === 'object') ? e.agua : {};
  const vasos = [];
  for (let i = 0, d = desde; i < dias; i++, d = sumarDias(d, 1)) {
    if (Object.prototype.hasOwnProperty.call(agua, d)) vasos.push(numero(agua[d]));
  }
  const vasosPromedio = vasos.length ? redondea(vasos.reduce((t, v) => t + v, 0) / vasos.length) : 0;
  const meta = metaVasos(e);

  const comidas = (e.comidas && typeof e.comidas === 'object') ? e.comidas : {};
  let diasConComidas = 0;
  for (let i = 0, d = desde; i < dias; i++, d = sumarDias(d, 1)) {
    const dia = comidas[d];
    if (dia && typeof dia === 'object' && Object.values(dia).some(v => Array.isArray(v) && v.length > 0)) diasConComidas++;
  }

  const numeros = {
    sesiones: actual.sesiones,
    planificadas: ag.planificadas,
    series: actual.series,
    volumen: actual.volumen,
    minutos: actual.minutos,
    racha: actual.sesiones ? racha(historial.filter(h => diaDe(h.fecha) <= hasta)) : 0,
    pesoInicial: peso.inicial,
    pesoFinal: peso.final,
    deltaPeso: peso.n >= 2 ? redondea(peso.final - peso.inicial) : 0,
    vasosPromedio,
    diasConComidas,
    recordatorios: ag.pendientes, // sesiones del periodo que aún quedan por avisar
  };

  // ---- Comparación con el periodo anterior ----
  const hayPrevio = anterior.sesiones > 0 || pesoPrevio.n > 0 || agPrev.planificadas > 0;
  const cambioVolumen = anterior.volumen > 0 ? redondea((actual.volumen - anterior.volumen) / anterior.volumen, 3) : null;
  const estancados = estancamientos(actual, anterior);
  const bajadas = hayPrevio ? bajadasCarga(actual, anterior) : [];
  const bajaHidratacion = (vasos.length >= 3 && vasosPromedio > 0 && vasosPromedio < meta * 0.75)
    || (vasos.length === 0 && actual.sesiones > 0);

  const avances = [];
  if (!hayPrevio) avances.push({ icono: 'ℹ️', texto: 'Aún no hay datos de la semana anterior' });
  if (cambioVolumen !== null && cambioVolumen > 0.01) {
    avances.push({ icono: '📈', texto: `Volumen de ${f0(actual.volumen)} kg, un ${porcentaje(cambioVolumen)} más que la semana anterior.` });
  } else if (cambioVolumen !== null && Math.abs(cambioVolumen) <= 0.01 && actual.volumen > 0) {
    avances.push({ icono: '➡️', texto: `Volumen mantenido en ${f0(actual.volumen)} kg respecto a la semana anterior.` });
  }
  if (hayPrevio && actual.sesiones > anterior.sesiones) {
    avances.push({ icono: '🏋️', texto: `Entrenaste ${actual.sesiones} ${actual.sesiones === 1 ? 'sesión' : 'sesiones'}, ${actual.sesiones - anterior.sesiones} más que la semana anterior.` });
  }

  const subidas = [];
  for (const [id, regs] of actual.cargas) {
    const antes = ultimo(anterior.cargas.get(id));
    const ahora = ultimo(regs);
    if (!antes || !ahora || antes.val <= 0 || ahora.val <= antes.val) continue;
    subidas.push({ id, nombre: ahora.nombre, antes: antes.val, ahora: ahora.val, rm: ahora.rm });
  }
  subidas.sort((a, b) => (b.ahora - b.antes) / b.antes - (a.ahora - a.antes) / a.antes);
  for (const s of subidas.slice(0, 2)) {
    const rm = s.rm ? ` (1RM estimado ${f0(s.rm)} kg)` : '';
    avances.push({ icono: '🏆', texto: `Mejor serie en ${s.nombre}: ${f1(s.antes)} → ${f1(s.ahora)}${rm}.` });
  }

  const sube = ['ganar_musculo', 'ganar_fuerza', 'recomposicion'].includes(objetivo);
  if (cambioPeso !== null && ((sube && cambioPeso > 0) || (objetivo === 'perder_grasa' && cambioPeso < 0))) {
    avances.push({ icono: '⚖️', texto: `Peso: ${f1(peso.final)} kg (${conSigno(cambioPeso)} kg respecto a la semana anterior).` });
  }
  if (ag.planificadas >= 3 && adhesion.pct >= 80) {
    avances.push({ icono: '🎯', texto: `Cumpliste ${adhesion.hechas} de ${ag.planificadas} sesiones previstas (${adhesion.pct} %).` });
  }
  if (numeros.racha >= 2) {
    avances.push({ icono: '🔥', texto: `Llevas ${numeros.racha} semanas seguidas entrenando.` });
  }

  // ---- Dificultades detectadas ----
  const dificultades = [];
  if (ag.perdidas > 0) {
    dificultades.push({ icono: '📅', texto: `${ag.perdidas} ${ag.perdidas === 1 ? 'sesión perdida' : 'sesiones perdidas'} en la agenda de esta semana.` });
  }
  if (actual.duros.length >= 2) {
    dificultades.push({ icono: '😮‍💨', texto: `${actual.duros.length} sesiones te resultaron duras: la fatiga puede estar acumulándose.` });
  }
  if (cambioVolumen !== null && cambioVolumen <= -0.10) {
    dificultades.push({ icono: '📉', texto: `El volumen bajó un ${porcentaje(cambioVolumen)} frente a la semana anterior (${f0(anterior.volumen)} → ${f0(actual.volumen)} kg).` });
  }
  for (const s of estancados) {
    dificultades.push({ icono: '🐌', texto: `Carga estancada en ${s.nombre}: ${s.n} registros sin subir de forma clara.` });
  }
  for (const s of bajadas) {
    dificultades.push({ icono: '⬇️', texto: `Carga más baja en ${s.nombre}: ${f1(s.antes)} → ${f1(s.ahora)} frente a la semana anterior.` });
  }
  if (!peso.n) {
    dificultades.push({ icono: '⚖️', texto: 'No registraste tu peso esta semana; así cuesta ver el cambio real.' });
  }
  if (bajaHidratacion) {
    dificultades.push({
      icono: '💧',
      texto: vasos.length
        ? `Media de ${f1(vasosPromedio)} vasos al día, por debajo de los ${meta} orientativos.`
        : 'No hay agua registrada en los días con entrenamiento.',
    });
  }
  if (agPrev.planificadas >= 3 && ag.planificadas >= 3 && adhesionPrev.pct - adhesion.pct >= 15) {
    dificultades.push({ icono: '🗓️', texto: `La adherencia bajó del ${adhesionPrev.pct} % al ${adhesion.pct} % respecto a la semana anterior.` });
  }

  // ---- Recomendaciones accionables (máximo 5) ----
  const recomendaciones = [];
  if (estancados.length) {
    const n = estancados[0].nombre;
    recomendaciones.push({ icono: '🏋️', texto: `En ${n}, sube 1-2 kg o una repetición por serie en la próxima sesión; si sales bien, mantén la subida.` });
  } else if (cambioVolumen !== null && cambioVolumen <= -0.10 && actual.sesiones > 0) {
    recomendaciones.push({ icono: '📈', texto: 'Recupera el volumen poco a poco: añade una serie por ejercicio antes de volver a subir cargas.' });
  } else if (hayPrevio && actual.sesiones > 0) {
    recomendaciones.push({ icono: '💪', texto: 'Mantén la carga actual: si completas todas las repeticiones con buena técnica, sube un poco la próxima semana.' });
  }

  if (actual.duros.length >= 2) {
    const nombres = [...new Set(actual.duros.flatMap(d => array(d.nombres)))].slice(0, 2);
    const foco = nombres.length ? ` de ${nombres.join(' y ')}` : '';
    recomendaciones.push({ icono: '🌙', texto: `Deja 48 h de descanso a los músculos${foco} y baja una serie esta semana si aún notas el entrenamiento duro.` });
    recomendaciones.push({ icono: '😴', texto: 'Revisa el descanso: duerme 7-9 h y, si sigues con esa sensación, baja la carga alrededor de un 10 %.' });
  }

  if (peso.final && cambioPeso !== null) {
    if ((sube || objetivo === 'recomposicion') && cambioPeso <= 0) {
      recomendaciones.push({ icono: '🍽️', texto: 'El peso no sube: añade 150-200 kcal al día durante dos semanas y vuelve a medir antes de ajustar.' });
    } else if (objetivo === 'perder_grasa' && cambioPeso >= 0) {
      recomendaciones.push({ icono: '🥗', texto: 'El peso no baja: ajusta 100-200 kcal diarias y mantén la proteína, sin recortes bruscos.' });
    }
  }
  if (bajaHidratacion) {
    recomendaciones.push({ icono: '💧', texto: `Bebe unos ${meta} vasos al día (≈${f1(meta * 0.25)} L) y reparte la ingesta entre comidas.` });
  }
  if (ag.planificadas > 0 && adhesion.pct < 80) {
    recomendaciones.push({ icono: '🗓️', texto: 'Elige días fijos y una hora concreta: cumplir tres sesiones planeadas es más fácil que improvisar.' });
  }
  if (!peso.n) {
    recomendaciones.push({ icono: '⚖️', texto: 'Pésate 2-3 mañanas por semana, en las mismas condiciones, para ver la tendencia.' });
  }
  if (!recomendaciones.length) {
    recomendaciones.push({
      icono: '✅',
      texto: actual.sesiones
        ? 'Buena semana: mantén el plan y anota cargas y sensaciones para ajustar la próxima.'
        : 'Registra una sesión y tu peso: con esos datos podré comparar la próxima semana.',
    });
  }

  return {
    periodo: { desde, hasta },
    numeros,
    avances,
    dificultades,
    recomendaciones: recomendaciones.slice(0, 5),
  };
}

// Texto plano, listo para copiar o exportar.
export function textoInforme(informe) {
  const i = informe && typeof informe === 'object' ? informe : {};
  const p = i.periodo || {}, n = i.numeros || {};
  const lineas = [
    'Informe semanal',
    `Del ${p.desde || '—'} al ${p.hasta || '—'}`,
    '',
    `Sesiones: ${f0(n.sesiones)} de ${f0(n.planificadas)} planificadas`,
    `Series: ${f0(n.series)} · Volumen: ${f0(n.volumen)} kg · Tiempo: ${f0(n.minutos)} min`,
    `Racha: ${f0(n.racha)} ${numero(n.racha) === 1 ? 'semana' : 'semanas'}`,
  ];
  if (numero(n.pesoFinal)) {
    lineas.push(`Peso: ${f1(n.pesoInicial)} → ${f1(n.pesoFinal)} kg (${conSigno(n.deltaPeso)} kg)`);
  }
  lineas.push(`Agua: ${f1(n.vasosPromedio)} vasos/día · Comidas: ${f0(n.diasConComidas)} días · Avisos pendientes: ${f0(n.recordatorios)}`);

  const bloque = (titulo, items) => {
    const lista = array(items);
    if (!lista.length) return;
    lineas.push('', titulo);
    for (const item of lista) lineas.push(`${item?.icono || '•'} ${item?.texto || ''}`.trim());
  };
  bloque('Avances', i.avances);
  bloque('Dificultades', i.dificultades);
  bloque('Recomendaciones', i.recomendaciones);

  return lineas.join('\n');
}
