import { useState, useEffect } from 'react';
import api from '../utils/api';

const toUint8Array = (base64) => {
  const pad = '='.repeat((4 - base64.length % 4) % 4);
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
};

// Check support ONLY after mount (never during SSR / module init)
const checkSupport = () =>
  typeof window !== 'undefined' &&
  typeof navigator !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

export function usePushNotifications() {
  // Start as null (unknown), set after mount
  const [supported, setSupported] = useState(null);
  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Detect support and current permission after mount
  useEffect(() => {
    const s = checkSupport();
    setSupported(s);
    if (s) {
      setPermission(Notification.permission);
      // Check existing subscription
      navigator.serviceWorker.ready
        .then(reg => reg.pushManager.getSubscription())
        .then(sub => { if (sub) setSubscribed(true); })
        .catch(() => {});
    }
  }, []);

  const enableNotifications = async () => {
    const s = checkSupport();
    if (!s) {
      setError('Push notifications are not supported in this browser. Please use Chrome, Firefox or Edge on desktop/Android.');
      return false;
    }

    setLoading(true);
    setError(null);

    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      setLoading(false);
      setError('Request timed out. Please refresh the page and try again.');
    }, 20000);

    try {
      // Step 1 — Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        clearTimeout(timer);
        setLoading(false);
        setError(
          perm === 'denied'
            ? 'Notifications are blocked. Click the 🔒 lock icon in your browser address bar → Site Settings → Allow Notifications.'
            : 'Permission was not granted. Please try again.'
        );
        return false;
      }

      // Step 2 — Register service worker
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      await navigator.serviceWorker.ready;
      if (timedOut) return false;

      // Step 3 — Get VAPID public key from backend
      const { data } = await api.get('/notifications/vapid-key');
      if (!data?.publicKey) throw new Error('Could not get server key. Please try again.');
      if (timedOut) return false;

      // Step 4 — Create push subscription
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: toUint8Array(data.publicKey),
        });
      }
      if (timedOut) return false;

      // Step 5 — Save subscription to backend
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
        setError(err?.message || 'Something went wrong. Please try again.');
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
    supported,   // null = still detecting, true = supported, false = not supported
    permission,
    subscribed,
    loading,
    error,
    enableNotifications,
    disableNotifications,
    requestPermission: enableNotifications,
  };
}
