// Edge Function del coach IA de DanTal.
// ---------------------------------------------------------------------
// Una sola clave de Gemini, guardada como secreto IA_CLAVE en Supabase.
// El navegador solo envía su JWT y el contexto del usuario; nunca ve la
// clave. El gateway verifica el JWT (verify_jwt=true) y esta función
// comprueba la sesión y el límite diario antes de llamar a Gemini
// (la cuenta del dueño, administradora, no tiene límite).
// =====================================================================

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (datos: unknown, estado = 200) =>
  new Response(JSON.stringify(datos), {
    status: estado,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
  });

async function textoError(res: Response): Promise<string> {
  const crudo = await res.text();
  try {
    const j = JSON.parse(crudo);
    return String(j?.error?.message || j?.message || j?.error || crudo).slice(0, 400);
  } catch {
    return crudo.slice(0, 400);
  }
}

const SISTEMA = [
  'Eres DanTal, el entrenador personal y de nutrición de la app DanTal.',
  'Hablas siempre en español de España, cercano, claro y directo, tuteando al usuario.',
  'Explica CUÁNTO (series, repeticiones, kilos, descanso, calorías) y POR QUÉ.',
  'Sé breve: 3-6 frases o una lista corta. Da cifras concretas cuando puedas.',
  'Basa todo en los DATOS DEL USUARIO. Si falta un dato, dilo en vez de inventarlo.',
  'Distingue el DATO REAL de la ESTIMACIÓN.',
  'No eres un servicio médico: ante dolor, lesión o duda clínica, recomienda consultar a un profesional.',
  'No prometas resultados ni recomiendes suplementos ni fármacos.',
  'Usa como mucho **negritas** y listas con "- ". No uses títulos con #.',
].join('\n');

type Mensaje = { rol?: string; texto?: unknown };

function prepararMensajes(entrada: unknown): Array<{ role: string; parts: Array<{ text: string }> }> {
  const lista: Mensaje[] = Array.isArray(entrada) ? entrada.slice(-12) as Mensaje[] : [];
  const limpios = lista
    .filter(m => m && typeof m.texto === 'string' && m.texto.trim())
    .map(m => ({
      role: m.rol === 'assistant' || m.rol === 'model' ? 'model' : 'user',
      texto: String(m.texto).slice(0, 4000),
    }));
  if (!limpios.length) return [];

  // Gemini prefiere turnos alternos: unimos mensajes consecutivos del mismo rol.
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  for (const m of limpios) {
    const ultimo = contents[contents.length - 1];
    if (ultimo?.role === m.role) ultimo.parts[0].text += '\n' + m.texto;
    else contents.push({ role: m.role, parts: [{ text: m.texto }] });
  }
  if (contents[contents.length - 1]?.role !== 'user') {
    contents.push({ role: 'user', parts: [{ text: 'Responde a la última pregunta.' }] });
  }
  return contents;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido.' }, 405);

  try {
    const auth = req.headers.get('authorization') || '';
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ error: 'Falta la sesión.' }, 401);

    const url = Deno.env.get('SUPABASE_URL');
    const anon = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || '';
    if (!url || !anon) return json({ error: 'El servidor no está configurado.' }, 500);

    // Verificamos el token contra Supabase además del verify_jwt del gateway.
    const quien = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: `Bearer ${token}` },
    });
    if (!quien.ok) return json({ error: 'La sesión ha caducado. Vuelve a entrar.' }, 401);

    const cuerpo = await req.json().catch(() => null);
    const mensajes = prepararMensajes(cuerpo?.mensajes);
    if (!mensajes.length) return json({ error: 'No hay nada que preguntar.' }, 400);
    const contexto = String(cuerpo?.contexto || '').slice(0, 6000);

    // Límite diario por cuenta: lo controla la base de datos, no el cliente.
    const uso = await fetch(`${url}/rest/v1/rpc/registrar_ia_uso`, {
      method: 'POST',
      headers: {
        apikey: anon,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_limite: 25 }),
    });
    if (!uso.ok) return json({ error: await textoError(uso) }, 429);

    const clave = Deno.env.get('IA_CLAVE');
    if (!clave) return json({ error: 'Falta la clave de IA del servidor.' }, 503);

    const sistema = `${SISTEMA}\n\nDATOS ACTUALES DEL USUARIO:\n${contexto || '(sin datos todavía)'}`;
    const modelos = [
      Deno.env.get('IA_MODELO') || 'gemini-3.5-flash-lite',
      'gemini-2.5-flash-lite',
    ];

    let respuesta: Response | null = null;
    let ultimoError = '';
    for (const modelo of [...new Set(modelos)]) {
      respuesta = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent?key=${encodeURIComponent(clave)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: sistema }] },
            contents: mensajes,
            generationConfig: { maxOutputTokens: 600 },
          }),
        },
      );
      if (respuesta.ok) break;
      ultimoError = await textoError(respuesta);
      const modeloNoExiste = respuesta.status === 404 || /model|not found|no encontrado/i.test(ultimoError);
      if (!modeloNoExiste) break;
    }

    if (!respuesta?.ok) {
      return json({ error: `La IA no está disponible ahora. ${ultimoError || 'Inténtalo de nuevo.'}` }, 502);
    }

    const datos = await respuesta.json();
    const texto = String(datos?.candidates?.[0]?.content?.parts
      ?.filter((p: { text?: string; thought?: boolean }) => p?.text && !p.thought)
      .map((p: { text: string }) => p.text)
      .join('') || '').trim();

    if (!texto) {
      const motivo = datos?.promptFeedback?.blockReason;
      return json(
        { error: motivo ? 'La respuesta ha sido bloqueada por seguridad. Prueba con otra pregunta.' : 'La IA no ha devuelto texto. Inténtalo de nuevo.' },
        502,
      );
    }

    return json({ texto, fuente: 'servidor' });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Error interno del servidor.' }, 500);
  }
});
