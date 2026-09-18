const CACHE_VERSION = 'v12';
const CACHE_NAME = 'pls-cadd-guide-' + CACHE_VERSION;

const APP_SHELL = [
  './',
  'index.html',
  'css/styles.css',
  'js/app.js',
  'steps.json',
  'manifest.webmanifest',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/icon-maskable-512.png',
  'assets/icons/apple-touch-icon.png',
  'assets/icons/favicon-32.png',
  'assets/icons/favicon-16.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(APP_SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys.filter(function (key) { return key !== CACHE_NAME; })
            .map(function (key) { return caches.delete(key); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // fuentes de Google u otros orígenes: sin interceptar

  // Navegaciones (index.html, admin.html) y código propio (js/css) + steps.json:
  // red primero, con el caché como respaldo sin conexión. Así nunca se sirve una
  // versión vieja de la app o del contenido mientras haya red disponible.
  var isOwnCode = /\.(?:html|js|css|json)$/.test(url.pathname);
  if (req.mode === 'navigate' || isOwnCode) {
    event.respondWith(
      fetch(req)
        .then(function (res) {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
          }
          return res;
        })
        .catch(function () {
          return caches.match(req).then(function (cached) {
            return cached || (req.mode === 'navigate' ? caches.match('index.html') : undefined);
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      });
    })
  );
});
