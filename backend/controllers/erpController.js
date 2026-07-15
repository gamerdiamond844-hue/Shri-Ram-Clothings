const { pool, logAudit } = require('../config/db');

const ERP_GROUPS = [
  {
    key: 'retail-erp',
    label: 'Retail ERP',
    items: [
      { key: 'dashboard', label: 'Dashboard', permissions: ['erp.view_dashboard'] },
      { key: 'erp', label: 'Retail ERP', permissions: ['erp.view_dashboard'] },
      { key: 'pos', label: 'POS Billing', permissions: ['erp.manage_pos', 'erp.manage_orders', 'erp.manage_finance'] },
      { key: 'inventory', label: 'Inventory', permissions: ['erp.manage_inventory'] },
      { key: 'products', label: 'Products', permissions: ['erp.manage_inventory'] },
      { key: 'categories', label: 'Categories', permissions: ['erp.manage_inventory'] },
      { key: 'brands', label: 'Brands', permissions: ['erp.manage_inventory'] },
      { key: 'customers', label: 'Customers', permissions: ['erp.manage_orders', 'erp.manage_users'] },
      { key: 'suppliers', label: 'Suppliers', permissions: ['erp.manage_suppliers'] },
      { key: 'purchases', label: 'Purchases', permissions: ['erp.manage_suppliers'] },
      { key: 'sales', label: 'Sales', permissions: ['erp.manage_orders'] },
      { key: 'returns', label: 'Returns', permissions: ['erp.manage_orders'] },
      { key: 'warehouse', label: 'Warehouse', permissions: ['erp.manage_warehouse', 'erp.manage_inventory'] },
      { key: 'reports', label: 'Reports', permissions: ['erp.view_reports'] },
      { key: 'employees', label: 'Employees', permissions: ['erp.manage_users'] },
      { key: 'attendance', label: 'Attendance', permissions: ['erp.manage_users'] },
      { key: 'expenses', label: 'Expenses', permissions: ['erp.manage_finance'] },
      { key: 'notifications', label: 'Notifications', permissions: ['erp.manage_notifications'] },
      { key: 'settings', label: 'Settings', permissions: ['erp.manage_settings'] },
      { key: 'business-settings', label: 'Business Settings', permissions: ['erp.manage_settings'] },
      { key: 'store-management', label: 'Store Management', permissions: ['erp.manage_settings'] },
      { key: 'user-management', label: 'User Management', permissions: ['erp.manage_users'] },
      { key: 'role-management', label: 'Role Management', roles: ['super_admin', 'business_owner', 'store_admin'] },
      { key: 'audit-logs', label: 'Audit Logs', permissions: ['erp.view_audit_logs'] },
      { key: 'super-admin', label: 'Super Admin', roles: ['super_admin'] },
    ],
  },
  {
    key: 'commerce-admin',
    label: 'Commerce Admin',
    items: [
      { key: 'homepage', label: 'Homepage', roles: ['admin', 'super_admin'] },
      { key: 'delivery', label: 'Delivery', roles: ['admin', 'super_admin'] },
      { key: 'queries', label: 'Queries', roles: ['admin', 'super_admin'] },
      { key: 'reviews', label: 'Reviews', roles: ['admin', 'super_admin'] },
      { key: 'coupons', label: 'Coupons', roles: ['admin', 'super_admin'] },
      { key: 'cloud', label: 'Cloud Vault', roles: ['admin', 'super_admin'] },
    ],
  },
];

const parseMoney = (value) => Number.parseFloat(value || 0);
const parseCount = (value) => Number.parseInt(value || 0, 10);

const slugify = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 180);

const canAccessModule = (user, module) => {
  if (!user || !module) return false;
  if (user.role === 'super_admin') return true;
  if (module.roles?.length && !module.roles.includes(user.role)) return false;
  if (!module.permissions?.length) return true;
  return module.permissions.some((permission) => (user.permissions || []).includes(permission));
};

const getVisibleModuleGroups = (user) =>
  ERP_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessModule(user, item)),
    }))
    .filter((group) => group.items.length > 0);

const getScopedBusinessId = (req) => req.tenant?.business_id || req.user?.business_id || null;
const getScopedStoreId = (req) => {
  if (req.tenant?.store_id) return req.tenant.store_id;
  if (['store_admin', 'store_manager', 'cashier', 'employee'].includes(req.user?.role)) {
    return req.user?.store_id || null;
  }
  return null;
};

// For super_admin with no business context, fetch the first business from DB
const getEffectiveBusinessId = async (req) => {
  const bid = getScopedBusinessId(req);
  if (bid) return bid;
  // super_admin without a business_id — use first available business
  if (req.user?.role === 'super_admin') {
    try {
      const result = await pool.query('SELECT id FROM src_businesses WHERE is_active = TRUE ORDER BY id ASC LIMIT 1');
      return result.rows[0]?.id || null;
    } catch { return null; }
  }
  return null;
};

const buildTenantFilter = (req, column = 'business_id', startIndex = 1) => {
  const businessId = getScopedBusinessId(req);
  if (!businessId) return { clause: '', values: [] };
  return { clause: `AND ${column} = $${startIndex}`, values: [businessId] };
};

const buildTenantWhere = (req, column = 'business_id', startIndex = 1) => {
  const businessId = getScopedBusinessId(req);
  if (!businessId) return { clause: '', values: [] };
  return { clause: `WHERE ${column} = $${startIndex}`, values: [businessId] };
};

