// Vídeos de técnica en español para TODOS los ejercicios de DanTal.
// Un vídeo por ejercicio, de canales en español, elegidos y verificados
// (existencia e incrustación) el 17/11/2026 mediante el servicio oEmbed de YouTube.
//
// La clave es el id del ejercicio (ver js/ejercicios.js) y el valor es el
// identificador de YouTube de 11 caracteres (la parte de la URL tras "v=").
// Si algún vídeo deja de estar disponible, basta cambiarlo por otro id.
//
// Un ejercicio propio puede llevar su propio vídeo en `videoCustom`.

export const VIDEOS_TECNICA = {
  // ---- Sentadilla ----
  'sentadilla-barra': 'qsAkuNORgmk',        // Jeremy Ethier en Español · Cómo hacer sentadillas correctamente
  'prensa': 'hl-EJUQ2yuc',                  // Galvistrainer · Prensa para piernas, técnica correcta
  'sentadilla-goblet': 'dB3TCDQFUtQ',       // Vitar Club · Sentadilla goblet, técnica correcta
  'sentadilla-goblet-kb': 'bkuQd3HEOcU',    // Centro Equilibrium · Sentadilla goblet con kettlebell
  'sentadilla-peso': 'YeETM1mffxQ',         // DMC Fitness Center · Sentadilla peso corporal
  'prensa-horizontal': 'D63zdwUzhXQ',       // La Bombilla Saludable · Prensa horizontal, técnica
  'hack-squat': 'D5NAofeaa58',              // ENFAF · Sentadilla hack

  // ---- Bisagra de cadera ----
  'peso-muerto-rumano': 'rjvlSfZ-PQw',      // Fit Generation · Peso muerto rumano paso a paso
  'peso-muerto': '7Sjfm61-HC4',             // Jeremy Ethier en Español · Peso muerto correctamente
  'rumano-mancuernas': 'yxLk9X5C7RU',       // DrVíctorLópez · Peso muerto rumano con mancuernas
  'swing-kb': '12v0lWy_qT0',                // CuídatePlus · Swing de kettlebell
  'puente-gluteo': 'NUFvi-gPojg',           // Fisioterapia Osfivel · Puente de glúteos
  'hip-thrust': 'efe-QObKAZU',              // Dra. Isabel Junio · Empuje de cadera con barra
  'hip-thrust-maquina': 'gdUC0EFGWfQ',      // DrVíctorLópez · Hip thrust en máquina

  // ---- Zancada ----
  'zancada-mancuernas': 'uqvt79Uh4o4',      // Oswal Candela · Zancadas perfectas
  'bulgara': 'Xfa3Ql_NwmE',                 // ATHLEAN-X Español · Sentadilla búlgara, forma correcta
  'zancada-atras': 'iQcb_o9kNiE',           // Pierdeloss90 · Zancada hacia atrás

  // ---- Empuje horizontal (pecho) ----
  'press-banca': 'jlFl7WJ1TzI',             // Jeremy Ethier en Español · Press de banca correctamente
  'press-mancuernas': 'v-oZh21hDyI',        // Fit Generation · Press de pecho con mancuernas
  'press-maquina': 'd-gwsl5BlMQ',           // Vitar Club · Press de pecho en máquina
  'flexiones': 'b2UagYWNErY',               // Blue Man · Cómo hacer flexiones
  'flexiones-bandas': 'PTrOW--0y2k',        // Javier Giménez · Press de pecho con bandas
  'press-inclinado-maquina': 'O1hoMf5FtDQ', // Vitar Club · Press inclinado en máquina

  // ---- Empuje vertical (hombros) ----
  'press-militar': '4I6gCfiIHlw',           // Fit Generation · Press militar con barra
  'press-hombro-mancuernas': 'GELRUlUSxeI', // Dra. Isabel Junio · Press de hombros con mancuernas
  'press-hombro-maquina': 'A20O8ZMn190',    // Fitness Consciente · Press de hombros en máquina
  'pike': 'C0Yrir9kSXQ',                    // Lakbarz Calistenia · Flexiones en pica
  'press-hombro-bandas': 'VZyPv405b6E',     // ARV Trainer · Press de hombro con banda

  // ---- Tirón horizontal (espalda) ----
  'remo-barra': 'zmeGZ4I-C8w',              // Gabriel fitness · Remo con barra, técnica correcta
  'remo-mancuerna': 'Pkr1WW3p05A',          // ATHLEAN-X Español · Remo con mancuerna
  'remo-polea': 'nwdptbhYjTw',              // DrVíctorLópez · Remo sentado en polea
  'remo-maquina': 'FOusO8JMU3Q',            // Fitness Consciente · Remo horizontal en máquina
  'remo-bandas': 'a5YQ-4jm2-U',             // Proet · Remo con banda elástica
  'remo-invertido': 'clJOKVg4Ce8',          // Ninolift · Remo invertido con barra
  'remo-alto-maquina': 'MkHUeSnMUEU',       // Alto Rendimiento · Remo al cuello para trapecios

  // ---- Tirón vertical (espalda) ----
  'dominadas': 'ZZbQ8x9BW4U',               // Oswal Candela · Dominadas perfectas en 3 pasos
  'jalon': 'EO9AmI-bu_0',                   // Fit Generation · Jalón al pecho
  'jalon-bandas': 'cX1AoSUeIwg',            // Proet · Jalón dorsal con banda elástica
  'pullover-mancuerna': 'NfCTdUmWYx0',      // Fran Osés · Pullover con mancuerna
  'pullover-maquina': 'IgA67VlbiGc',        // Grizzly Performance · Pullover en máquina
  'superman': 'C6j6bza795E',                // Calistenia para principiantes · Superman en el suelo

  // ---- Cuádriceps ----
  'extension-cuadriceps': 'GMFFZnDz6wE',    // Malagaentrena · Máquina de cuádriceps paso a paso
  'sentadilla-pared': '4W6u3Q_Nj2s',        // Vitar Club · Sentadilla isométrica en pared

  // ---- Femoral ----
  'curl-femoral': 'CBCPBnMzsMI',            // Vitar Club · Curl femoral sentado en máquina
  'curl-femoral-fitball': 'F_SEiWLbMGY',    // Michael Romero · Curl femoral con fitball

  // ---- Gemelos ----
  'gemelos-pie': 'XvHhG4E4tDo',            // Manuel Escalera · Gemelos de pie
  'gemelos-maquina': 'HObKQtrmU9g',         // Manuel Escalera · Gemelos en máquina
  'gemelos-sentado': 'rfkYC-mbQus',         // Vitar Club · Gemelos sentado en máquina

  // ---- Pecho (aislamiento) ----
  'aperturas-mancuernas': 'OrlXQdNwNwM',    // Zonapablo · Aperturas de pecho con mancuernas
  'cruce-poleas': 'WNtBIde3Qks',            // ATHLEAN-X Español · Cruce de poleas
  'flexiones-diamante': 'NO3fnbQr5nk',      // EresFitness · Flexiones diamante
  'pec-deck': 'StdxZNWZeUI',                // Fitness Consciente · Pec deck en máquina

  // ---- Hombro lateral ----
  'elevaciones-laterales': 'hgLpdwMtEEs',   // Jesús López Trainer · Elevaciones laterales
  'laterales-polea': 'jp070OTX3pA',         // Trainologym · Elevaciones laterales en polea
  'laterales-bandas': 'eLQy1G8EaXM',        // Magic Trainer DO · Elevaciones laterales con bandas

  // ---- Bíceps ----
  'curl-barra': 'oHO6dV7aQbE',              // Powerexplosive · Curl de bíceps con barra
  'curl-mancuernas': 'qERAhN-qpaU',         // Guillermo Fernández · Curl de bíceps con mancuernas
  'curl-polea': 'lI5r6DnQhC4',              // Fitness Consciente · Curl de bíceps en polea
  'curl-bandas': 'eBXEQ3v8fSY',             // Adrian Estrada · Curl de bíceps con bandas
  'curl-toalla': 'MTdYNFd3Gzg',             // A10 Entrenamiento Personal · Curl isométrico con toalla
  'curl-biceps-maquina': 'gqLp6MFRYgI',     // Vitar Club · Curl de bíceps en máquina

  // ---- Tríceps ----
  'extension-triceps-polea': 'HAS8uy73HqM', // Galvistrainer · Extensión de tríceps en polea
  'press-frances': 'fQ-KB40W3d8',           // Guillermo Fernández · Tríceps con mancuerna sobre la cabeza
  'fondos-banco': 'H6r0fh2-YNU',            // Javi NewBody · Fondos en banco para tríceps
  'triceps-bandas': 'opcU-5QUwxc',          // Ejercita-T Valencia · Extensión de tríceps con banda
  'extension-triceps-maquina': 'w8SgkepYfME', // Pro Club Panamá · Máquina de extensión de tríceps

  // ---- Hombro posterior ----
  'face-pull': 'X-xCQ1gh-kA',               // HSNstore · Face pull correctamente
  'pajaro': '24z3h_bZ7Zo',                  // Manuel Escalera · Pájaros con mancuernas
  'aperturas-bandas': 'dGf0e8XriNc',        // Malagaentrena · Apertura posterior con bandas
  'ytw': 'rGpqCrupSGA',                     // sintora · Elevación Y-T-W boca abajo

  // ---- Core ----
  'plancha': 'hAqEhJb9oDs',                 // Coach Bruno Reyes · Plancha abdominal
  'dead-bug': 'XkTtXA3-IqU',                // Proet · Dead bug o bicho muerto
  'elevacion-piernas': '_QMu7MSAYQg',       // Sergio Tejeda · Elevación de piernas colgado
  'crunch-polea': 'ui3iEsYbXtI',            // Galvistrainer · Crunch en polea
  'plancha-lateral': '45t3tTcRcKE',         // APTA Vital Sport · Plancha lateral
  'crunch-maquina': 'NpCfRO6RCl0',          // Pro Club Panamá · Máquina de abdominal crunch

  // ---- Metabólico ----
  'burpees': 'awbFx6HqWns',                 // Runnea · Cómo hacer burpees correctamente
  'escaladores': '_0rXcBZjd7w',             // Meli Cárdenas · Escaladores / mountain climbers
  'jumping-jacks': '8cLAFjNtjDU',           // CarolMartinez.fitness · Saltos de tijera

  // ---- Máquinas guiadas (glúteos) ----
  'abductores-maquina': '-g5AF8wA740',      // Fitness Consciente · Abductores en máquina
  'aductores-maquina': 'udHXS4AD2iI',       // Vitar Club · Aductores en máquina
  'patada-gluteo': 'RT5ZuVCy5Ac',           // Zonapablo · Patada de glúteo en máquina
};

/**
 * Identificador de YouTube incrustable del vídeo de técnica de un ejercicio.
 * Prioriza el vídeo propio del usuario (`videoCustom`) y, si no, el catálogo.
 * Devuelve null cuando no hay un identificador válido de 11 caracteres.
 */
export function videoEjercicio(ej) {
  if (!ej) return null;
  const v = (ej.videoCustom && String(ej.videoCustom).trim()) || VIDEOS_TECNICA[ej.id] || '';
  return /^[A-Za-z0-9_-]{11}$/.test(v) ? v : null;
}
