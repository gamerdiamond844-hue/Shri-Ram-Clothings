'use strict';

const { pool, logAudit } = require('../config/db');
const XLSX = require('xlsx');

const getScopedBusinessId = (req) => req.tenant?.business_id || req.user?.business_id || null;

// GET /api/erp/payroll?month=&year=
const listPayroll = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const now = new Date();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);
    const year  = parseInt(req.query.year)  || now.getFullYear();

    const result = await pool.query(
      `SELECT p.id, p.employee_id, p.month, p.year,
              p.basic_salary, p.allowances, p.deductions, p.bonus, p.net_salary,
              p.payment_mode, p.payment_date, p.status, p.notes,
              p.created_at, p.updated_at,
              u.name AS employee_name, u.employee_code, u.role AS employee_role,
              s.name AS store_name
         FROM src_erp_payroll p
         JOIN src_users u ON u.id = p.employee_id
         LEFT JOIN src_stores s ON s.id = u.store_id
        WHERE p.business_id = $1 AND p.month = $2 AND p.year = $3
        ORDER BY u.name ASC`,
      [businessId, month, year]
    );

    // Summary
    const summary = result.rows.reduce((acc, r) => {
      acc.total_payable += Number(r.net_salary || 0);
      acc.total_paid    += r.status === 'paid' ? Number(r.net_salary || 0) : 0;
      acc.total_pending += r.status === 'pending' ? Number(r.net_salary || 0) : 0;
      acc.count++;
      return acc;
    }, { total_payable: 0, total_paid: 0, total_pending: 0, count: 0 });

    res.json({ payroll: result.rows, summary, month, year });
  } catch (err) {
    console.error('listPayroll error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// POST /api/erp/payroll — create or update payroll record
const upsertPayroll = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const {
      employee_id, month, year,
      basic_salary = 0, allowances = 0, deductions = 0, bonus = 0,
      payment_mode = 'bank', payment_date, notes,
    } = req.body;

    if (!employee_id || !month || !year) {
      return res.status(400).json({ message: 'employee_id, month, and year are required' });
    }

    const net_salary = Number(basic_salary) + Number(allowances) + Number(bonus) - Number(deductions);

    const result = await pool.query(
      `INSERT INTO src_erp_payroll
         (business_id, employee_id, month, year, basic_salary, allowances, deductions, bonus,
          net_salary, payment_mode, payment_date, status, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending',$12,$13)
       ON CONFLICT (business_id, employee_id, month, year)
       DO UPDATE SET
         basic_salary = EXCLUDED.basic_salary,
         allowances   = EXCLUDED.allowances,
         deductions   = EXCLUDED.deductions,
         bonus        = EXCLUDED.bonus,
         net_salary   = EXCLUDED.net_salary,
         payment_mode = EXCLUDED.payment_mode,
         payment_date = EXCLUDED.payment_date,
         notes        = EXCLUDED.notes,
         updated_at   = NOW()
       RETURNING *`,
      [businessId, employee_id, month, year,
       Number(basic_salary), Number(allowances), Number(deductions), Number(bonus),
       net_salary, payment_mode, payment_date || null, notes || null, req.user?.id]
    );

    await logAudit(pool, {
      adminId: req.user?.id, action: 'upsert_payroll',
      targetType: 'payroll', targetId: result.rows[0].id,
      details: `employee_id=${employee_id} month=${month}/${year} net=${net_salary}`,
    });

    res.status(201).json({ payroll: result.rows[0] });
  } catch (err) {
    console.error('upsertPayroll error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// PATCH /api/erp/payroll/:id/pay — mark as paid
const markPaid = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const { id } = req.params;
    const { payment_date, payment_mode } = req.body;

    const result = await pool.query(
      `UPDATE src_erp_payroll
          SET status = 'paid',
              payment_date = COALESCE($1, CURRENT_DATE),
              payment_mode = COALESCE($2, payment_mode),
              updated_at   = NOW()
        WHERE id = $3 AND business_id = $4
        RETURNING *`,
      [payment_date || null, payment_mode || null, id, businessId]
    );

    if (!result.rows.length) return res.status(404).json({ message: 'Payroll record not found' });

    await logAudit(pool, {
      adminId: req.user?.id, action: 'mark_payroll_paid',
      targetType: 'payroll', targetId: id,
    });

    res.json({ payroll: result.rows[0] });
  } catch (err) {
    console.error('markPaid error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

// DELETE /api/erp/payroll/:id
const deletePayroll = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM src_erp_payroll WHERE id = $1 AND business_id = $2 RETURNING id',
      [id, businessId]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Payroll record not found' });
    res.json({ message: 'Payroll record deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET /api/erp/payroll/export?month=&year=
const exportPayroll = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const now = new Date();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);
    const year  = parseInt(req.query.year)  || now.getFullYear();

    const result = await pool.query(
      `SELECT u.name AS employee_name, u.employee_code, u.role,
              p.month, p.year, p.basic_salary, p.allowances, p.deductions, p.bonus,
              p.net_salary, p.payment_mode, p.payment_date, p.status, p.notes
         FROM src_erp_payroll p
         JOIN src_users u ON u.id = p.employee_id
        WHERE p.business_id = $1 AND p.month = $2 AND p.year = $3
        ORDER BY u.name ASC`,
      [businessId, month, year]
    );

    const headers = ['Employee', 'Code', 'Role', 'Month', 'Year', 'Basic', 'Allowances', 'Deductions', 'Bonus', 'Net Salary', 'Payment Mode', 'Payment Date', 'Status', 'Notes'];
    const rows = result.rows.map(r => [
      r.employee_name, r.employee_code || '', r.role,
      r.month, r.year,
      Number(r.basic_salary), Number(r.allowances), Number(r.deductions), Number(r.bonus), Number(r.net_salary),
      r.payment_mode, r.payment_date ? String(r.payment_date).slice(0, 10) : '',
      r.status, r.notes || '',
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Payroll-${year}-${month}`);
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename="payroll-${year}-${month}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buf);
  } catch (err) {
    console.error('exportPayroll error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

module.exports = { listPayroll, upsertPayroll, markPaid, deletePayroll, exportPayroll };
