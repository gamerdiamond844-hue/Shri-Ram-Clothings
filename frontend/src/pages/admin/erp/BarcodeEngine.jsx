import { useState, useCallback, useRef } from 'react';
import { Search, Printer, RefreshCw, Barcode, Tag } from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

// ── EAN13 encoding tables ──────────────────────────────────────────────────
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
  for (let i = 0; i < 6; i++) bits += (parity[i] === 'L' ? L : G)[full[i + 1]];
  bits += '01010';
  for (let i = 7; i < 13; i++) bits += R[full[i]];
  bits += '101';
  return { bits, digits: full };
}

function BarcodeSVG({ value, width = 120, height = 56 }) {
  if (!value) return null;
  const { bits, digits } = encodeEAN13(value);
  const barW = width / bits.length;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} xmlns="http://www.w3.org/2000/svg">
      {bits.split('').map((b, i) =>
        b === '1' ? <rect key={i} x={i * barW} y={0} width={barW} height={height - 10} fill="#000" /> : null
      )}
      <text x={width / 2} y={height} textAnchor="middle" fontSize="8" fontFamily="monospace" fill="#111">
        {digits.join('')}
      </text>
    </svg>
  );
}

const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none',
  fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box',
};
const lbl = { fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 };

const FORMATS = ['EAN13', 'EAN8', 'UPC-A', 'Code128', 'QR'];

