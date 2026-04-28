import { useState } from 'react';
import AdminBanners from './AdminBanners';
import AdminSections from './AdminSections';
import AdminReels from './AdminReels';
import AdminHpSettings from './AdminHpSettings';

const TABS = [
  { key: 'banners',  label: '🖼️ Banners' },
  { key: 'sections', label: '📐 Sections' },
  { key: 'reels',    label: '🎬 Reels' },
  { key: 'settings', label: '⚙️ Settings' },
];

export default function AdminHomepage() {
  const [tab, setTab] = useState('banners');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 6, background: '#fff', borderRadius: 12, padding: 6, border: '1px solid #f3f4f6', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
              background: tab === t.key ? '#f97316' : 'transparent',
              color: tab === t.key ? '#fff' : '#6b7280',
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'banners'  && <AdminBanners />}
      {tab === 'sections' && <AdminSections />}
      {tab === 'reels'    && <AdminReels />}
      {tab === 'settings' && <AdminHpSettings />}
    </div>
  );
}
