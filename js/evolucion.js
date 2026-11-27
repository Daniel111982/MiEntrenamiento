// FASE 9 · PARTE 3 — lógica pura de seguimiento corporal.
// No lee localStorage ni estado global: trabaja sobre el array estado.medidas
// que ya usa DanTal. La PARTE 4 podrá importar resumenEvolucion() sin crear
// un modelo de datos paralelo ni repetir cálculos en la interfaz.
import { hoyIso, iso, deIso, lunes, sumarDias } from './generador.js';

const texto = s => String(s ?? '').trim();
const diaDe = f => texto(f).slice(0, 10);
const redondea = (n, decimales = 2) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  const factor = 10 ** decimales;
  return Math.round(v * factor) / factor;
};
const diasEntre = (desde, hasta) => Math.round((deIso(hasta).getTime() - deIso(desde).getTime()) / 86400000);
const porFecha = (a, b) => diaDe(a.fecha).localeCompare(diaDe(b.fecha));

// Fecha ISO real, never futura. Rechaza 2026-02-30 aunque tenga forma correcta.
export function fechaValida(f, hoy = hoyIso()) {
  const s = diaDe(f);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return false;
  return s <= diaDe(hoy);
}

// La hora es opcional: ausencia no es medianoche ni dato desconocido numérico.
export function horaValida(h) {
  const s = texto(h);
  return s === '' || /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(s);
}
export function horaNormalizada(h) {
  return horaValida(h) ? texto(h).slice(0, 5) : '';
}

export function hayDuplicado(registros, fecha) {
  const f = diaDe(fecha);
  return (Array.isArray(registros) ? registros : []).find(r => r && diaDe(r.fecha) === f) || null;
}

// Valida un registro antes de tocar la persistencia. Los valores fuera de rango
// son ADVERTENCIAS (se pueden guardar marked como anómalos), nunca borrados
// automáticamente. Los vacíos se convierten en null, jamás en cero.
export function validarMedicion(registro = {}, { campos = {}, hoy = hoyIso(), registros = null } = {}) {
  const errores = [];
  const advertencias = [];
  const fecha = diaDe(registro.fecha);
  const hora = texto(registro.hora);
  const datos = { fecha, hora: horaNormalizada(hora) || null, nota: texto(registro.nota).slice(0, 90) };

  if (!fechaValida(fecha, hoy)) errores.push({ campo: 'fecha', mensaje: 'Elige una fecha válida que no sea futura.' });
  if (hora && !horaValida(hora)) errores.push({ campo: 'hora', mensaje: 'La hora debe estar entre 00:00 y 23:59.' });

  const valores = {};
  const origen = {};
  for (const [campo, def] of Object.entries(campos || {})) {
    const raw = registro[campo];
    if (raw == null || texto(raw) === '') {
      valores[campo] = null;
      origen[campo] = 'desconocido';
      continue;
    }
    const v = Number(raw);
    if (!Number.isFinite(v)) {
      errores.push({ campo, mensaje: `${def.nombre || campo}: escribe un número válido.` });
      valores[campo] = null;
      origen[campo] = 'desconocido';
      continue;
    }
    if (v <= 0) {
      errores.push({ campo, mensaje: `${def.nombre || campo}: el valor debe ser mayor que cero. Deja el campo vacío si no lo has medido.` });
      valores[campo] = null;
      origen[campo] = 'desconocido';
      continue;
    }
    const min = Number.isFinite(Number(def.min)) ? Number(def.min) : 0;
    const max = Number.isFinite(Number(def.max)) ? Number(def.max) : Infinity;
    if (v < min || v > max) {
      advertencias.push({
        campo,
        mensaje: `${def.nombre || campo}: ${redondea(v, 1)} ${def.unidad || ''} está fuera de lo habitual (${min}–${max}). Revisa la unidad o el valor antes de guardarlo.`,
        valor: v,
      });
    }
    valores[campo] = redondea(v, 1);
    origen[campo] = ['medido', 'estimado'].includes(texto(registro.origen?.[campo])) ? texto(registro.origen[campo]) : 'medido';
  }
  if (!Object.values(valores).some(v => v != null)) {
    errores.push({ campo: 'datos', mensaje: 'Anota al menos un dato para guardar la medición.' });
  }
  if (hayDuplicado(registros, fecha)) {
    advertencias.push({ campo: 'fecha', mensaje: 'Ya existe un registro en esa fecha; solo se actualizarán los campos rellenados.', duplicado: true });
  }
  return { valido: errores.length === 0, errores, advertencias, datos: { ...datos, ...valores }, valores, origen };
}

