// Mapea nuestros 82 ejercicios (js/ejercicios.js) con el dataset abierto de
// RepDB (.tmp/repdb/exercises.json) comparando los nombres en español.
//
// Uso:  node scripts/mapear-ejercicios.mjs
// Resultado: scripts/mapeo-revisar.json  (para revisar antes de subir nada)
//
// Sin dependencias externas. El dataset se descarga aparte en .tmp/repdb/
// (carpeta ignorada por git) y no se republica: solo se usa dentro de la app.
//
// El archivo de salida distingue tres estados:
//   auto    → coincidencia por nombre con score alto
//   revisar → coincidencia probable o equivalencia manual (mirar antes de subir)
//   sinMatch → se guarda el mejor intento para decidir

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NUESTROS = path.join(ROOT, 'js', 'ejercicios.js');
const REPDB = path.join(ROOT, '.tmp', 'repdb', 'exercises.json');
const SALIDA = path.join(ROOT, 'scripts', 'mapeo-revisar.json');

// ---------------------------------------------------------------------
// Nuestros ejercicios: se leen como texto porque js/ejercicios.js es un
// módulo del navegador y aquí no queremos depender de un package.json.
// ---------------------------------------------------------------------
function leerNuestros(codigo) {
  const inicio = codigo.indexOf('export const EJERCICIOS = [');
  if (inicio < 0) throw new Error('No encuentro EJERCICIOS en js/ejercicios.js');
  const trozo = codigo.slice(inicio, codigo.indexOf('\n];', inicio));
  const bloques = trozo.match(/\{\s*id:\s*'[^']+'[\s\S]*?\}/g) || [];
  return bloques.map(b => {
    const id = b.match(/id:\s*'([^']+)'/)?.[1];
    const nombre = b.match(/nombre:\s*'([^']+)'/)?.[1];
    if (!id || !nombre) return null;
    const lista = clave => (b.match(new RegExp(`${clave}:\\s*\\[([^\\]]*)\\]`))?.[1] || '')
      .split(',').map(x => x.trim().replace(/^'|'$/g, '')).filter(Boolean);
    return {
      id, nombre,
      patron: b.match(/patron:\s*'([^']+)'/)?.[1] || '',
      musculos: lista('musculos'),
      equipo: lista('equipo'),
      compuesto: /compuesto:\s*true/.test(b),
      desc: b.match(/desc:\s*'([^']*)'/)?.[1] || '',
      ...(/tipo:\s*'tiempo'/.test(b) ? { tipo: 'tiempo' } : {}),
      ...(b.match(/nivelMin:\s*'([^']+)'/)?.[1] ? { nivelMin: b.match(/nivelMin:\s*'([^']+)'/)[1] } : {}),
    };
  }).filter(Boolean);
}

// ---------------------------------------------------------------------
// Normalización. RepDB ya trae nombres en español, pero mezcla términos
// ingleses en name_en y sinónimos ("pantorrillas", "talones", "pesa rusa").
// Primero convertimos frases completas a un término canónico y después
// pasamos cada token por el diccionario de sinónimos.
// ---------------------------------------------------------------------
const FRASES = [
  [/push[-\s]?ups?/g, 'flexion'],
  [/lat[-\s]?pulldown|jalon(?: al pecho)?/g, 'jalon'],
  [/calf[-\s]?raise|elevacion(?:es)? de (?:talones?|pantorrillas?|gemelos?)/g, 'elevacion gemelo'],
  [/leg[-\s]?curl|curl de (?:piernas?|femoral|isquiotibiales)/g, 'curl femoral'],
  [/leg[-\s]?extension|extension de piernas/g, 'extension cuadriceps'],
  [/tricep[-\s]?pushdown|jalon de triceps/g, 'extension triceps'],
  [/hip[-\s]?abduction|abduccion(?: de cadera)?/g, 'abduccion'],
  [/mountain climbers|escaladores/g, 'escaladores'],
  [/bird[-\s]?dog|pajaros?/g, 'pajaro'],
  [/reverse lunge|zancada (?:inversa|hacia atras)|inversa/g, 'atras'],
  [/pesa rusa|kettlebells?/g, 'kettlebell'],
  [/laterales|lateral/g, 'lateral'],
  [/cable[-\s]?fly|cruce de poleas/g, 'apertura polea'],
  [/reverse fly|apertura inversa/g, 'apertura inversa'],
  [/chest[-\s]?fly|aperturas? de pecho/g, 'apertura pecho'],
  [/shoulder[-\s]?press|press de hombros/g, 'press hombro'],
  [/chest[-\s]?press|press de pecho/g, 'press pecho'],
  [/lat[-\s]?pulldown/g, 'jalon'],
  [/one[-\s]?arm|a una mano|unilateral/g, 'un brazo'],
  [/single[-\s]?leg|a una pierna/g, 'una pierna'],
  [/close[-\s]?grip|cerrad/g, 'cerrado'],
  [/wide[-\s]?grip|anch/g, 'ancho'],
];

