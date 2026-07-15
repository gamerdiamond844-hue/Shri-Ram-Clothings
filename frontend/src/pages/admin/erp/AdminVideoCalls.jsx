import { Video } from 'lucide-react';

export default function AdminVideoCalls() {
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#111827' }}>Video Calls</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6, maxWidth: 640 }}>Internal video meetings for your admin and employee teams. Use this section to add your preferred video SDK integration.</p>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', borderRadius: 12, padding: '10px 14px', boxShadow: '0 10px 30px rgba(15,23,42,0.06)' }}>
          <Video size={18} color='#3b82f6' />
          <span style={{ fontSize: 13, color: '#111827', fontWeight: 700 }}>Planned</span>
        </div>
      </div>
      <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e5e7eb', padding: 22 }}>
        <div style={{ fontSize: 13, color: '#475569' }}>This is a placeholder screen. To complete it, connect a video SDK such as Daily, Twilio, or WebRTC and render meeting controls in this panel.</div>
      </div>
    </div>
  );
}

