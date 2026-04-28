import { useState, useEffect } from 'react';
import { Bell, Send, Trash2, Plus, X, Users, BarChart2 } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const inp = { width: '100%', padding: '9px 12px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff' };
const blank = { title: '', message: '', image_url: '', redirect_url: '/', scheduled_at: '' };

const STATUS_STYLE = {
  draft:     { bg: '#f3f4f6', color: '#374151' },
  scheduled: { bg: '#dbeafe', color: '#1e40af' },
  sent:      { bg: '#dcfce7', color: '#166534' },
};

export default function AdminNotifications() {
  const [campaigns, setCampaigns] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(null);

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

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Notification Campaigns</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Send push notifications to all subscribers</div>
        </div>
        <button onClick={() => setShowForm(s => !s)} className="btn-orange"
          style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> New Campaign
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #fed7aa', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>New Notification Campaign</span>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}><X size={18} /></button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5 }}>Title *</label>
              <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. 🔥 Flash Sale — 50% Off Today!" style={inp} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5 }}>Message *</label>
              <textarea required value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="e.g. Hurry! Limited time offer on all T-Shirts and Shirts." rows={3} style={{ ...inp, resize: 'none' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5 }}>Redirect URL</label>
              <input value={form.redirect_url} onChange={e => setForm(p => ({ ...p, redirect_url: e.target.value }))} placeholder="/shop or /product/123" style={inp} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5 }}>Image URL (optional)</label>
              <input value={form.image_url} onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))} placeholder="https://..." style={inp} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5 }}>Schedule (optional — leave blank to save as draft)</label>
              <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(p => ({ ...p, scheduled_at: e.target.value }))} style={inp} />
            </div>
          </div>

          {/* Preview */}
          {(form.title || form.message) && (
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px', border: '1px solid #f3f4f6' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Preview</p>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <img src="/logo.jpg" alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{form.title || 'Notification Title'}</p>
                  <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2, lineHeight: 1.4 }}>{form.message || 'Notification message...'}</p>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving} className="btn-orange" style={{ padding: '9px 20px', borderRadius: 10, fontSize: 13 }}>
              {saving ? 'Saving...' : form.scheduled_at ? '📅 Schedule' : '💾 Save Draft'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '9px 20px', borderRadius: 10, fontSize: 13, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Campaigns list */}
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
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} style={{ padding: '10px 14px' }}><div className="skeleton" style={{ height: 32, borderRadius: 8 }} /></td></tr>
                ))
              ) : campaigns.map(c => {
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
                  No campaigns yet. Create your first notification campaign.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info box */}
      <div style={{ background: '#fff7ed', borderRadius: 12, padding: '14px 16px', border: '1px solid #fed7aa', fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
        <strong>ℹ️ How it works:</strong> Cart reminders are sent automatically every 6 hours to users who have items in their cart for 48+ hours without purchasing. Max 2 reminders per user. Scheduled campaigns are sent automatically at the set time.
      </div>
    </div>
  );
}