const SINONIMOS = {
  // Material
  barbell: 'barra', bar: 'barra', ez: 'barra', dumbbell: 'mancuerna', dumbbells: 'mancuerna',
  kettlebells: 'kettlebell', 'pesa rusa': 'kettlebell', cable: 'polea', machine: 'maquina',
  smith: 'maquina', band: 'banda', bands: 'banda', banded: 'banda', elastico: 'banda',
  trx: 'banda', bench: 'banco', floor: 'suelo', balance: 'equilibrio',
  // Movimientos
  squat: 'sentadilla', lunge: 'zancada', lunges: 'zancada', 'zancadas': 'zancada',
  deadlift: 'pesomuerto', hinge: 'bisagra', row: 'remo', pull: 'jalon', push: 'flexion',
  curl: 'curl', curls: 'curl', press: 'press', fly: 'apertura', flies: 'apertura',
  flexiones: 'flexion', dominadas: 'dominada',
  swing: 'swing', crunch: 'crunch', crunches: 'crunch', plank: 'plancha',
  raise: 'elevacion', raises: 'elevacion', elevaciones: 'elevacion', extension: 'extension',
  extensiones: 'extension', dip: 'fondos', dips: 'fondos', 'pull-up': 'dominada',
  'pull-ups': 'dominada', pullup: 'dominada', 'chin-ups': 'dominada',
  // Posturas y variantes
  standing: 'pie', 'de pie': 'pie', seated: 'sentado', sentado: 'sentado',
  lying: 'tumbado', tumbado: 'tumbado', reverse: 'inverso', 'inclinado': 'inclinado',
  incline: 'inclinado', decline: 'declinado', 'declinado': 'declinado',
  'pike': 'pica', pica: 'pica', diamond: 'diamante', 'diamante': 'diamante',
  overhead: 'sobre cabeza', 'tras nuca': 'nuca', behind: 'nuca',
  // Músculos (nombres de RepDB y nuestros)
  gemelos: 'gemelo', gemelo: 'gemelo', pantorrilla: 'gemelo', pantorrillas: 'gemelo',
  talon: 'gemelo', talones: 'gemelo', calf: 'gemelo', calves: 'gemelo',
  cuadriceps: 'cuadriceps', quad: 'cuadriceps', quads: 'cuadriceps',
  Femoral: 'femoral', femoral: 'femoral', hamstring: 'femoral', hamstrings: 'femoral',
  gluteos: 'gluteo', gluteo: 'gluteo', glutes: 'gluteo',
  pecho: 'pecho', chest: 'pecho', espalda: 'espalda', back: 'espalda',
  hombros: 'hombro', hombro: 'hombro', shoulder: 'hombro', delt: 'hombro',
  biceps: 'biceps', triceps: 'triceps', abdomen: 'abdomen', abdominales: 'abdomen', abs: 'abdomen',
  // Genéricos que no aportan
  'peso corporal': 'peso', bodyweight: 'peso', pie: 'pie', rodillas: 'rodilla',
};

const PARADAS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'un', 'una', 'unos', 'unas',
  'en', 'con', 'por', 'para', 'a', 'al', 'y', 'o', 'que', 'sobre', 'todo', 'mas', 'sin']);

// Palabras que indican una variante concreta: si están en RepDB y no en
// nuestro nombre, bajan la puntuación (evita "Extensión a una pierna" para
// nuestra "Extensión de cuádriceps").
const VARIANTES = new Set([
  'arquero', 'pausa', 'negativo', 'asistido', 'asistidas', 'caja', 'domo', 'equilibrio',
  'profundo', 'salto', 'plio', 'explosivo', 'isometrico', 'isometrica', 'estatico',
  'supinacion', 'neutro', 'commando', 'escapular', 'lastado', 'inverso', 'invertido',
  'apoyo', 'menton', 'cuello', 'una', 'brazo', 'pierna', 'rodilla', 'maquina', 'banda',
  'peso', 'smith', 'hack', 'burra', 'disco', 'pelota', 'copenhague', 'palmada',
]);

