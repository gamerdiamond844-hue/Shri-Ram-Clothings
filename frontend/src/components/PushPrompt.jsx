import { useState, useEffect } from 'react';
import { Bell, X, AlertCircle, CheckCircle } from 'lucide-react';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useAuth } from '../context/AuthContext';

export default function PushPrompt() {
  const { user } = useAuth();
  const { permission, subscribed, loading, error, supported, requestPermission } = usePushNotifications();
  const [show, setShow] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user || !supported) return;
    // Don't show if already granted/subscribed
    if (permission === 'granted' && subscribed) return;
    // Don't show if browser has denied
    if (permission === 'denied') return;
    // Show after 4 seconds
    const t = setTimeout(() => setShow(true), 4000);
    return () => clearTimeout(t);
  }, [user, supported, permission, subscribed]);

  const handleAllow = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      setSuccess(true);
      setTimeout(() => setShow(false), 2000);
    }
  };

  const handleDismiss = () => setShow(false);

  if (!show || !user || !supported) return null;
  if (permission === 'granted' && subscribed && !success) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, width: 'calc(100% - 32px)', maxWidth: 400,
      animation: 'fadeUp 0.3s ease forwards',
    }}>
      <div style={{
        background: '#111827', borderRadius: 16, padding: '16px 18px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'flex-start', gap: 14,
        border: '1px solid rgba(255,255,255,0.08)',
      }}>

        {/* Icon */}
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: success ? 'rgba(34,197,94,0.15)' : error ? 'rgba(239,68,68,0.15)' : 'rgba(249,115,22,0.15)',
        }}>
          {success
            ? <CheckCircle size={20} color="#22c55e" />
            : error
            ? <AlertCircle size={20} color="#ef4444" />
            : <Bell size={20} color="#f97316" />
          }
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {success ? (
            <>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#22c55e', marginBottom: 3 }}>
                Notifications enabled! 🎉
              </p>
              <p style={{ fontSize: 12, color: '#9ca3af' }}>
                You'll now get updates on new arrivals and offers.
              </p>
            </>
          ) : error ? (
            <>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', marginBottom: 3 }}>
                Could not enable notifications
              </p>
              <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.5, marginBottom: 12 }}>
                {error}
              </p>
              {permission !== 'denied' && (
                <button onClick={handleAllow} disabled={loading}
                  style={{ padding: '8px 16px', background: '#f97316', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Trying...' : 'Try Again'}
                </button>
              )}
            </>
          ) : (
            <>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 3 }}>
                Stay in the loop 🔔
              </p>
              <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.5, marginBottom: 12 }}>
                Get notified about new arrivals, flash sales, and your cart reminders.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleAllow} disabled={loading}
                  style={{
                    flex: 1, padding: '8px 14px', background: '#f97316', color: '#fff',
                    border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.75 : 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                  {loading
                    ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Enabling...</>
                    : <><Bell size={13} /> Enable Notifications</>
                  }
                </button>
                <button onClick={handleDismiss}
                  style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.08)', color: '#9ca3af', border: 'none', borderRadius: 10, fontSize: 13, cursor: 'pointer' }}>
                  Not now
                </button>
              </div>
            </>
          )}
        </div>

        {/* Close */}
        {!loading && (
          <button onClick={handleDismiss}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', padding: 2, flexShrink: 0 }}>
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
