import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, X, ShoppingCart, Trash2, Plus, Minus,
  CreditCard, Wallet, Banknote, QrCode, CheckSquare,
  Gift, Building2, ScanLine, Printer, RotateCcw,
  ChevronDown, ChevronUp, CheckCircle2, Clock,
} from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

/* ── shared input style ── */
const inp = {
  width: '100%', padding: '8px 10px', fontSize: 13,
  border: '1.5px solid #e5e7eb', borderRadius: 8,
  outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff',
};

const PAYMENT_METHODS = [
  { key: 'cash',         label: 'Cash',         Icon: Banknote    },
  { key: 'upi',          label: 'UPI',           Icon: QrCode      },
  { key: 'card',         label: 'Card',          Icon: CreditCard  },
  { key: 'wallet',       label: 'Wallet',        Icon: Wallet      },
  { key: 'cheque',       label: 'Cheque',        Icon: CheckSquare },
  { key: 'gift_card',    label: 'Gift Card',     Icon: Gift        },
  { key: 'store_credit', label: 'Store Credit',  Icon: Building2   },
  { key: 'bank',         label: 'Bank',          Icon: Building2   },
];

/* ── print styles injected once ── */
const PRINT_STYLE = `@media print {
  body * { visibility: hidden !important; }
  #pos-invoice, #pos-invoice * { visibility: visible !important; }
  #pos-invoice { position: fixed !important; left: 0; top: 0; width: 80mm; background: #fff !important; }
}`;