function base(texto) {
  let s = String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9\s/-]/g, ' ').replace(/[/-]/g, ' ').replace(/\s+/g, ' ').trim();
  for (const [re, reemplazo] of FRASES) s = s.replace(re, reemplazo);
  return s;
}
function tokens(texto) {
  const salida = [];
  for (const t of base(texto).split(' ')) {
    if (!t || PARADAS.has(t)) continue;
    salida.push(SINONIMOS[t] || t);
  }
  return salida;
}
function puntuar(nuestro, rep) {
  const a = new Set(tokens(nuestro.nombre));
  const b = new Set(tokens(rep.name_es));
  if (!a.size || !b.size) return 0;
  const comun = [...a].filter(t => b.has(t)).length;
  let s = comun / new Set([...a, ...b]).size;
  const na = base(nuestro.nombre), nb = base(rep.name_es);
  if (na === nb) s += 0.4;
  else if (na && (nb.includes(na) || na.includes(nb))) s += 0.18;
  if (nuestro.id === rep.id) s += 0.25;
  else if (rep.id.includes(nuestro.id) || nuestro.id.includes(rep.id)) s += 0.08;
  const extra = [...b].filter(t => !a.has(t) && VARIANTES.has(t)).length;
  s -= Math.min(0.25, extra * 0.07);
  return Math.max(0, Math.min(1, s));
}

// ---------------------------------------------------------------------
// Equivalencias que la similitud por nombre no puede inferir. Todas se
// marcan para revisión excepto las dos primeras, que son sinónimos exactos.
// ---------------------------------------------------------------------
const ID_FORZADO = {
  'cruce-poleas': { repdb: 'cable-fly', estado: 'auto', razon: 'Cruce de poleas = Aperturas con Cable' },
  'escaladores': { repdb: 'mountain-climbers', estado: 'auto', razon: 'Escaladores = Mountain Climbers' },
  'prensa-horizontal': { repdb: 'horizontal-leg-press', estado: 'auto', razon: 'Prensa horizontal = Prensa de piernas horizontal' },
  'extension-cuadriceps': { repdb: 'leg-extension', estado: 'auto', razon: 'Extensión de cuádriceps = Extensión de Piernas' },
  'extension-triceps-polea': { repdb: 'tricep-pushdown', estado: 'auto', razon: 'Extensión de tríceps en polea = Jalón de Tríceps en Cable' },
  'remo-barra': { repdb: 'barbell-row', estado: 'auto', razon: 'Remo con barra = Remo con Barra Inclinado' },
  'remo-invertido': { repdb: 'inverted-row', estado: 'auto', razon: 'Remo invertido = Inverted Row' },
  'flexiones-diamante': { repdb: 'diamond-push-ups', estado: 'auto', razon: 'Flexiones cerradas = Flexiones en Diamante' },
  'gemelos-sentado': { repdb: 'seated-calf-raise', estado: 'auto', razon: 'Gemelos sentado = Elevación de Talones Sentado' },
  'curl-femoral': { repdb: 'seated-leg-curl', estado: 'revisar', razon: 'Curl femoral en máquina ≈ Curl de Piernas Sentado' },
  'remo-bandas': { repdb: 'banded-standing-row', estado: 'auto', razon: 'Remo con banda = Remo de Pie con Banda' },
  'remo-alto-maquina': { repdb: 'behind-the-neck-lat-pulldown', estado: 'revisar', razon: 'No hay equivalente exacto; se propone Jalón al Cuello detrás de la cabeza' },
  'crunch-maquina': { repdb: 'machine-seated-crunch', estado: 'auto', razon: 'Crunch en máquina = Abdominales en Máquina Sentado' },
  'abductores-maquina': { repdb: 'hip-abduction', estado: 'auto', razon: 'Abductores en máquina = Abducción de Cadera en Máquina' },
  'curl-bandas': { repdb: 'trx-bicep-curl', estado: 'revisar', razon: 'Curl de bíceps con banda ≈ Curl de Bíceps TRX' },
  'triceps-bandas': { repdb: 'trx-tricep-extension', estado: 'revisar', razon: 'Extensión de tríceps con banda ≈ Extensión de Tríceps TRX' },
  'elevaciones-laterales': { repdb: 'lateral-raise', estado: 'auto', razon: 'Elevaciones laterales = Elevación Lateral con Mancuernas' },
  'pajaro': { repdb: 'bird-dog', estado: 'revisar', razon: 'Pájaros con mancuernas ≈ Bird-Dog (patrón similar)' },
  'curl-femoral-fitball': { repdb: 'trx-hamstring-curl', estado: 'revisar', razon: 'Curl femoral deslizante ≈ Curl de Isquiotibiales con TRX' },
  'flexiones-bandas': { repdb: 'banded-push-up', estado: 'revisar', razon: 'Press de pecho con banda ≈ Push-Up con Banda' },
  'pullover-maquina': { repdb: 'plate-pullover', estado: 'revisar', razon: 'Pullover en máquina ≈ Pullover con Disco' },
  'laterales-bandas': { repdb: 'banded-lateral-walk', estado: 'revisar', razon: 'Elevaciones laterales con banda ≈ Caminata Lateral con Banda' },
};

