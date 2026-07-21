const CACHE_NAME = 'barberflow-v1';
const OFFLINE_ASSETS = [
  '/',
  '/index.html',
  '/logo.svg',
  '/manifest.json'
];

// Install Event - cache core shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(OFFLINE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event - clean up obsolete caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - network first, fallback to cache, handle navigation routing
self.addEventListener('fetch', (event) => {
  // Ignore non-GET requests (e.g. database imports or external logs)
  if (event.request.method !== 'GET') return;

  // Handle SPA navigation routes (subpages like /dashboard, /cashier, etc.)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/index.html') || new Response('Offline: Page not cached.', { status: 503, statusText: 'Service Unavailable' });
      })
    );
    return;
  }

  // Cache falling back to network strategy for assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Serve from cache but update in background if online (Stale-While-Revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse);
            });
          }
        }).catch(() => {/* Ignore network errors when offline */});
        
        return cachedResponse;
      }

      // Fetch from network if not in cache
      return fetch(event.request).then((networkResponse) => {
        // Cache newly fetched assets dynamically
        if (
          networkResponse && 
          networkResponse.status === 200 && 
          event.request.url.startsWith(self.location.origin)
        ) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cacheCopy);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback for missing resources
        if (event.request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/index.html');
        }
      });
    })
  );
});
