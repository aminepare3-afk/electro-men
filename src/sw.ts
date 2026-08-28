/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { clientsClaim } from 'workbox-core';

declare let self: ServiceWorkerGlobalScope;

// Active immédiatement chaque nouvelle version du site dès qu'elle est installée,
// au lieu d'attendre que TOUS les onglets soient fermés (comportement par défaut
// des Service Workers). C'est ce qui causait "il faut actualiser plusieurs fois".
self.skipWaiting();
clientsClaim();

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Affiche instantanément la version en cache du catalogue pendant que la nouvelle est
// récupérée en fond — idéal pour quelqu'un de pressé sur une connexion lente.
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/products'),
  new StaleWhileRevalidate({
    cacheName: 'products-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 })],
  })
);

// Photos produits hébergées sur Supabase Storage : rarement modifiées une fois publiées,
// donc on les garde en cache longue durée pour un chargement instantané au retour.
registerRoute(
  ({ url }) => url.pathname.includes('/storage/v1/object/public/'),
  new CacheFirst({
    cacheName: 'product-images-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 })],
  })
);

// Fallback SPA pour la navigation, en excluant les routes serveur réelles (/api/, /share/).
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/^\/api\//, /^\/share\//],
  })
);

// ---- Notifications Push (fonctionnent même quand le site n'est pas ouvert) ----
self.addEventListener('push', (event) => {
  let data: { title?: string; body?: string; url?: string } = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'ELECTRO MEN', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || '🛒 Nouvelle commande ELECTRO MEN';
  const options: NotificationOptions = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
