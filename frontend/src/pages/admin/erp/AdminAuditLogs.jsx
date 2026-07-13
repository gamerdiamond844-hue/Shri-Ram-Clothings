import { useState, useEffect, useCallback } from 'react';
import { Search, RefreshCw, Download, ChevronLeft, ChevronRight, AlertCircle, Filter } from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const PAGE_SIZE = 25;

const TARGET_TYPES = [
  { value: '',          label: 'All Types' },
  { value: 'sale',      label: 'Sale' },
  { value: 'return',    label: 'Return' },
  { value: 'customer',  label: 'Customer' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'expense',   label: 'Expense' },
  { value: 'settings',  label: 'Settings' },
];

const ROLE_COLORS = {
  super_admin:       { bg: '#fef9c3', color: '#854d0e' },
  business_owner:    { bg: '#fce7f3', color: '#9d174d' },
  store_admin:       { bg: '#ede9fe', color: '#5b21b6' },
  store_manager:     { bg: '#dbeafe', color: '#1d4ed8' },
  cashier:           { bg: '#d1fae5', color: '#065f46' },
  warehouse_manager: { bg: '#ffedd5', color: '#9a3412' },
  accountant:        { bg: '#e0f2fe', color: '#0369a1' },
  employee:          { bg: '#f3f4f6', color: '#374151' },
};

const roleBadgeStyle = (role) => {
  const c = ROLE_COLORS[role] || { bg: '#f3f4f6', color: '#374151' };
  return {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 100,
    fontSize: 10,
    fontWeight: 700,
    background: c.bg,
    color: c.color,
    textTransform: 'capitalize',
    whiteSpace: 'nowrap',
  };
};

const inp = {
  padding: '8px 12px',
  fontSize: 13,
  border: '1.5px solid #e5e7eb',
  borderRadius: 8,
  outline: 'none',
  color: '#111827',
  background: '#fff',
  fontFamily: 'inherit',
};

const formatDate = (iso) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return iso;
  }
};

const truncate = (text, max = 60) => {
  if (!text) return '—';
  const s = typeof text === 'object' ? JSON.stringify(text) : String(text);
  return s.length > max ? `${s.slice(0, max)}…` : s;
};

// Skeleton row
const SkeletonRow = () => (
  <tr>
    {Array.from({ length: 7 }).map((_, i) => (
      <td key={i} style={{ padding: '11px 14px' }}>
        <div style={{ height: 14, borderRadius: 6, background: 'linear-gradient(90deg,#f3f4f6 25%,#e9eaec 50%,#f3f4f6 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', width: i === 6 ? '80%' : '100%' }} />
      </td>
    ))}
  </tr>
);

