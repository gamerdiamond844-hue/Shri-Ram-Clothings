import { useState, useEffect } from 'react';
import api from '../utils/api';

const toUint8Array = (base64) => {
  const pad = '='.repeat((4 - base64.length % 4) % 4);
  const b64 = (base64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
};

const checkSupport = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

export function usePushNotifications() {
  const [supported, setSupported] = useState(null);
  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const s = checkSupport();
    setSupported(s);
    if (!s) return;
    setPermission(Notification.permission);
    // Check if already subscribed
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => { if (sub) setSubscribed(true); })
      .catch(() => {});
  }, []);

  const enableNotifications = async () => {
    if (!checkSupport()) {
      setError('Push notifications are not supported. Use Chrome, Firefox or Edge on desktop/Android.');
      return false;
    }

    setLoading(true);
    setError(null);

    // Hard 25s timeout
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      setLoading(false);
      setError('Timed out. Please refresh and try again.');
    }, 25000);

    try {
      // Step 1 — Request browser permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        clearTimeout(timer);
        setLoading(false);
        setError(
          perm === 'denied'
            ? 'Notifications blocked. Click 🔒 in address bar → Site Settings → Notifications → Allow.'
            : 'Permission not granted. Please try again.'
        );
        return false;
      }
      if (timedOut) return false;

      // Step 2 — Register SW and wait for it to be ACTIVE (not just installed)
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

      // Wait for SW to become active — critical for background push to work
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('SW activation timeout')), 10000);

        if (reg.active) {
          clearTimeout(timeout);
          return resolve(reg);
        }

        const sw = reg.installing || reg.waiting;
        if (!sw) {
          clearTimeout(timeout);
          return resolve(reg);
        }

        sw.addEventListener('statechange', function onStateChange() {
          if (sw.state === 'activated') {
            clearTimeout(timeout);
            sw.removeEventListener('statechange', onStateChange);
            resolve(reg);
          } else if (sw.state === 'redundant') {
            clearTimeout(timeout);
            sw.removeEventListener('statechange', onStateChange);
            reject(new Error('SW became redundant'));
          }
        });
      });

      // Get the active registration
      const activeReg = await navigator.serviceWorker.ready;
      if (timedOut) return false;

      // Step 3 — Get VAPID key from backend
      const { data } = await api.get('/notifications/vapid-key');
      if (!data?.publicKey) throw new Error('Server error: missing VAPID key.');
      if (timedOut) return false;

      // Step 4 — Create push subscription
      // Unsubscribe first to force fresh subscription (fixes stale sub issues)
      const existingSub = await activeReg.pushManager.getSubscription();
      if (existingSub) await existingSub.unsubscribe();

      const sub = await activeReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toUint8Array(data.publicKey),
      });
      if (timedOut) return false;

      // Step 5 — Save to backend with auth token
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
        const msg = err?.message || '';
        if (msg.includes('activation timeout') || msg.includes('redundant')) {
          setError('Service worker failed to start. Please refresh the page and try again.');
        } else if (msg.includes('permission') || msg.includes('denied')) {
          setError('Notification permission denied by browser.');
        } else {
          setError(msg || 'Failed to enable notifications. Please try again.');
        }
      }
      console.error('[Push SW]', err);
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
    supported,
    permission,
    subscribed,
    loading,
    error,
    enableNotifications,
    disableNotifications,
    requestPermission: enableNotifications,
  };
}
