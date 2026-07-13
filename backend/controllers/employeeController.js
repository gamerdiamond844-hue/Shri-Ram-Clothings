'use strict';

const { pool, logAudit } = require('../config/db');
const bcrypt = require('bcryptjs');

const getScopedBusinessId = (req) => req.tenant?.business_id || req.user?.business_id || null;

// Default permission names per role
const ROLE_PERMISSIONS = {
  cashier:           ['erp.manage_pos', 'erp.manage_orders'],
  store_manager:     ['erp.manage_inventory', 'erp.manage_orders', 'erp.view_reports'],
  warehouse_manager: ['erp.manage_warehouse', 'erp.manage_inventory'],
  accountant:        ['erp.view_reports', 'erp.manage_finance'],
  employee:          ['erp.view_dashboard'],
  store_admin:       [
    'erp.manage_pos', 'erp.manage_orders', 'erp.manage_inventory',
    'erp.manage_users', 'erp.view_reports', 'erp.manage_settings',
  ],
  // business_owner gets all erp.* — handled below via wildcard
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/erp/employees
// List employees scoped to business_id
// ─────────────────────────────────────────────────────────────────────────────
const listEmployees = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const search   = (req.query.search || '').trim();
    const page     = Math.max(1, parseInt(req.query.page)  || 1);
    const limit    = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset   = (page - 1) * limit;
    const roleFilter = req.query.role || '';

    const params     = [businessId];
    const conditions = ["u.business_id = $1", "u.role NOT IN ('user', 'super_admin')"];

    if (search) {
      params.push(`%${search}%`);
      const idx = params.length;
      conditions.push(
        `(u.name ILIKE $${idx} OR u.email ILIKE $${idx} OR u.phone ILIKE $${idx} OR u.employee_code ILIKE $${idx})`
      );
    }

    if (roleFilter) {
      params.push(roleFilter);
      conditions.push(`u.role = $${params.length}`);
    }

    const where = conditions.join(' AND ');

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM src_users u WHERE ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit);
    params.push(offset);
    const dataResult = await pool.query(
      `SELECT
         u.id, u.name, u.email, u.phone, u.role,
         u.employee_code, u.is_banned, u.created_at,
         u.store_id,   s.name  AS store_name,
         u.warehouse_id, w.name AS warehouse_name
       FROM src_users u
       LEFT JOIN src_stores     s ON s.id = u.store_id
       LEFT JOIN src_warehouses w ON w.id = u.warehouse_id
       WHERE ${where}
       ORDER BY u.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.json({ employees: dataResult.rows, total, page, limit });
  } catch (err) {
    console.error('listEmployees error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/erp/employees
// Create a new employee (transactional)
// ─────────────────────────────────────────────────────────────────────────────
const createEmployee = async (req, res) => {
  const businessId = getScopedBusinessId(req);
  if (!businessId) return res.status(400).json({ message: 'Business context required' });

  const { name, email, phone, role, store_id, warehouse_id, employee_code, password } = req.body;

  if (!name || !name.trim()) return res.status(400).json({ message: 'Name is required' });
  if (!email || !email.trim()) return res.status(400).json({ message: 'Email is required' });
  if (!role || !role.trim()) return res.status(400).json({ message: 'Role is required' });

  // Generate random 8-char password if none provided
  const rawPassword = password && password.trim()
    ? password.trim()
    : Math.random().toString(36).slice(-8);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const hash = await bcrypt.hash(rawPassword, 10);

    // Check email uniqueness
    const existing = await client.query(
      'SELECT id FROM src_users WHERE email = $1',
      [email.trim().toLowerCase()]
    );
    if (existing.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: 'An account with this email already exists' });
    }

    // Insert user
    const insertResult = await client.query(
      `INSERT INTO src_users
         (name, email, password, phone, role, business_id, store_id, warehouse_id, employee_code, auth_provider)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'local')
       RETURNING id, name, email, phone, role, business_id, store_id, warehouse_id, employee_code, is_banned, created_at`,
      [
        name.trim(),
        email.trim().toLowerCase(),
        hash,
        phone  || null,
        role,
        businessId,
        store_id     || null,
        warehouse_id || null,
        employee_code || null,
      ]
    );
    const newUser = insertResult.rows[0];

    // Seed default role permissions
    let permNames = ROLE_PERMISSIONS[role] || [];

    // business_owner gets all erp.* permissions
    if (role === 'business_owner') {
      const allErp = await client.query(
        `SELECT id FROM src_permissions WHERE name LIKE 'erp.%'`
      );
      for (const row of allErp.rows) {
        await client.query(
          `INSERT INTO src_role_permissions (role, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [role, row.id]
        );
      }
    } else {
      for (const permName of permNames) {
        const permRow = await client.query(
          'SELECT id FROM src_permissions WHERE name = $1',
          [permName]
        );
        if (permRow.rows.length) {
          await client.query(
            `INSERT INTO src_role_permissions (role, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [role, permRow.rows[0].id]
          );
        }
      }
    }

    await logAudit(client, {
      adminId:    req.user?.id,
      action:     'create_employee',
      targetType: 'user',
      targetId:   newUser.id,
      details:    JSON.stringify({ name: newUser.name, email: newUser.email, role }),
    });

    await client.query('COMMIT');
    return res.status(201).json(newUser);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('createEmployee error:', err.message);
    return res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/erp/employees/:id
// Update an existing employee scoped to business_id
// ─────────────────────────────────────────────────────────────────────────────
const updateEmployee = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const { id } = req.params;
    const { name, phone, role, store_id, warehouse_id, employee_code, is_banned } = req.body;

    const existing = await pool.query(
      'SELECT id FROM src_users WHERE id = $1 AND business_id = $2',
      [id, businessId]
    );
    if (!existing.rows.length) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const result = await pool.query(
      `UPDATE src_users
       SET
         name          = COALESCE($1,  name),
         phone         = COALESCE($2,  phone),
         role          = COALESCE($3,  role),
         store_id      = COALESCE($4,  store_id),
         warehouse_id  = COALESCE($5,  warehouse_id),
         employee_code = COALESCE($6,  employee_code),
         is_banned     = COALESCE($7,  is_banned)
       WHERE id = $8 AND business_id = $9
       RETURNING id, name, email, phone, role, business_id, store_id, warehouse_id, employee_code, is_banned, created_at`,
      [
        name          != null ? (name.trim()          || null) : null,
        phone         != null ? (phone.trim()         || null) : null,
        role          != null ? (role                 || null) : null,
        store_id      !== undefined ? (store_id       || null) : null,
        warehouse_id  !== undefined ? (warehouse_id   || null) : null,
        employee_code != null ? (employee_code.trim() || null) : null,
        is_banned     !== undefined ? Boolean(is_banned) : null,
        id,
        businessId,
      ]
    );

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('updateEmployee error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

module.exports = { listEmployees, createEmployee, updateEmployee };
