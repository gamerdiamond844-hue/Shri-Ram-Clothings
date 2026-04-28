import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Copy, CheckCircle, Clock, AlertCircle, RefreshCw, MessageSquare, Paperclip, ArrowRight } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     color: '#854d0e', bg: '#fef9c3', border: '#fde68a', icon: Clock,        step: 1 },
  in_progress: { label: 'In Progress', color: '#1e40af', bg: '#dbeafe', border: '#bfdbfe', icon: AlertCircle,  step: 2 },
  resolved:    { label: 'Resolved',    color: '#166534', bg: '#dcfce7', border: '#bbf7d0', icon: CheckCircle,  step: 3 },
};

const PRIORITY_CONFIG = {
  low:    { label: 'Low',    color: '#374151', bg: '#f3f4f6' },
  medium: { label: 'Medium', color: '#c2410c', bg: '#fff7ed' },
  high:   { label: 'High',   color: '#991b1b', bg: '#fee2e2' },
};

const inp = {
  width: '100%', padding: '11px 14px', fontSize: 14,
  border: '1.5px solid #e5e7eb', borderRadius: 10,
  outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff',
};

export default function TrackQuery() {
  const [searchParams] = useSearchParams();
  const [ticketId, setTicketId] = useState(searchParams.get('id') || '');
  const [email, setEmail] = useState('');
  const [query, setQuery] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Auto-search if ID in URL
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) { setTicketId(id); handleTrack(id); }
  }, []);

  const handleTrack = async (id) => {
    const tid = (id || ticketId).trim();
    if (!tid) return setError('Please enter your Ticket ID');
    setError('');
    setLoading(true);
    setQuery(null);
    try {
      const params = new URLSearchParams({ ticket_id: tid });
      if (email.trim()) params.set('email', email.trim());
      const res = await api.get(`/admin/queries/track?${params}`);
      setQuery(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to find query. Please check your Ticket ID.');
    } finally { setLoading(false); }
  };

  const copyId = () => {
    navigator.clipboard.writeText(query?.ticket_id || ticketId);
    setCopied(true);
    toast.success('Ticket ID copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const s = query ? (STATUS_CONFIG[query.status] || STATUS_CONFIG.pending) : null;
  const p = query ? (PRIORITY_CONFIG[query.priority] || PRIORITY_CONFIG.medium) : null;

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>

      {/* Hero */}
      <div style={{ background: '#111827', padding: '48px 0 40px' }}>
        <div className="wrap" style={{ textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(249,115,22,0.12)', color: '#fb923c', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '5px 12px', borderRadius: 100, marginBottom: 16 }}>
            🔍 Query Tracker
          </div>
          <h1 className="font-display" style={{ fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 900, color: '#fff', marginBottom: 12 }}>
            Track Your Query
          </h1>
          <p style={{ fontSize: 15, color: '#9ca3af', maxWidth: 440, margin: '0 auto' }}>
            Enter your Ticket ID to check the status of your support query.
          </p>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 40, paddingBottom: 64, maxWidth: 680 }}>

        {/* Search box */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', padding: '24px', marginBottom: 24 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 16 }}>Enter Ticket Details</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Ticket ID *
              </label>
              <input
                value={ticketId}
                onChange={e => setTicketId(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleTrack()}
                placeholder="e.g. SRC-ABC123"
                style={{ ...inp, fontFamily: 'monospace', letterSpacing: '0.05em', textTransform: 'uppercase' }}
                onFocus={e => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Email <span style={{ color: '#9ca3af', fontWeight: 400 }}>(optional — for extra security)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleTrack()}
                placeholder="you@example.com"
                style={inp}
                onFocus={e => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={15} style={{ flexShrink: 0 }} /> {error}
              </div>
            )}

            <button onClick={() => handleTrack()} disabled={loading} className="btn-orange"
              style={{ padding: '12px', borderRadius: 12, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading ? <><RefreshCw size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> Searching...</> : <><Search size={16} /> Track Query</>}
            </button>
          </div>
        </div>

        {/* Query result */}
        {query && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="fade-in">

            {/* Header card */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 800, color: '#f97316' }}>{query.ticket_id}</span>
                    <button onClick={copyId} title="Copy Ticket ID"
                      style={{ width: 28, height: 28, borderRadius: 7, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: copied ? '#22c55e' : '#6b7280', transition: 'all 0.15s' }}>
                      {copied ? <CheckCircle size={13} /> : <Copy size={13} />}
                    </button>
                  </div>
                  <p style={{ fontSize: 13, color: '#9ca3af' }}>
                    Submitted: {new Date(query.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 100, background: s.bg, color: s.color, border: `1px solid ${s.border}`, display: 'flex', alignItems: 'center', gap: 5 }}>
                    <s.icon size={12} /> {s.label}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 100, background: p.bg, color: p.color, textTransform: 'capitalize' }}>
                    {p.label} Priority
                  </span>
                </div>
              </div>

              {/* Status timeline */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 8 }}>
                {[
                  { label: 'Submitted', step: 1 },
                  { label: 'In Progress', step: 2 },
                  { label: 'Resolved', step: 3 },
                ].map((item, i) => {
                  const currentStep = STATUS_CONFIG[query.status]?.step || 1;
                  const done = currentStep >= item.step;
                  const active = currentStep === item.step;
                  return (
                    <div key={item.label} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 'none' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: done ? '#f97316' : '#f3f4f6', border: `2px solid ${done ? '#f97316' : '#e5e7eb'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s', boxShadow: active ? '0 0 0 4px rgba(249,115,22,0.15)' : 'none' }}>
                          {done ? <CheckCircle size={14} color="#fff" /> : <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d1d5db', display: 'block' }} />}
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 600, color: done ? '#f97316' : '#9ca3af', whiteSpace: 'nowrap' }}>{item.label}</span>
                      </div>
                      {i < 2 && (
                        <div style={{ flex: 1, height: 2, background: currentStep > item.step ? '#f97316' : '#e5e7eb', margin: '0 4px', marginBottom: 16, transition: 'background 0.3s' }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Query details */}
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', padding: '20px 24px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                <MessageSquare size={15} color="#f97316" /> Query Details
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="form-grid-2">
                  <div style={{ background: '#f9fafb', borderRadius: 10, padding: '10px 14px' }}>
                    <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Name</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{query.name}</p>
                  </div>
                  <div style={{ background: '#f9fafb', borderRadius: 10, padding: '10px 14px' }}>
                    <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Subject</p>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{query.subject}</p>
                  </div>
                </div>
                <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px' }}>
                  <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Your Message</p>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7 }}>{query.message}</p>
                </div>
                {query.attachment_url && (
                  <a href={query.attachment_url} target="_blank" rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#f97316', fontWeight: 600, textDecoration: 'none', background: '#fff7ed', padding: '6px 12px', borderRadius: 8, width: 'fit-content' }}>
                    <Paperclip size={13} /> View Attachment
                  </a>
                )}
              </div>
            </div>

            {/* Admin reply */}
            {query.admin_reply ? (
              <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #bbf7d0', padding: '20px 24px' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#166534', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={15} /> Support Team Response
                </p>
                <div style={{ background: '#f0fdf4', borderLeft: '4px solid #22c55e', borderRadius: '0 10px 10px 0', padding: '14px 16px', marginBottom: 10 }}>
                  <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.7 }}>{query.admin_reply}</p>
                </div>
                {query.replied_at && (
                  <p style={{ fontSize: 11, color: '#9ca3af' }}>
                    Replied on: {new Date(query.replied_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', padding: '20px 24px', textAlign: 'center' }}>
                <Clock size={28} style={{ margin: '0 auto 10px', color: '#d1d5db' }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Awaiting Response</p>
                <p style={{ fontSize: 13, color: '#9ca3af' }}>Our team will respond within 24–48 hours.</p>
              </div>
            )}

            {/* Last updated */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <p style={{ fontSize: 12, color: '#9ca3af' }}>
                Last updated: {new Date(query.updated_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
              <button onClick={() => handleTrack()} disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#f97316', background: '#fff7ed', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: 8 }}>
                <RefreshCw size={12} style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} /> Refresh Status
              </button>
            </div>
          </div>
        )}

        {/* Help links */}
        {!query && !loading && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', padding: '20px 24px', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>Don't have a Ticket ID yet?</p>
            <Link to="/contact" className="btn-orange" style={{ padding: '10px 24px', borderRadius: 12, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              Submit a Query <ArrowRight size={15} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