// Copia ordenada de los registros con fecha utilizable. No muta el original y
// no elimina nada del almacenamiento: solo prepara lo que se puede graficar.
export function normalizarRegistros(registros = [], { hoy = hoyIso() } = {}) {
  return (Array.isArray(registros) ? registros : [])
    .filter(r => r && typeof r === 'object' && fechaValida(r.fecha, hoy))
    .map(r => ({ ...r, fecha: diaDe(r.fecha) }))
    .sort(porFecha);
}

// Puntos medidos de un campo. null y datos marcados como anómalos se omiten
// por defecto: jamás se rellena un hueco con cero ni con un valor inventado.
export function serie(registros = [], campo = 'peso', { desde = null, hasta = null, incluirAnomalias = false, incluirEstimados = true } = {}) {
  return normalizarRegistros(registros)
    .filter(m => (!desde || diaDe(m.fecha) >= diaDe(desde)) && (!hasta || diaDe(m.fecha) <= diaDe(hasta)))
    .filter(m => m[campo] != null && m[campo] !== '' && Number.isFinite(Number(m[campo])) && Number(m[campo]) > 0)
    .filter(m => incluirAnomalias || !(Array.isArray(m.anomalias) && m.anomalias.includes(campo)))
    .map(m => {
      const origen = ['medido', 'estimado'].includes(texto(m.origen?.[campo])) ? texto(m.origen[campo]) : 'medido';
      return { fecha: diaDe(m.fecha), v: redondea(m[campo], 2), origen };
    })
    .filter(p => incluirEstimados || p.origen !== 'estimado');
}

// Marca dónde debe cortarse la línea: entre dos puntos separados por más de
// maxDias no hay datos, así que el gráfico no debe unirlos.
export function conHuecos(puntos = [], { periodo = 'todo', maxDias = null } = {}) {
  const lista = puntos.slice().sort(porFecha);
  const limite = maxDias == null ? (periodo === 'semanal' ? 10 : periodo === 'mensual' ? 40 : 31) : maxDias;
  return lista.map((p, i) => {
    const salto = i ? diasEntre(lista[i - 1].fecha, p.fecha) : 0;
    return { ...p, salto, hueco: i > 0 && salto > limite };
  });
}

// Media de cada semana (lunes) o mes natural. Solo agrupa datos existentes:
// los periodos sin registros no aparecen y por tanto no se inventa su media.
export function mediasPorPeriodo(puntos = [], periodo = 'todo', { minRegistros = 1 } = {}) {
  const lista = puntos.slice().sort(porFecha);
  if (periodo !== 'semanal' && periodo !== 'mensual') {
    return lista.filter(p => Number.isFinite(Number(p.v))).map(p => ({ ...p, n: 1 }));
  }
  const grupos = new Map();
  for (const p of lista) {
    if (!Number.isFinite(Number(p.v))) continue;
    const d = deIso(diaDe(p.fecha));
    const fecha = periodo === 'semanal' ? lunes(diaDe(p.fecha)) : iso(new Date(d.getFullYear(), d.getMonth(), 1));
    if (!grupos.has(fecha)) grupos.set(fecha, []);
    grupos.get(fecha).push(Number(p.v));
  }
  return [...grupos]
    .filter(([, vals]) => vals.length >= minRegistros)
    .map(([fecha, vals]) => ({
      fecha,
      v: redondea(vals.reduce((a, b) => a + b, 0) / vals.length),
      n: vals.length,
    }));
}

// Dirección de las últimas semanas naturales con datos reales. Las semanas
// sin medición se omiten; la pendiente usa días reales entre puntos.
export function tendencia(registros = [], campo = 'peso', { hoy = hoyIso(), semanas = 4 } = {}) {
  const n = Math.max(2, Math.round(Number(semanas) || 4));
  const puntos = serie(registros, campo);
  const semanasConDato = mediasPorPeriodo(puntos, 'semanal');
  const inicio = sumarDias(lunes(diaDe(hoy)), -(n - 1) * 7);
  const filas = semanasConDato.filter(s => s.fecha >= inicio && s.fecha <= lunes(diaDe(hoy)));
  if (filas.length < 2) {
    return {
      disponible: false,
      motivo: filas.length ? 'solo una semana con registros' : 'menos de dos semanas con registros',
      semanas: filas, primera: null, ultima: null, delta: null, porSemana: null, direccion: 'desconocida',
    };
  }
  const primera = filas[0].v;
  const ultima = filas[filas.length - 1].v;
  const semanasReales = diasEntre(filas[0].fecha, filas[filas.length - 1].fecha) / 7;
  const porSemana = semanasReales > 0 ? redondea((ultima - primera) / semanasReales) : 0;
  return {
    disponible: true,
    motivo: '',
    semanas: filas,
    primera,
    ultima,
    delta: redondea(ultima - primera),
    porSemana,
    direccion: Math.abs(porSemana) < 0.05 ? 'estable' : porSemana > 0 ? 'subiendo' : 'bajando',
  };
}

