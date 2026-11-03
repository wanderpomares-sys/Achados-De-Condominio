/* Service worker mínimo: permite instalar o app e garante que ele sempre busque
   a versão mais nova publicada (revalida no servidor a cada abertura; não guarda cópia antiga). */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r.url, { cache: 'no-cache', credentials: 'same-origin' }).catch(() => fetch(r)));
});