export default function BarcodeEngine() {
  const [title, setTitle]       = useState('');
  const [sku, setSku]           = useState('');
  const [price, setPrice]       = useState('');
  const [barcode, setBarcode]   = useState('');
  const [format, setFormat]     = useState('EAN13');
  const [copies, setCopies]     = useState(1);
  const [searching, setSearching] = useState(false);
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState([]);
  const [open, setOpen]           = useState(false);
  const debounceRef               = useRef(null);
  const wrapRef                   = useRef(null);

  // Inventory item search
  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    setSearching(true);
    try {
      const res = await api.get(`/erp/inventory/items?search=${encodeURIComponent(q)}&limit=10`);
      setResults(res.data.items || []);
      setOpen(true);
    } catch { setResults([]); }
    finally { setSearching(false); }
  }, []);

  const handleQueryChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(v), 280);
  };

  const pickItem = (item) => {
    setTitle(item.title || '');
    setSku(item.sku || '');
    setPrice(item.selling_price || '');
    setBarcode(item.barcode || '');
    setQuery(item.title || '');
    setOpen(false);
  };

  const generateSku = () => {
    const year = new Date().getFullYear();
    const seq = String(Date.now()).slice(-6);
    setSku(`SRC-${year}-${seq}`);
    toast.success('SKU generated');
  };

  const handlePrint = () => {
    if (!title.trim()) return toast.error('Enter a product title');
    if (!barcode.trim()) return toast.error('Enter a barcode value');
    const n = Math.max(1, Math.min(999, Number(copies) || 1));
    setCopies(n);
    setTimeout(() => window.print(), 100);
  };

  const displayBarcode = format === 'EAN13' || format === 'EAN8' || format === 'UPC-A' ? barcode : null;

  // Build N copies for print
  const labelCopies = Array.from({ length: Math.max(1, Math.min(999, Number(copies) || 1)) });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Hidden print area */}
      <div id="barcode-print-area" style={{ display: 'none' }}>
        <style>{`
          @media print {
            body > *:not(#barcode-print-area) { display: none !important; }
            #barcode-print-area { display: block !important; }
            @page { size: 50mm 25mm; margin: 0; }
            .print-label {
              width: 50mm; height: 25mm;
              padding: 2mm; box-sizing: border-box;
              font-family: monospace;
              page-break-after: always;
              overflow: hidden;
            }
            .print-label-title { font-size: 7pt; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 46mm; }
            .print-label-sku   { font-size: 6pt; color: #444; }
            .print-label-price { font-size: 8pt; font-weight: bold; }
            .print-label-barcode svg { width: 44mm !important; height: 14mm !important; }
          }
        `}</style>
        {labelCopies.map((_, i) => (
          <div key={i} className="print-label">
            <div className="print-label-title">{title}</div>
            <div className="print-label-sku">SKU: {sku}</div>
            <div className="print-label-price">₹{price || ''}</div>
            <div className="print-label-barcode">
              {displayBarcode && <BarcodeSVG value={displayBarcode} width={165} height={52} />}
              {!displayBarcode && barcode && <div style={{ fontSize: '7pt', fontFamily: 'monospace', marginTop: 2 }}>{format}: {barcode}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Barcode size={18} color="#f97316" />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Barcode Engine</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Generate barcodes and print 50×25mm labels</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>

        {/* Left: form */}
        <div style={{ flex: 1, minWidth: 280, background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Item search */}
          <div>
            <label style={lbl}>Search Inventory Item (optional)</label>
            <div ref={wrapRef} style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
              {searching && <RefreshCw size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />}
              <input value={query} onChange={handleQueryChange} placeholder="Search by name or SKU…"
                style={{ ...inp, paddingLeft: 30 }} autoComplete="off" />
              {open && results.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: 200, overflowY: 'auto', marginTop: 3 }}>
                  {results.map(item => (
                    <div key={item.id} onMouseDown={() => pickItem(item)}
                      style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, borderTop: '1px solid #f3f4f6' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{item.title}</div>
                      <div style={{ color: '#9ca3af', fontSize: 11 }}>{item.sku} · ₹{item.selling_price ?? 0}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Product title */}
          <div>
            <label style={lbl}>Product Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Product name for label" style={inp} />
          </div>

          {/* SKU with generate button */}
          <div>
            <label style={lbl}>SKU</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={sku} onChange={e => setSku(e.target.value)} placeholder="SRC-2025-000001" style={inp} />
              <button type="button" onClick={generateSku}
                style={{ padding: '0 14px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#f97316', whiteSpace: 'nowrap' }}>
                Auto
              </button>
            </div>
          </div>

          {/* Selling price */}
          <div>
            <label style={lbl}>Selling Price (₹)</label>
            <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" style={inp} />
          </div>

          {/* Barcode value */}
          <div>
            <label style={lbl}>Barcode Value</label>
            <input value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="e.g. 0123456789012" style={{ ...inp, fontFamily: 'monospace' }} />
          </div>

          {/* Format selector */}
          <div>
            <label style={lbl}>Barcode Format</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {FORMATS.map(fmt => (
                <button key={fmt} type="button" onClick={() => setFormat(fmt)}
                  style={{ padding: '6px 12px', borderRadius: 8, border: '1.5px solid', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
                    borderColor: format === fmt ? '#f97316' : '#e5e7eb',
                    background: format === fmt ? '#fff7ed' : '#fff',
                    color: format === fmt ? '#f97316' : '#6b7280' }}>
                  {fmt}
                </button>
              ))}
            </div>
          </div>

          {/* Copies + Print */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', paddingTop: 4 }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Number of Copies (1–999)</label>
              <input type="number" min="1" max="999" value={copies} onChange={e => setCopies(e.target.value)} style={inp} />
            </div>
            <button onClick={handlePrint}
              style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#f97316', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              <Printer size={14} /> Print Labels
            </button>
          </div>
        </div>

        {/* Right: live preview */}
        <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Barcode preview */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 12 }}>Barcode Preview</div>
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, minHeight: 80 }}>
              {barcode && (format === 'EAN13' || format === 'EAN8' || format === 'UPC-A') ? (
                <BarcodeSVG value={barcode} width={220} height={72} />
              ) : barcode ? (
                <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#374151', textAlign: 'center', padding: 16 }}>
                  {format}: {barcode}
                </div>
              ) : (
                <div style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 16 }}>Enter a barcode value to preview</div>
              )}
            </div>
          </div>

          {/* 50×25mm label preview */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Tag size={14} color="#f97316" /> Label Preview (50×25mm)
            </div>
            <div style={{ border: '2px dashed #e5e7eb', borderRadius: 8, padding: 6, background: '#f9fafb' }}>
              <div style={{ width: 200, height: 100, border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', padding: 6, boxSizing: 'border-box', fontFamily: 'monospace', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ fontSize: 8, fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{title || 'Product Name'}</div>
                <div style={{ fontSize: 7, color: '#6b7280' }}>SKU: {sku || '—'}</div>
                <div style={{ fontSize: 9, fontWeight: 700 }}>₹{price || '0.00'}</div>
                {barcode && (format === 'EAN13' || format === 'EAN8' || format === 'UPC-A') ? (
                  <BarcodeSVG value={barcode} width={184} height={36} />
                ) : barcode ? (
                  <div style={{ fontSize: 7, fontFamily: 'monospace', marginTop: 2, color: '#374151' }}>{format}: {barcode}</div>
                ) : null}
              </div>
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6, textAlign: 'center' }}>
              {copies} cop{copies === 1 ? 'y' : 'ies'} will be printed
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
