const { pool } = require('../config/db');

const log = async (client, adminId, action, targetType, targetId, details) => {
  await client.query(
    'INSERT INTO src_activity_logs (admin_id, action, target_type, target_id, details) VALUES ($1,$2,$3,$4,$5)',
    [adminId, action, targetType, targetId, details]
  ).catch(() => {});
};

// ── Analytics ──────────────────────────────────────────────────────────────────
const getAnalytics = async (req, res) => {
  const { period = '30d', start, end } = req.query;

  // Build date range
  let fromDate, toDate = new Date();
  if (start && end) {
    fromDate = new Date(start);
    toDate   = new Date(end);
    toDate.setHours(23, 59, 59, 999);
  } else {
    fromDate = new Date();
    const map = { '1d': 1, '7d': 7, '30d': 30, '90d': 90, '180d': 180, '365d': 365 };
    fromDate.setDate(fromDate.getDate() - (map[period] || 30));
    fromDate.setHours(0, 0, 0, 0);
  }

  const from = fromDate.toISOString();
  const to   = toDate.toISOString();

  // Previous period for comparison
  const diff = toDate - fromDate;
  const prevFrom = new Date(fromDate - diff).toISOString();
  const prevTo   = from;

  try {
    const [
      current, previous, revenueChart, ordersChart,
      topProducts, categoryStats, orderStatusBreakdown, recentOrders
    ] = await Promise.all([
      // Current period metrics
      pool.query(`
        SELECT
          COALESCE(SUM(total) FILTER (WHERE payment_status='paid'), 0) as revenue,
          COUNT(*) as orders,
          COUNT(*) FILTER (WHERE payment_status='paid') as paid_orders,
          COALESCE(AVG(total) FILTER (WHERE payment_status='paid'), 0) as avg_order_value,
          COUNT(*) FILTER (WHERE status='delivered') as delivered,
          COUNT(*) FILTER (WHERE status='pending') as pending,
          COUNT(*) FILTER (WHERE status='cancelled') as cancelled,
          COUNT(*) FILTER (WHERE status='refunded') as refunded
        FROM src_orders WHERE created_at BETWEEN $1 AND $2
      `, [from, to]),

      // Previous period for comparison
      pool.query(`
        SELECT
          COALESCE(SUM(total) FILTER (WHERE payment_status='paid'), 0) as revenue,
          COUNT(*) as orders
        FROM src_orders WHERE created_at BETWEEN $1 AND $2
      `, [prevFrom, prevTo]),

      // Revenue chart — daily
      pool.query(`
        SELECT
          DATE_TRUNC('day', created_at) as date,
          COALESCE(SUM(total) FILTER (WHERE payment_status='paid'), 0) as revenue,
          COUNT(*) as orders
        FROM src_orders
        WHERE created_at BETWEEN $1 AND $2
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date ASC
      `, [from, to]),

      // New customers chart
      pool.query(`
        SELECT
          DATE_TRUNC('day', created_at) as date,
          COUNT(*) as new_users
        FROM src_users
        WHERE created_at BETWEEN $1 AND $2 AND role != 'admin'
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date ASC
      `, [from, to]),

      // Top products by revenue
      pool.query(`
        SELECT
          oi.title,
          SUM(oi.quantity) as units_sold,
          SUM(oi.price * oi.quantity) as revenue,
          COUNT(DISTINCT oi.order_id) as order_count,
          p.id as product_id,
          (SELECT image_url FROM src_product_images WHERE product_id=p.id AND is_primary=TRUE LIMIT 1) as image_url
        FROM src_order_items oi
        JOIN src_orders o ON oi.order_id = o.id
        LEFT JOIN src_products p ON oi.product_id = p.id
        WHERE o.created_at BETWEEN $1 AND $2 AND o.payment_status = 'paid'
        GROUP BY oi.title, p.id
        ORDER BY revenue DESC
        LIMIT 10
      `, [from, to]),

      // Category-wise sales
      pool.query(`
        SELECT
          COALESCE(c.name, 'Uncategorized') as category,
          SUM(oi.quantity) as units_sold,
          SUM(oi.price * oi.quantity) as revenue
        FROM src_order_items oi
        JOIN src_orders o ON oi.order_id = o.id
        LEFT JOIN src_products p ON oi.product_id = p.id
        LEFT JOIN src_categories c ON p.category_id = c.id
        WHERE o.created_at BETWEEN $1 AND $2 AND o.payment_status = 'paid'
        GROUP BY c.name
        ORDER BY revenue DESC
      `, [from, to]),

      // Order status breakdown
      pool.query(`
        SELECT status, COUNT(*) as count
        FROM src_orders
        WHERE created_at BETWEEN $1 AND $2
        GROUP BY status
      `, [from, to]),

      // Recent orders
      pool.query(`
        SELECT o.order_id, o.total, o.status, o.payment_status, o.full_name, o.created_at
        FROM src_orders o
        WHERE o.created_at BETWEEN $1 AND $2
        ORDER BY o.created_at DESC LIMIT 10
      `, [from, to]),
    ]);

    const cur = current.rows[0];
    const prev = previous.rows[0];

    const pctChange = (cur, prev) => {
      if (!prev || parseFloat(prev) === 0) return cur > 0 ? 100 : 0;
      return Math.round(((parseFloat(cur) - parseFloat(prev)) / parseFloat(prev)) * 100);
    };

    res.json({
      period: { from, to },
      metrics: {
        revenue:         parseFloat(cur.revenue),
        orders:          parseInt(cur.orders),
        paid_orders:     parseInt(cur.paid_orders),
        avg_order_value: Math.round(parseFloat(cur.avg_order_value)),
        delivered:       parseInt(cur.delivered),
        pending:         parseInt(cur.pending),
        cancelled:       parseInt(cur.cancelled),
        refunded:        parseInt(cur.refunded),
      },
      comparison: {
        revenue_change: pctChange(cur.revenue, prev.revenue),
        orders_change:  pctChange(cur.orders, prev.orders),
        prev_revenue:   parseFloat(prev.revenue),
        prev_orders:    parseInt(prev.orders),
      },
      charts: {
        revenue:  revenueChart.rows.map(r => ({ date: r.date, revenue: parseFloat(r.revenue), orders: parseInt(r.orders) })),
        customers: ordersChart.rows.map(r => ({ date: r.date, new_users: parseInt(r.new_users) })),
      },
      top_products:   topProducts.rows,
      category_stats: categoryStats.rows,
      order_status:   orderStatusBreakdown.rows,
      recent_orders:  recentOrders.rows,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const exportAnalytics = async (req, res) => {
  const XLSX = require('xlsx');
  const { period = '30d', start, end, type = 'full' } = req.query;

  // Build date range
  let fromDate = new Date(), toDate = new Date();
  if (start && end) {
    fromDate = new Date(start);
    toDate   = new Date(end);
    toDate.setHours(23, 59, 59, 999);
  } else {
    const map = { '1d': 1, '7d': 7, '30d': 30, '90d': 90, '180d': 180, '365d': 365 };
    fromDate.setDate(fromDate.getDate() - (map[period] || 30));
    fromDate.setHours(0, 0, 0, 0);
  }
  const from = fromDate.toISOString();
  const to   = toDate.toISOString();
  const dateLabel = `${fromDate.toLocaleDateString('en-IN')} to ${toDate.toLocaleDateString('en-IN')}`;
  const generatedAt = new Date().toLocaleString('en-IN');

  // Helper: auto column widths
  const autoWidths = (rows) => {
    if (!rows.length) return [];
    return Object.keys(rows[0]).map(k => ({
      wch: Math.min(Math.max(k.length + 2, 14), 40)
    }));
  };

  // Helper: build styled sheet from array of objects
  const makeSheet = (rows) => {
    if (!rows.length) return XLSX.utils.aoa_to_sheet([['No data found for this period']]);
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = autoWidths(rows);
    return ws;
  };

  try {
    const wb = XLSX.utils.book_new();

    // ── SHEET 1: SUMMARY ──────────────────────────────────────────────────────
    const summaryMetrics = await pool.query(`
      SELECT
        COUNT(*)::int                                                          AS "Total Orders",
        COUNT(*) FILTER (WHERE payment_status='paid')::int                     AS "Paid Orders",
        COUNT(*) FILTER (WHERE status='delivered')::int                        AS "Delivered Orders",
        COUNT(*) FILTER (WHERE status='pending')::int                          AS "Pending Orders",
        COUNT(*) FILTER (WHERE status='cancelled')::int                        AS "Cancelled Orders",
        COUNT(*) FILTER (WHERE status='refunded')::int                         AS "Refunded Orders",
        ROUND(COALESCE(SUM(subtotal)  FILTER (WHERE payment_status='paid'),0)::numeric,2) AS "Gross Revenue (INR)",
        ROUND(COALESCE(SUM(discount_amount) FILTER (WHERE payment_status='paid'),0)::numeric,2) AS "Total Discounts (INR)",
        ROUND(COALESCE(SUM(total)     FILTER (WHERE payment_status='paid'),0)::numeric,2) AS "Net Revenue (INR)",
        ROUND(COALESCE(AVG(total)     FILTER (WHERE payment_status='paid'),0)::numeric,2) AS "Avg Order Value (INR)"
      FROM src_orders
      WHERE created_at BETWEEN $1 AND $2
    `, [from, to]);

    const customerMetrics = await pool.query(`
      SELECT
        COUNT(*)::int                                                          AS "Total Customers",
        COUNT(*) FILTER (WHERE is_banned=FALSE AND role!='admin')::int         AS "Active Customers",
        COUNT(*) FILTER (WHERE created_at BETWEEN $1 AND $2 AND role!='admin')::int AS "New Customers (Period)"
      FROM src_users
    `, [from, to]);

    const sm = summaryMetrics.rows[0];
    const cm = customerMetrics.rows[0];

    const summarySheet = XLSX.utils.aoa_to_sheet([
      ['SHRI RAM CLOTHINGS — BUSINESS EXPORT REPORT'],
      [],
      ['Generated At',    generatedAt],
      ['Report Period',   dateLabel],
      ['Export Type',     type === 'full' ? 'Full System Export' : type],
      [],
      ['── REVENUE SUMMARY ──'],
      ['Gross Revenue (INR)',    sm['Gross Revenue (INR)']],
      ['Total Discounts (INR)',  sm['Total Discounts (INR)']],
      ['Net Revenue (INR)',      sm['Net Revenue (INR)']],
      ['Avg Order Value (INR)',  sm['Avg Order Value (INR)']],
      [],
      ['── ORDER SUMMARY ──'],
      ['Total Orders',      sm['Total Orders']],
      ['Paid Orders',       sm['Paid Orders']],
      ['Delivered Orders',  sm['Delivered Orders']],
      ['Pending Orders',    sm['Pending Orders']],
      ['Cancelled Orders',  sm['Cancelled Orders']],
      ['Refunded Orders',   sm['Refunded Orders']],
      [],
      ['── CUSTOMER SUMMARY ──'],
      ['Total Customers',         cm['Total Customers']],
      ['Active Customers',        cm['Active Customers']],
      ['New Customers (Period)',   cm['New Customers (Period)']],
    ]);
    summarySheet['!cols'] = [{ wch: 28 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, summarySheet, '1. Summary');

    // ── SHEET 2: ORDERS ───────────────────────────────────────────────────────
    const ordersResult = await pool.query(`
      SELECT
        o.order_id                                    AS "Order ID",
        o.full_name                                   AS "Customer Name",
        o.email                                       AS "Email",
        o.mobile                                      AS "Phone",
        o.address || ', ' || o.city || ', ' || o.state || ' - ' || o.pincode AS "Delivery Address",
        ROUND(o.subtotal::numeric, 2)                 AS "Subtotal (INR)",
        ROUND(o.discount_amount::numeric, 2)          AS "Discount (INR)",
        COALESCE(o.coupon_code, '')                   AS "Coupon Used",
        ROUND(o.total::numeric, 2)                    AS "Total Amount (INR)",
        o.payment_method                              AS "Payment Method",
        o.payment_status                              AS "Payment Status",
        COALESCE(o.razorpay_payment_id, '')           AS "Transaction ID",
        o.status                                      AS "Order Status",
        TO_CHAR(o.created_at, 'DD-Mon-YYYY HH24:MI') AS "Order Date & Time"
      FROM src_orders o
      WHERE o.created_at BETWEEN $1 AND $2
      ORDER BY o.created_at DESC
    `, [from, to]);
    XLSX.utils.book_append_sheet(wb, makeSheet(ordersResult.rows), '2. Orders');

    // ── SHEET 3: ORDER ITEMS (LINE ITEMS) ─────────────────────────────────────
    const itemsResult = await pool.query(`
      SELECT
        o.order_id                                    AS "Order ID",
        o.full_name                                   AS "Customer",
        oi.title                                      AS "Product Name",
        oi.size                                       AS "Size",
        oi.quantity::int                              AS "Quantity",
        ROUND(oi.price::numeric, 2)                   AS "Unit Price (INR)",
        ROUND((oi.price * oi.quantity)::numeric, 2)   AS "Line Total (INR)",
        o.payment_status                              AS "Payment Status",
        o.status                                      AS "Order Status",
        TO_CHAR(o.created_at, 'DD-Mon-YYYY HH24:MI') AS "Order Date"
      FROM src_order_items oi
      JOIN src_orders o ON oi.order_id = o.id
      WHERE o.created_at BETWEEN $1 AND $2
      ORDER BY o.created_at DESC, o.order_id
    `, [from, to]);
    XLSX.utils.book_append_sheet(wb, makeSheet(itemsResult.rows), '3. Order Items');

    // ── SHEET 4: TRANSACTIONS ─────────────────────────────────────────────────
    const txResult = await pool.query(`
      SELECT
        COALESCE(o.razorpay_payment_id, 'N/A')        AS "Transaction ID",
        o.order_id                                    AS "Order ID",
        o.full_name                                   AS "Customer",
        o.email                                       AS "Email",
        ROUND(o.subtotal::numeric, 2)                 AS "Gross Amount (INR)",
        ROUND(o.discount_amount::numeric, 2)          AS "Discount (INR)",
        COALESCE(o.coupon_code, '')                   AS "Coupon Code",
        ROUND(o.total::numeric, 2)                    AS "Net Amount Paid (INR)",
        o.payment_method                              AS "Payment Method",
        o.payment_status                              AS "Payment Status",
        o.status                                      AS "Order Status",
        TO_CHAR(o.created_at, 'DD-Mon-YYYY HH24:MI') AS "Transaction Date"
      FROM src_orders o
      WHERE o.created_at BETWEEN $1 AND $2
        AND o.payment_status IN ('paid','refunded')
      ORDER BY o.created_at DESC
    `, [from, to]);
    XLSX.utils.book_append_sheet(wb, makeSheet(txResult.rows), '4. Transactions');

    // ── SHEET 5: PRODUCTS ─────────────────────────────────────────────────────
    const productsResult = await pool.query(`
      SELECT
        oi.title                                      AS "Product Name",
        COALESCE(c.name, 'Uncategorized')             AS "Category",
        SUM(oi.quantity)::int                         AS "Units Sold",
        COUNT(DISTINCT oi.order_id)::int              AS "Orders Count",
        ROUND(MIN(oi.price)::numeric, 2)              AS "Min Price (INR)",
        ROUND(MAX(oi.price)::numeric, 2)              AS "Max Price (INR)",
        ROUND(AVG(oi.price)::numeric, 2)              AS "Avg Price (INR)",
        ROUND(SUM(oi.price * oi.quantity)::numeric,2) AS "Total Revenue (INR)"
      FROM src_order_items oi
      JOIN src_orders o ON oi.order_id = o.id
      LEFT JOIN src_products p ON oi.product_id = p.id
      LEFT JOIN src_categories c ON p.category_id = c.id
      WHERE o.created_at BETWEEN $1 AND $2
        AND o.payment_status = 'paid'
      GROUP BY oi.title, c.name
      ORDER BY "Total Revenue (INR)" DESC
    `, [from, to]);
    XLSX.utils.book_append_sheet(wb, makeSheet(productsResult.rows), '5. Products');

    // ── SHEET 6: CUSTOMERS ────────────────────────────────────────────────────
    const customersResult = await pool.query(`
      SELECT
        u.id                                          AS "User ID",
        u.name                                        AS "Full Name",
        u.email                                       AS "Email",
        COALESCE(u.phone, '')                         AS "Phone",
        CASE WHEN u.is_banned THEN 'Blocked' ELSE 'Active' END AS "Status",
        TO_CHAR(u.created_at, 'DD-Mon-YYYY')          AS "Registration Date",
        COUNT(DISTINCT o.id)::int                     AS "Total Orders",
        COUNT(DISTINCT o.id) FILTER (WHERE o.payment_status='paid')::int AS "Paid Orders",
        ROUND(COALESCE(SUM(o.total) FILTER (WHERE o.payment_status='paid'),0)::numeric,2) AS "Total Spend (INR)",
        ROUND(COALESCE(AVG(o.total) FILTER (WHERE o.payment_status='paid'),0)::numeric,2) AS "Avg Order Value (INR)",
        MAX(TO_CHAR(o.created_at,'DD-Mon-YYYY'))      AS "Last Order Date"
      FROM src_users u
      LEFT JOIN src_orders o ON o.user_id = u.id
      WHERE u.role != 'admin'
      GROUP BY u.id
      ORDER BY "Total Spend (INR)" DESC
    `);
    XLSX.utils.book_append_sheet(wb, makeSheet(customersResult.rows), '6. Customers');

    // ── SHEET 7: DAILY REVENUE ────────────────────────────────────────────────
    const dailyResult = await pool.query(`
      SELECT
        TO_CHAR(DATE_TRUNC('day', created_at), 'DD-Mon-YYYY') AS "Date",
        COUNT(*)::int                                          AS "Total Orders",
        COUNT(*) FILTER (WHERE payment_status='paid')::int    AS "Paid Orders",
        ROUND(COALESCE(SUM(subtotal) FILTER (WHERE payment_status='paid'),0)::numeric,2)       AS "Gross Revenue (INR)",
        ROUND(COALESCE(SUM(discount_amount) FILTER (WHERE payment_status='paid'),0)::numeric,2) AS "Discounts (INR)",
        ROUND(COALESCE(SUM(total) FILTER (WHERE payment_status='paid'),0)::numeric,2)          AS "Net Revenue (INR)",
        ROUND(COALESCE(AVG(total) FILTER (WHERE payment_status='paid'),0)::numeric,2)          AS "Avg Order Value (INR)"
      FROM src_orders
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY DATE_TRUNC('day', created_at)
      ORDER BY DATE_TRUNC('day', created_at) ASC
    `, [from, to]);
    XLSX.utils.book_append_sheet(wb, makeSheet(dailyResult.rows), '7. Daily Revenue');

    // ── Build & send ──────────────────────────────────────────────────────────
    const fileName = `shriram-export-${type}-${new Date().toISOString().slice(0,10)}.xlsx`;
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);

  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Stats (existing) ────────────────────────────────────────────────────────────
const getStats = async (req, res) => {
  try {
    const [users, products, orders, revenue, pending] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM src_users WHERE role != \'admin\''),
      pool.query('SELECT COUNT(*) FROM src_products WHERE deleted_at IS NULL'),
      pool.query('SELECT COUNT(*) FROM src_orders'),
      pool.query('SELECT COALESCE(SUM(total),0) as total FROM src_orders WHERE payment_status=\'paid\''),
      pool.query('SELECT COUNT(*) FROM src_products WHERE status=\'pending\' AND deleted_at IS NULL'),
    ]);
    res.json({
      totalUsers: parseInt(users.rows[0].count),
      totalProducts: parseInt(products.rows[0].count),
      totalOrders: parseInt(orders.rows[0].count),
      totalRevenue: parseFloat(revenue.rows[0].total),
      pendingProducts: parseInt(pending.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Users ─────────────────────────────────────────────────────────────────────
const getUsers = async (req, res) => {
  const { page = 1, limit = 20, search, filter } = req.query;
  const offset = (page - 1) * limit;
  try {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (search) {
      conditions.push(`(u.name ILIKE $${idx} OR u.email ILIKE $${idx} OR u.phone ILIKE $${idx})`);
      values.push(`%${search}%`); idx++;
    }
    if (filter === 'active')  { conditions.push(`u.is_banned = FALSE`); }
    if (filter === 'blocked') { conditions.push(`u.is_banned = TRUE`); }
    if (filter === 'new')     { conditions.push(`u.created_at >= NOW() - INTERVAL '7 days'`); }
    if (filter === 'google')  { conditions.push(`u.auth_provider = 'google'`); }
    if (filter === 'free_delivery') { conditions.push(`u.is_free_delivery = TRUE`); }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    values.push(limit, offset);

    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.avatar_url, u.is_banned, u.auth_provider, u.created_at,
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(o.total) FILTER (WHERE o.payment_status='paid'), 0) as total_spend
       FROM src_users u
       LEFT JOIN src_orders o ON o.user_id = u.id
       ${where}
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT $${idx} OFFSET $${idx+1}`,
      values
    );
    const count = await pool.query(`SELECT COUNT(*) FROM src_users u ${where}`, values.slice(0, -2));
    res.json({ users: result.rows, total: parseInt(count.rows[0].count) });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getUserStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_banned = FALSE AND role != 'admin') as active,
        COUNT(*) FILTER (WHERE is_banned = TRUE) as blocked,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '1 day') as today,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as this_week,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as this_month
      FROM src_users WHERE role != 'admin'
    `);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getUserDetail = async (req, res) => {
  try {
    const user = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, u.avatar_url, u.is_banned, u.created_at,
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(o.total) FILTER (WHERE o.payment_status='paid'), 0) as total_spend
       FROM src_users u
       LEFT JOIN src_orders o ON o.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id`,
      [req.params.id]
    );
    if (!user.rows.length) return res.status(404).json({ message: 'User not found' });

    const [orders, addresses, cartItems, wishlistItems] = await Promise.all([
      pool.query(
        `SELECT o.order_id, o.total, o.status, o.payment_status, o.created_at,
          (SELECT json_agg(json_build_object('title',oi.title,'size',oi.size,'quantity',oi.quantity,'price',oi.price))
           FROM src_order_items oi WHERE oi.order_id=o.id) as items
         FROM src_orders o WHERE o.user_id=$1 ORDER BY o.created_at DESC LIMIT 10`,
        [req.params.id]
      ),
      pool.query('SELECT * FROM src_addresses WHERE user_id=$1 ORDER BY is_default DESC', [req.params.id]),
      pool.query(
        `SELECT c.quantity, p.title, p.price,
          (SELECT image_url FROM src_product_images WHERE product_id=p.id AND is_primary=TRUE LIMIT 1) as image_url
         FROM src_cart c JOIN src_products p ON c.product_id=p.id WHERE c.user_id=$1`,
        [req.params.id]
      ),
      pool.query(
        `SELECT p.id, p.title, p.price,
          (SELECT image_url FROM src_product_images WHERE product_id=p.id AND is_primary=TRUE LIMIT 1) as image_url
         FROM src_wishlist w JOIN src_products p ON w.product_id=p.id WHERE w.user_id=$1`,
        [req.params.id]
      ),
    ]);

    res.json({
      ...user.rows[0],
      orders: orders.rows,
      addresses: addresses.rows,
      cart: cartItems.rows,
      wishlist: wishlistItems.rows,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const exportUsers = async (req, res) => {
  const XLSX = require('xlsx');
  try {
    const result = await pool.query(
      `SELECT
        u.id as "User ID",
        u.name as "Name",
        u.email as "Email",
        u.phone as "Phone",
        u.role as "Role",
        CASE WHEN u.is_banned THEN 'Blocked' ELSE 'Active' END as "Status",
        COUNT(DISTINCT o.id)::int as "Total Orders",
        ROUND(COALESCE(SUM(o.total) FILTER (WHERE o.payment_status='paid'), 0)::numeric, 2) as "Total Spend (INR)",
        TO_CHAR(u.created_at, 'DD-Mon-YYYY') as "Joined"
       FROM src_users u
       LEFT JOIN src_orders o ON o.user_id = u.id
       WHERE u.role != 'admin'
       GROUP BY u.id
       ORDER BY u.created_at DESC`
    );
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(result.rows);
    ws['!cols'] = Object.keys(result.rows[0] || {}).map(k => ({ wch: Math.max(k.length, 14) }));
    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="users-${new Date().toISOString().slice(0,10)}.xlsx"`);
    res.send(buffer);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const sendUserNotification = async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ message: 'Message required' });
  try {
    await pool.query(
      `INSERT INTO src_notifications (user_id, message, type) VALUES ($1,$2,'admin')`,
      [req.params.id, message]
    );
    res.json({ message: 'Notification sent' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const banUser = async (req, res) => {
  try {
    const result = await pool.query('UPDATE src_users SET is_banned=NOT is_banned WHERE id=$1 RETURNING id, name, is_banned', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: 'User not found' });
    await log(pool, req.user.id, result.rows[0].is_banned ? 'ban_user' : 'unban_user', 'user', req.params.id, result.rows[0].name);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Free Delivery ───────────────────────────────────────────────────────────────────────────────────
const setFreeDelivery = async (req, res) => {
  const { is_free_delivery, free_delivery_expiry, free_delivery_note } = req.body;
  try {
    const result = await pool.query(
      `UPDATE src_users SET
        is_free_delivery=$1,
        free_delivery_expiry=$2,
        free_delivery_note=$3
       WHERE id=$4 AND role != 'admin'
       RETURNING id, name, email, is_free_delivery, free_delivery_expiry, free_delivery_note`,
      [!!is_free_delivery, free_delivery_expiry || null, free_delivery_note || null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'User not found' });
    await log(pool, req.user.id, is_free_delivery ? 'enable_free_delivery' : 'disable_free_delivery', 'user', req.params.id, result.rows[0].name);
    // Notify user
    if (is_free_delivery) {
      await pool.query(
        `INSERT INTO src_notifications (user_id, message, type) VALUES ($1,$2,'admin')`,
        [req.params.id, `🎉 You have been granted FREE delivery on your next order${free_delivery_expiry ? ' (valid until ' + new Date(free_delivery_expiry).toLocaleDateString('en-IN') + ')' : ''}!`]
      ).catch(() => {});
    }
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const getFreeDeliveryUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.phone, u.avatar_url,
        u.is_free_delivery, u.free_delivery_expiry, u.free_delivery_note,
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(o.total) FILTER (WHERE o.payment_status='paid'), 0) as total_spend
       FROM src_users u
       LEFT JOIN src_orders o ON o.user_id = u.id
       WHERE u.is_free_delivery = TRUE AND u.role != 'admin'
       GROUP BY u.id
       ORDER BY u.free_delivery_expiry ASC NULLS LAST`
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// User-facing: check own free delivery status
const checkFreeDelivery = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT is_free_delivery, free_delivery_expiry, free_delivery_note FROM src_users WHERE id=$1`,
      [req.user.id]
    );
    if (!result.rows.length) return res.json({ eligible: false });
    const u = result.rows[0];
    const expired = u.free_delivery_expiry && new Date(u.free_delivery_expiry) < new Date();
    res.json({
      eligible: u.is_free_delivery && !expired,
      expiry: u.free_delivery_expiry,
      note: u.free_delivery_note,
    });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

const deleteUser = async (req, res) => {
  try {
    await pool.query('DELETE FROM src_users WHERE id=$1 AND role != \'admin\'', [req.params.id]);
    await log(pool, req.user.id, 'delete_user', 'user', req.params.id, '');
    res.json({ message: 'User deleted' });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// ── Products ──────────────────────────────────────────────────────────────────
const getAdminProducts = async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const offset = (page - 1) * limit;
  const conditions = ['p.deleted_at IS NULL'];
  const values = [];
  let idx = 1;
  if (status) { conditions.push(`p.status=$${idx++}`); values.push(status); }
  if (search) { conditions.push(`p.title ILIKE $${idx++}`); values.push(`%${search}%`); }
  const where = conditions.join(' AND ');
  try {
    values.push(limit, offset);
    const result = await pool.query(
      `SELECT p.*, c.name as category_name, u.name as seller_name,
        (SELECT image_url FROM src_product_images WHERE product_id=p.id AND is_primary=TRUE LIMIT 1) as primary_image
       FROM src_products p
       LEFT JOIN src_categories c ON p.category_id=c.id
       LEFT JOIN src_users u ON p.seller_id=u.id
       WHERE ${where} ORDER BY p.created_at DESC LIMIT $${idx} OFFSET $${idx+1}`,
      values
    );
    const count = await pool.query(`SELECT COUNT(*) FROM src_products p WHERE ${where}`, values.slice(0, -2));
    res.json({ products: result.rows, total: parseInt(count.rows[0].count) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateProductStatus = async (req, res) => {
  const { status, admin_message, is_featured, is_trending } = req.body;
  try {
    const fields = [], values = [];
    let idx = 1;
    if (status) { fields.push(`status=$${idx++}`); values.push(status); }
    if (admin_message !== undefined) { fields.push(`admin_message=$${idx++}`); values.push(admin_message); }
    if (is_featured !== undefined) { fields.push(`is_featured=$${idx++}`); values.push(is_featured); }
    if (is_trending !== undefined) { fields.push(`is_trending=$${idx++}`); values.push(is_trending); }
    if (!fields.length) return res.status(400).json({ message: 'Nothing to update' });
    values.push(req.params.id);
    const result = await pool.query(`UPDATE src_products SET ${fields.join(',')} WHERE id=$${idx} RETURNING *`, values);
    if (status) {
      const p = result.rows[0];
      await pool.query(
        `INSERT INTO src_notifications (user_id, message, type) VALUES ($1,$2,'product')`,
        [p.seller_id, `Your product "${p.title}" has been ${status}.${admin_message ? ' Note: ' + admin_message : ''}`]
      );
    }
    await log(pool, req.user.id, `update_product_${status || 'meta'}`, 'product', req.params.id, '');
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteAdminProduct = async (req, res) => {
  try {
    await pool.query('UPDATE src_products SET deleted_at=NOW() WHERE id=$1', [req.params.id]);
    await log(pool, req.user.id, 'delete_product', 'product', req.params.id, '');
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Orders ────────────────────────────────────────────────────────────────────
const getAdminOrders = async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const offset = (page - 1) * limit;
  try {
    const where = status ? `WHERE o.status=$1` : '';
    const values = status ? [status, limit, offset] : [limit, offset];
    const result = await pool.query(
      `SELECT o.*, u.name as user_name, u.email as user_email,
        (SELECT json_agg(json_build_object('title',oi.title,'size',oi.size,'quantity',oi.quantity,'price',oi.price))
         FROM src_order_items oi WHERE oi.order_id=o.id) as items
       FROM src_orders o LEFT JOIN src_users u ON o.user_id=u.id
       ${where} ORDER BY o.created_at DESC LIMIT $${status ? 2 : 1} OFFSET $${status ? 3 : 2}`,
      values
    );
    const count = await pool.query(`SELECT COUNT(*) FROM src_orders ${where}`, status ? [status] : []);
    res.json({ orders: result.rows, total: parseInt(count.rows[0].count) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateOrderStatus = async (req, res) => {
  const { status, rejection_reason } = req.body;
  const validStatuses = ['pending','confirmed','processing','shipped','delivered','cancelled','refunded'];
  if (!validStatuses.includes(status)) return res.status(400).json({ message: 'Invalid status' });
  try {
    const result = await pool.query(
      `UPDATE src_orders SET status=$1, rejection_reason=$2, updated_at=NOW() WHERE id=$3 RETURNING *`,
      [status, rejection_reason || null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: 'Order not found' });
    const order = result.rows[0];
    await pool.query(
      `INSERT INTO src_notifications (user_id, message, type) VALUES ($1,$2,'order')`,
      [order.user_id, `Your order #${order.order_id} status updated to: ${status.toUpperCase()}`]
    );
    await log(pool, req.user.id, `order_${status}`, 'order', req.params.id, order.order_id);
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── Categories ────────────────────────────────────────────────────────────────
const getAdminCategories = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM src_categories ORDER BY sort_order ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createCategory = async (req, res) => {
  const { name, slug, sort_order } = req.body;
  if (!name || !slug) return res.status(400).json({ message: 'Name and slug required' });
  try {
    const image_url = req.file?.path || null;
    const result = await pool.query(
      'INSERT INTO src_categories (name, slug, image_url, sort_order) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, slug, image_url, sort_order || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const updateCategory = async (req, res) => {
  const { name, slug, is_active, sort_order } = req.body;
  try {
    const image_url = req.file?.path;
    const fields = [], values = [];
    let idx = 1;
    if (name !== undefined)       { fields.push(`name=$${idx++}`);       values.push(name); }
    if (slug !== undefined)       { fields.push(`slug=$${idx++}`);       values.push(slug); }
    if (is_active !== undefined)  { fields.push(`is_active=$${idx++}`);  values.push(is_active === 'true' || is_active === true); }
    if (sort_order !== undefined) { fields.push(`sort_order=$${idx++}`); values.push(sort_order); }
    if (image_url)                { fields.push(`image_url=$${idx++}`);  values.push(image_url); }
    if (!fields.length) return res.status(400).json({ message: 'Nothing to update' });
    values.push(req.params.id);
    const result = await pool.query(`UPDATE src_categories SET ${fields.join(',')} WHERE id=$${idx} RETURNING *`, values);
    if (!result.rows.length) return res.status(404).json({ message: 'Category not found' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Slug already exists' });
    res.status(500).json({ message: err.message });
  }
};

// ── Coupons ───────────────────────────────────────────────────────────────────
const getCoupons = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM src_coupons ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createCoupon = async (req, res) => {
  const { code, discount_percent, discount_flat, min_order_amount, max_uses, expires_at } = req.body;
  if (!code || (!discount_percent && !discount_flat)) return res.status(400).json({ message: 'Code and discount required' });
  try {
    const result = await pool.query(
      `INSERT INTO src_coupons (code, discount_percent, discount_flat, min_order_amount, max_uses, expires_at)
       VALUES (UPPER($1),$2,$3,$4,$5,$6) RETURNING *`,
      [code, discount_percent || null, discount_flat || null, min_order_amount || 0, max_uses || null, expires_at || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ message: 'Coupon code already exists' });
    res.status(500).json({ message: err.message });
  }
};

const toggleCoupon = async (req, res) => {
  try {
    const result = await pool.query('UPDATE src_coupons SET is_active=NOT is_active WHERE id=$1 RETURNING *', [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    await pool.query('DELETE FROM src_coupons WHERE id=$1', [req.params.id]);
    res.json({ message: 'Coupon deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getActivityLogs = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.*, u.name as admin_name FROM src_activity_logs l
       LEFT JOIN src_users u ON l.admin_id=u.id ORDER BY l.created_at DESC LIMIT 100`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getAnalytics, exportAnalytics,
  getStats, getUsers, getUserStats, getUserDetail, exportUsers, sendUserNotification, banUser, deleteUser,
  setFreeDelivery, getFreeDeliveryUsers, checkFreeDelivery,
  getAdminProducts, updateProductStatus, deleteAdminProduct,
  getAdminOrders, updateOrderStatus,
  getAdminCategories, createCategory, updateCategory,
  getCoupons, createCoupon, toggleCoupon, deleteCoupon,
  getActivityLogs,
};
