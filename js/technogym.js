// Catálogo de máquinas Technogym de DANTAL.
// Relaciona los ejercicios con máquinas reales (líneas Selection 900, Pure Strength
// y Kinesis One) y genera una ilustración biomecánica en SVG.
//
// IMPORTANTE: los identificadores de vídeo son marcadores de posición
// (no se han podido verificar). Sustitúyelos por los enlaces reales de cada
// máquina cuando los tengas: basta cambiar el valor en VIDEOS_TECHNOGYM por el
// identificador de 11 caracteres del vídeo de YouTube.

import { COLORES_MARCA } from './marca.js';

// ---------------------------------------------------------------------
// Máquinas: id del ejercicio -> línea, máquina y ajuste recomendado.
// ---------------------------------------------------------------------
export const EQUIPO_TECHNOGYM = {
  // ---- Pierna ----
  'prensa': { linea: 'Selection 900', maquina: 'Leg Press', musculo: 'Cuádriceps y glúteos', ajuste: 'Respaldo atrás, pies a la anchura de los hombros en el centro de la plataforma. Rodillas a 90° sin despegar la lumbar.' },
  'extension-cuadriceps': { linea: 'Selection 900', maquina: 'Leg Extension', musculo: 'Cuádriceps', ajuste: 'Eje de la rodilla alineado con el pivote de la máquina. Rodillo justo encima del empeine.' },
  'curl-femoral': { linea: 'Selection 900', maquina: 'Leg Curl', musculo: 'Femorales', ajuste: 'Rodillo por encima del talón. Cadera pegada al asiento durante todo el recorrido.' },
  'gemelos-maquina': { linea: 'Selection 900', maquina: 'Calf Raise', musculo: 'Gemelos', ajuste: 'Puntas sobre la plataforma, recorrido completo: estira abajo y pausa arriba.' },
  'hip-thrust': { linea: 'Pure Strength', maquina: 'Hip Thrust', musculo: 'Glúteos', ajuste: 'Espalda alta en el respaldo, almohadilla sobre la cadera. Extiende sin arquear la lumbar.' },

  // ---- Empuje ----
  'press-maquina': { linea: 'Selection 900', maquina: 'Chest Press', musculo: 'Pecho y tríceps', ajuste: 'Asiento para que las asas queden a la altura del pecho. Escápulas juntas y retraídas.' },
  'press-hombro-maquina': { linea: 'Selection 900', maquina: 'Shoulder Press', musculo: 'Hombros y tríceps', ajuste: 'Asas a la altura de los hombros. Empuja en vertical sin arquear la espalda.' },
  'cruce-poleas': { linea: 'Kinesis One', maquina: 'Cable Crossover', musculo: 'Pecho', ajuste: 'Poleas altas, un paso al frente. Codos ligeramente flexionados y fijos.' },

  // ---- Tirón ----
  'remo-maquina': { linea: 'Selection 900', maquina: 'Low Row', musculo: 'Espalda y bíceps', ajuste: 'Pecho apoyado en el respaldo. Tira juntando las escápulas, sin encoger los hombros.' },
  'jalon': { linea: 'Selection 900', maquina: 'Lat Machine', musculo: 'Espalda y bíceps', ajuste: 'Rodillas bajo el tope. Tira hacia la parte alta del pecho llevando los codos abajo.' },
  'remo-polea': { linea: 'Selection 900', maquina: 'Seated Row', musculo: 'Espalda y bíceps', ajuste: 'Espalda recta, ligera inclinación atrás. Tira del agarre hacia el abdomen.' },
  'face-pull': { linea: 'Kinesis One', maquina: 'Face Pull', musculo: 'Hombro posterior y espalda', ajuste: 'Cuerda a la altura de la cara. Codos altos, separa las manos hacia la frente.' },

  // ---- Brazos y hombro ----
  'curl-polea': { linea: 'Selection 900', maquina: 'Cable Curl', musculo: 'Bíceps', ajuste: 'Codos pegados al cuerpo. Flexiona sin balancear y baja controlando.' },
  'extension-triceps-polea': { linea: 'Selection 900', maquina: 'Triceps Pushdown', musculo: 'Tríceps', ajuste: 'Codos fijos al costado. Extiende por completo y aprieta abajo.' },
  'laterales-polea': { linea: 'Kinesis One', maquina: 'Cable Lateral Raise', musculo: 'Hombro lateral', ajuste: 'Polea baja, de lado al aparato. Eleva el brazo hasta la altura del hombro.' },

  // ---- Core ----
  'crunch-polea': { linea: 'Kinesis One', maquina: 'Cable Crunch', musculo: 'Abdomen', ajuste: 'De rodillas con la cuerda junto a la cabeza. Flexiona el tronco llevando los codos a los muslos.' },
};

