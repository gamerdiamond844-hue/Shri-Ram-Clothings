import { useState, useEffect, useCallback } from 'react';
import { IndianRupee, ShoppingBag, Users, Package, TrendingUp, TrendingDown, Download, RefreshCw, Calendar } from 'lucide-react';
import api, { downloadFile } from '../../utils/api';
import toast from 'react-hot-toast';

// ── Simple SVG Line Chart ─────────────────────────────────────────────────────
function LineChart({ data, dataKey, color = '#f97316', height = 120 }) {
  if (!data || data.length < 2) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12 }}>
      No data for this period
    </div>
  );

  const values = data.map(d => parseFloat(d[dataKey]) || 0);
  const max = Math.max(...values) || 1;
  const min = Math.min(...values);
  const range = max - min || 1;
  const w = 100, h = 100;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * (h * 0.8) - h * 0.1;
    return `${x},${y}`;
  });
  const polyline = pts.join(' ');
  const area = `0,${h} ${polyline} ${w},${h}`;

  return (
    <div style={{ height, position: 'relative' }}>
      <svg viewBox={`0 0 100 100`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#grad-${dataKey})`} />
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

// ── Simple Bar Chart ──────────────────────────────────────────────────────────
function BarChart({ data, dataKey, color = '#f97316', height = 100 }) {
  if (!data || !data.length) return null;
  const values = data.map(d => parseFloat(d[dataKey]) || 0);
  const max = Math.max(...values) || 1;
  return (
    <div style={{ height, display: 'flex', alignItems: 'flex-end', gap: 2, padding: '0 4px' }}>
      {values.map((v, i) => (
        <div key={i} style={{ flex: 1, background: color, borderRadius: '3px 3px 0 0', height: `${(v / max) * 90}%`, minHeight: v > 0 ? 3 : 0, opacity: 0.8, transition: 'height 0.3s ease' }} title={`${v}`} />
      ))}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, change, bg, iconColor, chart, chartKey, chartColor }) {
  const isPositive = change >= 0;
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={19} color={iconColor} />
        </div>
        {change !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 700, color: isPositive ? '#16a34a' : '#dc2626', background: isPositive ? '#f0fdf4' : '#fef2f2', padding: '3px 7px', borderRadius: 100 }}>
            {isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{sub}</div>}
      </div>
      {chart && chart.length > 1 && (
        <LineChart data={chart} dataKey={chartKey} color={chartColor || iconColor} height={50} />
      )}
    </div>
  );
}

// ── Period presets ────────────────────────────────────────────────────────────
const PERIODS = [
  { key: '1d',   label: 'Today' },
  { key: '7d',   label: '7 Days' },
  { key: '30d',  label: '30 Days' },
  { key: '90d',  label: '3 Months' },
  { key: '180d', label: '6 Months' },
  { key: '365d', label: '1 Year' },
  { key: 'custom', label: 'Custom' },
];

const STATUS_STYLE = {
  pending:    { bg: '#fef9c3', color: '#854d0e' },
  confirmed:  { bg: '#dbeafe', color: '#1e40af' },
  processing: { bg: '#f3e8ff', color: '#6b21a8' },
  shipped:    { bg: '#e0e7ff', color: '#3730a3' },
  delivered:  { bg: '#dcfce7', color: '#166534' },
  cancelled:  { bg: '#fee2e2', color: '#991b1b' },
  refunded:   { bg: '#f3f4f6', color: '#374151' },
};

