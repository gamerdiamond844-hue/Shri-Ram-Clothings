import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Plus, Trash2, X } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

export default function SubmitProduct() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [sizes, setSizes] = useState([{ size: 'M', stock: 10, extra_price: 0 }]);
  const [form, setForm] = useState({ title: '', description: '', price: '', discount_percent: '', category_id: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/products/categories').then(r => setCategories(r.data)).catch(() => {});
  }, []);

  const handleImages = (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    setImages(files);
    setPreviews(files.map(f => URL.createObjectURL(f)));
  };

  const removeImage = (i) => {
    setImages(prev => prev.filter((_, idx) => idx !== i));
    setPreviews(prev => prev.filter((_, idx) => idx !== i));
  };

  const addSize = () => {
    const used = sizes.map(s => s.size);
    const next = SIZES.find(s => !used.includes(s));
    if (!next) return toast.error('All sizes added');
    setSizes(prev => [...prev, { size: next, stock: 10, extra_price: 0 }]);
  };

  const updateSize = (i, field, value) => {
    setSizes(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  };

  const removeSize = (i) => setSizes(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!images.length) return toast.error('Please add at least one image');
    if (!sizes.length) return toast.error('Please add at least one size');
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) fd.append(k, v); });
      images.forEach(img => fd.append('images', img));
      fd.append('sizes', JSON.stringify(sizes));
      await api.post('/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Product submitted for review!');
      navigate('/profile');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <h1 className="font-display text-2xl sm:text-3xl font-black text-gray-900 mb-8">Submit Product</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Images */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-4">Product Images (max 5)</h2>
            <div className="flex flex-wrap gap-3 mb-3">
              {previews.map((src, i) => (
                <div key={i} className="relative w-24 h-28 rounded-xl overflow-hidden border border-gray-200">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                    <X size={10} />
                  </button>
                  {i === 0 && <span className="absolute bottom-1 left-1 text-xs bg-orange-500 text-white px-1.5 py-0.5 rounded-full">Main</span>}
                </div>
              ))}
              {previews.length < 5 && (
                <label className="w-24 h-28 rounded-xl border-2 border-dashed border-orange-300 flex flex-col items-center justify-center cursor-pointer hover:bg-orange-50 transition-colors">
                  <Upload size={20} className="text-orange-400 mb-1" />
                  <span className="text-xs text-orange-400">Add Image</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImages} />
                </label>
              )}
            </div>
            <p className="text-xs text-gray-400">First image will be the main product image</p>
          </div>

          {/* Details */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 space-y-4">
            <h2 className="font-semibold text-gray-900">Product Details</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
              <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. Premium Cotton T-Shirt"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Describe your product..."
                rows={4} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Price (₹) *</label>
                <input required type="number" min="1" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                  placeholder="e.g. 599"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Discount %</label>
                <input type="number" min="0" max="90" value={form.discount_percent} onChange={e => setForm(p => ({ ...p, discount_percent: e.target.value }))}
                  placeholder="e.g. 10"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
              <select value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300">
                <option value="">Select category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Sizes */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Sizes & Stock *</h2>
              <button type="button" onClick={addSize} className="flex items-center gap-1 text-orange-500 text-sm font-medium hover:underline">
                <Plus size={16} /> Add Size
              </button>
            </div>
            <div className="space-y-3">
              {sizes.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <select value={s.size} onChange={e => updateSize(i, 'size', e.target.value)}
                    className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 w-24">
                    {SIZES.map(sz => <option key={sz} value={sz}>{sz}</option>)}
                  </select>
                  <div className="flex-1">
                    <input type="number" min="0" value={s.stock} onChange={e => updateSize(i, 'stock', e.target.value)}
                      placeholder="Stock"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                  </div>
                  <button type="button" onClick={() => removeSize(i)} className="text-red-400 hover:text-red-600 transition-colors p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full btn-primary py-4 rounded-2xl text-base font-semibold disabled:opacity-50">
            {submitting ? 'Submitting...' : 'Submit for Review'}
          </button>
        </form>
      </div>
    </div>
  );
}
