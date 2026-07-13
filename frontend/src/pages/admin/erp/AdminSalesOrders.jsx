import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Download, ChevronLeft, ChevronRight, X, Eye, Ban, CreditCard, Printer, AlertCircle } from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const inp = {
  width: '100%', padding: '8px 12px', fontSize: 13,
  border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none',
  fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box',
};
const fmt = (n) => parseFloat(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const STATUS_COLORS = {
  completed: { bg: '#dcfce7', color: '#166534' },
  void:      { bg: '#fee2e2', color: '#991b1b' },
  returned:  { bg: '#dbeafe', color: '#1e40af' },
  hold:      { bg: '#fef9c3', color: '#854d0e' },
  draft:     { bg: '#f3f4f6', color: '#6b7280' },
};
const StatusBadge = ({ status }) => {
  const s = STATUS_COLORS[status] || STATUS_COLORS.draft;
  return <span style={{ ...s, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>{(status || 'draft').charAt(0).toUpperCase() + (status || '').slice(1)}</span>;
};

export default function AdminSalesOrders() {
  const [sales, setSales]   = useState([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage]     = useState(1);
  const [limit]             = useState(20);

  // Filters
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [fromDate, setFrom]   = useState('');
  const [toDate, setTo]       = useState('');
  const [payMethod, setPayMethod] = useState('');
  const debounceRef           = useRef(null);

  // Detail panel
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleDetail, setSaleDetail]     = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Void modal
  const [voidSale, setVoidSale]     = useState(null);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding]       = useState(false);

  // Credit note modal
  const [creditSale, setCreditSale]   = useState(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditNotes, setCreditNotes] = useState('');
  const [crediting, setCrediting]     = useState(false);

  const [exporting, setExporting] = useState(false);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit });
      if (search)    p.set('search', search);
      if (status)    p.set('status', status);
      if (fromDate)  p.set('from', fromDate);
      if (toDate)    p.set('to', toDate);
      if (payMethod) p.set('payment_method', payMethod);
      const res = await api.get(`/erp/sales?${p}`);
      setSales(res.data.sales || []);
      setTotal(res.data.total || 0);
    } catch { toast.error('Failed to load sales'); }
    finally { setLoading(false); }
  }, [page, limit, search, status, fromDate, toDate, payMethod]);

  useEffect(() => { fetchSales(); }, [fetchSales]);
  useEffect(() => { setPage(1); }, [search, status, fromDate, toDate, payMethod]);

  const handleSearchChange = (v) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setSearch(v), 300);
  };

  const openDetail = async (sale) => {
    setSelectedSale(sale);
    setSaleDetail(null);
    setDetailLoading(true);
    try {
      const res = await api.get(`/erp/sales/${sale.id}`);
      setSaleDetail(res.data.sale);
    } catch { toast.error('Failed to load sale details'); }
    finally { setDetailLoading(false); }
  };

  const handleVoid = async () => {
    if (!voidSale) return;
    setVoiding(true);
    try {
      await api.post(`/erp/sales/${voidSale.id}/void`, { reason: voidReason });
      toast.success('Sale voided');
      setVoidSale(null); setVoidReason('');
      fetchSales();
      if (selectedSale?.id === voidSale.id) openDetail(voidSale);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to void sale'); }
    finally { setVoiding(false); }
  };

  const handleCredit = async () => {
    if (!creditSale || !creditAmount) return toast.error('Enter an amount');
    setCrediting(true);
    try {
      await api.post(`/erp/sales/${creditSale.id}/credit-note`, { amount: Number(creditAmount), notes: creditNotes });
      toast.success('Credit note issued');
      setCreditSale(null); setCreditAmount(''); setCreditNotes('');
      fetchSales();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to issue credit note'); }
    finally { setCrediting(false); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const p = new URLSearchParams();
      if (search)    p.set('search', search);
      if (status)    p.set('status', status);
      if (fromDate)  p.set('from', fromDate);
      if (toDate)    p.set('to', toDate);
      if (payMethod) p.set('payment_method', payMethod);
      const res = await api.get(`/erp/sales/export?${p}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url;
      a.download = `sales-${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click(); URL.revokeObjectURL(url);
      toast.success('Exported');
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
            <input defaultValue="" onChange={e => handleSearchChange(e.target.value)} placeholder="Bill number…" style={{ ...inp, paddingLeft: 28, width: 180 }} />
          </div>
          <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...inp, width: 130 }}>
            <option value="">All Statuses</option>
            {['completed','void','returned','hold','draft'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <input type="date" value={fromDate} onChange={e => setFrom(e.target.value)} style={{ ...inp, width: 140 }} />
          <input type="date" value={toDate}   onChange={e => setTo(e.target.value)}   style={{ ...inp, width: 140 }} />
          <select value={payMethod} onChange={e => setPayMethod(e.target.value)} style={{ ...inp, width: 110 }}>
            <option value="">All Methods</option>
            {['cash','upi','card','wallet','cheque','bank','split'].map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
          </select>
        </div>
        <button onClick={handleExport} disabled={exporting} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#374151' }}>
          <Download size={13} /> {exporting ? 'Exporting…' : 'Export Excel'}
        </button>
      </div>

      {/* Main layout */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

        {/* Table */}
        <div style={{ flex: 1, minWidth: 0, background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Bill No', 'Customer', 'Cashier', 'Date', 'Payment', 'Total', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '9px 12px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? Array.from({ length: 7 }).map((_, i) => (
                  <tr key={i}><td colSpan={8} style={{ padding: '9px 12px' }}><div className="skeleton" style={{ height: 26, borderRadius: 7 }} /></td></tr>
                )) : sales.length === 0 ? (
                  <tr><td colSpan={8} style={{ padding: '44px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No sales found.</td></tr>
                ) : sales.map(sale => {
                  const isSelected = selectedSale?.id === sale.id;
                  return (
                    <tr key={sale.id} onClick={() => openDetail(sale)} style={{ borderTop: '1px solid #f9fafb', cursor: 'pointer', background: isSelected ? '#fff7ed' : 'transparent' }}
                      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#fafafa'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#fff7ed' : 'transparent'; }}>
                      <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{sale.bill_no}</td>
                      <td style={{ padding: '9px 12px', color: '#111827', whiteSpace: 'nowrap' }}>{sale.customer_name || <span style={{ color: '#9ca3af' }}>Walk-in</span>}</td>
                      <td style={{ padding: '9px 12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{sale.cashier_name || '—'}</td>
                      <td style={{ padding: '9px 12px', color: '#6b7280', whiteSpace: 'nowrap', fontSize: 12 }}>{sale.created_at ? new Date(sale.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</td>
                      <td style={{ padding: '9px 12px', color: '#6b7280', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{sale.payment_method}</td>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>₹{fmt(sale.total)}</td>
                      <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}><StatusBadge status={sale.status} /></td>
                      <td style={{ padding: '9px 12px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => openDetail(sale)} title="View" style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Eye size={12} /></button>
                          {sale.status === 'completed' && (
                            <button onClick={() => { setVoidSale(sale); setVoidReason(''); }} title="Void" style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Ban size={12} /></button>
                          )}
                          {sale.customer_id && (sale.status === 'void' || sale.status === 'returned') && (
                            <button onClick={() => { setCreditSale(sale); setCreditAmount(''); setCreditNotes(''); }} title="Credit Note" style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CreditCard size={12} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div style={{ padding: '10px 14px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#9ca3af' }}>{total} sales</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ width: 28, height: 28, borderRadius: 7, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page === 1 ? 0.4 : 1 }}><ChevronLeft size={13} /></button>
                <span style={{ padding: '0 8px', lineHeight: '28px', color: '#6b7280' }}>{page}/{totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ width: 28, height: 28, borderRadius: 7, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page === totalPages ? 0.4 : 1 }}><ChevronRight size={13} /></button>
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selectedSale && (
          <div style={{ width: 400, flexShrink: 0, background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{selectedSale.bill_no}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => window.print()} title="Print" style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Printer size={12} /></button>
                <button onClick={() => { setSelectedSale(null); setSaleDetail(null); }} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', background: '#f3f4f6', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={13} /></button>
              </div>
            </div>
            {detailLoading ? (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 22, borderRadius: 7 }} />)}
              </div>
            ) : saleDetail ? (
              <div style={{ padding: 14, overflowY: 'auto', maxHeight: 580 }}>
                {/* Sale meta */}
                <div style={{ background: '#f9fafb', borderRadius: 10, padding: 12, marginBottom: 12, fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ color: '#6b7280' }}>Status</span>
                    <StatusBadge status={saleDetail.status} />
                  </div>
                  {[['Customer', saleDetail.customer_name || 'Walk-in'], ['Cashier', saleDetail.cashier_name || '—'], ['Date', saleDetail.created_at ? new Date(saleDetail.created_at).toLocaleString('en-IN') : '—'], ['Payment', (saleDetail.payment_method || '').toUpperCase()]].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ color: '#6b7280' }}>{k}</span><span style={{ fontWeight: 600, color: '#374151' }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Items */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 12 }}>
                  <thead><tr style={{ background: '#f9fafb' }}>
                    {['Item', 'Qty', 'Price', 'Total'].map(h => <th key={h} style={{ textAlign: 'left', padding: '6px 8px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {(saleDetail.items || []).map((item, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #f9fafb' }}>
                        <td style={{ padding: '6px 8px', color: '#111827' }}>{item.title}</td>
                        <td style={{ padding: '6px 8px', color: '#6b7280', textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ padding: '6px 8px', color: '#6b7280' }}>₹{fmt(item.unit_price)}</td>
                        <td style={{ padding: '6px 8px', fontWeight: 700, color: '#111827' }}>₹{fmt(item.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 10px', fontSize: 12 }}>
                  {saleDetail.discount_amount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}><span>Discount</span><span style={{ color: '#ef4444' }}>-₹{fmt(saleDetail.discount_amount)}</span></div>}
                  {saleDetail.tax_amount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}><span>Tax</span><span>₹{fmt(saleDetail.tax_amount)}</span></div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 14, borderTop: '1px solid #e5e7eb', paddingTop: 4 }}><span>Total</span><span>₹{fmt(saleDetail.total)}</span></div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  {saleDetail.status === 'completed' && (
                    <button onClick={() => { setVoidSale(saleDetail); setVoidReason(''); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#ef4444', fontSize: 12, fontWeight: 600 }}>
                      <Ban size={13} /> Void Sale
                    </button>
                  )}
                  {saleDetail.customer_id && (saleDetail.status === 'void' || saleDetail.status === 'returned') && (
                    <button onClick={() => { setCreditSale(saleDetail); setCreditAmount(''); setCreditNotes(''); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#f0fdf4', color: '#16a34a', fontSize: 12, fontWeight: 600 }}>
                      <CreditCard size={13} /> Credit Note
                    </button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Void modal */}
      {voidSale && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 22, width: 380, boxShadow: '0 16px 48px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <AlertCircle size={18} color="#ef4444" />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Void Sale {voidSale.bill_no}?</span>
            </div>
            <div style={{ background: '#fef2f2', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#dc2626', marginBottom: 14 }}>
              This will restore stock for all line items. This action cannot be undone.
            </div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Reason (optional)</label>
            <textarea value={voidReason} onChange={e => setVoidReason(e.target.value)} rows={2} placeholder="Enter reason for voiding…" style={{ ...inp, resize: 'none', marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleVoid} disabled={voiding} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 700 }}>{voiding ? 'Voiding…' : 'Confirm Void'}</button>
              <button onClick={() => setVoidSale(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Credit note modal */}
      {creditSale && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 22, width: 360, boxShadow: '0 16px 48px rgba(0,0,0,0.18)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', justifyContent: 'space-between' }}>
              Issue Credit Note <button onClick={() => setCreditSale(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={16} /></button>
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>Bill: <strong>{creditSale.bill_no}</strong></div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Credit Amount (₹) *</label>
            <input type="number" min="0.01" step="0.01" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} placeholder="Amount to credit to customer" style={{ ...inp, marginBottom: 10 }} />
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Notes</label>
            <textarea value={creditNotes} onChange={e => setCreditNotes(e.target.value)} rows={2} placeholder="Optional notes…" style={{ ...inp, resize: 'none', marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleCredit} disabled={crediting} className="btn-orange" style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13 }}>{crediting ? 'Issuing…' : 'Issue Credit Note'}</button>
              <button onClick={() => setCreditSale(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
