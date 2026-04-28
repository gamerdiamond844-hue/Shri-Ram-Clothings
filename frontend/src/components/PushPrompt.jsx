import { useState, useEffect } from 'react';
import { Bell, X, CheckCircle, AlertCircle } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useAuth } from '../context/AuthContext';

export default function PushPrompt() {
  const { user } = useAuth();
  const { supported, permission, subscribed, loading, error, enableNotifications } = usePushNotifications();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user || !supported || permission === 'denied' || subscribed) return;
    const t = setTimeout(() => setVisible(true), 5000);
    return () => clearTimeout(t);
  }, [user, supported, permission, subscribed]);

  // Auto-close on success
  useEffect(() => {
    if (subscribed && visible) {
      const t = setTimeout(() => setVisible(false), 3000);
      return () => clearTimeout(t);
    }
  }, [subscribed, visible]);

  if (!visible || !user || !supported) return null;

  return (
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, width: 'calc(100% - 32px)', maxWidth: 400 }} className="fade-up">
      <div style={{ background: '#111827', borderRadius: 16, padding: '16px 18px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-start', gap: 14, border: '1px solid rgba(255,255,255,0.1)' }}>

        <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: subscribed ? 'rgba(34,197,94,0.15)' : error ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.15)' }}>
          {subscribed ? <CheckCircle size={20} color="#22c55e" /> : error ? <AlertCircle size={20} color="#ef4444" /> : <Bell size={20} color="#f97316" />}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {subscribed ? (
            <>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#22c55e', marginBottom: 3 }}>Notifications enabled! 🎉</p>
              <p style={{ fontSize: 12, color: '#9ca3af' }}>You'll get updates on new arrivals, sales and cart reminders.</p>
            </>
          ) : (
            <>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 3 }}>
                {error ? 'Could not enable notifications' : 'Stay in the loop 🔔'}
              </p>
              <p style={{ fontSize: 12, color: error ? '#fca5a5' : '#9ca3af', lineHeight: 1.5, marginBottom: 12 }}>
                {error || 'Get notified about new arrivals, flash sales, and cart reminders.'}
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={enableNotifications} disabled={loading}
                  style={{ flex: 1, padding: '9px 14px', borderRadius: 10, border: 'none', background: error ? '#dc2626' : '#f97316', color: '#fff', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.8 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                  {loading
                    ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />Enabling...</>
                    : <><Bell size={13} />{error ? 'Try Again' : 'Enable Notifications'}</>
                  }
                </button>
                {!loading && (
                  <button onClick={() => setVisible(false)}
                    style={{ padding: '9px 14px', borderRadius: 10, border: 'none', background: 'rgba(255,255,255,0.07)', color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>
                    Not now
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {!loading && (
          <button onClick={() => setVisible(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', flexShrink: 0, padding: 2, display: 'flex' }}>
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
