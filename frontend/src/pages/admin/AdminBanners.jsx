import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Upload, ToggleLeft, ToggleRight, GripVertical } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const blank = { heading: '', subheading: '', cta_text: '', cta_link: '', sort_order: 0, is_active: true, starts_at: '', ends_at: '' };
const inp = { width: '100%', padding: '9px 12px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff' };

export default function AdminBanners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [desktopFile, setDesktopFile] = useState(null);
  const [mobileFile, setMobileFile] = useState(null);
  const [desktopPreview, setDesktopPreview] = useState('');
  const [mobilePreview, setMobilePreview] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/homepage/admin/banners');
      setBanners(res.data);
    } catch { toast.error('Failed to load banners'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null); setForm(blank);
    setDesktopFile(null); setMobileFile(null);
    setDesktopPreview(''); setMobilePreview('');
    setShowForm(true);
  };

  const openEdit = (b) => {
    setEditing(b);
    setForm({
      heading: b.heading || '', subheading: b.subheading || '',
      cta_text: b.cta_text || '', cta_link: b.cta_link || '',
      sort_order: b.sort_order || 0, is_active: b.is_active,
      starts_at: b.starts_at ? b.starts_at.slice(0, 16) : '',
      ends_at: b.ends_at ? b.ends_at.slice(0, 16) : '',
    });
    setDesktopFile(null); setMobileFile(null);
    setDesktopPreview(b.desktop_image || '');
    setMobilePreview(b.mobile_image || '');
    setShowForm(true);
  };

  const handleDesktop = (e) => {
    const f = e.target.files[0]; if (!f) return;
    setDesktopFile(f); setDesktopPreview(URL.createObjectURL(f));
  };
  const handleMobile = (e) => {
    const f = e.target.files[0]; if (!f) return;
    setMobileFile(f); setMobilePreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (desktopFile) fd.append('desktop', desktopFile);
      if (mobileFile)  fd.append('mobile', mobileFile);
      if (editing) {
        await api.put(`/homepage/admin/banners/${editing.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Banner updated!');
      } else {
        await api.post('/homepage/admin/banners', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Banner created!');
      }
      setShowForm(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (b) => {
    try {
      await api.put(`/homepage/admin/banners/${b.id}`, { is_active: !b.is_active });
      load();
    } catch { toast.error('Failed'); }
  };

  const deleteBanner = async (id) => {
    if (!confirm('Delete this banner?')) return;
    try { await api.delete(`/homepage/admin/banners/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Failed'); }
  };

  const moveOrder = async (id, direction, currentOrder) => {
    try {
      await api.put(`/homepage/admin/banners/${id}`, { sort_order: currentOrder + direction });
      load();
    } catch { toast.error('Failed'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Hero Banners</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Manage homepage hero banners with scheduling</div>
        </div>
        <button onClick={openAdd} className="btn-orange" style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> Add Banner
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #fed7aa', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{editing ? 'Edit Banner' : 'New Banner'}</span>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}><X size={18} /></button>
          </div>

          {/* Image uploads */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Desktop image */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>Desktop Image</div>
              <label style={{ display: 'block', cursor: 'pointer' }}>
                {desktopPreview ? (
                  <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', height: 100 }}>
                    <img src={desktopPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: '0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                      <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>Change</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ height: 100, border: '2px dashed #e5e7eb', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, background: '#f9fafb' }}>
                    <Upload size={18} color="#9ca3af" />
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>Upload desktop image</span>
                  </div>
                )}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleDesktop} />
              </label>
            </div>

            {/* Mobile image */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>Mobile Image</div>
              <label style={{ display: 'block', cursor: 'pointer' }}>
                {mobilePreview ? (
                  <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', height: 100 }}>
                    <img src={mobilePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: '0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                      <span style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>Change</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ height: 100, border: '2px dashed #e5e7eb', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, background: '#f9fafb' }}>
                    <Upload size={18} color="#9ca3af" />
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>Upload mobile image</span>
                  </div>
                )}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleMobile} />
              </label>
            </div>
          </div>

          {/* Text fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Heading</label>
              <input value={form.heading} onChange={e => setForm(p => ({ ...p, heading: e.target.value }))} placeholder="e.g. New Collection 2024" style={inp} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Subheading</label>
              <input value={form.subheading} onChange={e => setForm(p => ({ ...p, subheading: e.target.value }))} placeholder="e.g. Premium fashion for the modern man" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>CTA Button Text</label>
              <input value={form.cta_text} onChange={e => setForm(p => ({ ...p, cta_text: e.target.value }))} placeholder="e.g. Shop Now" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>CTA Link</label>
              <input value={form.cta_link} onChange={e => setForm(p => ({ ...p, cta_link: e.target.value }))} placeholder="e.g. /shop" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Start Date (optional)</label>
              <input type="datetime-local" value={form.starts_at} onChange={e => setForm(p => ({ ...p, starts_at: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>End Date (optional)</label>
              <input type="datetime-local" value={form.ends_at} onChange={e => setForm(p => ({ ...p, ends_at: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Sort Order</label>
              <input type="number" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: e.target.value }))} style={inp} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 20 }}>
              <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} style={{ accentColor: '#f97316', width: 16, height: 16 }} />
              <label htmlFor="is_active" style={{ fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>Active</label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving} className="btn-orange" style={{ padding: '9px 20px', borderRadius: 10, fontSize: 13 }}>
              {saving ? 'Saving...' : editing ? 'Update Banner' : 'Create Banner'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '9px 20px', borderRadius: 10, fontSize: 13, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Banners list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
        </div>
      ) : banners.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
          No banners yet. Click "Add Banner" to create your first hero banner.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {banners.map((b, idx) => (
            <div key={b.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>

              {/* Order controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button onClick={() => moveOrder(b.id, -1, b.sort_order)} disabled={idx === 0}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2, opacity: idx === 0 ? 0.3 : 1, fontSize: 10 }}>▲</button>
                <button onClick={() => moveOrder(b.id, 1, b.sort_order)} disabled={idx === banners.length - 1}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 2, opacity: idx === banners.length - 1 ? 0.3 : 1, fontSize: 10 }}>▼</button>
              </div>

              {/* Preview image */}
              <div style={{ width: 80, height: 50, borderRadius: 8, overflow: 'hidden', background: '#f9fafb', flexShrink: 0 }}>
                {b.desktop_image
                  ? <img src={b.desktop_image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🖼️</div>
                }
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.heading || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No heading</span>}
                </div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.subheading || 'No subheading'}
                </div>
                {(b.starts_at || b.ends_at) && (
                  <div style={{ fontSize: 10, color: '#f97316', marginTop: 3, fontWeight: 600 }}>
                    📅 {b.starts_at ? new Date(b.starts_at).toLocaleDateString('en-IN') : '∞'} → {b.ends_at ? new Date(b.ends_at).toLocaleDateString('en-IN') : '∞'}
                  </div>
                )}
              </div>

              {/* CTA info */}
              {b.cta_text && (
                <div style={{ fontSize: 11, background: '#fff7ed', color: '#f97316', padding: '3px 8px', borderRadius: 6, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {b.cta_text}
                </div>
              )}

              {/* Toggle */}
              <button onClick={() => toggleActive(b)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: b.is_active ? '#22c55e' : '#d1d5db', flexShrink: 0 }}>
                {b.is_active ? <ToggleRight size={26} /> : <ToggleLeft size={26} />}
              </button>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => openEdit(b)} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fff7ed', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Pencil size={13} />
                </button>
                <button onClick={() => deleteBanner(b.id)} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
