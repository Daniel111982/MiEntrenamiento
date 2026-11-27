// FASE 9 · PARTE 4 — análisis, propuestas, decisiones y recordatorios.
// Módulo puro: recibe los datos ya leídos del estado por app.js, no toca
// localStorage, no lee DOM y no crea un modelo de objetivos paralelo.
// Los cálculos de energía y de objetivos siguen viviendo en calculadoras.js;
// las series, medias y tendencias en evolucion.js.
import { sumarDias, lunes } from './generador.js';
import { CAMPOS_META, ETIQUETAS_META, aplicarObjetivosNutricion } from './calculadoras.js';

const texto = s => String(s ?? '').trim();
const diaDe = f => texto(f).slice(0, 10);
const numero = v => (v != null && v !== '' && Number.isFinite(Number(v))) ? Number(v) : null;
const redondea = (n, d = 2) => {
  const v = numero(n);
  if (v == null) return null;
  const f = 10 ** d;
  return Math.round(v * f) / f;
};
const fmt = n => numero(n) == null ? '—' : Number(n).toLocaleString('es-ES', { maximumFractionDigits: 1 });
const diasEntre = (desde, hasta) => {
  const a = diaDe(desde), b = diaDe(hasta);
  if (!a || !b) return 0;
  return Math.round((Date.parse(`${b}T12:00:00`) - Date.parse(`${a}T12:00:00`)) / 86400000);
};

export const DECISIONES = ['aceptada', 'rechazada', 'pospuesta'];
export const TIPOS_RECORDATORIO = ['peso', 'medidas', 'objetivos', 'evolucion'];
export const FRECUENCIAS_RECORDATORIO = { semanal: 7, quincenal: 14, mensual: 30 };
export const ETIQUETAS_RECORDATORIO = {
  peso: '⚖️ Peso', medidas: '📏 Medidas', objetivos: '🎯 Objetivos', evolucion: '📈 Evolución',
};
const UNIDADES = { kcal: 'kcal', protG: 'g', grasaG: 'g', carbsG: 'g', fibraG: 'g', aguaMl: 'ml' };
const MOTIVOS_RECORDATORIO = {
  peso: 'Registra tu peso para ver la tendencia real.',
  medidas: 'Actualiza tus medidas corporales para completar la evolución.',
  objetivos: 'Revisa si tus objetivos siguen encajando con tu evolución.',
  evolucion: 'Consulta tu evolución corporal y las propuestas pendientes.',
};

const direccionDe = ritmo => ritmo == null ? 'desconocida'
  : Math.abs(ritmo) < 0.05 ? 'estable' : ritmo > 0 ? 'subiendo' : 'bajando';

