import { useState, useEffect } from 'react';
import { Plus, Trash2, X, Upload, ToggleLeft, ToggleRight, Pencil } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const inp = { width: '100%', padding: '9px 12px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff' };
const blank = { title: '', product_id: '', sort_order: 0, is_active: true };

export default function AdminReels() {
  const [reels, setReels] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [videoFile, setVideoFile] = useState(null);
  const [thumbFile, setThumbFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState('');
  const [thumbPreview, setThumbPreview] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [r, p] = await Promise.all([
        api.get('/homepage/admin/reels'),
        api.get('/products?limit=100&status=approved'),
      ]);
      setReels(r.data);
      setProducts(p.data.products || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null); setForm(blank);
    setVideoFile(null); setThumbFile(null);
    setVideoPreview(''); setThumbPreview('');
    setShowForm(true);
  };

  const openEdit = (r) => {
    setEditing(r);
    setForm({ title: r.title || '', product_id: r.product_id || '', sort_order: r.sort_order, is_active: r.is_active });
    setVideoFile(null); setThumbFile(null);
    setVideoPreview(r.video_url || '');
    setThumbPreview(r.thumbnail_url || '');
    setShowForm(true);
  };

  const handleVideo = (e) => {
    const f = e.target.files[0]; if (!f) return;
    setVideoFile(f); setVideoPreview(URL.createObjectURL(f));
  };
  const handleThumb = (e) => {
    const f = e.target.files[0]; if (!f) return;
    setThumbFile(f); setThumbPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editing && !videoFile) return toast.error('Please upload a video');
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
      if (videoFile) fd.append('video', videoFile);
      if (thumbFile)  fd.append('thumbnail', thumbFile);
      if (editing) {
        await api.put(`/homepage/admin/reels/${editing.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Reel updated!');
      } else {
        await api.post('/homepage/admin/reels', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Reel added!');
      }
      setShowForm(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (r) => {
    try { await api.put(`/homepage/admin/reels/${r.id}`, { is_active: !r.is_active }); load(); }
    catch { toast.error('Failed'); }
  };

  const deleteReel = async (id) => {
    if (!confirm('Delete this reel?')) return;
    try { await api.delete(`/homepage/admin/reels/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Failed'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Reels / Videos</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Upload short vertical videos shown on homepage like Instagram Reels</div>
        </div>
        <button onClick={openAdd} className="btn-orange" style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> Add Reel
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #fed7aa', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{editing ? 'Edit Reel' : 'Add New Reel'}</span>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}><X size={18} /></button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Video upload */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>Video {editing ? '(upload to replace)' : '*'}</div>
              <label style={{ display: 'block', cursor: 'pointer' }}>
                {videoPreview ? (
                  <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', height: 140, background: '#000' }}>
                    <video src={videoPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted loop />
                    <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>
                      {videoFile ? 'New video' : 'Current'}
                    </div>
                  </div>
                ) : (
                  <div style={{ height: 140, border: '2px dashed #e5e7eb', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#f9fafb' }}>
                    <Upload size={22} color="#9ca3af" />
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>Upload vertical video (MP4)</span>
                    <span style={{ fontSize: 10, color: '#d1d5db' }}>Max 100MB</span>
                  </div>
                )}
                <input type="file" accept="video/*" style={{ display: 'none' }} onChange={handleVideo} />
              </label>
            </div>

            {/* Thumbnail upload */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6 }}>Thumbnail (optional)</div>
              <label style={{ display: 'block', cursor: 'pointer' }}>
                {thumbPreview ? (
                  <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', height: 140 }}>
                    <img src={thumbPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ) : (
                  <div style={{ height: 140, border: '2px dashed #e5e7eb', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#f9fafb' }}>
                    <Upload size={22} color="#9ca3af" />
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>Upload thumbnail image</span>
                  </div>
                )}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleThumb} />
              </label>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Title</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Summer Collection Drop" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Link to Product (optional)</label>
              <select value={form.product_id} onChange={e => setForm(p => ({ ...p, product_id: e.target.value }))} style={inp}>
                <option value="">No product link</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Sort Order</label>
              <input type="number" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: e.target.value }))} style={inp} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 20 }}>
              <input type="checkbox" id="reel_active" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} style={{ accentColor: '#f97316', width: 16, height: 16 }} />
              <label htmlFor="reel_active" style={{ fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>Active</label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving} className="btn-orange" style={{ padding: '9px 20px', borderRadius: 10, fontSize: 13 }}>
              {saving ? 'Uploading...' : editing ? 'Update Reel' : 'Add Reel'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '9px 20px', borderRadius: 10, fontSize: 13, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Reels grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }} className="sm:grid-cols-4 lg:grid-cols-6">
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ aspectRatio: '9/16', borderRadius: 12 }} />)}
        </div>
      ) : reels.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
          No reels yet. Upload vertical videos to show on homepage.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }} className="sm:grid-cols-4 lg:grid-cols-6">
          {reels.map(r => (
            <div key={r.id} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#000', aspectRatio: '9/16', opacity: r.is_active ? 1 : 0.5 }}>
              {r.thumbnail_url ? (
                <img src={r.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <video src={r.video_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
              )}

              {/* Overlay */}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 8 }}>
                {r.title && <div style={{ fontSize: 10, color: '#fff', fontWeight: 600, lineHeight: 1.3, marginBottom: 4 }}>{r.title}</div>}
                {r.product_title && (
                  <div style={{ fontSize: 9, color: '#fed7aa', fontWeight: 500 }}>🛍️ {r.product_title}</div>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ position: 'absolute', top: 6, right: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button onClick={() => openEdit(r)} style={{ width: 24, height: 24, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.9)', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Pencil size={11} />
                </button>
                <button onClick={() => deleteReel(r.id)} style={{ width: 24, height: 24, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.9)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={11} />
                </button>
                <button onClick={() => toggleActive(r)} style={{ width: 24, height: 24, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.9)', color: r.is_active ? '#22c55e' : '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>
                  {r.is_active ? '●' : '○'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
