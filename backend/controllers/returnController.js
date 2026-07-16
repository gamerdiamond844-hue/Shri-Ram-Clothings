'use strict';

const { pool, logAudit } = require('../config/db');

const getScopedBusinessId = (req) => req.tenant?.business_id || req.user?.business_id || null;

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/erp/returns
// List returns with pagination + search
// ─────────────────────────────────────────────────────────────────────────────
const listReturns = async (req, res) => {
  try {
    const business_id = getScopedBusinessId(req);
    if (!business_id) return res.status(400).json({ message: 'Business context required' });

    let page  = Math.max(1, parseInt(req.query.page  || '1', 10));
    let limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
    const search = (req.query.search || '').trim();
    const offset = (page - 1) * limit;

    const params = [business_id];
    let whereExtra = '';

    if (search) {
      params.push(`%${search}%`);
      whereExtra = `AND (r.return_no ILIKE $${params.length} OR s.bill_no ILIKE $${params.length})`;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM src_erp_returns r
       LEFT JOIN src_erp_sales s ON s.id = r.original_sale_id
       WHERE r.business_id = $1 ${whereExtra}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT r.id, r.return_no, r.return_type, r.status, r.total_amount,
              r.notes, r.created_at, r.original_sale_id, r.customer_id,
              s.bill_no
       FROM src_erp_returns r
       LEFT JOIN src_erp_sales s ON s.id = r.original_sale_id
       WHERE r.business_id = $1 ${whereExtra}
       ORDER BY r.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json({ returns: dataResult.rows, total, page, limit });
  } catch (err) {
    console.error('listReturns error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/erp/returns
// Create a return (refund | store_credit | exchange) — fully transactional
// ─────────────────────────────────────────────────────────────────────────────
const createReturn = async (req, res) => {
  const business_id = getScopedBusinessId(req);
  if (!business_id) return res.status(400).json({ message: 'Business context required' });

  const {
    original_sale_id,
    return_type = 'refund',   // refund | store_credit | exchange
    items          = [],       // [{ sale_item_id, inventory_item_id, quantity, unit_price, title }]
    exchange_items = [],       // only for return_type='exchange'
    notes,
  } = req.body;

  // ── Basic validation ────────────────────────────────────────────────────────
  if (!original_sale_id) {
    return res.status(400).json({ message: 'original_sale_id is required' });
  }
  if (!['refund', 'store_credit', 'exchange'].includes(return_type)) {
    return res.status(400).json({ message: 'return_type must be refund, store_credit, or exchange' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'items array is required and must be non-empty' });
  }

  // ── Generate return_no ──────────────────────────────────────────────────────
  const now      = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  const randPart = String(Math.floor(Math.random() * 10_000)).padStart(4, '0');
  const return_no = `RET-${datePart}-${randPart}`;

  // ── Calculate total ─────────────────────────────────────────────────────────
  const total_amount = items.reduce(
    (sum, it) => sum + Number(it.quantity || 0) * Number(it.unit_price || 0),
    0
  );

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 1. Validate original sale belongs to this business ──────────────────
    const saleRes = await client.query(
      `SELECT id, business_id, customer_id, status
       FROM src_erp_sales
       WHERE id = $1 AND business_id = $2`,
      [original_sale_id, business_id]
    );
    if (saleRes.rowCount === 0) {
      throw new Error('Original sale not found in this business');
    }
    const originalSale = saleRes.rows[0];

    // ── 2. Insert src_erp_returns ───────────────────────────────────────────
    const returnRes = await client.query(
      `INSERT INTO src_erp_returns
         (business_id, return_no, original_sale_id, customer_id, return_type,
          status, total_amount, notes, processed_by)
       VALUES ($1, $2, $3, $4, $5, 'completed', $6, $7, $8)
       RETURNING *`,
      [
        business_id,
        return_no,
        original_sale_id,
        originalSale.customer_id || null,
        return_type,
        total_amount,
        notes || null,
        req.user?.id || null,
      ]
    );
    const returnRecord = returnRes.rows[0];
    const return_id = returnRecord.id;

    // ── 3. For each return item: insert row, restore stock, record movement ──
    for (const item of items) {
      const { sale_item_id, inventory_item_id, quantity, unit_price, title } = item;
      const qty      = Number(quantity  || 0);
      const price    = Number(unit_price || 0);
      const line_total = qty * price;

      // 3a. Insert return item row
      await client.query(
        `INSERT INTO src_erp_return_items
           (return_id, sale_item_id, inventory_item_id, title, quantity, unit_price, line_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [return_id, sale_item_id || null, inventory_item_id, title || null, qty, price, line_total]
      );

      // 3b. Lock inventory row + get current stock
      const stockRes = await client.query(
        `SELECT current_stock FROM src_erp_inventory_items
         WHERE id = $1 AND business_id = $2
         FOR UPDATE`,
        [inventory_item_id, business_id]
      );
      if (stockRes.rowCount === 0) {
        throw new Error(`Inventory item ${inventory_item_id} not found`);
      }
      const currentStock = Number(stockRes.rows[0].current_stock);
      const newStock = currentStock + qty;

      // 3c. Restore stock
      await client.query(
        `UPDATE src_erp_inventory_items
         SET current_stock = $1, updated_at = NOW()
         WHERE id = $2 AND business_id = $3`,
        [newStock, inventory_item_id, business_id]
      );

      // 3d. Append inventory movement (type='return', positive qty)
      await client.query(
        `INSERT INTO src_erp_inventory_movements
           (business_id, inventory_item_id, store_id, movement_type,
            quantity, balance_after, reference_type, reference_id, created_by)
         VALUES ($1, $2, $3, 'return', $4, $5, 'return', $6, $7)`,
        [
          business_id,
          inventory_item_id,
          req.user?.store_id || null,
          qty,
          newStock,
          return_no,
          req.user?.id || null,
        ]
      );
    }

    // ── 4. Update original sale status if ALL items are being returned ───────
    const saleItemsRes = await client.query(
      `SELECT id FROM src_erp_sale_items WHERE sale_id = $1`,
      [original_sale_id]
    );
    const allSaleItemIds = saleItemsRes.rows.map((r) => r.id);
    const returnedSaleItemIds = items
      .map((it) => it.sale_item_id)
      .filter(Boolean)
      .map(Number);

    const allReturned =
      allSaleItemIds.length > 0 &&
      allSaleItemIds.every((sid) => returnedSaleItemIds.includes(sid));

    if (allReturned) {
      await client.query(
        `UPDATE src_erp_sales SET status = 'returned', updated_at = NOW()
         WHERE id = $1 AND business_id = $2`,
        [original_sale_id, business_id]
      );
    }

    // ── 5. Store credit top-up ───────────────────────────────────────────────
    if (return_type === 'store_credit' && originalSale.customer_id) {
      await client.query(
        `UPDATE src_erp_customers
         SET store_credit = store_credit + $1, updated_at = NOW()
         WHERE id = $2 AND business_id = $3`,
        [total_amount, originalSale.customer_id, business_id]
      );
    }

    // ── 6. Exchange: create linked draft sale ────────────────────────────────
    let exchange_sale_id = null;

    if (return_type === 'exchange' && Array.isArray(exchange_items) && exchange_items.length > 0) {
      const exchTotal = exchange_items.reduce(
        (sum, ei) => sum + Number(ei.quantity || 0) * Number(ei.unit_price || 0),
        0
      );
      const exch_bill_no = `EXCH-${return_no}`;

      const exchSaleRes = await client.query(
        `INSERT INTO src_erp_sales
           (business_id, store_id, customer_id, cashier_id, bill_no, channel,
            payment_method, split_payment, discount_amount, tax_amount,
            round_off, total, notes, status, payment_status)
         VALUES ($1, $2, $3, $4, $5, 'exchange',
                 'cash', '[]'::jsonb, 0, 0, 0, $6, $7, 'draft', 'pending')
         RETURNING id`,
        [
          business_id,
          req.user?.store_id || null,
          originalSale.customer_id || null,
          req.user?.id || null,
          exch_bill_no,
          exchTotal,
          `Exchange for return ${return_no}`,
        ]
      );
      exchange_sale_id = exchSaleRes.rows[0].id;

      for (const ei of exchange_items) {
        const eiQty        = Number(ei.quantity   || 0);
        const eiPrice      = Number(ei.unit_price  || 0);
        const eiLineTotal  = eiQty * eiPrice;

        await client.query(
          `INSERT INTO src_erp_sale_items
             (sale_id, inventory_item_id, title, sku, quantity,
              unit_price, tax_amount, discount_amount, line_total)
           VALUES ($1, $2, $3, $4, $5, $6, 0, 0, $7)`,
          [
            exchange_sale_id,
            ei.inventory_item_id || null,
            ei.title || null,
            ei.sku   || null,
            eiQty,
            eiPrice,
            eiLineTotal,
          ]
        );
      }

      // Append exchange sale id reference into return notes
      await client.query(
        `UPDATE src_erp_returns
         SET notes = COALESCE(notes || ' ', '') || '[exchange_sale_id:' || $1 || ']'
         WHERE id = $2`,
        [exchange_sale_id, return_id]
      );
    }

    // ── 7. Audit log ─────────────────────────────────────────────────────────
    await logAudit(client, {
      adminId:    req.user?.id,
      action:     'return.created',
      targetType: 'return',
      targetId:   return_id,
      details:    `return_no=${return_no} type=${return_type} amount=${total_amount}`,
    });

    await client.query('COMMIT');

    return res.status(201).json({
      returnRecord: { ...returnRecord, exchange_sale_id },
      ...(exchange_sale_id ? { exchange_sale_id } : {}),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('createReturn error:', err.message);
    return res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
};

module.exports = { listReturns, createReturn };
