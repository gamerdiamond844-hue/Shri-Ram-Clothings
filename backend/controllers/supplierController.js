'use strict';

const { pool, logAudit } = require('../config/db');

const getScopedBusinessId = (req) => req.tenant?.business_id || req.user?.business_id || null;

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/erp/suppliers
// List suppliers with search + pagination
// ─────────────────────────────────────────────────────────────────────────────
const listSuppliers = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const search = (req.query.search || '').trim();
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const params = [businessId];
    const conditions = ['s.business_id = $1'];

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      conditions.push(
        `(s.name ILIKE $${idx} OR s.supplier_code ILIKE $${idx} OR s.gst_number ILIKE $${idx})`
      );
    }

    const where = conditions.join(' AND ');

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM src_erp_suppliers s WHERE ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit);
    params.push(offset);
    const dataResult = await pool.query(
      `SELECT s.id, s.supplier_code, s.name, s.phone, s.email, s.gst_number,
              s.address, s.payment_terms_days, s.balance_due, s.is_active, s.created_at
       FROM src_erp_suppliers s
       WHERE ${where}
       ORDER BY s.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json({ suppliers: dataResult.rows, total, page, limit });
  } catch (err) {
    console.error('listSuppliers error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/erp/suppliers
// Create a new supplier
// ─────────────────────────────────────────────────────────────────────────────
const createSupplier = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const { name, phone, email, gst_number, address, payment_terms_days, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Supplier name is required' });
    }

    // Auto-generate supplier_code as SUPP-{YYYYMMDD}-{random 4-digit}
    const now = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randPart = String(Math.floor(1000 + Math.random() * 9000));
    const supplierCode = `SUPP-${datePart}-${randPart}`;

    const result = await pool.query(
      `INSERT INTO src_erp_suppliers
         (business_id, supplier_code, name, phone, email, gst_number,
          address, payment_terms_days, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        businessId,
        supplierCode,
        name.trim(),
        phone || null,
        email || null,
        gst_number || null,
        address || null,
        payment_terms_days ? parseInt(payment_terms_days) : 30,
        notes || null,
      ]
    );

    const supplier = result.rows[0];

    await logAudit(pool, {
      adminId: req.user?.id,
      action: 'create_supplier',
      targetType: 'supplier',
      targetId: supplier.id,
      details: JSON.stringify({ supplier_code: supplierCode, name: supplier.name }),
    });

    return res.status(201).json(supplier);
  } catch (err) {
    console.error('createSupplier error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/erp/suppliers/:id
// Update an existing supplier (scoped to business)
// ─────────────────────────────────────────────────────────────────────────────
const updateSupplier = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const { id } = req.params;
    const { name, phone, email, gst_number, address, payment_terms_days, notes, is_active } = req.body;

    const existing = await pool.query(
      `SELECT id FROM src_erp_suppliers WHERE id = $1 AND business_id = $2`,
      [id, businessId]
    );
    if (!existing.rows.length) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    const result = await pool.query(
      `UPDATE src_erp_suppliers
       SET name               = COALESCE($1, name),
           phone              = COALESCE($2, phone),
           email              = COALESCE($3, email),
           gst_number         = COALESCE($4, gst_number),
           address            = COALESCE($5, address),
           payment_terms_days = COALESCE($6, payment_terms_days),
           notes              = COALESCE($7, notes),
           is_active          = COALESCE($8, is_active),
           updated_at         = NOW()
       WHERE id = $9 AND business_id = $10
       RETURNING *`,
      [
        name || null,
        phone || null,
        email || null,
        gst_number || null,
        address || null,
        payment_terms_days ? parseInt(payment_terms_days) : null,
        notes || null,
        is_active !== undefined ? Boolean(is_active) : null,
        id,
        businessId,
      ]
    );

    const supplier = result.rows[0];

    await logAudit(pool, {
      adminId: req.user?.id,
      action: 'update_supplier',
      targetType: 'supplier',
      targetId: id,
      details: JSON.stringify({ updated_fields: Object.keys(req.body) }),
    });

    return res.json(supplier);
  } catch (err) {
    console.error('updateSupplier error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/erp/suppliers/:id/ledger
// Returns supplier profile, all POs, and ledger entries
// ─────────────────────────────────────────────────────────────────────────────
const getSupplierLedger = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const { id } = req.params;

    // Fetch supplier
    const supplierResult = await pool.query(
      `SELECT * FROM src_erp_suppliers WHERE id = $1 AND business_id = $2`,
      [id, businessId]
    );
    if (!supplierResult.rows.length) {
      return res.status(404).json({ message: 'Supplier not found' });
    }
    const supplier = supplierResult.rows[0];

    // Fetch all POs for this supplier
    const posResult = await pool.query(
      `SELECT id, po_number, status, total, expected_date, created_at
       FROM src_erp_purchase_orders
       WHERE supplier_id = $1 AND business_id = $2
       ORDER BY created_at DESC`,
      [id, businessId]
    );
    const purchase_orders = posResult.rows;

    // Build ledger entries
    // Part 1: POs as purchase_order ledger entries
    const poLedgerEntries = purchase_orders.map((po) => ({
      type: 'purchase_order',
      reference: po.po_number,
      amount: parseFloat(po.total) || 0,
      date: po.created_at,
      description: `Purchase Order ${po.po_number} — Status: ${po.status}`,
    }));

    // Part 2: return movements linked to items in this supplier's POs
    let returnLedgerEntries = [];
    if (purchase_orders.length > 0) {
      const poIds = purchase_orders.map((po) => po.id);
      // Build parameterized IN clause
      const placeholders = poIds.map((_, i) => `$${i + 2}`).join(', ');

      const returnsResult = await pool.query(
        `SELECT im.id, im.quantity, im.created_at, im.notes,
                pi.purchase_order_id, po.po_number,
                ii.title AS item_title
         FROM src_erp_inventory_movements im
         JOIN src_erp_purchase_items pi ON pi.inventory_item_id = im.inventory_item_id
         JOIN src_erp_purchase_orders po ON po.id = pi.purchase_order_id
         LEFT JOIN src_erp_inventory_items ii ON ii.id = im.inventory_item_id
         WHERE im.movement_type = 'return'
           AND im.business_id = $1
           AND pi.purchase_order_id IN (${placeholders})
         ORDER BY im.created_at DESC`,
        [businessId, ...poIds]
      );

      returnLedgerEntries = returnsResult.rows.map((r) => ({
        type: 'return',
        reference: r.po_number,
        amount: Math.abs(parseFloat(r.quantity) || 0),
        date: r.created_at,
        description: `Return of "${r.item_title || 'item'}" — PO ${r.po_number}${r.notes ? `: ${r.notes}` : ''}`,
      }));
    }

    // Merge and sort all ledger entries by date descending
    const ledger_entries = [...poLedgerEntries, ...returnLedgerEntries].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    return res.json({ supplier, purchase_orders, ledger_entries });
  } catch (err) {
    console.error('getSupplierLedger error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

module.exports = {
  listSuppliers,
  createSupplier,
  updateSupplier,
  getSupplierLedger,
};
