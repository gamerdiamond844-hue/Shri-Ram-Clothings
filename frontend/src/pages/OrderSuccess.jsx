import { useLocation, Link } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight, Truck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OrderSuccess() {
  const { state } = useLocation();
  const order = state?.order;

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{ background: '#fff', borderRadius: 24, padding: '40px 32px', maxWidth: 440, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.08)', border: '1px solid #f3f4f6' }}
      >
        <div style={{ width: 72, height: 72, background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <CheckCircle size={36} color="#22c55e" />
        </div>

        <h1 className="font-display" style={{ fontSize: 26, fontWeight: 900, color: '#111827', marginBottom: 6 }}>Order Placed!</h1>
        <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 24 }}>Thank you for shopping with Shri Ram Clothings</p>

        {order && (
          <div style={{ background: '#fff7ed', borderRadius: 16, padding: '16px', marginBottom: 24, textAlign: 'left' }}>
            {[
              ['Order ID', `#${order.order_id}`],
              ['Total', `₹${order.total}`],
              ['Status', order.status],
              ...(order.tracking_id ? [['Tracking ID', order.tracking_id]] : []),
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                <span style={{ color: '#9ca3af' }}>{label}</span>
                <span style={{ fontWeight: 700, color: label === 'Tracking ID' ? '#f97316' : '#111827', textTransform: 'capitalize' }}>{value}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {order && (
            <Link to={`/track-order/${order.id}`} className="btn-orange"
              style={{ padding: '13px', borderRadius: 14, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Truck size={16} /> Track My Order
            </Link>
          )}
          <Link to="/orders" className="btn-primary"
            style={{ padding: '13px', borderRadius: 14, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Package size={16} /> My Orders
          </Link>
          <Link to="/shop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '13px', fontSize: 14, fontWeight: 600, color: '#374151', textDecoration: 'none', border: '1.5px solid #e5e7eb', borderRadius: 14 }}>
            Continue Shopping <ArrowRight size={16} />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
