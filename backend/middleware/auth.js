const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const auth = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload?.id) return res.status(401).json({ message: 'Invalid token' });

    const userRes = await pool.query(
      `SELECT id, name, email, role, avatar_url, phone, business_id, store_id, warehouse_id, is_banned
       FROM src_users WHERE id=$1`,
      [payload.id]
    );

    if (!userRes.rows.length) return res.status(401).json({ message: 'User not found' });
    const user = userRes.rows[0];
    if (user.is_banned) return res.status(403).json({ message: 'Account has been banned' });

    const permRes = await pool.query(
      `SELECT p.name
       FROM src_permissions p
       JOIN src_role_permissions rp ON rp.permission_id = p.id
       WHERE rp.role = $1`,
      [user.role]
    );

    // For super_admin/admin with no business_id, auto-resolve to the first active business
    if (!user.business_id && (user.role === 'super_admin' || user.role === 'admin')) {
      try {
        const bizRes = await pool.query(
          `SELECT id FROM src_businesses WHERE is_active = TRUE ORDER BY id ASC LIMIT 1`
        );
        if (bizRes.rows.length) {
          user.business_id = bizRes.rows[0].id;
        }
      } catch (e) {
        // silently ignore — business may not exist yet
      }
    }

    req.user = {
      ...user,
      permissions: permRes.rows.map(r => r.name),
    };
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    res.status(401).json({ message: 'Invalid token' });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role))
    return res.status(403).json({ message: 'Access denied' });
  next();
};

const requirePermission = (permission) => (req, res, next) => {
  // super_admin and admin bypass all permission checks
  if (req.user?.role === 'super_admin' || req.user?.role === 'admin') return next();
  if (!req.user || !req.user.permissions || !req.user.permissions.includes(permission)) {
    return res.status(403).json({ message: 'Permission denied' });
  }
  next();
};

const requireAnyPermission = (...permissions) => (req, res, next) => {
  // super_admin and admin bypass all permission checks
  if (req.user?.role === 'super_admin' || req.user?.role === 'admin') return next();
  const userPermissions = req.user?.permissions || [];
  if (!permissions.length || permissions.some((permission) => userPermissions.includes(permission))) {
    return next();
  }
  return res.status(403).json({ message: 'Permission denied' });
};

module.exports = { auth, requireRole, requirePermission, requireAnyPermission };
