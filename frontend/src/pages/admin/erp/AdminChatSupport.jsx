import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Send, RefreshCw, Circle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../utils/api';
import { io } from 'socket.io-client';

const formatDateTime = (dateString) => {
  const dt = new Date(dateString);
  return dt.toLocaleString('en-IN', { hour12: true, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export default function AdminChatSupport() {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/erp/communications/chat/messages');
      setMessages(res.data.messages || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to load chat messages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Socket.IO connection
  useEffect(() => {
    const token = localStorage.getItem('src_token');
    if (!token) return;

    const baseURL = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
    const socket = io(baseURL || window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('chat:message', (msg) => {
      setMessages(prev => {
        // Avoid duplicates
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    socket.on('typing:start', ({ userId, name }) => {
      setTypingUsers(prev => prev.includes(name) ? prev : [...prev, name]);
    });

    socket.on('typing:stop', ({ userId }) => {
      setTypingUsers(prev => prev.filter((_, i) => i !== 0)); // simple removal
    });

    socket.on('connect_error', () => {
      setConnected(false);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const handleTyping = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing:start', {});
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        socketRef.current?.emit('typing:stop', {});
      }, 2000);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!message.trim()) return toast.error('Enter a message first');

    // Try Socket.IO first for real-time delivery
    if (socketRef.current?.connected) {
      socketRef.current.emit('chat:send', { message: message.trim() });
      socketRef.current.emit('typing:stop', {});
      setMessage('');
      return;
    }

    // Fallback to REST API
    setSending(true);
    try {
      const res = await api.post('/erp/communications/chat/messages', { message: message.trim() });
      setMessages(prev => [...prev, res.data.message]);
      setMessage('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#111827' }}>Chat Support</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6, maxWidth: 640 }}>
            Internal team chat. Messages are delivered in real-time and stored for continuity.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', borderRadius: 12, padding: '8px 14px', border: '1px solid #e5e7eb' }}>
            <Circle size={8} fill={connected ? '#22c55e' : '#9ca3af'} color={connected ? '#22c55e' : '#9ca3af'} />
            <span style={{ fontSize: 12, color: connected ? '#16a34a' : '#9ca3af', fontWeight: 600 }}>
              {connected ? 'Live' : 'Polling'}
            </span>
          </div>
          <button type="button" onClick={fetchMessages}
            style={{ border: '1px solid #e5e7eb', background: '#fff', color: '#0f172a', padding: '9px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      <section style={{ display: 'grid', gap: 16 }}>
        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e5e7eb', minHeight: 400, maxHeight: 520, padding: 18, display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ color: '#64748b', fontSize: 13 }}>Loading messages...</div>
          ) : messages.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
              <MessageSquare size={32} color="#e5e7eb" style={{ margin: '0 auto 12px', display: 'block' }} />
              No messages yet. Send the first message to start the conversation.
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} style={{ display: 'grid', gap: 4, padding: '10px 14px', borderRadius: 14, background: '#f8fafc', border: '1px solid rgba(15,23,42,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 700 }}>{msg.sender_name || 'Unknown'}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{formatDateTime(msg.created_at)}</div>
                </div>
                <div style={{ fontSize: 14, color: '#334155', whiteSpace: 'pre-wrap' }}>{msg.message}</div>
              </div>
            ))
          )}
          {typingUsers.length > 0 && (
            <div style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic', padding: '4px 14px' }}>
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            value={message}
            onChange={(e) => { setMessage(e.target.value); handleTyping(); }}
            onKeyDown={handleKeyDown}
            rows={3}
            placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
            style={{ flex: 1, borderRadius: 14, border: '1px solid #cbd5e1', padding: 14, resize: 'none', fontSize: 14, fontFamily: 'inherit', outline: 'none' }}
          />
          <button
            type="submit"
            disabled={sending || !message.trim()}
            style={{ padding: '14px 20px', borderRadius: 14, border: 'none', cursor: message.trim() ? 'pointer' : 'not-allowed', background: message.trim() ? '#f97316' : '#f3f4f6', color: message.trim() ? '#fff' : '#9ca3af', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <Send size={16} />
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </section>
    </div>
  );
}