export default function AdminPos() {
  /* ── state ── */
  const [search, setSearch]             = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [cart, setCart]                 = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [splitPayments, setSplitPayments] = useState([{ method: 'cash', amount: '' }]);
  const [isSplitMode, setIsSplitMode]   = useState(false);
  const [amountEntered, setAmountEntered] = useState('');
  const [overview, setOverview]         = useState(null);
  const [customerId, setCustomerId]     = useState(null);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [showCustomerMenu, setShowCustomerMenu] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });
  const [holds, setHolds]               = useState([]);
  const [showHolds, setShowHolds]       = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [saving, setSaving]             = useState(false);
  const [searching, setSearching]       = useState(false);

  const searchRef   = useRef(null);
  const debounceRef = useRef(null);

  /* ── cart calculations ── */
  const subtotal      = cart.reduce((s, i) => s + i.line_total, 0);
  const discountTotal = cart.reduce((s, i) => s + (i.discount || 0), 0);
  const taxTotal      = cart.reduce((s, i) => s + ((i.line_total * (i.gst_rate || 0)) / 100), 0);
  const grandTotal    = subtotal - discountTotal + taxTotal;
  const roundOff      = 0;
  const grandFinal    = grandTotal + roundOff;

  /* ── load overview ── */
  const loadOverview = useCallback(async () => {
    try {
      const res = await api.get('/erp/pos/overview');
      setOverview(res.data);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  /* ── search ── */
  const doSearch = useCallback(async (q) => {
    if (!q || q.length < 1) { setSearchResults([]); setShowDropdown(false); return; }
    setSearching(true);
    try {
      const res = await api.get(`/erp/pos/search?q=${encodeURIComponent(q)}`);
      setSearchResults(res.data.products || []);
      setShowDropdown(true);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  }, []);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 400);
  };

  const resetCustomer = () => {
    setCustomerId(null);
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setCustomerQuery('');
  };

  const selectCustomer = (customer) => {
    setCustomerId(customer.id);
    setCustomerName(customer.name || 'Walk-in Customer');
    setCustomerPhone(customer.phone || '');
    setShowCustomerMenu(false);
  };

  const visibleCustomers = (overview?.customers || []).filter((customer) => {
    const query = customerQuery.trim().toLowerCase();
    if (!query) return true;
    return [customer.name, customer.phone, customer.customer_code]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  });

  const createCustomer = async () => {
    if (!newCustomer.name.trim()) return toast.error('Customer name is required');
    setSaving(true);
    try {
      const res = await api.post('/erp/customers', newCustomer);
      const created = res.data;
      setOverview((prev) => ({
        ...prev,
        customers: [created, ...(prev?.customers || [])].slice(0, 12),
      }));
      selectCustomer(created);
      setCustomerModalOpen(false);
      setNewCustomer({ name: '', phone: '', email: '' });
      toast.success('Customer created');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create customer');
    } finally {
      setSaving(false);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      clearTimeout(debounceRef.current);
      doSearch(search);
    }
  };

  /* ── add to cart ── */
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id
          ? { ...i, quantity: i.quantity + 1, line_total: (i.quantity + 1) * i.unit_price }
          : i
        );
      }
      const unitPrice = parseFloat(product.selling_price || product.price || product.unit_price || 0);
      return [...prev, {
        id: product.id,
        inventory_item_id: product.inventory_item_id || product.id,
        title: product.title || product.name,
        sku: product.sku || '',
        quantity: 1,
        unit_price: unitPrice,
        discount: 0,
        gst_rate: product.gst_rate || 0,
        line_total: unitPrice,
      }];
    });
    setSearch('');
    setShowDropdown(false);
    setSearchResults([]);
  };

  /* ── update cart row ── */
  const updateCart = (id, field, value) => {
    setCart(prev => prev.map(i => {
      if (i.id !== id) return i;
      const updated = { ...i, [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        updated.line_total = (updated.quantity || 0) * (updated.unit_price || 0);
      }
      return updated;
    }));
  };

  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));

  /* ── hold bill ── */
  const holdBill = async () => {
    if (!cart.length) return toast.error('Cart is empty');
    try {
      const res = await api.post('/erp/pos/hold', {
        cart_payload: cart,
        customer_name: customerName,
        total: grandFinal,
      });
      toast.success(`Bill held: ${res.data.hold_code}`);
      setCart([]);
      resetCustomer();
      loadOverview();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to hold bill');
    }
  };

  /* ── load holds ── */
  const loadHolds = async () => {
    try {
      const res = await api.get('/erp/pos/holds');
      setHolds(res.data.holds || []);
      setShowHolds(true);
    } catch {
      toast.error('Failed to load held bills');
    }
  };

  /* ── resume hold ── */
  const resumeHold = async (holdCode) => {
    try {
      const res = await api.post(`/erp/pos/holds/${holdCode}/resume`);
      const payload = res.data.cart_payload;
      if (Array.isArray(payload)) setCart(payload);
      setCustomerName(res.data.customer_name || 'Walk-in Customer');
      setCustomerId(null);
      setShowHolds(false);
      toast.success('Bill resumed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resume bill');
    }
  };

  /* ── delete hold ── */
  const deleteHold = async (holdCode) => {
    if (!window.confirm('Delete this held bill?')) return;
    try {
      await api.delete(`/erp/pos/holds/${holdCode}`);
      setHolds(prev => prev.filter(h => h.hold_code !== holdCode));
      toast.success('Hold deleted');
      loadOverview();
    } catch {
      toast.error('Failed to delete hold');
    }
  };

  /* ── split payment helpers ── */
  const addSplitRow = () => setSplitPayments(prev => [...prev, { method: 'cash', amount: '' }]);
  const updateSplitRow = (idx, field, val) => setSplitPayments(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  const removeSplitRow = (idx) => setSplitPayments(prev => prev.filter((_, i) => i !== idx));

  const splitTotal = splitPayments.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const splitValid = Math.abs(splitTotal - grandFinal) < 0.01;

  /* ── change due ── */
  const amountPaid  = parseFloat(amountEntered) || 0;
  const changeDue   = amountPaid - grandFinal;

  /* ── complete sale ── */
  const completeSale = async () => {
    if (!cart.length) return toast.error('Cart is empty');
    if (isSplitMode && !splitValid) return toast.error(`Split total ₹${splitTotal.toFixed(2)} does not match grand total ₹${grandFinal.toFixed(2)}`);
    setSaving(true);
    try {
      const res = await api.post('/erp/pos/sale', {
        items: cart.map(i => ({
          inventory_item_id: i.inventory_item_id,
          title: i.title,
          sku: i.sku,
          quantity: i.quantity,
          unit_price: i.unit_price,
          tax_amount: (i.line_total * (i.gst_rate || 0)) / 100,
          discount_amount: i.discount || 0,
          line_total: i.line_total,
        })),
        payment_method: paymentMethod,
        split_payment: isSplitMode ? splitPayments : [],
        customer_id: customerId || null,
        discount_amount: discountTotal,
        tax_amount: taxTotal,
        round_off: roundOff,
        total: grandFinal,
      });
      /* play success beep */
      try { new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAA==').play(); } catch {}
      const saleData = { ...res.data, items: cart };
      setCompletedSale(saleData);
      setCart([]);
      setAmountEntered('');
      toast.success(`Sale completed: ${res.data.bill_no}`);
      loadOverview();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Sale failed');
    } finally { setSaving(false); }
  };

  /* ── fmt ── */
  const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /* ─────────────────── RENDER ─────────────────── */
  return (
    <div style={{ fontFamily: 'inherit', color: '#111827', position: 'relative' }}>

      {/* Print styles */}
      <style>{PRINT_STYLE}</style>

      {/* ── Holds modal ── */}
      {showHolds && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowHolds(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: 480, maxHeight: '70vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Held Bills</span>
              <button onClick={() => setShowHolds(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
            </div>
            {holds.length === 0
              ? <p style={{ color: '#9ca3af', fontSize: 13, textAlign: 'center', padding: 24 }}>No held bills</p>
              : holds.map(h => (
                <div key={h.hold_code} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{h.hold_code}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{h.customer_name} — {fmt(h.total)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => resumeHold(h.hold_code)} style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: '#fff7ed', color: '#f97316' }}>Resume</button>
                    <button onClick={() => deleteHold(h.hold_code)} style={{ padding: '5px 10px', borderRadius: 8, fontSize: 12, border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#f87171' }}><Trash2 size={12} /></button>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* ── Completed sale invoice overlay ── */}
      {completedSale && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div id="pos-invoice" style={{ background: '#fff', borderRadius: 16, padding: 28, width: 360, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 17, color: '#111827' }}>Shri Ram Clothings</div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Tax Invoice</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
              <span>Bill #: <strong style={{ color: '#111827' }}>{completedSale.bill_no}</strong></span>
              <span>{new Date().toLocaleDateString('en-IN')}</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '4px 0', color: '#6b7280', fontWeight: 600 }}>Item</th>
                  <th style={{ textAlign: 'right', padding: '4px 0', color: '#6b7280', fontWeight: 600 }}>Qty</th>
                  <th style={{ textAlign: 'right', padding: '4px 0', color: '#6b7280', fontWeight: 600 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(completedSale.items || []).map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f9fafb' }}>
                    <td style={{ padding: '5px 0' }}>{item.title}</td>
                    <td style={{ textAlign: 'right', padding: '5px 0' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right', padding: '5px 0' }}>{fmt(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ borderTop: '1.5px solid #e5e7eb', paddingTop: 10, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280', marginBottom: 4 }}>
                <span>Subtotal</span><span>{fmt(completedSale.items?.reduce((s,i) => s + i.line_total, 0))}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15, marginTop: 8 }}>
                <span>Grand Total</span><span style={{ color: '#f97316' }}>{fmt(completedSale.sale?.total || completedSale.total)}</span>
              </div>
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              <button onClick={() => window.print()} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#f97316', color: '#fff', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Printer size={14} /> Print Invoice
              </button>
              <button onClick={() => setCompletedSale(null)} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: '1.5px solid #e5e7eb', cursor: 'pointer', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13 }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ MAIN LAYOUT ══════════════ */}
      {customerModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 250, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 24, width: 420, maxWidth: 'calc(100% - 32px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Create new customer</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>Add a customer to the POS billing flow.</div>
              </div>
              <button onClick={() => setCustomerModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {['name', 'phone', 'email'].map((field) => (
                <div key={field}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5, textTransform: 'capitalize' }}>{field}</label>
                  <input
                    value={newCustomer[field]}
                    onChange={(e) => setNewCustomer((prev) => ({ ...prev, [field]: e.target.value }))}
                    style={inp}
                    placeholder={field === 'phone' ? 'Mobile number' : field === 'email' ? 'Email address' : 'Full name'}
                  />
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <button onClick={() => setCustomerModalOpen(false)} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer' }}>Cancel</button>
                <button onClick={createCustomer} disabled={saving} style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer' }}>
                  {saving ? 'Saving…' : 'Create customer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>

        {/* ════════ LEFT PANEL ════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* ── Search ── */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: 16, display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Customer</div>
                  <div style={{ marginTop: 4, fontSize: 15, fontWeight: 700, color: '#111827' }}>{customerName}</div>
                  {customerPhone && <div style={{ fontSize: 12, color: '#6b7280' }}>{customerPhone}</div>}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <button onClick={() => setShowCustomerMenu((prev) => !prev)}
                    style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 13 }}>
                    {customerId ? 'Change customer' : 'Select customer'}
                  </button>
                  <button onClick={() => { setCustomerModalOpen(true); setShowCustomerMenu(false); }}
                    style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer', fontSize: 13 }}>
                    New customer
                  </button>
                  {customerId && (
                    <button onClick={resetCustomer}
                      style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', color: '#ef4444', cursor: 'pointer', fontSize: 13 }}>
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {showCustomerMenu && (
                <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff', padding: 12 }}>
                  <input
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    placeholder="Search recent customers..."
                    style={{ ...inp, marginBottom: 10 }}
                  />
                  {visibleCustomers.length === 0 ? (
                    <div style={{ fontSize: 13, color: '#9ca3af', padding: 12 }}>No matching customers.</div>
                  ) : (
                    <div style={{ display: 'grid', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                      {visibleCustomers.map((customer) => (
                        <button key={customer.id} onClick={() => selectCustomer(customer)}
                          style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, border: '1px solid #f3f4f6', background: '#f9fafb', cursor: 'pointer', textAlign: 'left' }}>
                          <div>
                            <div style={{ fontWeight: 600, color: '#111827' }}>{customer.name}</div>
                            <div style={{ fontSize: 11, color: '#6b7280' }}>{customer.phone || customer.email || 'No phone/email'}</div>
                          </div>
                          <div style={{ fontSize: 11, color: '#4b5563' }}>{customer.customer_code || 'NA'}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <ScanLine size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
              <input
                ref={searchRef}
                value={search}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search by name, SKU or scan barcode (Enter)…"
                style={{ ...inp, paddingLeft: 34, paddingRight: search ? 30 : 10 }}
              />
              {search && (
                <button onClick={() => { setSearch(''); setShowDropdown(false); setSearchResults([]); }}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}>
                  <X size={13} />
                </button>
              )}
            </div>
            {/* Search results dropdown */}
            {showDropdown && searchResults.length > 0 && (
              <div style={{ marginTop: 6, border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', background: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
                {searchResults.map(p => (
                  <button key={p.id} onClick={() => addToCart(p)}
                    style={{ width: '100%', padding: '10px 14px', border: 'none', borderBottom: '1px solid #f9fafb', background: 'transparent', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fff7ed'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#111827' }}>{p.title || p.name}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>SKU: {p.sku || '—'} · Stock: {p.stock ?? '—'}</div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#f97316', whiteSpace: 'nowrap' }}>{fmt(p.selling_price || p.price || p.unit_price)}</div>
                  </button>
                ))}
              </div>
            )}
            {showDropdown && !searching && searchResults.length === 0 && search.length > 0 && (
              <div style={{ marginTop: 6, padding: '10px 14px', fontSize: 13, color: '#9ca3af', border: '1px solid #e5e7eb', borderRadius: 10, background: '#fff' }}>No products found</div>
            )}
          </div>

          {/* ── Cart ── */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 14 }}>
                <ShoppingCart size={16} style={{ color: '#f97316' }} /> Cart
                {cart.length > 0 && <span style={{ background: '#f97316', color: '#fff', borderRadius: 100, fontSize: 11, fontWeight: 700, padding: '1px 7px' }}>{cart.length}</span>}
              </div>
              {cart.length > 0 && (
                <button onClick={() => { if (window.confirm('Clear cart?')) setCart([]); }}
                  style={{ fontSize: 11, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Trash2 size={12} /> Clear All
                </button>
              )}
            </div>

            {cart.length === 0
              ? <div style={{ padding: 40, textAlign: 'center', color: '#d1d5db', fontSize: 13 }}>
                  <ShoppingCart size={32} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                  <div>Search or scan a product to add it to the cart</div>
                </div>
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        {['Product', 'Qty', 'Unit Price', 'Discount', 'Line Total', ''].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map(item => (
                        <tr key={item.id} style={{ borderTop: '1px solid #f9fafb' }}>
                          <td style={{ padding: '8px 12px', maxWidth: 160 }}>
                            <div style={{ fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                            <div style={{ fontSize: 10, color: '#9ca3af' }}>{item.sku}</div>
                          </td>
                          <td style={{ padding: '8px 8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <button onClick={() => updateCart(item.id, 'quantity', Math.max(1, item.quantity - 1))}
                                style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}><Minus size={10} /></button>
                              <input type="number" min={1} value={item.quantity}
                                onChange={e => updateCart(item.id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                                style={{ width: 40, textAlign: 'center', padding: '3px 4px', fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none' }} />
                              <button onClick={() => updateCart(item.id, 'quantity', item.quantity + 1)}
                                style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}><Plus size={10} /></button>
                            </div>
                          </td>
                          <td style={{ padding: '8px 8px' }}>
                            <input type="number" min={0} value={item.unit_price}
                              onChange={e => updateCart(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                              style={{ width: 80, padding: '4px 6px', fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none' }} />
                          </td>
                          <td style={{ padding: '8px 8px' }}>
                            <input type="number" min={0} value={item.discount}
                              onChange={e => updateCart(item.id, 'discount', parseFloat(e.target.value) || 0)}
                              style={{ width: 70, padding: '4px 6px', fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none' }} />
                          </td>
                          <td style={{ padding: '8px 12px', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmt(item.line_total)}</td>
                          <td style={{ padding: '8px 8px' }}>
                            <button onClick={() => removeFromCart(item.id)} style={{ width: 26, height: 26, borderRadius: 7, border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <X size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }

            {/* Cart totals */}
            {cart.length > 0 && (
              <div style={{ padding: '12px 16px', borderTop: '1.5px solid #f3f4f6', background: '#fafafa' }}>
                <div style={{ display: 'grid', gap: 4, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}><span>Discount</span><span style={{ color: '#22c55e' }}>-{fmt(discountTotal)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}><span>Tax (GST)</span><span>{fmt(taxTotal)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}><span>Round Off</span><span>{fmt(roundOff)}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 16, marginTop: 6, paddingTop: 8, borderTop: '1.5px solid #e5e7eb', color: '#111827' }}>
                    <span>Grand Total</span><span style={{ color: '#f97316' }}>{fmt(grandFinal)}</span>
                  </div>
                </div>
                {/* Hold / Resume buttons */}
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button onClick={holdBill} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Clock size={14} /> Hold Bill
                  </button>
                  <button onClick={loadHolds} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <RotateCcw size={14} /> Resume Bill
                  </button>
                </div>
              </div>
            )}
            {cart.length === 0 && (
              <div style={{ padding: '10px 16px 14px', borderTop: '1px solid #f3f4f6' }}>
                <button onClick={loadHolds} style={{ width: '100%', padding: '9px 0', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <RotateCcw size={14} /> Resume Held Bill
                </button>
              </div>
            )}
          </div>

          {/* ── Recent Sales ── */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Recent Sales</div>
              <div style={{ display: 'flex', gap: 10, fontSize: 12 }}>
                <span style={{ color: '#6b7280' }}>Today: <strong style={{ color: '#111827' }}>{overview?.metrics?.bills_today ?? '—'}</strong> bills</span>
                <span style={{ color: '#6b7280' }}>On hold: <strong style={{ color: '#f97316' }}>{overview?.metrics?.hold_count ?? '—'}</strong></span>
              </div>
            </div>
            {(!overview?.recent_sales || overview.recent_sales.length === 0)
              ? <div style={{ padding: 24, textAlign: 'center', color: '#d1d5db', fontSize: 13 }}>No sales yet today</div>
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        {['Bill #', 'Time', 'Items', 'Payment', 'Total', 'Status'].map(h => (
                          <th key={h} style={{ textAlign: 'left', padding: '7px 12px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(overview.recent_sales || []).slice(0, 8).map((sale, idx) => (
                        <tr key={sale.id || idx} style={{ borderTop: '1px solid #f9fafb' }}>
                          <td style={{ padding: '7px 12px', fontWeight: 600 }}>{sale.bill_no || '—'}</td>
                          <td style={{ padding: '7px 12px', color: '#6b7280' }}>{sale.created_at ? new Date(sale.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                          <td style={{ padding: '7px 12px', color: '#6b7280' }}>{sale.item_count ?? '—'}</td>
                          <td style={{ padding: '7px 12px', color: '#6b7280', textTransform: 'capitalize' }}>{sale.payment_method || '—'}</td>
                          <td style={{ padding: '7px 12px', fontWeight: 700 }}>{fmt(sale.total)}</td>
                          <td style={{ padding: '7px 12px' }}>
                            <span style={{ padding: '2px 8px', borderRadius: 100, fontSize: 10, fontWeight: 600, background: sale.status === 'completed' ? '#dcfce7' : '#fef9c3', color: sale.status === 'completed' ? '#166534' : '#854d0e' }}>
                              {sale.status || 'completed'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
          </div>

        </div>{/* end LEFT PANEL */}

        {/* ════════ RIGHT PANEL — PAYMENT ════════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 0 }}>

          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Payment</div>

            {/* Grand total display */}
            <div style={{ background: 'linear-gradient(135deg,#fff7ed,#ffedd5)', borderRadius: 12, padding: '14px 16px', marginBottom: 14, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Grand Total</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#f97316' }}>{fmt(grandFinal)}</div>
              {cart.length > 0 && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{cart.length} item{cart.length !== 1 ? 's' : ''} in cart</div>}
            </div>

            {/* Payment method buttons */}
            {!isSplitMode && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                {PAYMENT_METHODS.map(({ key, label, Icon }) => (
                  <button key={key} onClick={() => setPaymentMethod(key)}
                    style={{ padding: '9px 6px', borderRadius: 10, border: `1.5px solid ${paymentMethod === key ? '#f97316' : '#e5e7eb'}`, background: paymentMethod === key ? '#fff7ed' : '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: paymentMethod === key ? '#f97316' : '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all 0.15s' }}>
                    <Icon size={13} /> {label}
                  </button>
                ))}
              </div>
            )}

            {/* Split payment toggle */}
            <button onClick={() => setIsSplitMode(m => !m)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: isSplitMode ? '#f0fdf4' : '#f9fafb', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: isSplitMode ? '#16a34a' : '#374151', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {isSplitMode ? <CheckCircle2 size={14} style={{ color: '#16a34a' }} /> : <ChevronDown size={14} />}
                Split Payment
              </span>
              {isSplitMode ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {/* Split payment rows */}
            {isSplitMode && (
              <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {splitPayments.map((row, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <select value={row.method} onChange={e => updateSplitRow(idx, 'method', e.target.value)}
                      style={{ flex: 1, ...inp, padding: '6px 8px' }}>
                      {PAYMENT_METHODS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                    </select>
                    <input type="number" min={0} placeholder="₹0" value={row.amount}
                      onChange={e => updateSplitRow(idx, 'amount', e.target.value)}
                      style={{ width: 80, ...inp, padding: '6px 8px' }} />
                    {splitPayments.length > 1 && (
                      <button onClick={() => removeSplitRow(idx)} style={{ width: 26, height: 26, borderRadius: 7, border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <X size={11} />
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={addSplitRow} style={{ width: '100%', padding: '6px 0', borderRadius: 8, border: '1.5px dashed #e5e7eb', background: 'transparent', cursor: 'pointer', fontSize: 12, color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                  <Plus size={12} /> Add method
                </button>
                <div style={{ fontSize: 12, textAlign: 'right', color: splitValid ? '#16a34a' : '#f87171', fontWeight: 600 }}>
                  Entered: {fmt(splitTotal)} {splitValid ? '✓' : `(need ${fmt(grandFinal)})`}
                </div>
              </div>
            )}

            {/* Amount entered / change */}
            {!isSplitMode && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Amount Received (₹)</label>
                <input
                  type="number"
                  min={0}
                  placeholder={`Min ${fmt(grandFinal)}`}
                  value={amountEntered}
                  onChange={e => setAmountEntered(e.target.value)}
                  style={{ ...inp }}
                />
                {amountEntered !== '' && (
                  <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: changeDue >= 0 ? '#f0fdf4' : '#fef2f2', display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 600 }}>
                    <span style={{ color: '#6b7280' }}>{changeDue >= 0 ? 'Change Due' : 'Balance Due'}</span>
                    <span style={{ color: changeDue >= 0 ? '#16a34a' : '#ef4444' }}>{fmt(Math.abs(changeDue))}</span>
                  </div>
                )}
              </div>
            )}

            {/* Complete sale button */}
            <button
              onClick={completeSale}
              disabled={saving || !cart.length || (isSplitMode && !splitValid)}
              style={{ width: '100%', padding: '13px 0', borderRadius: 12, border: 'none', cursor: saving || !cart.length ? 'not-allowed' : 'pointer', background: saving || !cart.length ? '#f3f4f6' : '#f97316', color: saving || !cart.length ? '#9ca3af' : '#fff', fontSize: 15, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background 0.15s' }}>
              {saving ? 'Processing…' : <><CheckCircle2 size={17} /> Complete Sale</>}
            </button>
          </div>

          {/* Quick stats card */}
          {overview?.metrics && (
            <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Today's Summary</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ padding: '10px 12px', borderRadius: 10, background: '#fff7ed', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#f97316' }}>{overview.metrics.bills_today || 0}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Bills Today</div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 10, background: '#f0fdf4', textAlign: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#16a34a' }}>{fmt(overview.metrics.sales_today)}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Sales Today</div>
                </div>
                <div style={{ padding: '10px 12px', borderRadius: 10, background: '#fffbeb', textAlign: 'center', gridColumn: '1/-1' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#d97706' }}>{overview.metrics.hold_count || 0}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Bills On Hold</div>
                </div>
              </div>
            </div>
          )}

        </div>{/* end RIGHT PANEL */}

      </div>{/* end main grid */}
    </div>
  );
}
