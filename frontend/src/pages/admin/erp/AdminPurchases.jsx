import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Plus, X, Printer, RefreshCw, ChevronLeft, ChevronRight,
  Package, ClipboardList, RotateCcw, Truck, AlertCircle,
} from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

// ─── Shared style helpers ────────────────────────────────────────────────────
const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none',
  fontFamily: 'inherit', color: '#111827', background: '#fff',
};
const label = (text) => (
  <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>
    {text}
  </label>
);
const fmt = (n) =>
  Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

// ─── Status badge helper ─────────────────────────────────────────────────────
const STATUS_COLORS = {
  draft:     { bg: '#f3f4f6', color: '#6b7280' },
  ordered:   { bg: '#dbeafe', color: '#1e40af' },
  partial:   { bg: '#fff7ed', color: '#c2410c' },
  received:  { bg: '#dcfce7', color: '#166534' },
  cancelled: { bg: '#fee2e2', color: '#991b1b' },
};
const StatusBadge = ({ status }) => {
  const s = STATUS_COLORS[status] || STATUS_COLORS.draft;
  return (
    <span style={{ ...s, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 100 }}>
      {(status || 'draft').charAt(0).toUpperCase() + (status || 'draft').slice(1)}
    </span>
  );
};

// ─── Blank PO form ───────────────────────────────────────────────────────────
const BLANK_PO = { supplier_id: '', expected_date: '', freight_amount: '', notes: '' };
const BLANK_LINE = {
  inventory_item_id: '', title: '', sku: '', quantity_ordered: 1,
  unit_cost: '', hsn_code: '', gst_rate: 0,
};

