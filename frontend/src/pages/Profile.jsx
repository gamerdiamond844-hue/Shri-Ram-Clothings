import { useState, useEffect } from 'react';
import { User, MapPin, Lock, Bell, Plus, Pencil, Trash2, Check, Camera, BellOff, BellRing } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePushNotifications } from '../hooks/usePushNotifications';
import api from '../utils/api';
import toast from 'react-hot-toast';

const TABS = [
  { key: 'Profile',       icon: User },
  { key: 'Addresses',     icon: MapPin },
  { key: 'Password',      icon: Lock },
  { key: 'Notifications', icon: Bell },
];

const inp = {
  width: '100%', padding: '11px 14px', fontSize: 14,
  border: '1.5px solid #e5e7eb', borderRadius: 10,
  outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

const focusInp = (e) => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.1)'; };
const blurInp  = (e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; };

function PushToggleCard() {
  const { supported, permission, subscribed, loading, error, enableNotifications, disableNotifications } = usePushNotifications();

  if (!supported) return (
    <div style={{ background: '#f9fafb', borderRadius: 16, border: '1px solid #f3f4f6', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <BellOff size={22} color="#9ca3af" />
      <div>
        <p style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Push Notifications Not Supported</p>
        <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Your browser does not support push notifications. Try Chrome or Firefox.</p>
      </div>
    </div>
  );

  return (
    <div style={{ background: '#fff', borderRadius: 16, border: `1.5px solid ${subscribed ? '#bbf7d0' : '#f3f4f6'}`, padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: subscribed ? '#f0fdf4' : '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {subscribed ? <BellRing size={22} color="#16a34a" /> : <Bell size={22} color="#f97316" />}
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 2 }}>Push Notifications</p>
            <p style={{ fontSize: 12, color: '#6b7280' }}>
              {subscribed ? '✅ Enabled — you will receive alerts for orders, sales and cart reminders.'
                : permission === 'denied' ? '🚫 Blocked by browser. Click the 🔒 icon in address bar → Allow Notifications.'
                : 'Get notified about new arrivals, flash sales and order updates.'}
            </p>
            {error && <p style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{error}</p>}
          </div>
        </div>

        <button
          onClick={subscribed ? disableNotifications : enableNotifications}
          disabled={loading || permission === 'denied'}
          style={{
            padding: '10px 20px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 600,
            cursor: (loading || permission === 'denied') ? 'not-allowed' : 'pointer',
            background: subscribed ? '#fef2f2' : '#f97316',
            color: subscribed ? '#ef4444' : '#fff',
            opacity: loading ? 0.7 : 1,
            display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
            transition: 'all 0.15s',
          }}>
          {loading
            ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />Please wait...</>
            : subscribed ? <><BellOff size={14} />Turn Off</> : <><Bell size={14} />Enable Now</>
          }
        </button>
      </div>
    </div>
  );
}

export default function Profile() {
  const { user, login } = useAuth();
  const [tab, setTab] = useState('Profile');
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [addrForm, setAddrForm] = useState(null);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (tab === 'Addresses') api.get('/users/addresses').then(r => setAddresses(r.data)).catch(() => {});
    if (tab === 'Notifications') {
      api.get('/users/notifications').then(r => setNotifications(r.data)).catch(() => {});
      api.put('/users/notifications/read').catch(() => {});
    }
  }, [tab]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name);
      fd.append('phone', form.phone);
      if (avatar) fd.append('avatar', avatar);
      const res = await api.put('/auth/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      login(localStorage.getItem('src_token'), res.data);
      toast.success('Profile updated!');
      setAvatar(null); setAvatarPreview('');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const saveAddress = async (e) => {
    e.preventDefault();
    try {
      if (addrForm.id) {
        const res = await api.put(`/users/addresses/${addrForm.id}`, addrForm);
        setAddresses(prev => prev.map(a => a.id === addrForm.id ? res.data : a));
      } else {
        const res = await api.post('/users/addresses', addrForm);
        setAddresses(prev => [...prev, res.data]);
      }
      setAddrForm(null);
      toast.success('Address saved');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const deleteAddress = async (id) => {
    try {
      await api.delete(`/users/addresses/${id}`);
      setAddresses(prev => prev.filter(a => a.id !== id));
      toast.success('Address deleted');
    } catch { toast.error('Failed'); }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirm) return toast.error('Passwords do not match');
    if (pwForm.newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    try {
      await api.put('/auth/password', { currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed successfully');
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const blankAddr = { full_name: '', mobile: '', address: '', city: '', state: '', pincode: '', landmark: '', is_default: false };

  const avatarSrc = avatarPreview || user?.avatar_url ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=f97316&color=fff&size=80`;

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', paddingTop: 32, paddingBottom: 64 }}>
      <div className="wrap" style={{ maxWidth: 860 }}>

        {/* ── Profile Header Card ── */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', padding: '24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <img
              src={avatarSrc}
              alt={user?.name}
              style={{ width: 72, height: 72, borderRadius: 16, objectFit: 'cover', display: 'block', border: '3px solid #fff7ed' }}
            />
            <label style={{ position: 'absolute', bottom: -4, right: -4, width: 26, height: 26, background: '#f97316', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid #fff', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
              <Camera size={12} color="#fff" />
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
            </label>
          </div>

          {/* User info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="font-display" style={{ fontSize: 20, fontWeight: 900, color: '#111827', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name}
            </h1>
            <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 6 }}>{user?.email}</p>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#f97316', background: '#fff7ed', padding: '3px 10px', borderRadius: 100, textTransform: 'capitalize' }}>
              {user?.role}
            </span>
          </div>

          {/* Avatar change hint */}
          {avatar && (
            <div style={{ fontSize: 12, color: '#f97316', background: '#fff7ed', padding: '6px 12px', borderRadius: 8, flexShrink: 0 }}>
              📷 New photo selected — save to apply
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 4, background: '#fff', borderRadius: 14, padding: 6, border: '1px solid #f3f4f6', marginBottom: 20, overflowX: 'auto' }}>
          {TABS.map(({ key, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', transition: 'all 0.15s',
                background: tab === key ? '#f97316' : 'transparent',
                color: tab === key ? '#fff' : '#6b7280',
                minWidth: 80,
              }}>
              <Icon size={15} />
              {key}
            </button>
          ))}
        </div>

        {/* ── Profile Tab ── */}
        {tab === 'Profile' && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <User size={17} color="#f97316" />
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Personal Information</h2>
            </div>

            <form onSubmit={saveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-grid-2">
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Full Name</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Your full name"
                    style={inp}
                    onFocus={focusInp} onBlur={blurInp}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Phone Number</label>
                  <input
                    value={form.phone}
                    onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+91 98765 43210"
                    style={inp}
                    onFocus={focusInp} onBlur={blurInp}
                  />
                </div>
                <div className="col-span-2">
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email Address</label>
                  <input
                    value={user?.email}
                    disabled
                    style={{ ...inp, background: '#f9fafb', color: '#9ca3af', cursor: 'not-allowed', border: '1.5px solid #f3f4f6' }}
                  />
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Email cannot be changed</p>
                </div>
              </div>

              <div>
                <button type="submit" disabled={saving} className="btn-primary"
                  style={{ padding: '11px 28px', borderRadius: 10, fontSize: 14 }}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Addresses Tab ── */}
        {tab === 'Addresses' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={17} color="#f97316" />
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Saved Addresses</h2>
              </div>
              <button onClick={() => setAddrForm(blankAddr)} className="btn-primary"
                style={{ padding: '9px 16px', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Plus size={14} /> Add New
              </button>
            </div>

            {/* Address form */}
            {addrForm && (
              <form onSubmit={saveAddress} style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #fed7aa', padding: 20 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 14 }}>
                  {addrForm.id ? 'Edit Address' : 'New Address'}
                </p>
                <div className="form-grid-2">
                  {[
                    ['full_name', 'Full Name', true, 'col-span-2'],
                    ['mobile', 'Mobile Number', true, ''],
                    ['address', 'Street Address', true, 'col-span-2'],
                    ['city', 'City', true, ''],
                    ['state', 'State', true, ''],
                    ['pincode', 'Pincode', true, ''],
                    ['landmark', 'Landmark (Optional)', false, 'col-span-2'],
                  ].map(([field, label, required, cls]) => (
                    <div key={field} className={cls}>
                      <input
                        required={required}
                        value={addrForm[field] || ''}
                        onChange={e => setAddrForm(p => ({ ...p, [field]: e.target.value }))}
                        placeholder={label}
                        style={inp}
                        onFocus={focusInp} onBlur={blurInp}
                      />
                    </div>
                  ))}
                  <div className="col-span-2" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      id="def_addr"
                      checked={addrForm.is_default}
                      onChange={e => setAddrForm(p => ({ ...p, is_default: e.target.checked }))}
                      style={{ width: 16, height: 16, accentColor: '#f97316', cursor: 'pointer' }}
                    />
                    <label htmlFor="def_addr" style={{ fontSize: 13, color: '#374151', cursor: 'pointer', fontWeight: 500 }}>
                      Set as default address
                    </label>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button type="submit" className="btn-orange" style={{ padding: '10px 20px', borderRadius: 10, fontSize: 13 }}>Save Address</button>
                  <button type="button" onClick={() => setAddrForm(null)}
                    style={{ padding: '10px 20px', borderRadius: 10, fontSize: 13, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Address list */}
            {addresses.map(addr => (
              <div key={addr.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', padding: '18px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 4 }}>
                    {addr.full_name}
                    <span style={{ color: '#9ca3af', fontWeight: 400, marginLeft: 8 }}>· {addr.mobile}</span>
                  </p>
                  <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
                    {addr.address}, {addr.city}, {addr.state} — {addr.pincode}
                  </p>
                  {addr.landmark && <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Near: {addr.landmark}</p>}
                  {addr.is_default && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#f97316', background: '#fff7ed', padding: '3px 8px', borderRadius: 100, marginTop: 6 }}>
                      <Check size={11} /> Default
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => setAddrForm(addr)}
                    style={{ width: 34, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer', background: '#fff7ed', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => deleteAddress(addr.id)}
                    style={{ width: 34, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}

            {!addresses.length && !addrForm && (
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', padding: '48px 24px', textAlign: 'center' }}>
                <MapPin size={32} style={{ margin: '0 auto 12px', color: '#e5e7eb' }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>No saved addresses</p>
                <p style={{ fontSize: 13, color: '#9ca3af' }}>Add an address to speed up checkout</p>
              </div>
            )}
          </div>
        )}

        {/* ── Password Tab ── */}
        {tab === 'Password' && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Lock size={17} color="#f97316" />
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Change Password</h2>
            </div>

            <form onSubmit={changePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 400 }}>
              {[
                ['currentPassword', 'Current Password'],
                ['newPassword', 'New Password'],
                ['confirm', 'Confirm New Password'],
              ].map(([field, label]) => (
                <div key={field}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>{label}</label>
                  <input
                    type="password"
                    value={pwForm[field]}
                    onChange={e => setPwForm(p => ({ ...p, [field]: e.target.value }))}
                    placeholder="••••••••"
                    style={inp}
                    onFocus={focusInp} onBlur={blurInp}
                  />
                </div>
              ))}
              <div>
                <button type="submit" className="btn-primary" style={{ padding: '11px 28px', borderRadius: 10, fontSize: 14 }}>
                  Update Password
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Notifications Tab ── */}
        {tab === 'Notifications' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Push Notification Toggle Card */}
            <PushToggleCard />

            {/* In-app notifications */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={17} color="#f97316" />
                <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Recent Notifications</h2>
              </div>
              {notifications.length ? (
                <div>
                  {notifications.map(n => (
                    <div key={n.id} style={{ padding: '14px 20px', borderBottom: '1px solid #f9fafb', background: n.is_read ? '#fff' : '#fff7ed' }}>
                      <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{n.message}</p>
                      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{new Date(n.created_at).toLocaleString('en-IN')}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <Bell size={32} style={{ margin: '0 auto 12px', color: '#e5e7eb' }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>No notifications yet</p>
                  <p style={{ fontSize: 13, color: '#9ca3af' }}>Order updates and alerts will appear here</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
