import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, ChevronDown, ChevronUp, ShoppingBag } from 'lucide-react';
import api from '../utils/api';

const STATUS_STYLE = {
  pending:    { bg: '#fef9c3', color: '#854d0e', dot: '#eab308' },
  confirmed:  { bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6' },
  processing: { bg: '#f3e8ff', color: '#6b21a8', dot: '#a855f7' },
  shipped:    { bg: '#e0e7ff', color: '#3730a3', dot: '#6366f1' },
  delivered:  { bg: '#dcfce7', color: '#166534', dot: '#22c55e' },
  cancelled:  { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
  refunded:   { bg: '#f3f4f6', color: '#374151', dot: '#9ca3af' },
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api.get('/orders/my').then(r => setOrders(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 0 60px' }}>
      <div className="wrap" style={{ maxWidth: 720 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 className="font-display" style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 900, color: '#111827' }}>My Orders</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>{orders.length} order{orders.length !== 1 ? 's' : ''} placed</p>
        </div>

        {!orders.length ? (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', padding: '64px 24px', textAlign: 'center' }}>
            <div style={{ width: 60, height: 60, background: '#f9fafb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <ShoppingBag size={26} color="#d1d5db" />
            </div>
            <p style={{ fontWeight: 600, color: '#374151', marginBottom: 6 }}>No orders yet</p>
            <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 24 }}>Your order history will appear here</p>
            <Link to="/shop" className="btn-orange" style={{ padding: '11px 32px', borderRadius: 12, fontSize: 14, display: 'inline-flex' }}>Start Shopping</Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {orders.map(order => {
              const s = STATUS_STYLE[order.status] || STATUS_STYLE.pending;
              const isOpen = expanded === order.id;
              return (
                <div key={order.id} style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
                  <button onClick={() => setExpanded(isOpen ? null : order.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 40, height: 40, background: '#f9fafb', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Package size={18} color="#9ca3af" />
                      </div>
                      <div>
                        <p style={{ fontWeight: 700, color: '#111827', fontSize: 13, fontFamily: 'monospace' }}>#{order.order_id}</p>
                        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                          {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 100, background: s.bg, color: s.color, textTransform: 'capitalize' }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.dot, flexShrink: 0 }} />
                        {order.status}
                      </span>
                      <span style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>₹{order.total}</span>
                      {isOpen ? <ChevronUp size={15} color="#9ca3af" /> : <ChevronDown size={15} color="#9ca3af" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="fade-in" style={{ borderTop: '1px solid #f3f4f6', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {order.items?.map((item, i) => (
                          <div key={i} style={{ display: 'flex', gap: 12 }}>
                            <img src={item.image_url || 'https://placehold.co/48x56/f5f5f5/999?text=IMG'} alt=""
                              style={{ width: 44, height: 52, objectFit: 'cover', borderRadius: 8, flexShrink: 0, background: '#f9fafb' }} />
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{item.title}</p>
                              <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Size: {item.size} × {item.quantity}</p>
                              <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginTop: 2 }}>₹{item.price * item.quantity}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px', fontSize: 12 }}>
                        <p style={{ fontWeight: 700, color: '#374151', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Delivery Details</p>
                        <p style={{ color: '#374151' }}><strong>{order.full_name}</strong> · {order.mobile}</p>
                        <p style={{ color: '#6b7280', marginTop: 3 }}>{order.address}, {order.city}, {order.state} — {order.pincode}</p>
                        <p style={{ color: '#6b7280', marginTop: 6 }}>Payment: <span style={{ fontWeight: 600, color: order.payment_status === 'paid' ? '#16a34a' : '#d97706' }}>{order.payment_status}</span></p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
