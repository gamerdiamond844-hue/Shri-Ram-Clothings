const { pool } = require('../config/db');

// ── Wishlist ──────────────────────────────────────────────────────────────────
const getWishlist = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.title, p.price, p.discount_percent,
        (SELECT image_url FROM src_product_images WHERE product_id=p.id AND is_primary=TRUE LIMIT 1) as image_url,
        (SELECT AVG(rating)::NUMERIC(3,1) FROM src_reviews WHERE product_id=p.id) as avg_rating
       FROM src_wishlist w JOIN src_products p ON w.product_id=p.id
       WHERE w.user_id=$1 AND p.deleted_at IS NULL ORDER BY w.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const toggleWishlist = async (req, res) => {
  const { product_id } = req.body;
  if (!product_id) return res.status(400).json({ message: 'Product ID required' });
  try {
    const exists = await pool.query('SELECT 1 FROM src_wishlist WHERE user_id=$1 AND product_id=$2', [req.user.id, product_id]);
    if (exists.rows.length) {
      await pool.query('DELETE FROM src_wishlist WHERE user_id=$1 AND product_id=$2', [req.user.id, product_id]);
      return res.json({ wishlisted: false });
    }
    await pool.query('INSERT INTO src_wishlist (user_id, product_id) VALUES ($1,$2)', [req.user.id, product_id]);
    res.json({ wishlisted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Addresses ─────────────────────────────────────────────────────────────────
const getAddresses = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM src_addresses WHERE user_id=$1 ORDER BY is_default DESC, created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const addAddress = async (req, res) => {
  const { full_name, mobile, address, city, state, pincode, landmark, is_default } = req.body;
  if (!full_name || !mobile || !address || !city || !state || !pincode)
    return res.status(400).json({ message: 'All address fields required' });
  try {
    if (is_default) await pool.query('UPDATE src_addresses SET is_default=FALSE WHERE user_id=$1', [req.user.id]);
    const result = await pool.query(
      `INSERT INTO src_addresses (user_id, full_name, mobile, address, city, state, pincode, landmark, is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.user.id, full_name, mobile, address, city, state, pincode, landmark || null, is_default || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateAddress = async (req, res) => {
  const { full_name, mobile, address, city, state, pincode, landmark, is_default } = req.body;
  try {
    if (is_default) await pool.query('UPDATE src_addresses SET is_default=FALSE WHERE user_id=$1', [req.user.id]);
    const result = await pool.query(
      `UPDATE src_addresses SET full_name=$1, mobile=$2, address=$3, city=$4, state=$5, pincode=$6, landmark=$7, is_default=$8
       WHERE id=$9 AND user_id=$10 RETURNING *`,
      [full_name, mobile, address, city, state, pincode, landmark || null, is_default || false, req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Address not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteAddress = async (req, res) => {
  try {
    await pool.query('DELETE FROM src_addresses WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ message: 'Address deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Notifications ─────────────────────────────────────────────────────────────
const getNotifications = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM src_notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const markNotificationsRead = async (req, res) => {
  try {
    await pool.query('UPDATE src_notifications SET is_read=TRUE WHERE user_id=$1', [req.user.id]);
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getWishlist, toggleWishlist, getAddresses, addAddress, updateAddress, deleteAddress, getNotifications, markNotificationsRead };
