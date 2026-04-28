import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import GoogleButton from '../components/GoogleButton';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleGoogleSuccess = (data) => {
    login(data.token, data.user);
    toast.success(`Welcome, ${data.user.name}! 🎉`);
    navigate('/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      const res = await api.post('/auth/register', form);
      login(res.data.token, res.data.user);
      toast.success(`Welcome, ${res.data.user.name}! 🎉`);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Link to="/" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <img src="/logo.jpg" alt="Shri Ram Clothings" style={{ height: 64, width: 'auto', borderRadius: 12, objectFit: 'contain' }} />
            <span className="font-display" style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Shri Ram Clothings</span>
          </Link>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', marginTop: 16 }}>Create your account</h1>
          <p style={{ fontSize: 14, color: '#9ca3af', marginTop: 4 }}>Join thousands of happy customers</p>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>

          {/* Google Sign Up */}
          <GoogleButton onSuccess={handleGoogleSuccess} label="Continue with Google" />

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#f3f4f6' }} />
            <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500, whiteSpace: 'nowrap' }}>or sign up with email</span>
            <div style={{ flex: 1, height: 1, background: '#f3f4f6' }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Full Name</label>
              <input required value={form.name} onChange={set('name')} placeholder="Your full name" className="input" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email Address</label>
              <input type="email" required value={form.email} onChange={set('email')} placeholder="you@example.com" className="input" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Phone <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional)</span>
              </label>
              <input type="tel" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" className="input" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPw ? 'text' : 'password'} required value={form.password} onChange={set('password')}
                  placeholder="Min. 6 characters" className="input" style={{ paddingRight: 44 }} />
                <button type="button" onClick={() => setShowPw(s => !s)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 0 }}>
                  {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-orange"
              style={{ width: '100%', padding: '13px', borderRadius: 12, fontSize: 15, marginTop: 4 }}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#9ca3af', marginTop: 24 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#f97316', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
