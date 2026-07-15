import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Plus, X, Pencil, Trash2, Download, Upload, Package,
  AlertTriangle, ChevronLeft, ChevronRight, History, Sliders,
  Printer, BarChart2, FileSpreadsheet
} from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

// ── Style constants ───────────────────────────────────────────────────────────
const inp = {
  width: '100%', padding: '8px 12px', fontSize: 13,
  border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none',
  fontFamily: 'inherit', color: '#111827', background: '#fff',
  boxSizing: 'border-box',
};
const labelStyle = { fontSize: 11, fontWeight: 600, color: '#6b7280', marginBottom: 4, display: 'block' };

// ── EAN13 SVG Barcode (inline, no library) ────────────────────────────────────
const L = ['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
const G = ['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
const R = ['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'];
const PARITY = ['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];

function encodeEAN13(raw) {
  const s = String(raw ?? '').replace(/\D/g, '').padStart(12, '0').slice(0, 12);
  const d = s.split('').map(Number);
  const sum = d.reduce((acc, v, i) => acc + v * (i % 2 === 0 ? 1 : 3), 0);
  const check = (10 - (sum % 10)) % 10;
  const full = [...d, check];
  const first = full[0];
  const parity = PARITY[first];
  let bits = '101';
  for (let i = 0; i < 6; i++) {
    const enc = parity[i] === 'L' ? L : G;
    bits += enc[full[i + 1]];
  }
  bits += '01010';
  for (let i = 7; i < 13; i++) bits += R[full[i]];
  bits += '101';
  return { bits, digits: full, first };
}

function BarcodeSVG({ value, width = 110, height = 54 }) {
  if (!value) return null;
  const { bits, digits } = encodeEAN13(value);
  const barW = width / bits.length;
  const bars = [];
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') {
      bars.push(<rect key={i} x={i * barW} y={0} width={barW} height={height - 10} fill="#000" />);
    }
  }
  const digitStr = digits.join('');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} xmlns="http://www.w3.org/2000/svg">
      {bars}
      <text x={width / 2} y={height} textAnchor="middle" fontSize="8" fontFamily="monospace" fill="#111">
        {digitStr}
      </text>
    </svg>
  );
}

// ── Label for print (hidden in screen, shown in print) ────────────────────────
function PrintLabel({ item }) {
  if (!item) return null;
  return (
    <div id="erp-print-label" style={{ display: 'none' }}>
      <style>{`
        @media print {
          body > *:not(#erp-print-label) { display: none !important; }
          #erp-print-label {
            display: block !important;
            width: 50mm; height: 25mm;
            padding: 2mm;
            font-family: monospace;
            box-sizing: border-box;
            page-break-after: always;
          }
          #erp-print-label .lbl-title {
            font-size: 7pt; font-weight: bold;
            overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
            max-width: 100%;
          }
          #erp-print-label .lbl-sku { font-size: 6pt; color: #444; }
          #erp-print-label .lbl-price { font-size: 8pt; font-weight: bold; }
          #erp-print-label .lbl-barcode svg { width: 44mm; height: 12mm; }
          @page { size: 50mm 25mm; margin: 0; }
        }
      `}</style>
      <div className="lbl-title">{item.title}</div>
      <div className="lbl-sku">SKU: {item.sku}</div>
      <div className="lbl-price">₹{item.selling_price ?? ''}</div>
      <div className="lbl-barcode"><BarcodeSVG value={item.barcode} width={165} height={45} /></div>
    </div>
  );
}

// ── Blank form state ──────────────────────────────────────────────────────────
const blankForm = {
  title: '', category: '', brand_id: '', supplier_id: '', sku: '', barcode: '',
  hsn_code: '', gst_rate: '', variant_size: '', variant_color: '',
  purchase_price: '', selling_price: '', mrp: '', reorder_level: '',
  warehouse_id: '', rack_code: '', shelf_code: '', expiry_date: '',
  current_stock: '', notes: '',
};

