const { pool } = require('../config/db');

const listDomains = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT d.id, d.host, d.type, d.is_active, d.business_id, d.store_id, d.warehouse_id,
              b.name AS business_name, s.name AS store_name, w.name AS warehouse_name
       FROM src_domains d
       LEFT JOIN src_businesses b ON b.id = d.business_id
       LEFT JOIN src_stores s ON s.id = d.store_id
       LEFT JOIN src_warehouses w ON w.id = d.warehouse_id
       ORDER BY d.created_at DESC`
    );
    res.json({ domains: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createDomain = async (req, res) => {
  const { host, business_id, store_id, warehouse_id, type = 'business', is_active = true } = req.body;
  if (!host || !business_id) return res.status(400).json({ message: 'Host and business_id are required' });
  try {
    const result = await pool.query(
      `INSERT INTO src_domains (host, business_id, store_id, warehouse_id, type, is_active)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, host, business_id, store_id, warehouse_id, type, is_active`,
      [host.trim().toLowerCase(), business_id, store_id || null, warehouse_id || null, type, is_active]
    );
    res.status(201).json({ domain: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateDomain = async (req, res) => {
  const { id } = req.params;
  const { host, business_id, store_id, warehouse_id, type, is_active } = req.body;
  try {
    const result = await pool.query(
      `UPDATE src_domains
       SET host = COALESCE($1, host),
           business_id = COALESCE($2, business_id),
           store_id = COALESCE($3, store_id),
           warehouse_id = COALESCE($4, warehouse_id),
           type = COALESCE($5, type),
           is_active = COALESCE($6, is_active),
           updated_at = NOW()
       WHERE id = $7
       RETURNING id, host, business_id, store_id, warehouse_id, type, is_active`,
      [host?.trim().toLowerCase() || null, business_id || null, store_id || null, warehouse_id || null, type || null, is_active === undefined ? null : is_active, id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Domain not found' });
    res.json({ domain: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteDomain = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM src_domains WHERE id=$1 RETURNING id', [id]);
    if (!result.rows.length) return res.status(404).json({ message: 'Domain not found' });
    res.json({ message: 'Domain deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { listDomains, createDomain, updateDomain, deleteDomain };