// Convierte el resumen de evolución en una lectura prudente de la situación.
// Nunca rellena periodos sin datos y separa las señales que contradicen la
// tendencia del peso (medidas corporales, cambios recientes de perfil).
export function analizarEvolucion(resumen = {}, opciones = {}) {
  const hoy = diaDe(opciones.hoy) || new Date().toISOString().slice(0, 10);
  const puntos = Array.isArray(resumen?.peso?.puntos) ? resumen.peso.puntos : [];
  const t = resumen?.peso?.tendencia || { disponible: false, direccion: 'desconocida', semanas: [], porSemana: null };
  const recientes = puntos.filter(p => p && p.fecha >= sumarDias(hoy, -28));
  const primero = recientes[0] || null;
  const ultimo = recientes[recientes.length - 1] || null;
  const dias = primero && ultimo ? diasEntre(primero.fecha, ultimo.fecha) : 0;
  const ritmoDirecto = recientes.length >= 2 && dias >= 10
    ? redondea((numero(ultimo.v) - numero(primero.v)) / dias * 7)
    : null;
  const usaTendencia = Boolean(t.disponible);
  const ritmo = usaTendencia ? numero(t.porSemana) : ritmoDirecto;
  const direccion = usaTendencia ? (t.direccion || direccionDe(ritmo)) : direccionDe(ritmo);
  const semanas = usaTendencia ? (Array.isArray(t.semanas) ? t.semanas : []) : [];
  const desde = semanas.length ? diaDe(semanas[0].fecha) : (primero?.fecha || null);
  const hasta = semanas.length ? diaDe(semanas[semanas.length - 1].fecha) : (ultimo?.fecha || null);
  const ultimoPeso = resumen?.ultimoPeso || null;
  const pesoEstimado = texto(ultimoPeso?.origen) === 'estimado';
  const pesosEstimados = recientes.filter(p => texto(p.origen) === 'estimado').length;

  // Una medida corporal que se mueve en sentido opuesto al peso es una señal
  // contradictoria, no una razón para aplicar un cambio automático.
  const contradictorias = [];
  const porCampo = resumen?.porCampo || {};
  Object.keys(porCampo).filter(k => k !== 'peso' && k !== 'grasa' && k !== 'masaGrasa').forEach(campo => {
    const otro = porCampo[campo]?.tendencia;
    if (!otro?.disponible || !numero(otro.porSemana)) return;
    const rpc = Math.abs(otro.porSemana);
    const umbral = campo === 'masaMuscular' ? 0.08 : 0.15;
    if (rpc < umbral) return;
    const opuesto = (direccion === 'bajando' && otro.porSemana > 0) || (direccion === 'subiendo' && otro.porSemana < 0);
    if (opuesto) contradictorias.push(`${campo} (${otro.porSemana > 0 ? '+' : '−'}${fmt(Math.abs(otro.porSemana))}/semana)`);
  });

  const perfilReciente = Boolean(opciones.perfilCambioEn && diasEntre(opciones.perfilCambioEn, hoy) >= 0
    && diasEntre(opciones.perfilCambioEn, hoy) <= 7);
  const contradiccionesRegistro = Math.max(0, Math.round(numero(opciones.registrosContradictorios) || 0));
  const anomalias = Math.max(0, Math.round(numero(opciones.anomalias) || 0));
  const huecos = Math.max(0, Math.round(numero(opciones.huecos) || 0));
  const haySuficiente = Boolean(ritmo != null) || usaTendencia;
  let clasificacion = 'insuficiente';
  if (haySuficiente) {
    if (contradiccionesRegistro >= 2 || contradictorias.length >= 2
      || (contradictorias.length + contradiccionesRegistro > 0 && perfilReciente)) clasificacion = 'contradictoria';
    else if (direccion === 'subiendo') clasificacion = 'ascendente';
    else if (direccion === 'bajando') clasificacion = 'descendente';
    else clasificacion = 'estable';
  }

  const ingestas = Array.isArray(opciones.ingestas) ? opciones.ingestas.filter(d => numero(d?.kcal) > 0) : [];
  const actividad = Array.isArray(opciones.actividad) ? opciones.actividad.filter(d => d && numero(d.pasos) != null) : [];
  const sesionesReales = Math.max(0, Math.round(numero(opciones.sesionesReales) || 0));
  const sesionesProgramadas = Math.max(0, Math.round(numero(opciones.sesionesProgramadas) || 0));
  const mediaIngesta = ingestas.length
    ? Math.round(ingestas.reduce((s, d) => s + numero(d.kcal), 0) / ingestas.length)
    : null;
  const mediaPasos = actividad.length
    ? Math.round(actividad.reduce((s, d) => s + numero(d.pasos), 0) / actividad.length)
    : null;

  const limitaciones = [];
  if (!usaTendencia) {
    limitaciones.push(ritmoDirecto != null
      ? `No hay dos semanas naturales con registros: la lectura usa ${recientes.length} pesajes en ${dias} días.`
      : 'No hay suficientes pesajes para hablar de tendencia: hacen falta al menos dos con 10 días de diferencia.');
  }
  if (recientes.length && recientes.length < 4) limitaciones.push('Pocos pesajes en el periodo: una variación puntual puede cambiar la lectura.');
  if (anomalias) limitaciones.push(`${anomalias} medición(es) marcadas como anómalas no se han usado.`);
  if (huecos) limitaciones.push(`Hay ${huecos} hueco(s) largo(s) entre registros; no se han rellenado.`);
  if (contradiccionesRegistro) limitaciones.push(`Hay ${contradiccionesRegistro} grupo(s) de registros que se contradicen entre sí.`);
  if (pesoEstimado) limitaciones.push('El último peso disponible es una estimación, no una medición directa.');
  else if (pesosEstimados) limitaciones.push(`${pesosEstimados} peso(s) del periodo son estimaciones; el resto son mediciones.`);
  if (perfilReciente) limitaciones.push('El plan o los objetivos cambiaron en los últimos 7 días: parte del cambio puede venir de ahí.');
  if (ingestas.length < 3) limitaciones.push('Faltan días de comidas registradas: la ingesta solo se usa como contexto.');
  if (actividad.length < 3) limitaciones.push('Faltan días de actividad registrada: la actividad solo se usa como contexto.');
  if (sesionesProgramadas >= 2 && sesionesReales >= 2 && sesionesReales < sesionesProgramadas / 2) {
    limitaciones.push('Se han registrado menos sesiones de las programadas; la evolución puede reflejar menos entrenamiento, no solo nutrición.');
  }
  if (contradictorias.length) limitaciones.push(`Señales opuestas al peso: ${contradictorias.join(', ')}.`);
  limitaciones.push('Los datos ausentes no cuentan como cero ni como falta de progreso.');

  return {
    clasificacion,
    suficiente: haySuficiente && clasificacion !== 'insuficiente' && clasificacion !== 'contradictoria',
    direccion,
    ritmo,
    tendenciaDisponible: usaTendencia,
    periodo: { desde, hasta, semanas: semanas.length || null },
    datos: {
      pesos: puntos.length,
      pesosRecientes: recientes.length,
      dias,
      mediasSemanales: semanas.length,
      camposMedidos: Object.keys(porCampo).filter(k => porCampo[k]?.puntos?.length).length,
      diasIngesta: ingestas.length,
      mediaIngesta,
      diasActividad: actividad.length,
      mediaPasos,
      sesionesReales,
      sesionesProgramadas,
      perfilReciente,
      anomalias,
      huecos,
      registrosContradictorios: contradiccionesRegistro,
      pesosEstimados,
      pesoEstimado,
    },
    limitaciones,
    contradictorias,
  };
}

