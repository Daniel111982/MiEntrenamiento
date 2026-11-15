// Técnica de los ejercicios: dibujos animados del movimiento y guía paso a paso.
import { porId } from './ejercicios.js';

// ---------------------------------------------------------------------
// Dibujos: cada uno define segmentos entre puntos y dos posturas (A = inicio, B = final).
// Lienzo de 200 x 200, suelo en y = 188. «H» es la cabeza y «W»/«W2» donde se dibuja el peso.
// ---------------------------------------------------------------------
const PIERNA = [['P', 'K'], ['K', 'F']];
const LATERAL = [['N', 'P'], ['N', 'E'], ['E', 'W'], ...PIERNA];
const DE_PIE = { H: [100, 38], N: [100, 54], E: [110, 80], W: [114, 103], P: [100, 106], K: [101, 146], F: [100, 186] };

const DIBUJOS = {
  sentadilla: {
    seg: LATERAL,
    A: { ...DE_PIE, E: [86, 70], W: [96, 56] },
    B: { H: [108, 80], N: [104, 95], E: [88, 106], W: [99, 92], P: [76, 140], K: [120, 146], F: [100, 186] },
    pasos: ['De pie, peso sobre todo el pie', 'Abajo: muslos paralelos, espalda neutra'],
  },
  bisagra: {
    seg: LATERAL,
    A: { ...DE_PIE },
    B: { H: [140, 72], N: [126, 80], E: [126, 104], W: [126, 128], P: [80, 108], K: [94, 146], F: [100, 186] },
    pasos: ['Erguido, peso cerca del cuerpo', 'Cadera atrás, espalda recta, rodillas casi fijas'],
  },
  zancada: {
    seg: [...LATERAL, ['P', 'K2'], ['K2', 'F2']],
    A: { ...DE_PIE, K2: [99, 146], F2: [100, 186] },
    B: { H: [100, 82], N: [100, 98], E: [101, 122], W: [102, 144], P: [100, 140], K: [130, 146], F: [130, 186], K2: [80, 180], F2: [60, 186] },
    pasos: ['De pie, pies a la anchura de la cadera', 'Rodilla trasera cerca del suelo, tronco vertical'],
  },
  empuje_h: {
    seg: LATERAL, banco: true,
    A: { H: [150, 124], N: [134, 128], E: [134, 104], W: [134, 80], P: [80, 130], K: [52, 116], F: [44, 186] },
    B: { H: [150, 124], N: [134, 128], E: [118, 146], W: [134, 118], P: [80, 130], K: [52, 116], F: [44, 186] },
    pasos: ['Brazos extendidos sobre el pecho', 'Peso al pecho, codos a unos 45°'],
  },
  flexion: {
    seg: [['N', 'P'], ['N', 'E'], ['E', 'W'], ['P', 'K'], ['K', 'F']],
    A: { H: [152, 118], N: [138, 126], E: [140, 152], W: [140, 182], P: [88, 140], K: [60, 156], F: [30, 176] },
    B: { H: [154, 150], N: [140, 158], E: [120, 158], W: [140, 182], P: [90, 166], K: [60, 172], F: [30, 178] },
    pasos: ['Brazos extendidos, cuerpo en línea recta', 'Pecho casi al suelo, sin hundir la cadera'],
  },
  empuje_v: {
    seg: LATERAL,
    A: { ...DE_PIE, E: [90, 72], W: [102, 56] },
    B: { ...DE_PIE, E: [104, 30], W: [104, 8] },
    pasos: ['Peso a la altura de los hombros', 'Brazos extendidos sobre la cabeza'],
  },
  tiron_h: {
    seg: LATERAL,
    A: { H: [142, 74], N: [128, 84], E: [128, 108], W: [128, 132], P: [84, 110], K: [98, 146], F: [100, 186] },
    B: { H: [142, 74], N: [128, 84], E: [104, 96], W: [114, 114], P: [84, 110], K: [98, 146], F: [100, 186] },
    pasos: ['Tronco inclinado, brazos estirados', 'Codos atrás, escápulas juntas'],
  },
  tiron_v: {
    seg: LATERAL, barra: true,
    A: { H: [100, 46], N: [100, 62], E: [100, 36], W: [100, 12], P: [100, 112], K: [100, 150], F: [100, 186] },
    B: { H: [104, 6], N: [100, 26], E: [84, 36], W: [100, 12], P: [100, 76], K: [100, 116], F: [100, 152] },
    pasos: ['Colgado con los brazos extendidos', 'Barbilla por encima de la barra'],
  },
  colgado: {
    seg: LATERAL, barra: true,
    A: { H: [100, 46], N: [100, 62], E: [100, 36], W: [100, 12], P: [100, 112], K: [100, 150], F: [100, 186] },
    B: { H: [100, 46], N: [100, 62], E: [100, 36], W: [100, 12], P: [100, 112], K: [136, 112], F: [172, 112] },
    pasos: ['Colgado, piernas abajo', 'Piernas arriba sin balancearte'],
  },
  cuadriceps_aisl: {
    seg: LATERAL, asiento: true,
    A: { H: [88, 50], N: [88, 66], E: [92, 92], W: [108, 112], P: [88, 120], K: [124, 120], F: [124, 162] },
    B: { H: [88, 50], N: [88, 66], E: [92, 92], W: [108, 112], P: [88, 120], K: [124, 120], F: [164, 116] },
    pasos: ['Sentado, rodillas a 90°', 'Piernas extendidas, aprieta arriba'],
  },
  femoral: {
    seg: LATERAL,
    A: { H: [170, 168], N: [154, 172], E: [168, 182], W: [184, 182], P: [104, 176], K: [64, 178], F: [26, 178] },
    B: { H: [170, 168], N: [154, 172], E: [168, 182], W: [184, 182], P: [104, 176], K: [64, 178], F: [62, 138] },
    pasos: ['Piernas estiradas', 'Talones hacia los glúteos'],
  },
  gemelo: {
    seg: LATERAL, escalon: true,
    A: { ...DE_PIE, H: [100, 42], N: [100, 58], E: [102, 84], W: [104, 108], P: [100, 110], K: [101, 150], F: [100, 182] },
    B: { H: [100, 30], N: [100, 46], E: [102, 72], W: [104, 96], P: [100, 98], K: [101, 138], F: [100, 170] },
    pasos: ['Talones por debajo del escalón', 'De puntillas, lo más alto posible'],
  },
  pecho_aisl: {
    seg: LATERAL, banco: true,
    A: { H: [150, 124], N: [134, 128], E: [128, 102], W: [134, 80], P: [80, 130], K: [52, 116], F: [44, 186] },
    B: { H: [150, 124], N: [134, 128], E: [112, 136], W: [96, 142], P: [80, 130], K: [52, 116], F: [44, 186] },
    pasos: ['Brazos arriba, codos algo flexionados', 'Abre hasta notar estiramiento en el pecho'],
  },
  frontal: { // vista de frente para elevaciones laterales
    seg: [['N', 'P'], ['SL', 'SR'], ['SL', 'EL'], ['EL', 'W'], ['SR', 'ER'], ['ER', 'W2'], ['PL', 'PR'], ['PL', 'KL'], ['KL', 'FL'], ['PR', 'KR'], ['KR', 'FR']],
    A: { H: [100, 38], N: [100, 56], SL: [86, 62], SR: [114, 62], EL: [82, 86], W: [80, 108], ER: [118, 86], W2: [120, 108], P: [100, 106], PL: [92, 108], PR: [108, 108], KL: [90, 148], KR: [110, 148], FL: [88, 186], FR: [112, 186] },
    B: { H: [100, 38], N: [100, 56], SL: [86, 62], SR: [114, 62], EL: [64, 62], W: [44, 64], ER: [136, 62], W2: [156, 64], P: [100, 106], PL: [92, 108], PR: [108, 108], KL: [90, 148], KR: [110, 148], FL: [88, 186], FR: [112, 186] },
    pasos: ['Brazos a los lados', 'Brazos en cruz a la altura de los hombros'],
  },
  hombro_post: {
    seg: LATERAL,
    A: { ...DE_PIE, E: [124, 60], W: [148, 58] },
    B: { ...DE_PIE, E: [90, 52], W: [110, 40] },
    pasos: ['Brazos al frente', 'Tira hacia la cara, codos altos'],
  },
  biceps: {
    seg: LATERAL,
    A: { ...DE_PIE },
    B: { ...DE_PIE, W: [118, 62] },
    pasos: ['Brazos estirados, codos pegados', 'Flexiona sin mover los codos'],
  },
  triceps: {
    seg: LATERAL,
    A: { ...DE_PIE, E: [104, 82], W: [120, 70] },
    B: { ...DE_PIE, E: [104, 82], W: [108, 108] },
    pasos: ['Codos fijos junto al cuerpo', 'Extiende los brazos por completo'],
  },
  plancha: {
    seg: LATERAL,
    A: { H: [156, 154], N: [140, 160], E: [140, 182], W: [164, 182], P: [90, 166], K: [60, 174], F: [28, 180] },
    B: { H: [156, 153], N: [140, 159], E: [140, 182], W: [164, 182], P: [90, 164], K: [60, 173], F: [28, 180] },
    pasos: ['Antebrazos bajo los hombros', 'Cuerpo recto, abdomen y glúteos apretados'],
  },
  puente: {
    seg: LATERAL,
    A: { H: [168, 174], N: [150, 176], E: [130, 182], W: [114, 184], P: [104, 178], K: [76, 150], F: [62, 184] },
    B: { H: [168, 174], N: [150, 172], E: [130, 182], W: [114, 184], P: [104, 146], K: [78, 138], F: [62, 184] },
    pasos: ['Tumbado, rodillas flexionadas', 'Cadera arriba: rodilla, cadera y hombro en línea'],
  },
  superman: {
    seg: LATERAL,
    A: { H: [160, 174], N: [144, 178], E: [166, 182], W: [186, 182], P: [100, 180], K: [62, 182], F: [26, 182] },
    B: { H: [158, 160], N: [142, 168], E: [162, 158], W: [182, 150], P: [100, 180], K: [62, 178], F: [26, 168] },
    pasos: ['Boca abajo, brazos estirados', 'Pecho, brazos y piernas arriba'],
  },
  metabolico: {
    seg: LATERAL,
    A: { ...DE_PIE, E: [104, 24], W: [106, 4] },
    B: { H: [120, 112], N: [110, 122], E: [118, 152], W: [124, 182], P: [80, 140], K: [104, 150], F: [92, 186] },
    pasos: ['De pie, brazos arriba', 'Agáchate y apoya las manos'],
  },
};

