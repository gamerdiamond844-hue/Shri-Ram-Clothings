import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Plus, X, Printer, RefreshCw, ChevronLeft, ChevronRight,
  RotateCcw, ArrowLeftRight, CreditCard, Banknote, Receipt,
  CheckCircle, AlertCircle, Package,
} from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

// ─── Shared style helpers ────────────────────────────────────────────────────
const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none',
  fontFamily: 'inherit', color: '#111827', background: '#fff',
};
const Lbl = ({ children }) => (
  <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>
    {children}
  </label>
);
const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

// ─── Return type badge ───────────────────────────────────────────────────────
const TYPE_COLORS = {
  refund:       { bg: '#dcfce7', color: '#166534' },
  store_credit: { bg: '#dbeafe', color: '#1e40af' },
  exchange:     { bg: '#fff7ed', color: '#c2410c' },
};
const ReturnBadge = ({ type }) => {
  const s = TYPE_COLORS[type] || TYPE_COLORS.refund;
  const labels = { refund: 'Cash Refund', store_credit: 'Store Credit', exchange: 'Exchange' };
  return (
    <span style={{ ...s, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 100 }}>
      {labels[type] || type}
    </span>
  );
};

// ─── Status badge ────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  completed:  { bg: '#dcfce7', color: '#166534' },
  pending:    { bg: '#fef9c3', color: '#854d0e' },
  cancelled:  { bg: '#fee2e2', color: '#991b1b' },
};
const StatusBadge = ({ status }) => {
  const s = STATUS_COLORS[status] || STATUS_COLORS.pending;
  return (
    <span style={{ ...s, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 100 }}>
      {(status || 'pending').charAt(0).toUpperCase() + (status || 'pending').slice(1)}
    </span>
  );
};

