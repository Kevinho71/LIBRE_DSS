// Service Worker de LIBREDSS — app shell cacheable + API siempre en red.
// Las ventas offline se encolan en IndexedDB (no en el SW); aquí solo se
// garantiza que la SPA cargue sin red.
const CACHE_VERSION = 'libredss-shell-v2';
const APP_SHELL = ['/', '/index.html', '/manifest.json', '/icon.svg'];

const RUTAS_API = ['/auth', '/productos', '/transacciones', '/storage', '/dss', '/ingesta', '/dashboard', '/usuarios'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Nunca cachear llamadas a la API.
  if (RUTAS_API.some((prefijo) => url.pathname.startsWith(prefijo))) return;

  // Navegaciones: red primero, app shell como respaldo offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html').then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Recursos estáticos: stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const redPromise = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copia = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copia));
          }
          return response;
        })
        .catch(() => cached);

      return cached || redPromise;
    })
  );
});
