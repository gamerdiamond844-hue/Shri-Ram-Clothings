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
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported] = useState(() => 'serviceWorker' in navigator && 'PushManager' in window);

  useEffect(() => {
    if (!supported) return;
    navigator.serviceWorker.ready.then(reg =>
      reg.pushManager.getSubscription().then(sub => setSubscribed(!!sub))
    ).catch(() => {});
  }, [supported]);

  const registerSW = useCallback(async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      return reg;
    } catch { return null; }
  }, []);

  const subscribe = useCallback(async () => {
    if (!supported) return false;
    setLoading(true);
    try {
      const reg = await registerSW();
      if (!reg) return false;
      const { data } = await api.get('/notifications/vapid-key');
      const appServerKey = urlBase64ToUint8Array(data.publicKey);
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appServerKey });
      await api.post('/notifications/subscribe', sub.toJSON());
      setSubscribed(true);
      setPermission('granted');
      return true;
    } catch { return false; }
    finally { setLoading(false); }
  }, [supported, registerSW]);

  const unsubscribe = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.post('/notifications/unsubscribe', { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch {} finally { setLoading(false); }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'denied';
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') await subscribe();
    return result;
  }, [subscribe]);

  return { permission, subscribed, loading, supported, requestPermission, subscribe, unsubscribe };
}