// Vídeos oficiales de técnica (marcadores de posición: sustitúyelos por los reales).
export const VIDEOS_TECHNOGYM = {
  'prensa': 'TgLegPress9',
  'extension-cuadriceps': 'TgLegExt900',
  'curl-femoral': 'TgLegCurl90',
  'gemelos-maquina': 'TgCalf90000',
  'hip-thrust': 'TgHipThrust',
  'press-maquina': 'TgChestPres',
  'press-hombro-maquina': 'TgShldrPres',
  'cruce-poleas': 'TgCrossOver',
  'remo-maquina': 'TgLowRow900',
  'jalon': 'TgLatMachin',
  'remo-polea': 'TgSeatedRow',
  'face-pull': 'TgFacePull9',
  'curl-polea': 'TgCableCurl',
  'extension-triceps-polea': 'TgPushdown9',
  'laterales-polea': 'TgCblLatRai',
  'crunch-polea': 'TgCblCrunch',
};

// URL lista para incrustar (sin cookies de seguimiento).
export const urlVideoTechnogym = id => id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null;

// Ficha completa de un ejercicio: prioriza los datos personalizados del usuario.
export function infoTechnogym(ej) {
  if (!ej) return null;
  if (ej.maquinaCustom) {
    return {
      linea: ej.lineaCustom || 'Personalizada',
      maquina: ej.maquinaCustom,
      musculo: ej.musculoCustom || '',
      ajuste: ej.ajusteCustom || '',
      video: ej.videoCustom || null,
      personalizada: true,
    };
  }
  const eq = EQUIPO_TECHNOGYM[ej.id];
  if (!eq) return null;
  return { ...eq, video: VIDEOS_TECHNOGYM[ej.id] || null, personalizada: false };
}

export const esTechnogym = ej => Boolean(ej && (EQUIPO_TECHNOGYM[ej.id] || ej.maquinaCustom));

// ---------------------------------------------------------------------
// Ilustración biomecánica: chasis gris petróleo, levas en ámbar,
// músculo activo en turquesa y flecha de recorrido en turquesa luminoso.
// ---------------------------------------------------------------------
const GRIS = '#3A4A52';
const GRIS_OSCURO = '#2A363C';
const AMBAR = '#F4B446';
const TURQUESA = COLORES_MARCA.turquesa;   // #087F91
const TURQUESA_LUM = COLORES_MARCA.turquesaLum; // #42C4C5

// Tipo de máquina a partir del patrón del ejercicio.
function tipoMaquina(ej) {
  switch (ej?.patron) {
    case 'sentadilla': return 'pierna';
    case 'femoral': case 'gemelo': return 'pierna';
    case 'cuadriceps_aisl': return 'pierna';
    case 'bisagra': return 'cadera';
    case 'empuje_h': return 'empuje';
    case 'empuje_v': return 'hombro';
    case 'pecho_aisl': return 'apertura';
    case 'tiron_h': return 'tiron';
    case 'tiron_v': return 'jalon';
    case 'hombro_post': return 'cara';
    case 'hombro_lat': return 'lateral';
    case 'biceps': return 'curl';
    case 'triceps': return 'triceps';
    case 'core': return 'core';
    default: return 'empuje';
  }
}

// Postura A (inicio) y B (final) del mecanismo, por tipo de máquina.
function posturas(tipo) {
  const base = {
    pierna: { A: { ang: 70, carro: 26 }, B: { ang: 4, carro: 60 } },
    cadera: { A: { ang: 62, carro: 30 }, B: { ang: 10, carro: 54 } },
    empuje: { A: { ang: 58, carro: 24 }, B: { ang: 6, carro: 62 } },
    hombro: { A: { ang: 66, carro: 28 }, B: { ang: 8, carro: 64 } },
    apertura: { A: { ang: 74, carro: 22 }, B: { ang: 12, carro: 58 } },
    tiron: { A: { ang: 22, carro: 22 }, B: { ang: 70, carro: 58 } },
    jalon: { A: { ang: 12, carro: 66 }, B: { ang: 64, carro: 26 } },
    cara: { A: { ang: 18, carro: 22 }, B: { ang: 62, carro: 54 } },
    lateral: { A: { ang: 76, carro: 22 }, B: { ang: 18, carro: 52 } },
    curl: { A: { ang: 76, carro: 24 }, B: { ang: 16, carro: 56 } },
    triceps: { A: { ang: 66, carro: 30 }, B: { ang: 10, carro: 62 } },
    core: { A: { ang: 70, carro: 26 }, B: { ang: 24, carro: 56 } },
  };
  return base[tipo] || base.empuje;
}

