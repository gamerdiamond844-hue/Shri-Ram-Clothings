import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const STATUSES = ['pending','confirmed','processing','shipped','delivered','cancelled','refunded'];

const STATUS_STYLE = {
  pending:    { background: '#fef9c3', color: '#854d0e' },
  confirmed:  { background: '#dbeafe', color: '#1e40af' },
  processing: { background: '#f3e8ff', color: '#6b21a8' },
  shipped:    { background: '#e0e7ff', color: '#3730a3' },
  delivered:  { background: '#dcfce7', color: '#166534' },
  cancelled:  { background: '#fee2e2', color: '#991b1b' },
  refunded:   { background: '#f3f4f6', color: '#374151' },
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [updating, setUpdating] = useState(null);
  const LIMIT = 15;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: LIMIT });
      if (statusFilter) p.set('status', statusFilter);
      const res = await api.get(`/admin/orders?${p}`);
      setOrders(res.data.orders || []);
      setTotal(res.data.total || 0);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  }, [page, statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { setPage(1); }, [statusFilter]);

  const updateStatus = async (id, status) => {
    setUpdating(id);
    try {
      await api.put(`/admin/orders/${id}/status`, { status });
      toast.success(`Marked as ${status}`);
      fetchOrders();
    } catch { toast.error('Failed'); }
    finally { setUpdating(null); }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Status filter pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {['', ...STATUSES].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            style={{
              padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600,
              border: 'none', cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s',
              background: statusFilter === s ? '#f97316' : '#fff',
              color: statusFilter === s ? '#fff' : '#6b7280',
              boxShadow: statusFilter === s ? '0 2px 8px rgba(249,115,22,0.3)' : '0 0 0 1.5px #e5e7eb',
            }}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Orders list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 72, borderRadius: 14 }} />
          ))
        ) : orders.map(o => {
          const s = STATUS_STYLE[o.status] || { background: '#f3f4f6', color: '#374151' };
          const ps = o.payment_status === 'paid' ? { background: '#dcfce7', color: '#166534' } : { background: '#fef9c3', color: '#854d0e' };
          const isOpen = expanded === o.id;
          return (
            <div key={o.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', overflow: 'hidden' }}>

              {/* Header row */}
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flexWrap: 'wrap' }}
                onClick={() => setExpanded(isOpen ? null : o.id)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#374151' }}>#{o.order_id}</span>
                    <span style={{ ...s, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100, textTransform: 'capitalize' }}>{o.status}</span>
                    <span style={{ ...ps, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100 }}>{o.payment_status}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#6b7280' }}>{o.full_name} · {o.mobile}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>₹{o.total}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{new Date(o.created_at).toLocaleDateString('en-IN')}</div>
                </div>
                {isOpen ? <ChevronUp size={15} color="#9ca3af" /> : <ChevronDown size={15} color="#9ca3af" />}
              </div>

              {/* Expanded */}
              {isOpen && (
                <div style={{ borderTop: '1px solid #f3f4f6', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                  {/* Items */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {o.items?.map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f97316', flexShrink: 0 }} />
                        <span style={{ flex: 1, color: '#374151' }}>{item.title}</span>
                        <span style={{ color: '#9ca3af' }}>Size: {item.size}</span>
                        <span style={{ color: '#9ca3af' }}>×{item.quantity}</span>
                        <span style={{ fontWeight: 700, color: '#111827' }}>₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>

                  {/* Address */}
                  <div style={{ background: '#f9fafb', borderRadius: 10, padding: '10px 14px', fontSize: 13 }}>
                    <div style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>Delivery Address</div>
                    <div style={{ color: '#6b7280' }}>{o.address}, {o.city}, {o.state} — {o.pincode}</div>
                    {o.landmark && <div style={{ color: '#9ca3af', marginTop: 2 }}>Near: {o.landmark}</div>}
                  </div>

                  {/* Status update */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Update Status</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {STATUSES.filter(st => st !== o.status).map(st => (
                        <button key={st} onClick={() => updateStatus(o.id, st)} disabled={updating === o.id}
                          style={{ padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 500, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s', opacity: updating === o.id ? 0.5 : 1 }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#f97316'; e.currentTarget.style.color = '#f97316'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#374151'; }}>
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!loading && !orders.length && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f3f4f6', padding: '48px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
            No orders found
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
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
  );
}
