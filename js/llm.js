// =====================================================================
// Coach IA opcional · conexión con un modelo de lenguaje real
// ---------------------------------------------------------------------
// DANTAL es una app estática (no hay servidor propio), así que la clave
// nunca puede venir dentro del código: la pegas tú en Ajustes y se guarda
// SOLO en este navegador, en la clave de dispositivo «mientrenamiento:coachIA».
// No forma parte de tus datos de usuario, no se exporta y no se sincroniza.
//
// Sin clave, el chat sigue funcionando con el motor local (js/coach.js).
// =====================================================================

export const CLAVE_IA = 'mientrenamiento:coachIA';

// Proveedores compatibles con la API de OpenAI (chat/completions).
const COMPATIBLES = {
  openai: { url: 'https://api.openai.com/v1/chat/completions', extraHeaders: {} },
  groq: { url: 'https://api.groq.com/openai/v1/chat/completions', extraHeaders: {} },
  mistral: { url: 'https://api.mistral.ai/v1/chat/completions', extraHeaders: {} },
  openrouter: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    extraHeaders: { 'HTTP-Referer': 'https://daniel111982.github.io/MiEntrenamiento', 'X-Title': 'DANTAL' },
  },
};

export const PROVEEDORES = {
  openai: {
    nombre: 'OpenAI', icono: '🟢', tipo: 'compatible',
    claveUrl: 'https://platform.openai.com/api-keys',
    claveEjemplo: 'sk-…',
    modelos: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1'],
    defecto: 'gpt-4o-mini',
  },
  gemini: {
    nombre: 'Google Gemini', icono: '🔷', tipo: 'gemini',
    claveUrl: 'https://aistudio.google.com/apikey',
    claveEjemplo: 'AIza…',
    modelos: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    defecto: 'gemini-2.0-flash',
  },
  anthropic: {
    nombre: 'Anthropic Claude', icono: '🟠', tipo: 'anthropic',
    claveUrl: 'https://console.anthropic.com/settings/keys',
    claveEjemplo: 'sk-ant-…',
    modelos: ['claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest', 'claude-3-7-sonnet-latest'],
    defecto: 'claude-3-5-haiku-latest',
  },
  groq: {
    nombre: 'Groq', icono: '⚡', tipo: 'compatible',
    claveUrl: 'https://console.groq.com/keys',
    claveEjemplo: 'gsk_…',
    modelos: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
    defecto: 'llama-3.3-70b-versatile',
  },
  openrouter: {
    nombre: 'OpenRouter', icono: '🔀', tipo: 'compatible',
    claveUrl: 'https://openrouter.ai/keys',
    claveEjemplo: 'sk-or-…',
    modelos: ['openai/gpt-4o-mini', 'google/gemini-2.0-flash-001', 'anthropic/claude-3.5-haiku', 'meta-llama/llama-3.3-70b-instruct'],
    defecto: 'openai/gpt-4o-mini',
  },
  mistral: {
    nombre: 'Mistral', icono: '🌬️', tipo: 'compatible',
    claveUrl: 'https://console.mistral.ai/api-keys',
    claveEjemplo: '…',
    modelos: ['mistral-small-latest', 'mistral-large-latest', 'open-mistral-nemo'],
    defecto: 'mistral-small-latest',
  },
};

// ---------------------------------------------------------------------
// Configuración guardada en el dispositivo
// ---------------------------------------------------------------------
export function leerConfig() {
  try {
    const c = JSON.parse(localStorage.getItem(CLAVE_IA));
    if (c && typeof c === 'object' && PROVEEDORES[c.proveedor]) {
      return { proveedor: c.proveedor, clave: String(c.clave || ''), modelo: String(c.modelo || PROVEEDORES[c.proveedor].defecto) };
    }
  } catch { /* configuración ausente o corrupta */ }
  return { proveedor: '', clave: '', modelo: '' };
}

export function guardarConfig({ proveedor, clave, modelo }) {
  const p = PROVEEDORES[proveedor];
  const cfg = {
    proveedor,
    clave: String(clave || '').trim(),
    modelo: String(modelo || '').trim() || p?.defecto || '',
  };
  localStorage.setItem(CLAVE_IA, JSON.stringify(cfg));
  return cfg;
}

export function borrarConfig() { localStorage.removeItem(CLAVE_IA); }

export function proveedorDe(cfg = leerConfig()) { return PROVEEDORES[cfg.proveedor] || null; }

// =====================================================================
// IA integrada del navegador (Gemini Nano) · gratis y sin clave
// ---------------------------------------------------------------------
// Chrome de escritorio (148+) trae un modelo en el propio navegador. No
// necesita clave, no cuesta nada y no envía nada a internet. Solo está en
// escritorio, así que en el móvil el coach sigue funcionando en local.
// =====================================================================
let nanoEstado = 'desconocido'; // desconocido | available | downloadable | downloading | unavailable
let nanoDescargando = false;

const soportaNano = () => typeof globalThis.LanguageModel !== 'undefined';