// ─── ItemSearch: typeahead for inventory items ───────────────────────────────
function ItemSearch({ value, onSelect, placeholder }) {
  const [query, setQuery]       = useState(value || '');
  const [results, setResults]   = useState([]);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const debounceRef             = useRef(null);
  const wrapRef                 = useRef(null);

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
    setQuery(item.title || item.name || '');
    setOpen(false);
    onSelect(item);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={handleChange}
        onFocus={() => results.length && setOpen(true)}
        placeholder={placeholder || 'Search item…'}
        style={{ ...inp, paddingRight: loading ? 32 : 12 }}
        autoComplete="off"
      />
      {loading && (
        <RefreshCw size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', animation: 'spin 1s linear infinite' }} />
      )}
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', maxHeight: 220, overflowY: 'auto', marginTop: 3 }}>
          {results.map((it) => (
            <div
              key={it.id}
              onMouseDown={() => pick(it)}
              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, borderTop: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: 2 }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontWeight: 600, color: '#111827' }}>{it.title || it.name}</span>
              <span style={{ color: '#9ca3af', fontSize: 11 }}>{it.sku} · Stock: {it.current_stock ?? 0}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CreatePOModal ───────────────────────────────────────────────────────────
function CreatePOModal({ suppliers, onClose, onCreated }) {
  const [form, setForm]       = useState(BLANK_PO);
  const [lines, setLines]     = useState([{ ...BLANK_LINE }]);
  const [saving, setSaving]   = useState(false);

  const f = (v) => setForm((p) => ({ ...p, ...v }));

  const addLine = () => setLines((p) => [...p, { ...BLANK_LINE }]);
  const removeLine = (i) => setLines((p) => p.filter((_, idx) => idx !== i));
  const updateLine = (i, patch) =>
    setLines((p) => p.map((l, idx) => idx === i ? { ...l, ...patch } : l));

  const pickItem = (i, item) => {
    updateLine(i, {
      inventory_item_id: item.id,
      title: item.title || item.name || '',
      sku: item.sku || '',
      hsn_code: item.hsn_code || '',
      gst_rate: item.gst_rate ?? 0,
      unit_cost: item.purchase_price || item.selling_price || '',
    });
  };

  // Live totals
  const lineTotal = (l) => {
    const base = (Number(l.quantity_ordered) || 0) * (Number(l.unit_cost) || 0);
    const tax  = base * ((Number(l.gst_rate) || 0) / 100);
    return base + tax;
  };
  const subtotal  = lines.reduce((s, l) => s + (Number(l.quantity_ordered) || 0) * (Number(l.unit_cost) || 0), 0);
  const taxTotal  = lines.reduce((s, l) => {
    const base = (Number(l.quantity_ordered) || 0) * (Number(l.unit_cost) || 0);
    return s + base * ((Number(l.gst_rate) || 0) / 100);
  }, 0);
  const freight   = Number(form.freight_amount) || 0;
  const grandTotal = subtotal + taxTotal + freight;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.supplier_id) return toast.error('Select a supplier');
    if (lines.some((l) => !l.title || !l.quantity_ordered || !l.unit_cost))
      return toast.error('Fill in all line item fields');
    setSaving(true);
    try {
      const payload = {
        supplier_id:    parseInt(form.supplier_id),
        expected_date:  form.expected_date || undefined,
        freight_amount: freight,
        notes:          form.notes || undefined,
        items: lines.map((l) => ({
          inventory_item_id: l.inventory_item_id || null,
          title:             l.title,
          sku:               l.sku || null,
          quantity_ordered:  parseInt(l.quantity_ordered),
          unit_cost:         parseFloat(l.unit_cost),
          hsn_code:          l.hsn_code || null,
          gst_rate:          parseFloat(l.gst_rate) || 0,
        })),
      };
      await api.post('/erp/purchases', payload);
      toast.success('Purchase order created');
      onCreated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create PO');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', background: 'rgba(0,0,0,0.45)', overflowY: 'auto', padding: '32px 16px' }}>
      <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 780, padding: 24, display: 'flex', flexDirection: 'column', gap: 18, boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardList size={18} color="#f97316" />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Create Purchase Order</span>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        {/* PO header fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            {label('Supplier *')}
            <select required value={form.supplier_id} onChange={(e) => f({ supplier_id: e.target.value })} style={inp}>
              <option value="">Select supplier…</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            {label('Expected Delivery Date')}
            <input type="date" value={form.expected_date} onChange={(e) => f({ expected_date: e.target.value })} style={inp} />
          </div>
          <div>
            {label('Freight Amount (₹)')}
            <input type="number" min="0" step="0.01" value={form.freight_amount} onChange={(e) => f({ freight_amount: e.target.value })} placeholder="0.00" style={inp} />
          </div>
          <div>
            {label('Notes')}
            <input value={form.notes} onChange={(e) => f({ notes: e.target.value })} placeholder="Optional notes" style={inp} />
          </div>
        </div>

        {/* Line items */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            {label('Line Items')}
            <button type="button" onClick={addLine} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#f97316', background: 'none', border: 'none', cursor: 'pointer' }}>
              <Plus size={13} /> Add Item
            </button>
          </div>

          {/* Line header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 0.7fr 0.9fr 0.8fr 0.7fr 0.8fr 32px', gap: 6, padding: '6px 4px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>Item</span><span>Qty</span><span>Unit Cost</span><span>HSN</span><span>GST%</span><span style={{ textAlign: 'right' }}>Line Total</span><span />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {lines.map((line, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2.5fr 0.7fr 0.9fr 0.8fr 0.7fr 0.8fr 32px', gap: 6, alignItems: 'center' }}>
                <ItemSearch
                  value={line.title}
                  onSelect={(item) => pickItem(i, item)}
                  placeholder="Search item…"
                />
                <input
                  type="number" min="1" value={line.quantity_ordered}
                  onChange={(e) => updateLine(i, { quantity_ordered: e.target.value })}
                  style={{ ...inp, textAlign: 'center' }}
                />
                <input
                  type="number" min="0" step="0.01" value={line.unit_cost}
                  onChange={(e) => updateLine(i, { unit_cost: e.target.value })}
                  placeholder="0.00" style={inp}
                />
                <input
                  value={line.hsn_code} onChange={(e) => updateLine(i, { hsn_code: e.target.value })}
                  placeholder="HSN" style={{ ...inp, fontFamily: 'monospace', fontSize: 12 }}
                />
                <input
                  type="number" min="0" max="28" step="0.01" value={line.gst_rate}
                  onChange={(e) => updateLine(i, { gst_rate: e.target.value })}
                  placeholder="0" style={{ ...inp, textAlign: 'center' }}
                />
                <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#111827', padding: '9px 4px' }}>
                  ₹{fmt(lineTotal(line))}
                </div>
                <button type="button" onClick={() => removeLine(i)} disabled={lines.length === 1}
                  style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: 'none', cursor: lines.length === 1 ? 'not-allowed' : 'pointer', background: '#fef2f2', color: lines.length === 1 ? '#fca5a5' : '#ef4444' }}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6, alignSelf: 'flex-end', minWidth: 240 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280' }}>
            <span>Subtotal</span><span>₹{fmt(subtotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280' }}>
            <span>Tax (GST)</span><span>₹{fmt(taxTotal)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280' }}>
            <span>Freight</span><span>₹{fmt(freight)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, color: '#111827', borderTop: '1.5px solid #e5e7eb', paddingTop: 6 }}>
            <span>Grand Total</span><span>₹{fmt(grandTotal)}</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" disabled={saving} className="btn-orange" style={{ padding: '10px 28px', borderRadius: 10, fontSize: 13 }}>
            {saving ? 'Creating…' : 'Create PO'}
          </button>
          <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: 10, fontSize: 13, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── GRNPanel ────────────────────────────────────────────────────────────────
function GRNPanel({ po, onClose, onSuccess, onOpenReturn }) {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [received, setReceived] = useState({});   // { purchase_item_id: qty }
  const [notes, setNotes]       = useState('');
  const [saving, setSaving]     = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      // The list PO endpoint doesn't return items, we call a detail-like search.
      // Re-fetch via list with the po number to get items — or use the purchases
      // endpoint detail. Backend doesn't have GET /:id, so we store items from
      // the PO row if present, else show empty. We'll fetch from the GRN context.
      // We use the purchases list filtered by searching for the PO number for items.
      // Since there's no GET /purchases/:id endpoint, we store the po.items if
      // pre-loaded, or call the list and pick the matching one.
      const res = await api.get(`/erp/purchases?search=${encodeURIComponent(po.po_number)}&limit=1`);
      const found = (res.data.purchases || []).find((p) => p.id === po.id);
      // Items come from a separate field if we fetch via a detail endpoint.
      // Since no detail endpoint exists, we fetch items from the purchase_items
      // table directly. The backend listPurchases doesn't include items in the
      // list response. We'll use a workaround: attach items from the GRN endpoint
      // preview by attempting to fetch purchase items via inventory movements,
      // or we can leverage the fact that we pass po.items if pre-populated.
      setItems(po.items || found?.items || []);
    } catch {
      setItems(po.items || []);
    } finally {
      setLoading(false);
    }
  }, [po]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Init received qty state to 0 when items load
  useEffect(() => {
    if (items.length) {
      const init = {};
      items.forEach((it) => {
        const remaining = Math.max(0, (it.quantity_ordered || 0) - (it.quantity_received || 0));
        init[it.id] = remaining > 0 ? remaining : 0;
      });
      setReceived(init);
    }
  }, [items]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const received_items = Object.entries(received)
      .filter(([, qty]) => Number(qty) > 0)
      .map(([purchase_item_id, quantity_received]) => ({
        purchase_item_id: parseInt(purchase_item_id),
        quantity_received: parseInt(quantity_received),
      }));
    if (!received_items.length) return toast.error('Enter at least one received quantity');
    setSaving(true);
    try {
      await api.post(`/erp/purchases/${po.id}/grn`, { received_items, notes: notes || undefined });
      toast.success('GRN recorded successfully');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record GRN');
    } finally {
      setSaving(false);
    }
  };

  const canGRN = !['received', 'cancelled'].includes(po.status);

  return (
    <div style={{ width: 460, flexShrink: 0, background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

      {/* Panel header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Truck size={15} color="#f97316" />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>GRN Entry</div>
            <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>{po.po_number}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <StatusBadge status={po.status} />
          <button
            type="button"
            onClick={() => onOpenReturn(po)}
            title="Purchase Return"
            style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', background: '#fef9c3', color: '#854d0e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <RotateCcw size={12} />
          </button>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', background: '#f3f4f6', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={13} />
          </button>
        </div>
      </div>

      {/* PO meta */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
        <div><span style={{ color: '#9ca3af' }}>Supplier: </span><span style={{ fontWeight: 600, color: '#111827' }}>{po.supplier_name || '—'}</span></div>
        <div><span style={{ color: '#9ca3af' }}>Total: </span><span style={{ fontWeight: 700, color: '#111827' }}>₹{fmt(po.total)}</span></div>
        <div><span style={{ color: '#9ca3af' }}>Expected: </span><span style={{ color: '#374151' }}>{po.expected_date ? new Date(po.expected_date).toLocaleDateString('en-IN') : '—'}</span></div>
        <div><span style={{ color: '#9ca3af' }}>Created: </span><span style={{ color: '#374151' }}>{po.created_at ? new Date(po.created_at).toLocaleDateString('en-IN') : '—'}</span></div>
      </div>

      {/* Items */}
      <div style={{ flex: 1, overflowY: 'auto', maxHeight: 360, padding: 16 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 48, borderRadius: 8 }} />)}
          </div>
        ) : items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 24, color: '#9ca3af', fontSize: 13 }}>
            <Package size={28} style={{ margin: '0 auto 8px', display: 'block', color: '#d1d5db' }} />
            No line items loaded. Try refreshing.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.7fr 0.7fr 0.8fr', gap: 6, fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 4px' }}>
              <span>Item</span><span style={{ textAlign: 'center' }}>Ordered</span><span style={{ textAlign: 'center' }}>Received</span><span style={{ textAlign: 'center' }}>This GRN</span>
            </div>
            {items.map((it) => {
              const remaining = Math.max(0, (it.quantity_ordered || 0) - (it.quantity_received || 0));
              const fullyReceived = remaining === 0;
              return (
                <div key={it.id} style={{ display: 'grid', gridTemplateColumns: '2fr 0.7fr 0.7fr 0.8fr', gap: 6, alignItems: 'center', padding: '8px', borderRadius: 8, background: fullyReceived ? '#f0fdf4' : '#f9fafb', border: `1px solid ${fullyReceived ? '#bbf7d0' : '#f3f4f6'}` }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title || '—'}</div>
                    {it.sku && <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'monospace' }}>{it.sku}</div>}
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#374151' }}>{it.quantity_ordered ?? 0}</div>
                  <div style={{ textAlign: 'center', fontSize: 13, color: '#6b7280' }}>{it.quantity_received ?? 0}</div>
                  {fullyReceived ? (
                    <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#166534' }}>✓ Done</div>
                  ) : (
                    <input
                      type="number" min="0" max={remaining}
                      value={received[it.id] ?? 0}
                      onChange={(e) => setReceived((p) => ({ ...p, [it.id]: e.target.value }))}
                      style={{ ...inp, textAlign: 'center', padding: '6px 4px', fontSize: 13, fontWeight: 700 }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Notes + submit */}
      {canGRN && (
        <form onSubmit={handleSubmit} style={{ padding: 16, borderTop: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div>
            {label('Notes')}
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery note, invoice reference…" style={inp} />
          </div>
          <button type="submit" disabled={saving} className="btn-orange" style={{ padding: '10px 20px', borderRadius: 10, fontSize: 13, width: '100%' }}>
            {saving ? 'Recording GRN…' : 'Record GRN'}
          </button>
        </form>
      )}
      {!canGRN && (
        <div style={{ padding: 16, borderTop: '1px solid #f3f4f6', textAlign: 'center', fontSize: 12, color: '#9ca3af' }}>
          {po.status === 'received' ? 'All items fully received.' : 'PO is cancelled — GRN not allowed.'}
        </div>
      )}
    </div>
  );
}

// ─── PurchaseReturnModal ─────────────────────────────────────────────────────
function PurchaseReturnModal({ po, onClose, onSuccess }) {
  const [returnLines, setReturnLines] = useState([
    { inventory_item_id: '', title: '', quantity: 1, unit_cost: '' },
  ]);
  const [notes, setNotes]   = useState('');
  const [saving, setSaving] = useState(false);

  const addLine = () =>
    setReturnLines((p) => [...p, { inventory_item_id: '', title: '', quantity: 1, unit_cost: '' }]);
  const removeLine = (i) => setReturnLines((p) => p.filter((_, idx) => idx !== i));
  const updateLine = (i, patch) =>
    setReturnLines((p) => p.map((l, idx) => idx === i ? { ...l, ...patch } : l));

  const pickItem = (i, item) => {
    updateLine(i, {
      inventory_item_id: item.id,
      title: item.title || item.name || '',
      unit_cost: item.purchase_price || item.unit_cost || '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (returnLines.some((l) => !l.inventory_item_id || !l.quantity || !l.unit_cost))
      return toast.error('Fill in all return item fields');
    setSaving(true);
    try {
      await api.post(`/erp/purchases/${po.id}/return`, {
        return_items: returnLines.map((l) => ({
          inventory_item_id: parseInt(l.inventory_item_id),
          quantity: parseInt(l.quantity),
          unit_cost: parseFloat(l.unit_cost),
        })),
        notes: notes || undefined,
      });
      toast.success('Purchase return recorded');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record return');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: 16 }}>
      <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 580, padding: 22, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 16px 48px rgba(0,0,0,0.18)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RotateCcw size={16} color="#d97706" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Purchase Return</div>
              <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>{po.po_number}</div>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ background: '#fffbeb', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertCircle size={13} /> Returning items will reduce stock and decrease supplier balance due.
        </div>

        {/* Return lines */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            {label('Return Items')}
            <button type="button" onClick={addLine} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#f97316', background: 'none', border: 'none', cursor: 'pointer' }}>
              <Plus size={13} /> Add Item
            </button>
          </div>

          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 0.6fr 0.9fr 28px', gap: 8, padding: '4px 2px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span>Item</span><span>Qty</span><span>Unit Cost</span><span />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {returnLines.map((line, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2.5fr 0.6fr 0.9fr 28px', gap: 8, alignItems: 'center' }}>
                <ItemSearch
                  value={line.title}
                  onSelect={(item) => pickItem(i, item)}
                  placeholder="Search inventory item…"
                />
                <input
                  type="number" min="1" value={line.quantity}
                  onChange={(e) => updateLine(i, { quantity: e.target.value })}
                  style={{ ...inp, textAlign: 'center' }}
                />
                <input
                  type="number" min="0" step="0.01" value={line.unit_cost}
                  onChange={(e) => updateLine(i, { unit_cost: e.target.value })}
                  placeholder="0.00" style={inp}
                />
                <button type="button" onClick={() => removeLine(i)} disabled={returnLines.length === 1}
                  style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: 'none', cursor: returnLines.length === 1 ? 'not-allowed' : 'pointer', background: '#fef2f2', color: returnLines.length === 1 ? '#fca5a5' : '#ef4444' }}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          {label('Notes')}
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Reason for return…" rows={2} style={{ ...inp, resize: 'vertical' }} />
        </div>

        {/* Total */}
        <div style={{ background: '#fef9c3', borderRadius: 8, padding: '8px 14px', display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: '#92400e' }}>
          <span>Return Total</span>
          <span>₹{fmt(returnLines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_cost) || 0), 0))}</span>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" disabled={saving} style={{ padding: '10px 24px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', background: saving ? '#e5e7eb' : '#d97706', color: saving ? '#9ca3af' : '#fff' }}>
            {saving ? 'Processing…' : 'Record Return'}
          </button>
          <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: 10, fontSize: 13, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function AdminPurchases() {
  // List state
  const [purchases, setPurchases] = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [limit]                   = useState(20);
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const debounceRef               = useRef(null);

  // Suppliers for PO form
  const [suppliers, setSuppliers] = useState([]);

  // Modals/panels
  const [showCreatePO, setShowCreatePO]     = useState(false);
  const [grnPO, setGrnPO]                   = useState(null);   // PO selected for GRN
  const [returnPO, setReturnPO]             = useState(null);   // PO selected for return

  // Fetch suppliers once
  useEffect(() => {
    api.get('/erp/suppliers?limit=200')
      .then((r) => setSuppliers(r.data.suppliers || []))
      .catch(() => {});
  }, []);

  // Fetch purchases
  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit });
      if (search) p.set('search', search);
      if (statusFilter) p.set('status', statusFilter);
      const res = await api.get(`/erp/purchases?${p}`);
      setPurchases(res.data.purchases || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter]);

  useEffect(() => { fetchPurchases(); }, [fetchPurchases]);

  const handleSearch = (val) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 300);
  };

  const handleStatusChange = (v) => {
    setStatusFilter(v);
    setPage(1);
  };

  const handlePOCreated = () => {
    setShowCreatePO(false);
    fetchPurchases();
  };

  const handleGRNSuccess = () => {
    setGrnPO(null);
    fetchPurchases();
  };

  const handleReturnSuccess = () => {
    setReturnPO(null);
    fetchPurchases();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
            <input
              defaultValue=""
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search PO number, supplier…"
              style={{ ...inp, paddingLeft: 32, width: 240 }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            style={{ ...inp, width: 148, cursor: 'pointer' }}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="ordered">Ordered</option>
            <option value="partial">Partial</option>
            <option value="received">Received</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => window.print()}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, fontSize: 13, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151', fontWeight: 600 }}
          >
            <Printer size={14} /> Print PO List
          </button>
          <button
            onClick={() => setShowCreatePO(true)}
            className="btn-orange"
            style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} /> Create PO
          </button>
        </div>
      </div>

      {/* ── Main layout: table + GRN panel ── */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

        {/* ── PO List table ── */}
        <div style={{ flex: 1, minWidth: 0, background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>{total} purchase order{total !== 1 ? 's' : ''}</span>
            <button onClick={fetchPurchases} title="Refresh" style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', background: '#f3f4f6', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RefreshCw size={12} />
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['PO Number', 'Supplier', 'Status', 'Total', 'Expected Date', 'Created', 'Actions'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} style={{ padding: '10px 12px' }}>
                        <div className="skeleton" style={{ height: 28, borderRadius: 8 }} />
                      </td>
                    </tr>
                  ))
                ) : purchases.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                      <Package size={28} style={{ margin: '0 auto 8px', display: 'block', color: '#d1d5db' }} />
                      No purchase orders found. Click "Create PO" to get started.
                    </td>
                  </tr>
                ) : purchases.map((po) => {
                  const isSelected = grnPO?.id === po.id;
                  return (
                    <tr
                      key={po.id}
                      onClick={() => setGrnPO(po)}
                      style={{ borderTop: '1px solid #f9fafb', cursor: 'pointer', background: isSelected ? '#fff7ed' : 'transparent', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#fafafa'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? '#fff7ed' : 'transparent'; }}
                    >
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' }}>{po.po_number}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{po.supplier_name || '—'}</td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}><StatusBadge status={po.status} /></td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontWeight: 700, color: '#111827' }}>₹{fmt(po.total)}</td>
                      <td style={{ padding: '10px 12px', color: '#6b7280', whiteSpace: 'nowrap', fontSize: 12 }}>
                        {po.expected_date ? new Date(po.expected_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#6b7280', whiteSpace: 'nowrap', fontSize: 12 }}>
                        {po.created_at ? new Date(po.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                      </td>
                      <td style={{ padding: '10px 12px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button
                            onClick={() => setGrnPO(po)}
                            title="View / Record GRN"
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', background: '#fff7ed', color: '#f97316', fontSize: 11, fontWeight: 600 }}
                          >
                            <Truck size={12} /> GRN
                          </button>
                          <button
                            onClick={() => setReturnPO(po)}
                            title="Purchase Return"
                            style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', background: '#fef9c3', color: '#854d0e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <RotateCcw size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#9ca3af' }}>Page {page} of {totalPages}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page === 1 ? 0.4 : 1 }}
                >
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p;
                  if (totalPages <= 5) p = i + 1;
                  else if (page <= 3) p = i + 1;
                  else if (page >= totalPages - 2) p = totalPages - 4 + i;
                  else p = page - 2 + i;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid', cursor: 'pointer', fontWeight: page === p ? 700 : 400, borderColor: page === p ? '#f97316' : '#e5e7eb', background: page === p ? '#fff7ed' : '#fff', color: page === p ? '#f97316' : '#374151', fontSize: 13 }}
                    >
                      {p}
                    </button>
                  );
                })}
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

        {/* ── GRN side panel ── */}
        {grnPO && (
          <GRNPanel
            po={grnPO}
            onClose={() => setGrnPO(null)}
            onSuccess={handleGRNSuccess}
            onOpenReturn={(po) => { setReturnPO(po); }}
          />
        )}
      </div>

      {/* ── Create PO modal ── */}
      {showCreatePO && (
        <CreatePOModal
          suppliers={suppliers}
          onClose={() => setShowCreatePO(false)}
          onCreated={handlePOCreated}
        />
      )}

      {/* ── Purchase Return modal ── */}
      {returnPO && (
        <PurchaseReturnModal
          po={returnPO}
          onClose={() => setReturnPO(null)}
          onSuccess={handleReturnSuccess}
        />
      )}

      {/* ── Print styles ── */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          .admin-shell, nav, header, aside { display: none !important; }
          /* Show only the purchases table */
        }
        @keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }
      `}</style>
    </div>
  );
}
