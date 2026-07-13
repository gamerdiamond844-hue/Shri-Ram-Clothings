import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Plus, X, Pencil, ChevronLeft, ChevronRight,
  Building2, Phone, Mail, FileText, RefreshCw, BookOpen,
  AlertCircle, CheckCircle, Package, RotateCcw,
} from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none',
  fontFamily: 'inherit', color: '#111827', background: '#fff',
};

const BLANK_FORM = {
  name: '', phone: '', email: '', gst_number: '',
  address: '', payment_terms_days: '30', notes: '',
};

const poStatusColor = (s) => {
  if (s === 'received')  return { bg: '#dcfce7', color: '#166534' };
  if (s === 'ordered')   return { bg: '#dbeafe', color: '#1e40af' };
  if (s === 'partial')   return { bg: '#fff7ed', color: '#c2410c' };
  if (s === 'cancelled') return { bg: '#fee2e2', color: '#991b1b' };
  return { bg: '#f3f4f6', color: '#6b7280' }; // draft
};

const ledgerTypeColor = (t) => {
  if (t === 'purchase_order') return { bg: '#dbeafe', color: '#1e40af' };
  if (t === 'return')         return { bg: '#fef9c3', color: '#854d0e' };
  if (t === 'payment')        return { bg: '#dcfce7', color: '#166534' };
  return { bg: '#f3f4f6', color: '#6b7280' };
};

const ledgerTypeIcon = (t) => {
  if (t === 'purchase_order') return <Package size={12} />;
  if (t === 'return')         return <RotateCcw size={12} />;
  return <FileText size={12} />;
};

