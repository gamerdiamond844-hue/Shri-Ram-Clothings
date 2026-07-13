import { useLocation, Link } from 'react-router-dom';
import { XCircle, ArrowRight, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OrderFailed() {
  const { state } = useLocation();
  const message = state?.message || 'Your payment did not complete successfully. Please try again or choose Cash on Delivery.';

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{ background: '#fff', borderRadius: 24, padding: '40px 32px', maxWidth: 500, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.08)', border: '1px solid #f3f4f6' }}
      >
        <div style={{ width: 72, height: 72, background: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <XCircle size={36} color="#ef4444" />
        </div>
        <h1 className="font-display" style={{ fontSize: 26, fontWeight: 900, color: '#111827', marginBottom: 6 }}>Payment Failed</h1>
        <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 24 }}>{message}</p>

        <div style={{ display: 'grid', gap: 12 }}>
          <Link to="/checkout" state={{ items: state?.items || [], subtotal: state?.subtotal, discount: state?.discount, coupon_code: state?.coupon_code }}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: 14, background: '#f97316', color: '#fff', fontWeight: 700, textDecoration: 'none' }}>
            <ShoppingBag size={16} /> Retry Checkout
          </Link>
          <Link to="/orders" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '13px', borderRadius: 14, background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, textDecoration: 'none' }}>
            <ArrowRight size={16} /> View Orders
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
