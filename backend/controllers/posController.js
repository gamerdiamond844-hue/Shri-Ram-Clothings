'use strict';

const { pool, logAudit } = require('../config/db');

const getScopedBusinessId = (req) => req.tenant?.business_id || req.user?.business_id || null;

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/erp/pos/search?q=<term>
// Search inventory items by barcode (exact), SKU (exact/ILIKE), or title (ILIKE)
// ─────────────────────────────────────────────────────────────────────────────
const searchProducts = async (req, res) => {
  try {
    const business_id = getScopedBusinessId(req);
    if (!business_id) return res.status(400).json({ message: 'Business context required' });

    const q = (req.query.q || '').trim();

    let rows;

    if (!q) {
      // No search term — return top 20 active items
      const result = await pool.query(
        `SELECT id, title, sku, barcode, selling_price, mrp, current_stock,
                gst_rate, variant_size, variant_color, image_url
         FROM src_erp_inventory_items
         WHERE business_id = $1
           AND status = 'active'
         ORDER BY title ASC
         LIMIT 20`,
        [business_id]
      );
      rows = result.rows;
    } else {
      // Try barcode exact match first, then SKU exact, then ILIKE search
      const result = await pool.query(
        `SELECT id, title, sku, barcode, selling_price, mrp, current_stock,
                gst_rate, variant_size, variant_color, image_url
         FROM src_erp_inventory_items
         WHERE business_id = $1
           AND status = 'active'
           AND (
                 barcode = $2
              OR sku = $2
              OR sku ILIKE $3
              OR title ILIKE $3
           )
         ORDER BY
           CASE WHEN barcode = $2 THEN 0
                WHEN sku = $2 THEN 1
                ELSE 2
           END,
           title ASC
         LIMIT 20`,
        [business_id, q, `%${q}%`]
      );
      rows = result.rows;
    }

    return res.json({ products: rows });
  } catch (err) {
    console.error('POS searchProducts error:', err.message);
    return res.status(500).json({ message: 'Failed to search products' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/erp/pos/sale
// Create a POS sale inside a single transaction
// ─────────────────────────────────────────────────────────────────────────────
const createSale = async (req, res) => {
  const business_id = getScopedBusinessId(req);
  if (!business_id) return res.status(400).json({ message: 'Business context required' });

  const {
    items,
    payment_method = 'cash',
    split_payment,
    customer_id,
    discount_amount = 0,
    tax_amount = 0,
    round_off = 0,
    total,
    notes,
  } = req.body;

  // ── Validation ──────────────────────────────────────────────────────────────
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'items array is required and must be non-empty' });
  }
  if (!total || Number(total) <= 0) {
    return res.status(400).json({ message: 'total must be greater than 0' });
  }
  if (Array.isArray(split_payment) && split_payment.length > 0) {
    const splitSum = split_payment.reduce((s, p) => s + Number(p.amount || 0), 0);
    if (Math.abs(splitSum - Number(total)) > 1) {
      return res.status(400).json({ message: 'Split payment amounts must sum to total (±₹1 tolerance)' });
    }
  }

  // ── Bill number ─────────────────────────────────────────────────────────────
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  const randPart = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
  const bill_no = `BILL-${datePart}-${randPart}`;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Insert into src_erp_sales
    const saleResult = await client.query(
      `INSERT INTO src_erp_sales
         (business_id, store_id, customer_id, cashier_id, bill_no, channel,
          payment_method, split_payment, discount_amount, tax_amount,
          round_off, total, notes, status, payment_status)
       VALUES ($1, $2, $3, $4, $5, 'pos',
               $6, $7, $8, $9, $10, $11, $12, 'completed', 'paid')
       RETURNING *`,
      [
        business_id,
        req.user?.store_id || null,
        customer_id || null,
        req.user?.id || null,
        bill_no,
        payment_method,
        JSON.stringify(Array.isArray(split_payment) ? split_payment : []),
        Number(discount_amount),
        Number(tax_amount),
        Number(round_off),
        Number(total),
        notes || null,
      ]
    );
    const sale = saleResult.rows[0];

    // 2. Insert sale items + deduct stock + record movements
    for (const item of items) {
      const {
        inventory_item_id,
        title,
        sku,
        quantity,
        unit_price,
        tax_amount: item_tax = 0,
        discount_amount: item_disc = 0,
        line_total,
      } = item;

      // Insert sale item
      await client.query(
        `INSERT INTO src_erp_sale_items
           (sale_id, inventory_item_id, title, sku, quantity,
            unit_price, tax_amount, discount_amount, line_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          sale.id,
          inventory_item_id,
          title,
          sku || null,
          Number(quantity),
          Number(unit_price),
          Number(item_tax),
          Number(item_disc),
          Number(line_total),
        ]
      );

      // 3. Deduct stock atomically — fail if insufficient
      const stockResult = await client.query(
        `UPDATE src_erp_inventory_items
         SET current_stock = current_stock - $1,
             updated_at = NOW()
         WHERE id = $2
           AND business_id = $3
           AND current_stock >= $1
         RETURNING current_stock`,
        [Number(quantity), inventory_item_id, business_id]
      );

      if (stockResult.rowCount === 0) {
        throw new Error(`Insufficient stock for: ${title}`);
      }

      const balance_after = stockResult.rows[0].current_stock;

      // 4. Record inventory movement
      await client.query(
        `INSERT INTO src_erp_inventory_movements
           (business_id, inventory_item_id, store_id, movement_type,
            quantity, balance_after, reference_type, reference_id, created_by)
         VALUES ($1, $2, $3, 'sale', $4, $5, 'sale', $6, $7)`,
        [
          business_id,
          inventory_item_id,
          req.user?.store_id || null,
          -Number(quantity),
          balance_after,
          bill_no,
          req.user?.id || null,
        ]
      );
    }

    // 5. Loyalty points & store credit (if customer provided)
    if (customer_id) {
      // Read loyalty rate from business settings, default 1 point per ₹100
      const bizResult = await client.query(
        `SELECT settings FROM src_businesses WHERE id = $1`,
        [business_id]
      );
      const settings = bizResult.rows[0]?.settings || {};
      const loyaltyRate = parseFloat(settings.loyalty_rate || '1'); // points per ₹100
      const pointsEarned = Math.floor((Number(total) / 100) * loyaltyRate);

      // Determine store credit used (if any)
      const storeCreditUsed = Number(req.body.store_credit_used || 0);

      await client.query(
        `UPDATE src_erp_customers
         SET loyalty_points = loyalty_points + $1,
             store_credit = GREATEST(store_credit - $2, 0),
             updated_at = NOW()
         WHERE id = $3 AND business_id = $4`,
        [pointsEarned, storeCreditUsed, customer_id, business_id]
      );
    }

    // 6. Audit log
    await logAudit(client, {
      adminId: req.user?.id,
      action: 'pos.sale_completed',
      targetType: 'sale',
      targetId: sale.id,
      details: bill_no,
    });

    await client.query('COMMIT');
    return res.status(201).json({ sale, bill_no });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('POS createSale error:', err.message);
    return res.status(500).json({ message: err.message || 'Failed to create sale' });
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/erp/pos/hold
// Put the current cart on hold
// ─────────────────────────────────────────────────────────────────────────────
const holdBill = async (req, res) => {
  try {
    const business_id = getScopedBusinessId(req);
    if (!business_id) return res.status(400).json({ message: 'Business context required' });

    const { cart_payload, customer_name, total } = req.body;

    const holdRand = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
    const hold_code = `HOLD-${holdRand}`;

    await pool.query(
      `INSERT INTO src_erp_pos_holds
         (business_id, store_id, hold_code, customer_name, cart_payload, total, held_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        business_id,
        req.user?.store_id || null,
        hold_code,
        customer_name || null,
        JSON.stringify(cart_payload || []),
        Number(total || 0),
        req.user?.id || null,
      ]
    );

    return res.status(201).json({ hold_code });
  } catch (err) {
    console.error('POS holdBill error:', err.message);
    return res.status(500).json({ message: 'Failed to hold bill' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/erp/pos/holds
// List all active (not yet resumed) holds for this business
// ─────────────────────────────────────────────────────────────────────────────
const listHolds = async (req, res) => {
  try {
    const business_id = getScopedBusinessId(req);
    if (!business_id) return res.status(400).json({ message: 'Business context required' });

    const result = await pool.query(
      `SELECT id, hold_code, customer_name, total, held_at, held_by
       FROM src_erp_pos_holds
       WHERE business_id = $1
         AND resumed_at IS NULL
       ORDER BY held_at DESC`,
      [business_id]
    );

    return res.json({ holds: result.rows });
  } catch (err) {
    console.error('POS listHolds error:', err.message);
    return res.status(500).json({ message: 'Failed to list holds' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/erp/pos/holds/:holdCode/resume
// Retrieve a held bill's cart data (does NOT delete the hold)
// ─────────────────────────────────────────────────────────────────────────────
const resumeHold = async (req, res) => {
  try {
    const business_id = getScopedBusinessId(req);
    if (!business_id) return res.status(400).json({ message: 'Business context required' });

    const { holdCode } = req.params;

    const result = await pool.query(
      `SELECT cart_payload, customer_name, total
       FROM src_erp_pos_holds
       WHERE hold_code = $1
         AND business_id = $2`,
      [holdCode, business_id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Hold not found' });
    }

    // Mark as resumed (timestamp only, record stays for explicit deletion)
    await pool.query(
      `UPDATE src_erp_pos_holds SET resumed_at = NOW() WHERE hold_code = $1 AND business_id = $2`,
      [holdCode, business_id]
    );

    const { cart_payload, customer_name, total } = result.rows[0];
    return res.json({ cart_payload, customer_name, total });
  } catch (err) {
    console.error('POS resumeHold error:', err.message);
    return res.status(500).json({ message: 'Failed to resume hold' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/erp/pos/holds/:holdCode
// Permanently remove a held bill
// ─────────────────────────────────────────────────────────────────────────────
const deleteHold = async (req, res) => {
  try {
    const business_id = getScopedBusinessId(req);
    if (!business_id) return res.status(400).json({ message: 'Business context required' });

    const { holdCode } = req.params;

    const result = await pool.query(
      `DELETE FROM src_erp_pos_holds
       WHERE hold_code = $1
         AND business_id = $2`,
      [holdCode, business_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Hold not found' });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('POS deleteHold error:', err.message);
    return res.status(500).json({ message: 'Failed to delete hold' });
  }
};

module.exports = {
  searchProducts,
  createSale,
  holdBill,
  listHolds,
  resumeHold,
  deleteHold,
};

// ─────────────────────────────────────────────────────────────────────────────
// POS SHIFT MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/erp/pos/shift/active
const getActiveShift = async (req, res) => {
  try {
    const business_id = getScopedBusinessId(req);
    if (!business_id) return res.status(400).json({ message: 'Business context required' });

    const result = await pool.query(
      `SELECT s.*, u.name AS cashier_name
       FROM src_erp_pos_sessions s
       LEFT JOIN src_users u ON u.id = s.cashier_id
       WHERE s.business_id = $1
         AND s.cashier_id = $2
         AND s.status = 'open'
       ORDER BY s.opened_at DESC
       LIMIT 1`,
      [business_id, req.user.id]
    );

    if (!result.rows.length) {
      return res.json({ session: null });
    }

    // Add running total for this session
    const session = result.rows[0];
    const salesResult = await pool.query(
      `SELECT COUNT(*) AS bill_count, COALESCE(SUM(total), 0) AS running_total
       FROM src_erp_sales
       WHERE session_id = $1 AND status = 'completed'`,
      [session.id]
    );
    session.bill_count = parseInt(salesResult.rows[0].bill_count);
    session.running_total = parseFloat(salesResult.rows[0].running_total);

    return res.json({ session });
  } catch (err) {
    console.error('getActiveShift error:', err.message);
    return res.status(500).json({ message: 'Failed to get active shift' });
  }
};

// POST /api/erp/pos/shift/open
const openShift = async (req, res) => {
  try {
    const business_id = getScopedBusinessId(req);
    if (!business_id) return res.status(400).json({ message: 'Business context required' });

    const { opening_cash = 0 } = req.body;

    // Check for existing open shift for this cashier
    const existing = await pool.query(
      `SELECT id FROM src_erp_pos_sessions
       WHERE business_id = $1 AND cashier_id = $2 AND status = 'open'
       LIMIT 1`,
      [business_id, req.user.id]
    );
    if (existing.rows.length) {
      return res.status(409).json({ message: 'You already have an open shift. Close it first.' });
    }

    const result = await pool.query(
      `INSERT INTO src_erp_pos_sessions
         (business_id, store_id, cashier_id, opening_cash, status, opened_at)
       VALUES ($1, $2, $3, $4, 'open', NOW())
       RETURNING *`,
      [business_id, req.user.store_id || null, req.user.id, Number(opening_cash)]
    );

    await pool.query(
      `INSERT INTO src_activity_logs (admin_id, action, target_type, target_id, details)
       VALUES ($1, 'pos.shift_opened', 'pos_session', $2, $3)`,
      [req.user.id, result.rows[0].id, `Opening cash: ₹${opening_cash}`]
    );

    return res.status(201).json({ session: result.rows[0] });
  } catch (err) {
    console.error('openShift error:', err.message);
    return res.status(500).json({ message: 'Failed to open shift' });
  }
};

// POST /api/erp/pos/shift/close
const closeShift = async (req, res) => {
  try {
    const business_id = getScopedBusinessId(req);
    if (!business_id) return res.status(400).json({ message: 'Business context required' });

    const { session_id, closing_cash = 0 } = req.body;

    if (!session_id) return res.status(400).json({ message: 'session_id is required' });

    // Verify session belongs to this cashier and business
    const sessionRes = await pool.query(
      `SELECT * FROM src_erp_pos_sessions
       WHERE id = $1 AND business_id = $2 AND cashier_id = $3 AND status = 'open'`,
      [session_id, business_id, req.user.id]
    );
    if (!sessionRes.rows.length) {
      return res.status(404).json({ message: 'Active shift not found' });
    }
    const session = sessionRes.rows[0];

    // Compute total sales for this session
    const salesRes = await pool.query(
      `SELECT COUNT(*) AS total_bills,
              COALESCE(SUM(total), 0) AS total_sales,
              COALESCE(SUM(total) FILTER (WHERE payment_method = 'cash'), 0) AS cash_sales
       FROM src_erp_sales
       WHERE session_id = $1 AND status = 'completed'`,
      [session_id]
    );
    const { total_bills, total_sales, cash_sales } = salesRes.rows[0];

    const expectedCash = parseFloat(session.opening_cash) + parseFloat(cash_sales);
    const variance = parseFloat(closing_cash) - expectedCash;

    const result = await pool.query(
      `UPDATE src_erp_pos_sessions
       SET closing_cash = $1,
           total_sales  = $2,
           total_bills  = $3,
           closed_at    = NOW(),
           status       = 'closed'
       WHERE id = $4 AND business_id = $5
       RETURNING *`,
      [Number(closing_cash), Number(total_sales), Number(total_bills), session_id, business_id]
    );

    await pool.query(
      `INSERT INTO src_activity_logs (admin_id, action, target_type, target_id, details)
       VALUES ($1, 'pos.shift_closed', 'pos_session', $2, $3)`,
      [req.user.id, session_id, `Total bills: ${total_bills}, Total sales: ₹${total_sales}, Variance: ₹${variance.toFixed(2)}`]
    );

    return res.json({
      session: result.rows[0],
      reconciliation: {
        opening_cash: parseFloat(session.opening_cash),
        cash_sales: parseFloat(cash_sales),
        expected_cash: expectedCash,
        actual_cash: parseFloat(closing_cash),
        variance,
        total_bills: parseInt(total_bills),
        total_sales: parseFloat(total_sales),
      },
    });
  } catch (err) {
    console.error('closeShift error:', err.message);
    return res.status(500).json({ message: 'Failed to close shift' });
  }
};

// GET /api/erp/pos/shifts — paginated shift history for this store
const listShifts = async (req, res) => {
  try {
    const business_id = getScopedBusinessId(req);
    if (!business_id) return res.status(400).json({ message: 'Business context required' });

    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM src_erp_pos_sessions WHERE business_id = $1`,
      [business_id]
    );
    const total = parseInt(countRes.rows[0].count);

    const result = await pool.query(
      `SELECT s.*, u.name AS cashier_name, u.employee_code
       FROM src_erp_pos_sessions s
       LEFT JOIN src_users u ON u.id = s.cashier_id
       WHERE s.business_id = $1
       ORDER BY s.opened_at DESC
       LIMIT $2 OFFSET $3`,
      [business_id, limit, offset]
    );

    return res.json({ sessions: result.rows, total, page, limit });
  } catch (err) {
    console.error('listShifts error:', err.message);
    return res.status(500).json({ message: 'Failed to list shifts' });
  }
};

// Remove the placeholder comment and export all functions
Object.assign(module.exports, {
  getActiveShift,
  openShift,
  closeShift,
  listShifts,
});
