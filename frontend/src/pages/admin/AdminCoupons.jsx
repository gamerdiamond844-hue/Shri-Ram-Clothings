import { useState, useEffect } from 'react';
import { Plus, Trash2, ToggleLeft, ToggleRight, Tag } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const inp = { width: '100%', padding: '9px 12px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff' };

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', discount_percent: '', discount_flat: '', min_order_amount: '', max_uses: '', expires_at: '' });
  const [saving, setSaving] = useState(false);

  const fetchCoupons = async () => {
    try { const res = await api.get('/admin/coupons'); setCoupons(res.data); }
    catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCoupons(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.discount_percent && !form.discount_flat) return toast.error('Enter % or flat discount');
    setSaving(true);
    try {
      await api.post('/admin/coupons', form);
      toast.success('Coupon created');
      setShowForm(false);
      setForm({ code: '', discount_percent: '', discount_flat: '', min_order_amount: '', max_uses: '', expires_at: '' });
      fetchCoupons();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const toggleCoupon = async (id) => {
    try { await api.put(`/admin/coupons/${id}/toggle`); fetchCoupons(); }
    catch { toast.error('Failed'); }
  };

  const deleteCoupon = async (id) => {
    if (!confirm('Delete this coupon?')) return;
    try { await api.delete(`/admin/coupons/${id}`); toast.success('Deleted'); fetchCoupons(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: '#9ca3af' }}>{coupons.length} coupons</span>
        <button onClick={() => setShowForm(s => !s)} className="btn-orange" style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> Create Coupon
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleCreate} style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #fed7aa', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Tag size={15} color="#f97316" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>New Coupon</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5 }}>Coupon Code *</label>
              <input required value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                placeholder="e.g. WELCOME10" style={{ ...inp, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5 }}>Discount % (or blank)</label>
              <input type="number" min="1" max="100" value={form.discount_percent}
                onChange={e => setForm(p => ({ ...p, discount_percent: e.target.value, discount_flat: '' }))}
                placeholder="e.g. 10" style={inp} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5 }}>Flat Discount ₹ (or blank)</label>
              <input type="number" min="1" value={form.discount_flat}
                onChange={e => setForm(p => ({ ...p, discount_flat: e.target.value, discount_percent: '' }))}
                placeholder="e.g. 100" style={inp} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5 }}>Min Order ₹</label>
              <input type="number" value={form.min_order_amount} onChange={e => setForm(p => ({ ...p, min_order_amount: e.target.value }))} placeholder="e.g. 500" style={inp} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5 }}>Max Uses</label>
              <input type="number" value={form.max_uses} onChange={e => setForm(p => ({ ...p, max_uses: e.target.value }))} placeholder="Unlimited" style={inp} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5 }}>Expiry Date</label>
              <input type="datetime-local" value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} style={inp} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button type="submit" disabled={saving} className="btn-orange" style={{ padding: '9px 20px', borderRadius: 10, fontSize: 13 }}>
              {saving ? 'Creating...' : 'Create Coupon'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              style={{ padding: '9px 20px', borderRadius: 10, fontSize: 13, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Code', 'Discount', 'Min Order', 'Used / Max', 'Expires', 'Active', 'Delete'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} style={{ padding: '10px 14px' }}><div className="skeleton" style={{ height: 32, borderRadius: 8 }} /></td></tr>
                ))
              ) : coupons.map(c => (
                <tr key={c.id} style={{ borderTop: '1px solid #f9fafb', opacity: c.is_active ? 1 : 0.5 }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#f97316' }}>{c.code}</td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#111827' }}>
                    {c.discount_percent ? `${c.discount_percent}%` : `₹${c.discount_flat}`}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#6b7280' }}>₹{c.min_order_amount || 0}</td>
                  <td style={{ padding: '10px 14px', color: '#6b7280' }}>{c.used_count} / {c.max_uses || '∞'}</td>
                  <td style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 12 }}>
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString('en-IN') : 'Never'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => toggleCoupon(c.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.is_active ? '#22c55e' : '#d1d5db', display: 'flex' }}>
                      {c.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    </button>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => deleteCoupon(c.id)}
                      style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && !coupons.length && (
                <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No coupons yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
