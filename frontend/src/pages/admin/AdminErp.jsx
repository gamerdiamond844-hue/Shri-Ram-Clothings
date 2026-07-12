import { useState, useEffect, useCallback } from 'react';
import { Cpu, Globe, Building2, Layers, Settings, RefreshCw } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const STAT_CARD = {
  background: '#fff',
  borderRadius: 16,
  border: '1px solid #e5e7eb',
  padding: 20,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
};

const LABEL_STYLE = { fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' };

export default function AdminErp() {
  const [dashboard, setDashboard] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  const loadErpData = useCallback(async () => {
    setLoading(true);
    setIsError(false);
    try {
      const [dashRes, settingsRes] = await Promise.all([
        api.get('/erp/dashboard'),
        api.get('/erp/settings'),
      ]);
      setDashboard(dashRes.data);
      setSettings(settingsRes.data);
    } catch (err) {
      setIsError(true);
      toast.error(err.response?.data?.message || 'Unable to load ERP console');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadErpData();
  }, [loadErpData]);

  const formatNumber = (value) => {
    if (value === null || value === undefined) return '0';
    return Number(value).toLocaleString('en-IN');
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '₹0';
    return `₹${Number(value).toFixed(2).toLocaleString('en-IN')}`;
  };

  const tenant = dashboard?.tenant || {};
  const kpis = dashboard?.kpis || {};
  const modules = dashboard?.modules || [];
  const globalSettings = settings?.settings || {};
  const businessSettings = settings?.business_settings || {};

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ width: 48, height: 48, borderRadius: 16, background: '#f97316', display: 'grid', placeItems: 'center', color: '#fff' }}>
            <Cpu size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>ERP Console</h2>
            <p style={{ fontSize: 13, color: '#6b7280', maxWidth: 640 }}>View tenant-aware ERP metrics, active modules, and current business settings for the platform. This panel is built for admin and super-admin ERP operations.</p>
          </div>
        </div>

        <button
          onClick={loadErpData}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #e5e7eb', borderRadius: 999,
            background: '#fff', color: '#111827', padding: '10px 16px', cursor: 'pointer', fontWeight: 600,
          }}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div style={STAT_CARD}>
          <div style={LABEL_STYLE}>Tenant</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{tenant.type === 'public' ? 'Public / Unmapped' : `${tenant.type?.replace('_', ' ')}`}</div>
          <div style={{ display: 'grid', gap: 6, fontSize: 13, color: '#475569' }}>
            <div><strong>Host:</strong> {tenant.host || 'N/A'}</div>
            <div><strong>Business:</strong> {tenant.business_name || 'N/A'}</div>
            <div><strong>Store:</strong> {tenant.store_name || 'N/A'}</div>
            <div><strong>Warehouse:</strong> {tenant.warehouse_name || 'N/A'}</div>
          </div>
        </div>

        <div style={STAT_CARD}>
          <div style={LABEL_STYLE}>ERP KPIs (30d)</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{formatCurrency(kpis.revenue_30d)}</div>
          <div style={{ display: 'grid', gap: 6, fontSize: 13, color: '#475569' }}>
            <div><strong>Orders:</strong> {formatNumber(kpis.orders_30d)}</div>
            <div><strong>Active Products:</strong> {formatNumber(kpis.active_products)}</div>
            <div><strong>Active Customers:</strong> {formatNumber(kpis.active_customers)}</div>
          </div>
        </div>

        <div style={STAT_CARD}>
          <div style={LABEL_STYLE}>Modules</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Settings size={18} color="#f97316" />
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{modules.length}</div>
              <div style={{ fontSize: 13, color: '#475569' }}>Enabled ERP modules</div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gap: 14 }}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} style={{ height: 120, background: '#f3f4f6', borderRadius: 16 }} />
          ))}
        </div>
      ) : isError ? (
        <div style={{ background: '#fff7ed', borderRadius: 18, border: '1px solid #fcd34d', padding: 20, display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: '#fef3c7', display: 'grid', placeItems: 'center', color: '#b45309' }}>!</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#92400e' }}>ERP load failed</div>
              <div style={{ color: '#7c2d12', fontSize: 13 }}>There was a problem fetching ERP data. Please check your connection or try again.</div>
            </div>
          </div>
          <button
            onClick={loadErpData}
            style={{
              width: 'fit-content', padding: '10px 18px', borderRadius: 999, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer', fontWeight: 700,
            }}
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e5e7eb', padding: 20, display: 'grid', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Layers size={18} color="#f97316" />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Available ERP Modules</div>
                <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>A quick view of active ERP modules for the current tenant or platform.</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
              {modules.map((module) => (
                <div key={module.key || module} style={{ padding: 16, borderRadius: 14, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', textTransform: 'capitalize' }}>{module.name || module}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e5e7eb', padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Globe size={18} color="#f97316" />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Global Settings</div>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Core platform settings that apply across the ERP site.</p>
                </div>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {Object.entries(globalSettings).length === 0 && <div style={{ color: '#9ca3af' }}>No global settings found.</div>}
                {Object.entries(globalSettings).map(([key, value]) => (
                  <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
                    <div style={{ fontSize: 13, color: '#374151' }}>{key.replace(/_/g, ' ')}</div>
                    <div style={{ fontSize: 13, color: '#111827', fontWeight: 600 }}>{String(value)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e5e7eb', padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Building2 size={18} color="#f97316" />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Business Settings</div>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>Tenant-specific business configuration stored in the ERP database.</p>
                </div>
              </div>
              <div style={{ display: 'grid', gap: 10 }}>
                {Object.entries(businessSettings).length === 0 && <div style={{ color: '#9ca3af' }}>No business-level settings configured.</div>}
                {Object.entries(businessSettings).map(([key, value]) => (
                  <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
                    <div style={{ fontSize: 13, color: '#374151' }}>{key.replace(/_/g, ' ')}</div>
                    <div style={{ fontSize: 13, color: '#111827', fontWeight: 600 }}>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
