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
  escalada: { nombre: 'Pide permiso', icono: '🙋' },
  resuelta: { nombre: 'Resuelta', icono: '✨' },
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

// Mensajes que piden permiso a la cuenta maestra (los escaló el asistente).
export const contarEscaladas = (datos = cargarIncidencias()) => datos.items.filter(i => i.estado === 'escalada').length;

// Todo lo que el dueño tiene pendiente de atender.
export const contarPendientes = (datos = cargarIncidencias()) =>
  datos.items.filter(i => i.estado === 'nueva' || i.estado === 'escalada').length;

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

// =====================================================================
// Ayudantes del asistente automático
// =====================================================================
// Cambia campos de un mensaje sin perder el resto. Siempre se trabaja sobre
// la misma copia que se guarda, para no pisar cambios.
function cambiar(id, cambios) {
  const datos = cargarIncidencias();
  const item = datos.items.find(i => i.id === id);
  if (!item) return null;
  Object.assign(item, cambios);
  guardarIncidencias(datos);
  return item;
}

export const actualizarIncidencia = (id, cambios = {}) => cambiar(id, cambios);

// El asistente resolvió el mensaje solo (o el dueño lo aprobó).
export function resolverIncidencia(id, { respuesta = '', accion = 'ninguna', porIA = false } = {}) {
  return cambiar(id, {
    estado: 'resuelta',
    resueltoEn: new Date().toISOString(),
    respuesta: String(respuesta || ''),
    accion,
    porIA: Boolean(porIA),
  });
}

// El asistente no se atreve: se pide permiso a la cuenta maestra.
export function escalarIncidencia(id, { motivo = '', accion = 'ninguna', caso = null, confianza = 0, porIA = false } = {}) {
  return cambiar(id, {
    estado: 'escalada',
    triage: { caso, accion, confianza, motivo, porIA: Boolean(porIA), fecha: new Date().toISOString() },
    permiso: { estado: 'pendiente', fecha: new Date().toISOString() },
  });
}

// El dueño decide. Si aprueba, el mensaje queda resuelto con su respuesta;
// si no, vuelve a «leída» para que pueda archivarlo cuando quiera.
export function decidirPermiso(id, aprobado, { nota = '', respuesta = '' } = {}) {
  return cambiar(id, {
    permiso: { estado: aprobado ? 'aprobado' : 'rechazado', fecha: new Date().toISOString(), ...(nota ? { nota } : {}) },
    ...(aprobado
      ? { estado: 'resuelta', resueltoEn: new Date().toISOString(), respuesta: String(respuesta || ''), accion: 'manual' }
      : { estado: 'leida' }),
  });
}
