import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Plus, X, Pencil, Download, History,
  Star, CreditCard, AlertCircle, ChevronLeft, ChevronRight,
  User, Phone, Mail, MapPin, FileText, RefreshCw,
} from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const inp = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none',
  fontFamily: 'inherit', color: '#111827', background: '#fff',
};

const MEMBERSHIPS = ['regular', 'silver', 'gold', 'platinum'];

const BLANK_FORM = {
  name: '', phone: '', email: '', gst_number: '',
  address: '', city: '', state: '', pincode: '',
  membership: 'regular', notes: '',
};

const BLANK_ADJUST = { type: 'loyalty_points', amount: '', notes: '' };

const statusColor = (s) => {
  if (s === 'completed') return { bg: '#dcfce7', color: '#166534' };
  if (s === 'void')      return { bg: '#fee2e2', color: '#991b1b' };
  if (s === 'returned')  return { bg: '#dbeafe', color: '#1e40af' };
  if (s === 'hold')      return { bg: '#fef9c3', color: '#854d0e' };
  return { bg: '#f3f4f6', color: '#6b7280' };
};

const membershipColor = (m) => {
  if (m === 'platinum') return { bg: '#e0e7ff', color: '#3730a3' };
  if (m === 'gold')     return { bg: '#fef9c3', color: '#854d0e' };
  if (m === 'silver')   return { bg: '#f1f5f9', color: '#475569' };
  return { bg: '#f3f4f6', color: '#6b7280' };
};

