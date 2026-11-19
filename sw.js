// Service worker: guarda la app en caché para que funcione sin conexión.
// Estrategia: primero la red (siempre la versión más reciente) y, sin conexión, la caché.
const VERSION = 'dantal-v4.5';
const ARCHIVOS = [
  './', './index.html', './css/estilos.css', './manifest.webmanifest',
  './js/app.js', './js/ejercicios.js', './js/generador.js', './js/stats.js', './js/ayudas.js', './js/tecnica.js',
  './js/marca.js', './js/alimentos.js', './js/technogym.js', './js/videos.js', './js/ia.js', './js/incidencias.js', './js/asistente.js', './js/salud.js', './js/ciencia.js',
  './js/coach.js', './js/llm.js', './js/avatares.js', './js/carrera.js', './js/beta.js', './js/nube.js',
  './js/logros.js', './js/informe.js', './js/menu.js', './js/escaner.js', './js/planificador.js', './js/rgpd.js',
  './icons/icono.svg', './icons/icono.ico', './icons/icono-192.png', './icons/icono-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(claves => Promise.all(claves.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then(r => {
        if (r.ok) { const copia = r.clone(); caches.open(VERSION).then(c => c.put(e.request, copia)); }
        return r;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
  );
});

// Al pulsar un recordatorio, abre la app.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(ws => ws[0] ? ws[0].focus() : self.clients.openWindow('./')));
});
