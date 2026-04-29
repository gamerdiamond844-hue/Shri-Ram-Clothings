import { useState, useEffect, useCallback } from 'react';
import { Search, Ban, Trash2, Eye, Download, Send, X, ShieldCheck, ShoppingBag, Heart, MapPin, Package, Globe, Truck } from 'lucide-react';
import api, { downloadFile } from '../../utils/api';
import toast from 'react-hot-toast';

const inp = { width: '100%', padding: '9px 12px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff' };

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'new', label: 'New (7d)' },
  { key: 'free_delivery', label: 'Free Delivery' },
];

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [notifMsg, setNotifMsg] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);
  const [savingFD, setSavingFD] = useState(false);
  const [fdForm, setFdForm] = useState({ is_free_delivery: false, free_delivery_expiry: '', free_delivery_note: '' });
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: LIMIT });
      if (search) p.set('search', search);
      if (filter) p.set('filter', filter);
      const [uRes, sRes] = await Promise.all([
        api.get(`/admin/users?${p}`),
        api.get('/admin/users/stats'),
      ]);
      setUsers(uRes.data.users || []);
      setTotal(uRes.data.total || 0);
      setStats(sRes.data);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, [page, search, filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, filter]);

  const openDetail = async (user) => {
    setSelected({ ...user, _loading: true });
    setDetailLoading(true);
    try {
      const res = await api.get(`/admin/users/${user.id}`);
      setSelected(res.data);
      setFdForm({
        is_free_delivery: res.data.is_free_delivery || false,
        free_delivery_expiry: res.data.free_delivery_expiry ? res.data.free_delivery_expiry.split('T')[0] : '',
        free_delivery_note: res.data.free_delivery_note || '',
      });
    } catch { toast.error('Failed to load user details'); }
    finally { setDetailLoading(false); }
  };

  const toggleBan = async (u) => {
    try {
      const res = await api.put(`/admin/users/${u.id}/ban`);
      toast.success(res.data.is_banned ? 'User blocked' : 'User unblocked');
      if (selected?.id === u.id) setSelected(prev => ({ ...prev, is_banned: res.data.is_banned }));
      load();
    } catch { toast.error('Failed'); }
  };

  const deleteUser = async (id) => {
    if (!confirm('Permanently delete this user and all their data?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success('User deleted');
      if (selected?.id === id) setSelected(null);
      load();
    } catch { toast.error('Failed'); }
  };

  const sendNotification = async () => {
    if (!notifMsg.trim()) return toast.error('Enter a message');
    setSendingNotif(true);
    try {
      await api.post(`/admin/users/${selected.id}/notify`, { message: notifMsg });
      toast.success('Notification sent!');
      setNotifMsg('');
    } catch { toast.error('Failed'); }
    finally { setSendingNotif(false); }
  };

  const exportCSV = async () => {
    try {
      await downloadFile('/admin/users/export', `users-${new Date().toISOString().slice(0,10)}.xlsx`);
      toast.success('Users exported!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Export failed');
    }
  };

  const saveFreeDelivery = async () => {
    setSavingFD(true);
    try {
      const res = await api.put(`/admin/users/${selected.id}/free-delivery`, fdForm);
      toast.success(fdForm.is_free_delivery ? '🎉 Free delivery enabled!' : 'Free delivery disabled');
      setSelected(prev => ({ ...prev, ...res.data }));
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSavingFD(false); }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }} className="grid-features">
          {[
            { label: 'Total Users',  value: stats.total,      bg: '#f9fafb', color: '#111827' },
            { label: 'Active',       value: stats.active,     bg: '#f0fdf4', color: '#166534' },
            { label: 'Blocked',      value: stats.blocked,    bg: '#fef2f2', color: '#991b1b' },
            { label: 'Today',        value: stats.today,      bg: '#fff7ed', color: '#c2410c' },
            { label: 'This Week',    value: stats.this_week,  bg: '#eff6ff', color: '#1e40af' },
            { label: 'This Month',   value: stats.this_month, bg: '#f5f3ff', color: '#6b21a8' },
          ].map(({ label, value, bg, color }) => (
            <div key={label} style={{ background: bg, borderRadius: 12, padding: '12px 16px' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: 11, color, opacity: 0.7, marginTop: 2, fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {/* Filter pills */}
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{ padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: filter === f.key ? '#f97316' : '#fff', color: filter === f.key ? '#fff' : '#6b7280', boxShadow: filter === f.key ? '0 2px 8px rgba(249,115,22,0.3)' : '0 0 0 1.5px #e5e7eb' }}>
              {f.label}
            </button>
          ))}
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, phone..."
              style={{ ...inp, paddingLeft: 32, width: 220 }} />
          </div>
        </div>
        <button onClick={exportCSV}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151' }}>
          <Download size={14} /> Export .xlsx
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 16 }}>

        {/* Users table */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['User', 'Phone', 'Login', 'Orders', 'Spend', 'Status', 'Joined', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}><td colSpan={7} style={{ padding: '10px 14px' }}><div className="skeleton" style={{ height: 32, borderRadius: 8 }} /></td></tr>
                  ))
                ) : users.map(u => (
                  <tr key={u.id}
                    style={{ borderTop: '1px solid #f9fafb', background: selected?.id === u.id ? '#fff7ed' : 'transparent', cursor: 'pointer', opacity: u.is_banned ? 0.6 : 1 }}
                    onMouseEnter={e => { if (selected?.id !== u.id) e.currentTarget.style.background = '#fafafa'; }}
                    onMouseLeave={e => { if (selected?.id !== u.id) e.currentTarget.style.background = 'transparent'; }}>

                    <td style={{ padding: '10px 14px' }} onClick={() => openDetail(u)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {u.avatar_url
                          ? <img src={u.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                          : <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                              {u.name?.[0]?.toUpperCase()}
                            </div>
                        }
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{u.name}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 12 }}>{u.phone || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {u.auth_provider === 'google'
                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 100, background: '#eff6ff', color: '#1d4ed8' }}>
                            <Globe size={10} /> Google
                          </span>
                        : <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 100, background: '#f3f4f6', color: '#6b7280' }}>Email</span>
                      }
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#111827' }}>{u.total_orders}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#111827' }}>₹{Math.round(u.total_spend)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 100, background: u.is_banned ? '#fee2e2' : '#dcfce7', color: u.is_banned ? '#991b1b' : '#166534' }}>
                        {u.is_banned ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 11, whiteSpace: 'nowrap' }}>
                      {new Date(u.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => openDetail(u)} title="View"
                          style={{ width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fff7ed', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Eye size={13} />
                        </button>
                        <button onClick={() => toggleBan(u)} title={u.is_banned ? 'Unblock' : 'Block'}
                          style={{ width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer', background: u.is_banned ? '#f0fdf4' : '#fef9c3', color: u.is_banned ? '#16a34a' : '#854d0e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {u.is_banned ? <ShieldCheck size={13} /> : <Ban size={13} />}
                        </button>
                        <button onClick={() => deleteUser(u.id)} title="Delete"
                          style={{ width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && !users.length && (
                  <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#9ca3af' }}>{total} users</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding: '5px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, opacity: page === 1 ? 0.4 : 1 }}>Prev</button>
                <span style={{ padding: '5px 10px', color: '#6b7280' }}>{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ padding: '5px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, opacity: page === totalPages ? 0.4 : 1 }}>Next</button>
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: 700, overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff', zIndex: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {selected.avatar_url
                  ? <img src={selected.avatar_url} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                  : <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700 }}>
                      {selected.name?.[0]?.toUpperCase()}
                    </div>
                }
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{selected.name}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{selected.email}</div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}><X size={18} /></button>
            </div>

            {detailLoading ? (
              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 40, borderRadius: 8 }} />)}
              </div>
            ) : (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {[
                    { label: 'Orders', value: selected.total_orders || 0, icon: Package, color: '#1e40af', bg: '#eff6ff' },
                    { label: 'Spent', value: `₹${Math.round(selected.total_spend || 0)}`, icon: ShoppingBag, color: '#166534', bg: '#f0fdf4' },
                    { label: 'Wishlist', value: selected.wishlist?.length || 0, icon: Heart, color: '#991b1b', bg: '#fef2f2' },
                  ].map(({ label, value, icon: Icon, color, bg }) => (
                    <div key={label} style={{ background: bg, borderRadius: 10, padding: '10px 12px', textAlign: 'center' }}>
                      <Icon size={16} color={color} style={{ margin: '0 auto 4px' }} />
                      <div style={{ fontSize: 15, fontWeight: 800, color }}>{value}</div>
                      <div style={{ fontSize: 10, color, opacity: 0.7, fontWeight: 500 }}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* User info */}
                <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px', fontSize: 12 }}>
                  <p style={{ fontWeight: 700, color: '#374151', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Profile</p>
                  {[['Phone', selected.phone || '—'], ['Login Method', selected.auth_provider === 'google' ? '🔵 Google' : '📧 Email'], ['Role', selected.role], ['Status', selected.is_banned ? '🚫 Blocked' : '✅ Active'], ['Joined', new Date(selected.created_at).toLocaleDateString('en-IN')]].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ color: '#9ca3af' }}>{k}</span>
                      <span style={{ fontWeight: 600, color: '#374151' }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Addresses */}
                {selected.addresses?.length > 0 && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={12} /> Addresses
                    </p>
                    {selected.addresses.slice(0, 2).map(a => (
                      <div key={a.id} style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px', marginBottom: 6, fontSize: 12, color: '#6b7280' }}>
                        <span style={{ fontWeight: 600, color: '#374151' }}>{a.full_name}</span> · {a.city}, {a.state}
                      </div>
                    ))}
                  </div>
                )}

                {/* Recent orders */}
                {selected.orders?.length > 0 && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Recent Orders</p>
                    {selected.orders.slice(0, 4).map(o => (
                      <div key={o.order_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f9fafb', fontSize: 12 }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f97316' }}>#{o.order_id}</span>
                        <span style={{ color: '#6b7280' }}>₹{o.total}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100, background: o.status === 'delivered' ? '#dcfce7' : '#f3f4f6', color: o.status === 'delivered' ? '#166534' : '#374151', textTransform: 'capitalize' }}>{o.status}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Cart items */}
                {selected.cart?.length > 0 && (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Cart ({selected.cart.length} items)</p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {selected.cart.slice(0, 4).map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f9fafb', borderRadius: 8, padding: '5px 8px', fontSize: 11 }}>
                          {item.image_url && <img src={item.image_url} alt="" style={{ width: 24, height: 28, borderRadius: 4, objectFit: 'cover' }} />}
                          <span style={{ color: '#374151', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
                          <span style={{ color: '#9ca3af' }}>×{item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Free Delivery Control */}
                <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '12px 14px', border: '1px solid #bbf7d0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#166534', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Truck size={13} /> Free Delivery
                    </p>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <span style={{ fontSize: 11, color: fdForm.is_free_delivery ? '#166534' : '#9ca3af', fontWeight: 600 }}>
                        {fdForm.is_free_delivery ? 'Enabled' : 'Disabled'}
                      </span>
                      <div onClick={() => setFdForm(p => ({ ...p, is_free_delivery: !p.is_free_delivery }))}
                        style={{ width: 36, height: 20, borderRadius: 10, background: fdForm.is_free_delivery ? '#16a34a' : '#d1d5db', position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}>
                        <div style={{ position: 'absolute', top: 2, left: fdForm.is_free_delivery ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                      </div>
                    </label>
                  </div>
                  {fdForm.is_free_delivery && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <input type="date" value={fdForm.free_delivery_expiry}
                        onChange={e => setFdForm(p => ({ ...p, free_delivery_expiry: e.target.value }))}
                        style={{ ...inp, fontSize: 12 }} placeholder="Expiry date (optional)" />
                      <input value={fdForm.free_delivery_note}
                        onChange={e => setFdForm(p => ({ ...p, free_delivery_note: e.target.value }))}
                        placeholder="Note (e.g. VIP customer)" style={{ ...inp, fontSize: 12 }} />
                    </div>
                  )}
                  <button onClick={saveFreeDelivery} disabled={savingFD}
                    style={{ marginTop: 8, width: '100%', padding: '7px', borderRadius: 8, border: 'none', background: fdForm.is_free_delivery ? '#16a34a' : '#6b7280', color: '#fff', fontSize: 12, fontWeight: 600, cursor: savingFD ? 'not-allowed' : 'pointer', opacity: savingFD ? 0.7 : 1 }}>
                    {savingFD ? 'Saving...' : 'Save Free Delivery'}
                  </button>
                </div>

                {/* Send notification */}
                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Send size={12} /> Send Notification
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={notifMsg} onChange={e => setNotifMsg(e.target.value)} placeholder="Message to user..."
                      style={{ ...inp, flex: 1, fontSize: 12 }} />
                    <button onClick={sendNotification} disabled={sendingNotif} className="btn-orange"
                      style={{ padding: '9px 14px', borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Send size={12} /> {sendingNotif ? '...' : 'Send'}
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => toggleBan(selected)}
                    style={{ flex: 1, padding: '9px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: selected.is_banned ? '#f0fdf4' : '#fef9c3', color: selected.is_banned ? '#16a34a' : '#854d0e', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    {selected.is_banned ? <><ShieldCheck size={14} /> Unblock</> : <><Ban size={14} /> Block</>}
                  </button>
                  <button onClick={() => deleteUser(selected.id)}
                    style={{ flex: 1, padding: '9px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
