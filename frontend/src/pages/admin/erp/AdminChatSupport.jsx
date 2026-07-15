import { useState } from 'react';
import { MessageSquare } from 'lucide-react';

export default function AdminChatSupport() {
  const [message, setMessage] = useState('');
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#111827' }}>Chat Support</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6, maxWidth: 640 }}>Collaboration and support chat for internal admin teams and employees.</p>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', borderRadius: 12, padding: '10px 14px', boxShadow: '0 10px 30px rgba(15,23,42,0.06)' }}>
          <MessageSquare size={18} color='#f97316' />
          <span style={{ fontSize: 13, color: '#111827', fontWeight: 700 }}>Coming soon</span>
        </div>
      </div>
      <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e5e7eb', padding: 22 }}>
        <div style={{ fontSize: 13, color: '#6b7280' }}>This feature placeholder is ready for chat integration. To enable real-time internal messaging, connect a WebSocket or chat service on the backend and wire message state to this UI.</div>
      </div>
      <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e5e7eb', padding: 22, display: 'grid', gap: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Quick start</div>
        <ul style={{ margin: 0, paddingLeft: 18, color: '#475569', fontSize: 13, lineHeight: 1.8 }}>
          <li>Build a WebSocket or long poll endpoint at <code>/api/admin/chat</code></li>
          <li>Sync admin/employee messages in real time</li>
          <li>Show unread counts in the sidebar badge</li>
        </ul>
      </div>
    </div>
  );
}

