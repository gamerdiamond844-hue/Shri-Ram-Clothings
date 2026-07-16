import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Save, RefreshCw, X, Store, CheckCircle, XCircle, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none',
  fontFamily: 'inherit', background: '#fff', color: '#111827', boxSizing: 'border-box',
};
const lbl = { fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 };

const EMPTY_FORM = {
  name: '', store_code: '', gst_number: '', address: '', city: '', state: '',
  pincode: '', phone: '', email: '', currency: 'INR', timezone: 'Asia/Kolkata',
  is_active: true,
};

const TIMEZONES = [
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo',
  'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles', 'UTC',
];

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'JPY', 'AUD'];

export default function AdminStoreManagement() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editStore, setEditStore] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  const loadStores = async () => {
    setLoading(true);
    try {
      const res = await api.get('/erp/stores');
      setStores(res.data.stores || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load stores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadStores(); }, []);

  const resetForm = () => {
    setEditStore(null);
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const openNew = () => {
    setEditStore(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.store_code.trim()) {
      return toast.error('Store name and code are required');
    }
    setSaving(true);
    try {
      if (editStore) {
        const res = await api.put(`/erp/stores/${editStore.id}`, form);
        setStores(prev => prev.map(s => s.id === editStore.id ? res.data.store : s));
        toast.success('Store updated');
      } else {
        const res = await api.post('/erp/stores', form);
        setStores(prev => [res.data.store, ...prev]);
        toast.success('Store created');
      }
      resetForm();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (store) => {
    setEditStore(store);
    setForm({
      name: store.name || '',
      store_code: store.store_code || '',
      gst_number: store.gst_number || '',
      address: store.address || '',
      city: store.city || '',
      state: store.state || '',
      pincode: store.pincode || '',
      phone: store.phone || '',
      email: store.email || '',
      currency: store.currency || 'INR',
      timezone: store.timezone || 'Asia/Kolkata',
      is_active: store.is_active !== false,
    });
    setShowForm(true);
  };

  const handleDelete = async (store) => {
    if (!window.confirm(`Delete store "${store.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/erp/stores/${store.id}`);
      setStores(prev => prev.filter(item => item.id !== store.id));
      toast.success('Store deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const toggleStatus = async (store) => {
    try {
      const res = await api.put(`/erp/stores/${store.id}`, { is_active: !store.is_active });
      setStores(prev => prev.map(s => s.id === store.id ? res.data.store : s));
      toast.success(`Store ${!store.is_active ? 'activated' : 'deactivated'}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status update failed');
    }
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Store Management</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6, maxWidth: 640 }}>
            Create and manage stores for your business. Each store has its own inventory, employees, POS counters, and reports.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={loadStores} disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 999, border: '1px solid #e5e7eb', background: '#fff', color: '#111827', padding: '10px 18px', cursor: 'pointer', fontWeight: 600 }}>
            <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
          </button>
          <button onClick={openNew}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 999, border: 'none', background: '#f97316', color: '#fff', padding: '10px 18px', cursor: 'pointer', fontWeight: 700 }}>
            <Plus size={16} /> New Store
          </button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) resetForm(); }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 28, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Store size={20} color="#f97316" />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{editStore ? 'Edit Store' : 'Create New Store'}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Fill in all store details for complete setup</div>
                </div>
              </div>
              <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {/* Row 1 */}
              <div>
                <label style={lbl}>Store Name *</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} style={inp} placeholder="e.g. Main Store" />
              </div>
              <div>
                <label style={lbl}>Store Code *</label>
                <input value={form.store_code} onChange={e => set('store_code', e.target.value)} style={inp} placeholder="e.g. STORE-001" />
              </div>
              {/* Row 2 */}
              <div>
                <label style={lbl}>GST Number</label>
                <input value={form.gst_number} onChange={e => set('gst_number', e.target.value)} style={inp} placeholder="22AAAAA0000A1Z5" />
              </div>
              <div>
                <label style={lbl}>Phone</label>
                <input value={form.phone} onChange={e => set('phone', e.target.value)} style={inp} placeholder="+91 98765 43210" />
              </div>
              {/* Row 3 */}
              <div style={{ gridColumn: '1/-1' }}>
                <label style={lbl}>Address</label>
                <textarea value={form.address} onChange={e => set('address', e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder="Street address" />
              </div>
              {/* Row 4 */}
              <div>
                <label style={lbl}>City</label>
                <input value={form.city} onChange={e => set('city', e.target.value)} style={inp} placeholder="City" />
              </div>
              <div>
                <label style={lbl}>State</label>
                <input value={form.state} onChange={e => set('state', e.target.value)} style={inp} placeholder="State" />
              </div>
              {/* Row 5 */}
              <div>
                <label style={lbl}>Pincode</label>
                <input value={form.pincode} onChange={e => set('pincode', e.target.value)} style={inp} placeholder="392001" />
              </div>
              <div>
                <label style={lbl}>Email</label>
                <input value={form.email} onChange={e => set('email', e.target.value)} style={inp} placeholder="store@example.com" />
              </div>
              {/* Row 6 */}
              <div>
                <label style={lbl}>Currency</label>
                <select value={form.currency} onChange={e => set('currency', e.target.value)} style={inp}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Timezone</label>
                <select value={form.timezone} onChange={e => set('timezone', e.target.value)} style={inp}>
                  {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              {/* Status */}
              <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#f9fafb', borderRadius: 10 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: '#f97316', cursor: 'pointer' }} />
                  Store is Active
                </label>
                <span style={{ fontSize: 12, color: '#9ca3af' }}>Inactive stores are hidden from POS and reports</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
              <button onClick={resetForm} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Save size={15} /> {saving ? 'Saving…' : editStore ? 'Update Store' : 'Create Store'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stores Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 180, borderRadius: 14 }} />
          ))}
        </div>
      ) : stores.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e5e7eb', padding: '60px 24px', textAlign: 'center' }}>
          <Store size={40} color="#e5e7eb" style={{ margin: '0 auto 16px', display: 'block' }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 8 }}>No stores yet</div>
          <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 20 }}>Create your first store to start managing inventory, POS, and employees.</div>
          <button onClick={openNew} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>
            Create First Store
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {stores.map(store => (
            <div key={store.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Store size={18} color="#f97316" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>{store.name}</div>
                    <code style={{ fontSize: 10, background: '#f3f4f6', padding: '1px 6px', borderRadius: 4, color: '#6b7280' }}>{store.store_code || '—'}</code>
                  </div>
                </div>
                <button onClick={() => toggleStatus(store)} title={store.is_active ? 'Deactivate' : 'Activate'}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}>
                  {store.is_active
                    ? <ToggleRight size={22} color="#22c55e" />
                    : <ToggleLeft size={22} color="#9ca3af" />}
                </button>
              </div>

              <div style={{ display: 'grid', gap: 6, fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
                {store.gst_number && <div><span style={{ fontWeight: 600, color: '#374151' }}>GST:</span> {store.gst_number}</div>}
                {store.phone && <div><span style={{ fontWeight: 600, color: '#374151' }}>Phone:</span> {store.phone}</div>}
                {store.email && <div><span style={{ fontWeight: 600, color: '#374151' }}>Email:</span> {store.email}</div>}
                {(store.city || store.state) && <div><span style={{ fontWeight: 600, color: '#374151' }}>Location:</span> {[store.city, store.state].filter(Boolean).join(', ')}</div>}
                {store.address && <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}><span style={{ fontWeight: 600, color: '#374151' }}>Address:</span> {store.address}</div>}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  {store.currency && <span style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100 }}>{store.currency}</span>}
                  {store.timezone && <span style={{ background: '#f5f3ff', color: '#6d28d9', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100 }}>{store.timezone}</span>}
                  <span style={{ background: store.is_active ? '#dcfce7' : '#fee2e2', color: store.is_active ? '#166534' : '#991b1b', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100 }}>
                    {store.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #f3f4f6', paddingTop: 12 }}>
                <button onClick={() => handleEdit(store)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', borderRadius: 9, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  <Pencil size={13} /> Edit
                </button>
                <button onClick={() => handleDelete(store)}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', borderRadius: 9, border: 'none', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
