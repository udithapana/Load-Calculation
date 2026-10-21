// Regen Hybrid Load Calculator — offline cache for this app's folder only.
// All apps on udithapana.github.io share one origin, so this worker is registered with scope './'
// and only ever creates or deletes caches whose names start with 'load-calc-'.
const PREFIX = 'load-calc-';
const CACHE = PREFIX + 'v5';
const SHELL = ['./', './index.html', './form.html', './common.js', './common.css', './xlsx-writer.js', './pdf-writer.js', './config.js', './manifest.webmanifest',
  './regen-logo.png', './icon-192.png', './icon-512.png', './icon-maskable-192.png', './icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // network first so uploads show straight away; cached copy when offline
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request).then(r => r || (e.request.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});
