const { pool } = require('../config/db');

const normalizeHost = (host = '') => host.trim().toLowerCase().replace(/:\d+$/, '');

const tenant = async (req, res, next) => {
  try {
    const host = normalizeHost(req.headers.host || req.hostname || '');
    if (!host) {
      req.tenant = { host: null, type: 'public' };
      return next();
    }

    const result = await pool.query(
      `SELECT d.id, d.host, d.type, d.business_id, d.store_id, d.warehouse_id,
              b.name AS business_name,
              s.name AS store_name,
              w.name AS warehouse_name
       FROM src_domains d
       LEFT JOIN src_businesses b ON b.id = d.business_id
       LEFT JOIN src_stores s ON s.id = d.store_id
       LEFT JOIN src_warehouses w ON w.id = d.warehouse_id
       WHERE d.host = $1 AND d.is_active = TRUE
       LIMIT 1`,
      [host]
    );

    if (!result.rows.length) {
      req.tenant = {
        host,
        type: 'public',
        business_id: null,
        store_id: null,
        warehouse_id: null,
      };
      return next();
    }

    const domain = result.rows[0];
    req.tenant = {
      host: domain.host,
      type: domain.type || 'business',
      business_id: domain.business_id,
      store_id: domain.store_id,
      warehouse_id: domain.warehouse_id,
      business_name: domain.business_name,
      store_name: domain.store_name,
      warehouse_name: domain.warehouse_name,
      domain_id: domain.id,
    };
    next();
  } catch (err) {
    console.error('Tenant middleware error:', err.message);
    req.tenant = { host: null, type: 'public', business_id: null, store_id: null, warehouse_id: null };
    next();
  }
};

module.exports = { tenant };