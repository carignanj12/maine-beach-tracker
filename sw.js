const SHELL_CACHE = 'beach-shell-v1';
const CDN_CACHE   = 'beach-cdn-v1';
const ALL_CACHES  = [SHELL_CACHE, CDN_CACHE];

const SHELL_FILES = [
  './',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// Domains that must always go to the network (Firebase services)
const FIREBASE_PATTERNS = [
  'gstatic.com/firebasejs',
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebasestorage.app',
  'firebaseapp.com',
];

// Domains to cache aggressively (CDN assets that rarely change)
const CDN_PATTERNS = [
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'basemaps.cartocdn.com',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => !ALL_CACHES.includes(k)).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Firebase: always hit the network
  if (FIREBASE_PATTERNS.some(p => url.includes(p))) {
    event.respondWith(fetch(event.request));
    return;
  }

  // CDN assets: cache-first, network fallback, then cache the response
  if (CDN_PATTERNS.some(p => url.includes(p))) {
    event.respondWith(
      caches.open(CDN_CACHE).then(cache =>
        cache.match(event.request).then(hit => {
          if (hit) return hit;
          return fetch(event.request).then(res => {
            if (res.ok) cache.put(event.request, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // App shell & everything else: cache-first, network fallback
  event.respondWith(
    caches.match(event.request).then(hit => {
      if (hit) return hit;
      return fetch(event.request).then(res => {
        if (res.ok) {
          caches.open(SHELL_CACHE).then(cache => cache.put(event.request, res.clone()));
        }
        return res;
      });
    })
  );
});