export default function AdminCustomers() {
  // ── List state ──────────────────────────────────────────────────────────
  const [customers, setCustomers] = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [limit, setLimit]         = useState(20);
  const [search, setSearch]       = useState('');
  const debounceRef               = useRef(null);

  // ── Add/Edit form ────────────────────────────────────────────────────────
  const [showForm, setShowForm]       = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [form, setForm]               = useState(BLANK_FORM);
  const [saving, setSaving]           = useState(false);

  // ── History panel ────────────────────────────────────────────────────────
  const [historyCustomer, setHistoryCustomer] = useState(null);
  const [historyData, setHistoryData]         = useState(null);
  const [historyLoading, setHistoryLoading]   = useState(false);

  // ── Adjust modal ─────────────────────────────────────────────────────────
  const [adjustCustomer, setAdjustCustomer] = useState(null);
  const [adjustForm, setAdjustForm]         = useState(BLANK_ADJUST);
  const [adjusting, setAdjusting]           = useState(false);

  // ── Export ───────────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);

  // ── Fetch list ───────────────────────────────────────────────────────────
  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit });
      if (search) p.set('search', search);
      const res = await api.get(`/erp/customers?${p}`);
      setCustomers(res.data.customers || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  // Debounce search
  const handleSearch = (val) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 300);
  };

  // ── Form open/close ──────────────────────────────────────────────────────
  const openAdd = () => {
    setEditCustomer(null);
    setForm(BLANK_FORM);
    setShowForm(true);
  };

  const openEdit = (c) => {
    setEditCustomer(c);
    setForm({
      name: c.name || '',
      phone: c.phone || '',
      email: c.email || '',
      gst_number: c.gst_number || '',
      address: c.address || '',
      city: c.city || '',
      state: c.state || '',
      pincode: c.pincode || '',
      membership: c.membership || 'regular',
      notes: c.notes || '',
    });
    setShowForm(true);
    setHistoryCustomer(null);
    setHistoryData(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Customer name is required');
    setSaving(true);
    try {
      if (editCustomer) {
        await api.put(`/erp/customers/${editCustomer.id}`, form);
        toast.success('Customer updated');
      } else {
        await api.post('/erp/customers', form);
        toast.success('Customer created');
      }
      setShowForm(false);
      fetchCustomers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  // ── History panel ────────────────────────────────────────────────────────
  const openHistory = async (c) => {
    setHistoryCustomer(c);
    setHistoryData(null);
    setHistoryLoading(true);
    setShowForm(false);
    setAdjustCustomer(null);
    try {
      const res = await api.get(`/erp/customers/${c.id}/history`);
      setHistoryData(res.data);
    } catch {
      toast.error('Failed to load purchase history');
      setHistoryCustomer(null);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ── Adjust modal ─────────────────────────────────────────────────────────
  const openAdjust = (c) => {
    setAdjustCustomer(c);
    setAdjustForm(BLANK_ADJUST);
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    if (!adjustForm.notes.trim()) return toast.error('Notes are required');
    if (adjustForm.amount === '' || isNaN(Number(adjustForm.amount)))
      return toast.error('Enter a valid amount');
    setAdjusting(true);
    try {
      await api.post(`/erp/customers/${adjustCustomer.id}/adjust`, {
        type: adjustForm.type,
        amount: Number(adjustForm.amount),
        notes: adjustForm.notes.trim(),
      });
      toast.success('Balance adjusted successfully');
      setAdjustCustomer(null);
      fetchCustomers();
      // refresh history if open
      if (historyCustomer?.id === adjustCustomer.id) {
        openHistory(adjustCustomer);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Adjustment failed');
    } finally {
      setAdjusting(false);
    }
  };

  // ── Excel export ──────────────────────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get('/erp/customers/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const f = (v) => setForm((p) => ({ ...p, ...v }));

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
            placeholder="Search name, phone, code…"
            style={{ ...inp, paddingLeft: 32, width: 240 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 10, fontSize: 13, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}
          >
            <Download size={14} /> {exporting ? 'Exporting…' : 'Export Excel'}
          </button>
          <button
            onClick={openAdd}
            className="btn-orange"
            style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={15} /> Add Customer
          </button>
        </div>
      </div>

      {/* ── Add/Edit slide-in form ── */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #fed7aa', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
              {editCustomer ? 'Edit Customer' : 'Add New Customer'}
            </span>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 4 }}>
              <X size={18} />
            </button>
          </div>

          {/* Row 1: name, phone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Name *</label>
              <input required value={form.name} onChange={(e) => f({ name: e.target.value })} placeholder="Customer name" style={inp} />
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
              <input value={form.gst_number} onChange={(e) => f({ gst_number: e.target.value })} placeholder="GST number" style={inp} />
            </div>
          </div>

          {/* Row 3: address */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Address</label>
            <input value={form.address} onChange={(e) => f({ address: e.target.value })} placeholder="Street address" style={inp} />
          </div>

          {/* Row 4: city, state, pincode */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>City</label>
              <input value={form.city} onChange={(e) => f({ city: e.target.value })} placeholder="City" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>State</label>
              <input value={form.state} onChange={(e) => f({ state: e.target.value })} placeholder="State" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Pincode</label>
              <input value={form.pincode} onChange={(e) => f({ pincode: e.target.value })} placeholder="Pincode" style={inp} />
            </div>
          </div>

          {/* Row 5: membership, notes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Membership</label>
              <select value={form.membership} onChange={(e) => f({ membership: e.target.value })} style={inp}>
                {MEMBERSHIPS.map((m) => (
                  <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Notes</label>
              <input value={form.notes} onChange={(e) => f({ notes: e.target.value })} placeholder="Internal notes" style={inp} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving} className="btn-orange" style={{ padding: '10px 24px', borderRadius: 10, fontSize: 13 }}>
              {saving ? 'Saving…' : editCustomer ? 'Update Customer' : 'Add Customer'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 24px', borderRadius: 10, fontSize: 13, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ── Main layout: table + optional history panel ── */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

        {/* ── Customer list table ── */}
        <div style={{ flex: 1, minWidth: 0, background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
          {/* Per-page selector */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: '#6b7280' }}>{total} customers</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>Per page:</span>
              {[20, 50].map((n) => (
                <button key={n} onClick={() => { setLimit(n); setPage(1); }}
                  style={{ padding: '3px 10px', borderRadius: 6, fontSize: 12, border: '1.5px solid', cursor: 'pointer', borderColor: limit === n ? '#f97316' : '#e5e7eb', background: limit === n ? '#fff7ed' : '#fff', color: limit === n ? '#f97316' : '#6b7280', fontWeight: limit === n ? 700 : 400 }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Code', 'Name', 'Phone', 'Email', 'Loyalty', 'Store Credit', 'Outstanding', 'Membership', 'Actions'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={9} style={{ padding: '10px 12px' }}>
                        <div className="skeleton" style={{ height: 28, borderRadius: 8 }} />
                      </td>
                    </tr>
                  ))
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                      No customers found. Click "Add Customer" to get started.
                    </td>
                  </tr>
                ) : customers.map((c) => {
                  const isSelected = historyCustomer?.id === c.id;
                  const mc = membershipColor(c.membership);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => openHistory(c)}
                      style={{ borderTop: '1px solid #f9fafb', cursor: 'pointer', background: isSelected ? '#fff7ed' : 'transparent', transition: 'background 0.15s' }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = '#fafafa'; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = 'transparent'; else e.currentTarget.style.background = '#fff7ed'; }}
                    >
                      <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: 12, whiteSpace: 'nowrap' }}>{c.customer_code || '—'}</td>
                      <td style={{ padding: '10px 12px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>{c.name}</td>
                      <td style={{ padding: '10px 12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{c.phone || '—'}</td>
                      <td style={{ padding: '10px 12px', color: '#6b7280', whiteSpace: 'nowrap', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.email || '—'}</td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fef9c3', color: '#854d0e', fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>
                          <Star size={10} fill="#d97706" color="#d97706" /> {c.loyalty_points ?? 0}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', fontWeight: 600, color: '#059669' }}>₹{parseFloat(c.store_credit || 0).toFixed(2)}</td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        {parseFloat(c.outstanding_amount || 0) > 0 ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#dc2626', fontWeight: 700 }}>
                            <AlertCircle size={12} /> ₹{parseFloat(c.outstanding_amount).toFixed(2)}
                          </span>
                        ) : <span style={{ color: '#9ca3af' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        <span style={{ ...mc, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100 }}>
                          {(c.membership || 'regular').charAt(0).toUpperCase() + (c.membership || 'regular').slice(1)}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button onClick={() => openEdit(c)} title="Edit" style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fff7ed', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => openHistory(c)} title="Purchase History" style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <History size={13} />
                          </button>
                          <button onClick={() => openAdjust(c)} title="Adjust Balance" style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CreditCard size={13} />
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
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page === 1 ? 0.4 : 1 }}>
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let p;
                  if (totalPages <= 5) p = i + 1;
                  else if (page <= 3) p = i + 1;
                  else if (page >= totalPages - 2) p = totalPages - 4 + i;
                  else p = page - 2 + i;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid', cursor: 'pointer', fontWeight: page === p ? 700 : 400, borderColor: page === p ? '#f97316' : '#e5e7eb', background: page === p ? '#fff7ed' : '#fff', color: page === p ? '#f97316' : '#374151', fontSize: 13 }}>
                      {p}
                    </button>
                  );
                })}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page === totalPages ? 0.4 : 1 }}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Purchase History side panel ── */}
        {historyCustomer && (
          <div style={{ width: 420, flexShrink: 0, background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <History size={15} color="#3b82f6" />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>Purchase History</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => openHistory(historyCustomer)} title="Refresh" style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <RefreshCw size={12} />
                </button>
                <button onClick={() => { setHistoryCustomer(null); setHistoryData(null); }} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', background: '#f3f4f6', color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={13} />
                </button>
              </div>
            </div>

            {historyLoading ? (
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 24, borderRadius: 8 }} />
                ))}
              </div>
            ) : historyData ? (
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', maxHeight: 620 }}>
                {/* Customer summary */}
                <div style={{ background: '#f9fafb', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <User size={13} color="#f97316" />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{historyData.customer.name}</span>
                    <span style={{ fontSize: 11, ...membershipColor(historyData.customer.membership), padding: '1px 7px', borderRadius: 100, fontWeight: 600, marginLeft: 4 }}>
                      {(historyData.customer.membership || 'regular').charAt(0).toUpperCase() + (historyData.customer.membership || 'regular').slice(1)}
                    </span>
                  </div>
                  {historyData.customer.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7280' }}>
                      <Phone size={11} /> {historyData.customer.phone}
                    </div>
                  )}
                  {historyData.customer.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7280' }}>
                      <Mail size={11} /> {historyData.customer.email}
                    </div>
                  )}
                  {historyData.customer.address && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7280' }}>
                      <MapPin size={11} />
                      {[historyData.customer.address, historyData.customer.city, historyData.customer.state, historyData.customer.pincode].filter(Boolean).join(', ')}
                    </div>
                  )}

                  {/* Balances */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 4 }}>
                    <div style={{ background: '#fef9c3', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#854d0e', fontWeight: 600 }}>Loyalty Pts</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#854d0e' }}>{historyData.customer.loyalty_points ?? 0}</div>
                    </div>
                    <div style={{ background: '#dcfce7', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#166534', fontWeight: 600 }}>Store Credit</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#166534' }}>₹{parseFloat(historyData.customer.store_credit || 0).toFixed(0)}</div>
                    </div>
                    <div style={{ background: parseFloat(historyData.customer.outstanding_amount || 0) > 0 ? '#fee2e2' : '#f3f4f6', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: parseFloat(historyData.customer.outstanding_amount || 0) > 0 ? '#991b1b' : '#6b7280', fontWeight: 600 }}>Outstanding</div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: parseFloat(historyData.customer.outstanding_amount || 0) > 0 ? '#dc2626' : '#6b7280' }}>₹{parseFloat(historyData.customer.outstanding_amount || 0).toFixed(0)}</div>
                    </div>
                  </div>

                  {/* Lifetime stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ background: '#eff6ff', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 11, color: '#1e40af', fontWeight: 600 }}>Lifetime Spend</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#1e40af' }}>₹{parseFloat(historyData.lifetime_spend || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                    </div>
                    <div style={{ background: '#fdf4ff', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 11, color: '#7e22ce', fontWeight: 600 }}>Total Visits</div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#7e22ce' }}>{historyData.visit_count}</div>
                    </div>
                  </div>
                </div>

                {/* Bills table */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <FileText size={13} color="#6b7280" />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Bills ({historyData.sales?.length ?? 0})</span>
                  </div>
                  {historyData.sales?.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af', fontSize: 13 }}>No bills found for this customer.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid #f3f4f6', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 0.9fr 0.8fr', background: '#f9fafb', padding: '8px 10px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        <span>Bill No</span>
                        <span>Date</span>
                        <span>Method</span>
                        <span style={{ textAlign: 'right' }}>Total</span>
                        <span style={{ textAlign: 'right' }}>Status</span>
                      </div>
                      {historyData.sales.map((sale) => {
                        const sc = statusColor(sale.status);
                        return (
                          <div key={sale.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 0.9fr 0.8fr', padding: '9px 10px', fontSize: 12, borderTop: '1px solid #f3f4f6', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sale.bill_no}</span>
                            <span style={{ color: '#6b7280' }}>{sale.created_at ? new Date(sale.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</span>
                            <span style={{ color: '#6b7280', textTransform: 'capitalize' }}>{sale.payment_method || '—'}</span>
                            <span style={{ textAlign: 'right', fontWeight: 700, color: '#111827' }}>₹{parseFloat(sale.total || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                            <span style={{ textAlign: 'right' }}>
                              <span style={{ ...sc, fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 100 }}>
                                {(sale.status || 'completed').charAt(0).toUpperCase() + (sale.status || 'completed').slice(1)}
                              </span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Adjust balance button inside panel */}
                <button
                  onClick={() => openAdjust(historyCustomer)}
                  style={{ padding: '9px 16px', borderRadius: 10, fontSize: 13, border: '1.5px solid #d1fae5', background: '#f0fdf4', cursor: 'pointer', color: '#15803d', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}
                >
                  <CreditCard size={14} /> Adjust Loyalty / Credit
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* ── Loyalty/Credit Adjustment Modal ── */}
      {adjustCustomer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form
            onSubmit={handleAdjust}
            style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Adjust Balance</span>
              <button type="button" onClick={() => setAdjustCustomer(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
            </div>

            <div style={{ background: '#f9fafb', borderRadius: 10, padding: 12, fontSize: 13 }}>
              <div style={{ fontWeight: 700, color: '#111827', marginBottom: 6 }}>{adjustCustomer.name}</div>
              <div style={{ display: 'flex', gap: 16 }}>
                <span style={{ color: '#6b7280' }}>
                  Loyalty: <strong style={{ color: '#854d0e' }}>{adjustCustomer.loyalty_points ?? 0} pts</strong>
                </span>
                <span style={{ color: '#6b7280' }}>
                  Credit: <strong style={{ color: '#059669' }}>₹{parseFloat(adjustCustomer.store_credit || 0).toFixed(2)}</strong>
                </span>
              </div>
            </div>

            {/* Type toggle */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>Type</label>
              <div style={{ display: 'flex', gap: 0, border: '1.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                {[{ val: 'loyalty_points', label: 'Loyalty Points' }, { val: 'store_credit', label: 'Store Credit' }].map(({ val, label }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAdjustForm((p) => ({ ...p, type: val }))}
                    style={{ flex: 1, padding: '9px 12px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: adjustForm.type === val ? 700 : 400, background: adjustForm.type === val ? '#fff7ed' : '#fff', color: adjustForm.type === val ? '#f97316' : '#6b7280', transition: 'all 0.15s' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                Amount <span style={{ color: '#9ca3af', fontWeight: 400 }}>(positive to add, negative to deduct)</span>
              </label>
              <input
                required
                type="number"
                step="any"
                value={adjustForm.amount}
                onChange={(e) => setAdjustForm((p) => ({ ...p, amount: e.target.value }))}
                placeholder={adjustForm.type === 'loyalty_points' ? 'e.g. 50 or -10' : 'e.g. 100.00 or -50.00'}
                style={inp}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Notes *</label>
              <textarea
                required
                value={adjustForm.notes}
                onChange={(e) => setAdjustForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Reason for adjustment (required)"
                rows={3}
                style={{ ...inp, resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="submit" disabled={adjusting} className="btn-orange" style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13 }}>
                {adjusting ? 'Saving…' : 'Apply Adjustment'}
              </button>
              <button type="button" onClick={() => setAdjustCustomer(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
