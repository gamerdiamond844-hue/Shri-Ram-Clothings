'use strict';

const { pool, logAudit } = require('../config/db');
const XLSX = require('xlsx');

const getScopedBusinessId = (req) => req.tenant?.business_id || req.user?.business_id || null;

const buildFilters = (query, businessId) => {
  const { category, from, to, payment_mode } = query;
  const params = [businessId];
  const conditions = ['e.business_id = $1'];

  if (category) { params.push(category); conditions.push(`e.category = $${params.length}`); }
  if (from)     { params.push(from);     conditions.push(`e.expense_date >= $${params.length}::date`); }
  if (to)       { params.push(to);       conditions.push(`e.expense_date <= $${params.length}::date`); }
  if (payment_mode) { params.push(payment_mode); conditions.push(`e.payment_mode = $${params.length}`); }

  return { params, conditions };
};

// GET /api/erp/expenses
const listExpenses = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const { params, conditions } = buildFilters(req.query, businessId);
    const where = conditions.join(' AND ');

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM src_erp_expenses e WHERE ${where}`, params
    );
    const total = parseInt(countRes.rows[0].count);

    params.push(limit, offset);
    const dataRes = await pool.query(
      `SELECT e.*, u.name AS created_by_name
       FROM src_erp_expenses e
       LEFT JOIN src_users u ON u.id = e.created_by
       WHERE ${where}
       ORDER BY e.expense_date DESC, e.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json({ expenses: dataRes.rows, total, page, limit });
  } catch (err) {
    console.error('listExpenses:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

// POST /api/erp/expenses
const createExpense = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const { category, title, amount, payment_mode, expense_date, notes } = req.body;
    if (!category || !title || !amount || !expense_date)
      return res.status(400).json({ message: 'category, title, amount, expense_date are required' });
    if (Number(amount) <= 0)
      return res.status(422).json({ message: 'Amount must be greater than 0' });

    const result = await pool.query(
      `INSERT INTO src_erp_expenses (business_id, category, title, amount, payment_mode, expense_date, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [businessId, category, title, Number(amount), payment_mode || 'cash', expense_date, notes || null, req.user?.id || null]
    );

    await logAudit(pool, {
      adminId: req.user?.id, action: 'create_expense', targetType: 'expense',
      targetId: result.rows[0].id,
      details: `${category}: ${title} — ₹${amount}`,
    });

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createExpense:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

// PUT /api/erp/expenses/:id
const updateExpense = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });
    const { id } = req.params;
    const { category, title, amount, payment_mode, expense_date, notes } = req.body;

    if (amount !== undefined && Number(amount) <= 0)
      return res.status(422).json({ message: 'Amount must be greater than 0' });

    const result = await pool.query(
      `UPDATE src_erp_expenses SET
         category     = COALESCE($1, category),
         title        = COALESCE($2, title),
         amount       = COALESCE($3, amount),
         payment_mode = COALESCE($4, payment_mode),
         expense_date = COALESCE($5::date, expense_date),
         notes        = COALESCE($6, notes)
       WHERE id = $7 AND business_id = $8 RETURNING *`,
      [category||null, title||null, amount ? Number(amount) : null, payment_mode||null,
       expense_date||null, notes||null, id, businessId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Expense not found' });
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('updateExpense:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

// DELETE /api/erp/expenses/:id
const deleteExpense = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM src_erp_expenses WHERE id = $1 AND business_id = $2 RETURNING id`,
      [id, businessId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Expense not found' });
    return res.json({ message: 'Expense deleted' });
  } catch (err) {
    console.error('deleteExpense:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/erp/expenses/export
const exportExpenses = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const { params, conditions } = buildFilters(req.query, businessId);
    const where = conditions.join(' AND ');

    const dataRes = await pool.query(
      `SELECT e.expense_date, e.category, e.title, e.amount, e.payment_mode, e.notes
       FROM src_erp_expenses e WHERE ${where}
       ORDER BY e.expense_date DESC`, params
    );

    const headers = ['Date', 'Category', 'Title', 'Amount (₹)', 'Payment Mode', 'Notes'];
    const rows = dataRes.rows.map(r => [
      r.expense_date ? new Date(r.expense_date).toLocaleDateString('en-IN') : '',
      r.category, r.title, parseFloat(r.amount), r.payment_mode || '', r.notes || '',
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="expenses-${date}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buf);
  } catch (err) {
    console.error('exportExpenses:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { listExpenses, createExpense, updateExpense, deleteExpense, exportExpenses };
