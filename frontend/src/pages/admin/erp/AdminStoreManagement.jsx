import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Save, RefreshCw, X } from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const inp = {
  width: '100%', padding: '10px 12px', fontSize: 13,
  border: '1.5px solid #e5e7eb', borderRadius: 10, outline: 'none',
  fontFamily: 'inherit', background: '#fff', color: '#111827', boxSizing: 'border-box',
};

export default function AdminStoreManagement() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editStore, setEditStore] = useState(null);
  const [form, setForm] = useState({ name: '', store_code: '', address: '', phone: '', email: '' });

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

  useEffect(() => {
    loadStores();
  }, []);

  const resetForm = () => {
    setEditStore(null);
    setForm({ name: '', store_code: '', address: '', phone: '', email: '' });
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.store_code.trim()) {
      return toast.error('Store name and code are required');
    }
    setSaving(true);
    try {
      if (editStore) {
        const res = await api.put(`/erp/stores/${editStore.id}`, form);
        setStores((prev) => prev.map((s) => (s.id === editStore.id ? res.data.store : s)));
        toast.success('Store updated');
      } else {
        const res = await api.post('/erp/stores', form);
        setStores((prev) => [res.data.store, ...prev]);
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
      address: store.address || '',
      phone: store.phone || '',
      email: store.email || '',
    });
  };

  const handleDelete = async (store) => {
    if (!window.confirm(`Delete store ${store.name}?`)) return;
    try {
      await api.delete(`/erp/stores/${store.id}`);
      setStores((prev) => prev.filter((item) => item.id !== store.id));
      toast.success('Store deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>Store Management</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6, maxWidth: 640 }}>Create, update, and manage stores for your business. Stores are added to the ERP platform and can be used across POS, inventory, warehouses, and reporting.</p>
        </div>
        <button onClick={loadStores} disabled={loading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 999, border: '1px solid #e5e7eb', background: '#fff', color: '#111827', padding: '10px 18px', cursor: 'pointer' }}>
          <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 18, alignItems: 'start' }}>
        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e5e7eb', padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{editStore ? 'Edit store' : 'New store'}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Enter store details and save to add branches or pickup locations.</div>
            </div>
            {editStore && (
              <button onClick={resetForm} style={{ border: 'none', background: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 13 }}>Cancel edit</button>
            )}
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            {[
              ['name', 'Store name'],
              ['store_code', 'Store code'],
              ['phone', 'Phone'],
              ['email', 'Email'],
            ].map(([key, label]) => (
              <div key={key}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: '#6b7280' }}>{label}</label>
                <input value={form[key]} onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))} style={inp} placeholder={label} />
              </div>
            ))}

            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: '#6b7280' }}>Address</label>
              <textarea value={form.address} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} rows={4} style={{ ...inp, resize: 'vertical' }} placeholder="Store address" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
              <button onClick={resetForm} type="button" style={{ border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff', color: '#374151', padding: '10px 16px', cursor: 'pointer' }}>Reset</button>
              <button onClick={handleSave} disabled={saving} type="button" style={{ border: 'none', borderRadius: 10, background: '#f97316', color: '#fff', padding: '10px 18px', cursor: 'pointer' }}>
                {saving ? 'Saving…' : editStore ? 'Update store' : 'Create store'}
              </button>
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e5e7eb', padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Existing stores</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{stores.length} store{stores.length !== 1 ? 's' : ''} found.</div>
            </div>
            <button onClick={resetForm} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 999, border: '1px solid #e5e7eb', background: '#fff', padding: '8px 14px', cursor: 'pointer', color: '#111827' }}>
              <Plus size={14} /> New
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Name', 'Code', 'Address', 'Phone', 'Email', 'Actions'].map((header) => (
                    <th key={header} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx}><td colSpan={6} style={{ padding: '14px 12px' }}><div className="skeleton" style={{ height: 24, borderRadius: 10 }} /></td></tr>
                )) : stores.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: '28px 12px', textAlign: 'center', color: '#9ca3af' }}>No stores created yet.</td></tr>
                ) : stores.map((store) => (
                  <tr key={store.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px' }}>{store.name}</td>
                    <td style={{ padding: '12px' }}><code style={{ background: '#f3f4f6', borderRadius: 6, padding: '2px 6px', fontSize: 12 }}>{store.store_code || '—'}</code></td>
                    <td style={{ padding: '12px', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{store.address || '—'}</td>
                    <td style={{ padding: '12px' }}>{store.phone || '—'}</td>
                    <td style={{ padding: '12px' }}>{store.email || '—'}</td>
                    <td style={{ padding: '12px', display: 'flex', gap: 8 }}>
                      <button onClick={() => handleEdit(store)} style={{ border: '1px solid #e5e7eb', borderRadius: 9, padding: '8px 10px', background: '#fff', color: '#374151', cursor: 'pointer' }}><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(store)} style={{ border: 'none', borderRadius: 9, padding: '8px 10px', background: '#fef2f2', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
