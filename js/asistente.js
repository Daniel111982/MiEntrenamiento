// =====================================================================
// Asistente automático de ideas e incidencias
// =====================================================================
// Motor de reglas puro (sin DOM y sin tocar nada): lee el mensaje que ha
// enviado un usuario y decide si hay una solución sencilla y segura que la
// propia app pueda aplicar sola. Lo que no reconoce, o lo que implicaría
// cambios de fondo, se escala para que lo apruebe la cuenta maestra.
//
// Aquí solo hay lógica: quien aplica la acción de verdad es app.js, que
// además puede enriquecer la decisión con la IA del coach si está activada.

// Quita acentos, mayúsculas y signos: así «Contraseña» y «contrasena» coinciden.
const sinAcentos = t => String(t ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
export const normalizar = t => sinAcentos(t).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------------
// Acciones que la app puede hacer por sí sola.
// Solo se listan las seguras y reversibles: nada de borrar datos ni de
// cambiar el programa del usuario sin que lo pida.
// ---------------------------------------------------------------------
export const ACCIONES = {
  actualizar_app: {
    nombre: 'Actualizar la app',
    segura: true,
    recarga: true,
    descripcion: 'Se limpia la copia guardada para que cargue la última versión publicada.',
  },
  limpiar_cache: {
    nombre: 'Limpiar y recargar',
    segura: true,
    recarga: true,
    descripcion: 'Se vacía la copia guardada y se recarga la app para dejarla como nueva.',
  },
  activar_avisos: {
    nombre: 'Activar los avisos',
    segura: true,
    descripcion: 'Se activan los recordatorios y se pide permiso al navegador para poder avisarte.',
  },
  responder: {
    nombre: 'Responder con una guía',
    segura: true,
    descripcion: 'Se responde con los pasos a seguir y el enlace a la pantalla correcta.',
  },
};

export const esAccionSegura = a => Boolean(ACCIONES[a]?.segura);

// ---------------------------------------------------------------------
// Catálogo de casos. Las claves van ya normalizadas (sin acentos ni
// mayúsculas). Las frases largas puntúan más que las palabras sueltas.
// ---------------------------------------------------------------------
export const CASOS = [
  // --- Problemas que la app puede arreglar sola ---
  {
    id: 'actualizar_app',
    nombre: 'Forzar la actualización',
    accion: 'actualizar_app',
    categorias: ['app'],
    claves: [
      'no se actualiza', 'no me actualiza', 'no se me actualiza', 'no se ha actualizado', 'no se me ha actualizado',
      'sigue la version antigua', 'version antigua', 'version vieja', 'no veo los cambios', 'no veo los nuevos cambios',
      'sigue igual que antes', 'no sale la version nueva', 'no aparece lo nuevo', 'no veo lo nuevo', 'no me sale lo nuevo',
      'sigo viendo lo mismo', 'no carga la version nueva',
    ],
    respuesta: 'He limpiado la copia guardada para que cargue la última versión. Toca «Recargar la app» y verás los cambios.',
  },
  {
    id: 'limpiar_cache',
    nombre: 'Limpiar y recargar',
    accion: 'limpiar_cache',
    categorias: ['app'],
    claves: [
      'va muy lento', 'va lento', 'se queda en blanco', 'pantalla en blanco', 'se queda cargando', 'se queda pensando',
      'se queda pillada', 'se queda colgada', 'se queda atascada', 'se cierra sola', 'se cierra de golpe', 'no abre',
      'no me abre', 'falla al abrir', 'va rara', 'va raro', 'se ve raro', 'se ve mal', 'no funciona bien', 'no responde',
      'se bloquea', 'no me carga bien',
    ],
    respuesta: 'He vaciado la copia guardada y he dejado la app limpia. Toca «Recargar la app» y debería ir fina otra vez.',
  },
  {
    id: 'activar_avisos',
    nombre: 'Activar los avisos',
    accion: 'activar_avisos',
    categorias: ['app', 'entrenamiento'],
    claves: [
      'no me avisa', 'no me avisan', 'no me llega el aviso', 'no me llegan los avisos', 'no me llega el recordatorio',
      'no me llegan los recordatorios', 'no me suena', 'no recibo notificaciones', 'no me salen las notificaciones',
      'no me notifica', 'no me notifican', 'recordatorio no funciona', 'los recordatorios no funcionan',
      'no me avisa para entrenar', 'no me avisa de entrenar', 'no me avisa los dias',
    ],
    respuesta: 'He activado los recordatorios y el permiso de avisos. A partir de ahora te avisaré los días de entreno a tu hora.',
  },

  // --- Dudas que se resuelven respondiendo con una guía ---
  {
    id: 'cambiar_clave',
    nombre: 'Cambiar la contraseña',
    accion: 'responder',
    enlace: 'ajustes/seguridad',
    claves: [
      'cambiar la contrasena', 'cambiar contrasena', 'cambiar mi clave', 'cambiar la clave', 'no recuerdo la contrasena',
      'he olvidado la contrasena', 'olvide la contrasena', 'recuperar la contrasena', 'recuperar contrasena',
      'poner contrasena', 'quitar la contrasena', 'quitar contrasena', 'bloquear la app',
    ],
    respuesta: 'Puedes gestionarlo en Ajustes → Seguridad: ahí cambias la contraseña, la pregunta de seguridad y el bloqueo.',
  },
  {
    id: 'exportar_datos',
    nombre: 'Copia de seguridad',
    accion: 'responder',
    enlace: 'ajustes/datos',
    claves: [
      'exportar los datos', 'exportar mis datos', 'copia de seguridad', 'hacer una copia', 'guardar mis datos',
      'perder mis datos', 'pasar los datos a otro movil', 'pasar los datos a otro telefono', 'cambiar de movil',
      'cambiar de telefono', 'recuperar mis datos',
    ],
    respuesta: 'En Ajustes → Tus datos puedes descargar una copia de seguridad y volver a importarla en otro dispositivo.',
  },
  {
    id: 'cambiar_programa',
    nombre: 'Cambiar el programa',
    accion: 'responder',
    enlace: 'ajustes/perfil',
    claves: [
      'cambiar el programa', 'cambiar mi rutina', 'cambiar la rutina', 'cambiar los dias', 'cambiar de dias',
      'cambiar el objetivo', 'otro programa', 'rehacer el programa', 'cambiar el entrenamiento', 'cambiar el perfil',
    ],
    respuesta: 'En Ajustes → Perfil y programa puedes cambiar objetivo, días, frecuencia y duración; al guardar se crea un programa nuevo sin perder tu historial.',
  },
  {
    id: 'nuevo_ejercicio',
    nombre: 'Crear un ejercicio',
    accion: 'responder',
    enlace: 'ejercicios/nuevo',
    claves: [
      'crear un ejercicio', 'anadir un ejercicio', 'nuevo ejercicio', 'agregar un ejercicio', 'no encuentro un ejercicio',
      'falta un ejercicio', 'crear mi ejercicio', 'ejercicio propio', 'anadir ejercicios', 'meter un ejercicio',
    ],
    respuesta: 'En Ejercicios → Crear ejercicio puedes añadir tus propias máquinas o variantes y usarlas en tus sesiones.',
  },
  {
    id: 'registrar_comida',
    nombre: 'Registrar la comida',
    accion: 'responder',
    enlace: 'nutricion/diario',
    claves: [
      'registrar la comida', 'apuntar la comida', 'anadir comida', 'registrar lo que como', 'apuntar lo que como',
      'diario de comidas', 'no se como apuntar la comida', 'contar calorias', 'contar las calorias', 'contar macros',
      'anotar lo que como',
    ],
    respuesta: 'En Nutrición → Diario apuntas lo que comes y bebes; la app calcula calorías y macros por ti.',
  },
  {
    id: 'ver_progreso',
    nombre: 'Ver el progreso',
    accion: 'responder',
    enlace: 'seguimiento/progreso',
    claves: [
      'ver mi progreso', 'ver el progreso', 'ver mis records', 'ver mis marcas', 'ver la evolucion', 'ver mi evolucion',
      'graficas de progreso', 'como voy', 'ver mis medidas', 'ver mi historial',
    ],
    respuesta: 'En Seguimiento tienes tu progreso, tus récords, tus medidas y el historial de sesiones.',
  },
  {
    id: 'cambiar_usuario',
    nombre: 'Cambiar de usuario',
    accion: 'responder',
    enlace: 'usuarios',
    claves: [
      'cambiar de usuario', 'anadir otro usuario', 'otra persona', 'crear otro usuario', 'cambiar de cuenta',
      'varios usuarios', 'otro perfil', 'usar la app dos personas',
    ],
    respuesta: 'Puedes tener varias cuentas en el mismo dispositivo: en Ajustes → Gestor de usuarios cambias o creas una nueva.',
  },
  {
    id: 'como_funciona',
    nombre: 'Cómo funciona la app',
    accion: 'responder',
    enlace: 'ajustes/acerca',
    claves: [
      'como funciona', 'no se como funciona', 'no entiendo la app', 'no se usar', 'no se como usar', 'como se usa',
      'ayuda para usar', 'manual', 'tutorial', 'explicame', 'no entiendo nada',
    ],
    respuesta: 'En Ajustes → Cómo funciona te explico los ciclos, las cargas, la nutrición y la seguridad. También tienes iconos ⓘ por toda la app.',
  },
];

// Cuánto pesa una clave: las frases valen más que las palabras sueltas.
const peso = clave => (clave.includes(' ') ? 2 : 1) + Math.min(2, Math.floor(clave.length / 14));
const MIN_PUNTOS = 2;

const buscarCaso = id => CASOS.find(c => c.id === id) || null;

// Texto que se le muestra al usuario cuando su mensaje se escala.
export const respuestaEscalada = () =>
  'Gracias por contármelo. Esto necesita que lo revise la persona que administra la app; te avisaré aquí dentro en cuanto esté resuelto.';

// ---------------------------------------------------------------------
// analizar(item, { pista })
// ---------------------------------------------------------------------
// Devuelve siempre un objeto. Si `segura` es true y hay `accion`, la app
// puede aplicarla sola. Si no, el mensaje se escala.
export function analizar(item = {}, { pista = null } = {}) {
  const texto = normalizar(`${item.titulo || ''} ${item.texto || ''}`);
  const cat = String(item.categoria || '');
  let mejor = null;
  for (const caso of CASOS) {
    let puntos = 0;
    const halladas = [];
    for (const clave of caso.claves) {
      if (texto.includes(clave)) { puntos += peso(clave); halladas.push(clave); }
    }
    const esPista = caso.id === pista;
    if (!halladas.length && !esPista) continue;
    if ((caso.categorias || []).includes(cat)) puntos += 1;
    if (esPista) puntos += 5;
    if (!mejor || puntos > mejor.puntos) mejor = { caso, puntos, halladas, esPista };
  }

  if (!mejor || mejor.puntos < MIN_PUNTOS) {
    return {
      caso: null, nombre: null, accion: 'ninguna', segura: false, puntos: mejor?.puntos || 0,
      coincidencias: mejor?.halladas || [], respuesta: respuestaEscalada(), enlace: null,
      motivo: 'No reconozco una solución automática que sea segura.',
    };
  }

  const { caso } = mejor;
  const segura = esAccionSegura(caso.accion);
  const motivo = mejor.esPista && !mejor.halladas.length
    ? 'Lo ha reconocido la IA del coach.'
    : `Coincide con «${caso.nombre}» (${mejor.halladas.slice(0, 3).join(', ')}).`;
  return {
    caso: caso.id,
    nombre: caso.nombre,
    accion: caso.accion,
    segura,
    puntos: mejor.puntos,
    coincidencias: mejor.halladas,
    respuesta: caso.respuesta,
    enlace: caso.enlace ? `#${caso.enlace}` : null,
    motivo,
  };
}

// ---------------------------------------------------------------------
// Apoyo opcional a la IA del coach (si está configurada).
// ---------------------------------------------------------------------
export function promptClasificar(item = {}) {
  const lista = CASOS.map(c => `- ${c.id}: ${c.nombre}`).join('\n');
  return `Clasifica el siguiente mensaje de un usuario de una app de entrenamiento y nutrición en UNA sola de estas categorías:
${lista}
- ninguna: no encaja en ninguna de las anteriores

Mensaje:
Título: ${item.titulo || '(sin título)'}
Texto: ${item.texto || '(sin texto)'}

Responde únicamente con el id de la categoría, sin explicaciones.`;
}

// Interpreta la respuesta de la IA y devuelve un id del catálogo (o null).
export function interpretarIA(texto) {
  const t = normalizar(texto);
  if (!t || t.includes('ninguna')) return null;
  for (const c of CASOS) {
    if (t.includes(normalizar(c.id)) || t.includes(normalizar(c.nombre))) return c.id;
  }
  return null;
}

export const casoPorId = buscarCaso;
