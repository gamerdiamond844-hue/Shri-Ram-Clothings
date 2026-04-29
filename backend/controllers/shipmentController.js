const { pool } = require('../config/db');
const delhivery = require('../services/delhiveryService');
const { sendPushToUser } = require('./notificationController');

// ── Helper: notify user about shipment update ─────────────────────────────────
const notifyUser = async (userId, orderId, message) => {
  try {
    await pool.query(
      `INSERT INTO src_notifications (user_id, message, type) VALUES ($1,$2,'order')`,
      [userId, message]
    );
    await sendPushToUser(userId, {
      title: 'Shri Ram Clothings',
      body: message,
      icon: '/logo.jpg',
      data: { url: '/orders' },
      tag: `order-${orderId}`,
    });
  } catch {}
};

// ── Admin: Ship an order (create Delhivery shipment) ──────────────────────────
const shipOrder = async (req, res) => {
  const { id } = req.params;
  try {
    // Get order with items
    const orderRes = await pool.query(
      `SELECT o.*,
        (SELECT json_agg(json_build_object('title',oi.title,'size',oi.size,'quantity',oi.quantity,'price',oi.price))
         FROM src_order_items oi WHERE oi.order_id=o.id) as items
       FROM src_orders o WHERE o.id=$1`,
      [id]
    );
    if (!orderRes.rows.length) return res.status(404).json({ message: 'Order not found' });
    const order = orderRes.rows[0];

    if (order.tracking_id) return res.status(400).json({ message: 'Shipment already created. AWB: ' + order.tracking_id });
    if (order.status === 'cancelled') return res.status(400).json({ message: 'Cannot ship a cancelled order' });

    // Call Delhivery API
    const shipment = await delhivery.createShipment(order);

    // Update order
    await pool.query(
      `UPDATE src_orders SET
        tracking_id=$1, courier_name=$2, shipment_status=$3,
        status='shipped', shipped_at=NOW(), updated_at=NOW()
       WHERE id=$4`,
      [shipment.awb, shipment.courier, shipment.status, id]
    );

    // Notify user
    await notifyUser(
      order.user_id, order.id,
      `🚚 Your order #${order.order_id} has been shipped! Tracking ID: ${shipment.awb}`
    );

    res.json({ message: 'Shipment created', awb: shipment.awb, courier: shipment.courier });
  } catch (err) {
    console.error('[Ship Order]', err.message);
    // Don't break order — mark as pending shipment
    await pool.query(
      `UPDATE src_orders SET shipment_status='api_error', updated_at=NOW() WHERE id=$1`,
      [id]
    ).catch(() => {});
    res.status(500).json({ message: 'Delhivery API error: ' + err.message });
  }
};

