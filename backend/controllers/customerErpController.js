'use strict';

const { pool, logAudit } = require('../config/db');
const XLSX = require('xlsx');

const getScopedBusinessId = (req) => req.tenant?.business_id || req.user?.business_id || null;

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/erp/customers
// List customers with search + pagination
// ─────────────────────────────────────────────────────────────────────────────
const listCustomers = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const search = (req.query.search || '').trim();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const isActive = req.query.is_active;

    const params = [businessId];
    const conditions = ['c.business_id = $1'];

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      conditions.push(
        `(c.name ILIKE $${idx} OR c.phone ILIKE $${idx} OR c.email ILIKE $${idx} OR c.customer_code ILIKE $${idx})`
      );
    }

    if (isActive !== undefined && isActive !== '') {
      params.push(isActive === 'true' || isActive === '1');
      conditions.push(`c.is_active = $${params.length}`);
    }

    const where = conditions.join(' AND ');

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM src_erp_customers c WHERE ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit);
    params.push(offset);
    const dataResult = await pool.query(
      `SELECT c.id, c.customer_code, c.name, c.phone, c.email, c.gst_number,
              c.loyalty_points, c.store_credit, c.outstanding_amount,
              c.membership, c.is_active, c.created_at
       FROM src_erp_customers c
       WHERE ${where}
       ORDER BY c.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json({ customers: dataResult.rows, total, page, limit });
  } catch (err) {
    console.error('listCustomers error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/erp/customers
// Create a new customer
// ─────────────────────────────────────────────────────────────────────────────
const createCustomer = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const { name, phone, email, gst_number, address, city, state, pincode, membership, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Customer name is required' });
    }

    // Auto-generate customer_code as CUST-{YYYYMMDD}-{random 4-digit number}
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randPart = String(Math.floor(1000 + Math.random() * 9000));
    const customerCode = `CUST-${datePart}-${randPart}`;

    const result = await pool.query(
      `INSERT INTO src_erp_customers
         (business_id, customer_code, name, phone, email, gst_number,
          address, city, state, pincode, membership, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        businessId,
        customerCode,
        name.trim(),
        phone || null,
        email || null,
        gst_number || null,
        address || null,
        city || null,
        state || null,
        pincode || null,
        membership || 'regular',
        notes || null,
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createCustomer error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/erp/customers/:id
// Update an existing customer (scoped to business)
// ─────────────────────────────────────────────────────────────────────────────
const updateCustomer = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const { id } = req.params;
    const { name, phone, email, gst_number, address, city, state, pincode, membership, notes, is_active } = req.body;

    const existing = await pool.query(
      `SELECT id FROM src_erp_customers WHERE id = $1 AND business_id = $2`,
      [id, businessId]
    );
    if (!existing.rows.length) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    const result = await pool.query(
      `UPDATE src_erp_customers
       SET name             = COALESCE($1, name),
           phone            = COALESCE($2, phone),
           email            = COALESCE($3, email),
           gst_number       = COALESCE($4, gst_number),
           address          = COALESCE($5, address),
           city             = COALESCE($6, city),
           state            = COALESCE($7, state),
           pincode          = COALESCE($8, pincode),
           membership       = COALESCE($9, membership),
           notes            = COALESCE($10, notes),
           is_active        = COALESCE($11, is_active),
           updated_at       = NOW()
       WHERE id = $12 AND business_id = $13
       RETURNING *`,
      [
        name || null,
        phone || null,
        email || null,
        gst_number || null,
        address || null,
        city || null,
        state || null,
        pincode || null,
        membership || null,
        notes || null,
        is_active !== undefined ? Boolean(is_active) : null,
        id,
        businessId,
      ]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('updateCustomer error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/erp/customers/:id/history
// Full purchase history for a customer
// ─────────────────────────────────────────────────────────────────────────────
const getHistory = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const { id } = req.params;

    const customerResult = await pool.query(
      `SELECT * FROM src_erp_customers WHERE id = $1 AND business_id = $2`,
      [id, businessId]
    );
    if (!customerResult.rows.length) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    const customer = customerResult.rows[0];

    const salesResult = await pool.query(
      `SELECT id, bill_no, payment_method, total, status, created_at
       FROM src_erp_sales
       WHERE customer_id = $1 AND business_id = $2
       ORDER BY created_at DESC`,
      [id, businessId]
    );

    const statsResult = await pool.query(
      `SELECT
         COALESCE(SUM(total), 0)  AS lifetime_spend,
         COUNT(*)                 AS visit_count
       FROM src_erp_sales
       WHERE customer_id = $1 AND business_id = $2 AND status = 'completed'`,
      [id, businessId]
    );

    const { lifetime_spend, visit_count } = statsResult.rows[0];

    return res.json({
      customer,
      sales: salesResult.rows,
      lifetime_spend: parseFloat(lifetime_spend),
      visit_count: parseInt(visit_count),
    });
  } catch (err) {
    console.error('getHistory error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/erp/customers/:id/adjust
// Adjust loyalty_points or store_credit
// ─────────────────────────────────────────────────────────────────────────────
const adjustBalance = async (req, res) => {
  const businessId = getScopedBusinessId(req);
  if (!businessId) return res.status(400).json({ message: 'Business context required' });

  const { id } = req.params;
  const { type, amount, notes } = req.body;

  if (!type || !['loyalty_points', 'store_credit'].includes(type)) {
    return res.status(400).json({ message: 'type must be "loyalty_points" or "store_credit"' });
  }
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return res.status(400).json({ message: 'amount is required and must be a number' });
  }
  if (!notes || !notes.trim()) {
    return res.status(400).json({ message: 'notes is required for balance adjustments' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      `SELECT * FROM src_erp_customers WHERE id = $1 AND business_id = $2 FOR UPDATE`,
      [id, businessId]
    );
    if (!existing.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Customer not found' });
    }

    let updatedRow;
    if (type === 'loyalty_points') {
      // Don't allow loyalty_points below 0
      updatedRow = await client.query(
        `UPDATE src_erp_customers
         SET loyalty_points = GREATEST(loyalty_points + $1, 0),
             updated_at = NOW()
         WHERE id = $2 AND business_id = $3
         RETURNING *`,
        [Math.round(Number(amount)), id, businessId]
      );
    } else {
      // store_credit can be adjusted freely but not below 0
      updatedRow = await client.query(
        `UPDATE src_erp_customers
         SET store_credit = GREATEST(store_credit + $1, 0),
             updated_at = NOW()
         WHERE id = $2 AND business_id = $3
         RETURNING *`,
        [Number(amount), id, businessId]
      );
    }

    await logAudit(client, {
      adminId: req.user?.id,
      action: 'adjust_customer_balance',
      targetType: 'customer',
      targetId: id,
      details: JSON.stringify({ type, amount: Number(amount), notes: notes.trim(), actor: req.user?.id }),
    });

    await client.query('COMMIT');
    return res.json(updatedRow.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('adjustBalance error:', err.message);
    return res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/erp/customers/export
// Export all customers to Excel with lifetime_spend and visit_count
// ─────────────────────────────────────────────────────────────────────────────
const exportCustomers = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const result = await pool.query(
      `SELECT
         c.customer_code,
         c.name,
         c.phone,
         c.email,
         c.gst_number,
         c.address,
         c.city,
         c.state,
         c.pincode,
         c.loyalty_points,
         c.store_credit,
         c.outstanding_amount,
         c.membership,
         c.is_active,
         c.created_at,
         COALESCE(SUM(CASE WHEN s.status = 'completed' THEN s.total ELSE 0 END), 0) AS lifetime_spend,
         COUNT(CASE WHEN s.status = 'completed' THEN 1 END)                          AS visit_count
       FROM src_erp_customers c
       LEFT JOIN src_erp_sales s
         ON s.customer_id = c.id AND s.business_id = c.business_id
       WHERE c.business_id = $1
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [businessId]
    );

    const headers = [
      'Customer Code', 'Name', 'Phone', 'Email', 'GST Number',
      'Address', 'City', 'State', 'Pincode',
      'Loyalty Points', 'Store Credit', 'Outstanding Amount',
      'Membership', 'Lifetime Spend', 'Visit Count',
      'Active', 'Created At',
    ];

    const rows = result.rows.map((c) => [
      c.customer_code,
      c.name,
      c.phone || '',
      c.email || '',
      c.gst_number || '',
      c.address || '',
      c.city || '',
      c.state || '',
      c.pincode || '',
      c.loyalty_points,
      parseFloat(c.store_credit),
      parseFloat(c.outstanding_amount),
      c.membership || '',
      parseFloat(c.lifetime_spend),
      parseInt(c.visit_count),
      c.is_active ? 'Yes' : 'No',
      c.created_at ? new Date(c.created_at).toISOString().slice(0, 10) : '',
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const dateStr = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Disposition', `attachment; filename="customers-${dateStr}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buf);
  } catch (err) {
    console.error('exportCustomers error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

module.exports = {
  listCustomers,
  createCustomer,
  updateCustomer,
  getHistory,
  adjustBalance,
  exportCustomers,
};
