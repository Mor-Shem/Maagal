/* Maagal service worker: makes the app installable and usable offline.
   Bump VERSION whenever index.html changes so phones pick up the new copy. */
const VERSION = 'maagal-v1';
const RUNTIME = 'maagal-runtime';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'];
// Fonts and the on-device text-recognition engine: fetched once, then served from the phone.
const RUNTIME_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== RUNTIME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;            // API calls (POST) always go straight to the network
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // App files: fresh copy when online, saved copy when offline.
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true })
          .then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
    );
    return;
  }

  if (RUNTIME_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(RUNTIME).then(c => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