// Idiomas: el español llegó en Chrome 149; si no está, se prueba sin idioma.
const OPCIONES_ES = {
  expectedInputs: [{ type: 'text', languages: ['es'] }],
  expectedOutputs: [{ type: 'text', languages: ['es'] }],
};

async function consultarNano() {
  if (!soportaNano()) return 'unavailable';
  try {
    const con = await globalThis.LanguageModel.availability(OPCIONES_ES);
    if (con !== 'unavailable') return con;
  } catch { /* las opciones de idioma no están soportadas */ }
  try { return await globalThis.LanguageModel.availability(); } catch { return 'unavailable'; }
}

/** Comprueba (y cachea) si el navegador tiene el modelo integrado. */
export async function detectarNano() {
  nanoEstado = await consultarNano();
  return nanoEstado;
}

/** Estado cacheado, para usarlo en el render (sincrónico). */
export const nanoEstadoSync = () => nanoEstado;
export const nanoActivo = () => nanoEstado === 'available';
export const nanoDescargandoAhora = () => nanoDescargando;

// Crea una sesión del modelo integrado (la primera vez, dispara la descarga).
async function crearSesionNano(initialPrompts, onProgreso) {
  if (!soportaNano()) throw new Error('Este navegador no tiene IA integrada.');
  const base = {
    monitor(m) {
      if (!onProgreso) return;
      m.addEventListener('downloadprogress', e => onProgreso({ loaded: e.loaded, total: e.total }));
    },
  };
  if (initialPrompts) base.initialPrompts = initialPrompts;
  let ultimo;
  for (const o of [{ ...base, ...OPCIONES_ES }, base]) {
    try { return await globalThis.LanguageModel.create(o); } catch (e) { ultimo = e; }
  }
  throw ultimo || new Error('No he podido iniciar la IA del navegador.');
}

/**
 * Descarga y activa la IA integrada del navegador (a petición del usuario).
 * @returns {Promise<{ok:boolean, error?:string}>}
 */
export async function activarNano(onProgreso) {
  if (nanoDescargando) return { ok: false, error: 'La descarga ya está en marcha.' };
  nanoDescargando = true;
  try {
    const sesion = await crearSesionNano(null, onProgreso);
    sesion.destroy?.();
    nanoEstado = 'available';
    return { ok: true };
  } catch (e) {
    nanoEstado = await consultarNano();
    return { ok: false, error: e?.message || 'No he podido activar la IA del navegador.' };
  } finally {
    nanoDescargando = false;
  }
}

async function chatearNano({ mensajes, contexto, onProgreso }) {
  const recientes = mensajes.slice(-8);
  const sesion = await crearSesionNano([
    { role: 'system', content: instrucciones(contexto) },
    ...recientes.slice(0, -1).map(m => ({ role: m.rol, content: m.texto })),
  ], onProgreso);
  try {
    const salida = await sesion.prompt(recientes[recientes.length - 1].texto);
    const texto = String(salida || '').trim();
    if (!texto) throw new Error('El modelo integrado no devolvió texto.');
    return texto;
  } finally {
    sesion.destroy?.();
  }
}

/** Prueba rápida de la IA integrada del navegador. */
export async function probarNano() {
  if (!soportaNano()) return { ok: false, error: 'Este navegador no tiene IA integrada.' };
  try {
    const sesion = await crearSesionNano([{ role: 'system', content: 'Responde muy breve, en español.' }]);
    const salida = await sesion.prompt('Di solo la palabra: listo');
    sesion.destroy?.();
    return { ok: true, texto: String(salida || '').trim() };
  } catch (e) {
    return { ok: false, error: e?.message || 'La IA del navegador ha fallado.' };
  }
}

// ---------------------------------------------------------------------
// Instrucciones del sistema (quién es y cómo responde)
// ---------------------------------------------------------------------
export function instrucciones(contexto = '') {
  return [
    'Eres DANTAL, el entrenador personal y de nutrición de esta app de entrenamiento.',
    'Hablas siempre en español de España, cercano, claro y directo, tuteando al usuario.',
    'Tu trabajo es explicar CUÁNTO (series, repeticiones, kilos, descanso, calorías) y POR QUÉ (el motivo fisiológico o de método), y proponer ajustes concretos.',
    'Reglas:',
    '- Sé breve: 3-6 frases o una lista corta. Nada de discursos largos.',
    '- Basa todo en los DATOS DEL USUARIO que tienes abajo. Si un dato no está, dilo en vez de inventarlo.',
    '- Distingue siempre el DATO REAL (lo que el usuario ha registrado) de la ESTIMACIÓN (cálculos).',
    '- Da cifras concretas cuando puedas (kg, reps, segundos, kcal, gramos).',
    '- No eres un servicio médico: si hay dolor, lesión o un tema clínico, recomienda parar y consultar a un profesional.',
    '- No prometas resultados ni recomiendes suplementos ni fármacos.',
    '- Usa como mucho **negritas** y listas con "- ". No uses títulos con #.',
    '',
    'DATOS ACTUALES DEL USUARIO:',
    contexto || '(sin datos todavía)',
  ].join('\n');
}