export default function AdminOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [exporting, setExporting] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ period });
      if (period === 'custom' && customStart && customEnd) {
        p.set('start', customStart);
        p.set('end', customEnd);
      }
      const res = await api.get(`/admin/analytics?${p}`);
      setData(res.data);
    } catch { toast.error('Failed to load analytics'); }
    finally { setLoading(false); }
  }, [period, customStart, customEnd]);

  useEffect(() => {
    if (period !== 'custom') load();
  }, [period, load]);

  const applyCustom = () => {
    if (!customStart || !customEnd) return toast.error('Select start and end date');
    if (new Date(customStart) > new Date(customEnd)) return toast.error('Start date must be before end date');
    load();
  };

  const exportData = async (type) => {
    setExporting(type);
    try {
      const p = new URLSearchParams({ period, type });
      if (period === 'custom' && customStart && customEnd) {
        p.set('start', customStart);
        p.set('end', customEnd);
      }
      const filename = `${type}-report-${new Date().toISOString().slice(0,10)}.xlsx`;
      await downloadFile(`/admin/analytics/export?${p}`, filename);
      toast.success(`${type} report downloaded!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Export failed');
    } finally {
      setExporting('');
    }
  };

  const fmt = (n) => parseFloat(n || 0).toLocaleString('en-IN');
  const fmtRs = (n) => `₹${fmt(n)}`;

  const m = data?.metrics;
  const cmp = data?.comparison;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Header + Period Filter ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Analytics Dashboard</h2>
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
            {data ? `${new Date(data.period.from).toLocaleDateString('en-IN')} — ${new Date(data.period.to).toLocaleDateString('en-IN')}` : 'Loading...'}
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {/* Period pills */}
          {PERIODS.map(p => (
            <button key={p.key} onClick={() => { setPeriod(p.key); setShowCustom(p.key === 'custom'); }}
              style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: period === p.key ? '#f97316' : '#f3f4f6', color: period === p.key ? '#fff' : '#6b7280' }}>
              {p.label}
            </button>
          ))}

          {/* Refresh */}
          <button onClick={load} disabled={loading}
            style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>

          {/* Export dropdown */}
          <div style={{ position: 'relative' }}
            onMouseEnter={e => e.currentTarget.querySelector('.export-dd').style.display = 'block'}
            onMouseLeave={e => e.currentTarget.querySelector('.export-dd').style.display = 'none'}>
            <button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151' }}>
              <Download size={13} /> Export .xlsx ▾
            </button>
            <div className="export-dd" style={{ display: 'none', position: 'absolute', right: 0, top: '100%', marginTop: 4, background: '#fff', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #f3f4f6', minWidth: 200, zIndex: 50, overflow: 'hidden' }}>
              <div style={{ padding: '8px 14px 6px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Select Export</div>
              {[
                ['full',      '📊 Full System Export (7 Sheets)'],
                ['orders',    '📦 Orders Only'],
                ['revenue',   '💰 Revenue Report'],
                ['products',  '🛍️ Products Report'],
                ['customers', '👥 Customers Report'],
              ].map(([t, label]) => (
                <button key={t} onClick={() => exportData(t)} disabled={exporting === t}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', fontSize: 12, fontWeight: t === 'full' ? 700 : 500, color: t === 'full' ? '#f97316' : '#374151', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid #f9fafb' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fff7ed'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  {exporting === t ? '⏳ Downloading...' : label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Custom date range */}
      {showCustom && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f3f4f6', padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          <Calendar size={15} color="#f97316" />
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
            style={{ padding: '7px 10px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit' }} />
          <span style={{ fontSize: 12, color: '#9ca3af' }}>to</span>
          <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
            style={{ padding: '7px 10px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit' }} />
          <button onClick={applyCustom} className="btn-orange" style={{ padding: '7px 16px', borderRadius: 8, fontSize: 13 }}>Apply</button>
        </div>
      )}

      {/* ── Stat Cards ── */}
      {loading ? (
        <div className="grid-features">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 130, borderRadius: 14 }} />)}
        </div>
      ) : (
        <div className="grid-features">
          <StatCard icon={IndianRupee} label="Revenue" value={fmtRs(m?.revenue)} sub={`Avg order: ${fmtRs(m?.avg_order_value)}`} change={cmp?.revenue_change} bg="#fff7ed" iconColor="#f97316" chart={data?.charts?.revenue} chartKey="revenue" chartColor="#f97316" />
          <StatCard icon={ShoppingBag} label="Orders" value={fmt(m?.orders)} sub={`${fmt(m?.paid_orders)} paid`} change={cmp?.orders_change} bg="#eff6ff" iconColor="#3b82f6" chart={data?.charts?.revenue} chartKey="orders" chartColor="#3b82f6" />
          <StatCard icon={Package} label="Delivered" value={fmt(m?.delivered)} sub={`${fmt(m?.pending)} pending`} bg="#f0fdf4" iconColor="#22c55e" />
          <StatCard icon={Users} label="New Customers" value={data?.charts?.customers?.reduce((s, d) => s + d.new_users, 0) || 0} bg="#f5f3ff" iconColor="#8b5cf6" chart={data?.charts?.customers} chartKey="new_users" chartColor="#8b5cf6" />
          <StatCard icon={TrendingDown} label="Cancelled" value={fmt(m?.cancelled)} bg="#fef2f2" iconColor="#ef4444" />
          <StatCard icon={RefreshCw} label="Refunded" value={fmt(m?.refunded)} bg="#f3f4f6" iconColor="#6b7280" />
        </div>
      )}

      {/* ── Comparison banner ── */}
      {!loading && cmp && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f3f4f6', padding: '12px 18px', display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>vs previous period:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <span style={{ color: '#9ca3af' }}>Revenue</span>
            <span style={{ fontWeight: 700, color: '#111827' }}>{fmtRs(cmp.prev_revenue)}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: cmp.revenue_change >= 0 ? '#16a34a' : '#dc2626', background: cmp.revenue_change >= 0 ? '#f0fdf4' : '#fef2f2', padding: '2px 6px', borderRadius: 100 }}>
              {cmp.revenue_change >= 0 ? '+' : ''}{cmp.revenue_change}%
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <span style={{ color: '#9ca3af' }}>Orders</span>
            <span style={{ fontWeight: 700, color: '#111827' }}>{fmt(cmp.prev_orders)}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: cmp.orders_change >= 0 ? '#16a34a' : '#dc2626', background: cmp.orders_change >= 0 ? '#f0fdf4' : '#fef2f2', padding: '2px 6px', borderRadius: 100 }}>
              {cmp.orders_change >= 0 ? '+' : ''}{cmp.orders_change}%
            </span>
          </div>
        </div>
      )}

      {/* ── Revenue Chart ── */}
      {!loading && data?.charts?.revenue?.length > 1 && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Revenue Over Time</p>
              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{data.charts.revenue.length} data points</p>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 3, background: '#f97316', borderRadius: 2, display: 'inline-block' }} />Revenue</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 3, background: '#3b82f6', borderRadius: 2, display: 'inline-block' }} />Orders</span>
            </div>
          </div>
          <LineChart data={data.charts.revenue} dataKey="revenue" color="#f97316" height={140} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: '#9ca3af' }}>
            <span>{new Date(data.charts.revenue[0]?.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
            <span>{new Date(data.charts.revenue[data.charts.revenue.length - 1]?.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="product-grid">

        {/* ── Top Products ── */}
        {!loading && data?.top_products?.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Top Products</p>
              <button onClick={() => exportData('products')} disabled={exporting === 'products'}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#f97316', background: '#fff7ed', border: 'none', cursor: 'pointer', padding: '4px 10px', borderRadius: 6 }}>
                <Download size={11} /> {exporting === 'products' ? 'Downloading...' : 'Export .xlsx'}
              </button>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {['#', 'Product', 'Units', 'Revenue'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 14px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.top_products.slice(0, 8).map((p, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #f9fafb' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '9px 14px', color: '#9ca3af', fontWeight: 700 }}>{i + 1}</td>
                      <td style={{ padding: '9px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {p.image_url && <img src={p.image_url} alt="" style={{ width: 28, height: 34, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />}
                          <span style={{ fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>{p.title}</span>
                        </div>
                      </td>
                      <td style={{ padding: '9px 14px', fontWeight: 600, color: '#374151' }}>{p.units_sold}</td>
                      <td style={{ padding: '9px 14px', fontWeight: 700, color: '#f97316' }}>₹{Math.round(p.revenue).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Category Stats ── */}
        {!loading && data?.category_stats?.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: '18px 20px' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 14 }}>Sales by Category</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(() => {
                const total = data.category_stats.reduce((s, c) => s + parseFloat(c.revenue), 0) || 1;
                return data.category_stats.map((cat, i) => {
                  const pct = Math.round((parseFloat(cat.revenue) / total) * 100);
                  const colors = ['#f97316','#3b82f6','#8b5cf6','#22c55e','#ef4444','#f59e0b'];
                  const color = colors[i % colors.length];
                  return (
                    <div key={cat.category}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                        <span style={{ fontWeight: 600, color: '#374151' }}>{cat.category}</span>
                        <span style={{ color: '#9ca3af' }}>₹{Math.round(cat.revenue).toLocaleString('en-IN')} · {pct}%</span>
                      </div>
                      <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}
      </div>

      {/* ── Order Status Breakdown ── */}
      {!loading && data?.order_status?.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: '18px 20px' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 14 }}>Order Status Breakdown</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {data.order_status.map(s => {
              const style = STATUS_STYLE[s.status] || { bg: '#f3f4f6', color: '#374151' };
              return (
                <div key={s.status} style={{ background: style.bg, borderRadius: 10, padding: '10px 16px', textAlign: 'center', minWidth: 90 }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: style.color }}>{s.count}</div>
                  <div style={{ fontSize: 11, color: style.color, opacity: 0.8, textTransform: 'capitalize', marginTop: 2, fontWeight: 500 }}>{s.status}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Recent Orders + Export ── */}
      {!loading && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Recent Orders</p>
            <button onClick={() => exportData('orders')} disabled={exporting === 'orders'}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#374151', background: '#f9fafb', border: '1.5px solid #e5e7eb', cursor: 'pointer', padding: '6px 12px', borderRadius: 8 }}>
              <Download size={13} /> {exporting === 'orders' ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Order ID', 'Customer', 'Amount', 'Status', 'Date'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data?.recent_orders || []).map(o => {
                  const s = STATUS_STYLE[o.status] || { bg: '#f3f4f6', color: '#374151' };
                  return (
                    <tr key={o.order_id} style={{ borderTop: '1px solid #f9fafb' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '11px 16px', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#374151' }}>#{o.order_id}</td>
                      <td style={{ padding: '11px 16px', color: '#374151' }}>{o.full_name}</td>
                      <td style={{ padding: '11px 16px', fontWeight: 700, color: '#111827' }}>₹{o.total}</td>
                      <td style={{ padding: '11px 16px' }}>
                        <span style={{ ...s, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, textTransform: 'capitalize', display: 'inline-block' }}>{o.status}</span>
                      </td>
                      <td style={{ padding: '11px 16px', color: '#9ca3af', fontSize: 12 }}>{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                    </tr>
                  );
                })}
                {!data?.recent_orders?.length && (
                  <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No orders in this period</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
