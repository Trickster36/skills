const CACHE_NAME = 'skill-tracker-shell-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './css/main.css',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Shell files: cache-first. Everything else (e.g. GitHub API calls
// added in a later step): network, no caching — falls through untouched.
self.addEventListener('fetch', (event) => {
  const isShellFile = SHELL_FILES.some((file) =>
    event.request.url.endsWith(file.replace('./', '/'))
  );
  if (!isShellFile) return;

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
