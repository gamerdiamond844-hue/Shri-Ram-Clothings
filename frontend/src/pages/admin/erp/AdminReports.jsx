import { useState, useEffect, useCallback } from 'react';
import {
  BarChart2, FileText, TrendingUp, Package, Users,
  Download, RefreshCw, Calendar, AlertCircle, ChevronRight
} from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

// ── Inline SVG Bar Chart ──────────────────────────────────────────────────────
function BarChart({ data, valueKey, labelKey, height = 120, color = '#f97316' }) {
  if (!data || !data.length) return (
    <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12 }}>
      No data available
    </div>
  );
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  const barW = 100 / data.length;
  return (
    <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
      {data.map((d, i) => {
        const h = (d[valueKey] / max) * (height - 20);
        return (
          <g key={i}>
            <rect
              x={i * barW + barW * 0.1}
              y={height - 20 - h}
              width={barW * 0.8}
              height={h}
              fill={color}
              rx="1"
            />
          </g>
        );
      })}
    </svg>
  );
}

// ── Horizontal Progress Bar ───────────────────────────────────────────────────
function HBar({ label, value, total, color = '#f97316' }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ fontWeight: 600, color: '#374151', textTransform: 'capitalize' }}>{label}</span>
        <span style={{ color: '#6b7280' }}>₹{fmt(value)} ({pct}%)</span>
      </div>
      <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, bg = '#fff7ed', color = '#f97316' }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f3f4f6', padding: '16px 18px' }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 16, color }}>{sub ? '₹' : '#'}</span>
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>{label}</div>
    </div>
  );
}

// ── Skeleton Loader ───────────────────────────────────────────────────────────
function Skeleton({ rows = 5 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 32, borderRadius: 8 }} />
      ))}
    </div>
  );
}

