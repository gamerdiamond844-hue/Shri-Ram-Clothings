import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
};

export function usePushNotifications() {
  const [permission, setPermission] = useState(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [supported] = useState(() =>
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );

  // Check existing subscription on mount
  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.ready
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => setSubscribed(!!sub))
      .catch(() => {});
  }, [supported]);

  const registerSW = useCallback(async () => {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    // Wait for SW to be ready (handles installing state)
    await new Promise((resolve) => {
      if (reg.active) return resolve();
      const sw = reg.installing || reg.waiting;
      if (!sw) return resolve();
      sw.addEventListener('statechange', function handler() {
        if (this.state === 'activated') { resolve(); sw.removeEventListener('statechange', handler); }
      });
    });
    await navigator.serviceWorker.ready;
    return reg;
  }, []);

  const subscribe = useCallback(async () => {
    if (!supported) {
      setError('Push notifications are not supported in this browser.');
      return false;
    }
    setLoading(true);
    setError(null);
    try {
      // Register service worker
      const reg = await registerSW();

      // Get VAPID key from backend
      const { data } = await api.get('/notifications/vapid-key');
      if (!data?.publicKey) throw new Error('Could not get notification key from server.');

      const appServerKey = urlBase64ToUint8Array(data.publicKey);

      // Subscribe to push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey,
      });

      // Save subscription to backend
      await api.post('/notifications/subscribe', sub.toJSON());

      setSubscribed(true);
      setPermission('granted');
      setError(null);
      return true;
    } catch (err) {
      const msg = err?.message || '';
      if (msg.includes('denied') || msg.includes('permission')) {
        setError('Notifications blocked. Please allow notifications in your browser settings.');
      } else if (msg.includes('network') || msg.includes('fetch')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError('Could not enable notifications. Please try again.');
      }
      console.error('Push subscribe error:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [supported, registerSW]);

  const unsubscribe = useCallback(async () => {
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
      console.error('Unsubscribe error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!supported) {
      setError('Push notifications are not supported in this browser.');
      return 'denied';
    }
    setLoading(true);
    setError(null);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === 'granted') {
        await subscribe();
      } else if (result === 'denied') {
        setError('Notifications blocked. Enable them in your browser settings and try again.');
      }
      return result;
    } catch (err) {
      setError('Could not request notification permission.');
      return 'denied';
    } finally {
      setLoading(false);
    }
  }, [supported, subscribe]);

  return { permission, subscribed, loading, error, supported, requestPermission, subscribe, unsubscribe };
}
