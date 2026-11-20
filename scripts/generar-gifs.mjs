// Genera js/gifs.js con el GIF asignado a cada ejercicio de la biblioteca.
// Las rutas se revisan una a una contra el CDN antes de escribir el archivo.
import fs from 'fs';
import { EJERCICIOS } from '../js/ejercicios.js';

const BASE = 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0/';

// Emparejamiento revisado a mano. Los ejercicios sin equivalente razonable
// se dejan fuera y conservan el dibujo animado de respaldo.
const MAPA = {
  'sentadilla-barra': 'glutes/barbell-low-bar-squat.gif',
  'prensa': 'glutes/sled-45-leg-press.gif',
  'sentadilla-goblet': 'quads/dumbbell-goblet-squat.gif',
  'sentadilla-goblet-kb': 'glutes/kettlebell-goblet-squat.gif',
  'sentadilla-peso': 'glutes/bodyweight-drop-jump-squat.gif',
  'peso-muerto-rumano': 'glutes/barbell-romanian-deadlift.gif',
  'peso-muerto': 'glutes/barbell-deadlift.gif',
  'rumano-mancuernas': 'glutes/dumbbell-romanian-deadlift.gif',
  'swing-kb': 'glutes/kettlebell-swing.gif',
  'puente-gluteo': 'glutes/low-glute-bridge-on-floor.gif',
  'hip-thrust': 'glutes/barbell-lying-lifting-on-hip.gif',
  'zancada-mancuernas': 'glutes/dumbbell-lunge.gif',
  'bulgara': 'quads/barbell-squat-jump-step-rear-lunge.gif',
  'zancada-atras': 'glutes/barbell-lunge.gif',
  'press-banca': 'pectorals/barbell-bench-press.gif',
  'press-mancuernas': 'pectorals/dumbbell-bench-press.gif',
  'press-maquina': 'pectorals/lever-chest-press.gif',
  'flexiones': 'pectorals/push-up.gif',
  'flexiones-bandas': 'pectorals/resistance-band-seated-chest-press.gif',
  'press-militar': 'delts/barbell-standing-wide-military-press.gif',
  'press-hombro-mancuernas': 'delts/dumbbell-seated-shoulder-press.gif',
  'press-hombro-maquina': 'delts/lever-military-press.gif',
  'pike': 'glutes/pike-to-cobra-push-up.gif',
  'press-hombro-bandas': 'delts/band-shoulder-press.gif',
  'remo-barra': 'upper-back/barbell-bent-over-row.gif',
  'remo-mancuerna': 'upper-back/dumbbell-bent-over-row.gif',
  'remo-polea': 'upper-back/cable-low-seated-row.gif',
  'remo-maquina': 'upper-back/smith-one-arm-row.gif',
  'remo-bandas': 'upper-back/band-one-arm-standing-low-row.gif',
  'remo-invertido': 'upper-back/inverted-row.gif',
  'dominadas': 'lats/pull-up.gif',
  'jalon': 'lats/cable-lat-pulldown-full-range-of-motion.gif',
  'jalon-bandas': 'lats/band-close-grip-pulldown.gif',
  'pullover-mancuerna': 'pectorals/dumbbell-pullover.gif',
  'superman': 'spine/hyperextension.gif',
  'extension-cuadriceps': 'quads/lever-leg-extension.gif',
  'sentadilla-pared': 'glutes/frankenstein-squat.gif',
  'curl-femoral': 'hamstrings/lever-lying-leg-curl.gif',
  'curl-femoral-fitball': 'glutes/exercise-ball-one-legged-diagonal-kick-hamstring-curl.gif',
  'gemelos-pie': 'calves/bodyweight-standing-calf-raise.gif',
  'gemelos-maquina': 'calves/lever-seated-calf-raise.gif',
  'aperturas-mancuernas': 'pectorals/dumbbell-fly.gif',
  'cruce-poleas': 'pectorals/cable-cross-over-variation.gif',
  'flexiones-diamante': 'triceps/close-grip-push-up.gif',
  'elevaciones-laterales': 'delts/dumbbell-lateral-raise.gif',
  'laterales-polea': 'delts/cable-lateral-raise.gif',
  'laterales-bandas': 'delts/band-front-lateral-raise.gif',
  'curl-barra': 'biceps/barbell-curl.gif',
  'curl-mancuernas': 'biceps/dumbbell-biceps-curl.gif',
  'curl-polea': 'biceps/cable-curl.gif',
  'curl-bandas': 'biceps/band-alternating-biceps-curl.gif',
  'curl-toalla': 'biceps/band-concentration-curl.gif',
  'extension-triceps-polea': 'triceps/cable-triceps-pushdown-v-bar.gif',
  'press-frances': 'triceps/dumbbell-lying-triceps-extension.gif',
  'fondos-banco': 'triceps/bench-dip-on-floor.gif',
  'triceps-bandas': 'triceps/band-side-triceps-extension.gif',
  'face-pull': 'delts/cable-kneeling-rear-delt-row-with-rope-male.gif',
  'pajaro': 'delts/dumbbell-reverse-fly.gif',
  'aperturas-bandas': 'delts/band-reverse-fly.gif',
  'ytw': 'delts/dumbbell-lying-rear-lateral-raise.gif',
  'plancha': 'abs/power-point-plank.gif',
  'dead-bug': 'abs/dead-bug.gif',
  'elevacion-piernas': 'abs/hanging-leg-raise.gif',
  'crunch-polea': 'abs/cable-kneeling-crunch.gif',
  'plancha-lateral': 'abs/bodyweight-incline-side-plank.gif',
  'burpees': 'cardio/burpee.gif',
  'escaladores': 'cardio/mountain-climber.gif',
  'jumping-jacks': 'cardio/jack-jump-male.gif',
  'prensa-horizontal': 'glutes/lever-horizontal-one-leg-press.gif',
  'hack-squat': 'glutes/sled-hack-squat.gif',
  'hip-thrust-maquina': 'glutes/lever-hip-extension-v-2.gif',
  'abductores-maquina': 'abductors/lever-seated-hip-abduction.gif',
  'aductores-maquina': 'adductors/lever-seated-hip-adduction.gif',
  'patada-gluteo': 'glutes/lever-reverse-hyperextension.gif',
  'pec-deck': 'pectorals/machine-inner-chest-press.gif',
  'press-inclinado-maquina': 'pectorals/lever-incline-chest-press.gif',
  'pullover-maquina': 'lats/barbell-bent-arm-pullover.gif',
  'remo-alto-maquina': 'upper-back/lever-reverse-grip-vertical-row.gif',
  'curl-biceps-maquina': 'biceps/smith-machine-bicep-curl.gif',
  'extension-triceps-maquina': 'triceps/smith-machine-incline-tricep-extension.gif',
  'gemelos-sentado': 'calves/lever-seated-calf-raise.gif',
  'crunch-maquina': 'abs/lever-seated-crunch-chest-pad.gif',
};

