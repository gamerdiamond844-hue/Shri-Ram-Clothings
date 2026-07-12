const { pool } = require('../config/db');

const buildTenantFilter = (tenant) => {
  if (!tenant?.business_id) return { clause: '', values: [] };
  return { clause: 'AND business_id = $1', values: [tenant.business_id] };
};

const getDashboard = async (req, res) => {
  try {
    const tenantFilter = buildTenantFilter(req.tenant);
    const [sales, orders, inventory, customers] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(total) FILTER (WHERE payment_status='paid'),0) AS total_revenue
         FROM src_orders
         WHERE created_at >= NOW() - INTERVAL '30 days' ${tenantFilter.clause}`,
        tenantFilter.values
      ),
      pool.query(
        `SELECT COUNT(*) AS order_count
         FROM src_orders
         WHERE created_at >= NOW() - INTERVAL '30 days' ${tenantFilter.clause}`,
        tenantFilter.values
      ),
      pool.query(
        `SELECT COUNT(*) AS active_products
         FROM src_products
         WHERE deleted_at IS NULL ${tenantFilter.clause}`,
        tenantFilter.values
      ),
      pool.query(
        `SELECT COUNT(*) AS active_customers
         FROM src_users
         WHERE role NOT IN ('admin','super_admin') ${tenantFilter.clause}`,
        tenantFilter.values
      ),
    ]);

    res.json({
      tenant: req.tenant,
      kpis: {
        revenue_30d: parseFloat(sales.rows[0].total_revenue || 0),
        orders_30d: parseInt(orders.rows[0].order_count || 0),
        active_products: parseInt(inventory.rows[0].active_products || 0),
        active_customers: parseInt(customers.rows[0].active_customers || 0),
      },
      modules: [
        'Dashboard', 'POS', 'Inventory', 'Warehouse', 'Customers', 'Suppliers', 'Purchases', 'Sales', 'Reports', 'Employees', 'Stores', 'Settings', 'Notifications', 'Super Admin',
      ],
      timestamp: new Date(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getModules = async (_, res) => {
  res.json({
    modules: [
      { key: 'dashboard', name: 'Dashboard' },
      { key: 'pos', name: 'Billing POS' },
      { key: 'inventory', name: 'Inventory' },
      { key: 'warehouses', name: 'Warehouse' },
      { key: 'customers', name: 'Customer CRM' },
      { key: 'suppliers', name: 'Supplier Management' },
      { key: 'purchases', name: 'Purchase' },
      { key: 'sales', name: 'Sales' },
      { key: 'reports', name: 'Reports' },
      { key: 'employees', name: 'Employees' },
      { key: 'stores', name: 'Stores' },
      { key: 'settings', name: 'Settings' },
    ],
  });
};

const getSettings = async (req, res) => {
  try {
    const [globalSettingsRes, businessRes] = await Promise.all([
      pool.query('SELECT key, value FROM src_settings'),
      req.tenant?.business_id
        ? pool.query('SELECT settings FROM src_businesses WHERE id=$1', [req.tenant.business_id])
        : Promise.resolve({ rows: [] }),
    ]);

    const settings = globalSettingsRes.rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});

    const businessSettings = (businessRes.rows[0]?.settings) || {};
    res.json({ settings, business_settings: businessSettings, tenant: req.tenant });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getTenantInfo = async (req, res) => {
  try {
    res.json({
      tenant: req.tenant,
      modules: [
        { key: 'dashboard', name: 'Dashboard' },
        { key: 'pos', name: 'Billing POS' },
        { key: 'inventory', name: 'Inventory' },
        { key: 'warehouses', name: 'Warehouse' },
        { key: 'customers', name: 'Customer CRM' },
        { key: 'suppliers', name: 'Supplier Management' },
        { key: 'purchases', name: 'Purchase' },
        { key: 'sales', name: 'Sales' },
        { key: 'reports', name: 'Reports' },
        { key: 'employees', name: 'Employees' },
        { key: 'stores', name: 'Stores' },
        { key: 'settings', name: 'Settings' },
      ],
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const listBusinesses = async (_, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, slug, gst_number, phone, email, address, currency, timezone, is_active FROM src_businesses ORDER BY created_at DESC`
    );
    res.json({ businesses: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const listStores = async (_, res) => {
  try {
    const result = await pool.query(
      `SELECT s.id, s.name, s.slug, s.store_code, s.address, s.phone, s.email, s.business_id, s.is_active,
              b.name AS business_name
       FROM src_stores s
       LEFT JOIN src_businesses b ON b.id = s.business_id
       ORDER BY s.created_at DESC`
    );
    res.json({ stores: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const listWarehouses = async (_, res) => {
  try {
    const result = await pool.query(
      `SELECT w.id, w.name, w.address, w.phone, w.business_id, w.is_active,
              b.name AS business_name
       FROM src_warehouses w
       LEFT JOIN src_businesses b ON b.id = w.business_id
       ORDER BY w.created_at DESC`
    );
    res.json({ warehouses: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getDashboard, getModules, getSettings, getTenantInfo, listBusinesses, listStores, listWarehouses };