// Dibujo propio para algunos ejercicios concretos.
const DIBUJO_EJERCICIO = {
  'flexiones': 'flexion', 'flexiones-diamante': 'flexion', 'pike': 'flexion', 'burpees': 'metabolico', 'escaladores': 'plancha',
  'puente-gluteo': 'puente', 'hip-thrust': 'puente', 'superman': 'superman', 'elevacion-piernas': 'colgado',
  'elevaciones-laterales': 'frontal', 'laterales-polea': 'frontal', 'laterales-bandas': 'frontal', 'jumping-jacks': 'frontal',
  'plancha': 'plancha', 'plancha-lateral': 'plancha', 'dead-bug': 'plancha', 'crunch-polea': 'plancha', 'ytw': 'superman',
  'curl-femoral-fitball': 'puente', 'remo-invertido': 'tiron_h', 'pullover-mancuerna': 'pecho_aisl', 'pajaro': 'tiron_h',
};

export const tipoDibujo = ej => DIBUJO_EJERCICIO[ej.id] || (DIBUJOS[ej.patron] ? ej.patron : 'sentadilla');

function props(d, tamano) {
  let s = '<line x1="8" y1="189" x2="192" y2="189" class="suelo"/>';
  if (d.banco) s += '<rect x="56" y="134" width="104" height="8" rx="3" class="mueble"/><line x1="66" y1="142" x2="66" y2="188" class="mueble-l"/><line x1="150" y1="142" x2="150" y2="188" class="mueble-l"/>';
  if (d.barra) s += '<line x1="56" y1="12" x2="144" y2="12" class="mueble-l gruesa"/>';
  if (d.asiento) s += '<rect x="70" y="124" width="58" height="8" rx="3" class="mueble"/><line x1="80" y1="132" x2="80" y2="188" class="mueble-l"/>';
  if (d.escalon) s += '<rect x="78" y="182" width="44" height="7" rx="2" class="mueble"/>';
  return s;
}

