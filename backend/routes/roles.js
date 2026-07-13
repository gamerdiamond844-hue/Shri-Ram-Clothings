'use strict';

const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const { pool } = require('../config/db');

const roleGuard = [auth, requireRole('super_admin', 'business_owner', 'store_admin')];

// GET /api/erp/roles — list all permissions grouped by module
router.get('/permissions', ...roleGuard, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, group_name FROM src_permissions ORDER BY group_name, name`
    );
    res.json({ permissions: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/erp/roles/:role — get permissions for a role
router.get('/:role', ...roleGuard, async (req, res) => {
  try {
    const { role } = req.params;
    const result = await pool.query(
      `SELECT p.id, p.name, p.description, p.group_name
       FROM src_role_permissions rp
       JOIN src_permissions p ON p.id = rp.permission_id
       WHERE rp.role = $1`,
      [role]
    );
    res.json({ role, permissions: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/erp/roles/:role — update permissions for a role
router.put('/:role', ...roleGuard, async (req, res) => {
  const { role } = req.params;
  const { permission_ids } = req.body; // array of permission IDs to assign

  if (!Array.isArray(permission_ids))
    return res.status(400).json({ message: 'permission_ids must be an array' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM src_role_permissions WHERE role = $1', [role]);
    for (const pid of permission_ids) {
      await client.query(
        'INSERT INTO src_role_permissions (role, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [role, pid]
      );
    }
    await client.query('COMMIT');
    res.json({ message: `Permissions updated for role: ${role}` });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
