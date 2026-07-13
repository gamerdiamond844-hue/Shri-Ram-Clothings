import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, X, Pencil, Trash2, Download, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const inp = {
  width: '100%', padding: '8px 12px', fontSize: 13,
  border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none',
  fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box',
};
const lbl = { fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 };
const fmt = (n) => parseFloat(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

const PAYMENT_MODES = ['cash', 'upi', 'card', 'bank', 'cheque', 'other'];
const BLANK = { category: '', title: '', amount: '', payment_mode: 'cash', expense_date: '', notes: '' };

// Simple inline SVG bar chart
function MiniBarChart({ data }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.total), 1);
  const W = 280, H = 60, barW = (W / data.length) * 0.65;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 20}`} style={{ display: 'block' }}>
      {data.map((d, i) => {
        const h = (d.total / max) * H;
        const x = i * (W / data.length) + (W / data.length) * 0.175;
        return (
          <g key={i}>
            <rect x={x} y={H - h} width={barW} height={h} fill="#f97316" rx="2" />
            <text x={x + barW / 2} y={H + 14} textAnchor="middle" fontSize="8" fill="#6b7280">
              {d.month}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function AdminExpenses() {
  const [expenses, setExpenses] = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [limit]                 = useState(20);

  // Filters
  const [filterCat,  setFilterCat]  = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo,   setFilterTo]   = useState('');
  const [filterMode, setFilterMode] = useState('');

  // Form
  const [showForm, setShowForm]   = useState(false);
  const [editItem, setEditItem]   = useState(null);
  const [form, setForm]           = useState(BLANK);
  const [saving, setSaving]       = useState(false);

  // Monthly chart data
  const [chartData, setChartData] = useState([]);

  const [exporting, setExporting] = useState(false);
  const f = (v) => setForm(p => ({ ...p, ...v }));

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit });
      if (filterCat)  p.set('category',     filterCat);
      if (filterFrom) p.set('from',          filterFrom);
      if (filterTo)   p.set('to',            filterTo);
      if (filterMode) p.set('payment_mode',  filterMode);
      const res = await api.get(`/erp/expenses?${p}`);
      setExpenses(res.data.expenses || []);
      setTotal(res.data.total || 0);
    } catch { toast.error('Failed to load expenses'); }
    finally { setLoading(false); }
  }, [page, limit, filterCat, filterFrom, filterTo, filterMode]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);
  useEffect(() => { setPage(1); }, [filterCat, filterFrom, filterTo, filterMode]);

  // Fetch last 6 months for chart
  useEffect(() => {
    const pad = (n) => String(n).padStart(2, '0');
    const now = new Date();
    const from = new Date(now); from.setMonth(from.getMonth() - 5); from.setDate(1);
    const fromStr = `${from.getFullYear()}-${pad(from.getMonth() + 1)}-01`;
    api.get(`/erp/expenses?limit=500&from=${fromStr}`).then(res => {
      const map = {};
      (res.data.expenses || []).forEach(e => {
        const m = (e.expense_date || e.created_at || '').slice(0, 7);
        if (m) map[m] = (map[m] || 0) + parseFloat(e.amount || 0);
      });
      const result = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now); d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
        result.push({ month: key.slice(5), total: map[key] || 0 });
      }
      setChartData(result);
    }).catch(() => {});
  }, []);

  // Category totals (client-side from loaded data)
  const catTotals = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount || 0);
    return acc;
  }, {});

  const openAdd = () => { setEditItem(null); setForm(BLANK); setShowForm(true); };
  const openEdit = (e) => {
    setEditItem(e);
    setForm({
      category: e.category || '', title: e.title || '',
      amount: e.amount || '', payment_mode: e.payment_mode || 'cash',
      expense_date: e.expense_date ? e.expense_date.slice(0, 10) : '',
      notes: e.notes || '',
    });
    setShowForm(true);
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!form.category.trim() || !form.title.trim() || !form.amount || !form.expense_date)
      return toast.error('Category, title, amount, and date are required');
    if (Number(form.amount) <= 0) return toast.error('Amount must be greater than 0');
    setSaving(true);
    try {
      if (editItem) {
        await api.put(`/erp/expenses/${editItem.id}`, form);
        toast.success('Expense updated');
      } else {
        await api.post('/erp/expenses', form);
        toast.success('Expense added');
      }
      setShowForm(false); fetchExpenses();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save expense'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await api.delete(`/erp/expenses/${id}`);
      toast.success('Expense deleted'); fetchExpenses();
    } catch { toast.error('Failed to delete expense'); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const p = new URLSearchParams();
      if (filterCat)  p.set('category', filterCat);
      if (filterFrom) p.set('from', filterFrom);
      if (filterTo)   p.set('to', filterTo);
      if (filterMode) p.set('payment_mode', filterMode);
      const res = await api.get(`/erp/expenses/export?${p}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `expenses-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click(); URL.revokeObjectURL(url);
      toast.success('Exported');
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Category summary cards */}
      {Object.keys(catTotals).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {Object.entries(catTotals).map(([cat, amt]) => (
            <div key={cat} style={{ background: '#fff', borderRadius: 10, border: '1px solid #f3f4f6', padding: '10px 16px', minWidth: 120 }}>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, textTransform: 'capitalize', marginBottom: 3 }}>{cat}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#f97316' }}>₹{fmt(amt)}</div>
            </div>
          ))}
        </div>
      )}

      {/* 6-month chart */}
      {chartData.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f3f4f6', padding: '14px 18px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 10 }}>Month-over-Month Expenses</div>
          <MiniBarChart data={chartData} />
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <input value={filterCat} onChange={e => setFilterCat(e.target.value)} placeholder="Category…" style={{ ...inp, width: 140 }} />
          <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} style={{ ...inp, width: 140 }} />
          <input type="date" value={filterTo}   onChange={e => setFilterTo(e.target.value)}   style={{ ...inp, width: 140 }} />
          <select value={filterMode} onChange={e => setFilterMode(e.target.value)} style={{ ...inp, width: 110 }}>
            <option value="">All modes</option>
            {PAYMENT_MODES.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
          </select>
          <button onClick={fetchExpenses} style={{ padding: '8px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, color: '#374151', fontSize: 12 }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleExport} disabled={exporting} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#374151' }}>
            <Download size={13} /> {exporting ? 'Exporting…' : 'Export Excel'}
          </button>
          <button onClick={openAdd} className="btn-orange" style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Plus size={14} /> Add Expense
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #fed7aa', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{editItem ? 'Edit Expense' : 'Add New Expense'}</span>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label style={lbl}>Category *</label><input required value={form.category} onChange={e => f({ category: e.target.value })} placeholder="e.g. Rent, Utilities" style={inp} /></div>
            <div><label style={lbl}>Title *</label><input required value={form.title} onChange={e => f({ title: e.target.value })} placeholder="Expense description" style={inp} /></div>
            <div><label style={lbl}>Amount (₹) *</label><input required type="number" min="0.01" step="0.01" value={form.amount} onChange={e => f({ amount: e.target.value })} placeholder="0.00" style={inp} /></div>
            <div><label style={lbl}>Payment Mode</label>
              <select value={form.payment_mode} onChange={e => f({ payment_mode: e.target.value })} style={inp}>
                {PAYMENT_MODES.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Expense Date *</label><input required type="date" value={form.expense_date} onChange={e => f({ expense_date: e.target.value })} style={inp} /></div>
            <div><label style={lbl}>Notes</label><input value={form.notes} onChange={e => f({ notes: e.target.value })} placeholder="Optional notes" style={inp} /></div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving} className="btn-orange" style={{ padding: '9px 24px', borderRadius: 9, fontSize: 13 }}>
              {saving ? 'Saving…' : editItem ? 'Update' : 'Add Expense'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '9px 18px', borderRadius: 9, fontSize: 13, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Date', 'Category', 'Title', 'Amount (₹)', 'Payment Mode', 'Notes', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '9px 12px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={7} style={{ padding: '10px 12px' }}><div className="skeleton" style={{ height: 26, borderRadius: 7 }} /></td></tr>
              )) : expenses.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '44px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No expenses found. Click "Add Expense" to get started.</td></tr>
              ) : expenses.map(e => (
                <tr key={e.id} style={{ borderTop: '1px solid #f9fafb' }}
                  onMouseEnter={ev => ev.currentTarget.style.background = '#fafafa'}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '9px 12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{e.expense_date ? new Date(e.expense_date).toLocaleDateString('en-IN') : '—'}</td>
                  <td style={{ padding: '9px 12px', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>{e.category}</td>
                  <td style={{ padding: '9px 12px', color: '#111827' }}>{e.title}</td>
                  <td style={{ padding: '9px 12px', fontWeight: 700, color: '#f97316', whiteSpace: 'nowrap' }}>₹{fmt(e.amount)}</td>
                  <td style={{ padding: '9px 12px', color: '#6b7280', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>{e.payment_mode || '—'}</td>
                  <td style={{ padding: '9px 12px', color: '#6b7280', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.notes || '—'}</td>
                  <td style={{ padding: '9px 12px' }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button onClick={() => openEdit(e)} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', background: '#fff7ed', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil size={12} /></button>
                      <button onClick={() => handleDelete(e.id)} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ padding: '10px 14px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: '#9ca3af' }}>{total} expenses</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ width: 28, height: 28, borderRadius: 7, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page === 1 ? 0.4 : 1 }}><ChevronLeft size={13} /></button>
              <span style={{ padding: '0 8px', color: '#6b7280', lineHeight: '28px' }}>{page}/{totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ width: 28, height: 28, borderRadius: 7, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page === totalPages ? 0.4 : 1 }}><ChevronRight size={13} /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
