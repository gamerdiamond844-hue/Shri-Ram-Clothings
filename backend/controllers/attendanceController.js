'use strict';

const { pool } = require('../config/db');
const XLSX = require('xlsx');

const getScopedBusinessId = (req) => req.tenant?.business_id || req.user?.business_id || null;
const isAdminRole = (req) => req.user?.role === 'super_admin' || req.user?.role === 'admin';

// GET /api/erp/attendance?year=2025&month=1
const getMonthlyGrid = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) {
      if (!isAdminRole(req)) return res.status(400).json({ message: 'Business context required' });
    }

    const now = new Date();
    const year  = parseInt(req.query.year)  || now.getFullYear();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);

    const firstDay = `${year}-${String(month).padStart(2,'0')}-01`;
    const lastDay  = new Date(year, month, 0);
    const lastDayStr = `${year}-${String(month).padStart(2,'0')}-${String(lastDay.getDate()).padStart(2,'0')}`;

    // Get employees for this business (or all if admin with no business filter)
    const empRes = businessId
      ? await pool.query(
          `SELECT id, name, role, employee_code FROM src_users
           WHERE business_id = $1 AND role NOT IN ('user','super_admin')
           ORDER BY name ASC`,
          [businessId]
        )
      : await pool.query(
          `SELECT id, name, role, employee_code FROM src_users
           WHERE 1=1 AND role NOT IN ('user','super_admin')
           ORDER BY name ASC`
        );

    // Get attendance records for the month
    const attRes = businessId
      ? await pool.query(
          `SELECT employee_id, attendance_date, status, check_in, check_out, notes
           FROM src_erp_attendance
           WHERE business_id = $1
             AND attendance_date BETWEEN $2 AND $3
           ORDER BY attendance_date ASC`,
          [businessId, firstDay, lastDayStr]
        )
      : await pool.query(
          `SELECT employee_id, attendance_date, status, check_in, check_out, notes
           FROM src_erp_attendance
           WHERE 1=1
             AND attendance_date BETWEEN $1 AND $2
           ORDER BY attendance_date ASC`,
          [firstDay, lastDayStr]
        );

    // Build a map: employeeId -> { date -> record }
    const attMap = {};
    for (const row of attRes.rows) {
      const eid = row.employee_id;
      const d   = row.attendance_date instanceof Date
        ? row.attendance_date.toISOString().slice(0, 10)
        : String(row.attendance_date).slice(0, 10);
      if (!attMap[eid]) attMap[eid] = {};
      attMap[eid][d] = row;
    }

    // Days in month
    const daysInMonth = lastDay.getDate();

    return res.json({
      year, month, daysInMonth,
      employees: empRes.rows,
      attendance: attMap,
    });
  } catch (err) {
    console.error('getMonthlyGrid:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

// POST /api/erp/attendance — upsert on (employee_id, attendance_date)
const markAttendance = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) {
      if (!isAdminRole(req)) return res.status(400).json({ message: 'Business context required' });
    }

    const { employee_id, attendance_date, status, check_in, check_out, notes } = req.body;
    if (!employee_id || !attendance_date) return res.status(400).json({ message: 'employee_id and attendance_date are required' });

    // Normalize check_in/check_out — accept "HH:MM" or full timestamp
    const normalizeTime = (val) => {
      if (!val) return null;
      if (/^\d{1,2}:\d{2}$/.test(val)) return `${val}:00`;
      if (/^\d{1,2}:\d{2}:\d{2}$/.test(val)) return val;
      if (val.includes('T')) return val.split('T')[1].slice(0, 8);
      return val;
    };

    const result = await pool.query(
      `INSERT INTO src_erp_attendance (business_id, employee_id, attendance_date, status, check_in, check_out, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (employee_id, attendance_date)
       DO UPDATE SET status=$4, check_in=$5, check_out=$6, notes=$7
       RETURNING *`,
      [businessId, employee_id, attendance_date, status || 'present',
       normalizeTime(check_in), normalizeTime(check_out), notes || null]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('markAttendance:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

// GET /api/erp/attendance/export?year=&month=
const exportAttendance = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const now   = new Date();
    const year  = parseInt(req.query.year)  || now.getFullYear();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);

    const firstDay = `${year}-${String(month).padStart(2,'0')}-01`;
    const lastDay  = new Date(year, month, 0);
    const lastDayStr = `${year}-${String(month).padStart(2,'0')}-${String(lastDay.getDate()).padStart(2,'0')}`;

    const result = await pool.query(
      `SELECT u.name, u.employee_code, u.role,
              a.attendance_date, a.status, a.check_in, a.check_out, a.notes
       FROM src_erp_attendance a
       JOIN src_users u ON u.id = a.employee_id
       WHERE a.business_id = $1 AND a.attendance_date BETWEEN $2 AND $3
       ORDER BY u.name, a.attendance_date`,
      [businessId, firstDay, lastDayStr]
    );

    const headers = ['Employee', 'Code', 'Role', 'Date', 'Status', 'Check In', 'Check Out', 'Notes'];
    const rows = result.rows.map(r => [
      r.name, r.employee_code || '', r.role,
      r.attendance_date instanceof Date ? r.attendance_date.toISOString().slice(0, 10) : String(r.attendance_date).slice(0, 10),
      r.status,
      r.check_in  ? String(r.check_in).slice(0, 5)  : '',
      r.check_out ? String(r.check_out).slice(0, 5) : '',
      r.notes || '',
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Attendance-${year}-${month}`);
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename="attendance-${year}-${month}.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buf);
  } catch (err) {
    console.error('exportAttendance:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { getMonthlyGrid, markAttendance, exportAttendance };
