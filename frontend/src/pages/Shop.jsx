import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { X, ChevronDown } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import api from '../utils/api';

const CATS = [
  { label: 'All',         slug: '' },
  { label: 'T-Shirts',    slug: 't-shirts' },
  { label: 'Shirts',      slug: 'shirts' },
  { label: 'Jeans',       slug: 'jeans' },
  { label: 'Jackets',     slug: 'jackets' },
  { label: 'Ethnic Wear', slug: 'ethnic-wear' },
];

const SORTS = [
  { label: 'Newest',            value: 'newest' },
  { label: 'Price: Low → High', value: 'price_asc' },
  { label: 'Price: High → Low', value: 'price_desc' },
  { label: 'Most Popular',      value: 'popular' },
];

const LIMIT = 12;

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const category = searchParams.get('category') || '';
  const search   = searchParams.get('search')   || '';
  const sort     = searchParams.get('sort')     || 'newest';
  const featured = searchParams.get('featured') || '';
  const trending = searchParams.get('trending') || '';

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: LIMIT, sort });
      if (category) p.set('category', category);
      if (search)   p.set('search', search);
      if (featured) p.set('featured', featured);
      if (trending) p.set('trending', trending);
      const res = await api.get(`/products?${p}`);
      setProducts(res.data.products || []);
      setTotal(res.data.total || 0);
    } catch { setProducts([]); }
    finally { setLoading(false); }
  }, [page, category, search, sort, featured, trending]);

  useEffect(() => { setPage(1); }, [category, search, sort, featured, trending]);
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const setParam = (key, value) => {
    const p = new URLSearchParams(searchParams);
    if (value) p.set(key, value); else p.delete(key);
    if (key !== 'sort') { p.delete('featured'); p.delete('trending'); }
    setSearchParams(p);
  };

  const pageTitle = featured ? 'Featured Collection'
    : trending ? 'Trending Now'
    : search   ? `Results for "${search}"`
    : category ? CATS.find(c => c.slug === category)?.label || 'Shop'
    : 'All Products';

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>

      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #f3f4f6' }}>
        <div className="wrap" style={{ paddingTop: 24, paddingBottom: 20 }}>
          <h1 className="font-display" style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 900, color: '#111827', marginBottom: 16 }}>
            {pageTitle}
          </h1>

          {/* Category pills */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {CATS.map(cat => (
              <button key={cat.slug} onClick={() => setParam('category', cat.slug)}
                style={{
                  flexShrink: 0, padding: '7px 16px', borderRadius: 100, fontSize: 13, fontWeight: 500,
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  background: category === cat.slug ? '#f97316' : '#f3f4f6',
                  color: category === cat.slug ? '#fff' : '#374151',
                  boxShadow: category === cat.slug ? '0 2px 8px rgba(249,115,22,0.3)' : 'none',
                }}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="wrap" style={{ paddingTop: 24, paddingBottom: 48 }}>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: 13, color: '#9ca3af' }}>{total} product{total !== 1 ? 's' : ''} found</p>
          <div style={{ position: 'relative' }}>
            <select value={sort} onChange={e => setParam('sort', e.target.value)}
              style={{ appearance: 'none', background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 10, padding: '8px 36px 8px 14px', fontSize: 13, color: '#374151', cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}>
              {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
          </div>
        </div>

        {/* Active filter chips */}
        {(search || category) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {search && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff7ed', color: '#c2410c', fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 100, border: '1px solid #fed7aa' }}>
                Search: {search}
                <button onClick={() => setParam('search', '')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}><X size={11} /></button>
              </span>
            )}
            {category && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff7ed', color: '#c2410c', fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 100, border: '1px solid #fed7aa' }}>
                {CATS.find(c => c.slug === category)?.label}
                <button onClick={() => setParam('category', '')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}><X size={11} /></button>
              </span>
            )}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div className="grid-2-3-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ aspectRatio: '3/4', borderRadius: 16 }} />
            ))}
          </div>
        ) : products.length ? (
          <div className="grid-2-3-4">
            {products.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>👕</div>
            <p style={{ fontSize: 18, fontWeight: 600, color: '#374151', marginBottom: 6 }}>No products found</p>
            <p style={{ fontSize: 14, color: '#9ca3af' }}>Try a different category or search term</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 40 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: '8px 16px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 13, color: '#374151', cursor: 'pointer', opacity: page === 1 ? 0.4 : 1 }}>
              ← Prev
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const n = page <= 3 ? i + 1 : page - 2 + i;
              if (n < 1 || n > totalPages) return null;
              return (
                <button key={n} onClick={() => setPage(n)}
                  style={{ width: 38, height: 38, borderRadius: 10, border: n === page ? 'none' : '1.5px solid #e5e7eb', background: n === page ? '#f97316' : '#fff', color: n === page ? '#fff' : '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {n}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: '8px 16px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 13, color: '#374151', cursor: 'pointer', opacity: page === totalPages ? 0.4 : 1 }}>
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
