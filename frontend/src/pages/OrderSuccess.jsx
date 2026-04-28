// OrderSuccess.jsx
import { useLocation, Link } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function OrderSuccess() {
  const { state } = useLocation();
  const order = state?.order;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-8 sm:p-12 max-w-md w-full text-center shadow-xl border border-gray-100">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-green-500" />
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-black text-gray-900 mb-2">Order Placed!</h1>
        <p className="text-gray-500 mb-6">Thank you for shopping with Shri Ram Clothings</p>
        {order && (
          <div className="bg-orange-50 rounded-2xl p-4 mb-6 text-left space-y-2">
            <div className="flex justify-between text-sm"><span className="text-gray-500">Order ID</span><span className="font-bold text-gray-900">#{order.order_id}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Total</span><span className="font-bold text-orange-600">₹{order.total}</span></div>
            <div className="flex justify-between text-sm"><span className="text-gray-500">Status</span><span className="font-semibold text-green-600 capitalize">{order.status}</span></div>
          </div>
        )}
        <div className="flex flex-col gap-3">
          <Link to="/orders" className="btn-primary py-3 rounded-2xl flex items-center justify-center gap-2">
            <Package size={18} /> Track Order
          </Link>
          <Link to="/shop" className="btn-outline py-3 rounded-2xl flex items-center justify-center gap-2">
            Continue Shopping <ArrowRight size={18} />
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
