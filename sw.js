// Service worker: guarda la app en caché para que funcione sin conexión.
// Una versión nueva se prepara COMPLETA antes de activarse. Si falla algún
// archivo, se descarta la caché nueva y sigue vigente la anterior.
// La activación no sustituye a la app que está en uso sin que la persona lo
// acepte: se avisa a las ventanas y ellas piden skipWaiting al pulsar.
const VERSION = 'dantal-v10.2';
const PREFIJO = 'dantal-';
const ESPERA_RED = 1800; // ms: si la red tarda, se sirve la copia local
const ARCHIVOS = [
  './', './index.html', './css/estilos.css', './manifest.webmanifest',
  './js/app.js', './js/ejercicios.js', './js/generador.js', './js/stats.js', './js/ayudas.js', './js/tecnica.js',
  './js/marca.js', './js/alimentos.js', './js/technogym.js', './js/videos.js', './js/ia.js', './js/incidencias.js', './js/asistente.js', './js/salud.js', './js/ciencia.js',
  './js/gifs.js', './js/cuerpo-real.js',
  './js/coach.js', './js/contexto-ia.js', './js/llm.js', './js/avatares.js', './js/carrera.js', './js/beta.js', './js/nube.js',
  './js/logros.js', './js/informe.js', './js/informe-nutricion.js', './js/menu.js', './js/escaner.js', './js/planificador.js', './js/rgpd.js', './js/graficos.js',
  './js/plan-comidas.js', './js/alimentos-importados.js', './js/alimentos-naturales.js', './js/recetas-catalogo.js', './js/catalogo-idb.js', './js/dieta.js',
  './js/suplementos.js', './js/suplementos-idb.js', './js/suplementos-ui.js', './js/escaner-identidad.js', './js/hsn-catalogo.js',
  './js/foto-comida.js', './js/calculadoras.js', './js/evolucion.js', './js/adaptacion.js',
  './icons/icono.svg', './icons/icono.ico', './icons/icono-192.png', './icons/icono-512.png',
  './icons/cuerpo-frente.webp', './icons/cuerpo-espalda.webp',
];

function avisar(mensaje) {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then(windows => windows.forEach(w => w.postMessage(mensaje)));
}

// Precarga atómica: solo se publica la versión si TODOS los archivos entran.
async function prepararCache() {
  const c = await caches.open(VERSION);
  const resultados = await Promise.all(ARCHIVOS.map(async ruta => {
    const res = await fetch(new Request(ruta, { cache: 'no-store' }));
    if (!res || !res.ok || res.type === 'opaque') throw new Error(`No se pudo preparar ${ruta}`);
    await c.put(ruta, res.clone());
  }));
  if (resultados.length !== ARCHIVOS.length) throw new Error('Precarga incompleta');
  const claves = await c.keys();
  if (claves.length < ARCHIVOS.length) {
    await caches.delete(VERSION);
    throw new Error('Precarga incompleta');
  }
}

self.addEventListener('install', e => {
  e.waitUntil(prepararCache()
    .catch(err => caches.delete(VERSION).then(() => { throw err; })) // conserva la anterior
    .then(async () => {
      // Instalación inicial: no hay nadie usando la versión anterior.
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (!self.registration.active || !windows.length) await self.skipWaiting();
      else await avisar({ type: 'dantal:update-disponible', version: VERSION });
    }));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const claves = await caches.keys();
    // Nunca toca cachés de otras apps ni datos ajenos a DanTal.
    await Promise.all(claves.filter(k => k.startsWith(PREFIJO) && k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
    await avisar({ type: 'dantal:actualizado', version: VERSION });
  })());
});

// La página pide la activación solo después de que la persona haya aceptado.
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'dantal:actualizar') e.waitUntil(self.skipWaiting());
});

async function conPlazo(peticion, ms) {
  const control = new AbortController();
  const t = setTimeout(() => control.abort(), ms);
  try {
    return await fetch(peticion, { cache: 'no-store', signal: control.signal });
  } finally {
    clearTimeout(t);
  }
}

async function responder(request) {
  const url = new URL(request.url);
  const clave = new Request(url.href, { method: 'GET' }); // sin ?v= para reutilizar la copia
  try {
    const res = await conPlazo(request, ESPERA_RED);
    if (res && res.ok && res.type === 'basic') {
      const copia = res.clone();
      const c = await caches.open(VERSION);
      await c.put(clave, copia);
    }
    return res;
  } catch {
    // Red caída o lenta: se sirve lo guardado. Nunca un error de red como
    // error de datos, y la navegación local sigue funcionando.
    const c = await caches.open(VERSION);
    const local = await c.match(clave, { ignoreSearch: true }) || await c.match('./index.html');
    return local || new Response('', { status: 503, statusText: 'DanTal sin conexión' });
  }
}

self.addEventListener('fetch', e => {
  const request = e.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // API y recursos externos: los gestiona la app
  if (url.pathname.endsWith('/sw.js')) return;      // el SW se actualiza siempre desde la red
  e.respondWith(responder(request));
});

// Al pulsar un recordatorio, abre la app.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(ws => ws[0] ? ws[0].focus() : self.clients.openWindow('./')));
});
