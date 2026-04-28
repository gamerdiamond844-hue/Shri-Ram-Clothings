const { pool } = require('../config/db');

const getCart = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.quantity, c.product_id, c.variant_id,
        p.title, p.price, p.discount_percent, p.status,
        v.size, v.stock, v.extra_price,
        (SELECT image_url FROM src_product_images WHERE product_id=p.id AND is_primary=TRUE LIMIT 1) as image_url
       FROM src_cart c
       JOIN src_products p ON c.product_id = p.id
       LEFT JOIN src_product_variants v ON c.variant_id = v.id
       WHERE c.user_id=$1 AND p.deleted_at IS NULL`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const addToCart = async (req, res) => {
  const { product_id, variant_id, quantity = 1 } = req.body;
  if (!product_id || !variant_id) return res.status(400).json({ message: 'Product and size required' });
  try {
    const variant = await pool.query('SELECT stock FROM src_product_variants WHERE id=$1 AND product_id=$2', [variant_id, product_id]);
    if (!variant.rows.length) return res.status(404).json({ message: 'Size not found' });
    if (variant.rows[0].stock < quantity) return res.status(400).json({ message: 'Insufficient stock' });

    const result = await pool.query(
      `INSERT INTO src_cart (user_id, product_id, variant_id, quantity)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id, product_id, variant_id) DO UPDATE SET quantity=src_cart.quantity+$4
       RETURNING *`,
      [req.user.id, product_id, variant_id, quantity]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateCart = async (req, res) => {
  const { quantity } = req.body;
  if (!quantity || quantity < 1) return res.status(400).json({ message: 'Invalid quantity' });
  try {
    const result = await pool.query(
      'UPDATE src_cart SET quantity=$1 WHERE id=$2 AND user_id=$3 RETURNING *',
      [quantity, req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Cart item not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const removeFromCart = async (req, res) => {
  try {
    await pool.query('DELETE FROM src_cart WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ message: 'Removed from cart' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const clearCart = async (req, res) => {
  try {
    await pool.query('DELETE FROM src_cart WHERE user_id=$1', [req.user.id]);
    res.json({ message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getCart, addToCart, updateCart, removeFromCart, clearCart };
