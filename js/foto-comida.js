// Análisis nutricional de comidas por fotografía (FASE 8).
//
// Límites deliberados de este módulo:
//  - La cámara solo se abre cuando la persona pulsa el botón. La imagen vive
//    en memoria (blob + object URL) y se libera al descartar, cancelar,
//    reemplazar, cerrar o guardar. Nunca se escribe en localStorage/IndexedDB.
//  - El contrato actual de coach-ia (y de llm.js) transporta SOLO texto. No
//    existe servicio de visión autorizado: este módulo NO simula un análisis,
//    NO envía la imagen y NO inventa alimentos ni cantidades. Si en el futuro
//    se autoriza un backend multimodal, basta con pasar `analizarImagen` desde
//    app.js; mientras tanto el paso de IA informa de la limitación y permite
//    identificar los alimentos a mano.
//  - Todos los cálculos salen de alimentos.js: macrosDe, macrosEntrada,
//    microsEntrada, sumarMacros, sumarMicros y aporteNutricional (clasificación
//    de lo declarado, sin calcular).
import {
  COMIDAS, alimentoPorId, buscarAlimentos, macrosDe, macrosEntrada,
  microsEntrada, sumarMacros, sumarMicros,
} from './alimentos.js';
import { aporteNutricional } from './informe-nutricion.js';

export const MAX_BYTES = 12 * 1024 * 1024;
export const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_LADO = 1400;
const CALIDAD = 0.82;
const MACROS = [
  ['kcal', 'Energía', 'kcal'], ['prot', 'Proteínas', 'g'], ['carbs', 'Hidratos', 'g'],
  ['grasa', 'Grasas', 'g'], ['fibra', 'Fibra', 'g'],
];
const CONFIANZAS = [
  ['alta', 'Alta · alimento reconocible'],
  ['probable', 'Probable · hipótesis visual'],
  ['desconocido', 'No verificable'],
];
const CANTIDADES = [
  ['estimada', 'Cantidad estimada'],
  ['confirmada', 'Cantidad confirmada por ti'],
];
const PORCIONES = [50, 100, 150, 200];

const texto = v => String(v ?? '').trim();
const numero = v => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const etiquetaMacro = k => MACROS.find(m => m[0] === k)?.[1] || k;

