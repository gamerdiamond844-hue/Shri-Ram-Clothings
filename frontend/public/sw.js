/* ============================================================
   Shri Ram Clothings — Service Worker
   Handles background push notifications even when browser is closed
   ============================================================ */

const SW_VERSION = 'shriram-sw-v3';

// ── Install: skip waiting so new SW activates immediately ──────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

// ── Activate: claim all clients immediately ────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean up old caches if any
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== SW_VERSION).map(k => caches.delete(k)))
      ),
    ])
  );
});

// ── Push: show notification even when browser is closed ───────────────────
self.addEventListener('push', (event) => {
  // Always call event.waitUntil — this keeps SW alive until notification shows
  event.waitUntil(handlePush(event));
});

async function handlePush(event) {
  let payload = {
    title: 'Shri Ram Clothings',
    body: 'You have a new notification',
    icon: '/logo.jpg',
    badge: '/logo.jpg',
    data: { url: '/' },
    tag: 'shriram-default',
  };

  // Parse push data safely
  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = {
        title: parsed.title || payload.title,
        body: parsed.body || parsed.message || payload.body,
        icon: parsed.icon || '/logo.jpg',
        badge: parsed.badge || '/logo.jpg',
        image: parsed.image || undefined,
        data: parsed.data || { url: '/' },
        tag: parsed.tag || 'shriram-notif',
        vibrate: parsed.vibrate || [200, 100, 200],
        requireInteraction: false,
        actions: [
          { action: 'open', title: '🛍️ View Now' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
      };
    } catch {
      payload.body = event.data.text();
    }
  }

  // This is the critical call — must be inside event.waitUntil
  await self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: payload.icon,
    badge: payload.badge,
    image: payload.image,
    data: payload.data,
    tag: payload.tag,
    vibrate: payload.vibrate || [200, 100, 200],
    requireInteraction: false,
    actions: payload.actions || [],
  });
}

// ── Notification Click: open or focus the correct page ────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Ignore dismiss action
  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';
  const fullUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // If site is already open in a tab, focus and navigate it
        for (const client of windowClients) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            client.navigate(fullUrl);
            return client.focus();
          }
        }
        // Otherwise open a new tab
        return self.clients.openWindow(fullUrl);
      })
  );
});

// ── Push Subscription Change: auto-resubscribe if subscription expires ─────
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription.options)
      .then((newSubscription) => {
        // Notify backend about new subscription
        return fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newSubscription.toJSON()),
        });
      })
      .catch(() => {
        // Silently fail — user will re-subscribe next visit
      })
  );
});
