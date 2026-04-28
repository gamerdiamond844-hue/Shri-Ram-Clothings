import { useState, useEffect, useCallback } from 'react';
import { Search, Eye, Trash2, Send, Download, X, MessageSquare } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const STATUS_STYLE = {
  pending:     { bg: '#fef9c3', color: '#854d0e', label: 'Pending' },
  in_progress: { bg: '#dbeafe', color: '#1e40af', label: 'In Progress' },
  resolved:    { bg: '#dcfce7', color: '#166534', label: 'Resolved' },
};
const PRIORITY_STYLE = {
  high:   { bg: '#fee2e2', color: '#991b1b' },
  medium: { bg: '#fff7ed', color: '#c2410c' },
  low:    { bg: '#f3f4f6', color: '#374151' },
};

const inp = { width: '100%', padding: '9px 12px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff' };

export default function AdminQueries() {
  const [queries, setQueries] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null); // detail view
  const [reply, setReply] = useState('');
  const [replying, setReplying] = useState(false);
  const LIMIT = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: LIMIT });
      if (statusFilter)   p.set('status', statusFilter);
      if (priorityFilter) p.set('priority', priorityFilter);
      if (search)         p.set('search', search);
      const [qRes, sRes] = await Promise.all([
        api.get(`/admin/queries?${p}`),
        api.get('/admin/queries/stats'),
      ]);
      setQueries(qRes.data.queries || []);
      setTotal(qRes.data.total || 0);
      setStats(sRes.data);
    } catch { toast.error('Failed to load queries'); }
    finally { setLoading(false); }
  }, [page, statusFilter, priorityFilter, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [statusFilter, priorityFilter, search]);

  const openDetail = async (q) => {
    setSelected(q);
    setReply(q.admin_reply || '');
  };

  const handleReply = async () => {
    if (!reply.trim()) return toast.error('Please write a reply');
    setReplying(true);
    try {
      const res = await api.post(`/admin/queries/${selected.id}/reply`, { reply });
      setSelected(res.data);
      toast.success('Reply sent to customer!');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setReplying(false); }
  };

  const updateStatus = async (id, status) => {
    try {
      const res = await api.put(`/admin/queries/${id}`, { status });
      if (selected?.id === id) setSelected(res.data);
      load();
      toast.success(`Marked as ${status.replace('_', ' ')}`);
    } catch { toast.error('Failed'); }
  };

  const updatePriority = async (id, priority) => {
    try {
      const res = await api.put(`/admin/queries/${id}`, { priority });
      if (selected?.id === id) setSelected(res.data);
      load();
    } catch { toast.error('Failed'); }
  };

  const deleteQuery = async (id) => {
    if (!confirm('Delete this query?')) return;
    try {
      await api.delete(`/admin/queries/${id}`);
      toast.success('Deleted');
      if (selected?.id === id) setSelected(null);
      load();
    } catch { toast.error('Failed'); }
  };

  const exportCSV = () => {
    window.open('/api/admin/queries/export', '_blank');
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }} className="grid-features">
          {[
            { label: 'Total Queries', value: stats.total, bg: '#f9fafb', color: '#111827' },
            { label: 'Pending', value: stats.pending, bg: '#fef9c3', color: '#854d0e' },
            { label: 'In Progress', value: stats.in_progress, bg: '#dbeafe', color: '#1e40af' },
            { label: 'Resolved', value: stats.resolved, bg: '#dcfce7', color: '#166534' },
          ].map(({ label, value, bg, color }) => (
            <div key={label} style={{ background: bg, borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: 12, color, opacity: 0.7, marginTop: 3, fontWeight: 500 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {/* Status filter */}
          {[['', 'All'], ['pending', 'Pending'], ['in_progress', 'In Progress'], ['resolved', 'Resolved']].map(([val, label]) => (
            <button key={val} onClick={() => setStatusFilter(val)}
              style={{ padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: statusFilter === val ? '#f97316' : '#fff', color: statusFilter === val ? '#fff' : '#6b7280', boxShadow: statusFilter === val ? '0 2px 8px rgba(249,115,22,0.3)' : '0 0 0 1.5px #e5e7eb', transition: 'all 0.15s' }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email, ticket..."
              style={{ ...inp, paddingLeft: 32, width: 200 }} />
          </div>
          <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151' }}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 16 }}>

        {/* Queries table */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Ticket', 'Customer', 'Subject', 'Priority', 'Status', 'Date', 'Actions'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}><td colSpan={7} style={{ padding: '10px 14px' }}><div className="skeleton" style={{ height: 32, borderRadius: 8 }} /></td></tr>
                  ))
                ) : queries.map(q => {
                  const ss = STATUS_STYLE[q.status] || STATUS_STYLE.pending;
                  const ps = PRIORITY_STYLE[q.priority] || PRIORITY_STYLE.medium;
                  return (
                    <tr key={q.id} style={{ borderTop: '1px solid #f9fafb', background: selected?.id === q.id ? '#fff7ed' : 'transparent', cursor: 'pointer' }}
                      onMouseEnter={e => { if (selected?.id !== q.id) e.currentTarget.style.background = '#fafafa'; }}
                      onMouseLeave={e => { if (selected?.id !== q.id) e.currentTarget.style.background = 'transparent'; }}>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#f97316' }}>{q.ticket_id}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#111827', fontSize: 12 }}>{q.name}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{q.email}</div>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#374151', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.subject}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 100, background: ps.bg, color: ps.color, textTransform: 'capitalize' }}>{q.priority}</span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 100, background: ss.bg, color: ss.color }}>{ss.label}</span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 11, whiteSpace: 'nowrap' }}>{new Date(q.created_at).toLocaleDateString('en-IN')}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => openDetail(q)} title="View"
                            style={{ width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fff7ed', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Eye size={13} />
                          </button>
                          <button onClick={() => deleteQuery(q.id)} title="Delete"
                            style={{ width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!loading && !queries.length && (
                  <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                    <MessageSquare size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                    No queries found
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#9ca3af' }}>{total} queries</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding: '5px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, opacity: page === 1 ? 0.4 : 1 }}>Prev</button>
                <span style={{ padding: '5px 10px', color: '#6b7280' }}>{page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ padding: '5px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, opacity: page === totalPages ? 0.4 : 1 }}>Next</button>
              </div>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#f97316' }}>{selected.ticket_id}</span>
                <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>{selected.subject}</span>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}><X size={18} /></button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Customer info */}
              <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px' }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Customer</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{selected.name}</p>
                <p style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{selected.email}</p>
                {selected.phone && <p style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{selected.phone}</p>}
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>{new Date(selected.created_at).toLocaleString('en-IN')}</p>
              </div>

              {/* Message */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Message</p>
                <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, background: '#f9fafb', borderRadius: 10, padding: '12px 14px' }}>{selected.message}</p>
              </div>

              {/* Attachment */}
              {selected.attachment_url && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Attachment</p>
                  <a href={selected.attachment_url} target="_blank" rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#f97316', fontWeight: 600, textDecoration: 'none', background: '#fff7ed', padding: '6px 12px', borderRadius: 8 }}>
                    📎 View Attachment
                  </a>
                </div>
              )}

              {/* Status & Priority controls */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Status</p>
                  <select value={selected.status} onChange={e => updateStatus(selected.id, e.target.value)}
                    style={{ ...inp, fontSize: 12 }}>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Priority</p>
                  <select value={selected.priority} onChange={e => updatePriority(selected.id, e.target.value)}
                    style={{ ...inp, fontSize: 12 }}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              {/* Previous reply */}
              {selected.admin_reply && (
                <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: '#c2410c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Previous Reply</p>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{selected.admin_reply}</p>
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>Sent: {selected.replied_at ? new Date(selected.replied_at).toLocaleString('en-IN') : '—'}</p>
                </div>
              )}

              {/* Reply box */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  {selected.admin_reply ? 'Update Reply' : 'Write Reply'}
                </p>
                <textarea value={reply} onChange={e => setReply(e.target.value)}
                  placeholder="Type your response to the customer..."
                  rows={4}
                  style={{ ...inp, resize: 'none' }} />
                <button onClick={handleReply} disabled={replying} className="btn-orange"
                  style={{ marginTop: 10, padding: '10px 20px', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Send size={14} /> {replying ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
