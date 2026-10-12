// Service Worker base para LIBREDSS PWA
const CACHE_NAME = 'libredss-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Estrategia básica network-first para llamadas de API
});
