const CACHE_NAME = 'ecopulse-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons.svg'
];

self.addEventListener('install', (event) => {
  // Force the waiting service worker to become the active service worker immediately
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
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
    }).then(() => {
      // Force all active client tabs to be claimed by this service worker immediately
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Network-First strategy: Attempt network request first to guarantee the latest code is loaded,
  // falling back to cache if offline or on network failure.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If valid, clone and update the cache
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline fallback
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || (event.request.mode === 'navigate' ? caches.match('/') : null);
        });
      })
  );
});