export default function AdminAuditLogs() {
  const [logs,    setLogs]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [actor,       setActor]      = useState('');
  const [action,      setAction]     = useState('');
  const [fromDate,    setFromDate]   = useState('');
  const [toDate,      setToDate]     = useState('');
  const [targetType,  setTargetType] = useState('');

  // Debounced actor/action for live search
  const [debouncedActor,  setDebouncedActor]  = useState('');
  const [debouncedAction, setDebouncedAction] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedActor(actor), 350);
    return () => clearTimeout(t);
  }, [actor]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedAction(action), 350);
    return () => clearTimeout(t);
  }, [action]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [debouncedActor, debouncedAction, fromDate, toDate, targetType]);

  const buildParams = useCallback(() => {
    const p = new URLSearchParams({ page, limit: PAGE_SIZE });
    if (debouncedActor)  p.set('actor',       debouncedActor);
    if (debouncedAction) p.set('action',       debouncedAction);
    if (fromDate)        p.set('from',         fromDate);
    if (toDate)          p.set('to',           toDate);
    if (targetType)      p.set('target_type',  targetType);
    return p.toString();
  }, [page, debouncedActor, debouncedAction, fromDate, toDate, targetType]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/erp/audit-logs/paginated?${buildParams()}`);
      setLogs(res.data.logs   || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load audit logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const p = new URLSearchParams();
      if (debouncedActor)  p.set('actor',       debouncedActor);
      if (debouncedAction) p.set('action',       debouncedAction);
      if (fromDate)        p.set('from',         fromDate);
      if (toDate)          p.set('to',           toDate);
      if (targetType)      p.set('target_type',  targetType);

      const res = await api.get(`/erp/audit-logs/export?${p.toString()}`, { responseType: 'blob' });
      const url  = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href  = url;
      link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setActor(''); setAction(''); setFromDate(''); setToDate(''); setTargetType('');
  };
  const hasFilters = actor || action || fromDate || toDate || targetType;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .audit-row:hover { background: #fafafa !important; }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111827' }}>Audit Logs</h2>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>Read-only activity history — all admin actions recorded here</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={fetchLogs}
            disabled={loading}
            title="Refresh"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151', opacity: loading ? 0.6 : 1 }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: exporting ? 0.7 : 1 }}
          >
            <Download size={14} />
            {exporting ? 'Exporting…' : 'Export Excel'}
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f3f4f6', padding: '14px 16px', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
        {/* Actor search */}
        <div style={{ position: 'relative', flex: '1 1 160px', minWidth: 140 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
          <input
            value={actor}
            onChange={e => setActor(e.target.value)}
            placeholder="Actor name…"
            style={{ ...inp, width: '100%', paddingLeft: 30, boxSizing: 'border-box' }}
          />
        </div>

        {/* Action type */}
        <div style={{ position: 'relative', flex: '1 1 160px', minWidth: 140 }}>
          <Filter size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
          <input
            value={action}
            onChange={e => setAction(e.target.value)}
            placeholder="Action type…"
            style={{ ...inp, width: '100%', paddingLeft: 30, boxSizing: 'border-box' }}
          />
        </div>

        {/* Date from */}
        <div style={{ flex: '1 1 140px', minWidth: 130 }}>
          <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: 3 }}>From</label>
          <input
            type="datetime-local"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            style={{ ...inp, width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        {/* Date to */}
        <div style={{ flex: '1 1 140px', minWidth: 130 }}>
          <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: 3 }}>To</label>
          <input
            type="datetime-local"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            style={{ ...inp, width: '100%', boxSizing: 'border-box' }}
          />
        </div>

        {/* Target type */}
        <div style={{ flex: '1 1 140px', minWidth: 130 }}>
          <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 600, display: 'block', marginBottom: 3 }}>Target Type</label>
          <select
            value={targetType}
            onChange={e => setTargetType(e.target.value)}
            style={{ ...inp, width: '100%', boxSizing: 'border-box' }}
          >
            {TARGET_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {hasFilters && (
          <button
            onClick={clearFilters}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid #fca5a5', background: '#fef2f2', color: '#dc2626', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', alignSelf: 'flex-end' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertCircle size={16} color="#dc2626" />
          <span style={{ fontSize: 13, color: '#dc2626', flex: 1 }}>{error}</span>
          <button
            onClick={fetchLogs}
            style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Timestamp', 'Actor', 'Role', 'Action', 'Target Type', 'Target ID', 'Details'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '56px 24px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <Search size={32} color="#e5e7eb" />
                      <span style={{ color: '#9ca3af', fontSize: 13 }}>
                        {hasFilters ? 'No logs match the current filters.' : 'No audit log entries yet.'}
                      </span>
                      {hasFilters && (
                        <button onClick={clearFilters} style={{ fontSize: 12, color: '#f97316', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr
                    key={log.id}
                    className="audit-row"
                    style={{ borderTop: '1px solid #f9fafb', background: 'transparent' }}
                  >
                    <td style={{ padding: '11px 14px', whiteSpace: 'nowrap', color: '#6b7280', fontSize: 12 }}>
                      {formatDate(log.created_at)}
                    </td>
                    <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontWeight: 600, color: '#111827' }}>{log.actor_name || <span style={{ color: '#9ca3af' }}>System</span>}</span>
                    </td>
                    <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                      {log.actor_role
                        ? <span style={roleBadgeStyle(log.actor_role)}>{log.actor_role.replace(/_/g, ' ')}</span>
                        : <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ background: '#f0f9ff', color: '#0369a1', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                        {log.action || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                      {log.target_type
                        ? <span style={{ background: '#fefce8', color: '#854d0e', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 6 }}>{log.target_type}</span>
                        : <span style={{ color: '#d1d5db' }}>—</span>
                      }
                    </td>
                    <td style={{ padding: '11px 14px', color: '#6b7280', fontFamily: 'monospace', fontSize: 12 }}>
                      {log.target_id || <span style={{ color: '#d1d5db' }}>—</span>}
                    </td>
                    <td style={{ padding: '11px 14px', color: '#6b7280', maxWidth: 260 }}>
                      <span title={typeof log.details === 'object' ? JSON.stringify(log.details) : (log.details || '')}>
                        {truncate(log.details, 70)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && total > 0 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>
              {total.toLocaleString()} entries · Page {page} of {totalPages}
            </span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: page === 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page === 1 ? 0.4 : 1 }}
              >
                <ChevronLeft size={15} color="#374151" />
              </button>

              {/* Page number pills */}
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let p;
                if (totalPages <= 7) {
                  p = i + 1;
                } else if (page <= 4) {
                  p = i + 1;
                } else if (page >= totalPages - 3) {
                  p = totalPages - 6 + i;
                } else {
                  p = page - 3 + i;
                }
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{ width: 32, height: 32, borderRadius: 8, border: `1.5px solid ${p === page ? '#f97316' : '#e5e7eb'}`, background: p === page ? '#fff7ed' : '#fff', cursor: 'pointer', fontSize: 12, fontWeight: p === page ? 700 : 400, color: p === page ? '#f97316' : '#374151' }}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: page === totalPages ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: page === totalPages ? 0.4 : 1 }}
              >
                <ChevronRight size={15} color="#374151" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
