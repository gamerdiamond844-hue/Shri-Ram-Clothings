import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Download, X, CheckCircle } from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const STATUS_META = {
  present:   { label: 'Present',   bg: '#dcfce7', color: '#166534', short: 'P' },
  absent:    { label: 'Absent',    bg: '#fee2e2', color: '#991b1b', short: 'A' },
  half_day:  { label: 'Half Day',  bg: '#fef9c3', color: '#854d0e', short: 'H' },
  leave:     { label: 'Leave',     bg: '#dbeafe', color: '#1e40af', short: 'L' },
};

const inp = {
  width: '100%', padding: '8px 10px', fontSize: 13,
  border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none',
  fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box',
};

const pad2 = (n) => String(n).padStart(2, '0');
const monthName = (m) => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1];

export default function AdminAttendance() {
  const now = new Date();
  const [year, setYear]   = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);

  // Mark attendance panel
  const [selected, setSelected] = useState(null); // { employee, date }
  const [markForm, setMarkForm] = useState({ status: 'present', check_in: '', check_out: '', notes: '' });
  const [saving, setSaving]     = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchGrid = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/erp/attendance?year=${year}&month=${month}`);
      setData(res.data);
    } catch { toast.error('Failed to load attendance'); }
    finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { fetchGrid(); }, [fetchGrid]);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const openMark = (employee, dateStr) => {
    const existing = data?.attendance?.[employee.id]?.[dateStr];
    setMarkForm({
      status:    existing?.status    || 'present',
      check_in:  existing?.check_in  ? String(existing.check_in).slice(0, 5)  : '',
      check_out: existing?.check_out ? String(existing.check_out).slice(0, 5) : '',
      notes:     existing?.notes     || '',
    });
    setSelected({ employee, date: dateStr });
  };

  const handleMark = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      await api.post('/erp/attendance', {
        employee_id:     selected.employee.id,
        attendance_date: selected.date,
        status:          markForm.status,
        check_in:        markForm.check_in  || null,
        check_out:       markForm.check_out || null,
        notes:           markForm.notes     || null,
      });
      toast.success('Attendance saved');
      setSelected(null);
      fetchGrid();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get(`/erp/attendance/export?year=${year}&month=${month}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `attendance-${year}-${pad2(month)}.xlsx`;
      a.click(); URL.revokeObjectURL(url);
      toast.success('Exported');
    } catch { toast.error('Export failed'); }
    finally { setExporting(false); }
  };

  const days = data ? Array.from({ length: data.daysInMonth }, (_, i) => i + 1) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        {/* Month navigation */}
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

        {/* Legend + Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {Object.entries(STATUS_META).map(([key, meta]) => (
            <span key={key} style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: meta.bg, color: meta.color }}>
              {meta.short} {meta.label}
            </span>
          ))}
          <button onClick={handleExport} disabled={exporting}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#374151' }}>
            <Download size={13} /> {exporting ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 12, whiteSpace: 'nowrap' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', minWidth: 160, position: 'sticky', left: 0, background: '#f9fafb', zIndex: 10 }}>
                  Employee
                </th>
                {days.map(d => (
                  <th key={d} style={{ padding: '10px 4px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#9ca3af', width: 30 }}>
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={32} style={{ padding: '10px 14px' }}>
                      <div className="skeleton" style={{ height: 26, borderRadius: 7 }} />
                    </td>
                  </tr>
                ))
              ) : !data?.employees?.length ? (
                <tr>
                  <td colSpan={32} style={{ padding: '44px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                    No employees found. Add employees from the Employees module.
                  </td>
                </tr>
              ) : data.employees.map(emp => (
                <tr key={emp.id} style={{ borderTop: '1px solid #f9fafb' }}>
                  {/* Employee name column — sticky */}
                  <td style={{ padding: '8px 14px', fontWeight: 600, color: '#111827', position: 'sticky', left: 0, background: '#fff', zIndex: 5, borderRight: '1px solid #f3f4f6', minWidth: 160 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150 }}>{emp.name}</div>
                    {emp.employee_code && <div style={{ fontSize: 10, color: '#9ca3af' }}>{emp.employee_code}</div>}
                  </td>

                  {/* Day cells */}
                  {days.map(d => {
                    const dateStr = `${year}-${pad2(month)}-${pad2(d)}`;
                    const att = data.attendance?.[emp.id]?.[dateStr];
                    const meta = att ? STATUS_META[att.status] : null;
                    const isToday = dateStr === `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
                    const isSelected = selected?.employee.id === emp.id && selected?.date === dateStr;

                    return (
                      <td key={d} style={{ padding: '4px 2px', textAlign: 'center', width: 30 }}>
                        <button
                          onClick={() => openMark(emp, dateStr)}
                          title={att ? `${meta?.label} — ${dateStr}` : `Mark attendance for ${emp.name} on ${dateStr}`}
                          style={{
                            width: 24, height: 24, borderRadius: 6, border: isSelected ? '2px solid #f97316' : isToday ? '2px solid #d1d5db' : '1.5px solid transparent',
                            cursor: 'pointer', fontSize: 10, fontWeight: 700,
                            background: meta ? meta.bg : '#f9fafb',
                            color: meta ? meta.color : '#d1d5db',
                            transition: 'all 0.1s',
                          }}
                          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = '#f97316'; }}
                          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = isToday ? '#d1d5db' : 'transparent'; }}
                        >
                          {meta ? meta.short : '·'}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mark Attendance Panel */}
      {selected && (
        <>
          <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: '#fff', borderRadius: 16, padding: 24, width: 360, maxWidth: '94vw',
            boxShadow: '0 12px 48px rgba(0,0,0,0.18)', zIndex: 201,
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{selected.employee.name}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{selected.date}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleMark} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Status buttons */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 6 }}>Status</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {Object.entries(STATUS_META).map(([key, meta]) => (
                    <button key={key} type="button"
                      onClick={() => setMarkForm(p => ({ ...p, status: key }))}
                      style={{ padding: '8px 10px', borderRadius: 9, border: '2px solid', cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.12s',
                        borderColor: markForm.status === key ? meta.color : '#e5e7eb',
                        background: markForm.status === key ? meta.bg : '#fff',
                        color: markForm.status === key ? meta.color : '#6b7280',
                        display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                      {markForm.status === key && <CheckCircle size={12} />}
                      {meta.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Check-in / Check-out */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Check In</label>
                  <input type="time" value={markForm.check_in} onChange={e => setMarkForm(p => ({ ...p, check_in: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Check Out</label>
                  <input type="time" value={markForm.check_out} onChange={e => setMarkForm(p => ({ ...p, check_out: e.target.value }))} style={inp} />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Notes</label>
                <input value={markForm.notes} onChange={e => setMarkForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes…" style={inp} />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
                <button type="submit" disabled={saving} className="btn-orange" style={{ flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13 }}>
                  {saving ? 'Saving…' : 'Save Attendance'}
                </button>
                <button type="button" onClick={() => setSelected(null)} style={{ padding: '10px 18px', borderRadius: 10, fontSize: 13, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
