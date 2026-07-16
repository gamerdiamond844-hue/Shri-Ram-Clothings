import { useState, useEffect } from 'react';
import {
  Building2, Store, Warehouse, Globe, Plus, Pencil, Trash2,
  CheckCircle, XCircle, RefreshCw, X, Save, ToggleLeft, ToggleRight, AlertTriangle
} from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none',
  fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box',
};
const lbl = { fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 };

const TABS = [
  { key: 'businesses', label: 'Businesses', icon: Building2 },
  { key: 'stores',     label: 'Stores',     icon: Store },
  { key: 'warehouses', label: 'Warehouses', icon: Warehouse },
  { key: 'domains',    label: 'Domains',    icon: Globe },
];

function StatusBadge({ active }) {
  return active
    ? <span style={{ background: '#dcfce7', color: '#166534', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100, display: 'inline-flex', alignItems: 'center', gap: 3 }}><CheckCircle size={9} /> Active</span>
    : <span style={{ background: '#fee2e2', color: '#991b1b', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100, display: 'inline-flex', alignItems: 'center', gap: 3 }}><XCircle size={9} /> Inactive</span>;
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: '#fff', borderRadius: 18, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Business Form ─────────────────────────────────────────────────────────────
function BusinessForm({ initial, onSave, onClose, saving }) {
  const [form, setForm] = useState({
    name: initial?.name || '', gst_number: initial?.gst_number || '',
    phone: initial?.phone || '', email: initial?.email || '',
    address: initial?.address || '', currency: initial?.currency || 'INR',
    timezone: initial?.timezone || 'Asia/Kolkata',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={lbl}>Business Name *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} style={inp} placeholder="e.g. Shri Ram Clothings" />
        </div>
        <div>
          <label style={lbl}>GST Number</label>
          <input value={form.gst_number} onChange={e => set('gst_number', e.target.value)} style={inp} placeholder="22AAAAA0000A1Z5" />
        </div>
        <div>
          <label style={lbl}>Phone</label>
          <input value={form.phone} onChange={e => set('phone', e.target.value)} style={inp} placeholder="+91 98765 43210" />
        </div>
        <div>
          <label style={lbl}>Email</label>
          <input value={form.email} onChange={e => set('email', e.target.value)} style={inp} placeholder="owner@business.com" />
        </div>
        <div>
          <label style={lbl}>Currency</label>
          <select value={form.currency} onChange={e => set('currency', e.target.value)} style={inp}>
            {['INR','USD','EUR','GBP','AED','SGD'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Timezone</label>
          <select value={form.timezone} onChange={e => set('timezone', e.target.value)} style={inp}>
            {['Asia/Kolkata','Asia/Dubai','Asia/Singapore','Europe/London','America/New_York','UTC'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label style={lbl}>Address</label>
          <textarea value={form.address} onChange={e => set('address', e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder="Business address" />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
        <button onClick={() => onSave(form)} disabled={saving}
          style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Save size={15} /> {saving ? 'Saving…' : initial ? 'Update' : 'Create'}
        </button>
      </div>
    </div>
  );
}

// ── Warehouse Form ────────────────────────────────────────────────────────────
function WarehouseForm({ initial, onSave, onClose, saving }) {
  const [form, setForm] = useState({
    name: initial?.name || '', address: initial?.address || '', phone: initial?.phone || '',
  });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div>
        <label style={lbl}>Warehouse Name *</label>
        <input value={form.name} onChange={e => set('name', e.target.value)} style={inp} placeholder="e.g. Main Warehouse" />
      </div>
      <div>
        <label style={lbl}>Phone</label>
        <input value={form.phone} onChange={e => set('phone', e.target.value)} style={inp} placeholder="+91 98765 43210" />
      </div>
      <div>
        <label style={lbl}>Address</label>
        <textarea value={form.address} onChange={e => set('address', e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder="Warehouse address" />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
        <button onClick={() => onSave(form)} disabled={saving}
          style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Save size={15} /> {saving ? 'Saving…' : initial ? 'Update' : 'Create'}
        </button>
      </div>
    </div>
  );
}

export default function AdminSuperAdmin() {
  const [tab, setTab]         = useState('businesses');
  const [businesses, setBiz]  = useState([]);
  const [stores, setStores]   = useState([]);
  const [warehouses, setWH]   = useState([]);
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [modal, setModal]     = useState(null); // { type, data }

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [b, s, w, d] = await Promise.all([
        api.get('/erp/businesses'),
        api.get('/erp/stores'),
        api.get('/erp/warehouses'),
        api.get('/erp/domains').catch(() => ({ data: { domains: [] } })),
      ]);
      setBiz(b.data.businesses || []);
      setStores(s.data.stores || []);
      setWH(w.data.warehouses || []);
      setDomains(d.data.domains || []);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  // ── Business actions ──────────────────────────────────────────────────────
  const saveBusiness = async (form) => {
    setSaving(true);
    try {
      if (modal?.data) {
        const res = await api.put(`/erp/businesses/${modal.data.id}`, form);
        setBiz(prev => prev.map(b => b.id === modal.data.id ? res.data.business : b));
        toast.success('Business updated');
      } else {
        const res = await api.post('/erp/businesses', form);
        setBiz(prev => [res.data.business, ...prev]);
        toast.success('Business created');
      }
      setModal(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const deleteBusiness = async (id) => {
    if (!window.confirm('Delete this business? All associated data will be removed.')) return;
    try {
      await api.delete(`/erp/businesses/${id}`);
      setBiz(prev => prev.filter(b => b.id !== id));
      toast.success('Business deleted');
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  const toggleBusiness = async (biz) => {
    try {
      const res = await api.patch(`/erp/businesses/${biz.id}/suspend`, { suspend: biz.is_active });
      setBiz(prev => prev.map(b => b.id === biz.id ? res.data.business : b));
      toast.success(`Business ${biz.is_active ? 'suspended' : 'activated'}`);
    } catch (err) { toast.error(err.response?.data?.message || 'Status update failed'); }
  };

  // ── Warehouse actions ─────────────────────────────────────────────────────
  const saveWarehouse = async (form) => {
    setSaving(true);
    try {
      if (modal?.data) {
        const res = await api.put(`/erp/warehouses/${modal.data.id}`, form);
        setWH(prev => prev.map(w => w.id === modal.data.id ? res.data.warehouse : w));
        toast.success('Warehouse updated');
      } else {
        const res = await api.post('/erp/warehouses', form);
        setWH(prev => [res.data.warehouse, ...prev]);
        toast.success('Warehouse created');
      }
      setModal(null);
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const deleteWarehouse = async (id) => {
    if (!window.confirm('Delete this warehouse?')) return;
    try {
      await api.delete(`/erp/warehouses/${id}`);
      setWH(prev => prev.filter(w => w.id !== id));
      toast.success('Warehouse deleted');
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  const toggleWarehouse = async (wh) => {
    try {
      const res = await api.put(`/erp/warehouses/${wh.id}`, { is_active: !wh.is_active });
      setWH(prev => prev.map(w => w.id === wh.id ? res.data.warehouse : w));
      toast.success(`Warehouse ${!wh.is_active ? 'activated' : 'deactivated'}`);
    } catch (err) { toast.error(err.response?.data?.message || 'Status update failed'); }
  };

  const renderTable = (rows, cols, actions) => (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {cols.map(c => <th key={c.key} style={{ textAlign: 'left', padding: '9px 12px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{c.label}</th>)}
              {actions && <th style={{ textAlign: 'left', padding: '9px 12px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 4 }).map((_, i) => (
              <tr key={i}><td colSpan={cols.length + (actions ? 1 : 0)} style={{ padding: '9px 12px' }}><div className="skeleton" style={{ height: 24, borderRadius: 7 }} /></td></tr>
            )) : rows.length === 0 ? (
              <tr><td colSpan={cols.length + (actions ? 1 : 0)} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No records found.</td></tr>
            ) : rows.map((row, i) => (
              <tr key={row.id || i} style={{ borderTop: '1px solid #f9fafb' }}
                onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {cols.map(c => (
                  <td key={c.key} style={{ padding: '9px 12px', color: '#374151', whiteSpace: 'nowrap' }}>
                    {c.render ? c.render(row) : row[c.key] ?? '—'}
                  </td>
                ))}
                {actions && <td style={{ padding: '9px 12px' }}>{actions(row)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const actionBtns = (editFn, deleteFn, toggleFn, row) => (
    <div style={{ display: 'flex', gap: 6 }}>
      {toggleFn && (
        <button onClick={() => toggleFn(row)} title={row.is_active ? 'Deactivate' : 'Activate'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 4 }}>
          {row.is_active ? <ToggleRight size={18} color="#22c55e" /> : <ToggleLeft size={18} color="#9ca3af" />}
        </button>
      )}
      {editFn && (
        <button onClick={() => editFn(row)}
          style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
          <Pencil size={12} /> Edit
        </button>
      )}
      {deleteFn && (
        <button onClick={() => deleteFn(row.id)}
          style={{ padding: '5px 10px', borderRadius: 7, border: 'none', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
          <Trash2 size={12} /> Delete
        </button>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        {[
          { icon: Building2, label: 'Businesses', value: businesses.length, color: '#f97316', bg: '#fff7ed' },
          { icon: Store,     label: 'Stores',     value: stores.length,    color: '#3b82f6', bg: '#eff6ff' },
          { icon: Warehouse, label: 'Warehouses', value: warehouses.length, color: '#8b5cf6', bg: '#f5f3ff' },
          { icon: Globe,     label: 'Domains',    value: domains.length,   color: '#22c55e', bg: '#f0fdf4' },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #f3f4f6', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} color={card.color} />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>{loading ? '–' : card.value}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{card.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 10, padding: 4 }}>
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 500, background: active ? '#fff' : 'transparent', color: active ? '#f97316' : '#6b7280', boxShadow: active ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.15s' }}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
        <button onClick={fetchAll} disabled={loading} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#9ca3af' }}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      </div>

      {/* Tab actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {tab === 'businesses' && (
          <button onClick={() => setModal({ type: 'business', data: null })}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 10, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            <Plus size={15} /> New Business
          </button>
        )}
        {tab === 'warehouses' && (
          <button onClick={() => setModal({ type: 'warehouse', data: null })}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 10, border: 'none', background: '#8b5cf6', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            <Plus size={15} /> New Warehouse
          </button>
        )}
      </div>

      {/* Tab content */}
      {tab === 'businesses' && renderTable(businesses, [
        { key: 'id',         label: 'ID' },
        { key: 'name',       label: 'Name', render: r => <span style={{ fontWeight: 600, color: '#111827' }}>{r.name}</span> },
        { key: 'slug',       label: 'Slug', render: r => <code style={{ fontSize: 11, background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{r.slug}</code> },
        { key: 'gst_number', label: 'GST' },
        { key: 'currency',   label: 'Currency' },
        { key: 'is_active',  label: 'Status', render: r => <StatusBadge active={r.is_active} /> },
      ], row => actionBtns(
        r => setModal({ type: 'business', data: r }),
        deleteBusiness,
        toggleBusiness,
        row
      ))}

      {tab === 'stores' && renderTable(stores, [
        { key: 'id',            label: 'ID' },
        { key: 'business_name', label: 'Business', render: r => <span style={{ fontWeight: 600, color: '#111827' }}>{r.business_name}</span> },
        { key: 'name',          label: 'Store Name' },
        { key: 'store_code',    label: 'Code', render: r => <code style={{ fontSize: 11, background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{r.store_code || '—'}</code> },
        { key: 'phone',         label: 'Phone' },
        { key: 'is_active',     label: 'Status', render: r => <StatusBadge active={r.is_active} /> },
      ], null)}

      {tab === 'warehouses' && renderTable(warehouses, [
        { key: 'id',            label: 'ID' },
        { key: 'business_name', label: 'Business', render: r => <span style={{ fontWeight: 600, color: '#111827' }}>{r.business_name}</span> },
        { key: 'name',          label: 'Warehouse Name' },
        { key: 'phone',         label: 'Phone' },
        { key: 'address',       label: 'Address', render: r => <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' }}>{r.address || '—'}</span> },
        { key: 'is_active',     label: 'Status', render: r => <StatusBadge active={r.is_active} /> },
      ], row => actionBtns(
        r => setModal({ type: 'warehouse', data: r }),
        deleteWarehouse,
        toggleWarehouse,
        row
      ))}

      {tab === 'domains' && renderTable(domains, [
        { key: 'id',      label: 'ID' },
        { key: 'host',    label: 'Host', render: r => <code style={{ fontSize: 11, background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{r.host}</code> },
        { key: 'type',    label: 'Type' },
        { key: 'business_id', label: 'Business ID' },
        { key: 'is_active', label: 'Status', render: r => <StatusBadge active={r.is_active} /> },
      ], null)}

      {/* Modals */}
      {modal?.type === 'business' && (
        <Modal title={modal.data ? 'Edit Business' : 'Create Business'} onClose={() => setModal(null)}>
          <BusinessForm initial={modal.data} onSave={saveBusiness} onClose={() => setModal(null)} saving={saving} />
        </Modal>
      )}

      {modal?.type === 'warehouse' && (
        <Modal title={modal.data ? 'Edit Warehouse' : 'Create Warehouse'} onClose={() => setModal(null)}>
          <WarehouseForm initial={modal.data} onSave={saveWarehouse} onClose={() => setModal(null)} saving={saving} />
        </Modal>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