function peso(ej, x, y) {
  const eq = ej.equipo;
  if (eq.includes('barra')) return `<circle cx="${x}" cy="${y}" r="11" class="peso"/><circle cx="${x}" cy="${y}" r="3" class="peso-c"/>`;
  if (eq.includes('mancuernas')) return `<rect x="${x - 9}" y="${y - 4}" width="18" height="8" rx="3" class="peso"/>`;
  if (eq.includes('kettlebell')) return `<circle cx="${x}" cy="${y + 7}" r="8" class="peso"/>`;
  if (eq.includes('polea') || eq.includes('bandas')) return `<circle cx="${x}" cy="${y}" r="4" class="peso"/>`;
  return '';
}

/**
 * Dibujo de la técnica. postura: 'A' o 'B' para una imagen fija; sin postura, animado.
 */
export function dibujoSVG(ej, { postura = null, clase = '' } = {}) {
  const d = DIBUJOS[tipoDibujo(ej)];
  const dur = '2.8s';
  const val = (k, i) => `${d.A[k][i]};${d.B[k][i]};${d.A[k][i]}`;
  const anim = (attr, k, i) => postura ? '' :
    `<animate attributeName="${attr}" values="${val(k, i)}" dur="${dur}" repeatCount="indefinite" keyTimes="0;0.5;1" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/>`;
  const p = postura ? d[postura] : d.A;
  // Brazos y pierna lejana en otro tono para que no se confundan con el tronco.
  const BRAZO = ['E', 'W', 'W2', 'EL', 'ER', 'SL', 'SR'];
  const tono = (a, b) => [a, b].some(k => ['K2', 'F2'].includes(k)) ? 'lejos' : [a, b].some(k => BRAZO.includes(k)) && !(a === 'SL' && b === 'SR') ? 'brazo' : '';
  // Se dibuja primero la pierna lejana, luego el cuerpo y por último los brazos.
  const orden = [...d.seg].sort((x, y) => ({ lejos: 0, '': 1, brazo: 2 }[tono(...x)] - { lejos: 0, '': 1, brazo: 2 }[tono(...y)]));
  const lineas = orden.map(([a, b]) => `<line x1="${p[a][0]}" y1="${p[a][1]}" x2="${p[b][0]}" y2="${p[b][1]}" class="hueso ${tono(a, b)}">
      ${anim('x1', a, 0)}${anim('y1', a, 1)}${anim('x2', b, 0)}${anim('y2', b, 1)}</line>`).join('');
  const cabeza = `<circle cx="${p.H[0]}" cy="${p.H[1]}" r="11" class="cabeza">${anim('cx', 'H', 0)}${anim('cy', 'H', 1)}</circle>`;
  const pesoEn = k => {
    if (!p[k]) return '';
    const g = peso(ej, 0, 0);
    if (!g) return '';
    if (postura) return `<g transform="translate(${p[k][0]} ${p[k][1]})">${g}</g>`;
    return `<g>${g}<animateTransform attributeName="transform" type="translate" values="${d.A[k].join(' ')};${d.B[k].join(' ')};${d.A[k].join(' ')}" dur="${dur}" repeatCount="indefinite" keyTimes="0;0.5;1" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/></g>`;
  };
  return `<svg viewBox="0 0 200 200" class="dibujo ${clase}" role="img" aria-label="${postura ? (postura === 'A' ? 'Posición inicial' : 'Posición final') : 'Animación del movimiento'}">
    ${props(d)}${lineas}${cabeza}${pesoEn('W')}${pesoEn('W2')}</svg>`;
}

