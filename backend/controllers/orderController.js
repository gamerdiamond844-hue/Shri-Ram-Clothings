const PaytmChecksum = require('paytmchecksum');
const crypto = require('crypto');
const { pool } = require('../config/db');
const { sendOrderEmail } = require('./authController');
const { sendPushToUser } = require('./notificationController');

// Lazy init so the whole API doesn't crash on boot if env vars are missing.
// If Razorpay keys are not configured, only payment endpoints will return an error.
// Paytm integration handled via server-side checksum generation and verification

const generateOrderId = () => 'SRC' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();

// Create Paytm payment parameters and an order record (order stays pending until verification)
const createPaytmInitiate = async (req, res) => {
  const {
    items, subtotal, discount_amount = 0, total, coupon_code,
    delivery_charge = 0, free_delivery_applied = false,
    full_name, mobile, email, address, city, state, pincode, landmark, notes,
  } = req.body;

  if (!items?.length || !total || !full_name || !mobile || !address)
    return res.status(400).json({ message: 'Missing required order fields' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderId = generateOrderId();

    const orderResult = await client.query(
      `INSERT INTO src_orders (order_id, user_id, subtotal, discount_amount, total, coupon_code,
        free_delivery_applied, delivery_charge,
        payment_method, payment_status,
        full_name, mobile, email, address, city, state, pincode, landmark, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [orderId, req.user.id, subtotal, discount_amount, total, coupon_code || null,
       !!free_delivery_applied, Number(delivery_charge) || 0,
       'paytm', 'pending',
       full_name, mobile, email, address, city, state, pincode, landmark || null, notes || null,
       'pending']
    );
    const order = orderResult.rows[0];

    // Insert order items but do NOT reduce stock until payment is verified
    for (const item of items) {
      await client.query(
        `INSERT INTO src_order_items (order_id, product_id, variant_id, title, size, price, quantity, image_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [order.id, item.product_id, item.variant_id, item.title, item.size, item.price, item.quantity, item.image_url]
      );
    }

    // Update coupon usage only after successful payment to avoid false increments

    // Clear cart
    await client.query('DELETE FROM src_cart WHERE user_id=$1', [req.user.id]);

    await client.query('COMMIT');

    // Prepare Paytm params
    const mid = process.env.PAYTM_MID;
    const mkey = process.env.PAYTM_MKEY;
    const website = process.env.PAYTM_WEBSITE;
    const industry = process.env.PAYTM_INDUSTRY_TYPE;
    const channel = process.env.PAYTM_CHANNEL_ID || 'WEB';
    const callbackUrl = process.env.PAYTM_CALLBACK_URL;

    if (!mid || !mkey || !website || !industry || !callbackUrl) {
      return res.status(500).json({ message: 'Paytm is not configured. Set PAYTM_* env vars.' });
    }

    const paytmParams = {
      MID: mid,
      WEBSITE: website,
      CHANNEL_ID: channel,
      INDUSTRY_TYPE_ID: industry,
      ORDER_ID: order.order_id,
      CUST_ID: String(req.user.id),
      TXN_AMOUNT: String(Number(total).toFixed(2)),
      CALLBACK_URL: callbackUrl,
    };

    const checksum = await PaytmChecksum.generateSignature(paytmParams, mkey);
    paytmParams.CHECKSUMHASH = checksum;

    const paytmEnv = (process.env.PAYTM_ENV || 'staging').toLowerCase();
    const paytmUrl = paytmEnv === 'production'
      ? 'https://securegw.paytm.in/theia/processTransaction'
      : 'https://securegw-stage.paytm.in/theia/processTransaction';

    res.json({ paytmUrl, params: paytmParams, order_id: order.id });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
};

// Place order (for non-Paytm flows like COD) — retains original safe behavior
const placeOrder = async (req, res) => {
  const {
    items, subtotal, discount_amount = 0, total, coupon_code,
    delivery_charge = 0, free_delivery_applied = false,
    full_name, mobile, email, address, city, state, pincode, landmark, notes,
    payment_method = 'cod'
  } = req.body;

  if (!items?.length || !total || !full_name || !mobile || !address)
    return res.status(400).json({ message: 'Missing required order fields' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderId = generateOrderId();

    const orderResult = await client.query(
      `INSERT INTO src_orders (order_id, user_id, subtotal, discount_amount, total, coupon_code,
        free_delivery_applied, delivery_charge,
        payment_method, payment_status,
        full_name, mobile, email, address, city, state, pincode, landmark, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [orderId, req.user.id, subtotal, discount_amount, total, coupon_code || null,
       !!free_delivery_applied, Number(delivery_charge) || 0,
       payment_method, payment_method === 'cod' ? 'pending' : 'pending',
       full_name, mobile, email, address, city, state, pincode, landmark || null, notes || null,
       payment_method === 'cod' ? 'confirmed' : 'pending']
    );
    const order = orderResult.rows[0];

    // Insert order items and reduce stock for COD immediately
    for (const item of items) {
      await client.query(
        `INSERT INTO src_order_items (order_id, product_id, variant_id, title, size, price, quantity, image_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [order.id, item.product_id, item.variant_id, item.title, item.size, item.price, item.quantity, item.image_url]
      );
      await client.query(
        'UPDATE src_product_variants SET stock=stock-$1 WHERE id=$2 AND stock>=$1',
        [item.quantity, item.variant_id]
      );
    }

    // Update coupon usage
    if (coupon_code) {
      await client.query('UPDATE src_coupons SET used_count=used_count+1 WHERE code=$1', [coupon_code]);
    }

    // Clear cart
    await client.query('DELETE FROM src_cart WHERE user_id=$1', [req.user.id]);

    // Notification
    await client.query(
      `INSERT INTO src_notifications (user_id, message, type) VALUES ($1,$2,'order')`,
      [req.user.id, `Order #${orderId} placed successfully! Total: ₹${total}`]
    );

    await client.query('COMMIT');

    // Send order confirmation email (non-blocking)
    const userRes = await pool.query('SELECT name, email FROM src_users WHERE id=$1', [req.user.id]);
    if (userRes.rows.length) {
      sendOrderEmail(userRes.rows[0].email, userRes.rows[0].name, orderId, total, items).catch(() => {});
    }

    // Send push notification if the user has an active subscription
    sendPushToUser(req.user.id, {
      title: 'Order confirmed',
      body: `Order #${orderId} has been placed successfully! Total: ₹${total}`,
      icon: '/logo.jpg',
      badge: '/logo.jpg',
      data: { url: '/orders' },
      tag: `order-${orderId}`,
    }).catch(() => {});

    res.status(201).json({ order, message: 'Order placed successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
};

// Paytm callback handler — Paytm will POST transaction result here
const paytmCallback = async (req, res) => {
  const body = req.body || req.fields || {};
  const mkey = process.env.PAYTM_MKEY;
  try {
    const checksum = body.CHECKSUMHASH;
    const isValid = await PaytmChecksum.verifySignature(body, mkey, checksum);

    const orderRow = await pool.query('SELECT * FROM src_orders WHERE order_id=$1', [body.ORDERID]);
    if (!orderRow.rows.length) {
      // Unknown order, respond OK to Paytm but log
      return res.status(200).send('OK');
    }
    const order = orderRow.rows[0];

    // Idempotency: if already paid, acknowledge
    if (order.payment_status === 'paid') {
      const redirectUrl = `${process.env.PAYTM_FRONTEND_URL}/order-success?orderId=${order.id}`;
      return res.redirect(302, redirectUrl);
    }

    if (!isValid) {
      // Invalid signature
      await pool.query('UPDATE src_orders SET payment_status=$1 WHERE id=$2', ['failed', order.id]);
      const redirectUrl = `${process.env.PAYTM_FRONTEND_URL}/order-failed?orderId=${order.id}`;
      return res.redirect(302, redirectUrl);
    }

    // Verify amount
    const txnAmount = Number(body.TXNAMOUNT || body.TXN_AMOUNT || 0);
    if (Math.abs(txnAmount - Number(order.total)) > 0.01) {
      await pool.query('UPDATE src_orders SET payment_status=$1 WHERE id=$2', ['failed', order.id]);
      const redirectUrl = `${process.env.PAYTM_FRONTEND_URL}/order-failed?orderId=${order.id}`;
      return res.redirect(302, redirectUrl);
    }

    if ((body.STATUS || body.STATUS) === 'TXN_SUCCESS' || (body.STATUS === 'TXN_SUCCESS')) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(
          `UPDATE src_orders SET payment_status=$1, paytm_txn_id=$2, paytm_order_id=$3, paytm_signature=$4, status=$5, updated_at=NOW() WHERE id=$6`,
          ['paid', body.TXNID || null, body.ORDERID || null, checksum || null, 'confirmed', order.id]
        );

        // Reduce stock for order items
        const itemsRes = await client.query('SELECT * FROM src_order_items WHERE order_id=$1', [order.id]);
        for (const item of itemsRes.rows) {
          await client.query('UPDATE src_product_variants SET stock=stock-$1 WHERE id=$2 AND stock>=$1', [item.quantity, item.variant_id]);
        }

        // Update coupon usage
        if (order.coupon_code) {
          await client.query('UPDATE src_coupons SET used_count=used_count+1 WHERE code=$1', [order.coupon_code]);
        }

        // Notification
        await client.query(`INSERT INTO src_notifications (user_id, message, type) VALUES ($1,$2,'order')`, [order.user_id, `Order #${order.order_id} placed successfully! Total: ₹${order.total}`]);

        await client.query('COMMIT');

        // Send order confirmation email (non-blocking)
        const userRes = await pool.query('SELECT name, email FROM src_users WHERE id=$1', [order.user_id]);
        if (userRes.rows.length) {
          sendOrderEmail(userRes.rows[0].email, userRes.rows[0].name, order.order_id, order.total, itemsRes.rows).catch(() => {});
        }

        // Send push notification if the user has an active subscription
        sendPushToUser(order.user_id, {
          title: 'Order confirmed',
          body: `Order #${order.order_id} has been placed successfully! Total: ₹${order.total}`,
          icon: '/logo.jpg',
          badge: '/logo.jpg',
          data: { url: '/orders' },
          tag: `order-${order.order_id}`,
        }).catch(() => {});

        const redirectUrl = `${process.env.PAYTM_FRONTEND_URL}/order-success?orderId=${order.id}`;
        return res.redirect(302, redirectUrl);
      } catch (err) {
        await client.query('ROLLBACK');
        return res.status(500).send('Internal error');
      } finally {
        client.release();
      }
    }

    // Other statuses
    await pool.query('UPDATE src_orders SET payment_status=$1 WHERE id=$2', ['failed', order.id]);
    const redirectUrl = `${process.env.PAYTM_FRONTEND_URL}/order-failed?orderId=${order.id}`;
    return res.redirect(302, redirectUrl);
  } catch (err) {
    return res.status(500).send('Error processing callback');
  }
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await pool.query(
      `SELECT o.*, 
        (SELECT json_agg(json_build_object('title',oi.title,'size',oi.size,'quantity',oi.quantity,'price',oi.price,'image_url',oi.image_url))
         FROM src_order_items oi WHERE oi.order_id=o.id) as items
       FROM src_orders o WHERE o.user_id=$1 ORDER BY o.created_at DESC`,
      [req.user.id]
    );
    res.json(orders.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getOrderById = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*,
        (SELECT json_agg(json_build_object('title',oi.title,'size',oi.size,'quantity',oi.quantity,'price',oi.price,'image_url',oi.image_url))
         FROM src_order_items oi WHERE oi.order_id=o.id) as items
       FROM src_orders o WHERE o.id=$1 AND o.user_id=$2`,
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Order not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const validateCoupon = async (req, res) => {
  const { code, cart_total } = req.body;
  if (!code) return res.status(400).json({ message: 'Coupon code required' });
  try {
    const result = await pool.query(
      `SELECT * FROM src_coupons WHERE code=UPPER($1) AND is_active=TRUE
       AND (expires_at IS NULL OR expires_at > NOW())
       AND (max_uses IS NULL OR used_count < max_uses)`,
      [code]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Invalid or expired coupon' });
    const coupon = result.rows[0];
    if (cart_total < coupon.min_order_amount)
      return res.status(400).json({ message: `Minimum order amount ₹${coupon.min_order_amount} required` });
    const discount = coupon.discount_percent
      ? Math.round((cart_total * coupon.discount_percent) / 100)
      : coupon.discount_flat;
    res.json({ valid: true, coupon, discount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createPaytmInitiate, paytmCallback, placeOrder, getMyOrders, getOrderById, validateCoupon };