const getDashboardData = async (req) => {
  const orderScope = buildTenantFilter(req, 'business_id', 1);
  const erpScope = buildTenantFilter(req, 'business_id', 1);
  const expenseScope = buildTenantFilter(req, 'business_id', 1);
  const movementScope = buildTenantFilter(req, 'm.business_id', 1);

  const [commerceMetrics, erpMetrics, expenseMetrics, topProducts, topCustomers, paymentMix, recentMovements] = await Promise.all([
    pool.query(
      `SELECT
         COALESCE(SUM(total) FILTER (WHERE DATE(created_at) = CURRENT_DATE AND payment_status = 'paid'), 0) AS revenue_today,
         COALESCE(SUM(total) FILTER (WHERE created_at >= DATE_TRUNC('week', NOW()) AND payment_status = 'paid'), 0) AS revenue_week,
         COALESCE(SUM(total) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW()) AND payment_status = 'paid'), 0) AS revenue_month,
         COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) AS orders_today,
         COUNT(*) FILTER (WHERE payment_status IN ('pending')) AS pending_payments
       FROM src_orders
       WHERE 1=1 ${orderScope.clause}`,
      orderScope.values
    ),
    pool.query(
      `SELECT
         COALESCE(SUM(total) FILTER (WHERE DATE(created_at) = CURRENT_DATE AND status = 'completed'), 0) AS pos_sales_today,
         COALESCE(SUM(total) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW()) AND status = 'completed'), 0) AS pos_sales_month,
         COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE AND status = 'completed') AS bills_today,
         COUNT(DISTINCT cashier_id) FILTER (WHERE DATE(created_at) = CURRENT_DATE AND cashier_id IS NOT NULL) AS active_cashiers,
         COUNT(*) FILTER (WHERE status = 'hold') AS held_bills,
         COUNT(*) FILTER (WHERE payment_status IN ('pending','partial')) AS pending_pos_payments
       FROM src_erp_sales
       WHERE 1=1 ${erpScope.clause}`,
      erpScope.values
    ),
    pool.query(
      `SELECT COALESCE(SUM(amount) FILTER (WHERE expense_date >= DATE_TRUNC('month', CURRENT_DATE)), 0) AS expenses_month
       FROM src_erp_expenses
       WHERE 1=1 ${expenseScope.clause}`,
      expenseScope.values
    ),
    pool.query(
      `SELECT COALESCE(i.title, si.title) AS product_name, SUM(si.quantity) AS quantity_sold, SUM(si.line_total) AS revenue
       FROM src_erp_sale_items si
       JOIN src_erp_sales s ON s.id = si.sale_id
       LEFT JOIN src_erp_inventory_items i ON i.id = si.inventory_item_id
       WHERE s.status = 'completed' ${erpScope.clause ? `AND s.business_id = $1` : ''}
       GROUP BY COALESCE(i.title, si.title)
       ORDER BY revenue DESC
       LIMIT 5`,
      erpScope.values
    ),
    pool.query(
      `SELECT c.name, COUNT(s.id) AS bills, COALESCE(SUM(s.total), 0) AS revenue
       FROM src_erp_sales s
       JOIN src_erp_customers c ON c.id = s.customer_id
       WHERE s.status = 'completed' ${erpScope.clause ? `AND s.business_id = $1` : ''}
       GROUP BY c.name
       ORDER BY revenue DESC
       LIMIT 5`,
      erpScope.values
    ),
    pool.query(
      `SELECT payment_method, COUNT(*) AS bills, COALESCE(SUM(total), 0) AS amount
       FROM src_erp_sales
       WHERE status = 'completed' ${erpScope.clause ? `AND business_id = $1` : ''}
       GROUP BY payment_method
       ORDER BY amount DESC`,
      erpScope.values
    ),
    pool.query(
      `SELECT m.movement_type, m.quantity, m.balance_after, m.reference_type, m.created_at, i.title, i.sku
       FROM src_erp_inventory_movements m
       JOIN src_erp_inventory_items i ON i.id = m.inventory_item_id
       WHERE 1=1 ${movementScope.clause}
       ORDER BY m.created_at DESC
       LIMIT 6`,
      movementScope.values
    ),
  ]);

  const inventoryValueRes = await pool.query(
    `SELECT
       COUNT(*) AS active_products,
       COALESCE(SUM(current_stock * purchase_price), 0) AS inventory_value,
       COUNT(*) FILTER (WHERE current_stock <= reorder_level) AS low_stock_count,
       COUNT(*) FILTER (WHERE current_stock = 0) AS out_of_stock_count
     FROM src_erp_inventory_items
     WHERE 1=1 ${erpScope.clause}`,
    erpScope.values
  );

  const commerce = commerceMetrics.rows[0] || {};
  const retail = erpMetrics.rows[0] || {};
  const expense = expenseMetrics.rows[0] || {};
  const inventory = inventoryValueRes.rows[0] || {};

  const revenueToday = parseMoney(commerce.revenue_today) + parseMoney(retail.pos_sales_today);
  const revenueMonth = parseMoney(commerce.revenue_month) + parseMoney(retail.pos_sales_month);

  return {
    kpis: {
      today_sales: revenueToday,
      weekly_sales: parseMoney(commerce.revenue_week),
      monthly_sales: revenueMonth,
      revenue_30d: revenueMonth,
      profit_estimate: revenueMonth - parseMoney(expense.expenses_month),
      expenses_month: parseMoney(expense.expenses_month),
      inventory_value: parseMoney(inventory.inventory_value),
      pending_payments: parseCount(commerce.pending_payments) + parseCount(retail.pending_pos_payments),
      bills_today: parseCount(retail.bills_today),
      orders_today: parseCount(commerce.orders_today),
      active_products: parseCount(inventory.active_products),
      low_stock_count: parseCount(inventory.low_stock_count),
      out_of_stock_count: parseCount(inventory.out_of_stock_count),
      active_cashiers: parseCount(retail.active_cashiers),
      held_bills: parseCount(retail.held_bills),
    },
    top_products: topProducts.rows.map((row) => ({
      name: row.product_name,
      quantity_sold: parseCount(row.quantity_sold),
      revenue: parseMoney(row.revenue),
    })),
    top_customers: topCustomers.rows.map((row) => ({
      name: row.name,
      bills: parseCount(row.bills),
      revenue: parseMoney(row.revenue),
    })),
    payment_mix: paymentMix.rows.map((row) => ({
      payment_method: row.payment_method,
      bills: parseCount(row.bills),
      amount: parseMoney(row.amount),
    })),
    recent_movements: recentMovements.rows.map((row) => ({
      ...row,
      quantity: parseCount(row.quantity),
      balance_after: parseCount(row.balance_after),
    })),
  };
};

