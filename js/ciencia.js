// «Entender tu sesión»: ciencia y método.
// Explica por qué cada sesión está montada como está y enlaza los estudios que lo respaldan.
// Todo el texto es divulgativo; las referencias apuntan a PubMed (revisión por pares).
import { porId } from './ejercicios.js';
import { OBJETIVOS, METODOS, fase, duracionEstimada } from './generador.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------------------------------------------------------------------
// Estudios citados (autor, título, revista, año y PMID verificado).
// ---------------------------------------------------------------------
export const ESTUDIOS = {
  orden: { autores: 'Simão R, de Salles BF, et al.', titulo: 'Exercise order in resistance training', revista: 'Sports Medicine', anio: 2012, pmid: '22292516' },
  orden2: { autores: 'Simão R, Farinatti Pde T, et al.', titulo: 'Influence of exercise order on the number of repetitions performed and perceived exertion during resistance exercises', revista: 'Journal of Strength and Conditioning Research', anio: 2005, pmid: '15705026' },
  secuencia: { autores: 'Cormier P, Freitas TT, et al.', titulo: 'Within Session Exercise Sequencing During Programming for Complex Training', revista: 'Sports Medicine', anio: 2022, pmid: '35816233' },
  aislamiento: { autores: 'Mannarino P, Matta T, et al.', titulo: 'Single-Joint Exercise Results in Higher Hypertrophy of Elbow Flexors Than Multijoint Exercise', revista: 'Journal of Strength and Conditioning Research', anio: 2021, pmid: '31268995' },
  interferencia: { autores: 'Eddens L, van Someren K, et al.', titulo: 'The Role of Intra-Session Exercise Sequence in the Interference Effect: A Systematic Review with Meta-Analysis', revista: 'Sports Medicine', anio: 2018, pmid: '28917030' },
  tiempoEficiente: { autores: 'Iversen VM, Norum M, et al.', titulo: 'No Time to Lift? Designing Time-Efficient Training Programs for Strength and Hypertrophy: A Narrative Review', revista: 'Sports Medicine', anio: 2021, pmid: '34125411' },
  descansoLargo: { autores: 'Schoenfeld BJ, Pope ZK, et al.', titulo: 'Longer Interset Rest Periods Enhance Muscle Strength and Hypertrophy in Resistance-Trained Men', revista: 'Journal of Strength and Conditioning Research', anio: 2016, pmid: '26605807' },
  descansoFuerza: { autores: 'Grgic J, Schoenfeld BJ, et al.', titulo: 'Effects of Rest Interval Duration in Resistance Training on Measures of Muscular Strength: A Systematic Review', revista: 'Sports Medicine', anio: 2018, pmid: '28933024' },
  descansoRevision: { autores: 'de Salles BF, Simão R, et al.', titulo: 'Rest interval between sets in strength training', revista: 'Sports Medicine', anio: 2009, pmid: '19691365' },
  calentamiento: { autores: 'McGowan CJ, Pyne DB, et al.', titulo: 'Warm-Up Strategies for Sport and Exercise: Mechanisms and Applications', revista: 'Sports Medicine', anio: 2015, pmid: '26400696' },
  calentamientoMeta: { autores: 'Fradkin AJ, Zazryn TR, Smoliga JM', titulo: 'Effects of warming-up on physical performance: a systematic review with meta-analysis', revista: 'Journal of Strength and Conditioning Research', anio: 2010, pmid: '19996770' },
  falloHipertrofia: { autores: 'Refalo MC, Helms ER, et al.', titulo: 'Influence of Resistance Training Proximity-to-Failure on Skeletal Muscle Hypertrophy: A Systematic Review with Meta-analysis', revista: 'Sports Medicine', anio: 2023, pmid: '36334240' },
  falloDosis: { autores: 'Robinson ZP, Pelland JC, et al.', titulo: 'Exploring the Dose-Response Relationship Between Estimated Resistance Training Proximity to Failure, Strength Gain, and Muscle Hypertrophy: A Series of Meta-Regressions', revista: 'Sports Medicine', anio: 2024, pmid: '38970765' },
  falloFuerza: { autores: 'Grgic J, Schoenfeld BJ, et al.', titulo: 'Effects of resistance training performed to repetition failure or non-failure on muscular strength and hypertrophy: A systematic review and meta-analysis', revista: 'Journal of Sport and Health Science', anio: 2022, pmid: '33497853' },
  rir: { autores: 'Zourdos MC, Jo E, et al.', titulo: 'Novel Resistance Training-Specific Rating of Perceived Exertion Scale Measuring Repetitions in Reserve', revista: 'Journal of Strength and Conditioning Research', anio: 2016, pmid: '26049792' },
  tecnica: { autores: 'Androulakis Korakakis P, Wolf M, et al.', titulo: 'Optimizing Resistance Training Technique to Maximize Muscle Hypertrophy: A Narrative Review', revista: 'Journal of Functional Morphology and Kinesiology', anio: 2023, pmid: '38249086' },
  volumen: { autores: 'Schoenfeld BJ, Ogborn D, Krieger JW', titulo: 'Dose-response relationship between weekly resistance training volume and increases in muscle mass: A systematic review and meta-analysis', revista: 'Journal of Sports Sciences', anio: 2017, pmid: '27433992' },
  frecuencia: { autores: 'Schoenfeld BJ, Grgic J, Krieger J', titulo: 'How many times per week should a muscle be trained to maximize muscle hypertrophy? A systematic review and meta-analysis', revista: 'Journal of Sports Sciences', anio: 2019, pmid: '30558493' },
  sobrecarga: { autores: 'Plotkin D, Coleman M, et al.', titulo: 'Progressive overload without progressing load? The effects of load or repetition progression on muscular adaptations', revista: 'PeerJ', anio: 2022, pmid: '36199287' },
  periodizacion: { autores: 'Moesgaard L, Beck MM, et al.', titulo: 'Effects of Periodization on Strength and Muscle Hypertrophy in Volume-Equated Resistance Training Programs: A Systematic Review and Meta-analysis', revista: 'Sports Medicine', anio: 2022, pmid: '35044672' },
  descarga: { autores: 'Bosquet L, Montpetit J, et al.', titulo: 'Effects of tapering on performance: a meta-analysis', revista: 'Medicine & Science in Sports & Exercise', anio: 2007, pmid: '17762369' },
  recuperacion: { autores: 'Vann CG, Haun CT, et al.', titulo: 'Molecular Differences in Skeletal Muscle After 1 Week of Active vs. Passive Recovery From High-Volume Resistance Training', revista: 'Journal of Strength and Conditioning Research', anio: 2021, pmid: '34138821' },
  sintesis: { autores: 'Damas F, Phillips S, et al.', titulo: 'A review of resistance training-induced changes in skeletal muscle protein synthesis and their contribution to hypertrophy', revista: 'Sports Medicine', anio: 2015, pmid: '25739559' },
  mecanismos: { autores: 'Schoenfeld BJ', titulo: 'The mechanisms of muscle hypertrophy and their application to resistance training', revista: 'Journal of Strength and Conditioning Research', anio: 2010, pmid: '20847704' },
  proteina: { autores: 'Morton RW, Murphy KT, et al.', titulo: 'A systematic review, meta-analysis and meta-regression of the effect of protein supplementation on resistance training-induced gains in muscle mass and strength in healthy adults', revista: 'British Journal of Sports Medicine', anio: 2018, pmid: '28698222' },
  sueno: { autores: 'Craven J, McCartney D, et al.', titulo: 'Effects of Acute Sleep Loss on Physical Performance: A Systematic and Meta-Analytical Review', revista: 'Sports Medicine', anio: 2022, pmid: '35708888' },
};

