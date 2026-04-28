const { pool } = require('../config/db');

// ── BANNERS ───────────────────────────────────────────────────────────────────

const getBanners = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM src_banners ORDER BY sort_order ASC, created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getActiveBanners = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM src_banners
      WHERE is_active = TRUE
        AND (starts_at IS NULL OR starts_at <= NOW())
        AND (ends_at IS NULL OR ends_at >= NOW())
      ORDER BY sort_order ASC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const createBanner = async (req, res) => {
  const { heading, subheading, cta_text, cta_link, sort_order, is_active, starts_at, ends_at } = req.body;
  const desktop_image = req.files?.desktop?.[0]?.path || req.body.desktop_image || null;
  const mobile_image  = req.files?.mobile?.[0]?.path  || req.body.mobile_image  || null;
  try {
    const result = await pool.query(
      `INSERT INTO src_banners (heading, subheading, cta_text, cta_link, desktop_image, mobile_image, sort_order, is_active, starts_at, ends_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [heading || null, subheading || null, cta_text || null, cta_link || null,
       desktop_image, mobile_image, sort_order || 0, is_active !== 'false',
       starts_at || null, ends_at || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updateBanner = async (req, res) => {
  const { heading, subheading, cta_text, cta_link, sort_order, is_active, starts_at, ends_at } = req.body;
  const desktop_image = req.files?.desktop?.[0]?.path || req.body.desktop_image;
  const mobile_image  = req.files?.mobile?.[0]?.path  || req.body.mobile_image;
  try {
    const fields = [], values = [];
    let idx = 1;
    const set = (col, val) => { if (val !== undefined) { fields.push(`${col}=$${idx++}`); values.push(val); } };
    set('heading', heading);
    set('subheading', subheading);
    set('cta_text', cta_text);
    set('cta_link', cta_link);
    set('sort_order', sort_order);
    set('is_active', is_active !== undefined ? is_active !== 'false' && is_active !== false : undefined);
    set('starts_at', starts_at || null);
    set('ends_at', ends_at || null);
    if (desktop_image) { fields.push(`desktop_image=$${idx++}`); values.push(desktop_image); }
    if (mobile_image)  { fields.push(`mobile_image=$${idx++}`);  values.push(mobile_image); }
    if (!fields.length) return res.status(400).json({ message: 'Nothing to update' });
    values.push(req.params.id);
    const result = await pool.query(`UPDATE src_banners SET ${fields.join(',')} WHERE id=$${idx} RETURNING *`, values);
    if (!result.rows.length) return res.status(404).json({ message: 'Banner not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deleteBanner = async (req, res) => {
  try {
    await pool.query('DELETE FROM src_banners WHERE id=$1', [req.params.id]);
    res.json({ message: 'Banner deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const reorderBanners = async (req, res) => {
  const { orders } = req.body; // [{ id, sort_order }]
  try {
    for (const item of orders) {
      await pool.query('UPDATE src_banners SET sort_order=$1 WHERE id=$2', [item.sort_order, item.id]);
    }
    res.json({ message: 'Reordered' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── HOMEPAGE SECTIONS ─────────────────────────────────────────────────────────

const getSections = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM src_homepage_sections ORDER BY sort_order ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getActiveSections = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM src_homepage_sections WHERE is_active=TRUE ORDER BY sort_order ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const createSection = async (req, res) => {
  const { type, title, subtitle, config, sort_order, is_active } = req.body;
  if (!type) return res.status(400).json({ message: 'Section type required' });
  try {
    const result = await pool.query(
      `INSERT INTO src_homepage_sections (type, title, subtitle, config, sort_order, is_active)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [type, title || null, subtitle || null,
       typeof config === 'string' ? config : JSON.stringify(config || {}),
       sort_order || 0, is_active !== false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updateSection = async (req, res) => {
  const { title, subtitle, config, sort_order, is_active } = req.body;
  try {
    const fields = [], values = [];
    let idx = 1;
    if (title !== undefined)     { fields.push(`title=$${idx++}`);      values.push(title); }
    if (subtitle !== undefined)  { fields.push(`subtitle=$${idx++}`);   values.push(subtitle); }
    if (config !== undefined)    { fields.push(`config=$${idx++}`);     values.push(typeof config === 'string' ? config : JSON.stringify(config)); }
    if (sort_order !== undefined){ fields.push(`sort_order=$${idx++}`); values.push(sort_order); }
    if (is_active !== undefined) { fields.push(`is_active=$${idx++}`);  values.push(is_active); }
    if (!fields.length) return res.status(400).json({ message: 'Nothing to update' });
    values.push(req.params.id);
    const result = await pool.query(`UPDATE src_homepage_sections SET ${fields.join(',')} WHERE id=$${idx} RETURNING *`, values);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deleteSection = async (req, res) => {
  try {
    await pool.query('DELETE FROM src_homepage_sections WHERE id=$1', [req.params.id]);
    res.json({ message: 'Section deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const reorderSections = async (req, res) => {
  const { orders } = req.body;
  try {
    for (const item of orders) {
      await pool.query('UPDATE src_homepage_sections SET sort_order=$1 WHERE id=$2', [item.sort_order, item.id]);
    }
    res.json({ message: 'Reordered' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── REELS ─────────────────────────────────────────────────────────────────────

const getReels = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, p.title as product_title,
        (SELECT image_url FROM src_product_images WHERE product_id=p.id AND is_primary=TRUE LIMIT 1) as product_image
      FROM src_reels r
      LEFT JOIN src_products p ON r.product_id = p.id
      ORDER BY r.sort_order ASC, r.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getActiveReels = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, p.title as product_title, p.price as product_price,
        (SELECT image_url FROM src_product_images WHERE product_id=p.id AND is_primary=TRUE LIMIT 1) as product_image
      FROM src_reels r
      LEFT JOIN src_products p ON r.product_id = p.id
      WHERE r.is_active = TRUE
      ORDER BY r.sort_order ASC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const createReel = async (req, res) => {
  const { title, product_id, sort_order, is_active } = req.body;
  const video_url     = req.files?.video?.[0]?.path     || req.body.video_url;
  const thumbnail_url = req.files?.thumbnail?.[0]?.path || req.body.thumbnail_url || null;
  if (!video_url) return res.status(400).json({ message: 'Video is required' });
  try {
    const result = await pool.query(
      `INSERT INTO src_reels (video_url, thumbnail_url, title, product_id, sort_order, is_active)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [video_url, thumbnail_url, title || null, product_id || null, sort_order || 0, is_active !== false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updateReel = async (req, res) => {
  const { title, product_id, sort_order, is_active } = req.body;
  const video_url     = req.files?.video?.[0]?.path     || req.body.video_url;
  const thumbnail_url = req.files?.thumbnail?.[0]?.path || req.body.thumbnail_url;
  try {
    const fields = [], values = [];
    let idx = 1;
    if (title !== undefined)      { fields.push(`title=$${idx++}`);         values.push(title); }
    if (product_id !== undefined) { fields.push(`product_id=$${idx++}`);    values.push(product_id || null); }
    if (sort_order !== undefined) { fields.push(`sort_order=$${idx++}`);    values.push(sort_order); }
    if (is_active !== undefined)  { fields.push(`is_active=$${idx++}`);     values.push(is_active); }
    if (video_url)                { fields.push(`video_url=$${idx++}`);     values.push(video_url); }
    if (thumbnail_url)            { fields.push(`thumbnail_url=$${idx++}`); values.push(thumbnail_url); }
    if (!fields.length) return res.status(400).json({ message: 'Nothing to update' });
    values.push(req.params.id);
    const result = await pool.query(`UPDATE src_reels SET ${fields.join(',')} WHERE id=$${idx} RETURNING *`, values);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deleteReel = async (req, res) => {
  try {
    await pool.query('DELETE FROM src_reels WHERE id=$1', [req.params.id]);
    res.json({ message: 'Reel deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── HOMEPAGE SETTINGS ─────────────────────────────────────────────────────────

const getSettings = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM src_homepage_settings');
    const settings = {};
    result.rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const updateSettings = async (req, res) => {
  const settings = req.body; // { key: value, ... }
  try {
    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        `INSERT INTO src_homepage_settings (key, value, updated_at) VALUES ($1,$2,NOW())
         ON CONFLICT (key) DO UPDATE SET value=$2, updated_at=NOW()`,
        [key, value]
      );
    }
    res.json({ message: 'Settings saved' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

module.exports = {
  getBanners, getActiveBanners, createBanner, updateBanner, deleteBanner, reorderBanners,
  getSections, getActiveSections, createSection, updateSection, deleteSection, reorderSections,
  getReels, getActiveReels, createReel, updateReel, deleteReel,
  getSettings, updateSettings,
};
