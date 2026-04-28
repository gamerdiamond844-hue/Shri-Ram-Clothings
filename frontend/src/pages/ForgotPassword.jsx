import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success('Reset link sent if email exists!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <img src="/logo.jpg" alt="Shri Ram Clothings" style={{ height: 64, width: 'auto', borderRadius: 12, objectFit: 'contain' }} />
            <span className="font-display" style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Shri Ram Clothings</span>
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginTop: 16 }}>Forgot Password</h1>
          <p style={{ fontSize: 14, color: '#9ca3af', marginTop: 4 }}>Enter your email to receive a reset link</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          {sent ? (
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ width: 56, height: 56, background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: 24 }}>✉️</div>
              <p style={{ fontWeight: 600, color: '#374151', fontSize: 14 }}>Check your email for the reset link.</p>
              <p style={{ fontSize: 13, color: '#9ca3af' }}>Didn't receive it? Check spam or try again.</p>
              <Link to="/login" style={{ color: '#f97316', fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>Back to Login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email Address</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" className="input" />
              </div>
              <button type="submit" disabled={loading} className="btn-orange"
                style={{ width: '100%', padding: '13px', borderRadius: 12, fontSize: 15 }}>
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
              <p style={{ textAlign: 'center', fontSize: 13, color: '#9ca3af' }}>
                <Link to="/login" style={{ color: '#f97316', fontWeight: 600, textDecoration: 'none' }}>Back to Login</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
