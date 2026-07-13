import { useState, useEffect } from 'react';
import { ShieldCheck, Save, RefreshCw } from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const ROLES = [
  { key: 'cashier',           label: 'Cashier' },
  { key: 'store_manager',     label: 'Store Manager' },
  { key: 'warehouse_manager', label: 'Warehouse Manager' },
  { key: 'accountant',        label: 'Accountant' },
  { key: 'employee',          label: 'Employee' },
  { key: 'store_admin',       label: 'Store Admin' },
  { key: 'business_owner',    label: 'Business Owner' },
];

export default function AdminRoleManagement() {
  const [activeRole, setActiveRole]         = useState('cashier');
  const [allPermissions, setAllPermissions] = useState([]);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [loading, setLoading]               = useState(false);
  const [saving, setSaving]                 = useState(false);

  // Load all permissions once
  useEffect(() => {
    api.get('/erp/roles/permissions').then(res => {
      setAllPermissions(res.data.permissions || []);
    }).catch(() => toast.error('Failed to load permissions'));
  }, []);

  // Load permissions for selected role
  useEffect(() => {
    setLoading(true);
    api.get(`/erp/roles/${activeRole}`).then(res => {
      const ids = (res.data.permissions || []).map(p => p.id);
      setRolePermissions(ids);
    }).catch(() => toast.error('Failed to load role permissions'))
      .finally(() => setLoading(false));
  }, [activeRole]);

  const toggle = (id) => {
    setRolePermissions(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/erp/roles/${activeRole}`, { permission_ids: rolePermissions });
      toast.success(`Permissions saved for ${activeRole}`);
    } catch (err) { toast.error(err.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  // Group permissions by group_name
  const groups = allPermissions.reduce((acc, p) => {
    const g = p.group_name || 'General';
    if (!acc[g]) acc[g] = [];
    acc[g].push(p);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

      {/* Role list sidebar */}
      <div style={{ width: 200, flexShrink: 0, background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #f3f4f6' }}>Roles</div>
        {ROLES.map(role => {
          const active = activeRole === role.key;
          return (
            <button key={role.key} onClick={() => setActiveRole(role.key)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', border: 'none', cursor: 'pointer', background: active ? '#fff7ed' : 'transparent', borderLeft: active ? '3px solid #f97316' : '3px solid transparent', textAlign: 'left', transition: 'all 0.15s' }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f9fafb'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
              <ShieldCheck size={14} color={active ? '#f97316' : '#9ca3af'} />
              <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? '#f97316' : '#374151' }}>{role.label}</span>
            </button>
          );
        })}
      </div>

      {/* Permission checklist */}
      <div style={{ flex: 1, background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>
              Permissions for: <span style={{ color: '#f97316' }}>{ROLES.find(r => r.key === activeRole)?.label}</span>
            </h3>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '3px 0 0' }}>{rolePermissions.length} permission{rolePermissions.length !== 1 ? 's' : ''} assigned</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {loading && <RefreshCw size={14} color="#9ca3af" style={{ animation: 'spin 1s linear infinite' }} />}
            <button onClick={save} disabled={saving} className="btn-orange" style={{ padding: '8px 18px', borderRadius: 9, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Save size={13} /> {saving ? 'Saving…' : 'Save Permissions'}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 24, borderRadius: 7 }} />)}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {Object.entries(groups).map(([group, perms]) => (
              <div key={group}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, borderBottom: '1px solid #f3f4f6', paddingBottom: 6 }}>
                  {group}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
                  {perms.map(perm => {
                    const checked = rolePermissions.includes(perm.id);
                    return (
                      <label key={perm.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '8px 10px', borderRadius: 9, border: `1.5px solid ${checked ? '#fed7aa' : '#f3f4f6'}`, background: checked ? '#fff7ed' : '#fafafa', transition: 'all 0.12s' }}>
                        <input type="checkbox" checked={checked} onChange={() => toggle(perm.id)}
                          style={{ marginTop: 2, accentColor: '#f97316', width: 14, height: 14, cursor: 'pointer', flexShrink: 0 }} />
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: checked ? '#c2410c' : '#374151', fontFamily: 'monospace' }}>{perm.name}</div>
                          {perm.description && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{perm.description}</div>}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            {Object.keys(groups).length === 0 && (
              <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>
                No permissions found. Make sure permissions are seeded in the database.
              </div>
            )}
          </div>
        )}
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    </div>
  );
}
