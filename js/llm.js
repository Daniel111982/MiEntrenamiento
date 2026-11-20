// =====================================================================
// Coach IA opcional · conexión con un modelo de lenguaje real
// ---------------------------------------------------------------------
// DanTal es una app estática (no hay servidor propio), así que la clave
// nunca puede venir dentro del código: la pegas tú en Ajustes y se guarda
// SOLO en este navegador, en la clave de dispositivo «mientrenamiento:coachIA».
// No forma parte de tus datos de usuario, no se exporta y no se sincroniza.
//
// Sin clave, el chat usa la IA del servidor de DanTal (si hay cuenta) y,
// si no, el motor local (js/coach.js). Así siempre hay respuesta.
// =====================================================================
import { consultarCoachIA, haySesionNube } from './nube.js';

export const CLAVE_IA = 'mientrenamiento:coachIA';

// Proveedores compatibles con la API de OpenAI (chat/completions).
const COMPATIBLES = {
  openai: { url: 'https://api.openai.com/v1/chat/completions', extraHeaders: {} },
  groq: { url: 'https://api.groq.com/openai/v1/chat/completions', extraHeaders: {} },
  mistral: { url: 'https://api.mistral.ai/v1/chat/completions', extraHeaders: {} },
  openrouter: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    extraHeaders: { 'HTTP-Referer': 'https://dantal-app.pages.dev', 'X-Title': 'DanTal' },
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

// ---------------------------------------------------------------------
// Instrucciones del sistema (quién es y cómo responde)
// ---------------------------------------------------------------------
export function instrucciones(contexto = '') {
  return [
    'Eres DanTal, el entrenador personal y de nutrición de esta app de entrenamiento.',
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
 * @returns {Promise<{ok:boolean, texto?:string, error?:string, fuente?:string}>}
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

  // 2) IA del servidor de DanTal: incluida, sin clave y para todas las cuentas.
  let errorServidor = '';
  if (haySesionNube()) {
    try {
      const texto = await consultarCoachIA({ mensajes: msgs, contexto });
      return { ok: true, texto, fuente: 'servidor' };
    } catch (e) {
      errorServidor = /failed to fetch|networkerror/i.test(e?.message || '')
        ? 'No he podido conectar con el servidor de IA.'
        : (e?.message || 'El servidor de IA no responde.');
    }
  }

  return { ok: false, error: errorServidor || 'El coach IA no está disponible ahora.' };
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
