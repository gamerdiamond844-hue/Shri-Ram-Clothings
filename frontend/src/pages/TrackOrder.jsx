import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Package, MapPin, Truck, CheckCircle, Clock, XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const STAGES = [
  { key: 'confirmed',  label: 'Order Confirmed',   icon: CheckCircle },
  { key: 'processing', label: 'Packed',             icon: Package },
  { key: 'shipped',    label: 'Shipped',            icon: Truck },
  { key: 'transit',    label: 'In Transit',         icon: MapPin },
  { key: 'ofd',        label: 'Out for Delivery',   icon: Truck },
  { key: 'delivered',  label: 'Delivered',          icon: CheckCircle },
];

const getStageIndex = (status, shipmentStatus) => {
  const s = (shipmentStatus || status || '').toLowerCase();
  if (s.includes('delivered')) return 5;
  if (s.includes('out for delivery') || s.includes('ofd')) return 4;
  if (s.includes('in transit') || s.includes('transit')) return 3;
  if (s === 'shipped' || s.includes('picked') || s.includes('manifested')) return 2;
  if (s === 'processing' || s === 'confirmed') return 1;
  return 0;
};

export default function TrackOrder() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await api.get(`/shipments/${id}/tracking`);
      setData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load tracking');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleCancel = async () => {
    const reason = prompt('Reason for cancellation (optional):');
    if (reason === null) return; // user pressed Cancel on prompt
    setCancelling(true);
    try {
      const res = await api.post(`/shipments/${id}/cancel`, { reason });
      toast.success(res.data.message);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cancellation failed');
    } finally { setCancelling(false); }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  );

  if (!data) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <XCircle size={40} color="#ef4444" />
      <p style={{ color: '#374151', fontWeight: 600 }}>Order not found</p>
      <Link to="/orders" className="btn-orange" style={{ padding: '10px 24px', borderRadius: 10, fontSize: 14 }}>Back to Orders</Link>
    </div>
  );

  const { order, logs, live } = data;
  const isCancelled = order.status === 'cancelled';
  const isDelivered = order.status === 'delivered';
  const canCancel = !['shipped', 'delivered', 'cancelled', 'refunded'].includes(order.status);
  const stageIdx = isCancelled ? -1 : getStageIndex(order.status, order.shipment_status);

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '32px 0 64px' }}>
      <div className="wrap" style={{ maxWidth: 680 }}>

        {/* Back */}
        <Link to="/orders" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6b7280', textDecoration: 'none', marginBottom: 20 }}>
          <ArrowLeft size={15} /> Back to Orders
        </Link>

        {/* Header */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Order ID</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#111827', fontFamily: 'monospace' }}>#{order.order_id}</p>
              {order.tracking_id && (
                <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                  Tracking: <span style={{ fontWeight: 700, color: '#f97316' }}>{order.tracking_id}</span>
                  {order.courier_name && <span style={{ color: '#9ca3af' }}> · {order.courier_name}</span>}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
              <span style={{
                fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 100, textTransform: 'capitalize',
                background: isCancelled ? '#fee2e2' : isDelivered ? '#dcfce7' : '#e0e7ff',
                color: isCancelled ? '#991b1b' : isDelivered ? '#166534' : '#3730a3',
              }}>
                {order.status}
              </span>
              {order.estimated_delivery && !isCancelled && (
                <p style={{ fontSize: 12, color: '#6b7280' }}>
                  Est. Delivery: <strong style={{ color: '#111827' }}>
                    {new Date(order.estimated_delivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </strong>
                </p>
              )}
              <button onClick={() => load(true)} disabled={refreshing}
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#f97316', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.75s linear infinite' : 'none' }} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Progress Timeline */}
        {!isCancelled && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', padding: '24px', marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 24 }}>Delivery Progress</p>
            <div style={{ position: 'relative' }}>
              {/* Progress line */}
              <div style={{ position: 'absolute', left: 19, top: 20, bottom: 20, width: 2, background: '#f3f4f6', zIndex: 0 }} />
              <div style={{
                position: 'absolute', left: 19, top: 20, width: 2,
                height: `${Math.min(stageIdx / (STAGES.length - 1), 1) * 100}%`,
                background: 'linear-gradient(to bottom, #f97316, #ea580c)',
                zIndex: 1, transition: 'height 0.5s ease',
              }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {STAGES.map((stage, i) => {
                  const done = i <= stageIdx;
                  const active = i === stageIdx;
                  const Icon = stage.icon;
                  return (
                    <div key={stage.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 16, paddingBottom: i < STAGES.length - 1 ? 28 : 0, position: 'relative', zIndex: 2 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: done ? (active ? '#f97316' : '#fff7ed') : '#f9fafb',
                        border: `2px solid ${done ? '#f97316' : '#e5e7eb'}`,
                        boxShadow: active ? '0 0 0 4px rgba(249,115,22,0.15)' : 'none',
                        transition: 'all 0.3s',
                      }}>
                        <Icon size={16} color={done ? '#f97316' : '#d1d5db'} />
                      </div>
                      <div style={{ paddingTop: 8 }}>
                        <p style={{ fontSize: 14, fontWeight: active ? 700 : done ? 600 : 400, color: done ? '#111827' : '#9ca3af' }}>
                          {stage.label}
                        </p>
                        {active && live?.location && (
                          <p style={{ fontSize: 12, color: '#f97316', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={11} /> {live.location}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Cancelled state */}
        {isCancelled && (
          <div style={{ background: '#fef2f2', borderRadius: 16, border: '1px solid #fecaca', padding: '20px 24px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
            <XCircle size={28} color="#ef4444" />
            <div>
              <p style={{ fontWeight: 700, color: '#991b1b', marginBottom: 4 }}>Order Cancelled</p>
              {order.cancellation_reason && <p style={{ fontSize: 13, color: '#b91c1c' }}>{order.cancellation_reason}</p>}
            </div>
          </div>
        )}

        {/* Tracking Logs */}
        {logs?.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', padding: '20px 24px', marginBottom: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 16 }}>Tracking History</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {logs.map((log, i) => (
                <div key={log.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: i === 0 ? '#f97316' : '#d1d5db', flexShrink: 0, marginTop: 5 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: i === 0 ? 600 : 400, color: '#374151' }}>{log.status}</p>
                    {log.location && <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={10} />{log.location}</p>}
                    {log.instructions && <p style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{log.instructions}</p>}
                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>
                      <Clock size={10} style={{ display: 'inline', marginRight: 3 }} />
                      {new Date(log.scanned_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No tracking yet */}
        {!order.tracking_id && !isCancelled && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', padding: '32px 24px', textAlign: 'center', marginBottom: 16 }}>
            <Package size={32} style={{ margin: '0 auto 12px', color: '#d1d5db' }} />
            <p style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>Shipment not yet created</p>
            <p style={{ fontSize: 13, color: '#9ca3af' }}>Your order is being prepared. Tracking will appear once shipped.</p>
          </div>
        )}

        {/* Cancel button */}
        {canCancel && (
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f3f4f6', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Need to cancel?</p>
              <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Cancellation is allowed before the order is shipped.</p>
            </div>
            <button onClick={handleCancel} disabled={cancelling}
              style={{ padding: '9px 20px', borderRadius: 10, border: '1.5px solid #ef4444', background: '#fff', color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: cancelling ? 'not-allowed' : 'pointer', opacity: cancelling ? 0.7 : 1 }}>
              {cancelling ? 'Cancelling...' : 'Cancel Order'}
            </button>
          </div>
        )}

        {order.status === 'shipped' && (
          <div style={{ background: '#fff7ed', borderRadius: 12, border: '1px solid #fed7aa', padding: '14px 20px', fontSize: 13, color: '#92400e' }}>
            ⚠️ Order already shipped. Cancellation is not allowed. Please contact support if needed.
          </div>
        )}
      </div>
    </div>
  );
}
