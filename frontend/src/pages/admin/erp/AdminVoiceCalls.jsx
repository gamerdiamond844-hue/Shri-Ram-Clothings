import { Phone } from 'lucide-react';

export default function AdminVoiceCalls() {
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: '#111827' }}>Voice Calls</h2>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 6, maxWidth: 640 }}>Internal voice communication for your admin and employee teams. Connect this section to a voice API such as Twilio Programmable Voice or WebRTC for real-time calls.</p>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', borderRadius: 12, padding: '10px 14px', boxShadow: '0 10px 30px rgba(15,23,42,0.06)' }}>
          <Phone size={18} color='#10b981' />
          <span style={{ fontSize: 13, color: '#111827', fontWeight: 700 }}>Planned</span>
        </div>
      </div>
      <div style={{ background: '#fff', borderRadius: 18, border: '1px solid #e5e7eb', padding: 22 }}>
        <div style={{ fontSize: 13, color: '#475569' }}>This screen is a placeholder for the admin voice call panel. To complete it, integrate a voice call provider and add controls for dialing, call history, and participant management.</div>
      </div>
    </div>
  );
}
