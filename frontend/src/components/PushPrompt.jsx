import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useAuth } from '../context/AuthContext';

export default function PushPrompt() {
  const { user } = useAuth();
  const { permission, subscribed, loading, supported, requestPermission } = usePushNotifications();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user || !supported) return;
    if (permission !== 'default') return;
    if (localStorage.getItem('push_dismissed')) return;
    // Show prompt after 5 seconds
    const t = setTimeout(() => setShow(true), 5000);
    return () => clearTimeout(t);
  }, [user, supported, permission]);

  const handleAllow = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      setShow(false);
      localStorage.setItem('push_dismissed', '1');
    }
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    localStorage.setItem('push_dismissed', '1');
  };

  if (!show || dismissed || subscribed || permission !== 'default') return null;

  return (
    <div className="fade-in" style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, width: 'calc(100% - 32px)', maxWidth: 400,
    }}>
      <div style={{
        background: '#111827', borderRadius: 16, padding: '16px 18px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        display: 'flex', alignItems: 'flex-start', gap: 14,
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        {/* Icon */}
        <div style={{ width: 42, height: 42, background: 'rgba(249,115,22,0.15)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Bell size={20} color="#f97316" />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 3 }}>
            Stay in the loop 🔔
          </p>
          <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.5, marginBottom: 12 }}>
            Get notified about new arrivals, flash sales, and your cart reminders.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleAllow} disabled={loading}
              style={{ flex: 1, padding: '8px 14px', background: '#f97316', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => e.target.style.background = '#ea580c'}
              onMouseLeave={e => e.target.style.background = '#f97316'}>
              {loading ? 'Enabling...' : 'Enable Notifications'}
            </button>
            <button onClick={handleDismiss}
              style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.08)', color: '#9ca3af', border: 'none', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>
              Not now
            </button>
          </div>
        </div>

        {/* Close */}
        <button onClick={handleDismiss}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', padding: 2, flexShrink: 0 }}>
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
