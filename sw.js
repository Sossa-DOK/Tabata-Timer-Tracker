const CACHE = 'tabata-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon_192.png',
  '/icons/icon_512.png',
];

// Pre-cache app shell on install. Use allSettled so one missing
// asset (e.g. an icon) doesn't abort the entire install.
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(ASSETS.map(url => cache.add(url)))
    )
  );
  self.skipWaiting();
});

// Remove old caches when a new service worker takes over.
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Only handle same-origin GET requests.
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    // ignoreSearch: true means /?app=1 matches the cached /
    caches.match(e.request, { ignoreSearch: true }).then(cached => {
      if (cached) return cached;

      return fetch(e.request).then(response => {
        // Dynamically cache any successful same-origin response.
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback: serve the app shell for any navigation request.
        if (e.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