// Dibuja el cuerpo de perfil con el músculo activo resaltado.
function cuerpoPerfil(postura) {
  const A = postura === 'A';
  const cadera = A ? [86, 118] : [78, 112];
  const hombro = A ? [78, 76] : [70, 74];
  const cabeza = A ? [82, 62] : [74, 60];
  const rodilla = A ? [118, 118] : [104, 116];
  const pie = A ? [120, 150] : [112, 150];
  const codo = A ? [96, 96] : [92, 88];
  return `
    <g stroke="${TURQUESA}" stroke-width="6" stroke-linecap="round" fill="none" opacity=".95">
      <path d="M${hombro[0]} ${hombro[1]} L${cadera[0]} ${cadera[1]}"/>
      <path d="M${cadera[0]} ${cadera[1]} L${rodilla[0]} ${rodilla[1]} L${pie[0]} ${pie[1]}"/>
      <path d="M${hombro[0]} ${hombro[1]} L${codo[0]} ${codo[1]}"/>
    </g>
    <circle cx="${cabeza[0]}" cy="${cabeza[1]}" r="11" fill="${TURQUESA}"/>`;
}

export function ilustracionTechnogymSVG(ej, { postura = 'A', ancho = 220 } = {}) {
  const tipo = tipoMaquina(ej);
  const p = posturas(tipo)[postura] || posturas(tipo).A;
  const id = `tg${Math.abs(hash(ej?.id || tipo)).toString(36)}${postura}`;
  const carroY = 44 + (p.carro / 70) * 78;
  // Brazo de leva: gira sobre el pivote según el ángulo.
  const pivote = [54, 116];
  const rad = (p.ang * Math.PI) / 180;
  const largo = 74;
  const extremo = [pivote[0] + Math.cos(rad) * largo, pivote[1] - Math.sin(rad) * largo];
  return `<svg class="tg-ilus" viewBox="0 0 200 170" width="${ancho}" role="img" aria-label="Máquina Technogym: ${ej?.nombre || ''}" style="max-width:100%">
    <defs>
      <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${GRIS}"/><stop offset="1" stop-color="${GRIS_OSCURO}"/>
      </linearGradient>
    </defs>
    <!-- Chasis -->
    <rect x="18" y="150" width="164" height="8" rx="4" fill="${GRIS_OSCURO}"/>
    <rect x="24" y="30" width="12" height="122" rx="5" fill="url(#${id})"/>
    <rect x="24" y="30" width="12" height="10" rx="4" fill="${AMBAR}"/>
    <!-- Pila de placas -->
    <g fill="url(#${id})">
      <rect x="34" y="${carroY}" width="26" height="7" rx="2"/>
      <rect x="34" y="${carroY + 9}" width="26" height="7" rx="2"/>
      <rect x="34" y="${carroY + 18}" width="26" height="7" rx="2"/>
    </g>
    <!-- Asiento -->
    <rect x="66" y="126" width="40" height="10" rx="5" fill="url(#${id})"/>
    <rect x="80" y="136" width="10" height="14" rx="3" fill="${GRIS_OSCURO}"/>
    <!-- Brazo de leva con leva (cam) -->
    <line x1="${pivote[0]}" y1="${pivote[1]}" x2="${extremo[0].toFixed(1)}" y2="${extremo[1].toFixed(1)}" stroke="${GRIS}" stroke-width="8" stroke-linecap="round"/>
    <circle cx="${pivote[0]}" cy="${pivote[1]}" r="9" fill="${AMBAR}"/>
    <circle cx="${pivote[0]}" cy="${pivote[1]}" r="3.5" fill="${GRIS_OSCURO}"/>
    <!-- Cuerpo -->
    ${cuerpoPerfil(postura)}
    <!-- Flecha de recorrido -->
    <path d="M150 60 q16 18 0 40" stroke="${TURQUESA_LUM}" stroke-width="4" fill="none" marker-end="url(#${id}-a)"/>
    <defs><marker id="${id}-a" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${TURQUESA_LUM}"/></marker></defs>
  </svg>`;
}

// Hash sencillo y estable para generar ids únicos de degradado.
function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}
