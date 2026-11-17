// =====================================================================
// Ideas e incidencias («¿Una idea o un problema?»)
// =====================================================================
// Los usuarios pueden mandar ideas o avisar de problemas. Se guardan en
// este dispositivo bajo una única clave compartida, no por usuario, porque
// los lee el dueño de la app (la cuenta marcada como administradora).
// Estructura: { items: [...], correo: '', whatsapp: '' }
export const CLAVE_INCIDENCIAS = 'mientrenamiento:incidencias';

// Qué es: una idea o un problema.
export const TIPOS_INCIDENCIA = {
  idea: { nombre: 'Idea', icono: '💡' },
  problema: { nombre: 'Problema', icono: '⚠️' },
};

// Sobre qué trata el mensaje.
export const CATEGORIAS_INCIDENCIA = {
  app: 'La app en general',
  entrenamiento: 'Entrenamiento y programa',
  nutricion: 'Nutrición',
  seguimiento: 'Seguimiento y medidas',
  videos: 'Vídeos de técnica',
  otro: 'Otro',
};

// Estado de cada mensaje dentro de la bandeja del dueño.
export const ESTADOS_INCIDENCIA = {
  nueva: { nombre: 'Nueva', icono: '🆕' },
  leida: { nombre: 'Leída', icono: '👀' },
  hecha: { nombre: 'Hecha', icono: '✅' },
  archivada: { nombre: 'Archivada', icono: '📦' },
};

export function cargarIncidencias() {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE_INCIDENCIAS));
    if (d && typeof d === 'object') {
      return {
        items: Array.isArray(d.items) ? d.items : [],
        correo: String(d.correo || ''),
        whatsapp: String(d.whatsapp || ''),
      };
    }
  } catch { /* datos corruptos: se empieza de cero */ }
  return { items: [], correo: '', whatsapp: '' };
}

export function guardarIncidencias(datos) {
  localStorage.setItem(CLAVE_INCIDENCIAS, JSON.stringify(datos));
}

// Mensajes sin leer (los que aún no ha abierto el dueño).
export const contarNuevas = (datos = cargarIncidencias()) => datos.items.filter(i => i.estado === 'nueva').length;

export function nuevaIncidencia({ tipo, categoria, titulo, texto, autorId, autorNombre }) {
  const datos = cargarIncidencias();
  const item = {
    id: 'inc' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    tipo: TIPOS_INCIDENCIA[tipo] ? tipo : 'idea',
    categoria: CATEGORIAS_INCIDENCIA[categoria] ? categoria : 'otro',
    titulo: String(titulo || '').slice(0, 70),
    texto: String(texto || '').slice(0, 1500),
    autorId: autorId || null,
    autorNombre: String(autorNombre || 'Anónimo'),
    fecha: new Date().toISOString(),
    estado: 'nueva',
  };
  datos.items.unshift(item);
  guardarIncidencias(datos);
  return item;
}

export const nombreCategoria = c => CATEGORIAS_INCIDENCIA[c] || CATEGORIAS_INCIDENCIA.otro;

// Texto plano de un mensaje, para copiarlo o enviarlo por correo o WhatsApp.
export function textoIncidencia(item = {}) {
  const tipo = TIPOS_INCIDENCIA[item.tipo]?.nombre || 'Mensaje';
  const cuando = item.fecha ? new Date(item.fecha).toLocaleString('es-ES') : '';
  return `[${tipo}] ${item.titulo || ''}\n\n${item.texto || ''}\n\n— ${item.autorNombre || ''}${cuando ? ` · ${cuando}` : ''}`;
}
