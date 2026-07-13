'use strict';

const { pool, logAudit } = require('../config/db');
const xlsx = require('xlsx');
const crypto = require('crypto');

const getScopedBusinessId = (req) =>
  req.tenant?.business_id || req.user?.business_id || null;

// ── EAN13 helper ──────────────────────────────────────────────────────────────
const computeEan13 = (digits12) => {
  const d = String(digits12).padStart(12, '0').split('').map(Number);
  const sum = d.reduce((s, v, i) => s + v * (i % 2 === 0 ? 1 : 3), 0);
  const check = (10 - (sum % 10)) % 10;
  return d.join('') + check;
};

// ── Auto-generate SKU ─────────────────────────────────────────────────────────
const generateSku = async (client, businessId) => {
  const year = new Date().getFullYear();
  const { rows } = await client.query(
    'SELECT COUNT(*) AS cnt FROM src_erp_inventory_items WHERE business_id=$1',
    [businessId]
  );
  const seq = String(Number(rows[0].cnt) + 1).padStart(7, '0');
  return `SRC-${year}-${seq}`;
};

// ── Auto-generate EAN13 barcode ───────────────────────────────────────────────
const generateBarcode = (businessId) => {
  const bStr = String(businessId).slice(-4).padStart(4, '0');
  const ts = String(Date.now()).slice(-5);
  const rnd = String(Math.floor(Math.random() * 1000)).padStart(3, '0');
  const raw12 = (bStr + ts + rnd).slice(0, 12).padStart(12, '0');
  return computeEan13(raw12);
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /items
// ─────────────────────────────────────────────────────────────────────────────
const listItems = async (req, res) => {
  const businessId = getScopedBusinessId(req);
  if (!businessId) return res.status(400).json({ message: 'Business context required' });

  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const { search, warehouse_id, low_stock } = req.query;

  const params = [businessId];
  const conditions = ['i.business_id = $1', "i.status != 'archived'"];

  if (search) {
    params.push(`%${search}%`);
    const p = params.length;
    conditions.push(`(i.title ILIKE $${p} OR i.sku ILIKE $${p} OR i.barcode ILIKE $${p})`);
  }

  if (warehouse_id) {
    params.push(warehouse_id);
    conditions.push(`i.warehouse_id = $${params.length}`);
  }

  if (low_stock === 'true' || low_stock === '1') {
    conditions.push('i.current_stock <= i.reorder_level');
  }

  const where = conditions.join(' AND ');

  try {
    const countRes = await pool.query(
      `SELECT COUNT(*) AS total
         FROM src_erp_inventory_items i
        WHERE ${where}`,
      params
    );
    const total = parseInt(countRes.rows[0].total);

    params.push(limit, offset);
    const dataRes = await pool.query(
      `SELECT i.*,
              s.name AS supplier_name
         FROM src_erp_inventory_items i
    LEFT JOIN src_erp_suppliers s ON s.id = i.supplier_id
        WHERE ${where}
     ORDER BY i.created_at DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json({ items: dataRes.rows, total, page, limit });
  } catch (err) {
    console.error('listItems error:', err.message);
    return res.status(500).json({ message: 'Failed to fetch inventory items' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /items
// ─────────────────────────────────────────────────────────────────────────────
const createItem = async (req, res) => {
  const businessId = getScopedBusinessId(req);
  if (!businessId) return res.status(400).json({ message: 'Business context required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let {
      title, sku, barcode, category, purchase_price, selling_price, mrp,
      current_stock = 0, reorder_level = 0, gst_rate, hsn_code,
      variant_size, variant_color, warehouse_id, supplier_id, notes,
    } = req.body;

    // Auto-generate SKU if not provided
    if (!sku) {
      sku = await generateSku(client, businessId);
    }

    // Auto-generate barcode (EAN13) if not provided
    if (!barcode) {
      barcode = generateBarcode(businessId);
    }

    // Check SKU uniqueness
    const skuCheck = await client.query(
      'SELECT id FROM src_erp_inventory_items WHERE business_id=$1 AND sku=$2',
      [businessId, sku]
    );
    if (skuCheck.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'SKU already exists for this business' });
    }

    // Check barcode uniqueness
    const bcCheck = await client.query(
      'SELECT id FROM src_erp_inventory_items WHERE business_id=$1 AND barcode=$2',
      [businessId, barcode]
    );
    if (bcCheck.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'Barcode already exists for this business' });
    }

    // Auto-generate internal_product_id
    const internal_product_id = `IPI-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const insertRes = await client.query(
      `INSERT INTO src_erp_inventory_items
         (business_id, title, sku, barcode, internal_product_id, category,
          purchase_price, selling_price, mrp, current_stock, reorder_level,
          gst_rate, hsn_code, variant_size, variant_color, warehouse_id,
          supplier_id, notes, status, created_at, updated_at)
       VALUES
         ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'active',NOW(),NOW())
       RETURNING *`,
      [
        businessId, title, sku, barcode, internal_product_id, category || null,
        purchase_price || null, selling_price || null, mrp || null,
        current_stock, reorder_level,
        gst_rate || null, hsn_code || null,
        variant_size || null, variant_color || null,
        warehouse_id || null, supplier_id || null, notes || null,
      ]
    );
    const item = insertRes.rows[0];

    // Insert opening stock movement if current_stock > 0
    if (Number(current_stock) > 0) {
      await client.query(
        `INSERT INTO src_erp_inventory_movements
           (business_id, inventory_item_id, movement_type, quantity, balance_after, notes, created_at)
         VALUES ($1,$2,'opening',$3,$4,'Opening stock',NOW())`,
        [businessId, item.id, current_stock, current_stock]
      );
    }

    await logAudit(client, { adminId: req.user?.id, action: 'inventory_item.create', targetType: 'inventory_item', targetId: item.id, details: sku });
    await client.query('COMMIT');

    return res.status(201).json(item);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('createItem error:', err.message);
    return res.status(500).json({ message: 'Failed to create inventory item' });
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /items/:id
// ─────────────────────────────────────────────────────────────────────────────
const updateItem = async (req, res) => {
  const businessId = getScopedBusinessId(req);
  if (!businessId) return res.status(400).json({ message: 'Business context required' });

  const { id } = req.params;
  const allowed = [
    'title', 'category', 'purchase_price', 'selling_price', 'mrp',
    'reorder_level', 'gst_rate', 'hsn_code', 'variant_size', 'variant_color',
    'warehouse_id', 'supplier_id', 'notes', 'status',
  ];

  const fields = [];
  const values = [];
  for (const key of allowed) {
    if (req.body[key] !== undefined) {
      values.push(req.body[key]);
      fields.push(`${key} = $${values.length}`);
    }
  }

  if (!fields.length) {
    return res.status(400).json({ message: 'No updatable fields provided' });
  }

  values.push(id, businessId);
  const idIdx  = values.length - 1;
  const bidIdx = values.length;

  try {
    const result = await pool.query(
      `UPDATE src_erp_inventory_items
          SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = $${idIdx} AND business_id = $${bidIdx}
      RETURNING *`,
      values
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Item not found' });
    }

    await logAudit(pool, { adminId: req.user?.id, action: 'inventory_item.update', targetType: 'inventory_item', targetId: id });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('updateItem error:', err.message);
    return res.status(500).json({ message: 'Failed to update inventory item' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /items/:id  (soft delete)
// ─────────────────────────────────────────────────────────────────────────────
const deleteItem = async (req, res) => {
  const businessId = getScopedBusinessId(req);
  if (!businessId) return res.status(400).json({ message: 'Business context required' });

  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE src_erp_inventory_items
          SET status='archived', updated_at=NOW()
        WHERE id=$1 AND business_id=$2
      RETURNING id`,
      [id, businessId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: 'Item not found' });
    }

    await logAudit(pool, { adminId: req.user?.id, action: 'inventory_item.delete', targetType: 'inventory_item', targetId: id });
    return res.json({ success: true });
  } catch (err) {
    console.error('deleteItem error:', err.message);
    return res.status(500).json({ message: 'Failed to delete inventory item' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /items/:id/movements
// ─────────────────────────────────────────────────────────────────────────────
const getMovements = async (req, res) => {
  const businessId = getScopedBusinessId(req);
  if (!businessId) return res.status(400).json({ message: 'Business context required' });

  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM src_erp_inventory_movements
        WHERE inventory_item_id=$1 AND business_id=$2
        ORDER BY created_at DESC
        LIMIT 100`,
      [id, businessId]
    );

    return res.json({ movements: result.rows });
  } catch (err) {
    console.error('getMovements error:', err.message);
    return res.status(500).json({ message: 'Failed to fetch movements' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /adjust
// ─────────────────────────────────────────────────────────────────────────────
const adjustStock = async (req, res) => {
  const businessId = getScopedBusinessId(req);
  if (!businessId) return res.status(400).json({ message: 'Business context required' });

  const { inventory_item_id, quantity_delta, notes } = req.body;

  if (inventory_item_id === undefined || quantity_delta === undefined) {
    return res.status(400).json({ message: 'inventory_item_id and quantity_delta are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update stock atomically
    const stockRes = await client.query(
      `UPDATE src_erp_inventory_items
          SET current_stock = current_stock + $1, updated_at = NOW()
        WHERE id=$2 AND business_id=$3
      RETURNING current_stock`,
      [quantity_delta, inventory_item_id, businessId]
    );

    if (!stockRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    const new_stock = Number(stockRes.rows[0].current_stock);

    if (new_stock < 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Insufficient stock — adjustment would result in negative stock' });
    }

    // Insert adjustment movement
    const movRes = await client.query(
      `INSERT INTO src_erp_inventory_movements
         (business_id, inventory_item_id, movement_type, quantity, balance_after, notes, created_at)
       VALUES ($1,$2,'adjustment',$3,$4,$5,NOW())
       RETURNING *`,
      [businessId, inventory_item_id, quantity_delta, new_stock, notes || null]
    );

    await logAudit(client, { adminId: req.user?.id, action: 'inventory.adjust_stock', targetType: 'inventory_item', targetId: inventory_item_id, details: `delta:${quantity_delta} new_stock:${new_stock}` });

    await client.query('COMMIT');
    return res.json({ new_stock, movement: movRes.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('adjustStock error:', err.message);
    return res.status(500).json({ message: 'Failed to adjust stock' });
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /import  (multipart, field: file)
// ─────────────────────────────────────────────────────────────────────────────
const importItems = async (req, res) => {
  const businessId = getScopedBusinessId(req);
  if (!businessId) return res.status(400).json({ message: 'Business context required' });

  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded (field name: file)' });
  }

  let workbook;
  try {
    workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
  } catch (e) {
    return res.status(400).json({ message: 'Invalid file format' });
  }

  const sheetName = workbook.SheetNames[0];
  const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

  const expectedCols = [
    'title', 'sku', 'barcode', 'category', 'purchase_price', 'selling_price',
    'mrp', 'current_stock', 'reorder_level', 'gst_rate', 'hsn_code',
    'variant_size', 'variant_color',
  ];

  let imported = 0;
  const errors = [];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // 1-indexed, row 1 is header

      // Validate required fields
      if (!row.title || String(row.title).trim() === '') {
        errors.push({ row: rowNum, message: 'title is required' });
        continue;
      }
      const selling_price = parseFloat(row.selling_price);
      if (!selling_price || selling_price <= 0) {
        errors.push({ row: rowNum, message: 'selling_price must be greater than 0' });
        continue;
      }

      const title         = String(row.title).trim();
      const category      = row.category ? String(row.category).trim() : null;
      const purchase_price = parseFloat(row.purchase_price) || null;
      const mrp           = parseFloat(row.mrp) || null;
      const current_stock = parseFloat(row.current_stock) || 0;
      const reorder_level = parseFloat(row.reorder_level) || 0;
      const gst_rate      = parseFloat(row.gst_rate) || null;
      const hsn_code      = row.hsn_code ? String(row.hsn_code).trim() : null;
      const variant_size  = row.variant_size ? String(row.variant_size).trim() : null;
      const variant_color = row.variant_color ? String(row.variant_color).trim() : null;

      let sku     = row.sku ? String(row.sku).trim() : null;
      let barcode = row.barcode ? String(row.barcode).trim() : null;

      // Auto-generate missing SKU
      if (!sku) {
        sku = await generateSku(client, businessId);
      }

      // Auto-generate missing barcode
      if (!barcode) {
        barcode = generateBarcode(businessId);
      }

      // Check uniqueness (skip duplicates with an error)
      const skuCheck = await client.query(
        'SELECT id FROM src_erp_inventory_items WHERE business_id=$1 AND sku=$2',
        [businessId, sku]
      );
      if (skuCheck.rows.length) {
        errors.push({ row: rowNum, message: `SKU "${sku}" already exists` });
        continue;
      }

      const bcCheck = await client.query(
        'SELECT id FROM src_erp_inventory_items WHERE business_id=$1 AND barcode=$2',
        [businessId, barcode]
      );
      if (bcCheck.rows.length) {
        errors.push({ row: rowNum, message: `Barcode "${barcode}" already exists` });
        continue;
      }

      const internal_product_id = `IPI-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

      const insertRes = await client.query(
        `INSERT INTO src_erp_inventory_items
           (business_id, title, sku, barcode, internal_product_id, category,
            purchase_price, selling_price, mrp, current_stock, reorder_level,
            gst_rate, hsn_code, variant_size, variant_color, status, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'active',NOW(),NOW())
         RETURNING id`,
        [
          businessId, title, sku, barcode, internal_product_id, category,
          purchase_price, selling_price, mrp, current_stock, reorder_level,
          gst_rate, hsn_code, variant_size, variant_color,
        ]
      );

      const newItemId = insertRes.rows[0].id;

      if (current_stock > 0) {
        await client.query(
          `INSERT INTO src_erp_inventory_movements
             (business_id, inventory_item_id, movement_type, quantity, balance_after, notes, created_at)
           VALUES ($1,$2,'opening',$3,$4,'Opening stock (import)',NOW())`,
          [businessId, newItemId, current_stock, current_stock]
        );
      }

      imported++;
    }

    await client.query('COMMIT');

    if (imported > 0) {
      await logAudit(pool, { adminId: req.user?.id, action: 'inventory.import', details: `imported:${imported}` });
    }

    return res.json({ imported, errors });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('importItems error:', err.message);
    return res.status(500).json({ message: 'Import failed', error: err.message });
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /export
// ─────────────────────────────────────────────────────────────────────────────
const exportItems = async (req, res) => {
  const businessId = getScopedBusinessId(req);
  if (!businessId) return res.status(400).json({ message: 'Business context required' });

  try {
    const { rows } = await pool.query(
      `SELECT title, sku, barcode, category, variant_size, variant_color,
              purchase_price, selling_price, mrp, current_stock, reorder_level,
              gst_rate, hsn_code, warehouse_id
         FROM src_erp_inventory_items
        WHERE business_id=$1 AND status != 'archived'
        ORDER BY title`,
      [businessId]
    );

    const colOrder = [
      'title', 'sku', 'barcode', 'category', 'variant_size', 'variant_color',
      'purchase_price', 'selling_price', 'mrp', 'current_stock', 'reorder_level',
      'gst_rate', 'hsn_code', 'warehouse_id',
    ];

    // Build rows in defined column order
    const data = rows.map((r) => {
      const obj = {};
      colOrder.forEach((col) => { obj[col] = r[col] ?? ''; });
      return obj;
    });

    const ws = xlsx.utils.json_to_sheet(data, { header: colOrder });
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Inventory');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const date = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Disposition', `attachment; filename=inventory-${date}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  } catch (err) {
    console.error('exportItems error:', err.message);
    return res.status(500).json({ message: 'Export failed' });
  }
};

module.exports = {
  listItems,
  createItem,
  updateItem,
  deleteItem,
  getMovements,
  adjustStock,
  importItems,
  exportItems,
};
