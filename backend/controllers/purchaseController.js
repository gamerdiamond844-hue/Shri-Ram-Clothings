'use strict';

const { pool, logAudit } = require('../config/db');

const getScopedBusinessId = (req) =>
  req.tenant?.business_id || req.user?.business_id || null;

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/erp/purchases
// List purchase orders with search + pagination
// ─────────────────────────────────────────────────────────────────────────────
const listPurchases = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const search = (req.query.search || '').trim();
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;
    const status = (req.query.status || '').trim();

    const params = [businessId];
    const conditions = ['po.business_id = $1'];

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      conditions.push(
        `(po.po_number ILIKE $${idx} OR s.name ILIKE $${idx})`
      );
    }

    if (status) {
      params.push(status);
      conditions.push(`po.status = $${params.length}`);
    }

    const where = conditions.join(' AND ');

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM src_erp_purchase_orders po
       LEFT JOIN src_erp_suppliers s ON s.id = po.supplier_id
       WHERE ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit);
    params.push(offset);
    const dataResult = await pool.query(
      `SELECT po.id, po.po_number, po.status, po.total, po.freight_amount,
              po.expected_date, po.created_at, po.supplier_id,
              s.name AS supplier_name
       FROM src_erp_purchase_orders po
       LEFT JOIN src_erp_suppliers s ON s.id = po.supplier_id
       WHERE ${where}
       ORDER BY po.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json({ purchases: dataResult.rows, total, page, limit });
  } catch (err) {
    console.error('listPurchases error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/erp/purchases
// Create a new Purchase Order with line items (single transaction)
// ─────────────────────────────────────────────────────────────────────────────
const createPurchase = async (req, res) => {
  const businessId = getScopedBusinessId(req);
  if (!businessId) return res.status(400).json({ message: 'Business context required' });

  const {
    supplier_id,
    expected_date,
    freight_amount = 0,
    notes,
    items,
  } = req.body;

  // Validate required fields
  if (!supplier_id) {
    return res.status(400).json({ message: 'supplier_id is required' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'items must be a non-empty array' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Validate supplier belongs to this business
    const supplierCheck = await client.query(
      'SELECT id FROM src_erp_suppliers WHERE id = $1 AND business_id = $2',
      [supplier_id, businessId]
    );
    if (!supplierCheck.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Supplier not found' });
    }

    // Auto-generate PO number: PO-{YYYYMMDD}-{random 4-digit}
    const now      = new Date();
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randPart = String(Math.floor(1000 + Math.random() * 9000));
    const poNumber = `PO-${datePart}-${randPart}`;

    // Calculate financials
    let subtotal   = 0;
    let tax_amount = 0;

    const parsedItems = items.map((item) => {
      const qty       = Number(item.quantity_ordered) || 0;
      const unitCost  = Number(item.unit_cost)        || 0;
      const gstRate   = Number(item.gst_rate)         || 0;
      const lineBase  = qty * unitCost;
      const lineTax   = lineBase * (gstRate / 100);
      const lineTotal = lineBase + lineTax;

      subtotal   += lineBase;
      tax_amount += lineTax;

      return { ...item, qty, unitCost, gstRate, lineBase, lineTax, lineTotal };
    });

    const freightAmt = Number(freight_amount) || 0;
    const total      = subtotal + freightAmt + tax_amount;

    // Insert purchase order
    const poResult = await client.query(
      `INSERT INTO src_erp_purchase_orders
         (business_id, po_number, supplier_id, status, expected_date,
          freight_amount, subtotal, tax_amount, total, notes, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
       RETURNING *`,
      [
        businessId,
        poNumber,
        supplier_id,
        expected_date || null,
        freightAmt,
        subtotal,
        tax_amount,
        total,
        notes || null,
        req.user?.id || null,
      ]
    );
    const purchase = poResult.rows[0];

    // Insert line items
    const insertedItems = [];
    for (const item of parsedItems) {
      const itemResult = await client.query(
        `INSERT INTO src_erp_purchase_items
           (purchase_order_id, inventory_item_id, title, sku, hsn_code, gst_rate,
            quantity_ordered, quantity_received, unit_cost, line_total, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9, NOW())
         RETURNING *`,
        [
          purchase.id,
          item.inventory_item_id || null,
          item.title             || null,
          item.sku               || null,
          item.hsn_code          || null,
          item.gstRate,
          item.qty,
          item.unitCost,
          item.lineTotal,
        ]
      );
      insertedItems.push(itemResult.rows[0]);
    }

    await logAudit(client, {
      adminId:    req.user?.id,
      action:     'purchase_order.create',
      targetType: 'purchase_order',
      targetId:   purchase.id,
      details:    JSON.stringify({ po_number: poNumber, supplier_id, total }),
    });

    await client.query('COMMIT');
    return res.status(201).json({ purchase, items: insertedItems });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('createPurchase error:', err.message);
    return res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/erp/purchases/:id/grn
// Record Goods Receipt Note — update stock + supplier balance in one transaction
// ─────────────────────────────────────────────────────────────────────────────
const recordGRN = async (req, res) => {
  const businessId = getScopedBusinessId(req);
  if (!businessId) return res.status(400).json({ message: 'Business context required' });

  const { id } = req.params;
  const { received_items, notes } = req.body;

  if (!Array.isArray(received_items) || received_items.length === 0) {
    return res.status(400).json({ message: 'received_items must be a non-empty array' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Fetch and validate PO
    const poResult = await client.query(
      `SELECT po.*, s.id AS supplier_db_id
       FROM src_erp_purchase_orders po
       LEFT JOIN src_erp_suppliers s ON s.id = po.supplier_id
       WHERE po.id = $1 AND po.business_id = $2`,
      [id, businessId]
    );
    if (!poResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    const po = poResult.rows[0];

    if (po.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Cannot record GRN on a cancelled purchase order' });
    }

    let totalReceivedCost = 0;

    // 2. Process each received item
    for (const ri of received_items) {
      const { purchase_item_id, quantity_received } = ri;
      const qty = Number(quantity_received);

      if (!purchase_item_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'purchase_item_id is required for each received item' });
      }
      if (!qty || qty <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: `quantity_received must be > 0 for purchase_item_id ${purchase_item_id}` });
      }

      // Fetch purchase item (validate it belongs to this PO)
      const piResult = await client.query(
        `SELECT * FROM src_erp_purchase_items
         WHERE id = $1 AND purchase_order_id = $2`,
        [purchase_item_id, id]
      );
      if (!piResult.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: `Purchase item ${purchase_item_id} not found on this PO` });
      }
      const pi = piResult.rows[0];

      // Update quantity_received on the purchase item
      await client.query(
        `UPDATE src_erp_purchase_items
         SET quantity_received = quantity_received + $1
         WHERE id = $2`,
        [qty, purchase_item_id]
      );

      // Update inventory stock (SELECT FOR UPDATE to prevent race conditions)
      if (pi.inventory_item_id) {
        const stockResult = await client.query(
          `SELECT current_stock FROM src_erp_inventory_items
           WHERE id = $1 AND business_id = $2
           FOR UPDATE`,
          [pi.inventory_item_id, businessId]
        );

        if (stockResult.rows.length) {
          const newStock = Number(stockResult.rows[0].current_stock) + qty;

          await client.query(
            `UPDATE src_erp_inventory_items
             SET current_stock = $1, updated_at = NOW()
             WHERE id = $2 AND business_id = $3`,
            [newStock, pi.inventory_item_id, businessId]
          );

          // Insert inventory movement of type 'purchase'
          await client.query(
            `INSERT INTO src_erp_inventory_movements
               (business_id, inventory_item_id, movement_type, quantity,
                balance_after, reference_type, reference_id, notes, created_by, created_at)
             VALUES ($1, $2, 'purchase', $3, $4, 'purchase_order', $5, $6, $7, NOW())`,
            [
              businessId,
              pi.inventory_item_id,
              qty,
              newStock,
              String(id),
              notes || null,
              req.user?.id || null,
            ]
          );
        }
      }

      // Accumulate received cost: qty * unit_cost
      totalReceivedCost += qty * Number(pi.unit_cost);
    }

    // 3. Determine new PO status based on all items
    const allItemsResult = await client.query(
      `SELECT quantity_ordered, quantity_received
       FROM src_erp_purchase_items
       WHERE purchase_order_id = $1`,
      [id]
    );
    const allItems   = allItemsResult.rows;
    const allFulfilled = allItems.every(
      (item) => Number(item.quantity_received) >= Number(item.quantity_ordered)
    );
    const newStatus = allFulfilled ? 'received' : 'partial';

    const updatedPoResult = await client.query(
      `UPDATE src_erp_purchase_orders
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND business_id = $3
       RETURNING *`,
      [newStatus, id, businessId]
    );
    const updatedPo = updatedPoResult.rows[0];

    // 4. Update supplier balance_due
    if (po.supplier_id && totalReceivedCost > 0) {
      await client.query(
        `UPDATE src_erp_suppliers
         SET balance_due = balance_due + $1, updated_at = NOW()
         WHERE id = $2 AND business_id = $3`,
        [totalReceivedCost, po.supplier_id, businessId]
      );
    }

    // 5. Audit log
    await logAudit(client, {
      adminId:    req.user?.id,
      action:     'purchase_order.grn',
      targetType: 'purchase_order',
      targetId:   id,
      details:    JSON.stringify({
        po_number:            po.po_number,
        total_received_cost:  totalReceivedCost,
        new_status:           newStatus,
        items_received:       received_items.length,
      }),
    });

    await client.query('COMMIT');
    return res.json({
      message:  `GRN recorded successfully. PO status: ${newStatus}`,
      purchase: updatedPo,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('recordGRN error:', err.message);
    return res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/erp/purchases/:id/return
// Record a purchase return — reduce stock + reduce supplier balance_due
// ─────────────────────────────────────────────────────────────────────────────
const purchaseReturn = async (req, res) => {
  const businessId = getScopedBusinessId(req);
  if (!businessId) return res.status(400).json({ message: 'Business context required' });

  const { id } = req.params;
  const { return_items, notes } = req.body;

  if (!Array.isArray(return_items) || return_items.length === 0) {
    return res.status(400).json({ message: 'return_items must be a non-empty array' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Validate PO exists and belongs to business
    const poResult = await client.query(
      `SELECT * FROM src_erp_purchase_orders
       WHERE id = $1 AND business_id = $2`,
      [id, businessId]
    );
    if (!poResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Purchase order not found' });
    }
    const po = poResult.rows[0];

    let totalReturnValue = 0;

    // 2. Process each return item
    for (const ri of return_items) {
      const { inventory_item_id, quantity, unit_cost } = ri;
      const qty      = Number(quantity);
      const unitCost = Number(unit_cost) || 0;

      if (!inventory_item_id) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'inventory_item_id is required for each return item' });
      }
      if (!qty || qty <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: `quantity must be > 0 for inventory_item_id ${inventory_item_id}` });
      }

      // SELECT current_stock FOR UPDATE
      const stockResult = await client.query(
        `SELECT current_stock FROM src_erp_inventory_items
         WHERE id = $1 AND business_id = $2
         FOR UPDATE`,
        [inventory_item_id, businessId]
      );
      if (!stockResult.rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: `Inventory item ${inventory_item_id} not found` });
      }

      const newStock = Number(stockResult.rows[0].current_stock) - qty;

      // Update stock (allow negative in purchase return scenario — goods leaving the store)
      await client.query(
        `UPDATE src_erp_inventory_items
         SET current_stock = $1, updated_at = NOW()
         WHERE id = $2 AND business_id = $3`,
        [newStock, inventory_item_id, businessId]
      );

      // Insert movement of type 'return' with negative quantity
      await client.query(
        `INSERT INTO src_erp_inventory_movements
           (business_id, inventory_item_id, movement_type, quantity,
            balance_after, reference_type, reference_id, notes, created_by, created_at)
         VALUES ($1, $2, 'return', $3, $4, 'purchase_order', $5, $6, $7, NOW())`,
        [
          businessId,
          inventory_item_id,
          -qty,
          newStock,
          String(id),
          notes || null,
          req.user?.id || null,
        ]
      );

      totalReturnValue += qty * unitCost;
    }

    // 3. Update supplier balance_due (reduce, floor at 0)
    let newBalanceDue = 0;
    if (po.supplier_id) {
      const supplierResult = await client.query(
        `UPDATE src_erp_suppliers
         SET balance_due  = GREATEST(balance_due - $1, 0),
             updated_at   = NOW()
         WHERE id = $2 AND business_id = $3
         RETURNING balance_due`,
        [totalReturnValue, po.supplier_id, businessId]
      );
      if (supplierResult.rows.length) {
        newBalanceDue = Number(supplierResult.rows[0].balance_due);
      }
    }

    // 4. Audit log
    await logAudit(client, {
      adminId:    req.user?.id,
      action:     'purchase_order.return',
      targetType: 'purchase_order',
      targetId:   id,
      details:    JSON.stringify({
        po_number:          po.po_number,
        total_return_value: totalReturnValue,
        items_returned:     return_items.length,
      }),
    });

    await client.query('COMMIT');
    return res.json({
      message:      'Purchase return recorded successfully',
      balance_after: newBalanceDue,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('purchaseReturn error:', err.message);
    return res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
};

module.exports = {
  listPurchases,
  createPurchase,
  recordGRN,
  purchaseReturn,
};
