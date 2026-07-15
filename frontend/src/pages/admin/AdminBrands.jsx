import { useState, useEffect, useRef } from 'react';
import { Search, Plus, X, Pencil, ToggleLeft, ToggleRight, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const inputStyle = {
  width: '100%', padding: '9px 12px', fontSize: 13,
  border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none',
  fontFamily: 'inherit', color: '#111827', background: '#fff',
};

const blankForm = { id: null, name: '', slug: '', description: '', is_active: true };

const slugify = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

export default function AdminBrands() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [debounce, setDebounce] = useState(null);
  const [total, setTotal] = useState(0);

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit });
      if (search) params.set('search', search);
      const res = await api.get(`/erp/brands?${params}`);
      setBrands(res.data.brands || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      toast.error('Failed to load brands');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBrands(); }, [page, limit, search]);

  const openAdd = () => setForm({ ...blankForm });
  const openEdit = (brand) => setForm({
    id: brand.id,
    name: brand.name || '',
    slug: brand.slug || '',
    description: brand.description || '',
    is_active: brand.is_active,
  });

  const closeForm = () => setForm(null);

  const changeField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Brand name is required');
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug ? slugify(form.slug) : slugify(form.name),
        description: form.description ? form.description.trim() : null,
        is_active: form.is_active,
      };

      if (form.id) {
        await api.put(`/erp/brands/${form.id}`, payload);
        toast.success('Brand updated');
      } else {
        await api.post('/erp/brands', payload);
        toast.success('Brand created');
      }

      closeForm();
      fetchBrands();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save brand');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (brand) => {
    try {
      await api.put(`/erp/brands/${brand.id}`, { is_active: !brand.is_active });
      fetchBrands();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleSearch = (value) => {
    if (debounce) clearTimeout(debounce);
    setDebounce(setTimeout(() => setSearch(value.trim()), 250));
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ position: 'relative', minWidth: 240 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            placeholder="Search brands..."
            onChange={(e) => handleSearch(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 34, width: '100%' }}
          />
        </div>
        <button onClick={openAdd} className="btn-orange" style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> Add Brand
        </button>
      </div>

      {form && (
        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #fed7aa', padding: 20, display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{form.id ? 'Edit Brand' : 'New Brand'}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{form.id ? 'Update the brand details.' : 'Create a new merchandise brand.'}</div>
            </div>
            <button type="button" onClick={closeForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}><X size={18} /></button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: '#6b7280' }}>Brand Name *</label>
              <input value={form.name} onChange={(e) => changeField('name', e.target.value)} style={inputStyle} placeholder="e.g. Shri Ram" />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: '#6b7280' }}>Slug</label>
              <input value={form.slug} onChange={(e) => changeField('slug', e.target.value)} style={inputStyle} placeholder="shri-ram" />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontSize: 11, fontWeight: 700, color: '#6b7280' }}>Description</label>
            <textarea value={form.description} onChange={(e) => changeField('description', e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Optional brand description" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button type="submit" disabled={saving} className="btn-orange" style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13 }}>
              {saving ? 'Saving...' : form.id ? 'Update Brand' : 'Create Brand'}
            </button>
            <button type="button" onClick={closeForm} style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Brand', 'Slug', 'Description', 'Status', 'Created', 'Actions'].map((heading) => (
                  <th key={heading} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index}><td colSpan={6} style={{ padding: '14px' }}><div className="skeleton" style={{ height: 32, borderRadius: 10 }} /></td></tr>
                ))
              ) : brands.map((brand) => (
                <tr key={brand.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 14px', minWidth: 180, fontWeight: 700, color: '#111827' }}>{brand.name}</td>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#6b7280' }}>{brand.slug}</td>
                  <td style={{ padding: '12px 14px', color: '#6b7280', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{brand.description || '—'}</td>
                  <td style={{ padding: '12px 14px', color: brand.is_active ? '#16a34a' : '#9ca3af', fontWeight: 700 }}>{brand.is_active ? 'Active' : 'Inactive'}</td>
                  <td style={{ padding: '12px 14px', color: '#9ca3af' }}>{new Date(brand.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 14px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button type="button" onClick={() => openEdit(brand)} style={{ width: 34, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer', background: '#fff7ed', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Pencil size={14} />
                    </button>
                    <button type="button" onClick={() => toggleActive(brand)} style={{ width: 34, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer', background: brand.is_active ? '#dcfce7' : '#f3f4f6', color: brand.is_active ? '#16a34a' : '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {brand.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && brands.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 36, textAlign: 'center', color: '#9ca3af' }}>No brands found. Create one to begin.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#fff', borderTop: '1px solid #f3f4f6' }}>
          <span style={{ color: '#9ca3af' }}>{total} brands</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}><ChevronLeft size={16} /></button>
            <span style={{ color: '#111827', fontWeight: 700 }}>{page} / {totalPages}</span>
            <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer' }}><ChevronRight size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
