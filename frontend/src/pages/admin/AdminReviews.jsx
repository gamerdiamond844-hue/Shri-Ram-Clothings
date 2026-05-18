import { useState, useEffect, useCallback } from 'react';
import { Star, Eye, EyeOff, Pin, Trash2, Search, CheckCircle, X, MessageSquare, Download, ArrowUpDown, Image } from 'lucide-react';
import api, { downloadFile } from '../../utils/api';
import toast from 'react-hot-toast';

const inp = { width: '100%', padding: '9px 12px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff' };

function Stars({ rating, size = 12 }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={size} style={{ color: i <= rating ? '#f59e0b' : '#e5e7eb', fill: i <= rating ? '#f59e0b' : '#e5e7eb' }} />
      ))}
    </div>
  );
}

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'visible', label: 'Visible' },
  { key: 'hidden', label: 'Hidden' },
  { key: 'pinned', label: 'Pinned' },
  { key: '5', label: '5 Star' },
  { key: '4', label: '4 Star' },
  { key: '3', label: '3 Star' },
];

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [sort, setSort] = useState('recent');
  const [selectedReviews, setSelectedReviews] = useState([]);
  const [updating, setUpdating] = useState(null);
  const [noteModal, setNoteModal] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [mediaModal, setMediaModal] = useState(null);
  const LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: LIMIT, sort });
      if (search) p.set('search', search);
      if (filter) p.set('filter', filter);
      const [rRes, sRes] = await Promise.all([
        api.get(`/products/admin/reviews?${p}`),
        api.get('/products/admin/reviews/stats'),
      ]);
      setReviews(rRes.data.reviews || []);
      setTotal(rRes.data.total || 0);
      setStats(sRes.data);
      setSelectedReviews([]);
    } catch { toast.error('Failed to load reviews'); }
    finally { setLoading(false); }
  }, [page, search, filter, sort]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [search, filter, sort]);

  const update = async (reviewId, data) => {
    setUpdating(reviewId);
    try {
      await api.put(`/products/admin/reviews/${reviewId}`, data);
      toast.success('Review updated');
      load();
    } catch { toast.error('Failed'); }
    finally { setUpdating(null); }
  };

  const bulkAction = async (action) => {
    if (!selectedReviews.length) return;
    const confirmMessage = action === 'delete'
      ? 'Permanently delete selected reviews?'
      : `Update ${selectedReviews.length} selected reviews?`;
    if (action === 'delete' && !confirm(confirmMessage)) return;
    try {
      await Promise.all(selectedReviews.map(id => {
        if (action === 'delete') return api.delete(`/products/admin/reviews/${id}`);
        if (action === 'hide') return api.put(`/products/admin/reviews/${id}`, { is_hidden: true });
        if (action === 'show') return api.put(`/products/admin/reviews/${id}`, { is_hidden: false });
        if (action === 'pin') return api.put(`/products/admin/reviews/${id}`, { is_pinned: true });
        if (action === 'unpin') return api.put(`/products/admin/reviews/${id}`, { is_pinned: false });
        return Promise.resolve();
      }));
      toast.success('Bulk update completed');
      setSelectedReviews([]);
      load();
    } catch { toast.error('Bulk update failed'); }
  };

  const exportReviews = async () => {
    try {
      const params = new URLSearchParams({ format: 'csv', filter, sort });
      if (search) params.set('search', search);
      await downloadFile(`/products/admin/reviews/export?${params}`, 'reviews-export.csv');
    } catch { toast.error('Failed to export reviews'); }
  };

  const toggleSelectReview = (reviewId) => {
    setSelectedReviews(prev => prev.includes(reviewId) ? prev.filter(id => id !== reviewId) : [...prev, reviewId]);
  };

  const toggleSelectAll = () => {
    if (selectedReviews.length === reviews.length) {
      setSelectedReviews([]);
      return;
    }
    setSelectedReviews(reviews.map(r => r.id));
  };

  const remove = async (reviewId) => {
    if (!confirm('Permanently delete this review?')) return;
    try {
      await api.delete(`/products/admin/reviews/${reviewId}`);
      toast.success('Review deleted');
      load();
    } catch { toast.error('Failed'); }
  };

  const saveNote = async () => {
    if (!noteModal) return;
    await update(noteModal.id, { admin_note: noteText });
    setNoteModal(null);
    setNoteText('');
  };

  const isImageUrl = url => typeof url === 'string' && /\.(jpe?g|png|gif|webp|avif|bmp|svg)$/i.test(url);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Stats */}
      {stats && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
            {[
              { label: 'Total', value: stats.total, bg: '#f9fafb', color: '#111827' },
              { label: 'Visible', value: stats.visible, bg: '#f0fdf4', color: '#166534' },
              { label: 'Hidden', value: stats.hidden, bg: '#fef2f2', color: '#991b1b' },
              { label: 'Pinned', value: stats.pinned, bg: '#eff6ff', color: '#1e40af' },
              { label: 'Avg Rating', value: stats.avg_rating || '—', bg: '#fff7ed', color: '#c2410c' },
              { label: '5 Star', value: stats.five_star, bg: '#fefce8', color: '#854d0e' },
            ].map(({ label, value, bg, color }) => (
              <div key={label} style={{ background: bg, borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
                <div style={{ fontSize: 11, color, opacity: 0.7, fontWeight: 500, marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>

          {stats.top_products?.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginTop: 10 }}>
              {stats.top_products.slice(0, 4).map(product => (
                <div key={product.id} style={{ display:'flex', gap: 10, alignItems: 'center', padding: '14px 16px', borderRadius: 16, background: '#fff', border: '1px solid #e5e7eb' }}>
                  <img src={product.product_image || 'https://via.placeholder.com/48'} alt={product.product_title} style={{ width: 48, height: 48, borderRadius: 14, objectFit: 'cover' }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.product_title}</div>
                    <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{product.review_count} reviews · {product.avg_rating || '—'} avg</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Toolbar */}
      <div style={{ display: 'grid', gap: 12 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                style={{ padding: '6px 12px', borderRadius: 100, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: filter === f.key ? '#f97316' : '#fff', color: filter === f.key ? '#fff' : '#6b7280', boxShadow: filter === f.key ? '0 2px 8px rgba(249,115,22,0.3)' : '0 0 0 1.5px #e5e7eb' }}>
                {f.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={exportReviews} type="button" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 14px', borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#111827', fontSize: 13 }}>
              <Download size={14} /> Export CSV
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 12, border: '1px solid #e5e7eb', padding: '9px 12px', background: '#fff' }}>
              <ArrowUpDown size={14} />
              <select value={sort} onChange={e => setSort(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, cursor: 'pointer' }}>
                <option value="recent">Most recent</option>
                <option value="oldest">Oldest</option>
                <option value="rating_desc">Rating desc</option>
                <option value="rating_asc">Rating asc</option>
                <option value="product">Product name</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={toggleSelectAll} type="button" style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, cursor: 'pointer' }}>
              {selectedReviews.length === reviews.length ? 'Deselect all' : 'Select all'}
            </button>
            <span style={{ fontSize: 13, color: '#6b7280' }}>{selectedReviews.length} selected</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => bulkAction('hide')} type="button" disabled={!selectedReviews.length} style={{ padding: '8px 12px', borderRadius: 10, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fee2e2', cursor: selectedReviews.length ? 'pointer' : 'not-allowed' }}>Hide</button>
            <button onClick={() => bulkAction('show')} type="button" disabled={!selectedReviews.length} style={{ padding: '8px 12px', borderRadius: 10, background: '#ecfccb', color: '#166534', border: '1px solid #d9f99d', cursor: selectedReviews.length ? 'pointer' : 'not-allowed' }}>Show</button>
            <button onClick={() => bulkAction('pin')} type="button" disabled={!selectedReviews.length} style={{ padding: '8px 12px', borderRadius: 10, background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', cursor: selectedReviews.length ? 'pointer' : 'not-allowed' }}>Pin</button>
            <button onClick={() => bulkAction('unpin')} type="button" disabled={!selectedReviews.length} style={{ padding: '8px 12px', borderRadius: 10, background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', cursor: selectedReviews.length ? 'pointer' : 'not-allowed' }}>Unpin</button>
            <button onClick={() => bulkAction('delete')} type="button" disabled={!selectedReviews.length} style={{ padding: '8px 12px', borderRadius: 10, background: '#fee2e2', color: '#b91c1c', border: '1px solid #fecaca', cursor: selectedReviews.length ? 'pointer' : 'not-allowed' }}>Delete</button>
          </div>
        </div>

        <div style={{ position: 'relative', maxWidth: 320 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search reviews..." style={{ ...inp, paddingLeft: 30, width: '100%' }} />
        </div>
      </div>

      {/* Reviews table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '10px 14px', width: 40 }}>
                  <input type="checkbox" checked={selectedReviews.length === reviews.length && reviews.length > 0} onChange={toggleSelectAll} />
                </th>
                {['Customer', 'Product', 'Rating', 'Review', 'Media', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={8} style={{ padding: '10px 14px' }}><div className="skeleton" style={{ height: 32, borderRadius: 8 }} /></td></tr>
                ))
              ) : reviews.map(r => (
                <tr key={r.id} style={{ borderTop: '1px solid #f9fafb', opacity: r.is_hidden ? 0.5 : 1 }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                  <td style={{ padding: '12px 14px', width: 40 }}>
                    <input type="checkbox" checked={selectedReviews.includes(r.id)} onChange={() => toggleSelectReview(r.id)} />
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{r.user_name}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{r.user_email}</div>
                  </td>

                  <td style={{ padding: '12px 14px', maxWidth: 160 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {r.product_image && <img src={r.product_image} alt="" style={{ width: 28, height: 34, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />}
                      <span style={{ fontSize: 12, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>{r.product_title}</span>
                    </div>
                  </td>

                  <td style={{ padding: '12px 14px' }}>
                    <Stars rating={r.rating} size={12} />
                    <span style={{ fontSize: 11, color: '#9ca3af', marginTop: 2, display: 'block' }}>{r.rating}/5</span>
                  </td>

                  <td style={{ padding: '12px 14px', maxWidth: 200 }}>
                    <p style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {r.comment || <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>No comment</span>}
                    </p>
                    {r.admin_note && (
                      <p style={{ fontSize: 11, color: '#f97316', marginTop: 3, fontStyle: 'italic' }}>Note: {r.admin_note}</p>
                    )}
                  </td>

                  <td style={{ padding: '12px 14px', maxWidth: 120 }}>
                    {r.image_url ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                        {isImageUrl(r.image_url) ? (
                          <img src={r.image_url} alt="Review media" style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover', cursor: 'pointer', border: '1px solid #e5e7eb' }} onClick={() => setMediaModal(r)} />
                        ) : (
                          <button type="button" onClick={() => setMediaModal(r)} style={{ borderRadius: 10, border: '1px solid #e5e7eb', padding: '8px 10px', background: '#fff', cursor: 'pointer', color: '#2563eb', fontSize: 12 }}>View file</button>
                        )}
                        <button type="button" onClick={() => update(r.id, { remove_media: true })} disabled={updating === r.id}
                          style={{ borderRadius: 10, border: '1px solid #fee2e2', padding: '6px 10px', background: '#fef2f2', color: '#b91c1c', cursor: updating === r.id ? 'not-allowed' : 'pointer', fontSize: 11 }}>Remove media</button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>None</span>
                    )}
                  </td>

                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {r.is_pinned && <span style={{ fontSize: 10, fontWeight: 700, color: '#1e40af', background: '#eff6ff', padding: '2px 7px', borderRadius: 100 }}>Pinned</span>}
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100, background: r.is_hidden ? '#fee2e2' : '#dcfce7', color: r.is_hidden ? '#991b1b' : '#166534' }}>
                        {r.is_hidden ? 'Hidden' : 'Visible'}
                      </span>
                    </div>
                  </td>

                  <td style={{ padding: '12px 14px', color: '#9ca3af', fontSize: 11, whiteSpace: 'nowrap' }}>
                    {new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>

                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {/* Hide/Show */}
                      <button onClick={() => update(r.id, { is_hidden: !r.is_hidden })} disabled={updating === r.id}
                        title={r.is_hidden ? 'Show review' : 'Hide review'}
                        style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', background: r.is_hidden ? '#f0fdf4' : '#fef2f2', color: r.is_hidden ? '#16a34a' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: updating === r.id ? 0.5 : 1 }}>
                        {r.is_hidden ? <Eye size={13} /> : <EyeOff size={13} />}
                      </button>

                      {/* Pin/Unpin */}
                      <button onClick={() => update(r.id, { is_pinned: !r.is_pinned })} disabled={updating === r.id}
                        title={r.is_pinned ? 'Unpin' : 'Pin to top'}
                        style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', background: r.is_pinned ? '#eff6ff' : '#f9fafb', color: r.is_pinned ? '#1e40af' : '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: updating === r.id ? 0.5 : 1 }}>
                        <Pin size={13} />
                      </button>

                      {/* Admin note */}
                      <button onClick={() => { setNoteModal(r); setNoteText(r.admin_note || ''); }}
                        title="Add admin note"
                        style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', background: r.admin_note ? '#fff7ed' : '#f9fafb', color: r.admin_note ? '#f97316' : '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MessageSquare size={13} />
                      </button>

                      {/* Delete */}
                      <button onClick={() => remove(r.id)} title="Delete review"
                        style={{ width: 28, height: 28, borderRadius: 7, border: 'none', cursor: 'pointer', background: '#fef2f2', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && !reviews.length && (
                <tr><td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                  <Star size={28} style={{ margin: '0 auto 8px', opacity: 0.3, fill: '#e5e7eb', color: '#e5e7eb' }} />
                  No reviews found
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: '#9ca3af' }}>{total} reviews</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '5px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, opacity: page === 1 ? 0.4 : 1 }}>Prev</button>
              <span style={{ padding: '5px 10px', color: '#6b7280' }}>{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '5px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, opacity: page === totalPages ? 0.4 : 1 }}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Admin Note Modal */}
      {noteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Admin Note</p>
              <button onClick={() => setNoteModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 10 }}>Review by {noteModal.user_name} on "{noteModal.product_title}"</p>
            <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
              placeholder="Add internal note (not visible to customers)..."
              rows={3} style={{ ...inp, resize: 'none', marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={saveNote} className="btn-orange" style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <CheckCircle size={14} /> Save Note
              </button>
              <button onClick={() => setNoteModal(null)} style={{ padding: '10px 16px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {mediaModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Review media</p>
                <p style={{ fontSize: 12, color: '#6b7280' }}>{mediaModal.user_name} · {mediaModal.product_title}</p>
              </div>
              <button onClick={() => setMediaModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}><X size={18} /></button>
            </div>
            {isImageUrl(mediaModal.image_url) ? (
              <img src={mediaModal.image_url} alt="Review media" style={{ width: '100%', borderRadius: 16, objectFit: 'contain', maxHeight: '70vh' }} />
            ) : (
              <a href={mediaModal.image_url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: 14, background: '#f3f4f6', color: '#2563eb', textDecoration: 'none', fontSize: 13 }}>
                <Image size={16} /> Open uploaded file
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