// Comparación de dos rangos del mismo tamaño. Sin datos se devuelve null,
// nunca cero: desconocido y cero no son lo mismo.
export function compararPeriodos(registros = [], campo = 'peso', rangos = {}) {
  const resumen = (desde, hasta) => {
    const puntos = serie(registros, campo, { desde, hasta });
    if (!puntos.length) return { n: 0, inicial: null, final: null, media: null };
    return {
      n: puntos.length,
      inicial: puntos[0].v,
      final: puntos[puntos.length - 1].v,
      media: redondea(puntos.reduce((t, p) => t + p.v, 0) / puntos.length),
    };
  };
  const actual = resumen(rangos.desde, rangos.hasta);
  const anterior = resumen(rangos.anteriorDesde, rangos.anteriorHasta);
  const suficiente = actual.n >= 2 && anterior.n >= 2;
  return {
    campo,
    actual,
    anterior,
    deltaFinal: actual.final != null && anterior.final != null ? redondea(actual.final - anterior.final) : null,
    deltaMedia: actual.media != null && anterior.media != null ? redondea(actual.media - anterior.media) : null,
    suficiente,
    motivo: suficiente ? '' : 'se necesitan al menos dos registros en cada periodo para comparar',
  };
}

// Último valor de cada campo con el punto anterior y su cambio, para la PARTE 4.
export function ultimasMedidas(registros = [], { campos = [] } = {}) {
  const salida = {};
  for (const campo of campos) {
    const puntos = serie(registros, campo);
    if (!puntos.length) continue;
    const ultimo = puntos[puntos.length - 1];
    const anterior = puntos.length > 1 ? puntos[puntos.length - 2] : null;
    salida[campo] = {
      ...ultimo,
      anterior: anterior ? { fecha: anterior.fecha, v: anterior.v } : null,
      cambio: anterior ? redondea(ultimo.v - anterior.v) : null,
    };
  }
  return salida;
}

// Superficie única para la PARTE 4: último peso, evolución, media semanal,
// tendencia de varias semanas, cambios entre periodos y últimas medidas.
export function resumenEvolucion(entrada = [], { hoy = hoyIso(), campos = [], semanas = 4 } = {}) {
  const lista = normalizarRegistros(Array.isArray(entrada) ? entrada : entrada?.medidas || [], { hoy });
  const nombres = campos.length ? campos : [...new Set(lista.flatMap(m => Object.keys(m)))].filter(k => k !== 'fecha' && k !== 'hora' && k !== 'nota' && k !== 'origen' && k !== 'anomalias');
  const porCampo = {};
  for (const campo of nombres) {
    const puntos = serie(lista, campo);
    porCampo[campo] = {
      puntos,
      mediasSemanales: mediasPorPeriodo(puntos, 'semanal'),
      mediasMensuales: mediasPorPeriodo(puntos, 'mensual'),
      tendencia: tendencia(lista, campo, { hoy, semanas }),
    };
  }
  const lunesActual = lunes(diaDe(hoy));
  const lunesPrevio = sumarDias(lunesActual, -7);
  const comparaciones = Object.fromEntries(nombres.map(campo => [campo, compararPeriodos(lista, campo, {
    desde: lunesActual, hasta: sumarDias(lunesActual, 6),
    anteriorDesde: lunesPrevio, anteriorHasta: sumarDias(lunesPrevio, 6),
  })]));
  const mediaSemanal = porCampo.peso?.mediasSemanales.filter(m => m.n >= 2).slice(-1)[0] || null;
  return {
    generado: diaDe(hoy),
    ultimoPeso: porCampo.peso?.puntos.slice(-1)[0] || null,
    mediaSemanal,
    peso: porCampo.peso || { puntos: [], mediasSemanales: [], mediasMensuales: [], tendencia: tendencia(lista, 'peso', { hoy, semanas }) },
    comparaciones,
    ultimasMedidas: ultimasMedidas(lista, { campos: nombres }),
    porCampo,
    listo: Boolean(porCampo.peso?.puntos.length),
  };
}
