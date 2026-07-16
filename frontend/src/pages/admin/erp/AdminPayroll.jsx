import { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Download, Plus, X, Save,
  CheckCircle, Clock, Trash2, DollarSign, Users, TrendingUp,
} from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const inp = {
  width: '100%', padding: '8px 10px', fontSize: 13,
  border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none',
  fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box',
};
const lbl = { fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 };
const pad2 = (n) => String(n).padStart(2, '0');
const monthName = (m) => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1];
const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_META = {
  pending:   { bg: '#fef9c3', color: '#854d0e', label: 'Pending' },
  paid:      { bg: '#dcfce7', color: '#166534', label: 'Paid' },
  cancelled: { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
};

const BLANK_FORM = {
  employee_id: '', basic_salary: '', allowances: '', deductions: '', bonus: '',
  payment_mode: 'bank', payment_date: '', notes: '',
};

export default function AdminPayroll() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [exporting, setExporting] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(BLANK_FORM);
  const [saving, setSaving]       = useState(false);
  const [editId, setEditId]       = useState(null);

  const fetchPayroll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/erp/payroll?month=${month}&year=${year}`);
      setData(res.data);
    } catch { toast.error('Failed to load payroll'); }
    finally { setLoading(false); }
  }, [month, year]);

  useEffect(() => { fetchPayroll(); }, [fetchPayroll]);

  useEffect(() => {
    api.get('/erp/employees?limit=200')
      .then(r => setEmployees(r.data.employees || []))
      .catch(() => {});
  }, []);

  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); };

  const openAdd = () => { setEditId(null); setForm(BLANK_FORM); setShowForm(true); };
  const openEdit = (row) => {
    setEditId(row.id);
    setForm({
      employee_id:  String(row.employee_id),
      basic_salary: String(row.basic_salary || ''),
      allowances:   String(row.allowances || ''),
      deductions:   String(row.deductions || ''),
      bonus:        String(row.bonus || ''),
      payment_mode: row.payment_mode || 'bank',
      payment_date: row.payment_date ? String(row.payment_date).slice(0, 10) : '',
      notes:        row.notes || '',
    });
    setShowForm(true);
  };

  const net = () => {
    const b = Number(form.basic_salary) || 0;
    const a = Number(form.allowances) || 0;
    const d = Number(form.deductions) || 0;
    const bo = Number(form.bonus) || 0;
    return b + a + bo - d;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.employee_id) return toast.error('Select an employee');
    if (!form.basic_salary) return toast.error('Basic salary is required');
    setSaving(true);
    try {
      await api.post('/erp/payroll', {
        employee_id:  Number(form.employee_id),
        month, year,
        basic_salary: Number(form.basic_salary) || 0,
        allowances:   Number(form.allowances) || 0,
        deductions:   Number(form.deductions) || 0,
        bonus:        Number(form.bonus) || 0,
        payment_mode: form.payment_mode,
        payment_date: form.payment_date || null,
        notes:        form.notes || null,
      });
      toast.success(editId ? 'Payroll updated' : 'Payroll record saved');
      setShowForm(false);
      fetchPayroll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleMarkPaid = async (row) => {
    try {
      await api.patch(`/erp/payroll/${row.id}/pay`, {
        payment_date: new Date().toISOString().slice(0, 10),
        payment_mode: row.payment_mode,
      });
      toast.success('Marked as paid');
      fetchPayroll();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this payroll record?')) return;
    try {
      await api.delete(`/erp/payroll/${id}`);
      toast.success('Deleted');
      fetchPayroll();
    } catch (err) { toast.error(err.response?.data?.message || 'Delete failed'); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get(`/erp/payroll/export?month=${month}&year=${year}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url;
      a.download = `payroll-${year}-${pad2(month)}.xlsx`;
      a.click(); URL.revokeObjectURL(url);
      toast.success('Exported');
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  const summary = data?.summary || {};
  const rows = data?.payroll || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={prevMonth} style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronLeft size={14} />
          </button>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#111827', minWidth: 120, textAlign: 'center' }}>
            {monthName(month)} {year}
          </span>
          <button onClick={nextMonth} style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ChevronRight size={14} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleExport} disabled={exporting}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#374151', fontWeight: 600 }}>
            <Download size={13} /> {exporting ? 'Exporting…' : 'Export'}
          </button>
          <button onClick={openAdd}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
            <Plus size={14} /> Add Payroll
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { icon: Users,     label: 'Employees',     value: summary.count || 0,                    bg: '#eff6ff', color: '#3b82f6', money: false },
          { icon: DollarSign,label: 'Total Payable',  value: fmt(summary.total_payable),            bg: '#fff7ed', color: '#f97316', money: true  },
          { icon: CheckCircle,label: 'Total Paid',    value: fmt(summary.total_paid),               bg: '#f0fdf4', color: '#22c55e', money: true  },
          { icon: TrendingUp, label: 'Pending',       value: fmt(summary.total_pending),            bg: '#fef9c3', color: '#d97706', money: true  },
        ].map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #f3f4f6', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} color={card.color} />
              </div>
              <div>
                <div style={{ fontSize: card.money ? 14 : 20, fontWeight: 800, color: '#111827' }}>{loading ? '–' : card.value}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{card.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Employee', 'Role', 'Basic', 'Allowances', 'Deductions', 'Bonus', 'Net Salary', 'Mode', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={10} style={{ padding: '10px 12px' }}><div className="skeleton" style={{ height: 28, borderRadius: 8 }} /></td></tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                    No payroll records for {monthName(month)} {year}. Click "Add Payroll" to create records.
                  </td>
                </tr>
              ) : rows.map(row => {
                const st = STATUS_META[row.status] || STATUS_META.pending;
                return (
                  <tr key={row.id} style={{ borderTop: '1px solid #f9fafb' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>
                      <div>{row.employee_name}</div>
                      {row.employee_code && <div style={{ fontSize: 10, color: '#9ca3af' }}>{row.employee_code}</div>}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: 12, textTransform: 'capitalize' }}>{(row.employee_role || '').replace(/_/g, ' ')}</td>
                    <td style={{ padding: '10px 12px', color: '#374151' }}>{fmt(row.basic_salary)}</td>
                    <td style={{ padding: '10px 12px', color: '#22c55e' }}>+{fmt(row.allowances)}</td>
                    <td style={{ padding: '10px 12px', color: '#ef4444' }}>-{fmt(row.deductions)}</td>
                    <td style={{ padding: '10px 12px', color: '#3b82f6' }}>+{fmt(row.bonus)}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#f97316' }}>{fmt(row.net_salary)}</td>
                    <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: 12, textTransform: 'capitalize' }}>{row.payment_mode}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ ...st, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 100 }}>{st.label}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {row.status === 'pending' && (
                          <button onClick={() => handleMarkPaid(row)} title="Mark Paid"
                            style={{ padding: '4px 10px', borderRadius: 7, border: 'none', background: '#dcfce7', color: '#166534', cursor: 'pointer', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle size={11} /> Pay
                          </button>
                        )}
                        <button onClick={() => openEdit(row)} title="Edit"
                          style={{ padding: '4px 10px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(row.id)} title="Delete"
                          style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div style={{ background: '#fff', borderRadius: 18, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>{editId ? 'Edit Payroll' : 'Add Payroll Record'}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{monthName(month)} {year}</div>
              </div>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={lbl}>Employee *</label>
                <select value={form.employee_id} onChange={e => setForm(p => ({ ...p, employee_id: e.target.value }))} style={inp} required>
                  <option value="">— Select Employee —</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} {emp.employee_code ? `(${emp.employee_code})` : ''}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Basic Salary *</label>
                  <input type="number" min="0" step="0.01" value={form.basic_salary}
                    onChange={e => setForm(p => ({ ...p, basic_salary: e.target.value }))} style={inp} placeholder="0.00" required />
                </div>
                <div>
                  <label style={lbl}>Allowances</label>
                  <input type="number" min="0" step="0.01" value={form.allowances}
                    onChange={e => setForm(p => ({ ...p, allowances: e.target.value }))} style={inp} placeholder="0.00" />
                </div>
                <div>
                  <label style={lbl}>Deductions</label>
                  <input type="number" min="0" step="0.01" value={form.deductions}
                    onChange={e => setForm(p => ({ ...p, deductions: e.target.value }))} style={inp} placeholder="0.00" />
                </div>
                <div>
                  <label style={lbl}>Bonus</label>
                  <input type="number" min="0" step="0.01" value={form.bonus}
                    onChange={e => setForm(p => ({ ...p, bonus: e.target.value }))} style={inp} placeholder="0.00" />
                </div>
              </div>

              {/* Net salary preview */}
              <div style={{ background: '#fff7ed', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Net Salary</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#f97316' }}>{fmt(net())}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Payment Mode</label>
                  <select value={form.payment_mode} onChange={e => setForm(p => ({ ...p, payment_mode: e.target.value }))} style={inp}>
                    {['bank', 'cash', 'upi', 'cheque'].map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Payment Date</label>
                  <input type="date" value={form.payment_date}
                    onChange={e => setForm(p => ({ ...p, payment_date: e.target.value }))} style={inp} />
                </div>
              </div>

              <div>
                <label style={lbl}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2} style={{ ...inp, resize: 'vertical' }} placeholder="Optional notes…" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
                <button type="button" onClick={() => setShowForm(false)}
                  style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', fontWeight: 600 }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Save size={14} /> {saving ? 'Saving…' : editId ? 'Update' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
