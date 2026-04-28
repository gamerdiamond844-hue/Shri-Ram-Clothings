import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, Tag, ShoppingBag, ArrowRight, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function Cart() {
  const { fetchCart } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const fetchItems = async () => {
    try { const res = await api.get('/cart'); setItems(res.data); }
    catch { setItems([]); } finally { setLoading(false); }
  };
  useEffect(() => { fetchItems(); }, []);

  const updateQty = async (id, quantity) => {
    if (quantity < 1) return;
    try { await api.put(`/cart/${id}`, { quantity }); fetchItems(); fetchCart(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };
  const removeItem = async (id) => {
    try { await api.delete(`/cart/${id}`); fetchItems(); fetchCart(); toast.success('Removed'); }
    catch { toast.error('Failed'); }
  };
  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await api.post('/orders/coupon/validate', { code: couponCode, cart_total: subtotal });
      setCoupon(res.data); toast.success(`Coupon applied! Save ₹${res.data.discount}`);
    } catch (err) { toast.error(err.response?.data?.message || 'Invalid coupon'); setCoupon(null); }
    finally { setCouponLoading(false); }
  };

  const subtotal = items.reduce((sum, item) => {
    const price = item.discount_percent > 0 ? Math.round(item.price * (1 - item.discount_percent / 100)) : item.price;
    return sum + price * item.quantity;
  }, 0);
  const discount = coupon?.discount || 0;
  const total = Math.max(0, subtotal - discount);
  const shipping = total >= 999 ? 0 : 99;
  const finalTotal = total + shipping;

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  );

  if (!items.length) return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '40px 16px', textAlign: 'center' }}>
      <div style={{ width: 72, height: 72, background: '#f9fafb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ShoppingBag size={32} color="#d1d5db" />
      </div>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Your cart is empty</h2>
        <p style={{ fontSize: 14, color: '#9ca3af' }}>Looks like you haven't added anything yet</p>
      </div>
      <Link to="/shop" className="btn-orange" style={{ padding: '12px 32px', borderRadius: 12, fontSize: 14, marginTop: 8 }}>
        Start Shopping <ArrowRight size={15} />
      </Link>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 0 60px' }}>
      <div className="wrap">
        <div style={{ marginBottom: 28 }}>
          <h1 className="font-display" style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 900, color: '#111827' }}>Shopping Cart</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>{items.length} item{items.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Responsive grid: stacked on mobile, 2/3 + 1/3 on desktop */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }} className="checkout-grid">

          {/* Items - spans 2 cols on desktop */}
          <div className="checkout-main" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {items.map(item => {
              const price = item.discount_percent > 0 ? Math.round(item.price * (1 - item.discount_percent / 100)) : item.price;
              return (
                <div key={item.id} style={{ background: '#fff', borderRadius: 16, padding: 16, display: 'flex', gap: 14, border: '1px solid #f3f4f6' }}>
                  <Link to={`/product/${item.product_id}`} style={{ flexShrink: 0, textDecoration: 'none' }}>
                    <img src={item.image_url || 'https://placehold.co/96x112/f5f5f5/999?text=IMG'} alt={item.title}
                      style={{ width: 80, height: 96, objectFit: 'cover', borderRadius: 10 }} />
                  </Link>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <h3 style={{ fontSize: 13, fontWeight: 600, color: '#111827', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.title}</h3>
                      <button onClick={() => removeItem(item.id)} style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: 4, display: 'flex' }}>
                        <X size={15} />
                      </button>
                    </div>
                    <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>Size: <strong style={{ color: '#374151' }}>{item.size}</strong></p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
                        <button onClick={() => updateQty(item.id, item.quantity - 1)} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', borderRight: '1px solid #e5e7eb' }}><Minus size={13} /></button>
                        <span style={{ width: 36, textAlign: 'center', fontSize: 13, fontWeight: 600 }}>{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', borderLeft: '1px solid #e5e7eb', opacity: item.quantity >= item.stock ? 0.3 : 1 }}><Plus size={13} /></button>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>₹{price * item.quantity}</div>
                        {item.discount_percent > 0 && <div style={{ fontSize: 11, color: '#9ca3af', textDecoration: 'line-through' }}>₹{item.price * item.quantity}</div>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Coupon */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #f3f4f6' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Tag size={14} color="#f97316" /> Coupon Code
              </p>
              {coupon ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>{coupon.coupon?.code}</div>
                    <div style={{ fontSize: 11, color: '#16a34a', marginTop: 2 }}>Saving ₹{coupon.discount}</div>
                  </div>
                  <button onClick={() => { setCoupon(null); setCouponCode(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#16a34a', display: 'flex' }}><X size={15} /></button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="Enter code"
                    style={{ flex: 1, padding: '9px 12px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                  <button onClick={applyCoupon} disabled={couponLoading} className="btn-primary" style={{ padding: '9px 16px', borderRadius: 8, fontSize: 12 }}>
                    {couponLoading ? '...' : 'Apply'}
                  </button>
                </div>
              )}
            </div>

            {/* Order summary */}
            <div style={{ background: '#fff', borderRadius: 16, padding: 20, border: '1px solid #f3f4f6' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Order Summary</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}><span>Subtotal</span><span style={{ fontWeight: 600, color: '#111827' }}>₹{subtotal}</span></div>
                {discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}><span>Coupon Discount</span><span style={{ fontWeight: 600 }}>-₹{discount}</span></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}>
                  <span>Shipping</span>
                  <span style={{ fontWeight: 600, color: shipping === 0 ? '#16a34a' : '#111827' }}>{shipping === 0 ? 'FREE' : `₹${shipping}`}</span>
                </div>
                {shipping > 0 && <p style={{ fontSize: 11, color: '#f97316', background: '#fff7ed', padding: '6px 10px', borderRadius: 8 }}>Add ₹{999 - total} more for free shipping</p>}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15, color: '#111827', borderTop: '1px solid #f3f4f6', paddingTop: 12, marginTop: 4 }}>
                  <span>Total</span><span>₹{finalTotal}</span>
                </div>
              </div>
              <button onClick={() => navigate('/checkout', { state: { items, subtotal, discount, total: finalTotal, coupon_code: coupon?.coupon?.code } })}
                className="btn-orange" style={{ width: '100%', padding: '14px', borderRadius: 12, fontSize: 14, marginTop: 16 }}>
                Proceed to Checkout <ArrowRight size={16} />
              </button>
              <Link to="/shop" style={{ display: 'block', textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 12, textDecoration: 'none' }}>← Continue Shopping</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