const LIMIT_OPTIONS = [10, 20, 50];

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminInventory() {
  // list state
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // suppliers/warehouses/brands for dropdowns
  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [brands, setBrands] = useState([]);

  // slide-in form
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [saving, setSaving] = useState(false);

  // movement history drawer
  const [movItem, setMovItem] = useState(null);
  const [movements, setMovements] = useState([]);
  const [movLoading, setMovLoading] = useState(false);

  // stock adjustment panel
  const [adjItem, setAdjItem] = useState(null);
  const [adjDelta, setAdjDelta] = useState('');
  const [adjNotes, setAdjNotes] = useState('');
  const [adjSaving, setAdjSaving] = useState(false);

  // import panel
  const [showImport, setShowImport] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const fileRef = useRef();

  // barcode preview item
  const [barcodeItem, setBarcodeItem] = useState(null);
  // label print item
  const [printItem, setPrintItem] = useState(null);

  const totalPages = Math.ceil(total / limit);

  // ── Fetch inventory items ───────────────────────────────────────────────────
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit });
      if (search) p.set('search', search);
      if (lowStockOnly) p.set('low_stock', 'true');
      const res = await api.get(`/erp/inventory/items?${p}`);
      setItems(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch { toast.error('Failed to load inventory'); }
    finally { setLoading(false); }
  }, [page, limit, search, lowStockOnly]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useEffect(() => { setPage(1); }, [search, lowStockOnly, limit]);

  // ── Load suppliers and warehouses once ─────────────────────────────────────
  useEffect(() => {
    api.get('/erp/suppliers').then(r => setSuppliers(r.data.suppliers || [])).catch(() => {});
    api.get('/erp/warehouses').then(r => setWarehouses(r.data.warehouses || [])).catch(() => {});
    api.get('/erp/brands?active=true').then(r => setBrands(r.data.brands || [])).catch(() => {});
  }, []);

  // ── Open add / edit form ────────────────────────────────────────────────────
  const openAdd = () => {
    setEditItem(null);
    setForm(blankForm);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({
      title: item.title || '',
      category: item.category || '',
      brand_id: item.brand_id || '',
      supplier_id: item.supplier_id || '',
      sku: item.sku || '',
      barcode: item.barcode || '',
      hsn_code: item.hsn_code || '',
      gst_rate: item.gst_rate ?? '',
      variant_size: item.variant_size || '',
      variant_color: item.variant_color || '',
      purchase_price: item.purchase_price ?? '',
      selling_price: item.selling_price ?? '',
      mrp: item.mrp ?? '',
      reorder_level: item.reorder_level ?? '',
      warehouse_id: item.warehouse_id || '',
      rack_code: item.rack_code || '',
      shelf_code: item.shelf_code || '',
      expiry_date: item.expiry_date ? item.expiry_date.slice(0, 10) : '',
      current_stock: item.current_stock ?? '',
      notes: item.notes || '',
    });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditItem(null); setForm(blankForm); };

  const setF = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  // ── Submit add / edit ───────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    setSaving(true);
    try {
      const payload = { ...form };
      // Coerce numeric fields
      ['gst_rate','purchase_price','selling_price','mrp','reorder_level','current_stock'].forEach(k => {
        if (payload[k] === '') payload[k] = null;
        else if (payload[k] !== null) payload[k] = Number(payload[k]);
      });
      ['supplier_id','warehouse_id','brand_id'].forEach(k => {
        if (payload[k] === '') payload[k] = null;
      });
      if (payload.expiry_date === '') payload.expiry_date = null;

      if (editItem) {
        await api.put(`/erp/inventory/items/${editItem.id}`, payload);
        toast.success('Item updated');
      } else {
        await api.post('/erp/inventory/items', payload);
        toast.success('Item created');
      }
      closeForm();
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save item');
    } finally { setSaving(false); }
  };

  // ── Soft delete ─────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Archive this item?')) return;
    try {
      await api.delete(`/erp/inventory/items/${id}`);
      toast.success('Item archived');
      fetchItems();
    } catch { toast.error('Failed to archive item'); }
  };

  // ── Movement history ────────────────────────────────────────────────────────
  const openMovements = async (item) => {
    setMovItem(item);
    setMovLoading(true);
    try {
      const res = await api.get(`/erp/inventory/items/${item.id}/movements`);
      setMovements(res.data.movements || []);
    } catch { toast.error('Failed to load movements'); }
    finally { setMovLoading(false); }
  };

  // ── Stock adjustment ────────────────────────────────────────────────────────
  const openAdj = (item) => { setAdjItem(item); setAdjDelta(''); setAdjNotes(''); };

  const handleAdjust = async (e) => {
    e.preventDefault();
    if (!adjDelta) return toast.error('Enter a quantity delta');
    setAdjSaving(true);
    try {
      await api.post('/erp/inventory/adjust', {
        inventory_item_id: adjItem.id,
        quantity_delta: Number(adjDelta),
        notes: adjNotes,
      });
      toast.success('Stock adjusted');
      setAdjItem(null);
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Adjustment failed');
    } finally { setAdjSaving(false); }
  };

  // ── Import ──────────────────────────────────────────────────────────────────
  const handleImport = async () => {
    if (!importFile) return toast.error('Select a file first');
    setImportLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      const res = await api.post('/erp/inventory/import', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResults(res.data);
      toast.success(`Imported ${res.data.imported} rows`);
      fetchItems();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed');
    } finally { setImportLoading(false); }
  };

  // ── Excel export ────────────────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      const res = await api.get('/erp/inventory/export', { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch { toast.error('Export failed'); }
  };

  // ── Label print ─────────────────────────────────────────────────────────────
  const handlePrint = (item) => {
    setPrintItem(item);
    setTimeout(() => window.print(), 150);
  };

  // ── Barcode preview modal ───────────────────────────────────────────────────
  const openBarcode = (item) => setBarcodeItem(item);

  // ── Movement type colour ────────────────────────────────────────────────────
  const movTypeColor = (t) => ({
    sale: '#ef4444', purchase: '#22c55e', adjustment: '#f97316',
    opening: '#6366f1', transfer_out: '#f59e0b', transfer_in: '#10b981',
    damage: '#dc2626', count: '#8b5cf6', return: '#14b8a6',
  }[t] || '#6b7280');

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>

      {/* Hidden print label */}
      {printItem && <PrintLabel item={printItem} />}

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search title / SKU / barcode…"
              style={{ ...inp, paddingLeft: 30, width: 230 }} />
          </div>

          {/* Low-stock toggle */}
          <button onClick={() => setLowStockOnly(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
              borderColor: lowStockOnly ? '#f97316' : '#e5e7eb',
              background: lowStockOnly ? '#fff7ed' : '#fff',
              color: lowStockOnly ? '#f97316' : '#6b7280' }}>
            <AlertTriangle size={13} /> Low Stock
          </button>

          {/* Items per page */}
          <select value={limit} onChange={e => setLimit(Number(e.target.value))}
            style={{ ...inp, width: 80, padding: '7px 10px' }}>
            {LIMIT_OPTIONS.map(o => <option key={o} value={o}>{o} / page</option>)}
          </select>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => { setShowImport(true); setImportResults(null); setImportFile(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>
            <Upload size={13} /> Import
          </button>
          <button onClick={handleExport}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>
            <FileSpreadsheet size={13} /> Export
          </button>
          <button onClick={openAdd} className="btn-orange"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
            <Plus size={15} /> Add Item
          </button>
        </div>
      </div>

      {/* ── Items Table ── */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Item','SKU','Barcode','Stock','Reorder','Price','GST%','Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}><td colSpan={8} style={{ padding: '10px 12px' }}>
                    <div className="skeleton" style={{ height: 28, borderRadius: 6 }} />
                  </td></tr>
                ))
              ) : items.map(item => {
                const lowStock = Number(item.current_stock) <= Number(item.reorder_level);
                return (
                  <tr key={item.id} style={{ borderTop: '1px solid #f9fafb' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                    {/* Item name + category */}
                    <td style={{ padding: '9px 12px', minWidth: 160 }}>
                      <div style={{ fontWeight: 600, color: '#111827', marginBottom: 2, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                      {item.category && <div style={{ fontSize: 11, color: '#9ca3af' }}>{item.category}</div>}
                      {item.brand && <div style={{ fontSize: 11, color: '#6b7280' }}>{item.brand}</div>}
                      {(item.variant_size || item.variant_color) && (
                        <div style={{ fontSize: 11, color: '#6b7280' }}>
                          {[item.variant_size, item.variant_color].filter(Boolean).join(' / ')}
                        </div>
                      )}
                    </td>

                    {/* SKU */}
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                      <code style={{ fontSize: 11, background: '#f3f4f6', padding: '2px 6px', borderRadius: 4, color: '#374151' }}>{item.sku || '—'}</code>
                    </td>

                    {/* Barcode */}
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                      <button onClick={() => openBarcode(item)} title="Preview barcode"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', fontSize: 11, fontWeight: 600 }}>
                        <BarChart2 size={12} /> {item.barcode ? item.barcode.slice(0, 8) + '…' : '—'}
                      </button>
                    </td>

                    {/* Stock */}
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700,
                        color: lowStock ? '#ea580c' : '#111827' }}>
                        {lowStock && <AlertTriangle size={12} />}
                        {item.current_stock ?? 0}
                        {lowStock && (
                          <span style={{ fontSize: 10, fontWeight: 700, background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', padding: '1px 6px', borderRadius: 100 }}>
                            LOW
                          </span>
                        )}
                      </span>
                    </td>

                    {/* Reorder level */}
                    <td style={{ padding: '9px 12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{item.reorder_level ?? 0}</td>

                    {/* Selling price */}
                    <td style={{ padding: '9px 12px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 700, color: '#111827' }}>₹{item.selling_price ?? '—'}</span>
                      {item.mrp && Number(item.mrp) > Number(item.selling_price) && (
                        <span style={{ fontSize: 10, color: '#9ca3af', textDecoration: 'line-through', marginLeft: 4 }}>₹{item.mrp}</span>
                      )}
                    </td>

                    {/* GST */}
                    <td style={{ padding: '9px 12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{item.gst_rate != null ? `${item.gst_rate}%` : '—'}</td>

                    {/* Actions */}
                    <td style={{ padding: '9px 12px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => openAdj(item)} title="Adjust Stock"
                          style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Sliders size={12} />
                        </button>
                        <button onClick={() => openMovements(item)} title="Movement History"
                          style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <History size={12} />
                        </button>
                        <button onClick={() => handlePrint(item)} title="Print Label"
                          style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', background: '#faf5ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Printer size={12} />
                        </button>
                        <button onClick={() => openEdit(item)} title="Edit"
                          style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', background: '#fff7ed', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => handleDelete(item.id)} title="Archive"
                          style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && !items.length && (
                <tr><td colSpan={8} style={{ padding: '52px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                  <Package size={36} style={{ margin: '0 auto 12px', color: '#d1d5db' }} />
                  <div>No inventory items found.</div>
                  <div style={{ fontSize: 11, marginTop: 4 }}>Click "Add Item" to get started.</div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: '#9ca3af' }}>{total} items</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page === 1 ? 0.4 : 1 }}>
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pg = totalPages <= 5 ? i + 1 : Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button key={pg} onClick={() => setPage(pg)}
                    style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      borderColor: pg === page ? '#f97316' : '#e5e7eb',
                      background: pg === page ? '#fff7ed' : '#fff',
                      color: pg === page ? '#f97316' : '#374151' }}>
                    {pg}
                  </button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page === totalPages ? 0.4 : 1 }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          SLIDE-IN FORM PANEL (Add / Edit Item)
      ════════════════════════════════════════════════════════════════════ */}
      {showForm && (
        <>
          {/* Backdrop */}
          <div onClick={closeForm} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200 }} />

          {/* Panel */}
          <div style={{
            position: 'fixed', top: 0, right: 0, height: '100vh', width: 480, maxWidth: '95vw',
            background: '#fff', boxShadow: '-4px 0 32px rgba(0,0,0,0.18)', zIndex: 201,
            overflowY: 'auto', padding: 24, boxSizing: 'border-box',
            animation: 'slideInRight 0.22s ease',
          }}>
            <style>{`@keyframes slideInRight { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
                {editItem ? 'Edit Inventory Item' : 'Add New Item'}
              </span>
              <button onClick={closeForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Row helper */}
              {/* Title */}
              <div>
                <label style={labelStyle}>Title *</label>
                <input required value={form.title} onChange={e => setF('title', e.target.value)} placeholder="Product title" style={inp} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Category</label>
                  <input value={form.category} onChange={e => setF('category', e.target.value)} placeholder="e.g. Shirts" style={inp} />
                </div>
                <div>
                  <label style={labelStyle}>Brand</label>
                  <select value={form.brand_id} onChange={e => setF('brand_id', e.target.value)} style={inp}>
                    <option value="">Select brand</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>{brand.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Supplier</label>
                <select value={form.supplier_id} onChange={e => setF('supplier_id', e.target.value)} style={inp}>
                  <option value="">Select supplier</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>SKU <span style={{ fontWeight: 400 }}>(auto-generated if blank)</span></label>
                  <input value={form.sku} onChange={e => setF('sku', e.target.value)} placeholder="SRC-2025-0000001" style={inp} />
                </div>
                <div>
                  <label style={labelStyle}>Barcode <span style={{ fontWeight: 400 }}>(EAN13 auto)</span></label>
                  <input value={form.barcode} onChange={e => setF('barcode', e.target.value)} placeholder="0000000000000" style={inp} />
                </div>
              </div>

              {/* Barcode preview inline */}
              {form.barcode && (
                <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <BarcodeSVG value={form.barcode} width={110} height={48} />
                  <span style={{ fontSize: 11, color: '#6b7280' }}>EAN13 preview</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>HSN Code</label>
                  <input value={form.hsn_code} onChange={e => setF('hsn_code', e.target.value)} placeholder="e.g. 5208" style={inp} />
                </div>
                <div>
                  <label style={labelStyle}>GST Rate (%)</label>
                  <input type="number" min="0" max="100" value={form.gst_rate} onChange={e => setF('gst_rate', e.target.value)} placeholder="5 / 12 / 18 / 28" style={inp} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Variant Size</label>
                  <input value={form.variant_size} onChange={e => setF('variant_size', e.target.value)} placeholder="S / M / L / XL" style={inp} />
                </div>
                <div>
                  <label style={labelStyle}>Variant Color</label>
                  <input value={form.variant_color} onChange={e => setF('variant_color', e.target.value)} placeholder="Red / Blue…" style={inp} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Purchase Price (₹)</label>
                  <input type="number" min="0" step="0.01" value={form.purchase_price} onChange={e => setF('purchase_price', e.target.value)} placeholder="0.00" style={inp} />
                </div>
                <div>
                  <label style={labelStyle}>Selling Price (₹)</label>
                  <input type="number" min="0" step="0.01" value={form.selling_price} onChange={e => setF('selling_price', e.target.value)} placeholder="0.00" style={inp} />
                </div>
                <div>
                  <label style={labelStyle}>MRP (₹)</label>
                  <input type="number" min="0" step="0.01" value={form.mrp} onChange={e => setF('mrp', e.target.value)} placeholder="0.00" style={inp} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>{editItem ? 'Reorder Level' : 'Opening Stock'}</label>
                  <input type="number" min="0" value={editItem ? form.reorder_level : form.current_stock}
                    onChange={e => setF(editItem ? 'reorder_level' : 'current_stock', e.target.value)}
                    placeholder="0" style={inp} />
                </div>
                {editItem && (
                  <div>
                    <label style={labelStyle}>Current Stock <span style={{ fontWeight: 400 }}>(read-only)</span></label>
                    <input readOnly value={editItem.current_stock ?? 0} style={{ ...inp, background: '#f9fafb', color: '#6b7280' }} />
                  </div>
                )}
                {!editItem && (
                  <div>
                    <label style={labelStyle}>Reorder Level</label>
                    <input type="number" min="0" value={form.reorder_level} onChange={e => setF('reorder_level', e.target.value)} placeholder="0" style={inp} />
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Warehouse</label>
                <select value={form.warehouse_id} onChange={e => setF('warehouse_id', e.target.value)} style={inp}>
                  <option value="">Select warehouse</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Rack Code</label>
                  <input value={form.rack_code} onChange={e => setF('rack_code', e.target.value)} placeholder="R-01" style={inp} />
                </div>
                <div>
                  <label style={labelStyle}>Shelf Code</label>
                  <input value={form.shelf_code} onChange={e => setF('shelf_code', e.target.value)} placeholder="S-03" style={inp} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Expiry Date</label>
                <input type="date" value={form.expiry_date} onChange={e => setF('expiry_date', e.target.value)} style={inp} />
              </div>

              <div>
                <label style={labelStyle}>Notes</label>
                <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} rows={2} placeholder="Optional notes…" style={{ ...inp, resize: 'vertical' }} />
              </div>

              {/* Submit */}
              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button type="submit" disabled={saving} className="btn-orange"
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 14, fontWeight: 700 }}>
                  {saving ? 'Saving…' : editItem ? 'Update Item' : 'Create Item'}
                </button>
                <button type="button" onClick={closeForm}
                  style={{ padding: '10px 20px', borderRadius: 10, fontSize: 13, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          MOVEMENT HISTORY DRAWER
      ════════════════════════════════════════════════════════════════════ */}
      {movItem && (
        <>
          <div onClick={() => setMovItem(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200 }} />
          <div style={{
            position: 'fixed', top: 0, right: 0, height: '100vh', width: 440, maxWidth: '95vw',
            background: '#fff', boxShadow: '-4px 0 32px rgba(0,0,0,0.18)', zIndex: 201,
            overflowY: 'auto', padding: 24, boxSizing: 'border-box',
            animation: 'slideInRight 0.22s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Movement History</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{movItem.title} — {movItem.sku}</div>
              </div>
              <button onClick={() => setMovItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            {/* Current stock badge */}
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 16px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Package size={18} color="#f97316" />
              <div>
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>CURRENT STOCK</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', lineHeight: 1 }}>{movItem.current_stock ?? 0}</div>
              </div>
            </div>

            {movLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 52, borderRadius: 8, marginBottom: 8 }} />
              ))
            ) : movements.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px 0', fontSize: 13 }}>No movement records found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {movements.map(m => (
                  <div key={m.id} style={{ background: '#f9fafb', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: movTypeColor(m.movement_type) + '22', color: movTypeColor(m.movement_type) }}>
                        {m.movement_type.replace('_', ' ').toUpperCase()}
                      </span>
                      {m.notes && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{m.notes}</div>}
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>
                        {new Date(m.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 70 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: Number(m.quantity) >= 0 ? '#16a34a' : '#dc2626' }}>
                        {Number(m.quantity) >= 0 ? '+' : ''}{m.quantity}
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>Bal: {m.balance_after}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          STOCK ADJUSTMENT MODAL
      ════════════════════════════════════════════════════════════════════ */}
      {adjItem && (
        <>
          <div onClick={() => setAdjItem(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: '#fff', borderRadius: 16, padding: 28, width: 380, maxWidth: '94vw',
            boxShadow: '0 8px 48px rgba(0,0,0,0.18)', zIndex: 301,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Manual Stock Adjustment</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{adjItem.title}</div>
              </div>
              <button onClick={() => setAdjItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {/* Current stock */}
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: '10px 14px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Sliders size={16} color="#f97316" />
              <div>
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>CURRENT STOCK</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#111827' }}>{adjItem.current_stock ?? 0} units</div>
              </div>
            </div>

            <form onSubmit={handleAdjust} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Quantity Delta <span style={{ fontWeight: 400 }}>(use negative to decrease)</span></label>
                <input
                  type="number"
                  value={adjDelta}
                  onChange={e => setAdjDelta(e.target.value)}
                  placeholder="e.g. +10 or -5"
                  style={inp}
                  autoFocus
                />
                {adjDelta && (
                  <div style={{ fontSize: 12, marginTop: 5, color: Number(adjDelta) >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                    New stock will be: {(Number(adjItem.current_stock ?? 0) + Number(adjDelta))}
                  </div>
                )}
              </div>
              <div>
                <label style={labelStyle}>Reason / Notes</label>
                <textarea value={adjNotes} onChange={e => setAdjNotes(e.target.value)} rows={2} placeholder="Reason for adjustment…" style={{ ...inp, resize: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button type="submit" disabled={adjSaving} className="btn-orange"
                  style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 14, fontWeight: 700 }}>
                  {adjSaving ? 'Saving…' : 'Apply Adjustment'}
                </button>
                <button type="button" onClick={() => setAdjItem(null)}
                  style={{ padding: '10px 20px', borderRadius: 10, fontSize: 13, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          IMPORT PANEL (CSV / Excel)
      ════════════════════════════════════════════════════════════════════ */}
      {showImport && (
        <>
          <div onClick={() => setShowImport(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: '#fff', borderRadius: 16, padding: 28, width: 480, maxWidth: '95vw',
            boxShadow: '0 8px 48px rgba(0,0,0,0.18)', zIndex: 301,
            maxHeight: '80vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Import Inventory (CSV / Excel)</div>
              <button onClick={() => setShowImport(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            {/* Template hint */}
            <div style={{ background: '#eff6ff', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#2563eb', marginBottom: 16 }}>
              <strong>Required columns:</strong> title, selling_price<br />
              <strong>Optional:</strong> sku, barcode, category, purchase_price, mrp, current_stock, reorder_level, gst_rate, hsn_code, variant_size, variant_color
            </div>

            {/* File input */}
            <div
              onClick={() => fileRef.current?.click()}
              style={{ border: '2px dashed #e5e7eb', borderRadius: 12, padding: '24px', textAlign: 'center', cursor: 'pointer', background: '#f9fafb', marginBottom: 16 }}>
              <Upload size={28} color="#9ca3af" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>
                {importFile ? importFile.name : 'Click to select CSV or Excel file'}
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>.csv, .xlsx, .xls — max 10MB</div>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }}
                onChange={e => { setImportFile(e.target.files[0] || null); setImportResults(null); }} />
            </div>

            <button onClick={handleImport} disabled={importLoading || !importFile}
              className="btn-orange"
              style={{ width: '100%', padding: '10px 0', borderRadius: 10, fontSize: 14, fontWeight: 700, marginBottom: 16, opacity: importLoading || !importFile ? 0.6 : 1 }}>
              {importLoading ? 'Uploading…' : 'Upload & Import'}
            </button>

            {/* Results */}
            {importResults && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: '#111827' }}>
                  Import Results: <span style={{ color: '#16a34a' }}>{importResults.imported} imported</span>
                  {importResults.errors?.length > 0 && <span style={{ color: '#dc2626', marginLeft: 8 }}>{importResults.errors.length} errors</span>}
                </div>
                {importResults.errors?.length > 0 && (
                  <div style={{ background: '#fef2f2', borderRadius: 8, padding: 12, maxHeight: 200, overflowY: 'auto' }}>
                    {importResults.errors.map((err, i) => (
                      <div key={i} style={{ fontSize: 12, color: '#dc2626', padding: '3px 0', borderBottom: '1px solid #fee2e2' }}>
                        <strong>Row {err.row}:</strong> {err.message}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          BARCODE PREVIEW MODAL
      ════════════════════════════════════════════════════════════════════ */}
      {barcodeItem && (
        <>
          <div onClick={() => setBarcodeItem(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 300 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: '#fff', borderRadius: 16, padding: 28, width: 320, maxWidth: '94vw',
            boxShadow: '0 8px 48px rgba(0,0,0,0.18)', zIndex: 301, textAlign: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Barcode Preview</div>
              <button onClick={() => setBarcodeItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 12px', display: 'inline-block', marginBottom: 14 }}>
              <BarcodeSVG value={barcodeItem.barcode} width={200} height={80} />
            </div>

            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}><strong>EAN13:</strong> {barcodeItem.barcode}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}><strong>SKU:</strong> {barcodeItem.sku}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 16 }}>{barcodeItem.title}</div>

            {/* 50×25mm label preview box */}
            <div style={{ border: '2px dashed #e5e7eb', borderRadius: 8, padding: 8, marginBottom: 16, background: '#f9fafb' }}>
              <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 6, textAlign: 'left' }}>50×25mm Label Preview</div>
              <div style={{ width: 160, height: 80, border: '1px solid #d1d5db', borderRadius: 4, margin: '0 auto', padding: 4, background: '#fff', boxSizing: 'border-box', textAlign: 'left' }}>
                <div style={{ fontSize: 8, fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{barcodeItem.title}</div>
                <div style={{ fontSize: 7, color: '#6b7280' }}>SKU: {barcodeItem.sku}</div>
                <div style={{ fontSize: 9, fontWeight: 700 }}>₹{barcodeItem.selling_price ?? ''}</div>
                <BarcodeSVG value={barcodeItem.barcode} width={148} height={32} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button
                onClick={() => { setBarcodeItem(null); handlePrint(barcodeItem); }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: '#f97316', color: '#fff', border: 'none', cursor: 'pointer' }}>
                <Printer size={14} /> Print Label
              </button>
              <button onClick={() => setBarcodeItem(null)}
                style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>
                Close
              </button>
            </div>
          </div>
        </>
      )}

    </div> /* end root div */
  );
}
