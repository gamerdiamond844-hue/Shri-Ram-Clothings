import { useState, useEffect } from 'react';
import { Building2, Store, Warehouse, Globe, TrendingUp, Plus, Pencil, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
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

export default function AdminSuperAdmin() {
  const [tab, setTab]       = useState('businesses');
  const [businesses, setBiz] = useState([]);
  const [stores, setStores]  = useState([]);
  const [warehouses, setWH]  = useState([]);
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const renderTable = (rows, cols) => (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {cols.map(c => <th key={c.key} style={{ textAlign: 'left', padding: '9px 12px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 4 }).map((_, i) => (
              <tr key={i}><td colSpan={cols.length} style={{ padding: '9px 12px' }}><div className="skeleton" style={{ height: 24, borderRadius: 7 }} /></td></tr>
            )) : rows.length === 0 ? (
              <tr><td colSpan={cols.length} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No records found.</td></tr>
            ) : rows.map((row, i) => (
              <tr key={row.id || i} style={{ borderTop: '1px solid #f9fafb' }}
                onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {cols.map(c => (
                  <td key={c.key} style={{ padding: '9px 12px', color: '#374151', whiteSpace: 'nowrap' }}>
                    {c.render ? c.render(row) : row[c.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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

      {/* Tab content */}
      {tab === 'businesses' && renderTable(businesses, [
        { key: 'id',         label: 'ID' },
        { key: 'name',       label: 'Name', render: r => <span style={{ fontWeight: 600, color: '#111827' }}>{r.name}</span> },
        { key: 'slug',       label: 'Slug', render: r => <code style={{ fontSize: 11, background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{r.slug}</code> },
        { key: 'gst_number', label: 'GST' },
        { key: 'currency',   label: 'Currency' },
        { key: 'is_active',  label: 'Status', render: r => <StatusBadge active={r.is_active} /> },
      ])}

      {tab === 'stores' && renderTable(stores, [
        { key: 'id',            label: 'ID' },
        { key: 'business_name', label: 'Business', render: r => <span style={{ fontWeight: 600, color: '#111827' }}>{r.business_name}</span> },
        { key: 'name',          label: 'Store Name' },
        { key: 'store_code',    label: 'Code', render: r => <code style={{ fontSize: 11, background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{r.store_code || '—'}</code> },
        { key: 'phone',         label: 'Phone' },
        { key: 'is_active',     label: 'Status', render: r => <StatusBadge active={r.is_active} /> },
      ])}

      {tab === 'warehouses' && renderTable(warehouses, [
        { key: 'id',            label: 'ID' },
        { key: 'business_name', label: 'Business', render: r => <span style={{ fontWeight: 600, color: '#111827' }}>{r.business_name}</span> },
        { key: 'name',          label: 'Warehouse Name' },
        { key: 'phone',         label: 'Phone' },
        { key: 'address',       label: 'Address', render: r => <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block' }}>{r.address || '—'}</span> },
        { key: 'is_active',     label: 'Status', render: r => <StatusBadge active={r.is_active} /> },
      ])}

      {tab === 'domains' && renderTable(domains, [
        { key: 'id',      label: 'ID' },
        { key: 'host',    label: 'Host', render: r => <code style={{ fontSize: 11, background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{r.host}</code> },
        { key: 'type',    label: 'Type' },
        { key: 'business_id', label: 'Business ID' },
        { key: 'is_active', label: 'Status', render: r => <StatusBadge active={r.is_active} /> },
      ])}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}
