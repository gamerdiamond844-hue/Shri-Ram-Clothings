import { useState, useEffect } from 'react';
import api from '../utils/api';

const toUint8Array = (base64) => {
  const pad = '='.repeat((4 - base64.length % 4) % 4);
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
};

export function usePushNotifications() {
  const supported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;

  const [permission, setPermission] = useState(
    supported ? Notification.permission : 'denied'
  );
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check if already subscribed on mount
  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => { if (sub) setSubscribed(true); })
      .catch(() => {});
  }, [supported]);

  const enableNotifications = async () => {
    if (!supported) {
      setError('Push notifications are not supported in this browser.');
      return false;
    }
    setLoading(true);
    setError(null);

    // Hard timeout — 20 seconds max
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      setLoading(false);
      setError('Timed out. Please refresh and try again.');
    }, 20000);

    try {
      // 1. Ask browser permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setError(
          perm === 'denied'
            ? 'Blocked by browser. Click the 🔒 icon in address bar → Allow Notifications.'
            : 'Permission not granted.'
        );
        clearTimeout(timer);
        setLoading(false);
        return false;
      }

      // 2. Register SW
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      if (timedOut) return false;

      // 3. Get VAPID key
      const { data } = await api.get('/notifications/vapid-key');
      if (!data?.publicKey) throw new Error('Server error: missing VAPID key.');
      if (timedOut) return false;

      // 4. Subscribe (reuse existing if any)
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: toUint8Array(data.publicKey),
        });
      }
      if (timedOut) return false;

      // 5. Save to backend
      await api.post('/notifications/subscribe', sub.toJSON());

      clearTimeout(timer);
      setSubscribed(true);
      setLoading(false);
      setError(null);
      return true;
    } catch (err) {
      clearTimeout(timer);
      if (!timedOut) {
        setLoading(false);
        setError(err?.message || 'Failed to enable notifications. Please try again.');
      }
      console.error('[Push]', err);
      return false;
    }
  };

  const disableNotifications = async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.post('/notifications/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (err) {
      console.error('[Push unsubscribe]', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    supported, permission, subscribed, loading, error,
    enableNotifications,
    disableNotifications,
    requestPermission: enableNotifications, // backward compat
  };
}
