import { useState, useEffect, useCallback } from 'react';
import { Truck, Package, CheckCircle, XCircle, Clock, MapPin, RefreshCw, Search, Eye, X, RotateCcw } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const SHIP_FILTERS = [
  { key: '',           label: 'All Orders' },
  { key: 'unshipped',  label: 'Unshipped' },
  { key: 'shipped',    label: 'Shipped' },
  { key: 'delivered',  label: 'Delivered' },
  { key: 'cancelled',  label: 'Cancelled' },
];

const STATUS_STYLE = {
  pending:    { bg: '#fef9c3', color: '#854d0e' },
  confirmed:  { bg: '#dbeafe', color: '#1e40af' },
  processing: { bg: '#f3e8ff', color: '#6b21a8' },
  shipped:    { bg: '#e0e7ff', color: '#3730a3' },
  delivered:  { bg: '#dcfce7', color: '#166534' },
  cancelled:  { bg: '#fee2e2', color: '#991b1b' },
  refunded:   { bg: '#f3f4f6', color: '#374151' },
};

const inp = { width: '100%', padding: '9px 12px', fontSize: 13, border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', fontFamily: 'inherit', color: '#111827', background: '#fff' };

// ── Tracking Modal ────────────────────────────────────────────────────────────
function TrackingModal({ order, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/shipments/${order.id}/tracking`)
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load tracking'))
      .finally(() => setLoading(false));
  }, [order.id]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Live Tracking</p>
            <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>#{order.order_id} · AWB: <span style={{ color: '#f97316', fontWeight: 600 }}>{order.tracking_id}</span></p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}><X size={20} /></button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '16px 20px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
          ) : !data ? (
            <p style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>No tracking data available</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Status summary */}
              {data.live && (
                <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '14px 16px', border: '1px solid #bbf7d0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <Truck size={16} color="#16a34a" />
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#166534' }}>{data.live.status}</span>
                  </div>
                  {data.live.location && (
                    <p style={{ fontSize: 12, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MapPin size={11} /> {data.live.location}
                    </p>
                  )}
                  {data.live.estimatedDelivery && (
                    <p style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                      Est. Delivery: <strong>{new Date(data.live.estimatedDelivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                    </p>
                  )}
                </div>
              )}

              {/* Scan logs */}
              {data.logs?.length > 0 && (
                <div>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Tracking History</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {data.logs.map((log, i) => (
                      <div key={log.id} style={{ display: 'flex', gap: 12 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: i === 0 ? '#f97316' : '#d1d5db', flexShrink: 0, marginTop: 4 }} />
                        <div>
                          <p style={{ fontSize: 13, fontWeight: i === 0 ? 600 : 400, color: '#374151' }}>{log.status}</p>
                          {log.location && <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}><MapPin size={9} style={{ display: 'inline' }} /> {log.location}</p>}
                          <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{new Date(log.scanned_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!data.live && !data.logs?.length && (
                <p style={{ textAlign: 'center', color: '#9ca3af', padding: 24 }}>No tracking updates yet</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminDelivery() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [shipping, setShipping] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState(null);
  const LIMIT = 15;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: LIMIT });
      // Map delivery filters to order status
      if (filter === 'unshipped') p.set('status', 'confirmed');
      else if (filter === 'shipped') p.set('status', 'shipped');
      else if (filter === 'delivered') p.set('status', 'delivered');
      else if (filter === 'cancelled') p.set('status', 'cancelled');
      if (search) p.set('search', search);
      const res = await api.get(`/admin/orders?${p}`);
      setOrders(res.data.orders || []);
      setTotal(res.data.total || 0);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  }, [page, filter, search]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch {}
  }, []);

  useEffect(() => { fetchOrders(); fetchStats(); }, [fetchOrders, fetchStats]);
  useEffect(() => { setPage(1); }, [filter, search]);

  const shipOrder = async (order) => {
    if (!confirm(`Create Delhivery shipment for order #${order.order_id}?`)) return;
    setShipping(order.id);
    try {
      const res = await api.post(`/shipments/${order.id}/ship`);
      toast.success(`🚚 Shipped! AWB: ${res.data.awb}`);
      fetchOrders();
      fetchStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Delhivery API error'); }
    finally { setShipping(null); }
  };

  const cancelOrder = async (order) => {
    const reason = prompt(`Cancel order #${order.order_id}?\nReason (optional):`);
    if (reason === null) return;
    setCancelling(order.id);
    try {
      await api.post(`/shipments/${order.id}/admin-cancel`, { reason });
      toast.success('Order cancelled');
      fetchOrders();
      fetchStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setCancelling(null); }
  };

  const syncAll = async () => {
    setSyncing(true);
    try {
      toast.success('Tracking sync started in background');
      // Trigger sync via a lightweight endpoint — backend cron handles it
      await api.post('/shipments/sync').catch(() => {});
      setTimeout(() => { fetchOrders(); setSyncing(false); }, 3000);
    } catch { setSyncing(false); }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }} className="grid-features">
        {[
          { label: 'Total Orders',   value: stats?.totalOrders   || 0, icon: Package,      bg: '#eff6ff', color: '#1e40af' },
          { label: 'Shipped',        value: '-',                        icon: Truck,         bg: '#f0fdf4', color: '#166534' },
          { label: 'Delivered',      value: '-',                        icon: CheckCircle,   bg: '#dcfce7', color: '#15803d' },
          { label: 'Cancelled',      value: '-',                        icon: XCircle,       bg: '#fef2f2', color: '#991b1b' },
        ].map(({ label, value, icon: Icon, bg, color }) => (
          <div key={label} style={{ background: bg, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, background: 'rgba(255,255,255,0.6)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={18} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
              <div style={{ fontSize: 11, color, opacity: 0.7, fontWeight: 500 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          {SHIP_FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{ padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.15s', background: filter === f.key ? '#f97316' : '#fff', color: filter === f.key ? '#fff' : '#6b7280', boxShadow: filter === f.key ? '0 2px 8px rgba(249,115,22,0.3)' : '0 0 0 1.5px #e5e7eb' }}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order ID..."
              style={{ ...inp, paddingLeft: 30, width: 180 }} />
          </div>
          <button onClick={syncAll} disabled={syncing}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', cursor: syncing ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 600, color: '#374151', opacity: syncing ? 0.7 : 1 }}>
            <RefreshCw size={13} style={{ animation: syncing ? 'spin 0.75s linear infinite' : 'none' }} />
            {syncing ? 'Syncing...' : 'Sync Tracking'}
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Order', 'Customer', 'Amount', 'Status', 'AWB / Courier', 'Shipment', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} style={{ padding: '10px 14px' }}><div className="skeleton" style={{ height: 32, borderRadius: 8 }} /></td></tr>
                ))
              ) : orders.map(o => {
                const ss = STATUS_STYLE[o.status] || STATUS_STYLE.pending;
                const canShip = !o.tracking_id && !['cancelled', 'delivered', 'refunded'].includes(o.status);
                const canCancel = !['cancelled', 'delivered', 'refunded'].includes(o.status);
                const canTrack = !!o.tracking_id;

                return (
                  <tr key={o.id} style={{ borderTop: '1px solid #f9fafb' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f97316', fontSize: 12 }}>#{o.order_id}</span>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{new Date(o.created_at).toLocaleDateString('en-IN')}</div>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{o.full_name}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{o.mobile}</div>
                    </td>

                    <td style={{ padding: '12px 14px', fontWeight: 700, color: '#111827' }}>₹{o.total}</td>

                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 100, background: ss.bg, color: ss.color, textTransform: 'capitalize' }}>
                        {o.status}
                      </span>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      {o.tracking_id ? (
                        <div>
                          <div style={{ fontWeight: 700, color: '#1e40af', fontSize: 12 }}>{o.tracking_id}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>{o.courier_name || 'Delhivery'}</div>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: '#d1d5db' }}>—</span>
                      )}
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      {o.shipment_status ? (
                        <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'capitalize' }}>{o.shipment_status}</span>
                      ) : (
                        <span style={{ fontSize: 11, color: '#d1d5db' }}>—</span>
                      )}
                      {o.estimated_delivery && (
                        <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>
                          Est: {new Date(o.estimated_delivery).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {/* Ship Now */}
                        {canShip && (
                          <button onClick={() => shipOrder(o)} disabled={shipping === o.id} title="Ship Now"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontSize: 12, fontWeight: 600, cursor: shipping === o.id ? 'not-allowed' : 'pointer', opacity: shipping === o.id ? 0.7 : 1, whiteSpace: 'nowrap' }}>
                            {shipping === o.id
                              ? <><div className="spinner" style={{ width: 11, height: 11, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />Shipping...</>
                              : <><Truck size={11} />Ship Now</>
                            }
                          </button>
                        )}

                        {/* Track */}
                        {canTrack && (
                          <button onClick={() => setTrackingOrder(o)} title="View Tracking"
                            style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Eye size={13} />
                          </button>
                        )}

                        {/* Cancel */}
                        {canCancel && (
                          <button onClick={() => cancelOrder(o)} disabled={cancelling === o.id} title="Cancel Order"
                            style={{ width: 30, height: 30, borderRadius: 8, border: 'none', cursor: cancelling === o.id ? 'not-allowed' : 'pointer', background: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: cancelling === o.id ? 0.6 : 1 }}>
                            <XCircle size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && !orders.length && (
                <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                  <Truck size={28} style={{ margin: '0 auto 8px', opacity: 0.3 }} />
                  No orders found
                </td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
            <span style={{ color: '#9ca3af' }}>{total} orders</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: '5px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, opacity: page === 1 ? 0.4 : 1 }}>Prev</button>
              <span style={{ padding: '5px 10px', color: '#6b7280' }}>{page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: '5px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: 12, opacity: page === totalPages ? 0.4 : 1 }}>Next</button>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ background: '#fff7ed', borderRadius: 12, padding: '14px 16px', border: '1px solid #fed7aa', fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
        <strong>ℹ️ How it works:</strong> Click <strong>Ship Now</strong> to create a Delhivery shipment and generate AWB. Click <strong>👁 Track</strong> to view live tracking. Tracking syncs automatically every 3 hours. Set <code>DELHIVERY_API_TOKEN</code> on Render to activate.
      </div>

      {/* Tracking Modal */}
      {trackingOrder && <TrackingModal order={trackingOrder} onClose={() => setTrackingOrder(null)} />}
    </div>
  );
}
