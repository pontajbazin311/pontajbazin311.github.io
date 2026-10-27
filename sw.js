// Păstrează fișierele aplicației pentru pornire rapidă. Pontajele se trimit mereu online.
// Fișierele se iau întâi de pe internet, deci orice actualizare ajunge imediat pe telefoane.
const VERSIUNE = 'pontaj311-v4';
const FISIERE = ['./', 'index.html', 'manager.html', 'app.js?v=4', 'app.css?v=4', 'config.js?v=4', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSIUNE).then(c => c.addAll(FISIERE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== VERSIUNE).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-store' }).then(r => { const c = r.clone(); caches.open(VERSIUNE).then(x => x.put(e.request, c)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: url.pathname.endsWith('/') || url.pathname.endsWith('.html') })
        .then(r => r || caches.match(url.pathname.endsWith('manager.html') ? 'manager.html' : 'index.html')))
  );
});
