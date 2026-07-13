'use strict';

const { pool, logAudit } = require('../config/db');
const XLSX = require('xlsx');

const getScopedBusinessId = (req) =>
  req.tenant?.business_id || req.user?.business_id || null;

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build shared filter clauses for sales queries
// ─────────────────────────────────────────────────────────────────────────────
const buildSalesFilters = (query, businessId) => {
  const { from, to, payment_method, status, cashier_id, search } = query;

  const params = [businessId];
  const conditions = ['s.business_id = $1'];

  if (from) {
    params.push(from);
    conditions.push(`s.created_at >= $${params.length}::date`);
  }
  if (to) {
    params.push(to);
    conditions.push(`s.created_at < ($${params.length}::date + INTERVAL '1 day')`);
  }
  if (payment_method) {
    params.push(payment_method);
    conditions.push(`s.payment_method = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`s.status = $${params.length}`);
  }
  if (cashier_id) {
    params.push(cashier_id);
    conditions.push(`s.cashier_id = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`s.bill_no ILIKE $${params.length}`);
  }

  return { params, conditions };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/erp/sales
// List sales with pagination and filters
// ─────────────────────────────────────────────────────────────────────────────
const listSales = async (req, res) => {
  const business_id = getScopedBusinessId(req);
  if (!business_id) return res.status(400).json({ message: 'Business context required' });

  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const { params, conditions } = buildSalesFilters(req.query, business_id);
  const where = conditions.join(' AND ');

  try {
    // Total count
    const countRes = await pool.query(
      `SELECT COUNT(*) AS total
         FROM src_erp_sales s
        WHERE ${where}`,
      params
    );
    const total = parseInt(countRes.rows[0].total);

    // Data rows
    params.push(limit, offset);
    const dataRes = await pool.query(
      `SELECT s.*,
              u.name  AS cashier_name,
              c.name  AS customer_name,
              c.phone AS customer_phone
         FROM src_erp_sales s
    LEFT JOIN src_users         u ON u.id = s.cashier_id
    LEFT JOIN src_erp_customers c ON c.id = s.customer_id
        WHERE ${where}
     ORDER BY s.created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json({ sales: dataRes.rows, total, page, limit });
  } catch (err) {
    console.error('listSales error:', err.message);
    return res.status(500).json({ message: 'Failed to fetch sales' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/erp/sales/:id
// Get a single sale with its line items
// ─────────────────────────────────────────────────────────────────────────────
const getSale = async (req, res) => {
  const business_id = getScopedBusinessId(req);
  if (!business_id) return res.status(400).json({ message: 'Business context required' });

  const { id } = req.params;

  try {
    // Fetch sale header
    const saleRes = await pool.query(
      `SELECT s.*,
              u.name  AS cashier_name,
              c.name  AS customer_name,
              c.phone AS customer_phone,
              c.store_credit AS customer_store_credit
         FROM src_erp_sales s
    LEFT JOIN src_users         u ON u.id = s.cashier_id
    LEFT JOIN src_erp_customers c ON c.id = s.customer_id
        WHERE s.id = $1 AND s.business_id = $2`,
      [id, business_id]
    );

    if (!saleRes.rows.length) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    const sale = saleRes.rows[0];

    // Fetch line items with inventory details
    const itemsRes = await pool.query(
      `SELECT si.*,
              i.barcode,
              i.image_url,
              i.variant_size,
              i.variant_color,
              i.gst_rate,
              i.hsn_code
         FROM src_erp_sale_items si
    LEFT JOIN src_erp_inventory_items i ON i.id = si.inventory_item_id
        WHERE si.sale_id = $1
     ORDER BY si.id ASC`,
      [id]
    );

    sale.items = itemsRes.rows;

    return res.json({ sale });
  } catch (err) {
    console.error('getSale error:', err.message);
    return res.status(500).json({ message: 'Failed to fetch sale' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/erp/sales/:id/void
// Void a sale — transactional: update status, restore stock, audit log
// ─────────────────────────────────────────────────────────────────────────────
const voidSale = async (req, res) => {
  const business_id = getScopedBusinessId(req);
  if (!business_id) return res.status(400).json({ message: 'Business context required' });

  const { id } = req.params;
  const { reason = '' } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock sale row and check status
    const saleRes = await client.query(
      `SELECT * FROM src_erp_sales
        WHERE id = $1 AND business_id = $2
          FOR UPDATE`,
      [id, business_id]
    );

    if (!saleRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Sale not found' });
    }

    const sale = saleRes.rows[0];

    if (sale.status === 'void') {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Sale is already voided' });
    }

    // Update status to void
    const updatedRes = await client.query(
      `UPDATE src_erp_sales
          SET status = 'void', updated_at = NOW()
        WHERE id = $1 AND business_id = $2
      RETURNING *`,
      [id, business_id]
    );
    const updatedSale = updatedRes.rows[0];

    // Fetch all sale items
    const itemsRes = await client.query(
      `SELECT * FROM src_erp_sale_items WHERE sale_id = $1`,
      [id]
    );

    // Restore stock for each item via return movement
    for (const item of itemsRes.rows) {
      if (!item.inventory_item_id) continue;

      // Lock inventory row and restore stock
      const stockRes = await client.query(
        `UPDATE src_erp_inventory_items
            SET current_stock = current_stock + $1,
                updated_at = NOW()
          WHERE id = $2 AND business_id = $3
          RETURNING current_stock`,
        [item.quantity, item.inventory_item_id, business_id]
      );

      if (!stockRes.rows.length) continue;

      const balance_after = stockRes.rows[0].current_stock;

      // Insert return movement
      await client.query(
        `INSERT INTO src_erp_inventory_movements
           (business_id, inventory_item_id, store_id, movement_type,
            quantity, balance_after, reference_type, reference_id, notes, created_by)
         VALUES ($1, $2, $3, 'return', $4, $5, 'sale_void', $6, $7, $8)`,
        [
          business_id,
          item.inventory_item_id,
          sale.store_id || null,
          item.quantity,
          balance_after,
          sale.bill_no,
          reason || `Void: ${sale.bill_no}`,
          req.user?.id || null,
        ]
      );
    }

    // Audit log
    await logAudit(client, {
      adminId: req.user?.id,
      action: 'sale.void',
      targetType: 'sale',
      targetId: sale.id,
      details: `Bill: ${sale.bill_no}${reason ? ` | Reason: ${reason}` : ''}`,
    });

    await client.query('COMMIT');
    return res.json({ message: 'Sale voided successfully', sale: updatedSale });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('voidSale error:', err.message);
    return res.status(500).json({ message: 'Failed to void sale' });
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/erp/sales/:id/credit-note
// Issue a credit note — increment customer.store_credit, audit log
// ─────────────────────────────────────────────────────────────────────────────
const issueCreditNote = async (req, res) => {
  const business_id = getScopedBusinessId(req);
  if (!business_id) return res.status(400).json({ message: 'Business context required' });

  const { id } = req.params;
  const { amount, notes = '' } = req.body;

  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ message: 'amount must be greater than 0' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch sale
    const saleRes = await client.query(
      `SELECT * FROM src_erp_sales WHERE id = $1 AND business_id = $2`,
      [id, business_id]
    );

    if (!saleRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Sale not found' });
    }

    const sale = saleRes.rows[0];

    if (!sale.customer_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Sale has no linked customer — cannot issue credit note' });
    }

    // Increment customer store credit
    const creditRes = await client.query(
      `UPDATE src_erp_customers
          SET store_credit = store_credit + $1,
              updated_at   = NOW()
        WHERE id = $2 AND business_id = $3
      RETURNING store_credit, name`,
      [Number(amount), sale.customer_id, business_id]
    );

    if (!creditRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Customer not found' });
    }

    const { store_credit: new_store_credit, name: customer_name } = creditRes.rows[0];

    // Audit log
    await logAudit(client, {
      adminId: req.user?.id,
      action: 'sale.credit_note',
      targetType: 'sale',
      targetId: sale.id,
      details: `Bill: ${sale.bill_no} | Customer: ${customer_name} | Amount: ${amount}${notes ? ` | Notes: ${notes}` : ''}`,
    });

    await client.query('COMMIT');
    return res.json({
      message: 'Credit note issued successfully',
      new_store_credit,
      customer_name,
      bill_no: sale.bill_no,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('issueCreditNote error:', err.message);
    return res.status(500).json({ message: 'Failed to issue credit note' });
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/erp/sales/export
// Export sales to Excel with same filters as listSales (no pagination)
// ─────────────────────────────────────────────────────────────────────────────
const exportSales = async (req, res) => {
  const business_id = getScopedBusinessId(req);
  if (!business_id) return res.status(400).json({ message: 'Business context required' });

  const { params, conditions } = buildSalesFilters(req.query, business_id);
  const where = conditions.join(' AND ');

  try {
    const dataRes = await pool.query(
      `SELECT s.bill_no,
              s.created_at,
              c.name        AS customer_name,
              u.name        AS cashier_name,
              s.payment_method,
              s.total,
              s.status,
              s.tax_amount,
              s.discount_amount
         FROM src_erp_sales s
    LEFT JOIN src_users         u ON u.id = s.cashier_id
    LEFT JOIN src_erp_customers c ON c.id = s.customer_id
        WHERE ${where}
     ORDER BY s.created_at DESC`,
      params
    );

    // Build Excel rows
    const colOrder = [
      'Bill No', 'Date', 'Customer', 'Cashier',
      'Payment Method', 'Total', 'Status', 'Tax', 'Discount',
    ];

    const rows = dataRes.rows.map((r) => ({
      'Bill No':        r.bill_no,
      'Date':           r.created_at ? new Date(r.created_at).toLocaleString('en-IN') : '',
      'Customer':       r.customer_name || '',
      'Cashier':        r.cashier_name  || '',
      'Payment Method': r.payment_method || '',
      'Total':          Number(r.total          || 0),
      'Status':         r.status || '',
      'Tax':            Number(r.tax_amount      || 0),
      'Discount':       Number(r.discount_amount || 0),
    }));

    const ws = XLSX.utils.json_to_sheet(rows, { header: colOrder });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sales');

    // Auto-width columns
    const colWidths = colOrder.map((h) => ({ wch: Math.max(h.length + 2, 14) }));
    ws['!cols'] = colWidths;

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Disposition', `attachment; filename=sales-export-${date}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  } catch (err) {
    console.error('exportSales error:', err.message);
    return res.status(500).json({ message: 'Export failed' });
  }
};

module.exports = {
  listSales,
  getSale,
  voidSale,
  issueCreditNote,
  exportSales,
};
