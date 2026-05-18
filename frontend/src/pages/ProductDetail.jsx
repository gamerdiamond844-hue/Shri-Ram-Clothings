import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, Star, ChevronLeft, ChevronRight, Minus, Plus, ArrowLeft, Ruler, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import ReviewSection from '../components/ReviewSection';

const SIZE_DATA = {
  'T-Shirts': [
    { size: 'XS', chest: '34–35', waist: '28–29', shoulder: '16.5', length: '27' },
    { size: 'S',  chest: '36–37', waist: '30–31', shoulder: '17',   length: '28' },
    { size: 'M',  chest: '38–39', waist: '32–33', shoulder: '17.5', length: '29' },
    { size: 'L',  chest: '40–41', waist: '34–35', shoulder: '18',   length: '30' },
    { size: 'XL', chest: '42–43', waist: '36–37', shoulder: '18.5', length: '31' },
    { size: 'XXL',chest: '44–46', waist: '38–40', shoulder: '19',   length: '32' },
  ],
  'Shirts': [
    { size: 'XS', chest: '34–35', waist: '28–29', shoulder: '16.5', length: '28' },
    { size: 'S',  chest: '36–37', waist: '30–31', shoulder: '17',   length: '29' },
    { size: 'M',  chest: '38–39', waist: '32–33', shoulder: '17.5', length: '30' },
    { size: 'L',  chest: '40–41', waist: '34–35', shoulder: '18',   length: '31' },
    { size: 'XL', chest: '42–43', waist: '36–37', shoulder: '18.5', length: '32' },
    { size: 'XXL',chest: '44–46', waist: '38–40', shoulder: '19',   length: '33' },
  ],
  'Jeans': [
    { size: '28', chest: '—', waist: '28', shoulder: '—', length: '40 (inseam)' },
    { size: '30', chest: '—', waist: '30', shoulder: '—', length: '40 (inseam)' },
    { size: '32', chest: '—', waist: '32', shoulder: '—', length: '41 (inseam)' },
    { size: '34', chest: '—', waist: '34', shoulder: '—', length: '41 (inseam)' },
    { size: '36', chest: '—', waist: '36', shoulder: '—', length: '42 (inseam)' },
    { size: '38', chest: '—', waist: '38', shoulder: '—', length: '42 (inseam)' },
  ],
  'Jackets': [
    { size: 'XS', chest: '35–36', waist: '29–30', shoulder: '17',   length: '26' },
    { size: 'S',  chest: '37–38', waist: '31–32', shoulder: '17.5', length: '27' },
    { size: 'M',  chest: '39–40', waist: '33–34', shoulder: '18',   length: '28' },
    { size: 'L',  chest: '41–42', waist: '35–36', shoulder: '18.5', length: '29' },
    { size: 'XL', chest: '43–44', waist: '37–38', shoulder: '19',   length: '30' },
    { size: 'XXL',chest: '45–47', waist: '39–41', shoulder: '19.5', length: '31' },
  ],
  'Ethnic Wear': [
    { size: 'S',  chest: '36–37', waist: '30–31', shoulder: '17',   length: '42' },
    { size: 'M',  chest: '38–39', waist: '32–33', shoulder: '17.5', length: '43' },
    { size: 'L',  chest: '40–41', waist: '34–35', shoulder: '18',   length: '44' },
    { size: 'XL', chest: '42–43', waist: '36–37', shoulder: '18.5', length: '45' },
    { size: 'XXL',chest: '44–46', waist: '38–40', shoulder: '19',   length: '46' },
  ],
};
const DEFAULT_CHART = SIZE_DATA['T-Shirts'];

const HOW_TO = [
  { label: 'Chest', tip: 'Measure around the fullest part of your chest, keeping the tape horizontal.' },
  { label: 'Waist', tip: 'Measure around your natural waistline, just above the hip bone.' },
  { label: 'Shoulder', tip: 'Measure from the edge of one shoulder to the other across the back.' },
];

