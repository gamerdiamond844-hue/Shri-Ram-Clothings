import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Plus, CreditCard, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function Checkout() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [selectedAddr, setSelectedAddr] = useState(null);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [addrForm, setAddrForm] = useState({ full_name: user?.name || '', mobile: user?.phone || '', address: '', city: '', state: '', pincode: '', landmark: '', is_default: false });

  useEffect(() => {
    if (!state?.items?.length) { navigate('/cart'); return; }
    api.get('/users/addresses').then(r => {
      setAddresses(r.data);
      const def = r.data.find(a => a.is_default) || r.data[0];
      if (def) setSelectedAddr(def);
    }).catch(() => {});
  }, [state, navigate]);

  const saveAddress = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/users/addresses', addrForm);
      setAddresses(prev => [...prev, res.data]);
      setSelectedAddr(res.data);
      setShowAddrForm(false);
      toast.success('Address saved');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handlePayment = async () => {
    if (!selectedAddr) return toast.error('Please select a delivery address');
    setPlacing(true);
    try {
      const rzpRes = await api.post('/orders/razorpay', { amount: state.total });
      const { razorpay_order_id, amount, key } = rzpRes.data;
      const options = {
        key, amount, currency: 'INR', name: 'Shri Ram Clothings', description: 'Order Payment',
        order_id: razorpay_order_id,
        prefill: { name: selectedAddr.full_name, email: user.email, contact: selectedAddr.mobile },
        theme: { color: '#f97316' },
        handler: async (response) => {
          try {
            const orderItems = state.items.map(item => ({
              product_id: item.product_id, variant_id: item.variant_id, title: item.title, size: item.size,
              price: item.discount_percent > 0 ? Math.round(item.price * (1 - item.discount_percent / 100)) : item.price,
              quantity: item.quantity, image_url: item.image_url,
            }));
            const res = await api.post('/orders', {
              items: orderItems, subtotal: state.subtotal, discount_amount: state.discount, total: state.total,
              coupon_code: state.coupon_code, ...selectedAddr, email: user.email,
              razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature, payment_method: 'razorpay',
            });
            navigate('/order-success', { state: { order: res.data.order } });
          } catch (err) { toast.error('Order failed: ' + (err.response?.data?.message || err.message)); }
        },
        modal: { ondismiss: () => { setPlacing(false); toast.error('Payment cancelled'); } },
      };
      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => { toast.error('Payment failed'); setPlacing(false); });
      rzp.open();
    } catch (err) { toast.error(err.response?.data?.message || 'Payment gateway error'); setPlacing(false); }
  };

  if (!state?.items?.length) return null;

  const inp = { width: '100%', padding: '9px 12px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff' };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '40px 0 60px' }}>
      <div className="wrap">
        <div style={{ marginBottom: 28 }}>
          <h1 className="font-display" style={{ fontSize: 'clamp(22px, 4vw, 30px)', fontWeight: 900, color: '#111827' }}>Checkout</h1>
          <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>Complete your order</p>
        </div>

        <div className="checkout-grid">
          {/* Address - spans 2 cols on desktop */}
          <div className="checkout-main">
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={15} color="#f97316" /> Delivery Address
                </p>
                <button onClick={() => setShowAddrForm(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: '#f97316', background: 'none', border: 'none', cursor: 'pointer' }}>
                  {showAddrForm ? <><X size={13} /> Cancel</> : <><Plus size={13} /> Add New</>}
                </button>
              </div>

              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {showAddrForm && (
                  <form onSubmit={saveAddress} style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: 16, marginBottom: 4 }}>
                    <div className="form-grid-2">
                      {[['full_name','Full Name',true],['mobile','Mobile Number',true],['address','Street Address',true],['city','City',true],['state','State',true],['pincode','Pincode',true],['landmark','Landmark (Optional)',false]].map(([field, label, required]) => (
                        <div key={field} className={field === 'full_name' || field === 'address' || field === 'landmark' ? 'col-span-2' : ''}>
                          <input required={required} value={addrForm[field] || ''} onChange={e => setAddrForm(p => ({ ...p, [field]: e.target.value }))} placeholder={label} style={inp} />
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                      <button type="submit" className="btn-orange" style={{ padding: '9px 20px', borderRadius: 10, fontSize: 13 }}>Save Address</button>
                      <button type="button" onClick={() => setShowAddrForm(false)} style={{ padding: '9px 20px', borderRadius: 10, fontSize: 13, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', color: '#374151' }}>Cancel</button>
                    </div>
                  </form>
                )}

                {addresses.map(addr => (
                  <label key={addr.id} style={{ display: 'flex', gap: 12, padding: 16, borderRadius: 12, border: `2px solid ${selectedAddr?.id === addr.id ? '#111827' : '#f3f4f6'}`, cursor: 'pointer', background: selectedAddr?.id === addr.id ? '#f9fafb' : '#fff', transition: 'all 0.15s' }}>
                    <input type="radio" name="address" checked={selectedAddr?.id === addr.id} onChange={() => setSelectedAddr(addr)} style={{ marginTop: 2, accentColor: '#f97316', flexShrink: 0 }} />
                    <div style={{ fontSize: 13, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, color: '#111827' }}>{addr.full_name} <span style={{ color: '#9ca3af', fontWeight: 400 }}>· {addr.mobile}</span></p>
                      <p style={{ color: '#6b7280', marginTop: 3, fontSize: 12, lineHeight: 1.5 }}>{addr.address}, {addr.city}, {addr.state} — {addr.pincode}</p>
                      {addr.landmark && <p style={{ color: '#9ca3af', fontSize: 12 }}>Near: {addr.landmark}</p>}
                      {addr.is_default && <span style={{ fontSize: 10, fontWeight: 700, color: '#f97316', background: '#fff7ed', padding: '2px 7px', borderRadius: 10, display: 'inline-block', marginTop: 4 }}>Default</span>}
                    </div>
                  </label>
                ))}

                {!addresses.length && !showAddrForm && (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
                    <MapPin size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                    <p style={{ fontSize: 13 }}>No saved addresses. Add one above.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', padding: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Order Summary</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {state.items.map((item, i) => {
                  const price = item.discount_percent > 0 ? Math.round(item.price * (1 - item.discount_percent / 100)) : item.price;
                  return (
                    <div key={i} style={{ display: 'flex', gap: 10 }}>
                      <img src={item.image_url || 'https://placehold.co/48x56/f5f5f5/999?text=IMG'} alt="" style={{ width: 44, height: 52, objectFit: 'cover', borderRadius: 8, flexShrink: 0, background: '#f9fafb' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 500, color: '#111827', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4 }}>{item.title}</p>
                        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>Size: {item.size} × {item.quantity}</p>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginTop: 2 }}>₹{price * item.quantity}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}><span>Subtotal</span><span style={{ fontWeight: 600, color: '#111827' }}>₹{state.subtotal}</span></div>
                {state.discount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a' }}><span>Discount</span><span style={{ fontWeight: 600 }}>-₹{state.discount}</span></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}>
                  <span>Shipping</span>
                  <span style={{ fontWeight: 600, color: state.total >= 999 ? '#16a34a' : '#111827' }}>{state.total >= 999 ? 'FREE' : '₹99'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15, color: '#111827', borderTop: '1px solid #f3f4f6', paddingTop: 10, marginTop: 4 }}>
                  <span>Total</span><span>₹{state.total + (state.total >= 999 ? 0 : 99)}</span>
                </div>
              </div>
            </div>

            <button onClick={handlePayment} disabled={placing || !selectedAddr} className="btn-orange"
              style={{ width: '100%', padding: '14px', borderRadius: 12, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <CreditCard size={17} /> {placing ? 'Processing...' : 'Pay Now'}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: '#9ca3af' }}>
              <ShieldCheck size={13} color="#22c55e" /> 100% Secure · Powered by Razorpay
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
