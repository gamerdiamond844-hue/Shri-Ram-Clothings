import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function Wishlist() {
  const { fetchWishlist } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null);

  const load = async () => {
    try {
      const res = await api.get('/users/wishlist');
      setItems(res.data || []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const removeItem = async (productId) => {
    setRemoving(productId);
    try {
      await api.post('/users/wishlist', { product_id: productId });
      setItems(prev => prev.filter(i => i.id !== productId));
      fetchWishlist(); // update navbar count
      toast.success('Removed from wishlist');
    } catch {
      toast.error('Failed to remove');
    } finally {
      setRemoving(null);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', paddingTop: 40, paddingBottom: 60 }}>
      <div className="wrap">

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 className="font-display" style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 900, color: '#111827' }}>
            My Wishlist
          </h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
            {items.length} item{items.length !== 1 ? 's' : ''} saved
          </p>
        </div>

        {/* Empty state */}
        {!items.length ? (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', padding: '80px 24px', textAlign: 'center' }}>
            <div style={{ width: 72, height: 72, background: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Heart size={32} color="#fca5a5" />
            </div>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Your wishlist is empty</p>
            <p style={{ fontSize: 14, color: '#9ca3af', marginBottom: 24 }}>Save products you love and find them here</p>
            <Link to="/shop" className="btn-orange" style={{ padding: '12px 32px', borderRadius: 12, fontSize: 14, display: 'inline-flex' }}>
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="grid-2-3-4">
            {items.map(item => {
              const discounted = item.discount_percent > 0
                ? Math.round(item.price * (1 - item.discount_percent / 100))
                : null;
              return (
                <div key={item.id} className="card-hover"
                  style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #f3f4f6', position: 'relative' }}>

                  {/* Image */}
                  <Link to={`/product/${item.id}`} style={{ display: 'block', textDecoration: 'none' }}>
                    <div style={{ position: 'relative', background: '#f9fafb', aspectRatio: '3/4', overflow: 'hidden' }}>
                      <img
                        src={item.image_url || item.primary_image || 'https://placehold.co/300x400/f9fafb/9ca3af?text=No+Image'}
                        alt={item.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.04)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      />
                      {item.discount_percent > 0 && (
                        <span style={{ position: 'absolute', top: 10, left: 10, background: '#f97316', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 4 }}>
                          -{item.discount_percent}%
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Remove button */}
                  <button
                    onClick={() => removeItem(item.id)}
                    disabled={removing === item.id}
                    title="Remove from wishlist"
                    style={{
                      position: 'absolute', top: 10, right: 10,
                      width: 32, height: 32, borderRadius: '50%',
                      background: removing === item.id ? '#fee2e2' : '#fff',
                      border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                      transition: 'all 0.15s',
                      color: '#ef4444',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                    onMouseLeave={e => { if (removing !== item.id) e.currentTarget.style.background = '#fff'; }}>
                    <Heart size={15} fill="#ef4444" />
                  </button>

                  {/* Info */}
                  <div style={{ padding: '12px 14px 14px' }}>
                    <Link to={`/product/${item.id}`} style={{ textDecoration: 'none' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.4, marginBottom: 8, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {item.title}
                      </p>
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>₹{discounted ?? item.price}</span>
                      {discounted && <span style={{ fontSize: 12, color: '#9ca3af', textDecoration: 'line-through' }}>₹{item.price}</span>}
                    </div>
                    <Link to={`/product/${item.id}`}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: '8px', background: '#111827', color: '#fff', borderRadius: 10, fontSize: 12, fontWeight: 600, textDecoration: 'none', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#1f2937'}
                      onMouseLeave={e => e.currentTarget.style.background = '#111827'}>
                      <ShoppingBag size={13} /> View Product
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
