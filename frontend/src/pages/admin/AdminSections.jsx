import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const SECTION_TYPES = [
  { value: 'featured_products', label: '⭐ Featured Products' },
  { value: 'trending_products', label: '🔥 Trending Products' },
  { value: 'new_arrivals',      label: '✨ New Arrivals' },
  { value: 'categories',        label: '📂 Categories' },
  { value: 'best_sellers',      label: '🏆 Best Sellers' },
  { value: 'offer_banner',      label: '🎯 Offer Banner' },
  { value: 'reels',             label: '🎬 Reels / Videos' },
];

const inp = { width: '100%', padding: '9px 12px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff' };
const blank = { type: 'featured_products', title: '', subtitle: '', sort_order: 0, is_active: true };

export default function AdminSections() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/homepage/admin/sections');
      setSections(res.data);
    } catch { toast.error('Failed to load sections'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditing(null); setForm(blank); setShowForm(true); };
  const openEdit = (s) => {
    setEditing(s);
    setForm({ type: s.type, title: s.title || '', subtitle: s.subtitle || '', sort_order: s.sort_order, is_active: s.is_active });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/homepage/admin/sections/${editing.id}`, form);
        toast.success('Section updated!');
      } else {
        await api.post('/homepage/admin/sections', form);
        toast.success('Section added!');
      }
      setShowForm(false); load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const toggleActive = async (s) => {
    try { await api.put(`/homepage/admin/sections/${s.id}`, { is_active: !s.is_active }); load(); }
    catch { toast.error('Failed'); }
  };

  const deleteSection = async (id) => {
    if (!confirm('Delete this section?')) return;
    try { await api.delete(`/homepage/admin/sections/${id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Failed'); }
  };

  const moveOrder = async (id, direction, currentOrder) => {
    try { await api.put(`/homepage/admin/sections/${id}`, { sort_order: currentOrder + direction }); load(); }
    catch { toast.error('Failed'); }
  };

  const typeLabel = (type) => SECTION_TYPES.find(t => t.value === type)?.label || type;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Homepage Sections</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Control which sections appear on the homepage and in what order</div>
        </div>
        <button onClick={openAdd} className="btn-orange" style={{ padding: '9px 18px', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={15} /> Add Section
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #fed7aa', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{editing ? 'Edit Section' : 'Add Section'}</span>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}><X size={18} /></button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Section Type *</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={inp} disabled={!!editing}>
                {SECTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Title</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Featured Collection" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Subtitle</label>
              <input value={form.subtitle} onChange={e => setForm(p => ({ ...p, subtitle: e.target.value }))} placeholder="e.g. Handpicked for you" style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 5 }}>Sort Order</label>
              <input type="number" value={form.sort_order} onChange={e => setForm(p => ({ ...p, sort_order: e.target.value }))} style={inp} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 20 }}>
              <input type="checkbox" id="sec_active" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} style={{ accentColor: '#f97316', width: 16, height: 16 }} />
              <label htmlFor="sec_active" style={{ fontSize: 13, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>Active</label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving} className="btn-orange" style={{ padding: '9px 20px', borderRadius: 10, fontSize: 13 }}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Add Section'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '9px 20px', borderRadius: 10, fontSize: 13, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Sections list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 64, borderRadius: 12 }} />)}
        </div>
      ) : sections.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
          No sections yet. Add sections to build your homepage layout.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sections.map((s, idx) => (
            <div key={s.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #f3f4f6', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>

              {/* Order controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <button onClick={() => moveOrder(s.id, -1, s.sort_order)} disabled={idx === 0}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 1, opacity: idx === 0 ? 0.3 : 1, fontSize: 10 }}>▲</button>
                <button onClick={() => moveOrder(s.id, 1, s.sort_order)} disabled={idx === sections.length - 1}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 1, opacity: idx === sections.length - 1 ? 0.3 : 1, fontSize: 10 }}>▼</button>
              </div>

              {/* Type badge */}
              <div style={{ fontSize: 11, background: '#f3f4f6', color: '#374151', padding: '3px 8px', borderRadius: 6, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>
                {typeLabel(s.type)}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{s.title || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No title</span>}</div>
                {s.subtitle && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{s.subtitle}</div>}
              </div>

              {/* Order number */}
              <div style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>#{s.sort_order}</div>

              {/* Toggle */}
              <button onClick={() => toggleActive(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: s.is_active ? '#22c55e' : '#d1d5db', flexShrink: 0 }}>
                {s.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
              </button>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => openEdit(s)} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fff7ed', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Pencil size={12} />
                </button>
                <button onClick={() => deleteSection(s.id)} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
