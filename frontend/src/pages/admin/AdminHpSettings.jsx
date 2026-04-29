import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useSiteSettings } from '../../context/SiteSettingsContext';

const inp = { width: '100%', padding: '9px 12px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff' };

const FIELDS = [
  { key: 'hero_heading',      label: 'Hero Heading',        placeholder: 'e.g. Dress Like Royalty',           type: 'text' },
  { key: 'hero_subheading',   label: 'Hero Subheading',     placeholder: 'e.g. Premium fashion for the modern Indian man', type: 'text' },
  { key: 'hero_cta_text',     label: 'Hero CTA Button',     placeholder: 'e.g. Shop Now',                     type: 'text' },
  { key: 'hero_cta_link',     label: 'Hero CTA Link',       placeholder: 'e.g. /shop',                        type: 'text' },
  { key: 'announcement_text', label: 'Announcement Bar',    placeholder: 'e.g. Free Shipping on orders above ₹999', type: 'text' },
  { key: 'seo_title',         label: 'SEO Page Title',      placeholder: 'e.g. Shri Ram Clothings – Premium Men\'s Fashion', type: 'text' },
  { key: 'seo_description',   label: 'SEO Meta Description',placeholder: 'e.g. Shop premium men\'s clothing...', type: 'textarea' },
  { key: 'seo_keywords',      label: 'SEO Keywords',        placeholder: 'e.g. men clothing, t-shirts, jeans', type: 'text' },
];

export default function AdminHpSettings() {
  const { fetchSettings } = useSiteSettings();
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/homepage/admin/settings')
      .then(r => setSettings(r.data || {}))
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/homepage/admin/settings', settings);
      // Refetch global settings so Navbar + Home update immediately
      await fetchSettings();
      toast.success('Settings saved! Changes are now live.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 44, borderRadius: 8 }} />)}
    </div>
  );

  return (
    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Hero Section */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 4 }}>🏠 Hero Section</div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>Controls the main hero text when no banner image is set</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FIELDS.slice(0, 4).map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>{f.label}</label>
              <input
                value={settings[f.key] || ''}
                onChange={e => setSettings(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                style={inp}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Announcement */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 4 }}>📢 Announcement Bar</div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>Text shown in the top announcement bar</div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>{FIELDS[4].label}</label>
          <input
            value={settings[FIELDS[4].key] || ''}
            onChange={e => setSettings(p => ({ ...p, [FIELDS[4].key]: e.target.value }))}
            placeholder={FIELDS[4].placeholder}
            style={inp}
          />
        </div>
      </div>

      {/* SEO */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 4 }}>🔍 SEO Settings</div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>Controls meta tags for search engine optimization</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FIELDS.slice(5).map(f => (
            <div key={f.key}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>{f.label}</label>
              {f.type === 'textarea' ? (
                <textarea
                  value={settings[f.key] || ''}
                  onChange={e => setSettings(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  rows={3}
                  style={{ ...inp, resize: 'none' }}
                />
              ) : (
                <input
                  value={settings[f.key] || ''}
                  onChange={e => setSettings(p => ({ ...p, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={inp}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <button type="submit" disabled={saving} className="btn-orange"
        style={{ padding: '12px 32px', borderRadius: 12, fontSize: 14, alignSelf: 'flex-start' }}>
        {saving ? 'Saving...' : '💾 Save All Settings'}
      </button>
    </form>
  );
}
