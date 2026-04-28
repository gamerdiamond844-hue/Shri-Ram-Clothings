import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

// Google "G" SVG logo — official colors, no external dependency
const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
    <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

export default function GoogleButton({ onSuccess, label = 'Continue with Google' }) {
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isConfigured = clientId && clientId !== 'your_google_client_id_here';
  const callbackRef = useRef(null);

  // Keep callback ref fresh so the GSI callback always has latest onSuccess
  const handleCredentialResponse = useCallback(async (response) => {
    if (!response?.credential) return;
    setLoading(true);
    try {
      const res = await api.post('/auth/google', { credential: response.credential });
      onSuccess(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [onSuccess]);

  callbackRef.current = handleCredentialResponse;

  // Initialize GSI once when clientId is available
  useEffect(() => {
    if (!isConfigured) return;
    const init = () => {
      if (!window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (r) => callbackRef.current(r),
        auto_select: false,
        cancel_on_tap_outside: true,
      });
    };
    if (window.google?.accounts?.id) {
      init();
    } else {
      const t = setInterval(() => {
        if (window.google?.accounts?.id) { init(); clearInterval(t); }
      }, 150);
      return () => clearInterval(t);
    }
  }, [clientId, isConfigured]);

  const handleClick = () => {
    if (!isConfigured) {
      toast.error('Google login is not configured yet. Please use email/password login.');
      return;
    }
    if (loading) return;
    if (window.google?.accounts?.id) {
      window.google.accounts.id.prompt((notification) => {
        // If One Tap is suppressed (e.g. user dismissed it), fall back to popup
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          openPopup();
        }
      });
    } else {
      openPopup();
    }
  };

  const openPopup = () => {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: window.location.origin,
      response_type: 'token id_token',
      scope: 'openid email profile',
      nonce: Math.random().toString(36).slice(2),
      prompt: 'select_account',
    });
    const popup = window.open(
      `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
      'google-login',
      'width=500,height=600,left=200,top=100'
    );
    if (!popup) {
      toast.error('Popup blocked. Please allow popups for this site.');
      return;
    }
    setLoading(true);
    const timer = setInterval(() => {
      if (popup.closed) { clearInterval(timer); setLoading(false); }
    }, 500);
  };

  const btnStyle = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: '11px 16px',
    borderRadius: 10,
    border: `1.5px solid ${hovered ? '#dadce0' : '#e5e7eb'}`,
    background: hovered ? '#f8f9fa' : '#fff',
    cursor: loading ? 'not-allowed' : 'pointer',
    fontSize: 14,
    fontWeight: 600,
    color: '#3c4043',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
    boxShadow: hovered ? '0 1px 6px rgba(60,64,67,0.15)' : '0 1px 3px rgba(60,64,67,0.08)',
    opacity: loading ? 0.75 : 1,
    letterSpacing: '0.01em',
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={btnStyle}
      disabled={loading}
    >
      {loading ? (
        <>
          <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2, flexShrink: 0 }} />
          <span>Connecting to Google...</span>
        </>
      ) : (
        <>
          <GoogleLogo />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
