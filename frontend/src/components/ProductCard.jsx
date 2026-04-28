import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, ShoppingBag, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function ProductCard({ product }) {
  const { user, fetchWishlist } = useAuth();
  const [wishlisted, setWishlisted] = useState(false);
  const [toggling, setToggling] = useState(false);

  const discounted = product.discount_percent > 0
    ? Math.round(product.price * (1 - product.discount_percent / 100))
    : null;

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return toast.error('Please login to save to wishlist');
    if (toggling) return;
    setToggling(true);
    try {
      const res = await api.post('/users/wishlist', { product_id: product.id });
      setWishlisted(res.data.wishlisted);
      fetchWishlist(); // update navbar badge count
      toast.success(res.data.wishlisted ? '❤️ Added to wishlist' : 'Removed from wishlist');
    } catch {
      toast.error('Failed');
    } finally {
      setToggling(false);
    }
  };

  return (
    <Link to={`/product/${product.id}`}
      className="card-hover"
      style={{ display: 'block', background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #f3f4f6', textDecoration: 'none', position: 'relative' }}>

      {/* Image */}
      <div style={{ position: 'relative', overflow: 'hidden', background: '#f9fafb', aspectRatio: '3/4' }}>
        <img
          src={product.primary_image || product.image_url || 'https://placehold.co/300x400/f9fafb/9ca3af?text=No+Image'}
          alt={product.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s ease', display: 'block' }}
          loading="lazy"
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        />

        {/* Discount badge */}
        {product.discount_percent > 0 && (
          <span style={{ position: 'absolute', top: 10, left: 10, background: '#f97316', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 4, letterSpacing: '0.04em' }}>
            -{product.discount_percent}%
          </span>
        )}

        {/* Trending badge */}
        {product.is_trending && (
          <span style={{ position: 'absolute', top: product.discount_percent > 0 ? 34 : 10, left: 10, background: '#111827', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 4 }}>
            🔥 Hot
          </span>
        )}

        {/* Wishlist heart button */}
        <button
          onClick={handleWishlist}
          title={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          style={{
            position: 'absolute', top: 10, right: 10,
            width: 32, height: 32, borderRadius: '50%',
            background: wishlisted ? '#fef2f2' : 'rgba(255,255,255,0.9)',
            border: 'none', cursor: toggling ? 'wait' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            transition: 'all 0.2s',
            zIndex: 2,
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
          onMouseLeave={e => { if (!wishlisted) e.currentTarget.style.background = 'rgba(255,255,255,0.9)'; }}>
          <Heart
            size={15}
            color={wishlisted ? '#ef4444' : '#9ca3af'}
            fill={wishlisted ? '#ef4444' : 'none'}
            style={{ transition: 'all 0.2s' }}
          />
        </button>

        {/* Quick view overlay */}
        <div style={{
          position: 'absolute', inset: '0 0 0 0', display: 'flex', alignItems: 'flex-end',
          padding: 10, opacity: 0, transition: 'opacity 0.25s',
        }}
          onMouseEnter={e => e.currentTarget.style.opacity = 1}
          onMouseLeave={e => e.currentTarget.style.opacity = 0}>
          <div style={{ width: '100%', background: '#111827', color: '#fff', borderRadius: 10, padding: '8px', fontSize: 12, fontWeight: 600, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <ShoppingBag size={13} /> View & Select Size
          </div>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '12px 14px 14px' }}>
        {product.category_name && (
          <div style={{ fontSize: 10, fontWeight: 700, color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5 }}>
            {product.category_name}
          </div>
        )}
        <h3 style={{ fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.4, marginBottom: 8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {product.title}
        </h3>

        {product.avg_rating > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 1 }}>
              {[1,2,3,4,5].map(i => (
                <Star key={i} size={10}
                  style={{ color: i <= Math.round(product.avg_rating) ? '#facc15' : '#e5e7eb', fill: i <= Math.round(product.avg_rating) ? '#facc15' : '#e5e7eb' }} />
              ))}
            </div>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>({product.review_count})</span>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>₹{discounted ?? product.price}</span>
          {discounted && (
            <>
              <span style={{ fontSize: 12, color: '#9ca3af', textDecoration: 'line-through' }}>₹{product.price}</span>
              <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>Save ₹{product.price - discounted}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}
