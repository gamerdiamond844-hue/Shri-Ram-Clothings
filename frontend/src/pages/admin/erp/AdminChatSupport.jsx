import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../utils/api';

const formatDateTime = (dateString) => {
  const dt = new Date(dateString);
  return dt.toLocaleString('en-IN', { hour12: true, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function AdminChatSupport() {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const intervalRef = useRef(null);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await api.get('/erp/communications/chat/messages');
      setMessages(res.data.messages || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to load chat messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    intervalRef.current = setInterval(fetchMessages, 5000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!message.trim()) return toast.error('Enter a message first');
    setSending(true);
    try {
      const res = await api.post('/erp/communications/chat/messages', { message: message.trim() });
      setMessages((prev) => [...prev, res.data.message]);
      setMessage('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#111827' }}>Chat Support</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6, maxWidth: 640 }}>Internal chat for your admin and employee team. Messages are stored so your team can continue conversations across sessions.</p>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', borderRadius: 12, padding: '10px 14px', boxShadow: '0 10px 30px rgba(15,23,42,0.06)' }}>
          <MessageSquare size={18} color='#f97316' />
          <span style={{ fontSize: 13, color: '#111827', fontWeight: 700 }}>Live chat</span>
        </div>
      </div>

      <section style={{ display: 'grid', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 700 }}>Team conversation</div>
          <button
            type="button"
            onClick={fetchMessages}
            style={{ border: '1px solid #e5e7eb', background: '#fff', color: '#0f172a', padding: '9px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}
          >
            Refresh
          </button>
        </div>

        <div style={{ background: '#fff', borderRadius: 20, border: '1px solid #e5e7eb', minHeight: 320, padding: 18, display: 'grid', gap: 12, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ color: '#64748b', fontSize: 13 }}>Loading messages...</div>
          ) : messages.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: 13 }}>No messages yet. Send the first message to start the conversation.</div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} style={{ display: 'grid', gap: 6, padding: 12, borderRadius: 14, background: '#f8fafc', border: '1px solid rgba(15,23,42,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <div style={{ fontSize: 13, color: '#0f172a', fontWeight: 700 }}>{msg.sender_name || 'Unknown'}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{formatDateTime(msg.created_at)}</div>
                </div>
                <div style={{ fontSize: 14, color: '#334155', whiteSpace: 'pre-wrap' }}>{msg.message}</div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Type your message here..."
            style={{ width: '100%', borderRadius: 16, border: '1px solid #cbd5e1', padding: 14, resize: 'vertical', fontSize: 14 }}
          />
          <button
            type="submit"
            disabled={sending}
            style={{ width: 160, padding: '12px 16px', borderRadius: 14, border: 'none', cursor: 'pointer', background: '#f97316', color: '#fff', fontWeight: 700 }}
          >
            {sending ? 'Sending...' : 'Send Message'}
            <Send size={16} style={{ marginLeft: 8 }} />
          </button>
        </form>
      </section>
    </div>
  );
}

