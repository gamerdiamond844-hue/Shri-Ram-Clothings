import { useState, useEffect, useCallback, useRef } from 'react';
import {
  RefreshCw, ArrowRightLeft, AlertTriangle, ClipboardList,
  Warehouse, Package, TrendingDown, CheckSquare, Plus, X,
  Search, ChevronDown
} from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

// ── Style constants ──────────────────────────────────────────────────────────
const inp = {
  width: '100%', padding: '8px 12px', fontSize: 13,
  border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none',
  fontFamily: 'inherit', color: '#111827', background: '#fff',
  boxSizing: 'border-box',
};
const labelStyle = {
  fontSize: 11, fontWeight: 600, color: '#6b7280',
  marginBottom: 4, display: 'block',
};
const MODAL_OVERLAY = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
  zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 16,
};
const MODAL_BOX = {
  background: '#fff', borderRadius: 16, padding: 24,
  width: '100%', maxWidth: 480, maxHeight: '90vh',
  overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
};

// ── Movement type config ─────────────────────────────────────────────────────
const MOVEMENT_META = {
  transfer_in:  { label: 'Transfer In',  bg: '#dcfce7', color: '#166534', sign: '+' },
  transfer_out: { label: 'Transfer Out', bg: '#fef9c3', color: '#854d0e', sign: '-' },
  damage:       { label: 'Damage',       bg: '#fee2e2', color: '#991b1b', sign: '-' },
  count:        { label: 'Stock Count',  bg: '#ede9fe', color: '#5b21b6', sign: '~' },
  adjustment:   { label: 'Adjustment',   bg: '#e0f2fe', color: '#075985', sign: '±' },
};

