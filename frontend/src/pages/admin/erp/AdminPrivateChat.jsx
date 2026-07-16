import { useEffect, useState, useRef, useCallback } from 'react';
import { Search, Send, Phone, Video, RefreshCw, Circle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../utils/api';
import { io } from 'socket.io-client';

const formatDateTime = (dateString) => {
  const dt = new Date(dateString);
  return dt.toLocaleString('en-IN', { hour12: true, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
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
  const [connected, setConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);
  const activeThreadRef = useRef(null);

  // Keep ref in sync with state for socket handler
  useEffect(() => { activeThreadRef.current = activeThread; }, [activeThread]);

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  // Socket.IO
  useEffect(() => {
    const token = localStorage.getItem('src_token');
    if (!token) return;

    const baseURL = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
    const socket = io(baseURL || window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('private:message', (msg) => {
      const thread = activeThreadRef.current;
      if (thread && msg.thread_id === thread.id) {
        setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
      }
      // Update thread list last message
      setThreads(prev => prev.map(t =>
        t.id === msg.thread_id ? { ...t, last_message: msg.message, last_message_at: msg.created_at } : t
      ));
    });

    socket.on('typing:start', ({ userId, name }) => {
      const thread = activeThreadRef.current;
      if (thread && thread.participant_id === userId) setIsTyping(true);
    });

    socket.on('typing:stop', ({ userId }) => {
      const thread = activeThreadRef.current;
      if (thread && thread.participant_id === userId) setIsTyping(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const searchUsers = useCallback(async (query) => {
    if (!query || query.length < 2) { setResults([]); return; }
    setLoadingResults(true);
    try {
      const res = await api.get('/erp/communications/users/search', { params: { q: query } });
      setResults(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to search users');
    } finally {
      setLoadingResults(false);
    }
  }, []);

  const fetchThreads = useCallback(async () => {
    setLoadingThreads(true);
    try {
      const res = await api.get('/erp/communications/private-threads');
      setThreads(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to load threads');
    } finally {
      setLoadingThreads(false);
    }
  }, []);

  const fetchMessages = useCallback(async (threadId) => {
    if (!threadId) return;
    setLoadingMessages(true);
    try {
      const res = await api.get(`/erp/communications/private-threads/${threadId}/messages`);
      setMessages(res.data.messages || []);
      const thread = res.data.thread;
      setActiveThread(prev => ({ ...prev, ...thread }));
      // Join socket room for this thread
      socketRef.current?.emit('thread:join', { thread_id: threadId });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to load messages');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const openThread = useCallback(async (thread) => {
    // Leave previous thread room
    if (activeThread) {
      socketRef.current?.emit('thread:leave', { thread_id: activeThread.id });
    }
    setActiveThread(thread);
    await fetchMessages(thread.id);
  }, [activeThread, fetchMessages]);

  const createThread = async (user) => {
    try {
      const res = await api.post('/erp/communications/private-threads', { participant_id: user.id });
      toast.success(`Started private chat with ${user.name}`);
      await fetchThreads();
      const newThread = { ...res.data.thread, participant_name: user.name, participant_email: user.email, participant_phone: user.phone, participant_id: user.id };
      setActiveThread(newThread);
      await fetchMessages(res.data.thread.id);
      setSearch('');
      setResults([]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to start conversation');
    }
  };

  const startCall = (type) => {
    if (!activeThread) return;
    const roomName = `private-${activeThread.id}-${type}-${Date.now()}`;
    const params = new URLSearchParams({
      'config.startWithVideoMuted': type === 'voice' ? 'true' : 'false',
      'config.startWithAudioMuted': 'false',
    });
    window.open(`https://meet.jit.si/${roomName}?${params}`, '_blank');
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!activeThread || !message.trim()) return toast.error('Enter a message to send');

    // Try Socket.IO first
    if (socketRef.current?.connected) {
      socketRef.current.emit('private:send', { thread_id: activeThread.id, message: message.trim() });
      socketRef.current.emit('typing:stop', { thread_id: activeThread.id });
      setMessage('');
      return;
    }

    // Fallback to REST
    setSending(true);
    try {
      const res = await api.post(`/erp/communications/private-threads/${activeThread.id}/messages`, { message: message.trim(), message_type: 'text' });
      setMessages(prev => [...prev, res.data.message]);
      setMessage('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    if (socketRef.current?.connected && activeThread) {
      socketRef.current.emit('typing:start', { thread_id: activeThread.id });
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        socketRef.current?.emit('typing:stop', { thread_id: activeThread.id });
      }, 2000);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  useEffect(() => {
    const timeout = setTimeout(() => searchUsers(search), 350);
    return () => clearTimeout(timeout);
  }, [search, searchUsers]);

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#111827' }}>Private Messages</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6, maxWidth: 640 }}>
            Search users by email or phone, start private conversations with real-time delivery.
          </p>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', borderRadius: 12, padding: '8px 14px', border: '1px solid #e5e7eb' }}>
          <Circle size={8} fill={connected ? '#22c55e' : '#9ca3af'} color={connected ? '#22c55e' : '#9ca3af'} />
          <span style={{ fontSize: 12, color: connected ? '#16a34a' : '#9ca3af', fontWeight: 600 }}>
            {connected ? 'Live' : 'Polling'}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'minmax(280px, 320px) minmax(0, 1fr)', alignItems: 'start' }}>
        {/* Left panel */}
        <section style={{ display: 'grid', gap: 14 }}>
          {/* Search */}
          <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e5e7eb', padding: 18, display: 'grid', gap: 12 }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Find a user</label>
            <div style={{ position: 'relative' }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email or phone"
                style={{ width: '100%', borderRadius: 12, border: '1px solid #e5e7eb', padding: '11px 36px 11px 14px', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
              <Search size={15} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>
            <div style={{ minHeight: 80 }}>
              {loadingResults ? (
                <div style={{ color: '#64748b', fontSize: 13 }}>Searching...</div>
              ) : results.length === 0 && search.length >= 2 ? (
                <div style={{ color: '#64748b', fontSize: 13 }}>No users found.</div>
              ) : results.map((user) => (
                <button key={user.id} type="button" onClick={() => createThread(user)}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 12, border: '1px solid #e5e7eb', background: '#f8fafc', cursor: 'pointer', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{user.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{user.email || user.phone}</div>
                  </div>
                  <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 700 }}>Message</span>
                </button>
              ))}
            </div>
          </div>

          {/* Threads */}
          <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e5e7eb', padding: 18, display: 'grid', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Conversations</div>
              <button type="button" onClick={fetchThreads}
                style={{ border: '1px solid #e5e7eb', background: '#fff', color: '#374151', padding: '6px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                <RefreshCw size={12} /> Refresh
              </button>
            </div>
            {loadingThreads ? (
              <div style={{ color: '#64748b', fontSize: 13 }}>Loading...</div>
            ) : threads.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: 13 }}>No conversations yet.</div>
            ) : (
              <div style={{ display: 'grid', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
                {threads.map((thread) => (
                  <button key={thread.id} type="button" onClick={() => openThread(thread)}
                    style={{ display: 'grid', gap: 4, textAlign: 'left', padding: 12, borderRadius: 14, border: activeThread?.id === thread.id ? '1.5px solid #3b82f6' : '1px solid #e5e7eb', background: activeThread?.id === thread.id ? '#eff6ff' : '#fff', cursor: 'pointer' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{thread.participant_name || 'Unknown'}</div>
                    <div style={{ fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {thread.last_message || 'No messages yet'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right panel - Chat */}
        <section style={{ background: '#fff', borderRadius: 18, border: '1px solid #e5e7eb', padding: 20, display: 'grid', gap: 14 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: 14 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                {activeThread ? `Chat with ${activeThread.participant_name}` : 'Select a conversation'}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {activeThread ? (activeThread.participant_email || activeThread.participant_phone || '') : 'Choose a thread from the left panel'}
              </div>
            </div>
            {activeThread && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => startCall('voice')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#f0fdf4', color: '#16a34a', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
                  <Phone size={14} /> Voice
                </button>
                <button type="button" onClick={() => startCall('video')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#eff6ff', color: '#3b82f6', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
                  <Video size={14} /> Video
                </button>
              </div>
            )}
          </div>

          {/* Messages */}
          <div style={{ minHeight: 380, maxHeight: 480, borderRadius: 14, border: '1px solid #f3f4f6', padding: 16, overflowY: 'auto', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loadingMessages ? (
              <div style={{ color: '#64748b', fontSize: 13 }}>Loading messages...</div>
            ) : !activeThread ? (
              <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>Select a thread to view messages.</div>
            ) : messages.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>No messages yet. Send the first message.</div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.sender_user_id !== activeThread?.participant_id;
                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', gap: 3 }}>
                    <div style={{ maxWidth: '80%', padding: '10px 14px', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: isMe ? '#f97316' : '#fff', color: isMe ? '#fff' : '#0f172a', fontSize: 13, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                      {msg.message_type === 'text' ? (
                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.message}</div>
                      ) : (
                        <a href={msg.attachment_url} target="_blank" rel="noreferrer" style={{ color: isMe ? '#fff' : '#1d4ed8' }}>View attachment</a>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: '#9ca3af' }}>{msg.sender_name} · {formatDateTime(msg.created_at)}</div>
                  </div>
                );
              })
            )}
            {isTyping && (
              <div style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>
                {activeThread?.participant_name} is typing...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <textarea
              value={message}
              onChange={(e) => { setMessage(e.target.value); handleTyping(); }}
              onKeyDown={handleKeyDown}
              rows={3}
              placeholder={activeThread ? 'Type a message... (Enter to send)' : 'Select a conversation first'}
              disabled={!activeThread}
              style={{ flex: 1, borderRadius: 12, border: '1px solid #e5e7eb', padding: 12, resize: 'none', fontSize: 13, fontFamily: 'inherit', outline: 'none', background: activeThread ? '#fff' : '#f9fafb' }}
            />
            <button type="submit" disabled={!activeThread || sending || !message.trim()}
              style={{ padding: '14px 18px', borderRadius: 12, border: 'none', cursor: activeThread && message.trim() ? 'pointer' : 'not-allowed', background: activeThread && message.trim() ? '#f97316' : '#f3f4f6', color: activeThread && message.trim() ? '#fff' : '#9ca3af', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <Send size={15} />
              {sending ? 'Sending...' : 'Send'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