export default function AdminSuppliers() {
  // ── List state ──────────────────────────────────────────────────────────
  const [suppliers, setSuppliers] = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [limit]                   = useState(20);
  const [search, setSearch]       = useState('');
  const debounceRef               = useRef(null);

  // ── Add/Edit form ────────────────────────────────────────────────────────
  const [showForm, setShowForm]         = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [form, setForm]                 = useState(BLANK_FORM);
  const [saving, setSaving]             = useState(false);

  // ── Ledger panel ─────────────────────────────────────────────────────────
  const [ledgerSupplier, setLedgerSupplier] = useState(null);
  const [ledgerData, setLedgerData]         = useState(null);
  const [ledgerLoading, setLedgerLoading]   = useState(false);

  // ── Fetch list ───────────────────────────────────────────────────────────
  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit });
      if (search) p.set('search', search);
      const res = await api.get(`/erp/suppliers?${p}`);
      setSuppliers(res.data.suppliers || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  const handleSearch = (val) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);
    }, 300);
  };

  // ── Form open/close ──────────────────────────────────────────────────────
  const openAdd = () => {
    setEditSupplier(null);
    setForm(BLANK_FORM);
    setShowForm(true);
    setLedgerSupplier(null);
    setLedgerData(null);
  };

  const openEdit = (s) => {
    setEditSupplier(s);
    setForm({
      name: s.name || '',
      phone: s.phone || '',
      email: s.email || '',
      gst_number: s.gst_number || '',
      address: s.address || '',
      payment_terms_days: s.payment_terms_days != null ? String(s.payment_terms_days) : '30',
      notes: s.notes || '',
    });
    setShowForm(true);
    setLedgerSupplier(null);
    setLedgerData(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Supplier name is required');
    setSaving(true);
    try {
      const payload = { ...form, payment_terms_days: form.payment_terms_days ? parseInt(form.payment_terms_days) : 30 };
      if (editSupplier) {
        await api.put(`/erp/suppliers/${editSupplier.id}`, payload);
        toast.success('Supplier updated');
      } else {
        await api.post('/erp/suppliers', payload);
        toast.success('Supplier created');
      }
      setShowForm(false);
      fetchSuppliers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  // ── Ledger panel ─────────────────────────────────────────────────────────
  const openLedger = async (s) => {
    setLedgerSupplier(s);
    setLedgerData(null);
    setLedgerLoading(true);
    setShowForm(false);
    try {
      const res = await api.get(`/erp/suppliers/${s.id}/ledger`);
      setLedgerData(res.data);
    } catch {
      toast.error('Failed to load supplier ledger');
      setLedgerSupplier(null);
    } finally {
      setLedgerLoading(false);
    }
  };

  const f = (v) => setForm((p) => ({ ...p, ...v }));
  const totalPages = Math.ceil(total / limit);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
          <input
            defaultValue=""
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search name, code, GST…"
            style={{ ...inp, paddingLeft: 32, width: 240 }}
          />
        </div>
        <button
          onClick={openAdd}
          className="btn-orange"
          style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={15} /> Add Supplier
        </button>
      </div>

      {/* ── Add/Edit inline form ── */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #fed7aa', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
              {editSupplier ? 'Edit Supplier' : 'Add New Supplier'}
            </span>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 4 }}>
              <X size={18} />
            </button>
          </div>

          {/* Row 1: name, phone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Name *</label>
              <input required value={form.name} onChange={(e) => f({ name: e.target.value })} placeholder="Supplier name" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Phone</label>
              <input value={form.phone} onChange={(e) => f({ phone: e.target.value })} placeholder="Phone number" style={inp} />
            </div>
          </div>

          {/* Row 2: email, gst */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Email</label>
              <input type="email" value={form.email} onChange={(e) => f({ email: e.target.value })} placeholder="Email address" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>GST Number</label>
              <input value={form.gst_number} onChange={(e) => f({ gst_number: e.target.value })} placeholder="e.g. 27AAPFU0939F1ZV" style={inp} />
            </div>
          </div>

          {/* Row 3: address, payment terms */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Address</label>
              <input value={form.address} onChange={(e) => f({ address: e.target.value })} placeholder="Street address, city, state" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Payment Terms (days)</label>
              <input
                type="number" min="0" max="365"
                value={form.payment_terms_days}
                onChange={(e) => f({ payment_terms_days: e.target.value })}
                placeholder="30"
                style={inp}
              />
            </div>
          </div>

          {/* Row 4: notes */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => f({ notes: e.target.value })}
              placeholder="Internal notes about this supplier"
              rows={2}
              style={{ ...inp, resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving} className="btn-orange" style={{ padding: '10px 24px', borderRadius: 10, fontSize: 13 }}>
              {saving ? 'Saving…' : editSupplier ? 'Update Supplier' : 'Add Supplier'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 24px', borderRadius: 10, fontSize: 13, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Main layout: table + optional ledger panel ── */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

        {/* ── Supplier list table ── */}
        <div style={{ flex: 1, minWidth: 0, background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
          {/* Table header row */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>{total} supplier{total !== 1 ? 's' : ''}</span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Code', 'Name', 'Phone', 'GST Number', 'Balance Due', 'Payment Terms', 'Status', 'Actions'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={8} style={{ padding: '10px 12px' }}>
                        <div className="skeleton" style={{ height: 28, borderRadius: 8 }} />
                      </td>
                    </tr>
                  ))
                ) : suppliers.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                      No suppliers found. Click "Add Supplier" to get started.
                    </td>
                  </tr>
                ) : suppliers.map((s) => {
                  const isSelected = ledgerSupplier?.id === s.id;
                  const balanceDue = parseFloat(s.balance_due || 0);
                  return (
                    <tr
                      key={s.id}
                      onClick={() => openLedger(s)}
                      style={{ borderTop: '1px solid #f9fafb', cursor: 'pointer', background: isSelected ? '#fff7ed' : 'transparent', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#fafafa'; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; else e.currentTarget.style.background = '#fff7ed'; }}
                    >
                      <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: 12, whiteSpace: 'nowrap' }}>{s.supplier_code || '—'}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>{s.name}</td>
                      <td style={{ padding: '10px 12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{s.phone || '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#6b7280', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 12 }}>{s.gst_number || '—'}</td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        {balanceDue > 0 ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#dc2626', fontWeight: 700 }}>
                            <AlertCircle size={12} /> ₹{balanceDue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span style={{ color: '#9ca3af' }}>₹0</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                        {s.payment_terms_days != null ? `${s.payment_terms_days} days` : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        {s.is_active ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#dcfce7', color: '#166534', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>
                            <CheckCircle size={10} /> Active
                          </span>
                        ) : (
                          <span style={{ background: '#f3f4f6', color: '#9ca3af', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100 }}>
                            Inactive
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button onClick={() => openEdit(s)} title="Edit" style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fff7ed', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => openLedger(s)} title="View Ledger" style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <BookOpen size={13} />
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

        {/* ── Supplier Ledger side panel ── */}
        {ledgerSupplier && (
          <div style={{ width: 440, flexShrink: 0, background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Panel header */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BookOpen size={15} color="#3b82f6" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Supplier Ledger</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => openLedger(ledgerSupplier)}
                  title="Refresh"
                  style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <RefreshCw size={12} />
                </button>
                <button
                  onClick={() => { setLedgerSupplier(null); setLedgerData(null); }}
                  style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', background: '#f3f4f6', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {ledgerLoading ? (
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 24, borderRadius: 8 }} />
                ))}
              </div>
            ) : ledgerData ? (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', maxHeight: 680 }}>

                {/* Supplier summary card */}
                <div style={{ background: '#f9fafb', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Building2 size={14} color="#f97316" />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{ledgerData.supplier.name}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>{ledgerData.supplier.supplier_code}</div>
                  {ledgerData.supplier.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7280' }}>
                      <Phone size={11} /> {ledgerData.supplier.phone}
                    </div>
                  )}
                  {ledgerData.supplier.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7280' }}>
                      <Mail size={11} /> {ledgerData.supplier.email}
                    </div>
                  )}
                  {ledgerData.supplier.gst_number && (
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      GST: <span style={{ fontFamily: 'monospace', color: '#374151' }}>{ledgerData.supplier.gst_number}</span>
                    </div>
                  )}

                  {/* Balance + terms */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                    <div style={{ background: parseFloat(ledgerData.supplier.balance_due || 0) > 0 ? '#fee2e2' : '#f3f4f6', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: parseFloat(ledgerData.supplier.balance_due || 0) > 0 ? '#991b1b' : '#6b7280', fontWeight: 600 }}>Balance Due</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: parseFloat(ledgerData.supplier.balance_due || 0) > 0 ? '#dc2626' : '#6b7280' }}>
                        ₹{parseFloat(ledgerData.supplier.balance_due || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div style={{ background: '#eff6ff', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#1e40af', fontWeight: 600 }}>Payment Terms</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#1e40af' }}>
                        {ledgerData.supplier.payment_terms_days != null ? `${ledgerData.supplier.payment_terms_days}d` : '—'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Purchase Orders table */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Package size={13} color="#6b7280" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                      Purchase Orders ({ledgerData.purchase_orders?.length ?? 0})
                    </span>
                  </div>
                  {ledgerData.purchase_orders?.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '18px', color: '#9ca3af', fontSize: 12, background: '#f9fafb', borderRadius: 10 }}>
                      No purchase orders yet.
                    </div>
                  ) : (
                    <div style={{ border: '1px solid #f3f4f6', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.8fr 1fr', background: '#f9fafb', padding: '8px 10px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <span>PO Number</span>
                        <span>Status</span>
                        <span style={{ textAlign: 'right' }}>Total</span>
                        <span style={{ textAlign: 'right' }}>Expected</span>
                      </div>
                      {ledgerData.purchase_orders.map((po) => {
                        const sc = poStatusColor(po.status);
                        return (
                          <div key={po.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.8fr 1fr', padding: '9px 10px', fontSize: 12, borderTop: '1px solid #f3f4f6', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: 11 }}>{po.po_number}</span>
                            <span>
                              <span style={{ ...sc, fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 100 }}>
                                {(po.status || 'draft').charAt(0).toUpperCase() + (po.status || 'draft').slice(1)}
                              </span>
                            </span>
                            <span style={{ textAlign: 'right', fontWeight: 700, color: '#111827' }}>
                              ₹{parseFloat(po.total || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </span>
                            <span style={{ textAlign: 'right', color: '#6b7280', fontSize: 11 }}>
                              {po.expected_date ? new Date(po.expected_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Ledger entries feed */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <FileText size={13} color="#6b7280" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>
                      Ledger Entries ({ledgerData.ledger_entries?.length ?? 0})
                    </span>
                  </div>
                  {ledgerData.ledger_entries?.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '18px', color: '#9ca3af', fontSize: 12, background: '#f9fafb', borderRadius: 10 }}>
                      No ledger entries yet.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid #f3f4f6', borderRadius: 10, overflow: 'hidden' }}>
                      {ledgerData.ledger_entries.map((entry, i) => {
                        const tc = ledgerTypeColor(entry.type);
                        return (
                          <div
                            key={i}
                            style={{ padding: '10px 12px', borderTop: i === 0 ? 'none' : '1px solid #f3f4f6', display: 'flex', alignItems: 'flex-start', gap: 10 }}
                          >
                            {/* Type badge */}
                            <span style={{ ...tc, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 100, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
                              {ledgerTypeIcon(entry.type)}
                              {entry.type === 'purchase_order' ? 'PO' : entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                            </span>

                            {/* Content */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#111827', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {entry.reference || '—'}
                                </span>
                                <span style={{ fontSize: 12, fontWeight: 700, color: entry.type === 'return' ? '#d97706' : '#111827', whiteSpace: 'nowrap' }}>
                                  {entry.type === 'return' ? '-' : ''}₹{parseFloat(entry.amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                </span>
                              </div>
                              {entry.description && (
                                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {entry.description}
                                </div>
                              )}
                              <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                                {entry.date ? new Date(entry.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            ) : null}
          </div>
        )}
      </div>

    </div>
  );
}
