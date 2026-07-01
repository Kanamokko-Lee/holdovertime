const CACHE = 'hot-calc-v1';
const ASSETS = ['/', '/index.html'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      return Promise.allSettled(
        ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('Cache add failed:', url, err))
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // Only handle same-origin requests
  if (!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) {
        const ct = cached.headers.get('content-type') || '';
        // Reject proxy-injected auth pages
        if (ct.includes('text/html') && !ct.includes('charset')) {
          return fetch(e.request).catch(() => cached);
        }
        return cached;
      }
      return fetch(e.request).then(res => {
        if (!res.ok) return res;
        const clone = res.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return res;
      });
    })
  );
});
