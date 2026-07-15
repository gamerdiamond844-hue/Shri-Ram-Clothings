import { useEffect, useState, useRef } from 'react';
import { Search, Send, Image, Phone, Video, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../utils/api';

const formatDateTime = (dateString) => {
  const dt = new Date(dateString);
  return dt.toLocaleString('en-IN', { hour12: true, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function AdminPrivateChat() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const intervalRef = useRef(null);

  const searchUsers = async (query) => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    setLoadingResults(true);
    try {
      const res = await api.get('/erp/communications/users/search', { params: { q: query } });
      setResults(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to search users');
    } finally {
      setLoadingResults(false);
    }
  };

  const fetchThreads = async () => {
    setLoadingThreads(true);
    try {
      const res = await api.get('/erp/communications/private-threads');
      setThreads(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to load threads');
    } finally {
      setLoadingThreads(false);
    }
  };

  const fetchMessages = async (threadId) => {
    if (!threadId) return;
    setLoadingMessages(true);
    try {
      const res = await api.get(`/erp/communications/private-threads/${threadId}/messages`);
      setMessages(res.data.messages || []);
      setActiveThread(res.data.thread || null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const createThread = async (user) => {
    try {
      const res = await api.post('/erp/communications/private-threads', { participant_id: user.id });
      toast.success(`Started private chat with ${user.name}`);
      await fetchThreads();
      fetchMessages(res.data.thread.id);
      setSearch('');
      setResults([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to start conversation');
    }
  };

  const startCall = (type) => {
    if (!activeThread) return;
    const roomName = `private-chat-${activeThread.id}-${type}-${Date.now()}`;
    const base = `https://meet.jit.si/${roomName}`;
    const params = new URLSearchParams({
      'config.startWithAudioMuted': type === 'voice' ? 'false' : 'false',
      'config.startWithVideoMuted': type === 'voice' ? 'true' : 'false',
      'userInfo.displayName': encodeURIComponent(activeThread.participant_name || 'Chat User'),
    });
    window.open(`${base}?${params.toString()}`, '_blank');
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!activeThread || (!message.trim())) return toast.error('Enter a message to send');
    setSending(true);
    try {
      const res = await api.post(`/erp/communications/private-threads/${activeThread.id}/messages`, { message: message.trim(), message_type: 'text' });
      setMessages((prev) => [...prev, res.data.message]);
      setMessage('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    fetchThreads();
    intervalRef.current = setInterval(() => {
      if (activeThread) fetchMessages(activeThread.id);
    }, 5000);
    return () => clearInterval(intervalRef.current);
  }, [activeThread]);

  useEffect(() => {
    const timeout = setTimeout(() => searchUsers(search), 350);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#111827' }}>Private Messages</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6, maxWidth: 640 }}>Search users by email or phone, start private conversations, and view threads with full admin oversight.</p>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', borderRadius: 12, padding: '10px 14px', boxShadow: '0 10px 30px rgba(15,23,42,0.06)' }}>
          <Search size={18} color='#10b981' />
          <span style={{ fontSize: 13, color: '#111827', fontWeight: 700 }}>Connect instantly</span>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'minmax(280px, 320px) minmax(0, 1fr)', alignItems: 'start' }}>
        <section style={{ display: 'grid', gap: 18 }}>
          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e5e7eb', padding: 20, display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Search users by email or phone</label>
              <div style={{ position: 'relative' }}>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder='Search users by name, email or phone'
                  style={{ width: '100%', borderRadius: 14, border: '1px solid #cbd5e1', padding: '14px 16px', fontSize: 14 }}
                />
                <Search size={18} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              </div>
            </div>

            <div style={{ minHeight: 120, display: 'grid', gap: 10 }}>
              {loadingResults ? (
                <div style={{ color: '#64748b' }}>Searching users...</div>
              ) : results.length === 0 ? (
                <div style={{ color: '#64748b' }}>Search results will appear here.</div>
              ) : (
                results.map((user) => (
                  <button
                    key={user.id}
                    type='button'
                    onClick={() => createThread(user)}
                    style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center', width: '100%', textAlign: 'left', padding: 14, borderRadius: 16, border: '1px solid #e5e7eb', background: '#f8fafc', cursor: 'pointer' }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{user.name || 'Unknown User'}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{user.email || user.phone}</div>
                    </div>
                    <span style={{ fontSize: 12, color: '#2563eb', fontWeight: 700 }}>Message</span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e5e7eb', padding: 20, display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Your conversations</div>
              <button
                type='button'
                onClick={fetchThreads}
                style={{ border: '1px solid #e5e7eb', background: '#fff', color: '#0f172a', padding: '8px 14px', borderRadius: 12, cursor: 'pointer', fontWeight: 600 }}
              >
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
            {loadingThreads ? (
              <div style={{ color: '#64748b' }}>Loading threads...</div>
            ) : threads.length === 0 ? (
              <div style={{ color: '#64748b' }}>No conversations yet. Start one by searching for a user above.</div>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {threads.map((thread) => (
                  <button
                    key={thread.id}
                    type='button'
                    onClick={() => fetchMessages(thread.id)}
                    style={{ display: 'grid', gap: 6, textAlign: 'left', padding: 14, borderRadius: 16, border: activeThread?.id === thread.id ? '1px solid #3b82f6' : '1px solid #e5e7eb', background: activeThread?.id === thread.id ? '#eff6ff' : '#fff', cursor: 'pointer' }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{thread.participant_name || 'Unknown'}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{thread.participant_email || thread.participant_phone}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{thread.last_message ? thread.last_message : 'No messages yet'}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section style={{ display: 'grid', gap: 18, background: '#fff', borderRadius: 20, border: '1px solid #e5e7eb', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{activeThread ? `Chat with ${activeThread.participant_name}` : 'Select a conversation'}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{activeThread ? activeThread.participant_email || activeThread.participant_phone : 'Choose a thread from the left panel to start.'}</div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type='button' style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 14, border: '1px solid #e5e7eb', background: '#fff', color: '#0f172a', fontWeight: 700 }}>
                <Phone size={16} /> Voice
              </button>
              <button type='button' style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 14, border: '1px solid #e5e7eb', background: '#fff', color: '#0f172a', fontWeight: 700 }}>
                <Video size={16} /> Video
              </button>
            </div>
          </div>

          <div style={{ minHeight: 420, borderRadius: 18, border: '1px solid #e5e7eb', padding: 18, display: 'grid', gap: 12, overflowY: 'auto', background: '#f8fafc' }}>
            {loadingMessages ? (
              <div style={{ color: '#64748b' }}>Loading messages...</div>
            ) : messages.length === 0 ? (
              <div style={{ color: '#64748b' }}>{activeThread ? 'No messages yet. Send the first message.' : 'Select a thread to view its messages.'}</div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{ display: 'grid', gap: 6, padding: 14, borderRadius: 16, background: msg.sender_user_id === activeThread?.participant_id ? '#fff' : '#e0f2fe', justifySelf: msg.sender_user_id === activeThread?.participant_id ? 'start' : 'end', maxWidth: '85%' }}
                >
                  <div style={{ fontSize: 12, color: '#475569', fontWeight: 700 }}>{msg.sender_name || 'You'}</div>
                  {msg.message_type === 'text' ? (
                    <div style={{ fontSize: 14, color: '#0f172a', whiteSpace: 'pre-wrap' }}>{msg.message}</div>
                  ) : (
                    <a href={msg.attachment_url} target='_blank' rel='noreferrer' style={{ fontSize: 14, color: '#1d4ed8' }}>View attachment</a>
                  )}
                  <div style={{ fontSize: 11, color: '#64748b' }}>{formatDateTime(msg.created_at)}</div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={sendMessage} style={{ display: 'grid', gap: 12 }}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder='Type your message...'
              style={{ width: '100%', borderRadius: 16, border: '1px solid #cbd5e1', padding: 14, resize: 'vertical', fontSize: 14 }}
              disabled={!activeThread}
            />
            <button
              type='submit'
              disabled={!activeThread || sending}
              style={{ width: 160, padding: '12px 16px', borderRadius: 14, border: 'none', cursor: activeThread ? 'pointer' : 'not-allowed', background: activeThread ? '#10b981' : '#94a3b8', color: '#fff', fontWeight: 700 }}
            >
              {sending ? 'Sending...' : 'Send Message'}
              <Send size={16} style={{ marginLeft: 8 }} />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
