const CACHE_NAME = 'shriram-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

// Handle push notification received
self.addEventListener('push', e => {
  if (!e.data) return;
  let data = {};
  try { data = e.data.json(); } catch { data = { title: 'Shri Ram Clothings', body: e.data.text() }; }

  const options = {
    body: data.body || '',
    icon: data.icon || '/logo.jpg',
    badge: data.badge || '/logo.jpg',
    image: data.image || undefined,
    data: data.data || { url: '/' },
    tag: data.tag || 'shriram-notif',
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'View Now' },
      { action: 'close', title: 'Dismiss' },
    ],
    vibrate: [200, 100, 200],
  };

  e.waitUntil(self.registration.showNotification(data.title || 'Shri Ram Clothings', options));
});

// Handle notification click
self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'close') return;

  const url = e.notification.data?.url || '/';
  const fullUrl = self.location.origin + url;

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Focus existing tab if open
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          client.navigate(fullUrl);
          return client.focus();
        }
      }
      // Open new tab
      if (clients.openWindow) return clients.openWindow(fullUrl);
    })
  );
});
