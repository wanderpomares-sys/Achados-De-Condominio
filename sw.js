/* Service worker mínimo: permite instalar o app. Não guarda nada em cache,
   então o app sempre abre a versão mais nova publicada. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
