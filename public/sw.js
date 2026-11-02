// NONONICK UNIVERSAL CODE HUB - Service Worker
const CACHE_NAME = 'nononick-hub-v1.0.0';

// Critical static assets to cache for offline application shell
const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/favicon.ico',
  'https://fonts.googleapis.com/icon?family=Material+Icons'
];

// Domains that must NEVER be cached (OAuth tokens, real API calls, personal file payloads)
const EXCLUDED_HOSTS = [
  'accounts.google.com',
  'www.googleapis.com',
  'oauth2.googleapis.com',
  'api.github.com',
  'github.com',
  'login.microsoftonline.com',
  'graph.microsoft.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL_ASSETS).catch((err) => {
        console.warn('[SW] Pre-caching partial failure, proceeding:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Strictly skip non-GET requests or excluded external API hosts
  if (event.request.method !== 'GET') return;
  if (EXCLUDED_HOSTS.some(host => url.hostname.includes(host))) return;
  if (url.pathname.startsWith('/api/')) return;

  // Stale-while-revalidate for local scripts/styles/html, network-first for navigation
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic' &&
          !url.pathname.includes('/auth')
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch((err) => {
        // Network failed
        if (cachedResponse) return cachedResponse;
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        throw err;
      });

      return cachedResponse || fetchPromise;
    })
  );
});