const valorDe = (obj, campo) => numero(obj?.valores?.[campo] ?? obj?.[campo]);
const origenDe = (obj, campo) => texto(obj?.origen?.[campo]) || 'calculado';

const listaObjetivos = (valores, origen = {}) => CAMPOS_META
  .map(c => {
    const v = numero(valores?.[c]);
    if (v == null) return null;
    const marcador = origen[c] === 'manual' ? ' · manual' : origen[c] === 'aceptado' ? ' · aceptado' : '';
    return `${ETIQUETAS_META[c]} ${fmt(v)} ${UNIDADES[c]}${marcador}`;
  })
  .filter(Boolean)
  .join(' · ');

// Construye una propuesta completa sin escribir nada. Solo se genera cuando
// hay datos suficientes y el ajuste es real: nunca una propuesta ficticia de 0.
export function crearPropuesta({ analisis, actual, ajuste, propuestaAuto, grasaPct = 25, hoy } = {}) {
  if (!analisis?.suficiente || !ajuste?.suficiente) return null;
  const delta = numero(ajuste.ajuste);
  if (!delta || !propuestaAuto?.ok || !propuestaAuto?.propuesta) return null;
  const origenActual = actual?.origen || {};
  // Un objetivo manual nunca se sustituye: sin consentimiento no hay propuesta.
  if (CAMPOS_META.some(c => origenDe(actual, c) === 'manual')) return null;

  const auto = propuestaAuto.propuesta;
  const overrides = {};
  CAMPOS_META.forEach(c => {
    const v = valorDe(actual, c);
    if (v != null && origenDe(actual, c) === 'aceptado') overrides[c] = { valor: v, origen: 'aceptado' };
  });
  // La caloría propuesta se congela solo dentro de ESTA propuesta para que los
  // macros dependientes se recalculen con ella. Al aceptar se guarda como
  // 'aceptado', nunca como 'manual'.
  overrides.kcal = { valor: numero(auto.kcal), origen: 'manual' };
  const aplicadas = aplicarObjetivosNutricion({ auto, overrides, grasaPct });
  if (!aplicadas.ok) return null;

  const cambioKcal = numero(aplicadas.valores.kcal) - numero(valorDe(actual, 'kcal'));
  const ritmoTxt = analisis.ritmo == null ? 'sin ritmo calculable'
    : `${analisis.ritmo > 0 ? '+' : analisis.ritmo < 0 ? '−' : ''}${fmt(Math.abs(analisis.ritmo))} kg/semana`;
  const cambiosDetalle = aplicadas.cambios
    .filter(c => c.campo !== 'kcal')
    .map(c => `${ETIQUETAS_META[c.campo]} ${fmt(c.antes)} → ${fmt(c.despues)} ${UNIDADES[c.campo]}`)
    .join(' · ');
  const fecha = diaDe(hoy) || new Date().toISOString().slice(0, 10);
  const origenPropuesto = { ...aplicadas.origen, kcal: 'aceptado' };
  const propuesta = {
    fecha,
    estado: 'pendiente',
    decision: null,
    decididaEn: null,
    decisiones: [],
    situacion: `${analisis.clasificacion} · ${ritmoTxt}`,
    datosAnalizados: `${analisis.datos.pesos} pesajes, ${analisis.datos.mediasSemanales} semanas con media, `
      + `${analisis.datos.camposMedidos} medidas corporales, ${analisis.datos.diasIngesta} días de ingesta, `
      + `${analisis.datos.diasActividad} días de actividad y ${analisis.datos.sesionesReales} sesiones realizadas.`,
    periodo: analisis.periodo.desde && analisis.periodo.hasta
      ? `${analisis.periodo.desde} a ${analisis.periodo.hasta}${analisis.periodo.semanas ? ` · ${analisis.periodo.semanas} semanas` : ''}`
      : 'Sin periodo con datos suficientes',
    tendencia: `${analisis.direccion}${analisis.tendenciaDisponible ? ' (media semanal)' : ' (pesajes recientes)'}`,
    objetivosActuales: listaObjetivos(actual?.valores, origenActual),
    objetivosPropuestos: listaObjetivos(aplicadas.valores, origenPropuesto),
    motivo: `${ajuste.motivo}${cambiosDetalle ? ` ${cambiosDetalle}.` : ''}`,
    limitaciones: [...analisis.limitaciones, ajuste.detalle || ''].filter(Boolean).join(' '),
    objetivosAnteriores: { ...(actual?.valores || {}) },
    objetivosRecomendados: { ...aplicadas.valores },
    valores: { ...aplicadas.valores },
    origen: { ...origenPropuesto },
    grasaPct: aplicadas.grasaPct ?? grasaPct,
    cambios: aplicadas.cambios,
    deltaKcal: redondea(cambioKcal, 0),
    analisis: {
      clasificacion: analisis.clasificacion,
      direccion: analisis.direccion,
      ritmo: analisis.ritmo,
      periodo: analisis.periodo,
      datos: analisis.datos,
      limitaciones: analisis.limitaciones,
    },
    ajuste: { base: ajuste.base, kcal: ajuste.kcal, senal: ajuste.senal, detalle: ajuste.detalle },
  };
  propuesta.huella = huellaPropuesta(propuesta);
  propuesta.id = `${fecha}|${propuesta.huella}`;
  return propuesta;
}

