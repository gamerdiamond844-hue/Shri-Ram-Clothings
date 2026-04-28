const webpush = require('web-push');
const { pool } = require('../config/db');
const { sendMail } = require('../services/mailService');

webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:support@shriramclothings.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// ── Helper: send push to a subscription ──────────────────────────────────────
const sendPush = async (subscription, payload) => {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    return true;
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      // Subscription expired — remove it
      await pool.query('DELETE FROM src_push_subscriptions WHERE endpoint=$1', [subscription.endpoint]).catch(() => {});
    }
    return false;
  }
};

// ── Get VAPID public key ──────────────────────────────────────────────────────
const getVapidKey = (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
};

// ── Subscribe user ────────────────────────────────────────────────────────────
const subscribe = async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys) return res.status(400).json({ message: 'Invalid subscription' });
  const user_id = req.user?.id || null;
  const user_agent = req.headers['user-agent'] || null;
  try {
    await pool.query(
      `INSERT INTO src_push_subscriptions (user_id, endpoint, keys, user_agent)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (endpoint) DO UPDATE SET user_id=$1, keys=$3, user_agent=$4`,
      [user_id, endpoint, JSON.stringify(keys), user_agent]
    );
    res.json({ message: 'Subscribed successfully' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Unsubscribe ───────────────────────────────────────────────────────────────
const unsubscribe = async (req, res) => {
  const { endpoint } = req.body;
  try {
    await pool.query('DELETE FROM src_push_subscriptions WHERE endpoint=$1', [endpoint]);
    res.json({ message: 'Unsubscribed' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Admin: Get all campaigns ──────────────────────────────────────────────────
const getCampaigns = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM src_notification_campaigns ORDER BY created_at DESC LIMIT 50');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Admin: Create campaign ────────────────────────────────────────────────────
const createCampaign = async (req, res) => {
  const { title, message, image_url, redirect_url, scheduled_at } = req.body;
  if (!title || !message) return res.status(400).json({ message: 'Title and message required' });
  try {
    const status = scheduled_at ? 'scheduled' : 'draft';
    const result = await pool.query(
      `INSERT INTO src_notification_campaigns (title, message, image_url, redirect_url, scheduled_at, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [title, message, image_url || null, redirect_url || '/', scheduled_at || null, status, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Admin: Send campaign now ──────────────────────────────────────────────────
const sendCampaign = async (req, res) => {
  try {
    const camp = await pool.query('SELECT * FROM src_notification_campaigns WHERE id=$1', [req.params.id]);
    if (!camp.rows.length) return res.status(404).json({ message: 'Campaign not found' });
    const c = camp.rows[0];

    const subs = await pool.query('SELECT * FROM src_push_subscriptions');
    let sent = 0;
    const payload = {
      title: c.title,
      body: c.message,
      icon: '/logo.jpg',
      badge: '/logo.jpg',
      image: c.image_url || undefined,
      data: { url: c.redirect_url || '/' },
      tag: `campaign-${c.id}`,
    };

    for (const sub of subs.rows) {
      const subscription = { endpoint: sub.endpoint, keys: typeof sub.keys === 'string' ? JSON.parse(sub.keys) : sub.keys };
      const ok = await sendPush(subscription, payload);
      if (ok) sent++;
    }

    await pool.query(
      'UPDATE src_notification_campaigns SET status=$1, sent_at=NOW(), sent_count=$2 WHERE id=$3',
      ['sent', sent, req.params.id]
    );
    res.json({ message: `Sent to ${sent} subscribers`, sent });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Admin: Delete campaign ────────────────────────────────────────────────────
const deleteCampaign = async (req, res) => {
  try {
    await pool.query('DELETE FROM src_notification_campaigns WHERE id=$1', [req.params.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Admin: Get stats ──────────────────────────────────────────────────────────
const getNotifStats = async (req, res) => {
  try {
    const [subs, camps] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM src_push_subscriptions'),
      pool.query('SELECT COUNT(*) FILTER (WHERE status=\'sent\') as sent, COALESCE(SUM(sent_count),0) as total_sent FROM src_notification_campaigns'),
    ]);
    res.json({
      subscribers: parseInt(subs.rows[0].count),
      campaigns_sent: parseInt(camps.rows[0].sent),
      total_pushes: parseInt(camps.rows[0].total_sent),
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Cart/Wishlist reminder (called by cron) ───────────────────────────────────
const sendCartReminders = async () => {
  try {
    // Find users with items in cart for 48+ hours who haven't ordered recently
    const cartUsers = await pool.query(`
      SELECT DISTINCT c.user_id, u.name, u.email,
        COUNT(c.id) as item_count,
        MIN(c.created_at) as oldest_item
      FROM src_cart c
      JOIN src_users u ON c.user_id = u.id
      WHERE c.created_at < NOW() - INTERVAL '48 hours'
        AND u.is_banned = FALSE
        AND NOT EXISTS (
          SELECT 1 FROM src_orders o
          WHERE o.user_id = c.user_id
            AND o.created_at > NOW() - INTERVAL '48 hours'
        )
      GROUP BY c.user_id, u.name, u.email
    `);

    for (const user of cartUsers.rows) {
      // Check reminder count — max 2 reminders
      const reminder = await pool.query(
        'SELECT * FROM src_cart_reminders WHERE user_id=$1 AND type=$2',
        [user.user_id, 'cart']
      );
      const count = reminder.rows[0]?.reminder_count || 0;
      if (count >= 2) continue;

      // Check last reminded — at least 24h gap
      const lastReminded = reminder.rows[0]?.last_reminded_at;
      if (lastReminded && new Date() - new Date(lastReminded) < 24 * 60 * 60 * 1000) continue;

      // Get user's push subscriptions
      const subs = await pool.query('SELECT * FROM src_push_subscriptions WHERE user_id=$1', [user.user_id]);
      if (!subs.rows.length) continue;

      const messages = [
        { title: '🛒 Your cart is waiting!', body: `You have ${user.item_count} item(s) in your cart. Complete your purchase before they sell out!` },
        { title: '⏰ Last chance!', body: `Your cart items are still available. Don't miss out — grab them now!` },
      ];
      const msg = messages[count] || messages[0];

      for (const sub of subs.rows) {
        const subscription = { endpoint: sub.endpoint, keys: typeof sub.keys === 'string' ? JSON.parse(sub.keys) : sub.keys };
        await sendPush(subscription, { ...msg, icon: '/logo.jpg', badge: '/logo.jpg', data: { url: '/cart' }, tag: 'cart-reminder' });
      }

      // Update reminder record
      if (reminder.rows.length) {
        await pool.query(
          'UPDATE src_cart_reminders SET reminder_count=$1, last_reminded_at=NOW() WHERE user_id=$2 AND type=$3',
          [count + 1, user.user_id, 'cart']
        );
      } else {
        await pool.query(
          'INSERT INTO src_cart_reminders (user_id, type, reminder_count, last_reminded_at) VALUES ($1,$2,1,NOW())',
          [user.user_id, 'cart']
        );
      }

      // Also send in-app notification
      await pool.query(
        `INSERT INTO src_notifications (user_id, message, type) VALUES ($1,$2,'cart')`,
        [user.user_id, `You have ${user.item_count} item(s) waiting in your cart! Complete your purchase.`]
      ).catch(() => {});
    }
    console.log(`✅ Cart reminders sent to ${cartUsers.rows.length} users`);
  } catch (err) { console.error('Cart reminder error:', err.message); }
};

// ── Send push to specific user (internal use) ─────────────────────────────────
const sendPushToUser = async (userId, payload) => {
  try {
    const subs = await pool.query('SELECT * FROM src_push_subscriptions WHERE user_id=$1', [userId]);
    for (const sub of subs.rows) {
      const subscription = { endpoint: sub.endpoint, keys: typeof sub.keys === 'string' ? JSON.parse(sub.keys) : sub.keys };
      await sendPush(subscription, payload);
    }
  } catch {}
};

module.exports = {
  getVapidKey, subscribe, unsubscribe,
  getCampaigns, createCampaign, sendCampaign, deleteCampaign, getNotifStats,
  sendCartReminders, sendPushToUser,
};