const getDashboard = async (req, res) => {
  try {
    const dashboard = await getDashboardData(req);
    res.json({
      tenant: req.tenant,
      ...dashboard,
      modules: [
        'Dashboard', 'POS', 'Inventory', 'Warehouse', 'Customers', 'Suppliers', 'Purchases', 'Sales', 'Reports', 'Employees', 'Attendance', 'Expenses', 'Settings', 'Audit Logs',
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
      { key: 'warehouse', name: 'Warehouse' },
      { key: 'customers', name: 'Customer CRM' },
      { key: 'suppliers', name: 'Supplier Management' },
      { key: 'purchases', name: 'Purchase' },
      { key: 'sales', name: 'Sales' },
      { key: 'reports', name: 'Reports' },
      { key: 'employees', name: 'Employees' },
      { key: 'attendance', name: 'Attendance' },
      { key: 'settings', name: 'Settings' },
      { key: 'audit-logs', name: 'Audit Logs' },
    ],
  });
};

const getBootstrap = async (req, res) => {
  try {
    const dashboard = await getDashboardData(req);
    res.json({
      tenant: req.tenant,
      user: {
        id: req.user.id,
        role: req.user.role,
        permissions: req.user.permissions || [],
        business_id: req.user.business_id || null,
        store_id: req.user.store_id || null,
        warehouse_id: req.user.warehouse_id || null,
      },
      navigation: getVisibleModuleGroups(req.user),
      summary: {
        revenue_30d: dashboard.kpis.revenue_30d,
        orders_30d: dashboard.kpis.orders_today,
        active_products: dashboard.kpis.active_products,
        active_customers: dashboard.top_customers.length,
        low_stock_count: dashboard.kpis.low_stock_count,
      },
      timestamp: new Date(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getPosOverview = async (req, res) => {
  try {
    const scope = buildTenantWhere(req, 'business_id', 1);
    const [products, customers, holds, recentSales] = await Promise.all([
      pool.query(
        `SELECT id, title, sku, barcode, current_stock, selling_price, mrp, variant_size, variant_color
         FROM src_erp_inventory_items
         ${scope.clause}
         ORDER BY updated_at DESC
         LIMIT 10`,
        scope.values
      ),
      pool.query(
        `SELECT id, customer_code, name, phone, loyalty_points, store_credit, outstanding_amount
         FROM src_erp_customers
         ${scope.clause}
         ORDER BY updated_at DESC
         LIMIT 8`,
        scope.values
      ),
      pool.query(
        `SELECT hold_code, customer_name, total, held_at
         FROM src_erp_pos_holds
         ${scope.clause}
         ORDER BY held_at DESC
         LIMIT 8`,
        scope.values
      ),
      pool.query(
        `SELECT bill_no, payment_method, total, status, created_at
         FROM src_erp_sales
         ${scope.clause}
         ORDER BY created_at DESC
         LIMIT 8`,
        scope.values
      ),
    ]);

    const metrics = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE AND status = 'completed') AS bills_today,
         COALESCE(SUM(total) FILTER (WHERE DATE(created_at) = CURRENT_DATE AND status = 'completed'), 0) AS sales_today,
         COUNT(*) FILTER (WHERE status = 'hold') AS hold_count
       FROM src_erp_sales
       WHERE 1=1 ${scope.clause ? `AND business_id = $1` : ''}`,
      scope.values
    );

    res.json({
      metrics: {
        bills_today: parseCount(metrics.rows[0]?.bills_today),
        sales_today: parseMoney(metrics.rows[0]?.sales_today),
        hold_count: parseCount(metrics.rows[0]?.hold_count),
      },
      supported_scanners: ['USB Scanner', 'Bluetooth Scanner', 'Wireless Scanner', 'Keyboard Scanner', 'Camera Scanner'],
      payment_methods: ['Cash', 'UPI', 'Card', 'Wallet', 'Cheque', 'Gift Card', 'Store Credit', 'Bank', 'Split Payment'],
      products: products.rows,
      customers: customers.rows.map((row) => ({
        ...row,
        loyalty_points: parseCount(row.loyalty_points),
        store_credit: parseMoney(row.store_credit),
        outstanding_amount: parseMoney(row.outstanding_amount),
      })),
      held_bills: holds.rows.map((row) => ({ ...row, total: parseMoney(row.total) })),
      recent_sales: recentSales.rows.map((row) => ({ ...row, total: parseMoney(row.total) })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getInventoryOverview = async (req, res) => {
  try {
    const scope = buildTenantWhere(req, 'business_id', 1);
    const movementScope = buildTenantWhere(req, 'm.business_id', 1);

    const [metricsRes, lowStockRes, movementRes, warehouseRes] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) AS item_count,
           COUNT(*) FILTER (WHERE current_stock <= reorder_level) AS low_stock_count,
           COUNT(*) FILTER (WHERE current_stock = 0) AS out_of_stock_count,
           COALESCE(SUM(current_stock * purchase_price), 0) AS stock_cost_value,
           COALESCE(SUM(current_stock * selling_price), 0) AS stock_retail_value
         FROM src_erp_inventory_items
         ${scope.clause}`,
        scope.values
      ),
      pool.query(
        `SELECT title, sku, barcode, current_stock, reorder_level, warehouse_id, rack_code, shelf_code
         FROM src_erp_inventory_items
         ${scope.clause}
         ORDER BY current_stock ASC, updated_at DESC
         LIMIT 10`,
        scope.values
      ),
      pool.query(
        `SELECT m.movement_type, m.quantity, m.balance_after, m.reference_type, m.created_at, i.title, i.sku
         FROM src_erp_inventory_movements m
         JOIN src_erp_inventory_items i ON i.id = m.inventory_item_id
         ${movementScope.clause}
         ORDER BY m.created_at DESC
         LIMIT 12`,
        movementScope.values
      ),
      pool.query(
        `SELECT w.id, w.name, COUNT(i.id) AS sku_count, COALESCE(SUM(i.current_stock), 0) AS stock_units
         FROM src_warehouses w
         LEFT JOIN src_erp_inventory_items i ON i.warehouse_id = w.id
         ${scope.clause ? `WHERE w.business_id = $1` : ''}
         GROUP BY w.id, w.name
         ORDER BY w.name ASC`,
        scope.values
      ),
    ]);

    res.json({
      metrics: {
        item_count: parseCount(metricsRes.rows[0]?.item_count),
        low_stock_count: parseCount(metricsRes.rows[0]?.low_stock_count),
        out_of_stock_count: parseCount(metricsRes.rows[0]?.out_of_stock_count),
        stock_cost_value: parseMoney(metricsRes.rows[0]?.stock_cost_value),
        stock_retail_value: parseMoney(metricsRes.rows[0]?.stock_retail_value),
      },
      low_stock_items: lowStockRes.rows.map((row) => ({
        ...row,
        current_stock: parseCount(row.current_stock),
        reorder_level: parseCount(row.reorder_level),
      })),
      recent_movements: movementRes.rows.map((row) => ({
        ...row,
        quantity: parseCount(row.quantity),
        balance_after: parseCount(row.balance_after),
      })),
      warehouse_summary: warehouseRes.rows.map((row) => ({
        ...row,
        sku_count: parseCount(row.sku_count),
        stock_units: parseCount(row.stock_units),
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getWarehouseOverview = async (req, res) => {
  try {
    const scope = buildTenantWhere(req, 'w.business_id', 1);
    const movementScope = buildTenantWhere(req, 'm.business_id', 1);

    const [warehouses, transferFeed] = await Promise.all([
      pool.query(
        `SELECT w.id, w.name, w.address, w.phone, w.is_active,
                COUNT(i.id) AS sku_count,
                COALESCE(SUM(i.current_stock), 0) AS stock_units,
                COUNT(i.id) FILTER (WHERE i.current_stock <= i.reorder_level) AS low_stock_items
         FROM src_warehouses w
         LEFT JOIN src_erp_inventory_items i ON i.warehouse_id = w.id
         ${scope.clause}
         GROUP BY w.id, w.name, w.address, w.phone, w.is_active
         ORDER BY w.name ASC`,
        scope.values
      ),
      pool.query(
        `SELECT m.movement_type, m.reference_type, m.reference_id, m.quantity, m.created_at, i.title
         FROM src_erp_inventory_movements m
         JOIN src_erp_inventory_items i ON i.id = m.inventory_item_id
         ${movementScope.clause}
         AND m.movement_type IN ('transfer_in','transfer_out','damage','count','adjustment')
         ORDER BY m.created_at DESC
         LIMIT 12`,
        movementScope.values
      ),
    ]);

    res.json({
      warehouses: warehouses.rows.map((row) => ({
        ...row,
        sku_count: parseCount(row.sku_count),
        stock_units: parseCount(row.stock_units),
        low_stock_items: parseCount(row.low_stock_items),
      })),
      transfer_feed: transferFeed.rows.map((row) => ({ ...row, quantity: parseCount(row.quantity) })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getReportsOverview = async (req, res) => {
  try {
    const salesScope = buildTenantFilter(req, 'business_id', 1);
    const expenseScope = buildTenantFilter(req, 'business_id', 1);
    const salesWhere = salesScope.clause ? `AND business_id = $1` : '';

    const [summaryRes, expenseRes, paymentMixRes, topProductsRes, trendRes] = await Promise.all([
      pool.query(
        `SELECT
           COALESCE(SUM(total) FILTER (WHERE DATE(created_at) = CURRENT_DATE AND status = 'completed'), 0) AS sales_today,
           COALESCE(SUM(total) FILTER (WHERE created_at >= DATE_TRUNC('week', NOW()) AND status = 'completed'), 0) AS sales_week,
           COALESCE(SUM(total) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW()) AND status = 'completed'), 0) AS sales_month,
           COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW()) AND status = 'completed') AS invoices_month
         FROM src_erp_sales
         WHERE 1=1 ${salesScope.clause}`,
        salesScope.values
      ),
      pool.query(
        `SELECT COALESCE(SUM(amount) FILTER (WHERE expense_date >= DATE_TRUNC('month', CURRENT_DATE)), 0) AS expenses_month
         FROM src_erp_expenses
         WHERE 1=1 ${expenseScope.clause}`,
        expenseScope.values
      ),
      pool.query(
        `SELECT payment_method, COUNT(*) AS bills, COALESCE(SUM(total),0) AS amount
         FROM src_erp_sales
         WHERE status = 'completed' ${salesWhere}
         GROUP BY payment_method
         ORDER BY amount DESC`,
        salesScope.values
      ),
      pool.query(
        `SELECT COALESCE(i.title, si.title) AS product_name, SUM(si.quantity) AS qty, COALESCE(SUM(si.line_total),0) AS revenue
         FROM src_erp_sale_items si
         JOIN src_erp_sales s ON s.id = si.sale_id
         LEFT JOIN src_erp_inventory_items i ON i.id = si.inventory_item_id
         WHERE s.status = 'completed' ${salesWhere}
         GROUP BY COALESCE(i.title, si.title)
         ORDER BY revenue DESC
         LIMIT 10`,
        salesScope.values
      ),
      pool.query(
        `SELECT TO_CHAR(DATE(created_at), 'YYYY-MM-DD') AS sale_date, COALESCE(SUM(total), 0) AS total
         FROM src_erp_sales
         WHERE created_at >= CURRENT_DATE - INTERVAL '6 days' AND status = 'completed' ${salesWhere}
         GROUP BY DATE(created_at)
         ORDER BY DATE(created_at) ASC`,
        salesScope.values
      ),
    ]);

    const summary = summaryRes.rows[0] || {};
    const expensesMonth = parseMoney(expenseRes.rows[0]?.expenses_month);
    const salesMonth = parseMoney(summary.sales_month);

    res.json({
      summary: {
        sales_today: parseMoney(summary.sales_today),
        sales_week: parseMoney(summary.sales_week),
        sales_month: salesMonth,
        expenses_month: expensesMonth,
        profit_estimate: salesMonth - expensesMonth,
        invoices_month: parseCount(summary.invoices_month),
      },
      payment_mix: paymentMixRes.rows.map((row) => ({
        payment_method: row.payment_method,
        bills: parseCount(row.bills),
        amount: parseMoney(row.amount),
      })),
      top_products: topProductsRes.rows.map((row) => ({
        product_name: row.product_name,
        qty: parseCount(row.qty),
        revenue: parseMoney(row.revenue),
      })),
      trend: trendRes.rows.map((row) => ({
        sale_date: row.sale_date,
        total: parseMoney(row.total),
      })),
      export_formats: ['Excel', 'CSV', 'PDF', 'Print'],
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getAuditLogs = async (req, res) => {
  try {
    const limit = Math.min(Number.parseInt(req.query.limit || '50', 10), 200);
    const businessId = getScopedBusinessId(req);

    const result = businessId
      ? await pool.query(
          `SELECT l.id, l.action, l.target_type, l.target_id, l.details, l.created_at, u.name AS actor_name, u.role AS actor_role
           FROM src_activity_logs l
           LEFT JOIN src_users u ON u.id = l.admin_id
           WHERE u.business_id = $1 OR u.business_id IS NULL
           ORDER BY l.created_at DESC
           LIMIT $2`,
          [businessId, limit]
        )
      : await pool.query(
          `SELECT l.id, l.action, l.target_type, l.target_id, l.details, l.created_at, u.name AS actor_name, u.role AS actor_role
           FROM src_activity_logs l
           LEFT JOIN src_users u ON u.id = l.admin_id
           ORDER BY l.created_at DESC
           LIMIT $1`,
          [limit]
        );

    res.json({ logs: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getSettings = async (req, res) => {
  try {
    const [globalSettingsRes, businessRes, storesRes, printersRes] = await Promise.all([
      pool.query('SELECT key, value FROM src_settings'),
      getScopedBusinessId(req)
        ? pool.query('SELECT settings, name, gst_number, currency, timezone, phone, email, address FROM src_businesses WHERE id = $1', [getScopedBusinessId(req)])
        : Promise.resolve({ rows: [] }),
      getScopedBusinessId(req)
        ? pool.query('SELECT id, name, store_code, is_active FROM src_stores WHERE business_id = $1 ORDER BY name ASC', [getScopedBusinessId(req)])
        : Promise.resolve({ rows: [] }),
      Promise.resolve({
        rows: [
          { key: 'thermal', label: 'Thermal 58mm' },
          { key: 'thermal-80', label: 'Thermal 80mm' },
          { key: 'a4', label: 'A4 Invoice' },
          { key: 'barcode', label: 'Barcode Label 50x25mm' },
        ],
      }),
    ]);

    const settings = globalSettingsRes.rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});

    res.json({
      settings,
      business_settings: businessRes.rows[0]?.settings || {},
      business_profile: businessRes.rows[0] || null,
      stores: storesRes.rows,
      printer_profiles: printersRes.rows,
      tenant: req.tenant,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getTenantInfo = async (req, res) => {
  try {
    res.json({
      tenant: req.tenant,
      modules: getVisibleModuleGroups(req.user).flatMap((group) => group.items).map((item) => ({
        key: item.key,
        name: item.label,
      })),
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

const listStores = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    const storeId = getScopedStoreId(req);
    const baseQuery = `
      SELECT s.id, s.name, s.slug, s.store_code, s.address, s.phone, s.email, s.business_id, s.is_active,
             b.name AS business_name
      FROM src_stores s
      LEFT JOIN src_businesses b ON b.id = s.business_id
    `;

    let query;
    let params = [];

    if (req.user?.role === 'super_admin') {
      query = `${baseQuery} ORDER BY s.created_at DESC`;
    } else if (storeId) {
      query = `${baseQuery} WHERE s.id = $1 ORDER BY s.created_at DESC`;
      params = [storeId];
    } else if (businessId) {
      query = `${baseQuery} WHERE s.business_id = $1 ORDER BY s.created_at DESC`;
      params = [businessId];
    } else {
      return res.status(400).json({ message: 'Business context required' });
    }

    const result = await pool.query(query, params);
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

/**
 * POST /warehouse/transfer
 * Body: { inventory_item_id, from_warehouse_id, to_warehouse_id, quantity, notes }
 * Validates source stock, inserts transfer_out + transfer_in movements in a single transaction.
 * Returns HTTP 422 if insufficient stock.
 */
const createWarehouseTransfer = async (req, res) => {
  const { inventory_item_id, from_warehouse_id, to_warehouse_id, quantity, notes } = req.body;
  const businessId = getScopedBusinessId(req);

  // --- Validation ---
  if (!inventory_item_id || !from_warehouse_id || !to_warehouse_id) {
    return res.status(400).json({ message: 'inventory_item_id, from_warehouse_id, and to_warehouse_id are required' });
  }
  const qty = Number.parseInt(quantity, 10);
  if (!qty || qty <= 0) {
    return res.status(400).json({ message: 'quantity must be a positive integer' });
  }
  if (Number(from_warehouse_id) === Number(to_warehouse_id)) {
    return res.status(400).json({ message: 'from_warehouse_id and to_warehouse_id must be different' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the inventory row to prevent race conditions
    const itemRes = await client.query(
      `SELECT id, current_stock, business_id FROM src_erp_inventory_items WHERE id = $1 FOR UPDATE`,
      [inventory_item_id]
    );
    if (!itemRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    const item = itemRes.rows[0];
    const currentStock = Number.parseInt(item.current_stock, 10);

    if (currentStock < qty) {
      await client.query('ROLLBACK');
      return res.status(422).json({ message: `Insufficient stock. Available: ${currentStock}` });
    }

    const newStock = currentStock - qty;

    // Update current_stock on the item
    await client.query(
      `UPDATE src_erp_inventory_items SET current_stock = $1, updated_at = NOW() WHERE id = $2`,
      [newStock, inventory_item_id]
    );

    // Insert transfer_out movement
    await client.query(
      `INSERT INTO src_erp_inventory_movements
         (business_id, inventory_item_id, warehouse_id, movement_type, quantity, balance_after, reference_type, notes, created_by)
       VALUES ($1, $2, $3, 'transfer_out', $4, $5, 'transfer', $6, $7)`,
      [businessId, inventory_item_id, from_warehouse_id, -qty, newStock, notes || null, req.user?.id || null]
    );

    // Insert transfer_in movement
    await client.query(
      `INSERT INTO src_erp_inventory_movements
         (business_id, inventory_item_id, warehouse_id, movement_type, quantity, balance_after, reference_type, notes, created_by)
       VALUES ($1, $2, $3, 'transfer_in', $4, $5, 'transfer', $6, $7)`,
      [businessId, inventory_item_id, to_warehouse_id, qty, newStock, notes || null, req.user?.id || null]
    );

    await logAudit(client, {
      adminId: req.user?.id,
      action: 'warehouse_transfer',
      targetType: 'inventory_item',
      targetId: inventory_item_id,
      details: `Transfer qty=${qty} from warehouse ${from_warehouse_id} to ${to_warehouse_id}. balance_after=${newStock}`,
    });

    await client.query('COMMIT');

    res.json({ message: 'Transfer completed', balance_after: newStock });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('createWarehouseTransfer error:', err.message);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
};

/**
 * POST /warehouse/damage
 * Body: { inventory_item_id, quantity, notes, warehouse_id }
 * Inserts a damage movement (negative quantity) and updates current_stock.
 */
const recordDamage = async (req, res) => {
  const { inventory_item_id, quantity, notes, warehouse_id } = req.body;
  const businessId = getScopedBusinessId(req);

  if (!inventory_item_id) {
    return res.status(400).json({ message: 'inventory_item_id is required' });
  }
  const qty = Number.parseInt(quantity, 10);
  if (!qty || qty <= 0) {
    return res.status(400).json({ message: 'quantity must be a positive integer' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const itemRes = await client.query(
      `SELECT id, current_stock FROM src_erp_inventory_items WHERE id = $1 FOR UPDATE`,
      [inventory_item_id]
    );
    if (!itemRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    const currentStock = Number.parseInt(itemRes.rows[0].current_stock, 10);
    const newStock = currentStock - qty;

    // Update current_stock (allow going below 0 per business logic)
    await client.query(
      `UPDATE src_erp_inventory_items SET current_stock = $1, updated_at = NOW() WHERE id = $2`,
      [newStock, inventory_item_id]
    );

    // Insert damage movement with negative quantity
    await client.query(
      `INSERT INTO src_erp_inventory_movements
         (business_id, inventory_item_id, warehouse_id, movement_type, quantity, balance_after, reference_type, notes, created_by)
       VALUES ($1, $2, $3, 'damage', $4, $5, 'damage', $6, $7)`,
      [businessId, inventory_item_id, warehouse_id || null, -qty, newStock, notes || null, req.user?.id || null]
    );

    await logAudit(client, {
      adminId: req.user?.id,
      action: 'record_damage',
      targetType: 'inventory_item',
      targetId: inventory_item_id,
      details: `Damage qty=${qty}. balance_after=${newStock}`,
    });

    await client.query('COMMIT');

    const response = { message: 'Damage recorded', balance_after: newStock };
    if (newStock < 0) {
      response.warning = 'Stock is now below zero. Please verify physical count.';
    }

    res.json(response);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('recordDamage error:', err.message);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
};

/**
 * POST /warehouse/count
 * Body: { inventory_item_id, counted_quantity, notes, warehouse_id }
 * Inserts a count movement and sets current_stock to the counted value.
 */
const recordStockCount = async (req, res) => {
  const { inventory_item_id, counted_quantity, notes, warehouse_id } = req.body;
  const businessId = getScopedBusinessId(req);

  if (!inventory_item_id) {
    return res.status(400).json({ message: 'inventory_item_id is required' });
  }
  const countedQty = Number.parseInt(counted_quantity, 10);
  if (countedQty === undefined || countedQty === null || Number.isNaN(countedQty) || countedQty < 0) {
    return res.status(400).json({ message: 'counted_quantity must be a non-negative integer' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const itemRes = await client.query(
      `SELECT id, current_stock FROM src_erp_inventory_items WHERE id = $1 FOR UPDATE`,
      [inventory_item_id]
    );
    if (!itemRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    const currentStock = Number.parseInt(itemRes.rows[0].current_stock, 10);
    const delta = countedQty - currentStock;

    // Set current_stock to the counted value
    await client.query(
      `UPDATE src_erp_inventory_items SET current_stock = $1, updated_at = NOW() WHERE id = $2`,
      [countedQty, inventory_item_id]
    );

    // Insert count movement with delta quantity
    await client.query(
      `INSERT INTO src_erp_inventory_movements
         (business_id, inventory_item_id, warehouse_id, movement_type, quantity, balance_after, reference_type, notes, created_by)
       VALUES ($1, $2, $3, 'count', $4, $5, 'stock_count', $6, $7)`,
      [businessId, inventory_item_id, warehouse_id || null, delta, countedQty, notes || null, req.user?.id || null]
    );

    await logAudit(client, {
      adminId: req.user?.id,
      action: 'stock_count',
      targetType: 'inventory_item',
      targetId: inventory_item_id,
      details: `Stock count: previous=${currentStock}, counted=${countedQty}, delta=${delta}`,
    });

    await client.query('COMMIT');

    res.json({ message: 'Stock count saved', balance_after: countedQty, delta });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('recordStockCount error:', err.message);
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
};

/**
 * GET /audit-logs/paginated
 * Query: page, limit, actor (name search), action (partial match), from, to, target_type
 * Scoped to business_id unless super_admin.
 * Returns { logs, total, page, limit }
 */
const listAuditLogs = async (req, res) => {
  try {
    const page  = Math.max(1, Number.parseInt(req.query.page  || '1',  10));
    const limit = Math.min(Math.max(1, Number.parseInt(req.query.limit || '25', 10)), 200);
    const offset = (page - 1) * limit;

    const { actor, action, from, to, target_type } = req.query;
    const isSuperAdmin = req.user?.role === 'super_admin';
    const businessId   = getScopedBusinessId(req);

    const conditions = [];
    const values     = [];
    let idx = 1;

    // Scope by business unless super_admin
    if (!isSuperAdmin && businessId) {
      conditions.push(`u.business_id = $${idx++}`);
      values.push(businessId);
    }

    if (actor) {
      conditions.push(`u.name ILIKE $${idx++}`);
      values.push(`%${actor}%`);
    }

    if (action) {
      conditions.push(`l.action ILIKE $${idx++}`);
      values.push(`%${action}%`);
    }

    if (from) {
      conditions.push(`l.created_at >= $${idx++}`);
      values.push(from);
    }

    if (to) {
      conditions.push(`l.created_at <= $${idx++}`);
      values.push(to);
    }

    if (target_type) {
      conditions.push(`l.target_type = $${idx++}`);
      values.push(target_type);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const baseQuery = `
      FROM src_activity_logs l
      LEFT JOIN src_users u ON u.id = l.admin_id
      ${whereClause}
    `;

    const [countRes, logsRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total ${baseQuery}`, values),
      pool.query(
        `SELECT l.id, l.action, l.target_type, l.target_id, l.details, l.created_at,
                u.name AS actor_name, u.role AS actor_role
         ${baseQuery}
         ORDER BY l.created_at DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...values, limit, offset]
      ),
    ]);

    res.json({
      logs:  logsRes.rows,
      total: Number.parseInt(countRes.rows[0]?.total || '0', 10),
      page,
      limit,
    });
  } catch (err) {
    console.error('listAuditLogs error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

/**
 * GET /audit-logs/export
 * Same filters as listAuditLogs — no pagination — streams an Excel file.
 */
const exportAuditLogs = async (req, res) => {
  try {
    const XLSX = require('xlsx');

    const { actor, action, from, to, target_type } = req.query;
    const isSuperAdmin = req.user?.role === 'super_admin';
    const businessId   = getScopedBusinessId(req);

    const conditions = [];
    const values     = [];
    let idx = 1;

    if (!isSuperAdmin && businessId) {
      conditions.push(`u.business_id = $${idx++}`);
      values.push(businessId);
    }

    if (actor) {
      conditions.push(`u.name ILIKE $${idx++}`);
      values.push(`%${actor}%`);
    }

    if (action) {
      conditions.push(`l.action ILIKE $${idx++}`);
      values.push(`%${action}%`);
    }

    if (from) {
      conditions.push(`l.created_at >= $${idx++}`);
      values.push(from);
    }

    if (to) {
      conditions.push(`l.created_at <= $${idx++}`);
      values.push(to);
    }

    if (target_type) {
      conditions.push(`l.target_type = $${idx++}`);
      values.push(target_type);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT l.created_at, u.name AS actor_name, u.role AS actor_role,
              l.action, l.target_type, l.target_id, l.details
       FROM src_activity_logs l
       LEFT JOIN src_users u ON u.id = l.admin_id
       ${whereClause}
       ORDER BY l.created_at DESC
       LIMIT 10000`,
      values
    );

    const rows = result.rows.map((r) => ({
      Timestamp:    r.created_at ? new Date(r.created_at).toISOString().replace('T', ' ').slice(0, 19) : '',
      Actor:        r.actor_name  || '—',
      Role:         r.actor_role  || '—',
      Action:       r.action      || '',
      'Target Type': r.target_type || '',
      'Target ID':  r.target_id   || '',
      Details:      r.details     ? (typeof r.details === 'object' ? JSON.stringify(r.details) : String(r.details)) : '',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = `audit-logs-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (err) {
    console.error('exportAuditLogs error:', err.message);
    res.status(500).json({ message: err.message });
  }
};

const updateSettings = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const {
      business_profile,
      loyalty_rate,
      min_redemption,
      upi_ids,
      default_printer,
      business_settings,
    } = req.body;

    const updates = {};

    // Update business profile fields
    if (business_profile) {
      const { name, gst_number, phone, email, address, currency, timezone } = business_profile;
      if (name !== undefined) updates.name = name;
      if (gst_number !== undefined) updates.gst_number = gst_number;
      if (phone !== undefined) updates.phone = phone;
      if (email !== undefined) updates.email = email;
      if (address !== undefined) updates.address = address;
      if (currency !== undefined) updates.currency = currency;
      if (timezone !== undefined) updates.timezone = timezone;
    }

    // Update business settings (JSON)
    const businessSettings = {};
    const settingsPayload = business_settings || {};
    if (settingsPayload.loyalty_rate !== undefined) businessSettings.loyalty_rate = Number(settingsPayload.loyalty_rate);
    if (settingsPayload.min_redemption !== undefined) businessSettings.min_redemption = Number(settingsPayload.min_redemption);
    if (settingsPayload.upi_ids !== undefined && Array.isArray(settingsPayload.upi_ids)) businessSettings.upi_ids = settingsPayload.upi_ids;
    if (settingsPayload.default_printer !== undefined) businessSettings.default_printer = settingsPayload.default_printer;

    if (loyalty_rate !== undefined) businessSettings.loyalty_rate = Number(loyalty_rate);
    if (min_redemption !== undefined) businessSettings.min_redemption = Number(min_redemption);
    if (upi_ids !== undefined && Array.isArray(upi_ids)) businessSettings.upi_ids = upi_ids;
    if (default_printer !== undefined) businessSettings.default_printer = default_printer;

    // Build update query
    let query = 'UPDATE src_businesses SET ';
    const values = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, val], idx) => {
      if (idx > 0) query += ', ';
      query += `${key} = $${paramCount}`;
      values.push(val);
      paramCount++;
    });

    // Always update settings JSON
    if (query.includes('SET')) query += ', ';
    query += `settings = COALESCE(settings, '{}'::jsonb) || $${paramCount}`;
    values.push(JSON.stringify(businessSettings));
    paramCount++;

    query += ` WHERE id = $${paramCount} RETURNING *`;
    values.push(businessId);

    const result = await pool.query(query, values);
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Business not found' });
    }

    res.json({ message: 'Settings updated', business: result.rows[0] });
  } catch (err) {
    console.error('updateSettings:', err.message);
    res.status(500).json({ message: err.message });
  }
};

const createStore = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const { name, store_code, address, phone, email, slug } = req.body;
    if (!name || !store_code) return res.status(400).json({ message: 'name and store_code are required' });

    let storeSlug = slugify(slug || store_code || name);
    if (!storeSlug) storeSlug = slugify(name || store_code);

    const existingSlug = await pool.query(
      `SELECT id FROM src_stores WHERE slug = $1 LIMIT 1`,
      [storeSlug]
    );
    if (existingSlug.rows.length) {
      storeSlug = `${storeSlug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const result = await pool.query(
      `INSERT INTO src_stores (business_id, name, slug, store_code, address, phone, email, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
       RETURNING *`,
      [businessId, name, storeSlug, store_code, address || null, phone || null, email || null]
    );

    res.json({ store: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateStore = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const { name, store_code, address, phone, email, is_active } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (store_code !== undefined) updates.store_code = store_code;
    if (address !== undefined) updates.address = address;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (is_active !== undefined) updates.is_active = is_active;

    if (!Object.keys(updates).length) {
      const existing = await pool.query(
        `SELECT * FROM src_stores WHERE id = $1 AND business_id = $2`,
        [id, businessId]
      );
      if (!existing.rows.length) return res.status(404).json({ message: 'Store not found' });
      return res.json({ store: existing.rows[0] });
    }

    const setClauses = Object.keys(updates).map((key, idx) => `${key} = $${idx + 3}`).join(', ');
    const values = [businessId, id, ...Object.values(updates)];

    const result = await pool.query(
      `UPDATE src_stores SET ${setClauses} WHERE id = $2 AND business_id = $1 RETURNING *`,
      values
    );

    if (!result.rows.length) return res.status(404).json({ message: 'Store not found' });
    res.json({ store: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteStore = async (req, res) => {
  try {
    const { id } = req.params;
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const result = await pool.query(
      `DELETE FROM src_stores WHERE id = $1 AND business_id = $2 RETURNING *`,
      [id, businessId]
    );

    if (!result.rows.length) return res.status(404).json({ message: 'Store not found' });

    res.json({ message: 'Store deleted', store: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getDashboard,
  getModules,
  getBootstrap,
  getPosOverview,
  getInventoryOverview,
  getWarehouseOverview,
  getReportsOverview,
  getAuditLogs,
  listAuditLogs,
  exportAuditLogs,
  getSettings,
  updateSettings,
  getTenantInfo,
  listBusinesses,
  listStores,
  listWarehouses,
  createStore,
  updateStore,
  deleteStore,
  createWarehouseTransfer,
  recordDamage,
  recordStockCount,
};
