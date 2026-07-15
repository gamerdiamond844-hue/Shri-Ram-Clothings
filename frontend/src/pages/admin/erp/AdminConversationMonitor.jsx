import { useEffect, useState } from 'react';
import { Search, Eye, RefreshCw, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../utils/api';

const formatDateTime = (dateString) => {
  const dt = new Date(dateString);
  return dt.toLocaleString('en-IN', { hour12: true, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function AdminConversationMonitor() {
  const [threads, setThreads] = useState([]);
  const [search, setSearch] = useState('');
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const fetchThreads = async () => {
    setLoading(true);
    try {
      const res = await api.get('/erp/communications/admin/private-threads', { params: { search: search.trim() } });
      setThreads(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (threadId) => {
    setLoadingMessages(true);
    try {
      const res = await api.get(`/erp/communications/private-threads/${threadId}/messages`);
      setActiveThread(res.data.thread || null);
      setMessages(res.data.messages || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to load conversation');
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(fetchThreads, 400);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#111827' }}>Conversation Monitor</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6, maxWidth: 640 }}>View any private conversation for security and compliance. Search by participant email, phone or name.</p>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', borderRadius: 12, padding: '10px 14px', boxShadow: '0 10px 30px rgba(15,23,42,0.06)' }}>
          <Eye size={18} color='#f59e0b' />
          <span style={{ fontSize: 13, color: '#111827', fontWeight: 700 }}>Admin oversight</span>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'minmax(320px, 360px) minmax(0, 1fr)', alignItems: 'start' }}>
        <section style={{ display: 'grid', gap: 18 }}>
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e5e7eb', padding: 20, display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Search conversations</label>
              <div style={{ position: 'relative' }}>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder='Search by participant name, email or phone'
                  style={{ width: '100%', borderRadius: 14, border: '1px solid #cbd5e1', padding: '14px 16px', fontSize: 14 }}
                />
                <Search size={18} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              </div>
            </div>
            {loading ? (
              <div style={{ color: '#64748b' }}>Loading conversations...</div>
            ) : threads.length === 0 ? (
              <div style={{ color: '#64748b' }}>No conversations found. Use search or refresh to find private threads.</div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {threads.map((thread) => (
                  <button
                    key={thread.id}
                    type='button'
                    onClick={() => fetchMessages(thread.id)}
                    style={{ display: 'grid', gap: 6, textAlign: 'left', padding: 14, borderRadius: 16, border: activeThread?.id === thread.id ? '1px solid #f59e0b' : '1px solid #e5e7eb', background: activeThread?.id === thread.id ? '#fffbeb' : '#fff', cursor: 'pointer' }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{thread.user_one_name} ↔ {thread.user_two_name}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{thread.last_message ? thread.last_message : 'No messages yet'}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{formatDateTime(thread.last_message_at)}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section style={{ display: 'grid', gap: 18, background: '#fff', borderRadius: 20, border: '1px solid #e5e7eb', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{activeThread ? `Conversation: ${activeThread.user_one_name} ↔ ${activeThread.user_two_name}` : 'Select a thread to inspect'}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{activeThread ? `Participants: ${activeThread.user_one_email || activeThread.user_one_phone} and ${activeThread.user_two_email || activeThread.user_two_phone}` : 'Admin can view every private thread for security monitoring.'}</div>
            </div>
            <button
              type='button'
              onClick={() => activeThread && fetchMessages(activeThread.id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 14, border: '1px solid #e5e7eb', background: '#fff', color: '#0f172a', cursor: activeThread ? 'pointer' : 'not-allowed' }}
              disabled={!activeThread}
            >
              <RefreshCw size={14} /> Refresh
            </button>
          </div>

          <div style={{ minHeight: 520, borderRadius: 18, border: '1px solid #e5e7eb', padding: 18, display: 'grid', gap: 12, overflowY: 'auto', background: '#f8fafc' }}>
            {loadingMessages ? (
              <div style={{ color: '#64748b' }}>Loading conversation details...</div>
            ) : !activeThread ? (
              <div style={{ color: '#64748b' }}>Choose a private conversation from the left to view its messages.</div>
            ) : messages.length === 0 ? (
              <div style={{ color: '#64748b' }}>This conversation has no messages yet.</div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} style={{ display: 'grid', gap: 8, padding: 16, borderRadius: 16, background: '#fff', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{msg.sender_name || 'Unknown'}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{formatDateTime(msg.created_at)}</div>
                  </div>
                  {msg.message_type === 'text' ? (
                    <div style={{ fontSize: 14, color: '#334155', whiteSpace: 'pre-wrap' }}>{msg.message}</div>
                  ) : (
                    <a href={msg.attachment_url} target='_blank' rel='noreferrer' style={{ color: '#1d4ed8', fontWeight: 700 }}>View attachment</a>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