export function crearAnalisisId() {
  return `foto-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ---------------------------------------------------------------------
// Validación y preparación temporal de la imagen (sin persistencia)
// ---------------------------------------------------------------------
export function validarImagen(file) {
  if (!file) return { ok: false, error: 'No se ha seleccionado ninguna imagen.' };
  const tipo = String(file.type || '').toLowerCase();
  if (!tipo.startsWith('image/') || !TIPOS_PERMITIDOS.includes(tipo)) {
    return { ok: false, error: 'Formato no admitido. Usa una imagen JPG, PNG o WebP.' };
  }
  if (!Number(file.size)) return { ok: false, error: 'La imagen está vacía.' };
  if (Number(file.size) > MAX_BYTES) {
    return { ok: false, error: `La imagen es demasiado grande (${Math.ceil(file.size / 1048576)} MB). El límite es 12 MB.` };
  }
  return { ok: true };
}

function imageBitmapALienzo(bitmap) {
  const escala = Math.min(1, MAX_LADO / Math.max(bitmap.width || 1, bitmap.height || 1));
  const w = Math.max(1, Math.round((bitmap.width || 1) * escala));
  const h = Math.max(1, Math.round((bitmap.height || 1) * escala));
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  return canvas;
}

function canvasABlob(canvas) {
  return new Promise((resolve, reject) => {
    if (canvas.toBlob) {
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('No se pudo comprimir la imagen.')), 'image/jpeg', CALIDAD);
    } else {
      try {
        const data = canvas.toDataURL('image/jpeg', CALIDAD);
        const bin = atob(data.split(',')[1]);
        const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
        resolve(new Blob([bytes], { type: 'image/jpeg' }));
      } catch (e) { reject(e); }
    }
  });
}

async function bitmapDesdeArchivo(file) {
  if (typeof createImageBitmap === 'function') return createImageBitmap(file);
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Devuelve un blob comprimido y una object URL. El llamador es responsable de
// llamar a liberarImagen() con el resultado.
export async function prepararImagen(file, origen = 'galería') {
  const valida = validarImagen(file);
  if (!valida.ok) throw new Error(valida.error);
  const bitmap = await bitmapDesdeArchivo(file);
  try {
    const blob = await canvasABlob(imageBitmapALienzo(bitmap));
    return {
      blob, url: URL.createObjectURL(blob), bytes: blob.size,
      nombre: texto(file.name) || 'foto-comida', origen,
    };
  } finally {
    if (bitmap.close) bitmap.close();
  }
}

export async function capturarDeVideo(video, origen = 'cámara') {
  if (!video || !video.videoWidth || !video.videoHeight) throw new Error('La cámara aún no ha entregado una imagen. Inténtalo de nuevo.');
  const canvas = document.createElement('canvas');
  const escala = Math.min(1, MAX_LADO / Math.max(video.videoWidth, video.videoHeight));
  canvas.width = Math.max(1, Math.round(video.videoWidth * escala));
  canvas.height = Math.max(1, Math.round(video.videoHeight * escala));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const blob = await canvasABlob(canvas);
  return { blob, url: URL.createObjectURL(blob), bytes: blob.size, nombre: 'foto-camara.jpg', origen };
}

export function liberarImagen(foto) {
  if (foto?.url) {
    try { URL.revokeObjectURL(foto.url); } catch (_) { /* nada */ }
  }
}

export function mensajeErrorCamara(err) {
  const nombre = String(err?.name || err?.message || '');
  if (/NotAllowedError|PermissionDeniedError|SecurityError/i.test(nombre)) {
    return 'Permiso de cámara denegado. Puedes elegir una foto de la galería o revisar los permisos del navegador.';
  }
  if (/NotFoundError|DevicesNotFoundError|OverconstrainedError/i.test(nombre)) {
    return 'No hay una cámara disponible en este dispositivo. Puedes usar la galería.';
  }
  if (/NotReadableError|TrackStartError|AbortError/i.test(nombre)) {
    return 'La cámara está ocupada o no se ha podido iniciar. Ciérrala en otra app e inténtalo de nuevo.';
  }
  return 'No se ha podido abrir la cámara. Puedes elegir una foto de la galería.';
}

// ---------------------------------------------------------------------
// Cálculo: exclusivamente con alimentos.js
// ---------------------------------------------------------------------
export function snapshotDe(alimento) {
  const out = {};
  for (const k of ['kcal', 'prot', 'carbs', 'grasa', 'fibra', 'azucares', 'saturada', 'sal', 'sodio']) {
    const v = Number(alimento?.[k]);
    if (alimento && k in alimento && alimento[k] != null && Number.isFinite(v)) out[k] = v;
  }
  return out;
}

// Construye una entrada del Diario autocontenida. Si el alimento no está en
// el catálogo NO se inventa: se devuelve null y se avisa en la interfaz.
export function entradaDe(ingrediente, opciones = {}) {
  const resolver = opciones.resolver || alimentoPorId;
  const alimento = resolver(ingrediente?.alimentoId);
  if (!alimento) return null;
  const gramos = numero(ingrediente?.gramos);
  const macros100 = snapshotDe(alimento);
  return {
    tipoEntrada: 'alimento',
    analisisId: opciones.analisisId || '',
    id: alimento.id,
    alimentoId: alimento.id,
    nombre: texto(ingrediente?.nombre) || alimento.nombre,
    gramos,
    marca: texto(alimento.marca),
    ean: texto(alimento.ean),
    fuente: texto(alimento.fuente || alimento.origen || 'catálogo DANTAL'),
    origen: 'analisis_fotografico',
    confianzaIdentificacion: CONFIANZAS.some(c => c[0] === ingrediente?.confianza) ? ingrediente.confianza : 'alta',
    cantidadTipo: CANTIDADES.some(c => c[0] === ingrediente?.cantidadTipo) ? ingrediente.cantidadTipo : (gramos ? 'confirmada' : 'estimada'),
    preparacion: texto(opciones.preparacion),
    ingredientesOcultos: texto(opciones.ingredientesOcultos),
    macros100,
    micros100: { ...(alimento.micros100 || {}) },
    snapshot: {
      porGramos: gramos,
      declaradoEn: texto(alimento.fuente || alimento.origen || 'catálogo DANTAL'),
      macros: macrosDe(macros100, gramos),
      micros: microsEntrada({ macros100, micros100: { ...(alimento.micros100 || {}) }, gramos }),
    },
  };
}

// Suma solo nutrientes declarados. Los ausentes se listan como no disponibles
// y se muestran como «—» en la interfaz: nunca se presentan como cero.
export function totalesDe(entradas = []) {
  const lista = (entradas || []).filter(Boolean);
  const declaradas = new Set();
  const microDeclarados = new Set();
  for (const e of lista) {
    for (const k of aporteNutricional(e).macros) declaradas.add(k);
    for (const k of Object.keys(e.macros100 || {})) {
      if (Number.isFinite(Number(e.macros100[k]))) declaradas.add(k);
    }
    for (const k of Object.keys(e.micros100 || {})) {
      if (Number.isFinite(Number(e.micros100[k]))) microDeclarados.add(k);
    }
  }
  const macros = {};
  for (const [k] of MACROS) {
    const partes = lista.filter(e => k in (e.macros100 || {})).map(e => macrosDe(e.macros100, e.gramos));
    if (partes.length) macros[k] = sumarMacros(partes)[k];
  }
  const microsall = lista.filter(e => Object.keys(e.micros100 || {}).length).map(microsEntrada);
  const micros = sumarMicros(microsall);
  const noDisponible = MACROS.filter(([k]) => !declaradas.has(k)).map(([k, nombre]) => nombre);
  const estados = lista.map(aporteNutricional).map(a => a.estado);
  return {
    macros, micros, noDisponible,
    estado: !lista.length ? 'desconocido'
      : estados.includes('desconocido') ? 'desconocido'
        : estados.includes('parcial') || noDisponible.length ? 'parcial' : 'conocido',
  };
}

// ---------------------------------------------------------------------
// Interfaz
// ---------------------------------------------------------------------
let api = null;
let ui = null;
let delegado = false;

function esc(s) { return api?.esc ? api.esc(s) : texto(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
const fmtDec = v => api?.fmtDec ? api.fmtDec(v) : String(v ?? '');
const fmtNum = v => api?.fmtNum ? api.fmtNum(v) : String(Math.round(Number(v) || 0));

function filaVacia() {
  return { alimentoId: '', nombre: '', gramos: '', confianza: 'alta', cantidadTipo: 'confirmada' };
}

function limpiar(recoger = true) {
  if (!ui) return;
  if (ui.stream) {
    try { ui.stream.getTracks().forEach(t => t.stop()); } catch (_) { /* nada */ }
    ui.stream = null;
  }
  if (ui.foto) { liberarImagen(ui.foto); ui.foto = null; }
  ui.video = null;
  if (recoger) ui = null;
}

function cerrar() {
  const avisar = ui?.error;
  limpiar();
  try { api?.cerrarModal?.(); } catch (_) { /* nada */ }
  return avisar;
}

function opcionesComida(seleccionada) {
  return Object.entries(COMIDAS).map(([k, c]) =>
    `<option value="${esc(k)}"${k === seleccionada ? ' selected' : ''}>${esc(c.icono)} ${esc(c.nombre)}</option>`).join('');
}

function catalogoDatalist() {
  let lista = [];
  try { lista = api?.buscarAlimentos?.('') || []; } catch (_) { /* nada */ }
  return `<datalist id="fcCatalogo">${lista.slice(0, 120).map(a =>
    `<option value="${esc(a.nombre)}"></option>`).join('')}</datalist>`;
}

function filaHTML(ing, idx) {
  return `<div class="fc-ing" data-fc-ing data-i="${idx}">
    <div class="fila"><b>Ingrediente ${idx + 1}</b>
      <button type="button" class="icono peq" data-fc-a="quitarIng" data-i="${idx}" title="Quitar este ingrediente">🗑️</button>
    </div>
    <label>Alimento
      <input name="nombre" list="fcCatalogo" autocomplete="off" placeholder="Escribe para buscar en el catálogo" value="${esc(ing.nombre)}">
      <input type="hidden" name="alimentoId" value="${esc(ing.alimentoId)}">
    </label>
    <label>Gramos
      <input type="number" name="gramos" min="0" step="1" inputmode="numeric" placeholder="Sin estimar" value="${esc(ing.gramos)}">
    </label>
    <div class="fc-porciones">${PORCIONES.map(g =>
      `<button type="button" class="chip" data-fc-a="porcion" data-i="${idx}" data-g="${g}">${g} g</button>`).join('')}
      <small class="tenue">porción orientativa</small>
    </div>
    <label>Confianza
      <select name="confianza">${CONFIANZAS.map(([v, t]) =>
        `<option value="${v}"${v === ing.confianza ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>
    </label>
    <label>Cantidad
      <select name="cantidadTipo">${CANTIDADES.map(([v, t]) =>
        `<option value="${v}"${v === ing.cantidadTipo ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>
    </label>
    <p class="tenue fc-resolver" hidden>Alimento no encontrado en el catálogo: no se inventarán nutrientes.</p>
  </div>`;
}

function renderPaso() {
  if (!ui || !api) return;
  const error = ui.error ? `<p class="aviso">⚠️ ${esc(ui.error)}</p>` : '';
  const acciones = (extra = '') => `<div class="botones fc-acciones">${extra}</div>`;

  if (ui.paso === 'elegir') {
    api.modal(`<h2>📸 Analizar comida por foto</h2>
      <p class="tenue">La imagen se procesa solo mientras dura el análisis: no se guarda en la app, no se sincroniza y se descarta al cancelar. La cámara se abre únicamente cuando pulsa el botón.</p>
      ${error}
      ${acciones(`
        <button class="btn" data-fc-a="camara">📷 Abrir cámara</button>
        <label class="btn sec" for="fcArchivo">🖼️ Elegir de la galería</label>
        <button class="btn sec" data-fc-a="cancelar">Cancelar</button>`)}
      <input id="fcArchivo" class="fc-oculto" type="file" data-fc-archivo accept="image/jpeg,image/png,image/webp,image/*">
      <p class="tenue">JPG, PNG o WebP · máximo 12 MB · se reduce a 1400 px para conservar detalle sin almacenarla.</p>`);
    return;
  }

  if (ui.paso === 'camara') {
    api.modal(`<h2>📷 Tomar la foto</h2>
      <video id="fcVideo" class="fc-video" autoplay muted playsinline></video>
      ${error}
      ${acciones(`
        <button class="btn" data-fc-a="capturar">📸 Capturar</button>
        <button class="btn sec" data-fc-a="repetir">Repetir / elegir otra</button>
        <button class="btn sec" data-fc-a="cancelar">Cancelar</button>`)}`);
    return;
  }

  if (ui.paso === 'preview') {
    const enLinea = navigator.onLine !== false;
    api.modal(`<h2>Previsualización</h2>
      <img class="fc-preview" src="${esc(ui.foto?.url || '')}" alt="Foto de la comida seleccionada">
      <p class="tenue">${esc(ui.foto?.origen || '')} · ${fmtNum(ui.foto?.bytes || 0)} bytes tras comprimir · solo en memoria.</p>
      <label class="fc-consent"><input type="checkbox" data-fc-a="consentir"${ui.consentido ? ' checked' : ''}>
        Autorizo enviar esta imagen a un servicio externo de IA para analizarla.</label>
      <p class="tenue">El contrato actual de <b>coach-ia</b> acepta solo texto: no hay servicio de visión autorizado y todavía no se enviará ninguna imagen.</p>
      ${enLinea ? '' : '<p class="aviso">⚠️ Sin conexión: el análisis con IA requiere red. Puede identificar los alimentos a mano sin perder la foto todavía.</p>'}
      ${error}
      ${acciones(`
        <button class="btn" data-fc-a="analizar">Analizar con IA</button>
        ${ui.sinVision ? '<button class="btn" data-fc-a="manual">Registrar los alimentos a mano</button>' : ''}
        <button class="btn sec" data-fc-a="repetir">Repetir foto</button>
        <button class="btn sec" data-fc-a="cancelar">Descartar y volver al Diario</button>`)}`);
    return;
  }

  if (ui.paso === 'editar') {
    if (!ui.borrador.ingredientes.length) ui.borrador.ingredientes.push(filaVacia());
    api.modal(`<h2>Revisa y corrige antes de guardar</h2>
      <p class="tenue">El servicio de visión aún no está disponible, así que no se han propuesto alimentos automáticamente. Identifique los visibles, corrija gramos y añada los ingredientes ocultos que conozca. El Diario no se modifica hasta confirmar.</p>
      ${error}
      <form id="formFotoComida" class="fc-form">
        <label>Comida <select name="comida">${opcionesComida(ui.borrador.comida)}</select></label>
        ${catalogoDatalist()}
        <div id="fcIngredientes">${ui.borrador.ingredientes.map(filaHTML).join('')}</div>
        <button type="button" class="btn sec" data-fc-a="aniadirIng">＋ Añadir ingrediente</button>
        <label>Preparación aparente / corregida
          <input name="preparacion" maxlength="120" placeholder="Ej.: a la plancha, sin salsa" value="${esc(ui.borrador.preparacion)}">
        </label>
        <label>Ingredientes no visibles o difíciles de distinguir
          <input name="ocultos" maxlength="160" placeholder="Ej.: aceite de oliva, sal" value="${esc(ui.borrador.ocultos)}">
        </label>
        <div id="fcTotales"></div>
        <div class="botones fc-acciones">
          <button type="submit" class="btn"${ui.guardado ? ' disabled' : ''}>Confirmar y guardar en el Diario</button>
          <button type="button" class="btn sec" data-fc-a="cancelar">Cancelar (no guarda)</button>
        </div>
      </form>`);
    actualizarTotales();
  }
}

function leerFormulario() {
  const form = document.getElementById('formFotoComida');
  if (!form || !ui) return;
  ui.borrador.comida = form.querySelector('[name="comida"]')?.value || '';
  ui.borrador.preparacion = form.querySelector('[name="preparacion"]')?.value || '';
  ui.borrador.ocultos = form.querySelector('[name="ocultos"]')?.value || '';
  ui.borrador.ingredientes = [...form.querySelectorAll('[data-fc-ing]')].map(row => ({
    alimentoId: row.querySelector('[name="alimentoId"]')?.value || '',
    nombre: row.querySelector('[name="nombre"]')?.value || '',
    gramos: row.querySelector('[name="gramos"]')?.value || '',
    confianza: row.querySelector('[name="confianza"]')?.value || 'alta',
    cantidadTipo: row.querySelector('[name="cantidadTipo"]')?.value || 'confirmada',
  }));
}

function resolverNombre(nombre) {
  const q = texto(nombre).toLowerCase();
  if (!q) return null;
  let lista = [];
  try { lista = api?.buscarAlimentos?.(q) || []; } catch (_) { /* nada */ }
  return lista.find(a => texto(a.nombre).toLowerCase() === q)
    || lista.find(a => texto(a.nombre).toLowerCase().startsWith(q))
    || null;
}

function entradasDelBorrador() {
  return ui.borrador.ingredientes.map(ing => entradaDe(ing, {
    analisisId: ui.analisisId,
    resolver: id => id ? api.alimentoPorId?.(id) : null,
    preparacion: ui.borrador.preparacion,
    ingredientesOcultos: ui.borrador.ocultos,
  })).filter(e => e && numero(e.gramos));
}

function actualizarTotales() {
  const panel = document.getElementById('fcTotales');
  if (!panel || !ui) return;
  const entradas = entradasDelBorrador();
  const totales = totalesDe(entradas);
  const avisos = [];
  if (ui.borrador.ingredientes.some(i => !i.alimentoId && texto(i.nombre))) {
    avisos.push('Hay alimentos escritos que no se han encontrado en el catálogo: no se inventarán nutrientes para ellos.');
  }
  if (ui.borrador.ingredientes.some(i => i.alimentoId && !numero(i.gramos))) {
    avisos.push('Falta indicar gramos en algún alimento. Elige una porción orientativa o escribe el peso; no se contará como cero.');
  }
  const macrosHTML = MACROS.map(([k, nombre, uni]) => {
    const valor = totales.macros[k];
    return `<span class="fc-macro"><small>${esc(nombre)}</small><b>${valor == null ? '—' : fmtDec(valor)} ${uni}</b></span>`;
  }).join('');
  const microsHTML = Object.entries(totales.micros).filter(([, v]) => Number.isFinite(v))
    .map(([k, v]) => `<span class="fc-macro"><small>${esc(k)}</small><b>${fmtDec(v)}</b></span>`).join('');
  panel.innerHTML = `<h3>Totales calculados con el motor de la app</h3>
    <div class="fc-totales">${macrosHTML}</div>
    ${microsHTML ? `<div class="fc-totales fc-micros">${microsHTML}</div>` : ''}
    ${totales.noDisponible.length ? `<p class="tenue">Datos no disponibles: ${esc(totales.noDisponible.join(', '))}. No se han contado como cero.</p>` : ''}
    ${avisos.length ? `<p class="aviso">⚠️ ${avisos.map(esc).join(' ')}</p>` : ''}`;
}

async function iniciarCamara() {
  if (!ui || ui.paso !== 'camara') return;
  if (!navigator.mediaDevices?.getUserMedia) {
    ui.error = 'Este navegador no ofrece acceso a la cámara. Puede elegir una foto de la galería.';
    ui.paso = 'elegir'; renderPaso(); return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    if (!ui || ui.paso !== 'camara') { stream.getTracks().forEach(t => t.stop()); return; }
    ui.stream = stream;
    const video = document.getElementById('fcVideo');
    if (!video) { stream.getTracks().forEach(t => t.stop()); return; }
    video.srcObject = stream;
    await video.play();
    if (ui) ui.video = video;
  } catch (err) {
    if (!ui) return;
    ui.error = mensajeErrorCamara(err);
    ui.paso = 'elegir';
    renderPaso();
  }
}

function irAEditar() {
  if (!ui) return;
  ui.error = '';
  ui.sinVision = false;
  if (!ui.borrador.ingredientes.length) ui.borrador.ingredientes.push(filaVacia());
  ui.paso = 'editar';
  renderPaso();
}

async function analizar() {
  if (!ui || !ui.foto) return;
  if (navigator.onLine === false) {
    ui.error = 'Sin conexión: el análisis con IA requiere red. Puede identificar los alimentos a mano.';
    renderPaso(); return;
  }
  if (!ui.consentido) {
    ui.error = 'Marque la autorización para enviar la imagen antes de analizarla.';
    renderPaso(); return;
  }
  // No hay adaptador de visión configurado: NO se envía la imagen y NO se
  // presenta ninguna identificación inventada.
  if (typeof api.analizarImagen !== 'function') {
    ui.sinVision = true;
    ui.error = 'El servicio de visión de IA aún no está disponible: el contrato actual de coach-ia solo admite texto. No se ha enviado la imagen. Puede registrar los alimentos a mano.';
    renderPaso(); return;
  }
  try {
    const propuesta = await api.analizarImagen(ui.foto.blob);
    if (!Array.isArray(propuesta)) throw new Error('El analizador no ha devuelto una lista de alimentos.');
    ui.borrador.ingredientes = propuesta.map(p => ({
      alimentoId: texto(p.alimentoId), nombre: texto(p.nombre),
      gramos: p.gramos == null ? '' : String(p.gramos),
      confianza: CONFIANZAS.some(c => c[0] === p.confianza) ? p.confianza : 'probable',
      cantidadTipo: CANTIDADES.some(c => c[0] === p.cantidadTipo) ? p.cantidadTipo : 'estimada',
    }));
    irAEditar();
  } catch (err) {
    ui.error = 'No se ha podido analizar la imagen. Inténtelo de nuevo o registre los alimentos a mano.';
    renderPaso();
  }
}

function guardar() {
  if (!ui || ui.guardado) return;
  leerFormulario();
  const comida = ui.borrador.comida;
  if (!COMIDAS[comida]) { ui.error = 'Elija una comida válida.'; renderPaso(); return; }
  if (!ui.borrador.ingredientes.some(i => i.alimentoId && numero(i.gramos))) {
    ui.error = 'Necesita al menos un alimento del catálogo con gramos indicados. No se guardan cantidades desconocidas como cero.';
    renderPaso(); return;
  }
  let yaGuardado = false;
  try { yaGuardado = (api.entradasDelDia?.(ui.borrador.fecha) || []).some(e => e.analisisId === ui.analisisId); } catch (_) { /* nada */ }
  if (yaGuardado) {
    ui.guardado = true;
    cerrar();
    api.toast?.('Este análisis ya estaba guardado. No se ha duplicado.');
    return;
  }
  const entradas = entradasDelBorrador().filter(e => numero(e.gramos));
  for (const e of entradas) api.anadirEntrada?.(comida, e, ui.borrador.fecha);
  ui.guardado = true;
  cerrar();
  api.toast?.(`${entradas.length} ${entradas.length === 1 ? 'alimento guardado' : 'alimentos guardados'} en ${COMIDAS[comida].nombre}`);
}

function registrarListeners() {
  if (delegado) return;
  delegado = true;

  document.addEventListener('click', ev => {
    if (!ui) return;
    const b = ev.target.closest('[data-fc-a]');
    if (!b) return;
    const a = b.dataset.fcA;
    if (a === 'consentir') { ui.consentido = b.checked; return; }
    ev.preventDefault();
    const idx = Number(b.dataset.i);
    switch (a) {
      case 'camara':
        ui.error = ''; ui.paso = 'camara'; renderPaso(); iniciarCamara(); break;
      case 'capturar':
        (async () => {
          try {
            const foto = await capturarDeVideo(ui.video);
            if (!ui) { liberarImagen(foto); return; }
            if (ui.foto) liberarImagen(ui.foto);
            ui.foto = foto;
            if (ui.stream) { ui.stream.getTracks().forEach(t => t.stop()); ui.stream = null; }
            ui.error = ''; ui.paso = 'preview'; renderPaso();
          } catch (err) {
            ui.error = err.message || 'No se ha podido capturar la foto. Inténtelo de nuevo.';
            renderPaso();
          }
        })();
        break;
      case 'repetir':
        if (ui.foto) { liberarImagen(ui.foto); ui.foto = null; }
        if (ui.stream) { ui.stream.getTracks().forEach(t => t.stop()); ui.stream = null; }
        ui.error = ''; ui.consentido = false; ui.sinVision = false; ui.paso = 'elegir'; renderPaso(); break;
      case 'descartar':
        cerrar(); api.toast?.('Imagen descartada. No se ha guardado nada.'); break;
      case 'cancelar':
        cerrar(); api.toast?.('Análisis cancelado. No se ha guardado nada.'); break;
      case 'analizar': analizar(); break;
      case 'manual': irAEditar(); break;
      case 'aniadirIng':
        leerFormulario(); ui.borrador.ingredientes.push(filaVacia()); ui.error = ''; renderPaso(); break;
      case 'quitarIng':
        leerFormulario();
        if (ui.borrador.ingredientes.length > 1) ui.borrador.ingredientes.splice(idx, 1);
        else ui.borrador.ingredientes = [filaVacia()];
        renderPaso(); break;
      case 'porcion': {
        leerFormulario();
        const fila = document.querySelectorAll('[data-fc-ing]')[idx];
        const input = fila?.querySelector('[name="gramos"]');
        if (input) {
          input.value = b.dataset.g;
          ui.borrador.ingredientes[idx].gramos = b.dataset.g;
          ui.borrador.ingredientes[idx].cantidadTipo = 'estimada';
          const sel = fila.querySelector('[name="cantidadTipo"]');
          if (sel) sel.value = 'estimada';
          actualizarTotales();
        }
        break;
      }
      case 'recalcular': leerFormulario(); actualizarTotales(); break;
      default: break;
    }
  });

  document.addEventListener('change', async ev => {
    const t = ev.target;
    if (!ui) return;
    if (t.dataset?.fcA === 'consentir') { ui.consentido = t.checked; ui.error = ''; renderPaso(); return; }
    if (t.dataset?.fcArchivo !== undefined && t.files?.[0]) {
      const file = t.files[0];
      t.value = '';
      try {
        const foto = await prepararImagen(file, 'galería');
        if (!ui) { liberarImagen(foto); return; }
        if (ui.foto) liberarImagen(ui.foto);
        ui.foto = foto; ui.error = ''; ui.consentido = false; ui.paso = 'preview'; renderPaso();
      } catch (err) {
        ui.error = err.message || 'No he podido leer esa imagen.';
        if (ui.paso !== 'preview') ui.paso = 'elegir';
        renderPaso();
      }
      return;
    }
    if (t.form?.id === 'formFotoComida') {
      if (t.name === 'nombre') {
        const fila = t.closest('[data-fc-ing]');
        const oculto = fila?.querySelector('[name="alimentoId"]');
        const aviso = fila?.querySelector('.fc-resolver');
        const encontrado = resolverNombre(t.value);
        if (oculto) oculto.value = encontrado?.id || '';
        if (aviso) aviso.hidden = !texto(t.value) || Boolean(encontrado);
      }
      leerFormulario(); actualizarTotales();
    }
  });

  document.addEventListener('input', ev => {
    if (!ui) return;
    if (ev.target.form?.id === 'formFotoComida') { leerFormulario(); actualizarTotales(); }
  });

  document.addEventListener('submit', ev => {
    if (!ui || ev.target.id !== 'formFotoComida') return;
    ev.preventDefault();
    guardar();
  });

  const dialog = document.getElementById('modal');
  dialog?.addEventListener('close', () => { if (ui) limpiar(); });
  dialog?.addEventListener('cancel', () => { if (ui) limpiar(); });
}

export function configurarFotoComidaUI(config = {}) {
  api = config;
  registrarListeners();
  return { abrir: abrirFotoComida };
}

export function abrirFotoComida({ comida = '', fecha = null } = {}) {
  if (!api) return false;
  limpiar();
  const hoy = api.hoy?.();
  ui = {
    paso: 'elegir', foto: null, stream: null, video: null, consentido: false,
    sinVision: false, guardado: false, error: '', analisisId: crearAnalisisId(),
    borrador: {
      comida: COMIDAS[comida] ? comida : '', fecha: fecha || hoy || '',
      ingredientes: [], preparacion: '', ocultos: '',
    },
  };
  renderPaso();
  return true;
}