// ── Utility ───────────────────────────────────────────────────────────────────
const fmt = (n) => parseFloat(n || 0).toLocaleString('en-IN');
const fmtRs = (n) => `₹${fmt(n)}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—';

function getPresetDates(key) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = iso(now);
  const ago = (days) => { const d = new Date(now); d.setDate(d.getDate() - days); return iso(d); };
  const agoM = (months) => { const d = new Date(now); d.setMonth(d.getMonth() - months); return iso(d); };
  switch (key) {
    case 'today': return { from: today, to: today };
    case '7d':    return { from: ago(7), to: today };
    case '30d':   return { from: ago(30), to: today };
    case '3m':    return { from: agoM(3), to: today };
    case '6m':    return { from: agoM(6), to: today };
    case '1y':    return { from: agoM(12), to: today };
    default:      return { from: ago(30), to: today };
  }
}

// ── Report catalogue definition ───────────────────────────────────────────────
const REPORTS = [
  { key: 'sales',     label: 'Sales',         icon: BarChart2,  color: '#f97316', bg: '#fff7ed' },
  { key: 'gst',       label: 'GST',           icon: FileText,   color: '#3b82f6', bg: '#eff6ff' },
  { key: 'profit',    label: 'Profit & Loss',  icon: TrendingUp, color: '#22c55e', bg: '#f0fdf4' },
  { key: 'inventory', label: 'Inventory',     icon: Package,    color: '#8b5cf6', bg: '#f5f3ff' },
  { key: 'customers', label: 'Customers',     icon: Users,      color: '#ec4899', bg: '#fdf2f8' },
];

const PRESETS = [
  { key: 'today', label: 'Today' },
  { key: '7d',    label: '7d' },
  { key: '30d',   label: '30d' },
  { key: '3m',    label: '3m' },
  { key: '6m',    label: '6m' },
  { key: '1y',    label: '1y' },
  { key: 'custom',label: 'Custom' },
];

const inp = {
  padding: '7px 10px', fontSize: 13, border: '1.5px solid #e5e7eb',
  borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff'
};

// ═════════════════════════════════════════════════════════════════════════════
// REPORT VIEWS
// ═════════════════════════════════════════════════════════════════════════════

// ── Sales View ────────────────────────────────────────────────────────────────
function SalesView({ data }) {
  const s = data.summary || {};
  const daily = data.daily_trend || [];
  const payments = data.payment_method_breakdown || [];
  const payTotal = payments.reduce((a, p) => a + p.total, 0) || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <KpiCard label="Total Sales" value={fmtRs(s.total_sales)} sub={true} bg="#fff7ed" color="#f97316" />
        <KpiCard label="Total Bills" value={fmt(s.total_bills)} bg="#eff6ff" color="#3b82f6" />
        <KpiCard label="Avg Bill Value" value={fmtRs(s.avg_bill_value)} sub={true} bg="#f0fdf4" color="#22c55e" />
        <KpiCard label="Total Tax" value={fmtRs(s.total_tax)} sub={true} bg="#fdf2f8" color="#ec4899" />
      </div>

      {/* Daily trend chart */}
      {daily.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: '16px 18px' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 12 }}>Daily Sales Trend</p>
          <BarChart data={daily} valueKey="total" labelKey="date" height={120} color="#f97316" />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, color: '#9ca3af' }}>
            <span>{fmtDate(daily[0]?.date)}</span>
            <span>{fmtDate(daily[daily.length - 1]?.date)}</span>
          </div>
        </div>
      )}

      {/* Payment method breakdown */}
      {payments.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: '16px 18px' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 14 }}>Payment Method Breakdown</p>
          {payments.map((p, i) => {
            const colors = ['#f97316','#3b82f6','#22c55e','#8b5cf6','#ec4899','#f59e0b'];
            return <HBar key={i} label={p.method || 'Unknown'} value={p.total} total={payTotal} color={colors[i % colors.length]} />;
          })}
        </div>
      )}

      {/* Daily trend table */}
      {daily.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Daily Summary</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Date', 'Sales (₹)', 'Bills'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 14px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {daily.map((row, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #f9fafb' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '9px 14px', color: '#374151' }}>{fmtDate(row.date)}</td>
                    <td style={{ padding: '9px 14px', fontWeight: 700, color: '#f97316' }}>₹{fmt(row.total)}</td>
                    <td style={{ padding: '9px 14px', color: '#6b7280' }}>{row.bills}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── GST View ──────────────────────────────────────────────────────────────────
function GstView({ data }) {
  const rows = data.gst_summary || [];
  const totals = rows.reduce((acc, r) => ({
    taxable_value: acc.taxable_value + r.taxable_value,
    cgst: acc.cgst + r.cgst,
    sgst: acc.sgst + r.sgst,
    total_gst: acc.total_gst + r.total_gst,
    total_with_gst: acc.total_with_gst + r.total_with_gst,
    invoice_count: acc.invoice_count + r.invoice_count,
  }), { taxable_value: 0, cgst: 0, sgst: 0, total_gst: 0, total_with_gst: 0, invoice_count: 0 });

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>GST Summary (GSTR-1 Compatible)</p>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              {['HSN Code', 'GST Rate', 'Taxable Value', 'CGST', 'SGST', 'Total GST', 'Total with GST', 'Invoices'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderTop: '1px solid #f9fafb' }}
                onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontWeight: 600, color: '#374151' }}>{r.hsn_code}</td>
                <td style={{ padding: '9px 12px', color: '#6b7280' }}>{r.gst_rate}%</td>
                <td style={{ padding: '9px 12px', fontWeight: 600, color: '#111827' }}>₹{fmt(r.taxable_value)}</td>
                <td style={{ padding: '9px 12px', color: '#374151' }}>₹{fmt(r.cgst)}</td>
                <td style={{ padding: '9px 12px', color: '#374151' }}>₹{fmt(r.sgst)}</td>
                <td style={{ padding: '9px 12px', fontWeight: 600, color: '#3b82f6' }}>₹{fmt(r.total_gst)}</td>
                <td style={{ padding: '9px 12px', fontWeight: 700, color: '#111827' }}>₹{fmt(r.total_with_gst)}</td>
                <td style={{ padding: '9px 12px', color: '#6b7280' }}>{r.invoice_count}</td>
              </tr>
            ))}
            {rows.length > 0 && (
              <tr style={{ borderTop: '2px solid #e5e7eb', background: '#fffbf5' }}>
                <td colSpan={2} style={{ padding: '9px 12px', fontWeight: 800, color: '#111827', fontSize: 12 }}>TOTAL</td>
                <td style={{ padding: '9px 12px', fontWeight: 800, color: '#111827' }}>₹{fmt(totals.taxable_value)}</td>
                <td style={{ padding: '9px 12px', fontWeight: 700 }}>₹{fmt(totals.cgst)}</td>
                <td style={{ padding: '9px 12px', fontWeight: 700 }}>₹{fmt(totals.sgst)}</td>
                <td style={{ padding: '9px 12px', fontWeight: 800, color: '#3b82f6' }}>₹{fmt(totals.total_gst)}</td>
                <td style={{ padding: '9px 12px', fontWeight: 800 }}>₹{fmt(totals.total_with_gst)}</td>
                <td style={{ padding: '9px 12px', fontWeight: 700 }}>{totals.invoice_count}</td>
              </tr>
            )}
            {!rows.length && (
              <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No GST data for this period</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Profit & Loss View ────────────────────────────────────────────────────────
function ProfitView({ data }) {
  const profitPositive = (data.gross_profit || 0) >= 0;
  const expenses = data.expense_by_category || [];
  const monthly = data.monthly_trend || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f3f4f6', padding: '16px 18px' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>{fmtRs(data.revenue)}</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Revenue</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f3f4f6', padding: '16px 18px' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#ef4444' }}>{fmtRs(data.expenses)}</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Expenses</div>
        </div>
        <div style={{ background: profitPositive ? '#f0fdf4' : '#fef2f2', borderRadius: 12, border: `1px solid ${profitPositive ? '#bbf7d0' : '#fecaca'}`, padding: '16px 18px' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: profitPositive ? '#16a34a' : '#dc2626' }}>
            {profitPositive ? '+' : ''}{fmtRs(data.gross_profit)}
          </div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Gross Profit</div>
        </div>
      </div>

      {/* Expense by category */}
      {expenses.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Expense by Category</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Category', 'Amount (₹)'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 14px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses.map((r, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #f9fafb' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '9px 14px', fontWeight: 600, color: '#374151', textTransform: 'capitalize' }}>{r.category}</td>
                    <td style={{ padding: '9px 14px', fontWeight: 700, color: '#ef4444' }}>₹{fmt(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Monthly trend */}
      {monthly.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Monthly Trend</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Month', 'Revenue', 'Expenses', 'Profit'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 14px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthly.map((r, i) => {
                  const pos = (r.profit || 0) >= 0;
                  return (
                    <tr key={i} style={{ borderTop: '1px solid #f9fafb' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '9px 14px', fontWeight: 600, color: '#374151' }}>{r.month}</td>
                      <td style={{ padding: '9px 14px', color: '#111827' }}>₹{fmt(r.revenue)}</td>
                      <td style={{ padding: '9px 14px', color: '#ef4444' }}>₹{fmt(r.expenses)}</td>
                      <td style={{ padding: '9px 14px', fontWeight: 700, color: pos ? '#16a34a' : '#dc2626' }}>
                        {pos ? '+' : ''}₹{fmt(r.profit)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Inventory View ────────────────────────────────────────────────────────────
function InventoryView({ data }) {
  const topMoving = data.top_moving_items || [];
  const lowStock = data.low_stock_items || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f3f4f6', padding: '16px 18px' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>{fmt(data.total_items)}</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Total Items</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f3f4f6', padding: '16px 18px' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>{fmtRs(data.total_stock_value_cost)}</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Stock Value at Cost</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f3f4f6', padding: '16px 18px' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#8b5cf6' }}>{fmtRs(data.total_stock_value_retail)}</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Stock Value at Retail</div>
        </div>
      </div>

      {/* Top Moving Items */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Top Moving Items</p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Title', 'SKU', 'Category', 'Stock', 'Selling Price', 'Qty Sold'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topMoving.map((r, i) => (
                <tr key={i} style={{ borderTop: '1px solid #f9fafb' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '9px 12px', fontWeight: 600, color: '#111827', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</td>
                  <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: 11, color: '#6b7280' }}>{r.sku}</td>
                  <td style={{ padding: '9px 12px', color: '#6b7280' }}>{r.category || '—'}</td>
                  <td style={{ padding: '9px 12px' }}>
                    <span style={{ fontWeight: 700, color: r.current_stock <= 5 ? '#ef4444' : '#111827' }}>{r.current_stock}</span>
                  </td>
                  <td style={{ padding: '9px 12px', color: '#374151' }}>₹{fmt(r.selling_price)}</td>
                  <td style={{ padding: '9px 12px', fontWeight: 700, color: '#8b5cf6' }}>{r.total_qty_sold}</td>
                </tr>
              ))}
              {!topMoving.length && (
                <tr><td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No items found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Low Stock Items */}
      {lowStock.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #fecaca', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #fecaca', background: '#fef2f2' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#991b1b' }}>⚠ Low Stock Items ({lowStock.length})</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#fff5f5' }}>
                  {['Title', 'SKU', 'Category', 'Stock', 'Reorder Level', 'Selling Price'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lowStock.map((r, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #fef2f2' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fff5f5'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '9px 12px', fontWeight: 600, color: '#111827' }}>{r.title}</td>
                    <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: 11, color: '#6b7280' }}>{r.sku}</td>
                    <td style={{ padding: '9px 12px', color: '#6b7280' }}>{r.category || '—'}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: '#ef4444' }}>{r.current_stock}</td>
                    <td style={{ padding: '9px 12px', color: '#6b7280' }}>{r.reorder_level}</td>
                    <td style={{ padding: '9px 12px', color: '#374151' }}>₹{fmt(r.selling_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Customers View ────────────────────────────────────────────────────────────
function CustomersView({ data }) {
  const topCustomers = data.top_customers || [];
  const ls = data.loyalty_stats || {};
  const MEMBERSHIPS = { premium: { bg: '#fef9c3', color: '#854d0e' }, regular: { bg: '#f3f4f6', color: '#374151' }, vip: { bg: '#f5f3ff', color: '#6b21a8' } };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f3f4f6', padding: '16px 18px' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>{fmt(data.total_customers)}</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Total Customers</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f3f4f6', padding: '16px 18px' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#22c55e' }}>{fmt(data.new_customers_period)}</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>New This Period</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f3f4f6', padding: '16px 18px' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#f97316' }}>{fmt(ls.total_points)}</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Total Loyalty Points</div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f3f4f6', padding: '16px 18px' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#3b82f6' }}>{fmtRs(ls.total_credit)}</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Total Store Credit</div>
        </div>
      </div>

      {/* Top Customers table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Top Customers by Spend</p>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['#', 'Name', 'Phone', 'Code', 'Membership', 'Total Spend', 'Visits'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topCustomers.map((r, i) => {
                const ms = MEMBERSHIPS[r.membership] || MEMBERSHIPS.regular;
                return (
                  <tr key={i} style={{ borderTop: '1px solid #f9fafb' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '9px 12px', color: '#9ca3af', fontWeight: 700 }}>{i + 1}</td>
                    <td style={{ padding: '9px 12px', fontWeight: 600, color: '#111827' }}>{r.name}</td>
                    <td style={{ padding: '9px 12px', color: '#6b7280' }}>{r.phone || '—'}</td>
                    <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: 11, color: '#6b7280' }}>{r.customer_code || '—'}</td>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{ ...ms, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 100, textTransform: 'capitalize' }}>{r.membership || 'regular'}</span>
                    </td>
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: '#ec4899' }}>₹{fmt(r.total_spend)}</td>
                    <td style={{ padding: '9px 12px', color: '#6b7280' }}>{r.visit_count}</td>
                  </tr>
                );
              })}
              {!topCustomers.length && (
                <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No customer data for this period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════
export default function AdminReports() {
  const [activeReport, setActiveReport] = useState('sales');
  const [preset, setPreset] = useState('30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Compute current date range
  const getDateRange = useCallback(() => {
    if (preset === 'custom') {
      return { from: customFrom, to: customTo };
    }
    return getPresetDates(preset);
  }, [preset, customFrom, customTo]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData(null);
    const { from, to } = getDateRange();
    try {
      const endpoint = activeReport === 'inventory'
        ? `/erp/reports/inventory`
        : `/erp/reports/${activeReport}?from=${from}&to=${to}`;
      const res = await api.get(endpoint);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [activeReport, getDateRange]);

  // Fetch whenever report type or date range changes
  useEffect(() => {
    if (preset === 'custom' && (!customFrom || !customTo)) return;
    fetchReport();
  }, [fetchReport, preset, customFrom, customTo]);

  const handlePreset = (key) => {
    setPreset(key);
    setShowCustom(key === 'custom');
  };

  const handleExport = async () => {
    setExporting(true);
    const { from, to } = getDateRange();
    try {
      const params = new URLSearchParams({ type: activeReport });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const res = await api.get(`/erp/reports/export?${params}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${activeReport}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Report exported!');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const activeConf = REPORTS.find(r => r.key === activeReport);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>

      {/* ── Top Bar: Presets + Export ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {PRESETS.map(p => (
            <button key={p.key} onClick={() => handlePreset(p.key)}
              style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: preset === p.key ? '#f97316' : '#f3f4f6', color: preset === p.key ? '#fff' : '#6b7280' }}>
              {p.label}
            </button>
          ))}
          <button onClick={fetchReport} disabled={loading}
            style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
        <button onClick={handleExport} disabled={exporting || loading || !data}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#374151', opacity: (!data || exporting) ? 0.5 : 1 }}>
          <Download size={13} /> {exporting ? 'Exporting...' : 'Export .xlsx'}
        </button>
      </div>

      {/* Custom date range row */}
      {showCustom && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f3f4f6', padding: '12px 14px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 14 }}>
          <Calendar size={15} color="#f97316" />
          <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={inp} />
          <span style={{ fontSize: 12, color: '#9ca3af' }}>to</span>
          <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={inp} />
          <button onClick={fetchReport} className="btn-orange" style={{ padding: '7px 16px', borderRadius: 8, fontSize: 12 }}>Apply</button>
        </div>
      )}

      {/* ── Main layout: sidebar + content ── */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

        {/* Sidebar catalogue */}
        <div style={{ width: 180, flexShrink: 0, background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px 8px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', borderBottom: '1px solid #f3f4f6' }}>
            Reports
          </div>
          {REPORTS.map(r => {
            const Icon = r.icon;
            const isActive = activeReport === r.key;
            return (
              <button key={r.key} onClick={() => setActiveReport(r.key)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', border: 'none', cursor: 'pointer', background: isActive ? r.bg : 'transparent', borderLeft: isActive ? `3px solid ${r.color}` : '3px solid transparent', transition: 'all 0.15s', textAlign: 'left' }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f9fafb'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}>
                <Icon size={14} color={isActive ? r.color : '#9ca3af'} />
                <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? r.color : '#374151', flex: 1 }}>{r.label}</span>
                {isActive && <ChevronRight size={12} color={r.color} />}
              </button>
            );
          })}
        </div>

        {/* Report content area */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Report header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            {activeConf && (
              <>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: activeConf.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <activeConf.icon size={16} color={activeConf.color} />
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>{activeConf.label} Report</p>
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                    {preset !== 'custom' ? `Last ${preset}` : `${customFrom} — ${customTo}`}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />
                ))}
              </div>
              <div className="skeleton" style={{ height: 160, borderRadius: 14 }} />
              <div className="skeleton" style={{ height: 200, borderRadius: 14 }} />
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 14, padding: '24px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center' }}>
              <AlertCircle size={28} color="#ef4444" />
              <p style={{ fontSize: 14, fontWeight: 700, color: '#991b1b' }}>Failed to load report</p>
              <p style={{ fontSize: 12, color: '#dc2626' }}>{error}</p>
              <button onClick={fetchReport} className="btn-orange" style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13 }}>
                Retry
              </button>
            </div>
          )}

          {/* Report content */}
          {!loading && !error && data && (
            <>
              {activeReport === 'sales'     && <SalesView data={data} />}
              {activeReport === 'gst'       && <GstView data={data} />}
              {activeReport === 'profit'    && <ProfitView data={data} />}
              {activeReport === 'inventory' && <InventoryView data={data} />}
              {activeReport === 'customers' && <CustomersView data={data} />}
            </>
          )}

          {/* Empty / not yet loaded */}
          {!loading && !error && !data && (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              Select a date range to load the report
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