export const pasosDibujo = ej => DIBUJOS[tipoDibujo(ej)].pasos;

// ---------------------------------------------------------------------
// Guía: respiración, errores comunes y claves por tipo de movimiento.
// ---------------------------------------------------------------------
const GUIA = {
  sentadilla: {
    resp: 'Coge aire y aprieta el abdomen antes de bajar; suéltalo al pasar la parte más dura de la subida.',
    errores: ['Levantar los talones del suelo', 'Rodillas que se van hacia dentro', 'Redondear la zona lumbar abajo'],
    claves: ['Empuja el suelo con todo el pie', 'Rodillas en la dirección de las puntas de los pies', 'Pecho alto y mirada al frente'],
  },
  bisagra: {
    resp: 'Inspira arriba, bloquea el abdomen durante la bajada y suelta el aire al volver a la posición erguida.',
    errores: ['Redondear la espalda', 'Convertirlo en una sentadilla doblando mucho las rodillas', 'Separar el peso de las piernas'],
    claves: ['Piensa en llevar la cadera hacia la pared de atrás', 'Peso pegado al cuerpo todo el recorrido', 'Aprieta glúteos al final'],
  },
  zancada: {
    resp: 'Inspira al bajar y suelta el aire al empujar para subir.',
    errores: ['Paso demasiado corto', 'Rodilla delantera que se va hacia dentro', 'Inclinar el tronco hacia delante'],
    claves: ['Baja en vertical, como un ascensor', 'Empuja con el talón de la pierna delantera', 'Mantén la cadera nivelada'],
  },
  empuje_h: {
    resp: 'Inspira al bajar el peso y suelta el aire al empujar.',
    errores: ['Codos muy abiertos a 90°', 'Rebotar el peso en el pecho', 'Despegar los glúteos del banco'],
    claves: ['Escápulas juntas y hacia abajo', 'Codos a unos 45° del cuerpo', 'Bajada controlada de 2 segundos'],
  },
  flexion: {
    resp: 'Inspira al bajar y suelta el aire al empujar.',
    errores: ['Cadera hundida o demasiado alta', 'Bajar solo la mitad', 'Cabeza adelantada'],
    claves: ['Abdomen y glúteos apretados: cuerpo como una tabla', 'Codos hacia atrás, no hacia fuera', 'Si cuesta, apoya las rodillas o eleva las manos'],
  },
  empuje_v: {
    resp: 'Coge aire con el peso en los hombros y suéltalo al terminar de empujar.',
    errores: ['Arquear la zona lumbar', 'Empujar el peso hacia delante', 'Encoger el cuello'],
    claves: ['Glúteos y abdomen apretados', 'Peso en línea vertical con los pies', 'Mete la cabeza bajo el peso al final'],
  },
  tiron_h: {
    resp: 'Suelta el aire al tirar y coge aire al estirar los brazos.',
    errores: ['Tirar con impulso del cuerpo', 'Encoger los hombros hacia las orejas', 'Redondear la espalda'],
    claves: ['Empieza el movimiento juntando las escápulas', 'Codos hacia la cadera', 'Pausa de 1 segundo atrás'],
  },
  tiron_v: {
    resp: 'Suelta el aire al subir y coge aire al bajar despacio.',
    errores: ['Balancearse para subir', 'Hacer medio recorrido', 'Dejarse caer de golpe'],
    claves: ['Lleva los codos hacia los bolsillos', 'Pecho hacia la barra', 'Baja controlando hasta estirar los brazos'],
  },
  colgado: {
    resp: 'Suelta el aire al subir las piernas.',
    errores: ['Balancearse', 'Usar la inercia', 'Arquear la espalda'],
    claves: ['Inclina la pelvis hacia atrás al subir', 'Baja despacio', 'Empieza con rodillas flexionadas'],
  },
  cuadriceps_aisl: {
    resp: 'Suelta el aire al extender las piernas.',
    errores: ['Dar golpes al bajar', 'Levantar la cadera del asiento'],
    claves: ['Aprieta 1 segundo arriba', 'Baja en 2-3 segundos'],
  },
  femoral: {
    resp: 'Suelta el aire al flexionar las rodillas.',
    errores: ['Levantar la cadera', 'Movimientos rápidos sin control'],
    claves: ['Cadera pegada al apoyo', 'Baja despacio'],
  },
  gemelo: {
    resp: 'Respira con normalidad, sin aguantar el aire.',
    errores: ['Recorrido corto', 'Rebotar abajo'],
    claves: ['Estira bien abajo', 'Pausa de 1 segundo arriba'],
  },
  pecho_aisl: {
    resp: 'Inspira al abrir y suelta el aire al cerrar.',
    errores: ['Estirar del todo los codos', 'Bajar demasiado y forzar el hombro'],
    claves: ['Codos ligeramente flexionados y fijos', 'Imagina que abrazas un árbol'],
  },
  frontal: {
    resp: 'Suelta el aire al subir los brazos.',
    errores: ['Subir por encima de los hombros', 'Balancear el cuerpo', 'Encoger el cuello'],
    claves: ['Lleva los codos, no las manos', 'Peso ligero y control', 'Baja en 2 segundos'],
  },
  hombro_post: {
    resp: 'Suelta el aire al tirar.',
    errores: ['Usar demasiado peso', 'Encoger los hombros'],
    claves: ['Codos altos', 'Junta las escápulas al final'],
  },
  biceps: {
    resp: 'Suelta el aire al subir y coge aire al bajar.',
    errores: ['Balancear el cuerpo', 'Mover los codos hacia delante', 'Bajar de golpe'],
    claves: ['Codos pegados al cuerpo', 'Gira las palmas hacia arriba', 'Baja en 2-3 segundos'],
  },
  triceps: {
    resp: 'Suelta el aire al extender los brazos.',
    errores: ['Mover los codos', 'Inclinarse para empujar'],
    claves: ['Solo se mueve el antebrazo', 'Extiende por completo y aprieta'],
  },
  plancha: {
    resp: 'Respira corto y constante sin soltar la tensión del abdomen.',
    errores: ['Cadera hundida', 'Cadera muy alta', 'Aguantar la respiración'],
    claves: ['Aprieta glúteos y abdomen', 'Cuello neutro, mira al suelo', 'Mejor menos tiempo con buena postura'],
  },
  puente: {
    resp: 'Suelta el aire al subir la cadera.',
    errores: ['Arquear la zona lumbar arriba', 'Empujar con las puntas'],
    claves: ['Empuja con los talones', 'Aprieta glúteos 1 segundo arriba', 'Barbilla recogida'],
  },
  superman: {
    resp: 'Suelta el aire al subir.',
    errores: ['Echar la cabeza atrás', 'Movimientos bruscos'],
    claves: ['Mira al suelo', 'Sube despacio y aguanta 1-2 segundos'],
  },
  metabolico: {
    resp: 'Respira de forma rítmica; no aguantes el aire.',
    errores: ['Perder la técnica por ir rápido', 'Aterrizar con las piernas rígidas'],
    claves: ['Ritmo constante que puedas mantener', 'Aterriza suave flexionando las rodillas'],
  },
};

export function guiaEjercicio(ej) {
  const g = GUIA[tipoDibujo(ej)] || GUIA.sentadilla;
  // Los pasos salen de la descripción, una frase por paso.
  const pasos = ej.desc.split(/(?<=\.)\s+/).map(s => s.trim()).filter(Boolean);
  return { pasos, ...g };
}

export { porId };
