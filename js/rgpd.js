// =====================================================================
// rgpd.js · Política de privacidad y registro del consentimiento
// ---------------------------------------------------------------------
// Sin dependencias: ni DOM, ni localStorage, ni fetch. Quien llama decide
// dónde guardar el registro que devuelve registrarConsentimiento.
// Los datos de contacto son los de la aplicación, no los de una persona.
// =====================================================================

export const POLITICA = {
  version: '1.1',
  responsable: 'DanTal',
  correo: 'dantal.admin@gmail.com',
  actualizada: '2026-11-23',

  finalidades: [
    {
      id: 'esencial',
      titulo: 'Funcionamiento esencial de la app',
      desc: 'Guardar tus datos en este dispositivo, mostrar el programa, las sesiones y las preferencias, y conservar los mensajes que tú escribas en la bandeja de ideas e incidencias. Base jurídica: ejecución del contrato del servicio que has solicitado. Es obligatoria: sin ella la app no puede funcionar.',
      obligatoria: true,
    },
    {
      id: 'sincronizacion',
      titulo: 'Sincronización en la nube',
      desc: 'Conservar y sincronizar tus datos entre dispositivos mediante tu cuenta de Supabase. Los datos de seguimiento son datos de salud: se tratan con tu consentimiento explícito (artículo 9.2.a del RGPD). Es opcional y la app funciona sin ella.',
      obligatoria: false,
    },
    {
      id: 'analitica_ia',
      titulo: 'Asistencia con IA (opcional)',
      desc: 'Si usas el coach, tus mensajes se envían a Google Gemini a través de la función del servidor, o al proveedor que elijas (OpenAI, Google, Anthropic, Groq, OpenRouter o Mistral) si has configurado tu propia clave API, que se guarda solo en tu dispositivo. La app no conserva esas conversaciones en sus servidores. Base jurídica: tu consentimiento y, si compartes datos de salud, tu consentimiento explícito. No usamos servicios de analítica de terceros.',
      obligatoria: false,
    },
  ],

  datos: [
    { titulo: 'Datos de cuenta', desc: 'Correo electrónico, nombre, identificador de usuario y preferencias de la app. Solo se crean si decides activar la sincronización.' },
    { titulo: 'Datos de salud y seguimiento', desc: 'Medidas corporales, peso, grasa, nutrición, sesiones de entrenamiento y respuestas al cuestionario inicial. Son datos de salud (categoría especial del artículo 9 del RGPD): se tratan con consentimiento explícito, con reglas RLS en la base de datos, cifrado TLS en el tránsito y clave pública en el cliente. La clave service_role nunca se usa en la app.' },
    { titulo: 'Datos que tú decides compartir', desc: 'Los mensajes de la bandeja de ideas e incidencias y, si los rellenas, tu correo o WhatsApp de contacto. Se guardan en este dispositivo y no se envían a ningún servidor.' },
    { titulo: 'Fotos', desc: 'Las fotos que añadas a los ejercicios no salen de tu dispositivo ni se sincronizan con la nube.' },
  ],

  destinatarios: [
    'Supabase, como encargado del tratamiento: base de datos, autenticación y sincronización. Los datos se alojan en la región configurada en el proyecto; si no estuviera dentro del Espacio Económico Europeo, se aplican las garantías previstas en el RGPD.',
    'Cloudflare Pages, como hosting: entrega del sitio web y de los archivos estáticos de la PWA.',
    'Google Gemini, cuando usas el coach del servidor: recibe el contenido de tus mensajes para generar la respuesta. La clave de acceso está en el servidor y nunca viaja a tu dispositivo.',
    'Solo si tú lo configuras: el proveedor de IA que elijas, que recibe directamente el contenido de tus mensajes. La app no cede datos a ningún otro tercero y no los vende.',
  ],

  transferencias: 'Si usas el coach, tus mensajes se envían a Google Gemini o al proveedor que hayas configurado. Algunos de esos proveedores están en Estados Unidos y pueden acogerse al Marco de Privacidad de Datos UE-EE. UU. o a cláusulas contractuales tipo; puedes pedir información sobre las garantías aplicables escribiendo al correo de contacto. Cloudflare puede tratar metadatos técnicos de conexión fuera del Espacio Económico Europeo para entregar el sitio. Si no usas el coach ni la sincronización, tus datos permanecen en tu dispositivo.',

  conservacion: [
    'Datos en el dispositivo: hasta que borres la cuenta, borres el contenido o desinstales la app.',
    'Datos sincronizados: mientras la cuenta esté activa. Si pides el borrado, los eliminamos de inmediato y purgamos los respaldos en el plazo técnico más corto posible.',
    'Mensajes de ideas e incidencias: hasta que se marquen como resueltos o archivados, o hasta que los borres.',
    'Registro del consentimiento: mientras sea válido y durante el tiempo necesario para acreditar su otorgamiento.',
  ],

  derechos: [
    'Acceso: puedes pedir una copia de tus datos.',
    'Rectificación: puedes corregir los datos inexactos.',
    'Supresión: puedes pedir que borremos tus datos.',
    'Limitación: puedes pedir que se deje de tratar tus datos mientras se resuelve una reclamación.',
    'Portabilidad: puedes recibir tus datos en un formato estructurado y legible.',
    'Oposición: puedes oponerte al tratamiento opcional.',
    'Retirada del consentimiento: puedes retirarlo en cualquier momento sin afectar al tratamiento anterior realizado legalmente.',
    'Reclamación: puedes presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD) o ante la autoridad de control de tu lugar de residencia o trabajo.',
  ],

  decisiones: 'La app elabora automáticamente un programa de entrenamiento orientativo a partir de tus respuestas (objetivo, días disponibles, equipo, nivel y preferencias). Es una recomendación, no una decisión con efectos jurídicos o significativos para ti, y puedes modificarla en cualquier momento desde la pantalla del programa. El coach con IA solo responde a lo que tú le pides y no decide por ti.',

  obligatoriedad: 'El correo y la contraseña solo son necesarios si activas la sincronización en la nube; sin ellos la app funciona en este dispositivo. Las medidas corporales y el resto de datos de seguimiento son opcionales y puedes usar la app sin rellenarlos.',

  cookies: 'No usamos cookies de publicidad ni de terceros. Solo guardamos en el almacenamiento local de tu dispositivo (localStorage) datos técnicos necesarios para que la app funcione: tema, sesión, registro del consentimiento, tus mensajes de ideas e incidencias y, si tú lo configuras, la clave del proveedor de IA. Ninguno de ellos se usa para publicidad ni se comparte con terceros.',
};