// ─── ItemSearch typeahead (inventory lookup for return/exchange items) ────────
function ItemSearch({ onSelect, placeholder }) {
  const [query, setQuery]     = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef           = useRef(null);
  const wrapRef               = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const res = await api.get(`/erp/inventory/items?search=${encodeURIComponent(q)}&limit=10`);
      setResults(res.data.items || []);
      setOpen(true);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 280);
  };

  const pick = (item) => {
    setQuery(item.title || '');
    setOpen(false);
    onSelect(item);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={handleChange}
        onFocus={() => results.length && setOpen(true)}
        placeholder={placeholder || 'Search inventory item…'}
        style={{ ...inp, paddingRight: loading ? 32 : 12 }}
        autoComplete="off"
      />
      {loading && (
        <RefreshCw size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
      )}
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: 200, overflowY: 'auto', marginTop: 3 }}>
          {results.map((it) => (
            <div
              key={it.id}
              onMouseDown={() => pick(it)}
              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, borderTop: '1px solid #f3f4f6' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ fontWeight: 600, color: '#111827' }}>{it.title}</div>
              <div style={{ color: '#9ca3af', fontSize: 11 }}>{it.sku} · Stock: {it.current_stock ?? 0} · ₹{fmt(it.selling_price)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Credit Note print layout (hidden, rendered via @media print) ────────────
function CreditNotePrint({ returnRecord, returnItems, billNo }) {
  if (!returnRecord) return null;
  return (
    <div id="credit-note-print" style={{ display: 'none' }}>
      <style>{`
        @media print {
          body > *:not(#credit-note-print) { display: none !important; }
          #credit-note-print {
            display: block !important;
            font-family: monospace;
            font-size: 12px;
            width: 280px;
            margin: 0 auto;
            padding: 16px;
          }
          #credit-note-print h2 { font-size: 15px; text-align: center; margin: 0 0 4px; }
          #credit-note-print .cn-sub { text-align: center; font-size: 11px; margin-bottom: 10px; }
          #credit-note-print .cn-row { display: flex; justify-content: space-between; margin: 2px 0; }
          #credit-note-print .cn-divider { border-top: 1px dashed #333; margin: 8px 0; }
          #credit-note-print .cn-total { font-weight: bold; font-size: 13px; }
          @page { size: 80mm auto; margin: 4mm; }
        }
      `}</style>
      <h2>CREDIT NOTE</h2>
      <div className="cn-sub">Shri Ram Clothings</div>
      <div className="cn-divider" />
      <div className="cn-row"><span>Return No:</span><span>{returnRecord.return_no}</span></div>
      {billNo && <div className="cn-row"><span>Bill No:</span><span>{billNo}</span></div>}
      <div className="cn-row"><span>Type:</span><span>{returnRecord.return_type === 'store_credit' ? 'Store Credit' : returnRecord.return_type === 'exchange' ? 'Exchange' : 'Cash Refund'}</span></div>
      <div className="cn-row"><span>Date:</span><span>{new Date(returnRecord.created_at).toLocaleDateString('en-IN')}</span></div>
      <div className="cn-divider" />
      {(returnItems || []).map((it, i) => (
        <div key={i} className="cn-row">
          <span style={{ maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</span>
          <span>{it.quantity} × ₹{fmt(it.unit_price)} = ₹{fmt(Number(it.quantity) * Number(it.unit_price))}</span>
        </div>
      ))}
      <div className="cn-divider" />
      <div className="cn-row cn-total"><span>Total Credit:</span><span>₹{fmt(returnRecord.total_amount)}</span></div>
      <div className="cn-divider" />
      <div className="cn-sub" style={{ marginTop: 6 }}>Thank you for your patronage.</div>
    </div>
  );
}

// ─── Blank item rows ─────────────────────────────────────────────────────────
const BLANK_RETURN_ITEM = { inventory_item_id: '', title: '', sku: '', quantity: 1, unit_price: '' };
const BLANK_EXCH_ITEM   = { inventory_item_id: '', title: '', sku: '', quantity: 1, unit_price: '' };

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminReturns() {
  // ── Bill lookup state ──────────────────────────────────────────────────────
  const [billSearch, setBillSearch]     = useState('');
  const [billResults, setBillResults]   = useState([]);
  const [billLoading, setBillLoading]   = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);

  // ── Return builder state ───────────────────────────────────────────────────
  const [returnType, setReturnType]     = useState('refund'); // refund | store_credit | exchange
  const [returnItems, setReturnItems]   = useState([{ ...BLANK_RETURN_ITEM }]);
  const [exchangeItems, setExchItems]   = useState([{ ...BLANK_EXCH_ITEM }]);
  const [notes, setNotes]               = useState('');
  const [submitting, setSubmitting]     = useState(false);

  // ── Post-submit state (for print) ─────────────────────────────────────────
  const [lastReturn, setLastReturn]     = useState(null);   // returnRecord from API
  const [lastReturnItems, setLastReturnItems] = useState([]);

  // ── Return history state ───────────────────────────────────────────────────
  const [returns, setReturns]     = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [histSearch, setHistSearch] = useState('');
  const [histLoading, setHistLoading] = useState(true);
  const LIMIT = 20;

  // ── Fetch history ──────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: LIMIT });
      if (histSearch) p.set('search', histSearch);
      const res = await api.get(`/erp/returns?${p}`);
      setReturns(res.data.returns || []);
      setTotal(res.data.total || 0);
    } catch { toast.error('Failed to load return history'); }
    finally { setHistLoading(false); }
  }, [page, histSearch]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);
  useEffect(() => { setPage(1); }, [histSearch]);

  // ── Bill lookup ────────────────────────────────────────────────────────────
  const handleBillSearch = async () => {
    if (!billSearch.trim()) return toast.error('Enter a bill number to search');
    setBillLoading(true);
    setBillResults([]);
    setSelectedBill(null);
    try {
      const res = await api.get(`/erp/sales?search=${encodeURIComponent(billSearch.trim())}&limit=5`);
      const bills = res.data.sales || res.data.orders || [];
      if (!bills.length) toast('No bills found for that number', { icon: '🔍' });
      setBillResults(bills);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bill lookup failed');
    } finally {
      setBillLoading(false);
    }
  };

  const selectBill = (bill) => {
    setSelectedBill(bill);
    setBillResults([]);
    // Reset return items when new bill selected
    setReturnItems([{ ...BLANK_RETURN_ITEM }]);
    setExchItems([{ ...BLANK_EXCH_ITEM }]);
    setNotes('');
    setLastReturn(null);
  };

  const clearBill = () => {
    setSelectedBill(null);
    setBillSearch('');
    setBillResults([]);
    setReturnItems([{ ...BLANK_RETURN_ITEM }]);
    setExchItems([{ ...BLANK_EXCH_ITEM }]);
    setNotes('');
    setLastReturn(null);
  };

  // ── Return item row helpers ────────────────────────────────────────────────
  const addReturnItem  = () => setReturnItems((p) => [...p, { ...BLANK_RETURN_ITEM }]);
  const removeReturnItem = (i) => setReturnItems((p) => p.filter((_, idx) => idx !== i));
  const updateReturnItem = (i, patch) =>
    setReturnItems((p) => p.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const pickReturnItem = (i, item) =>
    updateReturnItem(i, {
      inventory_item_id: item.id,
      title: item.title || '',
      sku: item.sku || '',
      unit_price: item.selling_price || '',
    });

  // ── Exchange item row helpers ──────────────────────────────────────────────
  const addExchItem    = () => setExchItems((p) => [...p, { ...BLANK_EXCH_ITEM }]);
  const removeExchItem = (i) => setExchItems((p) => p.filter((_, idx) => idx !== i));
  const updateExchItem = (i, patch) =>
    setExchItems((p) => p.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const pickExchItem = (i, item) =>
    updateExchItem(i, {
      inventory_item_id: item.id,
      title: item.title || '',
      sku: item.sku || '',
      unit_price: item.selling_price || '',
    });

  // ── Totals ─────────────────────────────────────────────────────────────────
  const returnTotal = returnItems.reduce(
    (s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0
  );

  // ── Submit return ──────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBill) return toast.error('Select a bill first');
    if (returnItems.some((it) => !it.inventory_item_id || !it.quantity || !it.unit_price))
      return toast.error('Fill in all return item fields');
    if (returnType === 'exchange' && exchangeItems.some((it) => !it.inventory_item_id || !it.quantity || !it.unit_price))
      return toast.error('Fill in all exchange item fields');

    setSubmitting(true);
    try {
      const payload = {
        original_sale_id: selectedBill.id,
        return_type: returnType,
        items: returnItems.map((it) => ({
          inventory_item_id: parseInt(it.inventory_item_id),
          title: it.title,
          quantity: parseInt(it.quantity),
          unit_price: parseFloat(it.unit_price),
        })),
        ...(returnType === 'exchange' ? {
          exchange_items: exchangeItems.map((it) => ({
            inventory_item_id: parseInt(it.inventory_item_id),
            title: it.title,
            quantity: parseInt(it.quantity),
            unit_price: parseFloat(it.unit_price),
          })),
        } : {}),
        notes: notes || undefined,
      };

      const res = await api.post('/erp/returns', payload);
      const { returnRecord, exchange_sale_id } = res.data;

      toast.success(
        returnType === 'exchange'
          ? `Exchange processed! Draft sale #${exchange_sale_id} created.`
          : returnType === 'store_credit'
          ? 'Store credit issued successfully'
          : 'Cash refund return processed'
      );

      setLastReturn(returnRecord);
      setLastReturnItems(returnItems.map((it) => ({ ...it })));
      fetchHistory();

      // Reset form but keep bill selected so user can print
      setReturnItems([{ ...BLANK_RETURN_ITEM }]);
      setExchItems([{ ...BLANK_EXCH_ITEM }]);
      setNotes('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process return');
    } finally {
      setSubmitting(false);
    }
  };

  const printCreditNote = () => {
    window.print();
  };

  const totalPages = Math.ceil(total / LIMIT);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Hidden credit note for printing */}
      <CreditNotePrint
        returnRecord={lastReturn}
        returnItems={lastReturnItems}
        billNo={selectedBill?.bill_no}
      />

      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RotateCcw size={18} color="#f97316" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Returns & Exchanges</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>Process refunds, store credit, and exchanges</div>
          </div>
        </div>
        {lastReturn && (
          <button
            onClick={printCreditNote}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#f97316', color: '#fff', fontSize: 13, fontWeight: 600 }}
          >
            <Printer size={14} /> Print Credit Note
          </button>
        )}
      </div>

      {/* ── Success Banner ─────────────────────────────────────────────── */}
      {lastReturn && (
        <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <CheckCircle size={18} color="#16a34a" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>
              Return {lastReturn.return_no} processed — ₹{fmt(lastReturn.total_amount)}
              {lastReturn.return_type === 'exchange' ? ' exchange' : lastReturn.return_type === 'store_credit' ? ' store credit issued' : ' cash refund'}
            </div>
            <div style={{ fontSize: 11, color: '#15803d', marginTop: 2 }}>
              Click "Print Credit Note" above to print the credit note for this return.
            </div>
          </div>
          <button onClick={() => setLastReturn(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Bill Lookup Card ───────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Receipt size={15} color="#f97316" /> Step 1 — Find Original Bill
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
            <input
              value={billSearch}
              onChange={(e) => setBillSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBillSearch()}
              placeholder="Enter bill number (e.g. BILL-20240101-001)…"
              style={{ ...inp, paddingLeft: 32 }}
            />
          </div>
          <button
            onClick={handleBillSearch}
            disabled={billLoading}
            style={{ padding: '9px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#f97316', color: '#fff', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', opacity: billLoading ? 0.7 : 1 }}
          >
            {billLoading ? <RefreshCw size={14} style={{ display: 'inline' }} /> : 'Find Bill'}
          </button>
        </div>

        {/* Bill search results */}
        {billResults.length > 0 && !selectedBill && (
          <div style={{ marginTop: 12, border: '1.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
            {billResults.map((bill) => (
              <div
                key={bill.id}
                onClick={() => selectBill(bill)}
                style={{ padding: '10px 14px', cursor: 'pointer', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{bill.bill_no}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                    {bill.customer_name || 'Walk-in'} · {bill.created_at ? new Date(bill.created_at).toLocaleDateString('en-IN') : ''} · Status: {bill.status}
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f97316' }}>₹{fmt(bill.total)}</div>
              </div>
            ))}
          </div>
        )}

        {/* Selected bill info */}
        {selectedBill && (
          <div style={{ marginTop: 12, background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <CheckCircle size={18} color="#f97316" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{selectedBill.bill_no}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>
                  {selectedBill.customer_name || 'Walk-in'} ·
                  {selectedBill.created_at ? ' ' + new Date(selectedBill.created_at).toLocaleDateString('en-IN') : ''} ·
                  {' '}Payment: {selectedBill.payment_method || '—'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f97316' }}>₹{fmt(selectedBill.total)}</div>
              <button onClick={clearBill} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                <X size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Return Builder (only visible after bill selected) ─────────── */}
      {selectedBill && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Step 2 — Return Type */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CreditCard size={15} color="#f97316" /> Step 2 — Return Outcome
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                { key: 'refund',       label: 'Cash Refund',   icon: <Banknote size={14} /> },
                { key: 'store_credit', label: 'Store Credit',  icon: <CreditCard size={14} /> },
                { key: 'exchange',     label: 'Exchange',       icon: <ArrowLeftRight size={14} /> },
              ].map(({ key, label, icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setReturnType(key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    border: returnType === key ? '2px solid #f97316' : '1.5px solid #e5e7eb',
                    background: returnType === key ? '#fff7ed' : '#fff',
                    color: returnType === key ? '#f97316' : '#374151',
                    transition: 'all 0.15s',
                  }}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
            {returnType === 'store_credit' && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#1e40af', background: '#dbeafe', borderRadius: 8, padding: '8px 12px' }}>
                <AlertCircle size={12} style={{ display: 'inline', marginRight: 4 }} />
                Store credit will be automatically added to the customer's account on the original bill.
              </div>
            )}
            {returnType === 'exchange' && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#c2410c', background: '#fff7ed', borderRadius: 8, padding: '8px 12px' }}>
                <AlertCircle size={12} style={{ display: 'inline', marginRight: 4 }} />
                An exchange will create a linked draft sale pre-loaded with replacement items.
              </div>
            )}
          </div>

          {/* Step 3 — Return Items */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Package size={15} color="#f97316" /> Step 3 — Items Being Returned
              </div>
              <button
                type="button"
                onClick={addReturnItem}
                style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#f97316', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <Plus size={13} /> Add Item
              </button>
            </div>

            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 110px 30px', gap: 8, marginBottom: 6 }}>
              {['Item', 'Qty', 'Unit Price', ''].map((h) => (
                <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
              ))}
            </div>

            {returnItems.map((it, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 110px 30px', gap: 8, marginBottom: 8, alignItems: 'start' }}>
                <ItemSearch
                  onSelect={(item) => pickReturnItem(i, item)}
                  placeholder={it.title || 'Search item…'}
                />
                <input
                  type="number" min="1"
                  value={it.quantity}
                  onChange={(e) => updateReturnItem(i, { quantity: e.target.value })}
                  style={{ ...inp }}
                />
                <input
                  type="number" min="0" step="0.01"
                  value={it.unit_price}
                  onChange={(e) => updateReturnItem(i, { unit_price: e.target.value })}
                  placeholder="₹"
                  style={{ ...inp }}
                />
                <button
                  type="button"
                  onClick={() => removeReturnItem(i)}
                  disabled={returnItems.length === 1}
                  style={{ width: 30, height: 38, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: returnItems.length === 1 ? 0.3 : 1 }}
                >
                  <X size={13} />
                </button>
              </div>
            ))}

            <div style={{ marginTop: 10, padding: '10px 14px', background: '#f9fafb', borderRadius: 8, display: 'flex', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                Return Total: ₹{fmt(returnTotal)}
              </span>
            </div>
          </div>

          {/* Step 4 — Exchange Items (only for exchange type) */}
          {returnType === 'exchange' && (
            <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #fed7aa', padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ArrowLeftRight size={15} color="#f97316" /> Step 4 — Replacement Items (Exchange)
                </div>
                <button
                  type="button"
                  onClick={addExchItem}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#f97316', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <Plus size={13} /> Add Item
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 110px 30px', gap: 8, marginBottom: 6 }}>
                {['Replacement Item', 'Qty', 'Unit Price', ''].map((h) => (
                  <div key={h} style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
                ))}
              </div>

              {exchangeItems.map((it, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 110px 30px', gap: 8, marginBottom: 8, alignItems: 'start' }}>
                  <ItemSearch
                    onSelect={(item) => pickExchItem(i, item)}
                    placeholder={it.title || 'Search replacement item…'}
                  />
                  <input
                    type="number" min="1"
                    value={it.quantity}
                    onChange={(e) => updateExchItem(i, { quantity: e.target.value })}
                    style={{ ...inp }}
                  />
                  <input
                    type="number" min="0" step="0.01"
                    value={it.unit_price}
                    onChange={(e) => updateExchItem(i, { unit_price: e.target.value })}
                    placeholder="₹"
                    style={{ ...inp }}
                  />
                  <button
                    type="button"
                    onClick={() => removeExchItem(i)}
                    disabled={exchangeItems.length === 1}
                    style={{ width: 30, height: 38, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: exchangeItems.length === 1 ? 0.3 : 1 }}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}

              <div style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>
                Exchange total: ₹{fmt(exchangeItems.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: 20 }}>
            <Lbl>Notes (optional)</Lbl>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Reason for return, customer notes…"
              style={{ ...inp, resize: 'vertical', minHeight: 60 }}
            />
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="submit"
              disabled={submitting}
              style={{ flex: 1, padding: '11px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#f97316', color: '#fff', fontSize: 14, fontWeight: 700, opacity: submitting ? 0.7 : 1 }}
            >
              {submitting
                ? 'Processing…'
                : returnType === 'exchange'
                ? '🔄 Process Exchange'
                : returnType === 'store_credit'
                ? '💳 Issue Store Credit'
                : '💵 Process Cash Refund'}
            </button>
            <button
              type="button"
              onClick={clearBill}
              style={{ padding: '11px 20px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151' }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Return History Table ───────────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>

        {/* History toolbar */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Return History</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
              <input
                value={histSearch}
                onChange={(e) => setHistSearch(e.target.value)}
                placeholder="Search return or bill no…"
                style={{ ...inp, paddingLeft: 28, width: 220 }}
              />
            </div>
            <button
              onClick={fetchHistory}
              style={{ width: 34, height: 34, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Return No', 'Bill No', 'Type', 'Amount', 'Status', 'Date'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {histLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} style={{ padding: '10px 14px' }}>
                      <div style={{ height: 28, borderRadius: 6, background: '#f3f4f6', animation: 'pulse 1.5s ease-in-out infinite' }} />
                    </td>
                  </tr>
                ))
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                    No returns found. Process a return above to get started.
                  </td>
                </tr>
              ) : returns.map((r) => (
                <tr
                  key={r.id}
                  style={{ borderTop: '1px solid #f9fafb' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#fafafa'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>{r.return_no}</td>
                  <td style={{ padding: '10px 14px', color: '#6b7280', whiteSpace: 'nowrap' }}>{r.bill_no || '—'}</td>
                  <td style={{ padding: '10px 14px' }}><ReturnBadge type={r.return_type} /></td>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>₹{fmt(r.total_amount)}</td>
                  <td style={{ padding: '10px 14px' }}><StatusBadge status={r.status} /></td>
                  <td style={{ padding: '10px 14px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                    {r.created_at ? new Date(r.created_at).toLocaleDateString('en-IN') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: '#9ca3af' }}>{total} returns</span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page === 1 ? 0.4 : 1 }}
              >
                <ChevronLeft size={14} />
              </button>
              <span style={{ padding: '0 8px', color: '#6b7280' }}>{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page === totalPages ? 0.4 : 1 }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
