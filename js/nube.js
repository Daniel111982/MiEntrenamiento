// =====================================================================
// nube.js · Conexión con Supabase (el servidor en la nube)
// ---------------------------------------------------------------------
// Sin dependencias externas: habla directamente con la API de Supabase
// usando fetch. Guarda la sesión en el propio dispositivo.
//
// CONFIGURACIÓN: rellena URL y ANON con los datos del proyecto.
//   · URL  → https://xxxxxxxx.supabase.co
//   · ANON → la clave "anon public"
// La clave ANON es pública por diseño: va dentro de la app y la seguridad
// la pone la propia base de datos (las reglas del archivo esquema.sql).
// NUNCA poner aquí la clave service_role.
// =====================================================================

export const NUBE = {
  url: 'https://xeblpmdrqbaalkkwqaxh.supabase.co',
  anon: 'sb_publishable_x_jgGp3cBoqYr-E9vCK6hQ_PJjBW3T9',
};

const CLAVE_SESION = 'mientrenamiento:nube:sesion';

export const nubeConfigurada = () => Boolean(NUBE.url && NUBE.anon);

let sesion = null;
try { sesion = JSON.parse(localStorage.getItem(CLAVE_SESION)) || null; } catch { sesion = null; }

const guardarSesion = s => {
  sesion = s;
  try { if (s) localStorage.setItem(CLAVE_SESION, JSON.stringify(s)); else localStorage.removeItem(CLAVE_SESION); } catch { /* sin espacio */ }
};

export const usuarioNube = () => sesion?.user || null;
export const haySesionNube = () => Boolean(sesion?.access_token);

// Petición genérica. `auth: false` para las rutas públicas (registro y acceso).
async function peticion(ruta, { metodo = 'GET', cuerpo, auth = true, cabeceras = {} } = {}) {
  if (!nubeConfigurada()) throw new Error('La nube no está configurada todavía.');
  const h = { apikey: NUBE.anon, 'Content-Type': 'application/json', ...cabeceras };
  if (auth && sesion?.access_token) h.Authorization = `Bearer ${sesion.access_token}`;
  const res = await fetch(`${NUBE.url}${ruta}`, {
    method: metodo,
    headers: h,
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });
  const texto = await res.text();
  let datos = null;
  try { datos = texto ? JSON.parse(texto) : null; } catch { datos = texto; }
  if (!res.ok) {
    const msg = datos?.msg || datos?.error_description || datos?.message || datos?.error || `Error ${res.status}`;
    throw new Error(msg);
  }
  return datos;
}

// ---------------------------------------------------------------- Acceso
export async function registrarNube(correo, clave, nombre) {
  const d = await peticion('/auth/v1/signup', {
    metodo: 'POST', auth: false,
    cuerpo: { email: correo, password: clave, data: { nombre } },
  });
  if (d?.access_token) guardarSesion(d);
  return d;
}

export async function entrarNube(correo, clave) {
  const d = await peticion('/auth/v1/token?grant_type=password', {
    metodo: 'POST', auth: false,
    cuerpo: { email: correo, password: clave },
  });
  guardarSesion(d);
  return d;
}

export async function refrescarNube() {
  if (!sesion?.refresh_token) return null;
  const d = await peticion('/auth/v1/token?grant_type=refresh_token', {
    metodo: 'POST', auth: false,
    cuerpo: { refresh_token: sesion.refresh_token },
  });
  guardarSesion(d);
  return d;
}

export async function salirNube() {
  try { if (sesion?.access_token) await peticion('/auth/v1/logout', { metodo: 'POST' }); } catch { /* da igual */ }
  guardarSesion(null);
}

// ---------------------------------------------------------------- Perfiles
export async function miPerfilNube() {
  const uid = usuarioNube()?.id;
  if (!uid) return null;
  const filas = await peticion(`/rest/v1/perfiles?id=eq.${uid}&select=*`);
  return filas?.[0] || null;
}

// Solo el administrador recibe más de una fila (lo controla la base de datos).
export const listarPerfilesNube = () =>
  peticion('/rest/v1/perfiles?select=*&order=creado.asc');

export const actualizarPerfilNube = (id, campos) =>
  peticion(`/rest/v1/perfiles?id=eq.${id}`, {
    metodo: 'PATCH', cuerpo: campos,
    cabeceras: { Prefer: 'return=representation' },
  });

export const actualizarMiPerfilNube = campos =>
  actualizarPerfilNube(usuarioNube()?.id, campos);

// Canjea un código de invitación beta. Lo valida el SERVIDOR (función
// canjear_beta) y, si es correcto, pone la fecha de fin en el perfil.
export const canjearCodigoNube = codigo =>
  peticion('/rest/v1/rpc/canjear_beta', { metodo: 'POST', cuerpo: { p_codigo: codigo } });

// ------------------------------------------------------------- Contenidos
// Textos globales que publica el dueño (tabla `avisos`). Cualquier cuenta
// autenticada puede leer los activos; solo el administrador puede escribir.
export const listarContenidosNube = () =>
  peticion('/rest/v1/avisos?select=*&order=orden.asc,actualizado.desc');

export const guardarContenidoNube = contenido =>
  peticion('/rest/v1/avisos', {
    metodo: 'POST',
    cuerpo: { ...contenido, autor: usuarioNube()?.id, actualizado: new Date().toISOString() },
    cabeceras: { Prefer: 'resolution=merge-duplicates,return=minimal' },
  });

export const borrarContenidoNube = id =>
  peticion(`/rest/v1/avisos?id=eq.${encodeURIComponent(id)}`, { metodo: 'DELETE' });

// ---------------------------------------------------------------- Datos
export async function leerDatosNube() {
  const uid = usuarioNube()?.id;
  if (!uid) return null;
  const filas = await peticion(`/rest/v1/datos?usuario=eq.${uid}&select=contenido,actualizado`);
  return filas?.[0] || null;
}

export const guardarDatosNube = contenido =>
  peticion('/rest/v1/datos', {
    metodo: 'POST',
    cuerpo: { usuario: usuarioNube().id, contenido, actualizado: new Date().toISOString() },
    cabeceras: { Prefer: 'resolution=merge-duplicates,return=minimal' },
  });

// ---------------------------------------------------------------- RGPD
// Borra la cuenta del usuario autenticado (perfil, datos copiados y acceso).
// La base de datos comprueba auth.uid(): nunca se usa service_role aquí.
export async function borrarCuentaNube() {
  if (!haySesionNube()) throw new Error('No hay ninguna sesión abierta.');
  await peticion('/rest/v1/rpc/borrar_mi_cuenta', { metodo: 'POST', cuerpo: {} });
  guardarSesion(null);
}
