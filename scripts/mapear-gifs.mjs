// Empareja nuestros 82 ejercicios con los GIFs de Exercise Gym GIFs DB.
// Genera un listado de candidatos para revisar a mano antes de publicar nada.
import fs from 'fs';
import { EJERCICIOS } from '../js/ejercicios.js';

const BASE = 'https://cdn.jsdelivr.net/gh/JahelCuadrado/ExerciseGymGifsDB@v1.1.0';
const api = await (await fetch(`${BASE}/api/en/exercises.json`)).json();
const todos = api.exercises;

const TRAD = {
  sentadilla: 'squat', sentadillas: 'squat', 'peso muerto': 'deadlift', muerto: 'deadlift',
  rumano: 'romanian', barra: 'barbell', mancuerna: 'dumbbell', mancuernas: 'dumbbell',
  polea: 'cable', banda: 'band', bandas: 'band', maquina: 'machine', maquinas: 'machine',
  prensa: 'leg press', zancadas: 'lunge', zancada: 'lunge', bulgara: 'bulgarian',
  'press de banca': 'bench press', banca: 'bench', press: 'press', hombros: 'shoulder',
  militar: 'overhead press', flexiones: 'push up', dominadas: 'pull up', jalon: 'lat pulldown',
  remo: 'row', invertido: 'inverted', pullover: 'pullover', superman: 'superman',
  extension: 'extension', cuadriceps: 'quadriceps', pared: 'wall', femoral: 'hamstring',
  gemelos: 'calf', elevacion: 'raise', elevaciones: 'raise', pie: 'standing', sentado: 'seated',
  aperturas: 'fly', cruce: 'cable fly', cerradas: 'close grip', laterales: 'lateral',
  curl: 'curl', toalla: 'towel', triceps: 'triceps', biceps: 'biceps', fondos: 'dip',
  pajaro: 'reverse fly', plancha: 'plank', 'dead bug': 'dead bug', piernas: 'leg',
  colgado: 'hanging', crunch: 'crunch', burpees: 'burpee', escaladores: 'mountain climber',
  'saltos de tijera': 'jumping jack', horizontal: 'horizontal', hack: 'hack',
  abductores: 'hip abduction', aductores: 'hip adduction', patada: 'kickback',
  'pec deck': 'pec deck', inclinado: 'incline', pecho: 'chest', isométrica: 'isometric',
  deslizante: 'sliding', puente: 'bridge', gluteo: 'glute', 'hip thrust': 'hip thrust',
  facial: 'face pull', 'face pull': 'face pull', peso: 'weighted', corporal: 'bodyweight',
};
const PATRON = {
  sentadilla: 'squat', bisagra: 'hinge deadlift', zancada: 'lunge', empuje_h: 'chest press',
  empuje_v: 'shoulder press', tiron_h: 'row', tiron_v: 'lat pulldown',
  cuadriceps_aisl: 'quadriceps', femoral: 'hamstring', gemelo: 'calf', pecho_aisl: 'chest fly',
  hombro_lat: 'lateral raise', hombro_post: 'rear delt', biceps: 'biceps curl',
  triceps: 'triceps extension', core: 'abdominal', metabolico: 'cardio', gluteos_aisl: 'glute',
};
const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ').trim();
const tokens = s => norm(s).split(' ').filter(Boolean);

function consulta(e) {
  let n = norm(e.nombre);
  for (const [es, en] of Object.entries(TRAD)) n = n.split(es).join(` ${en} `);
  const extra = PATRON[e.patron] || '';
  return [...new Set([...tokens(n), ...tokens(extra)])];
}

function puntuar(e, g) {
  const q = consulta(e);
  const doc = norm(`${g.name} ${g.id} ${g.slug}`);
  const dt = tokens(doc);
  let score = 0;
  for (const t of q) {
    if (dt.includes(t)) score += 3;
    else if (doc.includes(t)) score += 1.2;
  }
  // El orden de las palabras cuenta: «bench press» no es lo mismo que «press bench».
  const frase = q.join(' ');
  if (doc.includes(frase)) score += 5;
  const q2 = q.filter(t => !['the', 'de', 'con'].includes(t)).join(' ');
  if (q2.length > 3 && doc.includes(q2)) score += 3;
  // Penaliza ejercicios con palabras que no tienen nada que ver.
  const ruido = ['stretch', 'yoga', 'cardio', 'jump rope', 'sling', 'nordic', 'archer', 'kipping']
    .filter(w => doc.includes(w) && !frase.includes(w)).length;
  return score - ruido * 1.5;
}

const candidatos = EJERCICIOS.map(e => {
  const orden = todos.map(g => ({ g, s: puntuar(e, g) })).sort((a, b) => b.s - a.s);
  return {
    id: e.id,
    nombre: e.nombre,
    consulta: consulta(e).join(' '),
    opciones: orden.slice(0, 5).map(({ g, s }) => ({
      score: Math.round(s * 10) / 10,
      nombre: g.name,
      archivo: g.file,
      url: g.gifUrl,
    })),
  };
});

fs.writeFileSync('scripts/mapeo-gifs-candidatos.json', JSON.stringify(candidatos, null, 2));
console.log('Generado scripts/mapeo-gifs-candidatos.json');
console.log(candidatos.slice(0, 12).map(c => `${c.id}: ${c.opciones[0].nombre} (${c.opciones[0].score})`).join('\n'));