const urlEstudio = pmid => `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;

// Cita corta dentro del texto: [Autor Año] enlazando a PubMed.
const cita = clave => {
  const e = ESTUDIOS[clave];
  if (!e) return '';
  const partes = ((e.autores.split(',')[0] || '').trim()).split(/\s+/).filter(Boolean);
  // Apellidos con partícula (de Salles, van Someren…) incluyen la segunda palabra.
  const autor = partes[0] && partes[0][0] === partes[0][0].toLowerCase() && partes[1] ? `${partes[0]} ${partes[1]}` : (partes[0] || '');
  return `<a class="cita" href="${urlEstudio(e.pmid)}" target="_blank" rel="noopener noreferrer"
    title="${esc(e.autores)} — ${esc(e.titulo)} (${esc(e.revista)}, ${e.anio})">${esc(autor)} ${e.anio}</a>`;
};
const citas = (...claves) => `<div class="citas"><span class="citas-lbl">🔬 Estudios:</span>${claves.map(cita).join('')}</div>`;

// Estudios agrupados por tema para la sección final de referencias.
const TEMAS_ESTUDIOS = [
  { tema: 'Orden y organización de la sesión', claves: ['orden', 'orden2', 'secuencia', 'aislamiento', 'interferencia', 'tiempoEficiente'] },
  { tema: 'Descansos entre series', claves: ['descansoLargo', 'descansoFuerza', 'descansoRevision'] },
  { tema: 'Calentamiento', claves: ['calentamiento', 'calentamientoMeta'] },
  { tema: 'Esfuerzo, fallo y técnica', claves: ['falloHipertrofia', 'falloDosis', 'falloFuerza', 'rir', 'tecnica'] },
  { tema: 'Volumen, frecuencia y progresión', claves: ['volumen', 'frecuencia', 'sobrecarga'] },
  { tema: 'Periodización y descarga', claves: ['periodizacion', 'descarga'] },
  { tema: 'Recuperación, proteína y sueño', claves: ['recuperacion', 'sintesis', 'mecanismos', 'proteina', 'sueno'] },
];

const listaEstudios = () => TEMAS_ESTUDIOS.map(g => `
  <h3>${esc(g.tema)}</h3>
  <div class="estudios">${g.claves.filter(k => ESTUDIOS[k]).map(k => {
    const e = ESTUDIOS[k];
    return `<a class="estudio" href="${urlEstudio(e.pmid)}" target="_blank" rel="noopener noreferrer">
      <span class="estudio-ic">📄</span>
      <span class="estudio-t"><b>${esc(e.autores)}</b> — ${esc(e.titulo)}. <i>${esc(e.revista)}</i>, ${e.anio}. <small>Ver en PubMed · PMID ${e.pmid} ›</small></span>
    </a>`;
  }).join('')}</div>`).join('');

// ---------------------------------------------------------------------
// Datos derivados de la sesión concreta.
// ---------------------------------------------------------------------
const tipoEj = e => e.metodo === 'tabata' ? 'Tabata' : porId[e.id]?.compuesto ? 'Compuesto' : porId[e.id]?.patron === 'core' ? 'Core' : 'Aislamiento';

// Nº de series: en el programa es un número; en una sesión en curso es la lista de series.
const nSeries = e => Array.isArray(e.series) ? e.series.length : (e.series || 0);

function objetivoLocal(e) {
  if (e.metodo === 'tabata') return '8 × 20 s / 10 s';
  if (e.tipo === 'tiempo') return `${e.repsMin || nSeries(e)} s`;
  if (e.repsMin == null && e.repsMax == null) return `${nSeries(e) || '?'} series`;
  const r = e.repsMin === e.repsMax ? `${e.repsMin}` : `${e.repsMin}–${e.repsMax}`;
  return `${r} reps${e.metodo === 'dropset' ? ' + drop' : ''}`;
}

const textosFase = {
  Acumulación: 'toca más volumen: repeticiones algo más altas y descansos un poco más cortos. Es la fase para construir una base sólida.',
  Intensificación: 'sube la carga y baja un poco las repeticiones. Es la fase donde más fuerza se gana.',
  Realización: 'menos repeticiones, más descanso y la carga más alta. Aquí exprimes el rendimiento al máximo.',
};

function notaFase(f) {
  if (!f) return '';
  const extra = f.descarga
    ? ' Esta semana es de <b>descarga</b>: el programa quita a propósito una serie a cada ejercicio para disipar la fatiga y volver más fuerte.'
    : '';
  return `<div class="ciencia-nota"><b>Estás en la fase de ${esc(f.nombre)} (semana ${f.semana}).</b> ${textosFase[f.nombre] || ''}${extra}</div>`;
}

// ---------------------------------------------------------------------
// Contenido de la página.
// ---------------------------------------------------------------------
/**
 * HTML de «Entender tu sesión» para una sesión concreta.
 * @param {{nombre:string, ejercicios:Array}} sesion  Ejercicios ya prescritos (con series, metodo, tipo, descanso…).
 * @param {object} perfil  Perfil del usuario (objetivo, nivel…).
 * @param {number|null} semana  Semana del ciclo (null en sesiones propias).
 */
export function htmlCiencia(sesion, perfil = {}, semana = null) {
  const objetivo = OBJETIVOS[perfil.objetivo] || OBJETIVOS.musculo;
  const ejs = (sesion.ejercicios || []).filter(e => porId[e.id] || e.id);
  const f = semana ? fase(semana) : null;
  const totalSeries = ejs.reduce((t, e) => t + nSeries(e), 0);
  const duracion = duracionEstimada(ejs.map(e => ({ ...e, series: nSeries(e) })));
  const descansos = ejs.filter(e => e.metodo !== 'tabata' && e.descanso != null).map(e => e.descanso);
  const dMin = descansos.length ? Math.min(...descansos) : 0;
  const dMax = descansos.length ? Math.max(...descansos) : 0;
  const hayCore = ejs.some(e => porId[e.id]?.patron === 'core');
  const hayFinal = ejs.some(e => e.final || e.metodo === 'tabata');
  const conFoco = ejs.some(e => e.foco);
  const metodos = [...new Set(ejs.map(e => e.metodo).filter(m => m && m !== 'normal'))];

  const textoMetodos = metodos.length
    ? metodos.map(m => `<b>${esc(METODOS[m]?.nombre || m)}</b> (${esc(METODOS[m]?.desc || '')})`).join(', ')
    : '<b>series rectas</b> (misma carga en todas las series de trabajo)';

  const filaEj = (e, idx) => {
    const ej = porId[e.id] || {};
    const desc = e.metodo === 'tabata' ? '' : (e.descanso != null ? ` · descanso ${e.descanso} s` : '');
    return `<li>
      <span class="cn">${idx + 1}</span>
      <span class="ct"><b>${esc(ej.nombre || e.id)}</b><small>${tipoEj(e)} · ${nSeries(e) || '?'} × ${objetivoLocal(e)}${desc}</small></span>
      ${e.foco ? '<span class="chip-mini">foco</span>' : ''}
    </li>`;
  };

  return `
  <div class="hero ciencia-hero">
    <p class="eyebrow">🔬 Ciencia y método</p>
    <h2>Entender tu sesión</h2>
    <p>Por qué «${esc(sesion.nombre)}» está montada así: el orden, los descansos, el calentamiento y cómo ajustar el esfuerzo y la recuperación, con la investigación que lo respalda.</p>
    <div class="badges">
      <span class="badge">${objetivo.icono} ${esc(objetivo.nombre)}</span>
      ${f ? `<span class="badge">Semana ${f.semana} · ${esc(f.nombre)}${f.descarga ? ' (descarga)' : ''}</span>` : ''}
      <span class="badge">${totalSeries} series</span>
      <span class="badge">⏱ ~${duracion} min</span>
      <span class="badge">${ejs.length} ejercicios</span>
    </div>
  </div>

  <nav class="ciencia-indice">
    ${[['c-organiza', '🧩', 'Cómo se organiza'], ['c-orden', '📊', 'El orden'], ['c-descansos', '⏱', 'Descansos'],
      ['c-calentamiento', '🔥', 'Calentamiento'], ['c-esfuerzo', '🎯', 'Esfuerzo'], ['c-recuperacion', '🌙', 'Recuperación'],
      ['c-estudios', '🔬', 'Estudios']]
      .map(([id, ic, t]) => `<button class="chip" data-a="cienciaIr" data-sec="${id}">${ic} ${t}</button>`).join('')}
  </nav>

  <section id="c-organiza" class="tarjeta ciencia-sec">
    <h2>🧩 Cómo se organiza tu sesión</h2>
    <p>Una sesión eficaz no es una lista de ejercicios al azar: es una <b>secuencia</b> pensada para que hagas lo más importante cuando estás más fresco. La tuya sigue este esqueleto:</p>
    <ol class="ciencia-flujo">
      <li><b>Calentamiento</b><small>Unos 5 minutos generales y series de aproximación con poco peso en el primer ejercicio.</small></li>
      <li><b>Bloque principal</b><small>Ejercicios compuestos (mueven varios músculos a la vez) con la carga más exigente.</small></li>
      <li><b>Accesorios</b><small>Ejercicios de aislamiento para terminar de trabajar cada músculo.</small></li>
      ${hayCore ? '<li><b>Core</b><small>Abdomen y estabilidad al final, cuando ya no necesitas la máxima concentración.</small></li>' : ''}
      ${hayFinal ? '<li><b>Finalizador metabólico</b><small>Bloque tipo Tabata para subir el gasto calórico y fatigar la zona por completo.</small></li>' : ''}
      <li><b>Vuelta a la calma</b><small>Estiramientos suaves y respiración para bajar pulsaciones.</small></li>
    </ol>
    <h3>El orden real de hoy</h3>
    <ol class="ciencia-lista">${ejs.map(filaEj).join('')}</ol>
    ${citas('tiempoEficiente', 'secuencia')}
  </section>

  <section id="c-orden" class="tarjeta ciencia-sec">
    <h2>📊 El orden de los ejercicios</h2>
    <p>Regla de oro: <b>lo más exigente, primero</b>. Los ejercicios que mueven más músculo y más peso (sentadilla, press, remo, peso muerto…) se hacen al principio, cuando el sistema nervioso está fresco y la técnica es más fiable. Si los dejaras para el final, harías menos repeticiones y con peor forma.</p>
    <div class="ciencia-mini">
      <div><b>1º Compuestos</b><span>Máxima carga y coordinación</span></div>
      <div><b>2º Aislamiento</b><span>Completar el músculo con menos fatiga</span></div>
      <div><b>3º Core y finalizador</b><span>Cerrar la sesión sin comprometer lo importante</span></div>
    </div>
    <h3>La pirámide ascendente</h3>
    <p>«Pirámide ascendente» significa <b>empezar ligero y subir</b>: haces una o dos series de aproximación con poco peso y, en las series de trabajo, cada una pesa un poco más y tiene menos repeticiones. Así calientas el movimiento, acumulas volumen con buena técnica y llegas a las series pesadas sin arriesgar.</p>
    <p>Los métodos que usa esta sesión: ${textoMetodos}.</p>
    ${conFoco ? '<p>Los ejercicios marcados como <span class="chip-mini">foco</span> van primero a propósito: son los músculos que has decidido priorizar y merecen tu mejor energía.</p>' : ''}
    <p class="tenue">Los ejercicios de aislamiento no son «de relleno»: cuando se añaden al final de la sesión también aumentan el tamaño del músculo, y ahí es donde es más seguro acercarse al fallo.</p>
    ${citas('orden', 'orden2', 'secuencia', 'aislamiento', 'interferencia')}
  </section>

  <section id="c-descansos" class="tarjeta ciencia-sec">
    <h2>⏱ Descansos que ayudan a tu sesión</h2>
    <p>Entre serie y serie el músculo recarga su «combustible» inmediato (la fosfocreatina). Si descansas demasiado poco, llegas a la siguiente serie más cansado, haces menos repeticiones y mueves menos peso. Si descansas bien, mantienes la calidad y acumulas más trabajo útil.</p>
    <div class="ciencia-tabla">
      <div><span>Fuerza máxima</span><b>2–3 min</b></div>
      <div><span>Ganar músculo</span><b>1,5–2 min</b></div>
      <div><span>Tonificar / perder grasa</span><b>45–60 s</b></div>
      <div><span>Aislamiento</span><b>algo menos que los compuestos</b></div>
      <div><span>Bloque metabólico / Tabata</span><b>20–30 s</b></div>
    </div>
    <p>En tu sesión los descansos van de <b>${dMin} s</b> a <b>${dMax} s</b>, calculados para tu objetivo (<b>${esc(objetivo.nombre)}</b>): ${esc(objetivo.desc)} Los compuestos descansan más que los accesorios, porque mueven más carga y cansan más.</p>
    <p class="tenue">Puedes cambiar el descanso de cada ejercicio desde la pantalla de la sesión; el botón «sugerido» lo devuelve al valor recomendado.</p>
    ${citas('descansoLargo', 'descansoFuerza', 'descansoRevision')}
  </section>

  <section id="c-calentamiento" class="tarjeta ciencia-sec">
    <h2>🔥 Por qué empezar con el calentamiento</h2>
    <p>Calentar no es perder el tiempo: sube la temperatura del músculo, mejora la velocidad de conducción nerviosa, aumenta el flujo de sangre y prepara articulaciones y tendones. El resultado es que rindes más y te lesionas menos.</p>
    <ol class="ciencia-flujo">
      <li><b>Calentamiento general (3–5 min)</b><small>Cinta, bici o elíptica suave, o movilidad articular. Objetivo: entrar en calor y subir las pulsaciones.</small></li>
      <li><b>Series de aproximación</b><small>1–2 series ligeras del primer ejercicio (sobre el 40–60 % de tu peso de trabajo) para ensayar el patrón sin fatigarte.</small></li>
    </ol>
    <p class="tenue">La duración estimada de tus sesiones (~${duracion} min) ya incluye unos 5 minutos de calentamiento.</p>
    ${citas('calentamiento', 'calentamientoMeta')}
  </section>

  <section id="c-esfuerzo" class="tarjeta ciencia-sec">
    <h2>🎯 Ajusta el esfuerzo: cuánto apretar</h2>
    <p>La clave no es llegar siempre al fallo, sino <b>quedarte cerca</b>. Se mide en «repeticiones en reserva» (RIR): si haces 10 repeticiones y crees que podrías haber hecho 2 más, has trabajado a RIR 2.</p>
    <ul class="ciencia-puntos">
      <li><b>Compuestos: RIR 2–3.</b> Deja margen para no romper la técnica ni acumular fatiga de más.</li>
      <li><b>Aislamiento: RIR 1–2.</b> En la última serie puedes acercarte más al fallo; es seguro y estimula bien el músculo.</li>
      <li><b>Finalizador / Tabata: al máximo</b> dentro del tiempo, sin perder la forma.</li>
    </ul>
    <p>La investigación es clara: entrenar cerca del fallo estimula el músculo de forma parecida a ir al fallo, pero ir al fallo añade mucha más fatiga que luego hay que recuperar. Por eso el programa reserva el fallo para el final y para los ejercicios más seguros.</p>
    <p class="tenue">En la app, cada serie propone un objetivo de repeticiones. Si llegas con buena técnica, pulsa «Serie hecha»; si te sobra mucho, sube un poco el peso la próxima vez.</p>
    ${citas('falloHipertrofia', 'falloDosis', 'falloFuerza', 'rir', 'tecnica')}
  </section>

  <section id="c-recuperacion" class="tarjeta ciencia-sec">
    <h2>🌙 Ajusta la recuperación</h2>
    <p>El músculo no crece mientras entrenas, sino cuando descansas. Estos son los principios que guían tu programa:</p>
    <ul class="ciencia-puntos">
      <li><b>Volumen suficiente.</b> Más series semanales por músculo suponen más crecimiento, hasta un punto. El programa reparte el volumen para que sea alto pero recuperable.</li>
      <li><b>Frecuencia de 2 veces por semana.</b> Repartir el mismo volumen en dos sesiones por músculo suele funcionar mejor que concentrarlo en una sola.</li>
      <li><b>48–72 h entre sesiones del mismo músculo.</b> El indicador de recuperación de la app te dice si un músculo está listo.</li>
      <li><b>Ciclo con descargas.</b> 12 semanas en tres fases (acumulación → intensificación → realización), con la 4ª semana de cada fase más ligera para disipar la fatiga y volver más fuerte.</li>
      <li><b>Proteína y sueño.</b> Alrededor de 1,6 g de proteína por kilo al día y dormir bien son la base para que el entrenamiento se convierta en músculo.</li>
      <li><b>Recuperación activa.</b> Caminar o moverte suave los días de descanso ayuda más que el reposo total.</li>
    </ul>
    ${notaFase(f)}
    ${citas('volumen', 'frecuencia', 'periodizacion', 'descarga', 'recuperacion', 'sintesis', 'mecanismos', 'proteina', 'sueno', 'sobrecarga')}
  </section>

  <section id="c-estudios" class="tarjeta ciencia-sec">
    <h2>🔬 Los estudios</h2>
    <p>Todo lo que explica esta página sale de revisiones y metaanálisis publicados en revistas con revisión por pares. Toca cualquier estudio para leerlo en PubMed.</p>
    ${listaEstudios()}
    <p class="tenue">Esta sección es divulgativa y no sustituye el consejo de un profesional sanitario.</p>
  </section>`;
}