// Huella estable: mismo periodo + mismos datos + mismo resultado = propuesta
// duplicada. No depende de la hora ni del orden del historial.
export function huellaPropuesta(p = {}) {
  return [
    diaDe(p.analisis?.periodo?.desde),
    diaDe(p.analisis?.periodo?.hasta),
    p.ajuste?.base,
    p.ajuste?.kcal,
    p.ajuste?.senal,
    p.valores?.kcal,
    p.valores?.protG,
  ].join('|');
}

export function yaRegistrada(historial, huella) {
  if (!texto(huella)) return false;
  return (Array.isArray(historial) ? historial : []).some(p => p && p.huella === huella);
}

// Registra una decisión SIN borrar ni reescribir el contenido de la propuesta.
// La propuesta pospuesta puede volver a decidirse más adelante; la rechazada,
// no. Cada decisión queda como evento con fecha, motivos y valores implicados.
export function decidir(historial = [], id = null, decision = null, fecha = null, extra = {}) {
  const salida = Array.isArray(historial) ? historial.slice() : [];
  if (!DECISIONES.includes(decision) || !texto(id)) return { historial: salida, actualizada: false };
  const dia = diaDe(fecha) || new Date().toISOString().slice(0, 10);
  let actualizada = false;
  const resultado = salida.map(p => {
    if (!p || p.id !== id) return p;
    if (p.decision && p.decision !== 'pospuesta') return p;
    if (p.decision === decision) return p;
    actualizada = true;
    const eventos = Array.isArray(p.decisiones) ? p.decisiones.slice()
      : (p.decision ? [{
        decision: p.decision, fecha: p.decididaEn || p.fecha, motivo: p.motivo,
        objetivosAnteriores: p.objetivosAnteriores, objetivosRecomendados: p.objetivosRecomendados,
      }] : []);
    eventos.push({ decision, fecha: dia, ...extra });
    return {
      ...p, decision, estado: decision, decididaEn: dia,
      decisiones: eventos, ...extra,
    };
  });
  return { historial: resultado, actualizada };
}