// ── Item search typeahead (debounced) ────────────────────────────────────────
function ItemSearch({ value, onSelect, placeholder = 'Search item by name or SKU…' }) {
  const [query, setQuery]     = useState(value?.title ?? '');
  const [results, setResults] = useState([]);
  const [open, setOpen]       = useState(false);
  const timer                 = useRef(null);
  const wrapRef               = useRef(null);

  // close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback((q) => {
    clearTimeout(timer.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      try {
        const res = await api.get(`/erp/inventory/items?search=${encodeURIComponent(q)}&limit=10`);
        setResults(res.data.items || []);
        setOpen(true);
      } catch { setResults([]); }
    }, 300);
  }, []);

  const handleChange = (e) => {
    setQuery(e.target.value);
    search(e.target.value);
  };

  const handleSelect = (item) => {
    setQuery(item.title);
    setOpen(false);
    onSelect(item);
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
        <input
          value={query}
          onChange={handleChange}
          onFocus={() => results.length && setOpen(true)}
          placeholder={placeholder}
          style={{ ...inp, paddingLeft: 30 }}
        />
      </div>
      {open && results.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.10)', zIndex: 200, maxHeight: 220, overflowY: 'auto', marginTop: 2 }}>
          {results.map(item => (
            <div
              key={item.id}
              onMouseDown={() => handleSelect(item)}
              style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', fontSize: 13 }}
              onMouseEnter={e => e.currentTarget.style.background = '#fff7ed'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <span style={{ fontWeight: 600, color: '#111827' }}>{item.title}</span>
              <span style={{ color: '#9ca3af', fontSize: 11, marginLeft: 8 }}>{item.sku}</span>
              <span style={{ color: '#6b7280', fontSize: 11, marginLeft: 8 }}>Stock: {item.current_stock ?? 0}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Modal wrapper ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }) {
  // prevent body scroll while modal open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);
  return (
    <div style={MODAL_OVERLAY} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={MODAL_BOX}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Warehouse card ───────────────────────────────────────────────────────────
function WarehouseCard({ wh }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Warehouse size={18} color="#f97316" />
          </div>
          <div>
            <div style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>{wh.name}</div>
            {wh.address && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{wh.address}</div>}
          </div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 100, background: wh.is_active ? '#dcfce7' : '#f3f4f6', color: wh.is_active ? '#166534' : '#9ca3af' }}>
          {wh.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>{wh.sku_count ?? 0}</div>
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>SKUs</div>
        </div>
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#111827' }}>{wh.stock_units ?? 0}</div>
          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>Units</div>
        </div>
        <div style={{ background: wh.low_stock_items > 0 ? '#fff7ed' : '#f9fafb', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: wh.low_stock_items > 0 ? '#f97316' : '#111827' }}>{wh.low_stock_items ?? 0}</div>
          <div style={{ fontSize: 10, color: wh.low_stock_items > 0 ? '#f97316' : '#6b7280', marginTop: 2 }}>Low Stock</div>
        </div>
      </div>
    </div>
  );
}

// ── Transfer Modal ───────────────────────────────────────────────────────────
function TransferModal({ warehouses, onClose, onSuccess }) {
  const [form, setForm] = useState({ from_warehouse_id: '', to_warehouse_id: '', quantity: '', notes: '' });
  const [item, setItem] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!item) return toast.error('Please select an item');
    if (!form.from_warehouse_id) return toast.error('Select source warehouse');
    if (!form.to_warehouse_id) return toast.error('Select destination warehouse');
    if (form.from_warehouse_id === form.to_warehouse_id) return toast.error('Source and destination must differ');
    if (!form.quantity || Number(form.quantity) <= 0) return toast.error('Enter a valid quantity');
    setSaving(true);
    try {
      await api.post('/erp/warehouse/transfer', {
        inventory_item_id: item.id,
        from_warehouse_id: Number(form.from_warehouse_id),
        to_warehouse_id: Number(form.to_warehouse_id),
        quantity: Number(form.quantity),
        notes: form.notes,
      });
      toast.success('Stock transferred successfully');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transfer failed');
    } finally { setSaving(false); }
  };

  return (
    <Modal title="Stock Transfer" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>Source Warehouse *</label>
          <select value={form.from_warehouse_id} onChange={e => set('from_warehouse_id', e.target.value)} style={inp} required>
            <option value="">Select source…</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Destination Warehouse *</label>
          <select value={form.to_warehouse_id} onChange={e => set('to_warehouse_id', e.target.value)} style={inp} required>
            <option value="">Select destination…</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Item *</label>
          <ItemSearch value={item} onSelect={setItem} placeholder="Search item by name or SKU…" />
          {item && (
            <div style={{ marginTop: 6, padding: '6px 10px', background: '#fff7ed', borderRadius: 6, fontSize: 12, color: '#92400e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{item.title} <span style={{ color: '#9ca3af' }}>({item.sku})</span></span>
              <button type="button" onClick={() => setItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}><X size={12} /></button>
            </div>
          )}
        </div>
        <div>
          <label style={labelStyle}>Quantity *</label>
          <input type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="Quantity to transfer" style={inp} required />
        </div>
        <div>
          <label style={labelStyle}>Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes…" rows={2} style={{ ...inp, resize: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button type="submit" disabled={saving} className="btn-orange" style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13 }}>
            {saving ? 'Transferring…' : 'Confirm Transfer'}
          </button>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Damage Modal ─────────────────────────────────────────────────────────────
function DamageModal({ warehouses, onClose, onSuccess }) {
  const [form, setForm] = useState({ warehouse_id: '', quantity: '', notes: '' });
  const [item, setItem] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!item) return toast.error('Please select an item');
    if (!form.warehouse_id) return toast.error('Select a warehouse');
    if (!form.quantity || Number(form.quantity) <= 0) return toast.error('Enter a valid quantity');
    setSaving(true);
    try {
      await api.post('/erp/warehouse/damage', {
        inventory_item_id: item.id,
        warehouse_id: Number(form.warehouse_id),
        quantity: Number(form.quantity),
        notes: form.notes,
      });
      toast.success('Damage recorded');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record damage');
    } finally { setSaving(false); }
  };

  return (
    <Modal title="Record Damage / Loss" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>Warehouse *</label>
          <select value={form.warehouse_id} onChange={e => set('warehouse_id', e.target.value)} style={inp} required>
            <option value="">Select warehouse…</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Item *</label>
          <ItemSearch value={item} onSelect={setItem} placeholder="Search item…" />
          {item && (
            <div style={{ marginTop: 6, padding: '6px 10px', background: '#fef2f2', borderRadius: 6, fontSize: 12, color: '#991b1b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{item.title} <span style={{ color: '#9ca3af' }}>({item.sku})</span></span>
              <button type="button" onClick={() => setItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}><X size={12} /></button>
            </div>
          )}
        </div>
        <div>
          <label style={labelStyle}>Damage Quantity *</label>
          <input type="number" min="1" value={form.quantity} onChange={e => set('quantity', e.target.value)} placeholder="Number of units damaged/lost" style={inp} required />
        </div>
        <div>
          <label style={labelStyle}>Reason / Notes *</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Reason for damage or loss…" rows={3} style={{ ...inp, resize: 'none' }} required />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button type="submit" disabled={saving} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            {saving ? 'Saving…' : 'Record Damage'}
          </button>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Stock Count Modal ────────────────────────────────────────────────────────
function StockCountModal({ warehouses, onClose, onSuccess }) {
  const [form, setForm] = useState({ warehouse_id: '', counted_quantity: '', notes: '' });
  const [item, setItem] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!item) return toast.error('Please select an item');
    if (!form.warehouse_id) return toast.error('Select a warehouse');
    if (form.counted_quantity === '' || Number(form.counted_quantity) < 0) return toast.error('Enter a valid counted quantity (0 or more)');
    setSaving(true);
    try {
      await api.post('/erp/warehouse/count', {
        inventory_item_id: item.id,
        warehouse_id: Number(form.warehouse_id),
        counted_quantity: Number(form.counted_quantity),
        notes: form.notes,
      });
      toast.success('Stock count saved');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save stock count');
    } finally { setSaving(false); }
  };

  return (
    <Modal title="Stock Count" onClose={onClose}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>Warehouse *</label>
          <select value={form.warehouse_id} onChange={e => set('warehouse_id', e.target.value)} style={inp} required>
            <option value="">Select warehouse…</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Item *</label>
          <ItemSearch value={item} onSelect={setItem} placeholder="Search item…" />
          {item && (
            <div style={{ marginTop: 6, padding: '6px 10px', background: '#ede9fe', borderRadius: 6, fontSize: 12, color: '#5b21b6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{item.title} <span style={{ color: '#9ca3af' }}>({item.sku})</span> — system: {item.current_stock ?? 0}</span>
              <button type="button" onClick={() => setItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}><X size={12} /></button>
            </div>
          )}
        </div>
        <div>
          <label style={labelStyle}>Physically Counted Quantity *</label>
          <input type="number" min="0" value={form.counted_quantity} onChange={e => set('counted_quantity', e.target.value)} placeholder="Actual count on shelf" style={inp} required />
          {item && form.counted_quantity !== '' && (
            <div style={{ fontSize: 11, marginTop: 4, color: '#6b7280' }}>
              Difference:{' '}
              <span style={{ fontWeight: 700, color: Number(form.counted_quantity) - (item.current_stock ?? 0) >= 0 ? '#166534' : '#991b1b' }}>
                {Number(form.counted_quantity) - (item.current_stock ?? 0) >= 0 ? '+' : ''}{Number(form.counted_quantity) - (item.current_stock ?? 0)}
              </span>
            </div>
          )}
        </div>
        <div>
          <label style={labelStyle}>Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Count reference, batch notes…" rows={2} style={{ ...inp, resize: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button type="submit" disabled={saving} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            {saving ? 'Saving…' : 'Save Count'}
          </button>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Movement Feed ────────────────────────────────────────────────────────────
function MovementFeed({ feed, loading }) {
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 52, borderRadius: 10 }} />
        ))}
      </div>
    );
  }
  if (!feed.length) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af', fontSize: 13 }}>
        No movement events yet.
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {feed.map((ev, i) => {
        const meta = MOVEMENT_META[ev.movement_type] || { label: ev.movement_type, bg: '#f3f4f6', color: '#374151', sign: '' };
        const qty  = Number(ev.quantity ?? 0);
        const date = new Date(ev.created_at);
        const dateStr = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', borderRadius: 10, padding: '10px 14px', border: '1px solid #f3f4f6' }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 100, background: meta.bg, color: meta.color, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {meta.label}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: '#111827', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {ev.title || ev.item_name || 'Unknown Item'}
              </div>
              {ev.reference_id && (
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>Ref: {ev.reference_id}</div>
              )}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: ['transfer_in'].includes(ev.movement_type) ? '#166534' : ['transfer_out', 'damage'].includes(ev.movement_type) ? '#991b1b' : '#374151' }}>
                {meta.sign}{Math.abs(qty)}
              </div>
              <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2, whiteSpace: 'nowrap' }}>{dateStr} · {timeStr}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function AdminWarehouse() {
  const [warehouses,   setWarehouses]   = useState([]);
  const [feed,         setFeed]         = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [feedLoading,  setFeedLoading]  = useState(false);
  const [modal,        setModal]        = useState(null); // 'transfer' | 'damage' | 'count' | null

  // ── Fetch overview ──────────────────────────────────────────────────────────
  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/erp/warehouse/overview');
      setWarehouses(res.data.warehouses || []);
      setFeed(res.data.transfer_feed || []);
    } catch {
      toast.error('Failed to load warehouse data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  // ── Refresh feed only ───────────────────────────────────────────────────────
  const refreshFeed = useCallback(async () => {
    setFeedLoading(true);
    try {
      const res = await api.get('/erp/warehouse/overview');
      setFeed(res.data.transfer_feed || []);
      setWarehouses(res.data.warehouses || []);
    } catch {
      toast.error('Failed to refresh feed');
    } finally {
      setFeedLoading(false);
    }
  }, []);

  const handleModalSuccess = () => {
    setModal(null);
    fetchOverview();
  };

  // ── Summary stats (derived) ─────────────────────────────────────────────────
  const totalSKUs     = warehouses.reduce((s, w) => s + (w.sku_count ?? 0), 0);
  const totalUnits    = warehouses.reduce((s, w) => s + (w.stock_units ?? 0), 0);
  const totalLowStock = warehouses.reduce((s, w) => s + (w.low_stock_items ?? 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setModal('transfer')} className="btn-orange" style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowRightLeft size={14} /> Transfer Stock
          </button>
          <button onClick={() => setModal('damage')} style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, background: '#fef2f2', color: '#ef4444', border: '1.5px solid #fecaca', cursor: 'pointer', fontWeight: 600 }}>
            <AlertTriangle size={14} /> Record Damage
          </button>
          <button onClick={() => setModal('count')} style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, background: '#ede9fe', color: '#7c3aed', border: '1.5px solid #ddd6fe', cursor: 'pointer', fontWeight: 600 }}>
            <ClipboardList size={14} /> Stock Count
          </button>
        </div>
        <button onClick={fetchOverview} disabled={loading} title="Refresh" style={{ padding: '8px 14px', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, background: '#f3f4f6', color: '#374151', border: '1.5px solid #e5e7eb', cursor: 'pointer', fontWeight: 600, opacity: loading ? 0.6 : 1 }}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} /> Refresh
        </button>
      </div>

      {/* ── Summary banner ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { icon: <Package size={18} color="#f97316" />, label: 'Total SKUs',     value: totalSKUs,     bg: '#fff7ed', accent: '#f97316' },
          { icon: <Warehouse size={18} color="#3b82f6" />, label: 'Total Units',  value: totalUnits,    bg: '#eff6ff', accent: '#3b82f6' },
          { icon: <TrendingDown size={18} color="#ef4444" />, label: 'Low Stock', value: totalLowStock, bg: totalLowStock > 0 ? '#fef2f2' : '#f9fafb', accent: totalLowStock > 0 ? '#ef4444' : '#9ca3af' },
        ].map(stat => (
          <div key={stat.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #f3f4f6', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {stat.icon}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>{loading ? '–' : stat.value.toLocaleString('en-IN')}</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Warehouse Cards Grid ── */}
      <div>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12 }}>
          Warehouses ({loading ? '…' : warehouses.length})
        </h2>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 130, borderRadius: 14 }} />
            ))}
          </div>
        ) : warehouses.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: '40px 24px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
            No warehouses found. Create one from Settings → Warehouses.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
            {warehouses.map(wh => <WarehouseCard key={wh.id} wh={wh} />)}
          </div>
        )}
      </div>

      {/* ── Movement Feed ── */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#111827', margin: 0 }}>Movement Feed</h2>
          <button onClick={refreshFeed} disabled={feedLoading} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, background: '#f3f4f6', color: '#374151', border: '1.5px solid #e5e7eb', cursor: 'pointer', fontWeight: 600, opacity: feedLoading ? 0.6 : 1 }}>
            <RefreshCw size={12} style={{ animation: feedLoading ? 'spin 1s linear infinite' : 'none' }} /> Refresh Feed
          </button>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {Object.entries(MOVEMENT_META).map(([key, meta]) => (
            <span key={key} style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: meta.bg, color: meta.color }}>
              {meta.label}
            </span>
          ))}
        </div>

        <MovementFeed feed={feed} loading={loading && feed.length === 0} />
      </div>

      {/* ── Modals ── */}
      {modal === 'transfer' && (
        <TransferModal warehouses={warehouses} onClose={() => setModal(null)} onSuccess={handleModalSuccess} />
      )}
      {modal === 'damage' && (
        <DamageModal warehouses={warehouses} onClose={() => setModal(null)} onSuccess={handleModalSuccess} />
      )}
      {modal === 'count' && (
        <StockCountModal warehouses={warehouses} onClose={() => setModal(null)} onSuccess={handleModalSuccess} />
      )}

      {/* ── Spin animation ── */}
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
