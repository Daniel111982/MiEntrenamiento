// =====================================================================
// rgpd.js · Política de privacidad y registro del consentimiento
// ---------------------------------------------------------------------
// Sin dependencias: ni DOM, ni localStorage, ni fetch. Quien llama decide
// dónde guardar el registro que devuelve registrarConsentimiento.
// =====================================================================

export const POLITICA = {
  version: '1.0',
  responsable: 'Daniel',
  correo: 'danirguezrguez@gmail.com',
  actualizada: '2026-11-19',

  finalidades: [
    {
      id: 'esencial',
      titulo: 'Funcionamiento esencial de la app',
      desc: 'Guardar tus datos en este dispositivo y mostrar el programa, las sesiones y las preferencias. Base jurídica: ejecución del contrato del servicio que has solicitado. Es obligatoria: sin ella la app no puede funcionar.',
      obligatoria: true,
    },
    {
      id: 'sincronizacion',
      titulo: 'Sincronización en la nube',
      desc: 'Conservar y sincronizar tus datos entre dispositivos mediante tu cuenta de Supabase. Base jurídica: tu consentimiento. Es opcional y la app funciona sin ella.',
      obligatoria: false,
    },
    {
      id: 'analitica_ia',
      titulo: 'Analítica y asistencia con IA',
      desc: 'Analizar el uso de forma agregada y usar modelos de IA para generar sugerencias de entrenamiento y nutrición. Base jurídica: tu consentimiento. Es opcional y puedes retirarla cuando quieras.',
      obligatoria: false,
    },
  ],

  datos: [
    {
      titulo: 'Datos de cuenta',
      desc: 'Correo electrónico, nombre, identificador de usuario y preferencias de la app.',
    },
    {
      titulo: 'Datos de salud y seguimiento',
      desc: 'Medidas corporales, peso, grasa, nutrición y sesiones de entrenamiento. Son datos de salud: se tratan con reglas RLS en la base de datos, cifrado TLS en el tránsito, clave pública anon en el cliente y sin service_role en el cliente.',
    },
    {
      titulo: 'Datos de uso',
      desc: 'Accesos, pantallas visitadas y errores técnicos, solo si aceptas la analítica opcional.',
    },
  ],

  destinatarios: [
    'Supabase (región de la Unión Europea), como encargado del tratamiento: base de datos, autenticación y sincronización.',
    'Cloudflare Pages, como hosting: entrega del sitio web y de los archivos estáticos de la PWA.',
  ],

  conservacion: 'Conservamos tus datos mientras la cuenta esté activa. Si solicitas el borrado, los eliminamos de inmediato y purgamos los respaldos en el plazo técnico más corto posible.',

  derechos: [
    'Acceso: puedes pedir una copia de tus datos.',
    'Rectificación: puedes corregir los datos inexactos.',
    'Supresión: puedes pedir que borremos tus datos.',
    'Portabilidad: puedes recibir tus datos en un formato estructurado y legible.',
    'Oposición: puedes oponerte al tratamiento opcional.',
    'Retirada del consentimiento: puedes retirarlo en cualquier momento sin afectar al tratamiento anterior realizado legalmente.',
  ],

  cookies: 'No usamos cookies de publicidad ni de terceros. Solo guardamos preferencias técnicas en localStorage de tu dispositivo (tema, sesión y consentimiento), necesarias para que la app funcione.',
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

// Política completa en HTML estático, generada solo desde POLITICA.
export function politicaHTML() {
  const finalidades = POLITICA.finalidades.map(f => {
    const base = f.obligatoria ? 'ejecución del contrato' : 'consentimiento';
    const nota = f.obligatoria ? 'Obligatoria.' : 'Opcional; puedes retirarla cuando quieras.';
    return `<li><strong>${esc(f.titulo)}</strong> — ${esc(f.desc)} Base jurídica: ${base}. ${nota}</li>`;
  }).join('');

  const datos = POLITICA.datos.map(d =>
    `<li><strong>${esc(d.titulo)}:</strong> ${esc(d.desc)}</li>`
  ).join('');

  const destinatarios = POLITICA.destinatarios.map(d => `<li>${esc(d)}</li>`).join('');
  const derechos = POLITICA.derechos.map(d => `<li>${esc(d)}</li>`).join('');

  return `
<h2>Política de privacidad (RGPD)</h2>
<p>Versión ${esc(POLITICA.version)} · Actualizada el ${esc(POLITICA.actualizada)}.</p>

<h2>Responsable del tratamiento</h2>
<p>${esc(POLITICA.responsable)} es el responsable de tus datos. Puedes escribir a ${esc(POLITICA.correo)} para cualquier duda o para ejercer tus derechos.</p>

<h2>Finalidades y base jurídica</h2>
<p>Tratamos tus datos solo para las finalidades indicadas. La base jurídica es la ejecución del contrato del servicio que has pedido para lo esencial, y tu consentimiento para la sincronización, la analítica y la IA.</p>
<ul>${finalidades}</ul>

<h2>Categorías de datos y seguridad</h2>
<ul>${datos}</ul>
<p>Medidas técnicas: reglas RLS en la base de datos, cifrado TLS en las comunicaciones, clave pública anon en el cliente y sin service_role en el cliente. La clave service_role nunca se usa en la app.</p>
<p><strong>Aviso sobre las fotos:</strong> las fotos no se sincronizan con la nube; permanecen solo en tu dispositivo.</p>

<h2>Destinatarios</h2>
<ul>${destinatarios}</ul>

<h2>Conservación</h2>
<p>${esc(POLITICA.conservacion)}</p>

<h2>Tus derechos</h2>
<ul>${derechos}</ul>
<p>Para ejercerlos, escribe a ${esc(POLITICA.correo)}. Retirar el consentimiento no afecta a los tratamientos anteriores realizados legalmente.</p>

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
