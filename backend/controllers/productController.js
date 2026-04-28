const { pool } = require('../config/db');

const getProducts = async (req, res) => {
  const { search, category, page = 1, limit = 12, featured, trending, sort = 'newest', seller } = req.query;
  const offset = (page - 1) * limit;
  const conditions = [`p.status = 'approved'`, `p.deleted_at IS NULL`];
  const values = [];
  let idx = 1;

  if (search) { conditions.push(`(p.title ILIKE $${idx} OR p.description ILIKE $${idx})`); values.push(`%${search}%`); idx++; }
  if (category) { conditions.push(`c.slug = $${idx}`); values.push(category); idx++; }
  if (featured === 'true') { conditions.push(`p.is_featured = TRUE`); }
  if (trending === 'true') { conditions.push(`p.is_trending = TRUE`); }
  if (seller) { conditions.push(`p.seller_id = $${idx}`); values.push(seller); idx++; }

  const orderMap = { newest: 'p.created_at DESC', oldest: 'p.created_at ASC', price_asc: 'p.price ASC', price_desc: 'p.price DESC', popular: 'p.views DESC' };
  const orderBy = orderMap[sort] || 'p.created_at DESC';

  const where = conditions.join(' AND ');
  try {
    const countRes = await pool.query(
      `SELECT COUNT(*) FROM src_products p LEFT JOIN src_categories c ON p.category_id = c.id WHERE ${where}`,
      values
    );
    const total = parseInt(countRes.rows[0].count);

    values.push(limit, offset);
    const result = await pool.query(
      `SELECT p.*, c.name as category_name, c.slug as category_slug,
        u.name as seller_name, u.avatar_url as seller_avatar,
        (SELECT image_url FROM src_product_images WHERE product_id=p.id AND is_primary=TRUE LIMIT 1) as primary_image,
        (SELECT AVG(rating)::NUMERIC(3,1) FROM src_reviews WHERE product_id=p.id) as avg_rating,
        (SELECT COUNT(*) FROM src_reviews WHERE product_id=p.id) as review_count
       FROM src_products p
       LEFT JOIN src_categories c ON p.category_id = c.id
       LEFT JOIN src_users u ON p.seller_id = u.id
       WHERE ${where} ORDER BY ${orderBy} LIMIT $${idx} OFFSET $${idx + 1}`,
      values
    );
    res.json({ products: result.rows, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getProduct = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, c.name as category_name, c.slug as category_slug,
        u.name as seller_name, u.avatar_url as seller_avatar, u.id as seller_id
       FROM src_products p
       LEFT JOIN src_categories c ON p.category_id = c.id
       LEFT JOIN src_users u ON p.seller_id = u.id
       WHERE p.id=$1 AND p.deleted_at IS NULL`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Product not found' });
    const product = result.rows[0];

    const [images, variants, reviews] = await Promise.all([
      pool.query('SELECT * FROM src_product_images WHERE product_id=$1 ORDER BY is_primary DESC, sort_order ASC', [product.id]),
      pool.query('SELECT * FROM src_product_variants WHERE product_id=$1 ORDER BY CASE size WHEN \'XS\' THEN 1 WHEN \'S\' THEN 2 WHEN \'M\' THEN 3 WHEN \'L\' THEN 4 WHEN \'XL\' THEN 5 WHEN \'XXL\' THEN 6 ELSE 7 END', [product.id]),
      pool.query(`SELECT r.*, u.name as user_name, u.avatar_url FROM src_reviews r JOIN src_users u ON r.user_id=u.id WHERE r.product_id=$1 ORDER BY r.created_at DESC LIMIT 10`, [product.id]),
    ]);

    await pool.query('UPDATE src_products SET views=views+1 WHERE id=$1', [product.id]);
    res.json({ ...product, images: images.rows, variants: variants.rows, reviews: reviews.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createProduct = async (req, res) => {
  const { title, description, price, discount_percent = 0, category_id, sizes } = req.body;
  if (!title || !price) return res.status(400).json({ message: 'Title and price are required' });
  if (!req.files?.length) return res.status(400).json({ message: 'At least one image is required' });
  try {
    const status = req.user.role === 'admin' ? 'approved' : 'pending';
    const result = await pool.query(
      `INSERT INTO src_products (title, description, price, discount_percent, category_id, seller_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [title, description, price, discount_percent, category_id || null, req.user.id, status]
    );
    const product = result.rows[0];

    // Insert images
    for (let i = 0; i < req.files.length; i++) {
      await pool.query(
        'INSERT INTO src_product_images (product_id, image_url, is_primary, sort_order) VALUES ($1,$2,$3,$4)',
        [product.id, req.files[i].path, i === 0, i]
      );
    }

    // Insert size variants
    if (sizes) {
      const parsedSizes = typeof sizes === 'string' ? JSON.parse(sizes) : sizes;
      for (const s of parsedSizes) {
        await pool.query(
          'INSERT INTO src_product_variants (product_id, size, stock, extra_price) VALUES ($1,$2,$3,$4)',
          [product.id, s.size, s.stock || 0, s.extra_price || 0]
        );
      }
    }

    res.status(201).json({ ...product, message: status === 'pending' ? 'Product submitted for review' : 'Product published' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateProduct = async (req, res) => {
  const { title, description, price, discount_percent, category_id, sizes, is_featured, is_trending, status, admin_message } = req.body;
  try {
    const existing = await pool.query('SELECT * FROM src_products WHERE id=$1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Product not found' });
    const p = existing.rows[0];
    if (req.user.role !== 'admin' && p.seller_id !== req.user.id)
      return res.status(403).json({ message: 'Not authorized' });

    const fields = [], values = [];
    let idx = 1;
    if (title)                        { fields.push(`title=$${idx++}`);            values.push(title); }
    if (description !== undefined)    { fields.push(`description=$${idx++}`);      values.push(description); }
    if (price)                        { fields.push(`price=$${idx++}`);            values.push(price); }
    if (discount_percent !== undefined){ fields.push(`discount_percent=$${idx++}`); values.push(discount_percent); }
    if (category_id !== undefined)    { fields.push(`category_id=$${idx++}`);     values.push(category_id || null); }
    // Admin-only fields
    if (req.user.role === 'admin') {
      if (is_featured !== undefined)  { fields.push(`is_featured=$${idx++}`);     values.push(is_featured); }
      if (is_trending !== undefined)  { fields.push(`is_trending=$${idx++}`);     values.push(is_trending); }
      if (status)                     { fields.push(`status=$${idx++}`);          values.push(status); }
      if (admin_message !== undefined){ fields.push(`admin_message=$${idx++}`);   values.push(admin_message); }
    }

    let result;
    if (fields.length) {
      values.push(req.params.id);
      result = await pool.query(
        `UPDATE src_products SET ${fields.join(',')} WHERE id=$${idx} RETURNING *`,
        values
      );
    } else {
      result = await pool.query('SELECT * FROM src_products WHERE id=$1', [req.params.id]);
    }

    // Replace images if new ones uploaded
    if (req.files && req.files.length > 0) {
      await pool.query('DELETE FROM src_product_images WHERE product_id=$1', [req.params.id]);
      for (let i = 0; i < req.files.length; i++) {
        await pool.query(
          'INSERT INTO src_product_images (product_id, image_url, is_primary, sort_order) VALUES ($1,$2,$3,$4)',
          [req.params.id, req.files[i].path, i === 0, i]
        );
      }
    }

    // Replace size variants if provided
    if (sizes) {
      const parsedSizes = typeof sizes === 'string' ? JSON.parse(sizes) : sizes;
      if (parsedSizes.length > 0) {
        await pool.query('DELETE FROM src_product_variants WHERE product_id=$1', [req.params.id]);
        for (const s of parsedSizes) {
          await pool.query(
            'INSERT INTO src_product_variants (product_id, size, stock, extra_price) VALUES ($1,$2,$3,$4)',
            [req.params.id, s.size, s.stock || 0, s.extra_price || 0]
          );
        }
      }
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const existing = await pool.query('SELECT seller_id FROM src_products WHERE id=$1', [req.params.id]);
    if (!existing.rows.length) return res.status(404).json({ message: 'Product not found' });
    if (req.user.role !== 'admin' && existing.rows[0].seller_id !== req.user.id)
      return res.status(403).json({ message: 'Not authorized' });
    await pool.query('UPDATE src_products SET deleted_at=NOW() WHERE id=$1', [req.params.id]);
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const addReview = async (req, res) => {
  const { rating, comment } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be 1-5' });
  try {
    const result = await pool.query(
      `INSERT INTO src_reviews (user_id, product_id, rating, comment) VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id, product_id) DO UPDATE SET rating=$3, comment=$4, created_at=NOW() RETURNING *`,
      [req.user.id, req.params.id, rating, comment]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getCategories = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, COUNT(p.id) as product_count
       FROM src_categories c
       LEFT JOIN src_products p ON p.category_id=c.id AND p.status='approved' AND p.deleted_at IS NULL
       WHERE c.is_active=TRUE GROUP BY c.id ORDER BY c.sort_order ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Add images to existing product ───────────────────────────────────────────
const addProductImages = async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ message: 'No images provided' });
  try {
    const existing = await pool.query('SELECT COUNT(*) FROM src_product_images WHERE product_id=$1', [req.params.id]);
    const currentCount = parseInt(existing.rows[0].count);
    const canAdd = 10 - currentCount;
    if (canAdd <= 0) return res.status(400).json({ message: 'Maximum 10 images allowed per product' });
    const filesToAdd = req.files.slice(0, canAdd);
    const sortRes = await pool.query('SELECT COALESCE(MAX(sort_order), -1) as max_order FROM src_product_images WHERE product_id=$1', [req.params.id]);
    let sortOrder = parseInt(sortRes.rows[0].max_order) + 1;
    const hasPrimary = await pool.query('SELECT id FROM src_product_images WHERE product_id=$1 AND is_primary=TRUE', [req.params.id]);
    for (let i = 0; i < filesToAdd.length; i++) {
      await pool.query(
        'INSERT INTO src_product_images (product_id, image_url, is_primary, sort_order) VALUES ($1,$2,$3,$4)',
        [req.params.id, filesToAdd[i].path, hasPrimary.rows.length === 0 && i === 0, sortOrder++]
      );
    }
    const images = await pool.query('SELECT * FROM src_product_images WHERE product_id=$1 ORDER BY is_primary DESC, sort_order ASC', [req.params.id]);
    res.json(images.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Delete single product image ───────────────────────────────────────────────
const deleteProductImage = async (req, res) => {
  try {
    const img = await pool.query('SELECT * FROM src_product_images WHERE id=$1 AND product_id=$2', [req.params.imageId, req.params.id]);
    if (!img.rows.length) return res.status(404).json({ message: 'Image not found' });
    await pool.query('DELETE FROM src_product_images WHERE id=$1', [req.params.imageId]);
    // If deleted image was primary, set next image as primary
    if (img.rows[0].is_primary) {
      await pool.query('UPDATE src_product_images SET is_primary=TRUE WHERE product_id=$1 AND id=(SELECT id FROM src_product_images WHERE product_id=$1 ORDER BY sort_order ASC LIMIT 1)', [req.params.id]);
    }
    const images = await pool.query('SELECT * FROM src_product_images WHERE product_id=$1 ORDER BY is_primary DESC, sort_order ASC', [req.params.id]);
    res.json(images.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Set primary image ─────────────────────────────────────────────────────────
const setPrimaryImage = async (req, res) => {
  try {
    await pool.query('UPDATE src_product_images SET is_primary=FALSE WHERE product_id=$1', [req.params.id]);
    await pool.query('UPDATE src_product_images SET is_primary=TRUE WHERE id=$1 AND product_id=$2', [req.params.imageId, req.params.id]);
    const images = await pool.query('SELECT * FROM src_product_images WHERE product_id=$1 ORDER BY is_primary DESC, sort_order ASC', [req.params.id]);
    res.json(images.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct, addReview, getCategories, deleteProductImage, setPrimaryImage, addProductImages };