// RepDB no tiene estos ejercicios. Se excluyen explícitamente para que una
// coincidencia débil no cuelgue una ilustración incorrecta.
const SIN_MATCH_FORZADO = new Set([
  'jalon-bandas',        // no existe "Jalón con banda" en RepDB
  'press-hombro-bandas', // Press Pallof no es un press de hombros
  'curl-toalla',         // no existe "Curl isométrico con toalla" en RepDB
]);

// ---------------------------------------------------------------------
// Mapeo
// ---------------------------------------------------------------------
const [codigo, crudo] = await Promise.all([readFile(NUESTROS, 'utf8'), readFile(REPDB, 'utf8')]);
const nuestros = leerNuestros(codigo);
const dataset = JSON.parse(crudo);
const repdb = dataset.exercises || [];
const porRepId = new Map(repdb.map(r => [r.id, r]));

const AUTO = 0.62, REVISION = 0.45;
const matches = [], sinMatch = [];

for (const e of nuestros) {
  if (SIN_MATCH_FORZADO.has(e.id)) {
    sinMatch.push({ id: e.id, nombre: e.nombre, mejorIntento: null,
      razon: 'Sin equivalente en RepDB: se conserva el dibujo SVG' });
    continue;
  }
  const forzado = ID_FORZADO[e.id];
  if (forzado) {
    const r = porRepId.get(forzado.repdb);
    if (r) {
      matches.push(crearMatch(e, r, forzado.estado, 1, 'manual', forzado.razon, repdb));
      continue;
    }
    console.warn(`ID_FORZADO apunta a ${forzado.repdb}, que no existe en RepDB (${e.id})`);
  }

  const ordenados = repdb.map(r => ({ r, score: puntuar(e, r) }))
    .sort((x, y) => y.score - x.score);
  const mejor = ordenados[0];
  const alternativas = ordenados.slice(1, 4)
    .filter(x => x.score >= REVISION)
    .map(x => ({ id: x.r.id, nombre: x.r.name_es, score: Math.round(x.score * 100) / 100 }));
  if (!mejor || mejor.score < REVISION) {
    sinMatch.push({ id: e.id, nombre: e.nombre, mejorIntento: mejor ? {
      id: mejor.r.id, nombre: mejor.r.name_es, score: Math.round(mejor.score * 100) / 100,
    } : null });
    continue;
  }
  matches.push(crearMatch(e, mejor.r,
    mejor.score >= AUTO ? 'auto' : 'revisar',
    Math.round(mejor.score * 100) / 100,
    'nombre', null, repdb, alternativas));
}

function crearMatch(e, r, estado, score, origen, razon, datasetRep, alternativas = []) {
  const planas = r.images?.flat || {};
  return {
    id: e.id,
    nombre: e.nombre,
    estado,
    origen,
    ...(razon ? { razon } : {}),
    score,
    repdb: { id: r.id, nombre_es: r.name_es, nombre_en: r.name_en },
    alternativas,
    imagenes: {
      start: planas.start || planas.main || null,
      end: planas.peak || null,
    },
    primary_muscles: r.primary_muscles || [],
    secondary_muscles: r.secondary_muscles || [],
    instructions: r.instructions_es || [],
    nuestro: e,
  };
}

const resultado = {
  generado: new Date().toISOString(),
  fuente: 'RepDB free tier · https://repdb.co · .tmp/repdb/exercises.json',
  totalNuestros: nuestros.length,
  totalRepDB: repdb.length,
  auto: matches.filter(m => m.estado === 'auto').length,
  revision: matches.filter(m => m.estado === 'revisar').length,
  sinMatch: sinMatch.length,
  umbrales: { auto: AUTO, revision: REVISION },
  matches,
  sinMatchDetalle: sinMatch,
};

await mkdir(path.dirname(SALIDA), { recursive: true });
await writeFile(SALIDA, JSON.stringify(resultado, null, 2) + '\n', 'utf8');

console.log(`Nuestros ejercicios: ${resultado.totalNuestros}`);
console.log(`RepDB (español + webp): ${resultado.totalRepDB}`);
console.log(`Coincidencias automáticas: ${resultado.auto}`);
console.log(`Para revisar: ${resultado.revision}`);
console.log(`Sin coincidencia: ${resultado.sinMatch}`);
console.log(`Escrito: ${path.relative(ROOT, SALIDA)}`);
