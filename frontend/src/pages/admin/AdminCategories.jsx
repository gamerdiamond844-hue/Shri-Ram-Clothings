import { useState, useEffect } from 'react';
import { Plus, Pencil, ToggleLeft, ToggleRight, X, Upload } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const inp = { width: '100%', padding: '9px 12px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff' };

const blankForm = { id: null, name: '', slug: '', sort_order: 0, imageFile: null, existingImage: null };

const toSlug = (str) => str.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState('');

  const fetchCategories = async () => {
    try { const res = await api.get('/admin/categories'); setCategories(res.data); }
    catch { toast.error('Failed to load categories'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCategories(); }, []);

  const openAdd = () => {
    setForm({ ...blankForm });
    setImagePreview('');
  };

  const openEdit = (cat) => {
    // Only pick the fields we need — never spread unknown fields
    setForm({
      id: cat.id,
      name: cat.name || '',
      slug: cat.slug || '',
      sort_order: cat.sort_order ?? 0,
      imageFile: null,
      existingImage: cat.image_url || null,
    });
    setImagePreview(cat.image_url || '');
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    setForm(p => ({
      ...p,
      name,
      // Auto-generate slug only when adding new (not editing)
      slug: p.id ? p.slug : toSlug(name),
    }));
  };

  const handleImageFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setForm(p => ({ ...p, imageFile: file }));
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Category name is required');
    if (!form.slug.trim()) return toast.error('Slug is required');

    setSaving(true);
    try {
      // Only send the fields the backend expects
      const fd = new FormData();
      fd.append('name', form.name.trim());
      fd.append('slug', form.slug.trim());
      fd.append('sort_order', form.sort_order || 0);
      if (form.imageFile) fd.append('image', form.imageFile);

      if (form.id) {
        await api.put(`/admin/categories/${form.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Category updated!');
      } else {
        await api.post('/admin/categories', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Category created!');
      }
      setForm(null);
      setImagePreview('');
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const toggleActive = async (id, is_active) => {
    try {
      await api.put(`/admin/categories/${id}`, { is_active: !is_active });
      fetchCategories();
    } catch { toast.error('Failed'); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: '#9ca3af' }}>{categories.length} categories</span>
        <button onClick={openAdd} className="btn-orange" style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> Add Category
        </button>
      </div>

      {/* Form */}
      {form && (
        <form onSubmit={handleSave} style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #fed7aa', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{form.id ? 'Edit Category' : 'New Category'}</span>
            <button type="button" onClick={() => { setForm(null); setImagePreview(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 4 }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Name */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5 }}>Name *</label>
              <input
                required
                value={form.name}
                onChange={handleNameChange}
                placeholder="e.g. T-Shirts"
                style={inp}
              />
            </div>

            {/* Slug */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5 }}>
                Slug * <span style={{ color: '#9ca3af', fontWeight: 400 }}>(URL-friendly)</span>
              </label>
              <input
                required
                value={form.slug}
                onChange={e => setForm(p => ({ ...p, slug: toSlug(e.target.value) }))}
                placeholder="e.g. t-shirts"
                style={{ ...inp, fontFamily: 'monospace' }}
              />
            </div>

            {/* Sort Order */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5 }}>Sort Order</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={e => setForm(p => ({ ...p, sort_order: e.target.value }))}
                style={inp}
              />
            </div>

            {/* Image upload */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5 }}>
                Image {form.id ? '(upload to replace)' : '(optional)'}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {imagePreview && (
                  <img src={imagePreview} alt="" style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', border: '1px solid #e5e7eb', flexShrink: 0 }} />
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: '#f97316', fontWeight: 600, background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 8, padding: '7px 12px' }}>
                  <Upload size={13} /> {imagePreview ? 'Change' : 'Upload'}
                  <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" style={{ display: 'none' }} onChange={handleImageFile} />
                </label>
                {imagePreview && (
                  <button type="button" onClick={() => { setForm(p => ({ ...p, imageFile: null, existingImage: null })); setImagePreview(''); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 2 }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button type="submit" disabled={saving} className="btn-orange" style={{ padding: '9px 20px', borderRadius: 10, fontSize: 13 }}>
              {saving ? 'Saving...' : form.id ? 'Update Category' : 'Create Category'}
            </button>
            <button type="button" onClick={() => { setForm(null); setImagePreview(''); }}
              style={{ padding: '9px 20px', borderRadius: 10, fontSize: 13, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Category', 'Slug', 'Products', 'Sort', 'Active', 'Edit'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} style={{ padding: '10px 14px' }}><div className="skeleton" style={{ height: 32, borderRadius: 8 }} /></td></tr>
                ))
              ) : categories.map(c => (
                <tr key={c.id} style={{ borderTop: '1px solid #f9fafb' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {c.image_url
                        ? <img src={c.image_url} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
                        : <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>📂</div>
                      }
                      <span style={{ fontWeight: 600, color: '#111827' }}>{c.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: 12, color: '#9ca3af' }}>{c.slug}</td>
                  <td style={{ padding: '10px 14px', color: '#6b7280' }}>{c.product_count || 0}</td>
                  <td style={{ padding: '10px 14px', color: '#6b7280' }}>{c.sort_order}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => toggleActive(c.id, c.is_active)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: c.is_active ? '#22c55e' : '#d1d5db', display: 'flex' }}>
                      {c.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    </button>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => openEdit(c)}
                      style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fff7ed', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Pencil size={13} />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && !categories.length && (
                <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No categories yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