const clavePeriodo = (hoy, frecuencia) => frecuencia === 'mensual'
  ? diaDe(hoy).slice(0, 7)
  : diaDe(lunes(diaDe(hoy)));

// Devuelve solo los recordatorios debidos en este periodo. La app decide
// después si puede notificar (permiso) o debe limitarse a un aviso en pantalla.
export function proximosRecordatorios(config = {}, contexto = {}) {
  const hoy = diaDe(contexto.hoy) || new Date().toISOString().slice(0, 10);
  const ultimos = {
    peso: contexto.ultimoPeso,
    medidas: contexto.ultimaMedida,
    objetivos: contexto.aceptadoEn || contexto.ultimaDecision,
    evolucion: contexto.ultimaRevision,
  };
  return TIPOS_RECORDATORIO.map(tipo => {
    const conf = config?.[tipo] || {};
    if (conf.activo !== true) return null;
    const frecuencia = FRECUENCIAS_RECORDATORIO[conf.frecuencia] ? conf.frecuencia : 'semanal';
    const ultimo = diaDe(ultimos[tipo]);
    const dias = ultimo ? diasEntre(ultimo, hoy) : Infinity;
    if (dias < FRECUENCIAS_RECORDATORIO[frecuencia]) return null;
    const clave = `${tipo}|${clavePeriodo(hoy, frecuencia)}`;
    if (contexto.avisado?.[tipo] === clave) return null;
    return { tipo, clave, frecuencia, motivo: MOTIVOS_RECORDATORIO[tipo] };
  }).filter(Boolean);
}

// Texto resumido para el coach: solo datos reales ya calculados, sin prompts
// nuevos ni cambio de contrato. La app lo pasa al contexto existente.
export function contextoParaCoach({ analisis, propuestas = [], metas = null } = {}) {
  const lista = Array.isArray(propuestas) ? propuestas : [];
  const pendientes = lista.filter(p => p?.estado === 'pendiente');
  if (!analisis && !lista.length) return null;
  return {
    tendencia: analisis ? {
      clasificacion: analisis.clasificacion,
      direccion: analisis.direccion,
      ritmo: analisis.ritmo,
      periodo: analisis.periodo,
      suficiente: analisis.suficiente,
      limitaciones: analisis.limitaciones,
    } : null,
    propuestas: lista.map(p => ({
      fecha: p.fecha,
      situacion: p.situacion,
      motivo: p.motivo,
      decision: p.decision,
      limitaciones: p.limitaciones,
    })).slice(-8),
    pendientes: pendientes.length,
    objetivos: metas ? {
      kcal: numero(metas.kcal), protG: numero(metas.protG),
      grasaG: numero(metas.grasaG), carbsG: numero(metas.carbsG),
    } : null,
  };
}
