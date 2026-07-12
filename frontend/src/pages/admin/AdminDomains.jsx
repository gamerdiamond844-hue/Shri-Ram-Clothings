import { useState, useEffect } from 'react';
import { Globe, Trash2, Plus, Link2, Check, X } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const FIELD_STYLE = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #e5e7eb',
  background: '#fff',
  color: '#111827',
  fontSize: 13,
  outline: 'none',
};

export default function AdminDomains() {
  const [domains, setDomains] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [stores, setStores] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ host: '', business_id: '', store_id: '', warehouse_id: '', type: 'business', is_active: true });

  const loadData = async () => {
    setLoading(true);
    try {
      const [domainsRes, businessesRes, storesRes, warehousesRes] = await Promise.all([
        api.get('/erp/domains'),
        api.get('/erp/businesses'),
        api.get('/erp/stores'),
        api.get('/erp/warehouses'),
      ]);
      setDomains(domainsRes.data.domains || []);
      setBusinesses(businessesRes.data.businesses || []);
      setStores(storesRes.data.stores || []);
      setWarehouses(warehousesRes.data.warehouses || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to load domain settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.host.trim() || !form.business_id) {
      return toast.error('Host and business are required');
    }
    setSaving(true);
    try {
      await api.post('/erp/domains', {
        host: form.host.trim().toLowerCase(),
        business_id: Number(form.business_id),
        store_id: form.store_id ? Number(form.store_id) : null,
        warehouse_id: form.warehouse_id ? Number(form.warehouse_id) : null,
        type: form.type,
        is_active: form.is_active,
      });
      toast.success('Domain added');
      setForm({ host: '', business_id: '', store_id: '', warehouse_id: '', type: 'business', is_active: true });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add domain');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (domain) => {
    try {
      await api.put(`/erp/domains/${domain.id}`, { is_active: !domain.is_active });
      toast.success(`Domain ${domain.is_active ? 'deactivated' : 'activated'}`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update domain');
    }
  };

  const deleteDomain = async (id) => {
    if (!confirm('Delete this domain mapping?')) return;
    try {
      await api.delete(`/erp/domains/${id}`);
      toast.success('Domain removed');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete domain');
    }
  };

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 14, background: '#f97316', display: 'grid', placeItems: 'center', color: '#fff' }}>
          <Globe size={20} />
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Domain Management</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>Manage tenant host mappings for business, store, and warehouse domains.</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', padding: 20, display: 'grid', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#374151' }}>Host</label>
            <input
              type="text"
              placeholder="e.g. example.myshop.com"
              value={form.host}
              onChange={(e) => setForm(prev => ({ ...prev, host: e.target.value }))}
              style={FIELD_STYLE}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#374151' }}>Business</label>
            <select
              value={form.business_id}
              onChange={(e) => setForm(prev => ({ ...prev, business_id: e.target.value }))}
              style={FIELD_STYLE}
            >
              <option value="">Select business</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#374151' }}>Store (optional)</label>
            <select
              value={form.store_id}
              onChange={(e) => setForm(prev => ({ ...prev, store_id: e.target.value }))}
              style={FIELD_STYLE}
            >
              <option value="">No store</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.business_name || s.business_id})</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#374151' }}>Warehouse (optional)</label>
            <select
              value={form.warehouse_id}
              onChange={(e) => setForm(prev => ({ ...prev, warehouse_id: e.target.value }))}
              style={FIELD_STYLE}
            >
              <option value="">No warehouse</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name} ({w.business_name || w.business_id})</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 600, color: '#374151' }}>Domain type</label>
            <select
              value={form.type}
              onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value }))}
              style={FIELD_STYLE}
            >
              <option value="business">Business</option>
              <option value="store">Store</option>
              <option value="warehouse">Warehouse</option>
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#374151' }}>
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm(prev => ({ ...prev, is_active: e.target.checked }))} />
            Active
          </label>
        </div>

        <button type="submit" disabled={saving}
          style={{ width: 140, padding: '10px 16px', borderRadius: 12, border: 'none', background: '#f97316', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
          {saving ? 'Saving...' : 'Add Domain'}
        </button>
      </form>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Domain mappings</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Each host routes to a business, store, or warehouse tenant.</div>
          </div>
          <div style={{ color: '#6b7280', fontSize: 12 }}>{loading ? 'Loading…' : `${domains.length} records`}</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                {['Host', 'Type', 'Business', 'Store', 'Warehouse', 'Status', 'Actions'].map((label) => (
                  <th key={label} style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {domains.map((domain) => (
                <tr key={domain.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px 16px', color: '#111827', fontWeight: 600 }}>{domain.host}</td>
                  <td style={{ padding: '14px 16px', color: '#4b5563' }}>{domain.type}</td>
                  <td style={{ padding: '14px 16px', color: '#111827' }}>{domain.business_name || domain.business_id || 'N/A'}</td>
                  <td style={{ padding: '14px 16px', color: '#111827' }}>{domain.store_name || domain.store_id || '—'}</td>
                  <td style={{ padding: '14px 16px', color: '#111827' }}>{domain.warehouse_name || domain.warehouse_id || '—'}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ padding: '6px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, color: domain.is_active ? '#166534' : '#991b1b', background: domain.is_active ? '#dcfce7' : '#fee2e2' }}>
                      {domain.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', display: 'flex', gap: 8 }}>
                    <button onClick={() => toggleActive(domain)} title="Toggle status"
                      style={{ width: 34, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer', background: domain.is_active ? '#dcfce7' : '#fee2e2', color: domain.is_active ? '#166534' : '#991b1b', display: 'grid', placeItems: 'center' }}>
                      {domain.is_active ? <Check size={16} /> : <X size={16} />}
                    </button>
                    <button onClick={() => deleteDomain(domain.id)} title="Delete"
                      style={{ width: 34, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#dc2626', display: 'grid', placeItems: 'center' }}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {!domains.length && !loading && (
                <tr><td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af' }}>No domain mappings configured yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
