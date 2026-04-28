import { useState, useEffect, useRef } from 'react';
import { Bell, Send, Trash2, Plus, X, Users, BellRing, Search, CheckCircle } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const inp = { width: '100%', padding: '9px 12px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff' };
const blank = { title: '', message: '', image_url: '', redirect_url: '/', scheduled_at: '' };
const blankSend = { title: '', message: '', redirect_url: '/', image_url: '', target: 'all', user_id: null };

const STATUS_STYLE = {
  draft:     { bg: '#f3f4f6', color: '#374151' },
  scheduled: { bg: '#dbeafe', color: '#1e40af' },
  sent:      { bg: '#dcfce7', color: '#166534' },
};

// ── Send Notification Panel ───────────────────────────────────────────────────
function SendNotifPanel() {
  const [form, setForm] = useState(blankSend);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef(null);

  const handleUserSearch = (val) => {
    setUserSearch(val);
    setSelectedUser(null);
    setForm(p => ({ ...p, user_id: null }));
    clearTimeout(searchTimer.current);
    if (val.length < 2) { setUserResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/notifications/admin/search-users?q=${encodeURIComponent(val)}`);
        setUserResults(res.data);
      } catch {} finally { setSearching(false); }
    }, 300);
  };

  const selectUser = (u) => {
    setSelectedUser(u);
    setForm(p => ({ ...p, user_id: u.id }));
    setUserSearch(u.name + ' — ' + u.email);
    setUserResults([]);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return toast.error('Title and message required');
    if (form.target === 'specific' && !form.user_id) return toast.error('Please select a user');
    setSending(true);
    setSent(null);
    try {
      const res = await api.post('/notifications/admin/send', form);
      setSent(res.data);
      toast.success(`✅ ${res.data.message}`);
      setForm(blankSend);
      setSelectedUser(null);
      setUserSearch('');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to send'); }
    finally { setSending(false); }
  };

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #f97316', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ width: 38, height: 38, background: '#fff7ed', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Send size={18} color="#f97316" />
        </div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Send Notification</p>
          <p style={{ fontSize: 12, color: '#9ca3af' }}>Send in-app + push notification to all or specific users</p>
        </div>
      </div>

      {sent && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle size={16} color="#16a34a" />
          <p style={{ fontSize: 13, color: '#166534', fontWeight: 500 }}>
            Sent to <strong>{sent.inApp}</strong> user(s) in-app · <strong>{sent.push}</strong> push delivered
          </p>
        </div>
      )}

      <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Target */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>Send To</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ val: 'all', label: '👥 All Users' }, { val: 'specific', label: '👤 Specific User' }].map(({ val, label }) => (
              <button key={val} type="button" onClick={() => { setForm(p => ({ ...p, target: val, user_id: null })); setSelectedUser(null); setUserSearch(''); }}
                style={{ flex: 1, padding: '9px', borderRadius: 10, border: `1.5px solid ${form.target === val ? '#f97316' : '#e5e7eb'}`, background: form.target === val ? '#fff7ed' : '#fff', color: form.target === val ? '#f97316' : '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* User search */}
        {form.target === 'specific' && (
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>Search User (name or email)</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
              <input value={userSearch} onChange={e => handleUserSearch(e.target.value)}
                placeholder="Type name or email..."
                style={{ ...inp, paddingLeft: 32, borderColor: selectedUser ? '#16a34a' : '#e5e7eb' }} />
              {searching && <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }} />}
            </div>
            {userResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #f3f4f6', zIndex: 50, overflow: 'hidden', marginTop: 4 }}>
                {userResults.map(u => (
                  <div key={u.id} onClick={() => selectUser(u)}
                    style={{ padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #f9fafb' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                    {u.avatar_url
                      ? <img src={u.avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      : <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{u.name?.[0]?.toUpperCase()}</div>
                    }
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{u.name}</p>
                      <p style={{ fontSize: 11, color: '#9ca3af' }}>{u.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {selectedUser && (
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#16a34a', fontWeight: 500 }}>
                <CheckCircle size={13} /> Selected: {selectedUser.name} ({selectedUser.email})
              </div>
            )}
          </div>
        )}

        {/* Title */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>Title *</label>
          <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
            placeholder="e.g. 🔥 Flash Sale — 50% Off Today!" style={inp} />
        </div>

        {/* Message */}
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>Message *</label>
          <textarea required rows={3} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
            placeholder="e.g. Hurry! Limited time offer on all T-Shirts and Shirts." style={{ ...inp, resize: 'none' }} />
        </div>

        {/* Redirect + Image */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>Redirect URL</label>
            <input value={form.redirect_url} onChange={e => setForm(p => ({ ...p, redirect_url: e.target.value }))}
              placeholder="/shop" style={inp} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>Image URL (optional)</label>
            <input value={form.image_url} onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))}
              placeholder="https://..." style={inp} />
          </div>
        </div>

        {/* Preview */}
        {(form.title || form.message) && (
          <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px', border: '1px solid #f3f4f6' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Preview</p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <img src={form.image_url || '/logo.jpg'} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} onError={e => { e.target.src = '/logo.jpg'; }} />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{form.title || 'Notification Title'}</p>
                <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2, lineHeight: 1.4 }}>{form.message || 'Message...'}</p>
              </div>
            </div>
          </div>
        )}

        <button type="submit" disabled={sending} className="btn-orange"
          style={{ padding: '11px', borderRadius: 10, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {sending
            ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />Sending...</>
            : <><Send size={15} />Send Notification</>
          }
        </button>
      </form>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminNotifications() {
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(null);
  const [requesting, setRequesting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([
        api.get('/notifications/admin/campaigns'),
        api.get('/notifications/admin/stats'),
      ]);
      setCampaigns(c.data || []);
      setStats(s.data);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return toast.error('Title and message required');
    setSaving(true);
    try {
      await api.post('/notifications/admin/campaigns', form);
      toast.success('Campaign created!');
      setShowForm(false);
      setForm(blank);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const handleSend = async (id) => {
    if (!confirm('Send this notification to all subscribers now?')) return;
    setSending(id);
    try {
      const res = await api.post(`/notifications/admin/campaigns/${id}/send`);
      toast.success(`✅ Sent to ${res.data.sent} subscribers!`);
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to send'); }
    finally { setSending(null); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this campaign?')) return;
    try { await api.delete(`/notifications/admin/campaigns/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Failed'); }
  };

  const handleRequestPush = async () => {
    if (!confirm('Send an in-app notification to ALL users asking them to enable push notifications?')) return;
    setRequesting(true);
    try {
      const res = await api.post('/notifications/admin/request-push');
      toast.success(`🔔 Push request sent to ${res.data.sent} users!`);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setRequesting(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[
            { label: 'Subscribers', value: stats.subscribers, icon: Users, bg: '#eff6ff', color: '#1e40af' },
            { label: 'Campaigns Sent', value: stats.campaigns_sent, icon: Send, bg: '#f0fdf4', color: '#166534' },
            { label: 'Total Pushes', value: stats.total_pushes, icon: Bell, bg: '#fff7ed', color: '#c2410c' },
          ].map(({ label, value, icon: Icon, bg, color }) => (
            <div key={label} style={{ background: bg, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, background: 'rgba(255,255,255,0.6)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} color={color} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
                <div style={{ fontSize: 11, color, opacity: 0.7, fontWeight: 500 }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Send Notification Panel */}
      <SendNotifPanel />

      {/* Request Push from Users */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e0e7ff', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, background: '#eff6ff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BellRing size={20} color="#3b82f6" />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 2 }}>Request Push Permission from Users</p>
            <p style={{ fontSize: 12, color: '#6b7280' }}>Send an in-app notification to all users asking them to enable push notifications.</p>
          </div>
        </div>
        <button onClick={handleRequestPush} disabled={requesting}
          style={{ padding: '9px 18px', borderRadius: 10, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 600, cursor: requesting ? 'not-allowed' : 'pointer', opacity: requesting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
          {requesting
            ? <><div className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />Sending...</>
            : <><BellRing size={14} />Request from Users</>
          }
        </button>
      </div>

      {/* Campaigns header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Push Campaigns</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Schedule and send push notifications to all subscribers</div>
        </div>
        <button onClick={() => setShowForm(s => !s)} className="btn-orange"
          style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> New Campaign
        </button>
      </div>

      {/* Campaign form */}
      {showForm && (
        <form onSubmit={handleCreate} style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #fed7aa', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>New Push Campaign</span>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}><X size={18} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5 }}>Title *</label>
              <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. 🔥 Flash Sale!" style={inp} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5 }}>Message *</label>
              <textarea required value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} rows={3} style={{ ...inp, resize: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5 }}>Redirect URL</label>
              <input value={form.redirect_url} onChange={e => setForm(p => ({ ...p, redirect_url: e.target.value }))} placeholder="/shop" style={inp} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5 }}>Image URL (optional)</label>
              <input value={form.image_url} onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))} placeholder="https://..." style={inp} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5 }}>Schedule (leave blank to save as draft)</label>
              <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(p => ({ ...p, scheduled_at: e.target.value }))} style={inp} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving} className="btn-orange" style={{ padding: '9px 20px', borderRadius: 10, fontSize: 13 }}>
              {saving ? 'Saving...' : form.scheduled_at ? '📅 Schedule' : '💾 Save Draft'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '9px 20px', borderRadius: 10, fontSize: 13, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Campaigns table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Campaign', 'Status', 'Sent To', 'Scheduled', 'Created', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}><td colSpan={6} style={{ padding: '10px 14px' }}><div className="skeleton" style={{ height: 32, borderRadius: 8 }} /></td></tr>
              )) : campaigns.map(c => {
                const ss = STATUS_STYLE[c.status] || STATUS_STYLE.draft;
                return (
                  <tr key={c.id} style={{ borderTop: '1px solid #f9fafb' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 14px', maxWidth: 240 }}>
                      <p style={{ fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</p>
                      <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.message}</p>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 100, background: ss.bg, color: ss.color, textTransform: 'capitalize' }}>{c.status}</span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#374151', fontWeight: 600 }}>{c.sent_count || '—'}</td>
                    <td style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {c.scheduled_at ? new Date(c.scheduled_at).toLocaleString('en-IN') : '—'}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {new Date(c.created_at).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {c.status !== 'sent' && (
                          <button onClick={() => handleSend(c.id)} disabled={sending === c.id} title="Send Now"
                            style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: sending === c.id ? 0.5 : 1 }}>
                            <Send size={13} />
                          </button>
                        )}
                        <button onClick={() => handleDelete(c.id)} title="Delete"
                          style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && !campaigns.length && (
                <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                  <Bell size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                  No campaigns yet.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ background: '#fff7ed', borderRadius: 12, padding: '14px 16px', border: '1px solid #fed7aa', fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
        <strong>ℹ️ How it works:</strong> "Send Notification" sends both in-app + push instantly. "Push Campaigns" are for scheduled/broadcast push-only. Cart reminders run automatically every 6 hours.
      </div>
    </div>
  );
}