// ---------------------------------------------------------------------
// Llamada al modelo
// ---------------------------------------------------------------------
const normalizar = mensajes => (mensajes || [])
  .filter(m => m && m.texto)
  .map(m => ({ rol: m.rol === 'coach' || m.rol === 'assistant' ? 'assistant' : 'user', texto: String(m.texto) }));

async function pedir(cfg, mensajes, { system, timeoutMs = 45000 } = {}) {
  const p = PROVEEDORES[cfg.proveedor];
  if (!p) throw new Error('Proveedor no configurado.');
  if (!cfg.clave) throw new Error('Falta la clave de la API.');

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    let url, headers, body;

    if (p.tipo === 'gemini') {
      const modelo = cfg.modelo || p.defecto;
      url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent?key=${encodeURIComponent(cfg.clave)}`;
      headers = { 'Content-Type': 'application/json' };
      body = {
        systemInstruction: { parts: [{ text: system }] },
        contents: mensajes.map(m => ({ role: m.rol === 'assistant' ? 'model' : 'user', parts: [{ text: m.texto }] })),
        generationConfig: { temperature: 0.6, maxOutputTokens: 700 },
      };
    } else if (p.tipo === 'anthropic') {
      url = 'https://api.anthropic.com/v1/messages';
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': cfg.clave,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      };
      body = {
        model: cfg.modelo || p.defecto,
        max_tokens: 700,
        system,
        messages: mensajes.map(m => ({ role: m.rol, content: m.texto })),
      };
    } else {
      const c = COMPATIBLES[cfg.proveedor];
      url = c.url;
      headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.clave}`, ...c.extraHeaders };
      body = {
        model: cfg.modelo || p.defecto,
        temperature: 0.6,
        max_tokens: 700,
        messages: [{ role: 'system', content: system }, ...mensajes.map(m => ({ role: m.rol, content: m.texto }))],
      };
    }

    const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: ctrl.signal });
    const txt = await r.text();
    let datos = null;
    try { datos = JSON.parse(txt); } catch { /* respuesta no JSON */ }
    if (!r.ok) {
      const msg = datos?.error?.message || datos?.message || `Error ${r.status}`;
      throw new Error(msg);
    }

    let salida = '';
    if (p.tipo === 'gemini') salida = datos?.candidates?.[0]?.content?.parts?.map(x => x.text).join('') || '';
    else if (p.tipo === 'anthropic') salida = datos?.content?.map(x => x.text).join('') || '';
    else salida = datos?.choices?.[0]?.message?.content || '';
    salida = String(salida).trim();
    if (!salida) throw new Error('El modelo no devolvió texto.');
    return salida;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('El modelo tardó demasiado en responder.');
    if (e instanceof TypeError) throw new Error('No he podido conectar. Comprueba tu conexión o la clave.');
    throw e;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Conversa con el modelo real.
 * @param {object} o
 * @param {Array<{rol:string,texto:string}>} o.mensajes  Historial (sin el sistema).
 * @param {string} o.contexto  Resumen de datos del usuario (resumenParaIA).
 * @param {object} [o.cfg]  Configuración; por defecto, la guardada.
 * @returns {Promise<{ok:boolean, texto?:string, error?:string}>}
 */
export async function chatear({ mensajes, contexto = '', cfg = leerConfig() } = {}) {
  const msgs = normalizar(mensajes);
  if (!msgs.length) return { ok: false, error: 'No hay nada que preguntar.' };

  // 1) Clave propia configurada: es la que manda.
  if (cfg.proveedor && cfg.clave) {
    try {
      const texto = await pedir(cfg, msgs, { system: instrucciones(contexto) });
      return { ok: true, texto, fuente: 'clave' };
    } catch (e) {
      return { ok: false, error: e.message || 'No he podido hablar con el modelo.' };
    }
  }

  // 2) Sin clave: si el navegador trae IA integrada, se usa (gratis, sin salir del dispositivo).
  if (nanoEstado === 'available') {
    try {
      const texto = await chatearNano({ mensajes: msgs, contexto });
      return { ok: true, texto, fuente: 'navegador' };
    } catch (e) {
      return { ok: false, error: e?.message || 'La IA del navegador ha fallado.' };
    }
  }

  return { ok: false, error: 'Configura tu clave en Ajustes → Coach IA.' };
}

/** Comprueba que la clave y el modelo funcionan (mensaje mínimo). */
export async function probar(cfg = leerConfig()) {
  try {
    const texto = await pedir(cfg, [{ rol: 'user', texto: 'Responde solo con la palabra: listo' }], {
      system: 'Eres un asistente de prueba. Responde muy breve.',
      timeoutMs: 30000,
    });
    return { ok: true, texto };
  } catch (e) {
    return { ok: false, error: e.message || 'La prueba ha fallado.' };
  }
}