function SizeGuideModal({ category, onClose }) {
  const cats = Object.keys(SIZE_DATA);
  const matched = cats.find(c => category?.toLowerCase().includes(c.toLowerCase())) || cats[0];
  const [activeTab, setActiveTab] = useState(matched);
  const rows = SIZE_DATA[activeTab] || DEFAULT_CHART;
  const isJeans = activeTab === 'Jeans';

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', fn);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', fn); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      className="fade-in">
      <div style={{ background: '#fff', width: '100%', maxWidth: 640, maxHeight: '90vh', borderRadius: '20px 20px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ruler size={18} color="#f97316" />
            <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Size Guide</span>
            <span style={{ fontSize: 11, color: '#9ca3af', background: '#f3f4f6', padding: '2px 8px', borderRadius: 100 }}>All measurements in inches</span>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#f3f4f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151' }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px' }}>
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 20 }}>
            {cats.map(cat => (
              <button key={cat} onClick={() => setActiveTab(cat)}
                style={{ flexShrink: 0, padding: '7px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: activeTab === cat ? '#111827' : '#f3f4f6', color: activeTab === cat ? '#fff' : '#6b7280' }}>
                {cat}
              </button>
            ))}
          </div>
          <div style={{ overflowX: 'auto', marginBottom: 24 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#111827' }}>
                  {['Size', isJeans ? 'Waist' : 'Chest', isJeans ? 'Length (Inseam)' : 'Waist', isJeans ? null : 'Shoulder', isJeans ? null : 'Length'].filter(Boolean).map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.size} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#111827', fontSize: 14 }}>{row.size}</td>
                    {isJeans ? (
                      <><td style={{ padding: '10px 14px', color: '#374151' }}>{row.waist}"</td><td style={{ padding: '10px 14px', color: '#374151' }}>{row.length}"</td></>
                    ) : (
                      <><td style={{ padding: '10px 14px', color: '#374151' }}>{row.chest}"</td><td style={{ padding: '10px 14px', color: '#374151' }}>{row.waist}"</td><td style={{ padding: '10px 14px', color: '#374151' }}>{row.shoulder}"</td><td style={{ padding: '10px 14px', color: '#374151' }}>{row.length}"</td></>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 12 }}>How to Measure</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {HOW_TO.map(h => (
                <div key={h.label} style={{ display: 'flex', gap: 12, background: '#f9fafb', borderRadius: 10, padding: '12px 14px' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 2 }}>{h.label}</p>
                    <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{h.tip}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
            <strong>Note:</strong> Measurements may vary slightly by ±0.5". If you are between sizes, we recommend sizing up for a comfortable fit.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, fetchCart } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [wishlisted, setWishlisted] = useState(false);
  const [adding, setAdding] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  const loadProduct = () => {
    api.get(`/products/${id}`)
      .then(r => { setProduct(r.data); if (r.data.variants?.length) setSelectedVariant(r.data.variants[0]); })
      .catch(() => navigate('/shop'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { setLoading(true); loadProduct(); }, [id]);

  const discountedPrice = product?.discount_percent > 0
    ? Math.round(product.price * (1 - product.discount_percent / 100))
    : null;

  const handleAddToCart = async () => {
    if (!user) return toast.error('Please login to add to cart');
    if (!selectedVariant) return toast.error('Please select a size');
    if (selectedVariant.stock < 1) return toast.error('Out of stock');
    setAdding(true);
    try {
      await api.post('/cart', { product_id: product.id, variant_id: selectedVariant.id, quantity });
      await fetchCart();
      toast.success('Added to cart!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add to cart');
    } finally { setAdding(false); }
  };

  const handleBuyNow = async () => { await handleAddToCart(); navigate('/cart'); };

  const handleWishlist = async () => {
    if (!user) return toast.error('Please login');
    try {
      const res = await api.post('/users/wishlist', { product_id: product.id });
      setWishlisted(res.data.wishlisted);
      toast.success(res.data.wishlisted ? 'Added to wishlist' : 'Removed from wishlist');
    } catch { toast.error('Failed'); }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
      <div className="spinner" />
    </div>
  );

  if (!product) return null;

  const images = product.images?.length
    ? product.images
    : [{ image_url: 'https://placehold.co/600x700/f5f5f5/999?text=No+Image' }];

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <div className="wrap" style={{ paddingTop: 32, paddingBottom: 64 }}>

        {/* Breadcrumb */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#9ca3af', marginBottom: 28 }}>
          <button onClick={() => navigate('/shop')}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 12, fontWeight: 500, padding: 0 }}>
            <ArrowLeft size={13} /> Shop
          </button>
          <span>/</span>
          {product.category_name && <><span>{product.category_name}</span><span>/</span></>}
          <span style={{ color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{product.title}</span>
        </nav>

        {/* Main grid */}
        <div className="product-grid">

          {/* Images */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ position: 'relative', background: '#f9fafb', borderRadius: 16, overflow: 'hidden', aspectRatio: '4/5' }}>
              <img src={images[activeImg]?.image_url} alt={product.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'opacity 0.3s' }} />
              {images.length > 1 && (
                <>
                  <button onClick={() => setActiveImg(i => (i - 1 + images.length) % images.length)}
                    style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                    <ChevronLeft size={18} />
                  </button>
                  <button onClick={() => setActiveImg(i => (i + 1) % images.length)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                    <ChevronRight size={18} />
                  </button>
                </>
              )}
              {product.discount_percent > 0 && (
                <span style={{ position: 'absolute', top: 14, left: 14, background: '#f97316', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 6 }}>
                  -{product.discount_percent}% OFF
                </span>
              )}
              {images.length > 1 && (
                <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
                  {images.map((_, i) => (
                    <button key={i} onClick={() => setActiveImg(i)}
                      style={{ width: i === activeImg ? 20 : 6, height: 6, borderRadius: 3, background: i === activeImg ? '#f97316' : 'rgba(255,255,255,0.6)', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.25s' }} />
                  ))}
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                {images.map((img, i) => (
                  <button key={i} onClick={() => setActiveImg(i)}
                    style={{ flexShrink: 0, width: 64, height: 76, borderRadius: 10, overflow: 'hidden', border: `2px solid ${activeImg === i ? '#f97316' : 'transparent'}`, cursor: 'pointer', padding: 0, background: 'none', transition: 'border-color 0.2s' }}>
                    <img src={img.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              {product.category_name && (
                <p style={{ fontSize: 11, fontWeight: 700, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{product.category_name}</p>
              )}
              <h1 className="font-display" style={{ fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 900, color: '#111827', lineHeight: 1.2, marginBottom: 12 }}>{product.title}</h1>
              {product.avg_rating > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} size={14} style={{ color: i <= Math.round(product.avg_rating) ? '#facc15' : '#e5e7eb', fill: i <= Math.round(product.avg_rating) ? '#facc15' : '#e5e7eb' }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>{product.avg_rating} · {product.review_count} reviews</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 30, fontWeight: 900, color: '#111827' }}>₹{discountedPrice ?? product.price}</span>
                {discountedPrice && (
                  <>
                    <span style={{ fontSize: 18, color: '#9ca3af', textDecoration: 'line-through', fontWeight: 400 }}>₹{product.price}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', padding: '3px 8px', borderRadius: 20 }}>Save ₹{product.price - discountedPrice}</span>
                  </>
                )}
              </div>
            </div>

            <div style={{ height: 1, background: '#f3f4f6' }} />

            {product.variants?.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Select Size</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {selectedVariant && <p style={{ fontSize: 12, color: '#9ca3af' }}>{selectedVariant.stock > 0 ? `${selectedVariant.stock} in stock` : 'Out of stock'}</p>}
                    <button onClick={() => setSizeGuideOpen(true)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#f97316', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: 3 }}>
                      <Ruler size={13} /> Size Guide
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {product.variants.map(v => (
                    <button key={v.id} onClick={() => v.stock > 0 && setSelectedVariant(v)} disabled={v.stock < 1}
                      style={{ position: 'relative', width: 52, height: 52, borderRadius: 10, border: `2px solid ${selectedVariant?.id === v.id ? '#111827' : v.stock < 1 ? '#f3f4f6' : '#e5e7eb'}`, background: selectedVariant?.id === v.id ? '#111827' : v.stock < 1 ? '#f9fafb' : '#fff', color: selectedVariant?.id === v.id ? '#fff' : v.stock < 1 ? '#d1d5db' : '#374151', fontSize: 13, fontWeight: 600, cursor: v.stock < 1 ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}>
                      {v.size}
                      {v.stock < 5 && v.stock > 0 && (
                        <span style={{ position: 'absolute', top: -6, right: -6, width: 16, height: 16, background: '#f97316', color: '#fff', fontSize: 8, fontWeight: 700, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{v.stock}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 10 }}>Quantity</p>
              <div style={{ display: 'inline-flex', alignItems: 'center', border: '1.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} style={{ width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', borderRight: '1px solid #e5e7eb', color: '#374151' }}><Minus size={15} /></button>
                <span style={{ width: 48, textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#111827' }}>{quantity}</span>
                <button onClick={() => setQuantity(q => Math.min(selectedVariant?.stock || 10, q + 1))} style={{ width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', borderLeft: '1px solid #e5e7eb', color: '#374151' }}><Plus size={15} /></button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleAddToCart} disabled={adding || !selectedVariant || selectedVariant?.stock < 1} className="btn-outline"
                style={{ flex: 1, padding: '14px 12px', borderRadius: 12, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: (adding || !selectedVariant || selectedVariant?.stock < 1) ? 0.4 : 1 }}>
                <ShoppingCart size={16} /> {adding ? 'Adding...' : 'Add to Cart'}
              </button>
              <button onClick={handleBuyNow} disabled={!selectedVariant || selectedVariant?.stock < 1} className="btn-orange"
                style={{ flex: 1, padding: '14px 12px', borderRadius: 12, fontSize: 13, opacity: (!selectedVariant || selectedVariant?.stock < 1) ? 0.4 : 1 }}>
                Buy Now
              </button>
              <button onClick={handleWishlist}
                style={{ width: 52, height: 52, borderRadius: 12, border: `2px solid ${wishlisted ? '#fca5a5' : '#e5e7eb'}`, background: wishlisted ? '#fef2f2' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                <Heart size={18} color={wishlisted ? '#ef4444' : '#9ca3af'} fill={wishlisted ? '#ef4444' : 'none'} />
              </button>
            </div>

            {product.description && (
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 18 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 8 }}>Description</p>
                <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7 }}>{product.description}</p>
              </div>
            )}
          </div>
        </div>

        <ReviewSection
          productId={id}
          reviews={product.reviews || []}
          avgRating={product.avg_rating}
          reviewCount={parseInt(product.review_count) || 0}
          onRefresh={loadProduct}
        />
      </div>

      {sizeGuideOpen && <SizeGuideModal category={product.category_name} onClose={() => setSizeGuideOpen(false)} />}
    </div>
  );
}