// Escapa el texto interno antes de insertarlo en el HTML.
const esc = valor => String(valor)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

// Siempre 'esencial' primero, el resto sin duplicados y en orden de llegada.
function normalizarFinalidades(valores) {
  const lista = Array.isArray(valores) ? valores : [valores];
  const vistos = new Set(['esencial']);
  const salida = ['esencial'];
  for (const valor of lista) {
    const id = valor == null ? '' : String(valor).trim();
    if (id && !vistos.has(id)) {
      vistos.add(id);
      salida.push(id);
    }
  }
  return salida;
}

const correoEnlace = () => `<a href="mailto:${esc(POLITICA.correo)}">${esc(POLITICA.correo)}</a>`;
const lista = (valores, pintar = x => `<li>${esc(x)}</li>`) => `<ul>${valores.map(pintar).join('')}</ul>`;

// Política completa en HTML estático, generada solo desde POLITICA.
export function politicaHTML() {
  const finalidades = lista(POLITICA.finalidades, f => {
    const base = f.obligatoria ? 'ejecución del contrato' : 'consentimiento';
    const nota = f.obligatoria ? 'Obligatoria.' : 'Opcional; puedes retirarla cuando quieras.';
    return `<li><strong>${esc(f.titulo)}</strong> — ${esc(f.desc)} Base jurídica: ${base}. ${nota}</li>`;
  });

  const datos = lista(POLITICA.datos, d =>
    `<li><strong>${esc(d.titulo)}:</strong> ${esc(d.desc)}</li>`
  );

  return `
<h2>Política de privacidad (RGPD)</h2>
<p>Versión ${esc(POLITICA.version)} · Actualizada el ${esc(POLITICA.actualizada)}.</p>

<h2>Responsable del tratamiento</h2>
<p>${esc(POLITICA.responsable)} es el responsable de tus datos. Puedes escribir a ${correoEnlace()} para cualquier duda o para ejercer tus derechos.</p>

<h2>Finalidades y base jurídica</h2>
<p>Tratamos tus datos solo para las finalidades indicadas. La base jurídica es la ejecución del contrato del servicio que has pedido para lo esencial, y tu consentimiento para la sincronización y la asistencia con IA.</p>
${finalidades}

<h2>Datos obligatorios y opcionales</h2>
<p>${esc(POLITICA.obligatoriedad)}</p>

<h2>Categorías de datos y seguridad</h2>
${datos}
<p>Medidas técnicas: reglas RLS en la base de datos, cifrado TLS en las comunicaciones, clave pública en el cliente y sin service_role en el cliente. La clave service_role nunca se usa en la app.</p>
<p><strong>Aviso sobre las fotos:</strong> las fotos no se sincronizan con la nube; permanecen solo en tu dispositivo.</p>

<h2>Destinatarios</h2>
${lista(POLITICA.destinatarios)}

<h2>Transferencias internacionales</h2>
<p>${esc(POLITICA.transferencias)}</p>

<h2>Conservación</h2>
${lista(POLITICA.conservacion)}

<h2>Decisiones automatizadas y elaboración de perfiles</h2>
<p>${esc(POLITICA.decisiones)}</p>

<h2>Tus derechos</h2>
${lista(POLITICA.derechos)}
<p>Para ejercerlos, escribe a ${correoEnlace()}. Te responderemos en el plazo de un mes. Si no estás conforme, puedes reclamar ante la <a href="https://www.aepd.es" target="_blank" rel="noopener">AEPD</a>. Retirar el consentimiento no afecta a los tratamientos anteriores realizados legalmente.</p>

<h2>Cookies y almacenamiento local</h2>
<p>${esc(POLITICA.cookies)}</p>
`.trim();
}

// Devuelve el consentimiento guardado en estado.rgpd, o null si no existe.
export function consentimiento(estado) {
  const registro = estado && typeof estado === 'object' ? estado.rgpd : null;
  if (!registro || typeof registro !== 'object' || Array.isArray(registro)) return null;
  return {
    version: registro.version == null ? POLITICA.version : String(registro.version),
    fecha: registro.fecha == null ? '' : String(registro.fecha),
    aceptado: Boolean(registro.aceptado),
    finalidades: normalizarFinalidades(registro.finalidades),
  };
}

// Crea el registro listo para guardar: fecha ISO y finalidades normalizadas.
export function registrarConsentimiento(aceptado, opciones = {}) {
  const { finalidades = [] } = opciones && typeof opciones === 'object' ? opciones : {};
  return {
    version: POLITICA.version,
    fecha: new Date().toISOString(),
    aceptado: Boolean(aceptado),
    finalidades: normalizarFinalidades(finalidades),
  };
}
