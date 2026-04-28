import { useState, useEffect, useCallback } from 'react';
import { Search, Trash2, Plus, X, Upload, Pencil, GripVertical, Star as StarIcon } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const MAX_IMAGES = 10;
const MAX_SIZE_MB = 5;
const blank = { title: '', description: '', price: '', discount_percent: '', category_id: '' };
const inp = { width: '100%', padding: '9px 12px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff' };

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState(blank);
  const [images, setImages] = useState([]); // File objects for new upload
  const [previews, setPreviews] = useState([]); // Preview URLs for new images
  const [existingImages, setExistingImages] = useState([]); // Existing images from DB (when editing)
  const [primaryIdx, setPrimaryIdx] = useState(0); // Which image is primary (0-based)
  const [sizes, setSizes] = useState([{ size: 'M', stock: 10 }]);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const LIMIT = 15;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: LIMIT, status: 'approved' });
      if (search) p.set('search', search);
      const res = await api.get(`/admin/products?${p}`);
      setProducts(res.data.products || []);
      setTotal(res.data.total || 0);
    } catch { toast.error('Failed to load products'); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => { api.get('/products/categories').then(r => setCategories(r.data)).catch(() => {}); }, []);

  const openAdd = () => {
    setEditProduct(null); setForm(blank);
    setImages([]); setPreviews([]); setExistingImages([]); setPrimaryIdx(0);
    setSizes([{ size: 'M', stock: 10 }]);
    setShowForm(true);
  };

  const openEdit = async (product) => {
    setEditProduct(product);
    setForm({ title: product.title, description: product.description || '', price: product.price, discount_percent: product.discount_percent || '', category_id: product.category_id || '' });
    setImages([]); setPreviews([]);
    try {
      const res = await api.get(`/products/${product.id}`);
      setExistingImages(res.data.images || []);
      const primaryIndex = (res.data.images || []).findIndex(img => img.is_primary);
      setPrimaryIdx(primaryIndex >= 0 ? primaryIndex : 0);
      const variants = res.data.variants || [];
      setSizes(variants.length ? variants.map(v => ({ size: v.size, stock: v.stock })) : [{ size: 'M', stock: 10 }]);
    } catch { setSizes([{ size: 'M', stock: 10 }]); setExistingImages([]); }
    setShowForm(true);
  };

  const handleFiles = (files) => {
    const totalImages = (existingImages.length || 0) + images.length + files.length;
    if (totalImages > MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} images allowed. You can add ${MAX_IMAGES - (existingImages.length + images.length)} more.`);
      return;
    }
    const validFiles = [];
    for (const f of files) {
      if (f.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`${f.name} exceeds ${MAX_SIZE_MB}MB limit`);
        continue;
      }
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(f.type)) {
        toast.error(`${f.name} is not a valid image format`);
        continue;
      }
      validFiles.push(f);
    }
    setImages(prev => [...prev, ...validFiles]);
    setPreviews(prev => [...prev, ...validFiles.map(f => URL.createObjectURL(f))]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };

  const removeNewImage = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const removeExistingImage = async (imgId) => {
    if (!confirm('Delete this image?')) return;
    try {
      await api.delete(`/products/${editProduct.id}/images/${imgId}`);
      setExistingImages(prev => prev.filter(img => img.id !== imgId));
      toast.success('Image deleted');
    } catch { toast.error('Failed to delete image'); }
  };

  const setAsPrimary = async (imgId) => {
    try {
      await api.put(`/products/${editProduct.id}/images/${imgId}/primary`);
      setExistingImages(prev => prev.map(img => ({ ...img, is_primary: img.id === imgId })));
      toast.success('Primary image updated');
    } catch { toast.error('Failed'); }
  };

  const addSize = () => {
    const used = sizes.map(s => s.size);
    const next = SIZES.find(s => !used.includes(s));
    if (!next) return toast.error('All sizes already added');
    setSizes(prev => [...prev, { size: next, stock: 10 }]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const totalImgs = (existingImages.length || 0) + images.length;
    if (!editProduct && !images.length) return toast.error('Please add at least one image');
    if (totalImgs === 0) return toast.error('Product must have at least one image');
    if (!sizes.length) return toast.error('Please add at least one size');
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
      images.forEach(img => fd.append('images', img));
      fd.append('sizes', JSON.stringify(sizes));

      if (editProduct) {
        await api.put(`/admin/products/${editProduct.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Product updated!');
      } else {
        await api.post('/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Product added!');
      }
      setShowForm(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save product');
    } finally { setSaving(false); }
  };

  const toggle = async (id, field, currentVal) => {
    try { await api.put(`/products/${id}`, { [field]: !currentVal }); fetchProducts(); }
    catch { toast.error('Failed to update'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product permanently?')) return;
    try { await api.delete(`/admin/products/${id}`); toast.success('Product deleted'); fetchProducts(); }
    catch { toast.error('Failed to delete'); }
  };

  const totalPages = Math.ceil(total / LIMIT);
  const totalImageCount = (existingImages.length || 0) + images.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..." style={{ ...inp, paddingLeft: 32, width: 220 }} />
        </div>
        <button onClick={openAdd} className="btn-orange" style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> Add Product
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #fed7aa', padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{editProduct ? 'Edit Product' : 'Add New Product'}</span>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: 4 }}><X size={18} /></button>
          </div>

          {/* Image Upload Zone */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>
                Product Images ({totalImageCount}/{MAX_IMAGES})
              </span>
              {totalImageCount < MAX_IMAGES && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#f97316', cursor: 'pointer' }}>
                  <Upload size={13} /> Upload
                  <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" multiple style={{ display: 'none' }} onChange={handleFileInput} />
                </label>
              )}
            </div>

            {/* Drag-drop zone */}
            {totalImageCount < MAX_IMAGES && (
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{ border: `2px dashed ${dragOver ? '#f97316' : '#e5e7eb'}`, borderRadius: 12, padding: '24px', textAlign: 'center', background: dragOver ? '#fff7ed' : '#f9fafb', transition: 'all 0.2s', marginBottom: 12 }}>
                <Upload size={28} color={dragOver ? '#f97316' : '#9ca3af'} style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: 13, color: dragOver ? '#f97316' : '#6b7280', fontWeight: 600, marginBottom: 4 }}>
                  {dragOver ? 'Drop images here' : 'Drag & drop images here'}
                </p>
                <p style={{ fontSize: 11, color: '#9ca3af' }}>or click "Upload" button above · Max {MAX_IMAGES} images · JPG, PNG, WEBP · {MAX_SIZE_MB}MB each</p>
              </div>
            )}

            {/* Image grid */}
            {(existingImages.length > 0 || previews.length > 0) && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                {/* Existing images (when editing) */}
                {existingImages.map((img, i) => (
                  <div key={img.id} style={{ position: 'relative', aspectRatio: '3/4', borderRadius: 10, overflow: 'hidden', border: img.is_primary ? '2px solid #f97316' : '1px solid #e5e7eb', background: '#f9fafb' }}>
                    <img src={img.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {img.is_primary && (
                      <span style={{ position: 'absolute', top: 4, left: 4, background: '#f97316', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                        PRIMARY
                      </span>
                    )}
                    <div style={{ position: 'absolute', top: 4, right: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {!img.is_primary && (
                        <button type="button" onClick={() => setAsPrimary(img.id)} title="Set as primary"
                          style={{ width: 22, height: 22, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.95)', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                          <StarIcon size={11} />
                        </button>
                      )}
                      <button type="button" onClick={() => removeExistingImage(img.id)} title="Delete"
                        style={{ width: 22, height: 22, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.95)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                        <X size={11} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* New images (to be uploaded) */}
                {previews.map((src, i) => (
                  <div key={`new-${i}`} style={{ position: 'relative', aspectRatio: '3/4', borderRadius: 10, overflow: 'hidden', border: (existingImages.length === 0 && i === primaryIdx) ? '2px solid #f97316' : '1px solid #e5e7eb', background: '#f9fafb' }}>
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {existingImages.length === 0 && i === 0 && (
                      <span style={{ position: 'absolute', top: 4, left: 4, background: '#f97316', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                        PRIMARY
                      </span>
                    )}
                    <button type="button" onClick={() => removeNewImage(i)} title="Remove"
                      style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.95)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                      <X size={11} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {totalImageCount === 0 && !editProduct && (
              <p style={{ fontSize: 12, color: '#ef4444', marginTop: 8 }}>⚠️ At least 1 image required</p>
            )}
          </div>

          {/* Fields */}
          <div className="form-grid-2">
            <div className="col-span-2">
              <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Product Title *" style={inp} />
            </div>
            <div className="col-span-2">
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description (optional)" rows={3} style={{ ...inp, resize: 'none' }} />
            </div>
            <input required type="number" min="1" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} placeholder="Price (₹) *" style={inp} />
            <input type="number" min="0" max="90" value={form.discount_percent} onChange={e => setForm(p => ({ ...p, discount_percent: e.target.value }))} placeholder="Discount %" style={inp} />
            <div className="col-span-2">
              <select value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))} style={inp}>
                <option value="">Select Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Sizes */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#6b7280' }}>Sizes & Stock</span>
              <button type="button" onClick={addSize} style={{ fontSize: 12, color: '#f97316', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                <Plus size={12} /> Add Size
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sizes.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select value={s.size} onChange={e => setSizes(prev => prev.map((x, idx) => idx === i ? { ...x, size: e.target.value } : x))} style={{ ...inp, width: 80 }}>
                    {SIZES.map(sz => <option key={sz} value={sz}>{sz}</option>)}
                  </select>
                  <input type="number" min="0" value={s.stock} onChange={e => setSizes(prev => prev.map((x, idx) => idx === i ? { ...x, stock: e.target.value } : x))} placeholder="Stock" style={{ ...inp, flex: 1 }} />
                  <button type="button" onClick={() => setSizes(prev => prev.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', display: 'flex', padding: 4 }}><X size={14} /></button>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving} className="btn-orange" style={{ padding: '10px 24px', borderRadius: 10, fontSize: 13 }}>
              {saving ? 'Saving...' : editProduct ? 'Update Product' : 'Add Product'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '10px 24px', borderRadius: 10, fontSize: 13, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Products Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Product', 'Category', 'Price', 'Featured', 'Trending', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} style={{ padding: '10px 14px' }}><div className="skeleton" style={{ height: 32, borderRadius: 8 }} /></td></tr>
                ))
              ) : products.map(p => (
                <tr key={p.id} style={{ borderTop: '1px solid #f9fafb' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <img src={p.primary_image || 'https://placehold.co/40x48/f9fafb/9ca3af?text=IMG'} alt="" style={{ width: 38, height: 46, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                      <span style={{ fontWeight: 600, color: '#111827', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#6b7280', whiteSpace: 'nowrap' }}>{p.category_name || '—'}</td>
                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontWeight: 700, color: '#111827' }}>₹{p.discount_percent > 0 ? Math.round(p.price * (1 - p.discount_percent / 100)) : p.price}</span>
                    {p.discount_percent > 0 && <span style={{ fontSize: 11, color: '#9ca3af', textDecoration: 'line-through', marginLeft: 4 }}>₹{p.price}</span>}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => toggle(p.id, 'is_featured', p.is_featured)} style={{ padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', background: p.is_featured ? '#fef9c3' : '#f3f4f6', color: p.is_featured ? '#854d0e' : '#9ca3af' }}>
                      {p.is_featured ? '★ Featured' : '☆ Feature'}
                    </button>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => toggle(p.id, 'is_trending', p.is_trending)} style={{ padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer', background: p.is_trending ? '#fee2e2' : '#f3f4f6', color: p.is_trending ? '#991b1b' : '#9ca3af' }}>
                      {p.is_trending ? '🔥 Trending' : '+ Trending'}
                    </button>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(p)} title="Edit" style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fff7ed', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Pencil size={13} /></button>
                      <button onClick={() => handleDelete(p.id)} title="Delete" style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && !products.length && (
                <tr><td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No products yet. Click "Add Product" to get started.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: '#9ca3af' }}>{total} products</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '5px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, opacity: page === 1 ? 0.4 : 1 }}>Prev</button>
              <span style={{ padding: '5px 10px', color: '#6b7280' }}>{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '5px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, opacity: page === totalPages ? 0.4 : 1 }}>Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