// ── User/Admin: Get tracking info ─────────────────────────────────────────────
const getTracking = async (req, res) => {
  const { id } = req.params; // order DB id
  try {
    const orderRes = await pool.query(
      `SELECT id, order_id, tracking_id, courier_name, shipment_status,
              estimated_delivery, status, shipped_at, delivered_at, user_id
       FROM src_orders WHERE id=$1`,
      [id]
    );
    if (!orderRes.rows.length) return res.status(404).json({ message: 'Order not found' });
    const order = orderRes.rows[0];

    // Verify ownership (skip for admin)
    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!order.tracking_id) {
      // Return logs from DB if no AWB yet
      const logs = await pool.query(
        'SELECT * FROM src_tracking_logs WHERE order_id=$1 ORDER BY scanned_at DESC',
        [id]
      );
      return res.json({ order, logs: logs.rows, live: null });
    }

    // Fetch live from Delhivery
    let live = null;
    try {
      live = await delhivery.trackShipment(order.tracking_id);
      if (live) {
        // Update estimated delivery
        if (live.estimatedDelivery) {
          await pool.query(
            `UPDATE src_orders SET estimated_delivery=$1, shipment_status=$2, tracking_synced_at=NOW() WHERE id=$3`,
            [live.estimatedDelivery, live.status, id]
          );
        }
        // Upsert tracking logs
        for (const scan of (live.scans || [])) {
          await pool.query(
            `INSERT INTO src_tracking_logs (order_id, awb, status, location, instructions, scanned_at)
             VALUES ($1,$2,$3,$4,$5,$6)
             ON CONFLICT DO NOTHING`,
            [id, order.tracking_id, scan.status, scan.location, scan.instructions, scan.timestamp || new Date()]
          ).catch(() => {});
        }
      }
    } catch (apiErr) {
      console.error('[Track Live]', apiErr.message);
    }

    const logs = await pool.query(
      'SELECT * FROM src_tracking_logs WHERE order_id=$1 ORDER BY scanned_at DESC',
      [id]
    );

    res.json({ order, logs: logs.rows, live });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── User: Cancel order ────────────────────────────────────────────────────────
const cancelOrder = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    const orderRes = await pool.query(
      'SELECT * FROM src_orders WHERE id=$1 AND user_id=$2',
      [id, req.user.id]
    );
    if (!orderRes.rows.length) return res.status(404).json({ message: 'Order not found' });
    const order = orderRes.rows[0];

    if (['delivered', 'cancelled', 'refunded'].includes(order.status)) {
      return res.status(400).json({ message: `Cannot cancel an order that is ${order.status}` });
    }
    if (order.status === 'shipped') {
      return res.status(400).json({ message: 'Order already shipped. Cancellation not allowed. Contact support.' });
    }

    // Cancel Delhivery shipment if AWB exists
    if (order.tracking_id) {
      try { await delhivery.cancelShipment(order.tracking_id); } catch {}
    }

    const refundStatus = order.payment_status === 'paid' ? 'refund_pending' : 'not_applicable';

    await pool.query(
      `UPDATE src_orders SET
        status='cancelled', shipment_status='cancelled',
        cancellation_reason=$1, payment_status=$2, updated_at=NOW()
       WHERE id=$3`,
      [reason || 'Cancelled by customer', refundStatus === 'refund_pending' ? 'refunded' : order.payment_status, id]
    );

    // Restore stock
    const items = await pool.query('SELECT * FROM src_order_items WHERE order_id=$1', [id]);
    for (const item of items.rows) {
      if (item.variant_id) {
        await pool.query('UPDATE src_product_variants SET stock=stock+$1 WHERE id=$2', [item.quantity, item.variant_id]);
      }
    }

    await notifyUser(order.user_id, id, `❌ Order #${order.order_id} has been cancelled.${refundStatus === 'refund_pending' ? ' Refund will be processed in 5-7 days.' : ''}`);

    res.json({ message: 'Order cancelled successfully', refund_status: refundStatus });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Admin: Cancel order (override) ───────────────────────────────────────────
const adminCancelOrder = async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  try {
    const orderRes = await pool.query('SELECT * FROM src_orders WHERE id=$1', [id]);
    if (!orderRes.rows.length) return res.status(404).json({ message: 'Order not found' });
    const order = orderRes.rows[0];

    if (order.tracking_id) {
      try { await delhivery.cancelShipment(order.tracking_id); } catch {}
    }

    await pool.query(
      `UPDATE src_orders SET status='cancelled', shipment_status='cancelled',
        cancellation_reason=$1, updated_at=NOW() WHERE id=$2`,
      [reason || 'Cancelled by admin', id]
    );

    await notifyUser(order.user_id, id, `❌ Your order #${order.order_id} has been cancelled by admin.`);
    res.json({ message: 'Order cancelled' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Cron: Sync tracking for all active shipments ──────────────────────────────
const syncTracking = async () => {
  try {
    const active = await pool.query(
      `SELECT id, order_id, tracking_id, user_id, status, shipment_status
       FROM src_orders
       WHERE tracking_id IS NOT NULL
         AND status NOT IN ('delivered','cancelled','refunded')
         AND (tracking_synced_at IS NULL OR tracking_synced_at < NOW() - INTERVAL '3 hours')`
    );

    console.log(`[Delhivery Sync] Syncing ${active.rows.length} shipments...`);

    for (const order of active.rows) {
      try {
        const live = await delhivery.trackShipment(order.tracking_id);
        if (!live) continue;

        const newStatus = delhivery.mapStatus(live.status);
        const updates = [live.estimatedDelivery, live.status, newStatus, new Date(), order.id];

        await pool.query(
          `UPDATE src_orders SET
            estimated_delivery=$1, shipment_status=$2, status=$3,
            tracking_synced_at=$4,
            delivered_at = CASE WHEN $3='delivered' AND delivered_at IS NULL THEN NOW() ELSE delivered_at END,
            updated_at=NOW()
           WHERE id=$5`,
          updates
        );

        // Save new scan logs
        for (const scan of (live.scans || [])) {
          await pool.query(
            `INSERT INTO src_tracking_logs (order_id, awb, status, location, instructions, scanned_at)
             VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`,
            [order.id, order.tracking_id, scan.status, scan.location, scan.instructions, scan.timestamp || new Date()]
          ).catch(() => {});
        }

        // Notify on key status changes
        if (newStatus === 'delivered' && order.status !== 'delivered') {
          await notifyUser(order.user_id, order.id, `✅ Your order #${order.order_id} has been delivered!`);
        } else if (live.status?.toLowerCase().includes('out for delivery') && order.shipment_status !== live.status) {
          await notifyUser(order.user_id, order.id, `🚚 Your order #${order.order_id} is out for delivery today!`);
        }

      } catch (err) {
        console.error(`[Sync] Failed for AWB ${order.tracking_id}:`, err.message);
      }
    }
    console.log('[Delhivery Sync] Done');
  } catch (err) {
    console.error('[Delhivery Sync Error]', err.message);
  }
};

module.exports = { shipOrder, getTracking, cancelOrder, adminCancelOrder, syncTracking };
