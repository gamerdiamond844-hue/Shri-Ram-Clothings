'use strict';

const { pool, logAudit } = require('../config/db');

const getScopedBusinessId = (req) => req.tenant?.business_id || req.user?.business_id || null;

const slugify = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 180);

const listBrands = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const search = (req.query.search || '').trim();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;
    const activeOnly = req.query.active === 'true';

    const params = [businessId];
    const conditions = ['b.business_id = $1'];

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      conditions.push(`(b.name ILIKE $${idx} OR b.slug ILIKE $${idx} OR b.description ILIKE $${idx})`);
    }

    if (activeOnly) {
      conditions.push('b.is_active = TRUE');
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total FROM src_erp_brands b ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT b.id, b.name, b.slug, b.description, b.is_active, b.created_at, b.updated_at
       FROM src_erp_brands b
       ${where}
       ORDER BY b.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json({ brands: result.rows, total, page, limit });
  } catch (err) {
    console.error('listBrands error:', err.message);
    return res.status(500).json({ message: 'Failed to list brands' });
  }
};

const createBrand = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const name = String(req.body.name || '').trim();
    const description = req.body.description ? String(req.body.description).trim() : null;
    let slug = slugify(req.body.slug || name);

    if (!name) {
      return res.status(400).json({ message: 'Brand name is required' });
    }

    if (!slug) {
      slug = slugify(name);
    }

    const existingSlug = await pool.query(
      `SELECT id FROM src_erp_brands WHERE business_id = $1 AND slug = $2 LIMIT 1`,
      [businessId, slug]
    );

    if (existingSlug.rows.length) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const result = await pool.query(
      `INSERT INTO src_erp_brands (business_id, name, slug, description, is_active, created_at, updated_at)
       VALUES ($1,$2,$3,$4,TRUE,NOW(),NOW())
       RETURNING *`,
      [businessId, name, slug, description]
    );

    const brand = result.rows[0];

    await logAudit(pool, {
      adminId: req.user?.id,
      action: 'create_brand',
      targetType: 'brand',
      targetId: brand.id,
      details: JSON.stringify({ name: brand.name, slug: brand.slug }),
    });

    return res.status(201).json(brand);
  } catch (err) {
    console.error('createBrand error:', err.message);
    return res.status(500).json({ message: 'Failed to create brand' });
  }
};

const updateBrand = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const { id } = req.params;
    const name = req.body.name ? String(req.body.name).trim() : null;
    const description = req.body.description !== undefined ? String(req.body.description).trim() : null;
    const is_active = req.body.is_active !== undefined ? Boolean(req.body.is_active) : null;
    let slug = req.body.slug !== undefined ? slugify(req.body.slug) : null;

    const existingBrand = await pool.query(
      `SELECT id, slug FROM src_erp_brands WHERE id = $1 AND business_id = $2 LIMIT 1`,
      [id, businessId]
    );
    if (!existingBrand.rows.length) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    if (slug && slug !== existingBrand.rows[0].slug) {
      const slugConflict = await pool.query(
        `SELECT id FROM src_erp_brands WHERE business_id = $1 AND slug = $2 AND id != $3 LIMIT 1`,
        [businessId, slug, id]
      );
      if (slugConflict.rows.length) {
        slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
      }
    }

    const result = await pool.query(
      `UPDATE src_erp_brands
       SET name       = COALESCE($1, name),
           slug       = COALESCE($2, slug),
           description = COALESCE($3, description),
           is_active  = COALESCE($4, is_active),
           updated_at = NOW()
       WHERE id = $5 AND business_id = $6
       RETURNING *`,
      [name, slug, description, is_active, id, businessId]
    );

    const brand = result.rows[0];

    await logAudit(pool, {
      adminId: req.user?.id,
      action: 'update_brand',
      targetType: 'brand',
      targetId: id,
      details: JSON.stringify({ updated_fields: Object.keys(req.body) }),
    });

    return res.json(brand);
  } catch (err) {
    console.error('updateBrand error:', err.message);
    return res.status(500).json({ message: 'Failed to update brand' });
  }
};

const deleteBrand = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const { id } = req.params;
    const result = await pool.query(
      `UPDATE src_erp_brands
       SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1 AND business_id = $2
       RETURNING id`,
      [id, businessId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Brand not found' });
    }

    await logAudit(pool, {
      adminId: req.user?.id,
      action: 'delete_brand',
      targetType: 'brand',
      targetId: id,
      details: 'Soft deleted brand',
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('deleteBrand error:', err.message);
    return res.status(500).json({ message: 'Failed to delete brand' });
  }
};

module.exports = {
  listBrands,
  createBrand,
  updateBrand,
  deleteBrand,
};
