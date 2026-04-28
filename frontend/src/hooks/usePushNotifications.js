import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
};

const isSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

export function usePushNotifications() {
  const [state, setState] = useState({
    permission: typeof Notification !== 'undefined' ? Notification.permission : 'denied',
    subscribed: false,
    loading: false,
    error: null,
    supported: isSupported(),
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const set = (patch) => {
    if (mountedRef.current) setState(s => ({ ...s, ...patch }));
  };

  // Check existing subscription on mount
  useEffect(() => {
    if (!isSupported()) return;
    navigator.serviceWorker.getRegistrations()
      .then(regs => {
        const reg = regs.find(r => r.active);
        if (!reg) return null;
        return reg.pushManager.getSubscription();
      })
      .then(sub => { if (sub) set({ subscribed: true }); })
      .catch(() => {});
  }, []);

  const enableNotifications = async () => {
    if (!isSupported()) {
      set({ error: 'Push notifications are not supported in this browser.' });
      return;
    }

    set({ loading: true, error: null });

    // Safety timeout — never get stuck loading forever
    const timeout = setTimeout(() => {
      set({ loading: false, error: 'Request timed out. Please try again.' });
    }, 15000);

    try {
      // Step 1 — Request browser permission
      const permission = await Notification.requestPermission();
      set({ permission });

      if (permission !== 'granted') {
        set({
          loading: false,
          error: permission === 'denied'
            ? 'Notifications blocked. Go to browser Settings → Site Settings → Notifications → Allow this site.'
            : 'Permission not granted. Please try again.',
        });
        clearTimeout(timeout);
        return;
      }

      // Step 2 — Register service worker
      let reg;
      try {
        reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        // Wait max 5s for SW to activate
        await Promise.race([
          navigator.serviceWorker.ready,
          new Promise((_, reject) => setTimeout(() => reject(new Error('SW timeout')), 5000)),
        ]);
        // Re-get the registration after ready
        reg = await navigator.serviceWorker.getRegistration('/');
        if (!reg) throw new Error('Service worker not found after registration');
      } catch (swErr) {
        throw new Error('Service worker failed to start. Try refreshing the page.');
      }

      // Step 3 — Get VAPID key
      let publicKey;
      try {
        const { data } = await api.get('/notifications/vapid-key');
        publicKey = data?.publicKey;
        if (!publicKey) throw new Error('No key');
      } catch {
        throw new Error('Could not connect to notification server. Check your internet connection.');
      }

      // Step 4 — Subscribe to push
      let sub;
      try {
        // Check if already subscribed
        sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
        }
      } catch (subErr) {
        const msg = subErr?.message || '';
        if (msg.toLowerCase().includes('permission')) {
          throw new Error('Notification permission was denied by the browser.');
        }
        throw new Error('Could not create push subscription. Try a different browser.');
      }

      // Step 5 — Save to backend
      try {
        await api.post('/notifications/subscribe', sub.toJSON());
      } catch {
        // Non-fatal — subscription still works locally
        console.warn('Could not save subscription to server, will retry next time.');
      }

      clearTimeout(timeout);
      set({ loading: false, subscribed: true, error: null });

    } catch (err) {
      clearTimeout(timeout);
      set({
        loading: false,
        error: err?.message || 'Something went wrong. Please try again.',
      });
      console.error('Push notification error:', err);
    }
  };

  const disableNotifications = async () => {
    set({ loading: true });
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) {
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await api.post('/notifications/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
          await sub.unsubscribe();
        }
      }
      set({ subscribed: false, loading: false });
    } catch {
      set({ loading: false });
    }
  };

  return {
    ...state,
    enableNotifications,
    disableNotifications,
    // Keep old name for compatibility
    requestPermission: enableNotifications,
  };
}