const ids = new Set(EJERCICIOS.map(e => e.id));
const conocidos = Object.keys(MAPA).filter(id => ids.has(id));
if (conocidos.length !== ids.length) {
  const faltan = [...ids].filter(id => !MAPA[id]);
  console.log('Sin GIF asignado:', faltan.join(', '));
}

const resultados = await Promise.all(conocidos.map(async id => {
  const r = await fetch(BASE + MAPA[id], { method: 'HEAD' });
  return { id, archivo: MAPA[id], ok: r.ok && (r.headers.get('content-type') || '').includes('image') };
}));
const malos = resultados.filter(r => !r.ok);
if (malos.length) console.log('Rutas que no responden:', JSON.stringify(malos, null, 2));

const buenos = resultados.filter(r => r.ok);
const lineas = buenos.map(r => `  '${r.id}': '${r.archivo}',`).join('\n');
fs.writeFileSync('js/gifs.js', `// GIFs animados de Exercise Gym GIFs DB (https://github.com/JahelCuadrado/ExerciseGymGifsDB).\n// Archivo generado por scripts/generar-gifs.mjs. No editar a mano.\nconst BASE = '${BASE}';\nconst GIF_POR_EJERCICIO = {\n${lineas}\n};\n\nexport const urlGif = id => GIF_POR_EJERCICIO[id] ? BASE + GIF_POR_EJERCICIO[id] : null;\nexport const GIF_ATRIBUCION = 'GIFs de Exercise Gym GIFs DB';\nexport const GIF_URL = 'https://github.com/JahelCuadrado/ExerciseGymGifsDB';\n`);
console.log(`Generado js/gifs.js con ${buenos.length} GIFs válidos de ${conocidos.length} asignados.`);