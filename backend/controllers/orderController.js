const Razorpay = require('razorpay');
const crypto = require('crypto');
const { pool } = require('../config/db');
const { sendOrderEmail } = require('./authController');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const generateOrderId = () => 'SRC' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();

const createRazorpayOrder = async (req, res) => {
  const { amount } = req.body;
  if (!amount) return res.status(400).json({ message: 'Amount required' });
  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: generateOrderId(),
    });
    res.json({ razorpay_order_id: order.id, amount: order.amount, currency: order.currency, key: process.env.RAZORPAY_KEY_ID });
  } catch (err) {
    res.status(500).json({ message: 'Payment gateway error: ' + err.message });
  }
};

const placeOrder = async (req, res) => {
  const {
    items, subtotal, discount_amount = 0, total, coupon_code,
    full_name, mobile, email, address, city, state, pincode, landmark, notes,
    razorpay_order_id, razorpay_payment_id, razorpay_signature, payment_method = 'razorpay'
  } = req.body;

  if (!items?.length || !total || !full_name || !mobile || !address)
    return res.status(400).json({ message: 'Missing required order fields' });

  // Verify Razorpay signature
  if (razorpay_payment_id && razorpay_signature) {
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSig = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
    if (expectedSig !== razorpay_signature)
      return res.status(400).json({ message: 'Payment verification failed' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const orderId = generateOrderId();
    const paymentStatus = razorpay_payment_id ? 'paid' : 'pending';

    const orderResult = await client.query(
      `INSERT INTO src_orders (order_id, user_id, subtotal, discount_amount, total, coupon_code,
        payment_method, razorpay_order_id, razorpay_payment_id, razorpay_signature, payment_status,
        full_name, mobile, email, address, city, state, pincode, landmark, notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       RETURNING *`,
      [orderId, req.user.id, subtotal, discount_amount, total, coupon_code || null,
       payment_method, razorpay_order_id || null, razorpay_payment_id || null, razorpay_signature || null, paymentStatus,
       full_name, mobile, email, address, city, state, pincode, landmark || null, notes || null,
       paymentStatus === 'paid' ? 'confirmed' : 'pending']
    );
    const order = orderResult.rows[0];

    // Insert order items and reduce stock
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

    res.status(201).json({ order, message: 'Order placed successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
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

module.exports = { createRazorpayOrder, placeOrder, getMyOrders, getOrderById, validateCoupon };
