'use strict';

const { pool } = require('../config/db');
const XLSX = require('xlsx');

const getScopedBusinessId = (req) =>
  req.tenant?.business_id || req.user?.business_id || null;

/**
 * Resolve from/to date params with sensible defaults.
 * Returns ISO strings safe for parameterized queries.
 */
const resolveDateRange = (query) => {
  const from = query.from || null;
  const to = query.to || null;
  return { from, to };
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/erp/reports/sales
// Sales summary: daily trend, payment method breakdown, overall summary
// ─────────────────────────────────────────────────────────────────────────────
const salesReport = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const { from, to } = resolveDateRange(req.query);

    // Summary
    const summaryResult = await pool.query(
      `SELECT
         COALESCE(SUM(total), 0)            AS total_sales,
         COUNT(*)                           AS total_bills,
         COALESCE(AVG(total), 0)            AS avg_bill_value,
         COALESCE(SUM(discount_amount), 0)  AS total_discount,
         COALESCE(SUM(tax_amount), 0)       AS total_tax
       FROM src_erp_sales
       WHERE business_id = $1
         AND status = 'completed'
         AND created_at BETWEEN
               COALESCE($2::timestamptz, NOW() - INTERVAL '30 days')
           AND COALESCE($3::timestamptz, NOW())`,
      [businessId, from, to]
    );

    // Daily trend
    const dailyResult = await pool.query(
      `SELECT
         DATE(created_at)          AS date,
         COALESCE(SUM(total), 0)   AS total,
         COUNT(*)                  AS bills
       FROM src_erp_sales
       WHERE business_id = $1
         AND status = 'completed'
         AND created_at BETWEEN
               COALESCE($2::timestamptz, NOW() - INTERVAL '30 days')
           AND COALESCE($3::timestamptz, NOW())
       GROUP BY DATE(created_at)
       ORDER BY DATE(created_at) ASC`,
      [businessId, from, to]
    );

    // Payment method breakdown
    const paymentResult = await pool.query(
      `SELECT
         payment_method              AS method,
         COALESCE(SUM(total), 0)     AS total,
         COUNT(*)                    AS count
       FROM src_erp_sales
       WHERE business_id = $1
         AND status = 'completed'
         AND created_at BETWEEN
               COALESCE($2::timestamptz, NOW() - INTERVAL '30 days')
           AND COALESCE($3::timestamptz, NOW())
       GROUP BY payment_method
       ORDER BY total DESC`,
      [businessId, from, to]
    );

    const summary = summaryResult.rows[0];
    return res.json({
      summary: {
        total_sales: parseFloat(summary.total_sales),
        total_bills: parseInt(summary.total_bills),
        avg_bill_value: parseFloat(summary.avg_bill_value),
        total_discount: parseFloat(summary.total_discount),
        total_tax: parseFloat(summary.total_tax),
      },
      daily_trend: dailyResult.rows.map((r) => ({
        date: r.date,
        total: parseFloat(r.total),
        bills: parseInt(r.bills),
      })),
      payment_method_breakdown: paymentResult.rows.map((r) => ({
        method: r.method,
        total: parseFloat(r.total),
        count: parseInt(r.count),
      })),
    });
  } catch (err) {
    console.error('salesReport error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/erp/reports/gst
// GST summary grouped by HSN code + GST rate (GSTR-1 / GSTR-3B compatible)
// ─────────────────────────────────────────────────────────────────────────────
const gstReport = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const { from, to } = resolveDateRange(req.query);

    // Join sale_items → inventory_items to get hsn_code + gst_rate per line
    const result = await pool.query(
      `SELECT
         COALESCE(ii.hsn_code, 'N/A')                       AS hsn_code,
         COALESCE(ii.gst_rate, 0)                           AS gst_rate,
         COUNT(DISTINCT s.id)                               AS invoice_count,
         -- taxable_value = line total before tax
         COALESCE(
           SUM(
             si.line_total - COALESCE(si.tax_amount, 0)
           ), 0
         )                                                  AS taxable_value,
         COALESCE(SUM(si.tax_amount), 0)                    AS total_gst,
         COALESCE(SUM(si.line_total), 0)                    AS total_with_gst
       FROM src_erp_sale_items si
       JOIN src_erp_sales s
         ON s.id = si.sale_id
       LEFT JOIN src_erp_inventory_items ii
         ON ii.id = si.inventory_item_id
       WHERE s.business_id = $1
         AND s.status = 'completed'
         AND s.created_at BETWEEN
               COALESCE($2::timestamptz, NOW() - INTERVAL '30 days')
           AND COALESCE($3::timestamptz, NOW())
       GROUP BY ii.hsn_code, ii.gst_rate
       ORDER BY taxable_value DESC`,
      [businessId, from, to]
    );

    const gst_summary = result.rows.map((r) => {
      const taxable_value = parseFloat(r.taxable_value);
      const gst_rate = parseFloat(r.gst_rate);
      const total_gst = parseFloat(r.total_gst);
      // CGST = SGST = gst_rate/2 of taxable_value (for intra-state)
      const cgst = parseFloat(((taxable_value * gst_rate) / 200).toFixed(2));
      const sgst = cgst;

      return {
        hsn_code: r.hsn_code,
        gst_rate,
        taxable_value,
        cgst,
        sgst,
        total_gst,
        total_with_gst: parseFloat(r.total_with_gst),
        invoice_count: parseInt(r.invoice_count),
      };
    });

    return res.json({ gst_summary });
  } catch (err) {
    console.error('gstReport error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/erp/reports/profit
// Profit estimate: revenue vs expenses, monthly trend
// ─────────────────────────────────────────────────────────────────────────────
const profitReport = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const { from, to } = resolveDateRange(req.query);

    // Total revenue from completed sales
    const revenueResult = await pool.query(
      `SELECT COALESCE(SUM(total), 0) AS revenue
       FROM src_erp_sales
       WHERE business_id = $1
         AND status = 'completed'
         AND created_at BETWEEN
               COALESCE($2::timestamptz, NOW() - INTERVAL '30 days')
           AND COALESCE($3::timestamptz, NOW())`,
      [businessId, from, to]
    );

    // Total expenses + breakdown by category
    const expenseResult = await pool.query(
      `SELECT
         category,
         COALESCE(SUM(amount), 0) AS amount
       FROM src_erp_expenses
       WHERE business_id = $1
         AND expense_date BETWEEN
               COALESCE($2::date, (NOW() - INTERVAL '30 days')::date)
           AND COALESCE($3::date, NOW()::date)
       GROUP BY category
       ORDER BY amount DESC`,
      [businessId, from, to]
    );

    const totalExpenses = expenseResult.rows.reduce(
      (sum, r) => sum + parseFloat(r.amount),
      0
    );

    // Monthly trend
    const monthlyResult = await pool.query(
      `SELECT
         TO_CHAR(month_series, 'YYYY-MM') AS month,
         COALESCE(s.revenue, 0)           AS revenue,
         COALESCE(e.expenses, 0)          AS expenses,
         COALESCE(s.revenue, 0) - COALESCE(e.expenses, 0) AS profit
       FROM (
         SELECT generate_series(
           DATE_TRUNC('month', COALESCE($2::timestamptz, NOW() - INTERVAL '30 days')),
           DATE_TRUNC('month', COALESCE($3::timestamptz, NOW())),
           INTERVAL '1 month'
         ) AS month_series
       ) months
       LEFT JOIN (
         SELECT
           DATE_TRUNC('month', created_at) AS month,
           SUM(total) AS revenue
         FROM src_erp_sales
         WHERE business_id = $1
           AND status = 'completed'
           AND created_at BETWEEN
                 COALESCE($2::timestamptz, NOW() - INTERVAL '30 days')
             AND COALESCE($3::timestamptz, NOW())
         GROUP BY DATE_TRUNC('month', created_at)
       ) s ON s.month = months.month_series
       LEFT JOIN (
         SELECT
           DATE_TRUNC('month', expense_date::timestamptz) AS month,
           SUM(amount) AS expenses
         FROM src_erp_expenses
         WHERE business_id = $1
           AND expense_date BETWEEN
                 COALESCE($2::date, (NOW() - INTERVAL '30 days')::date)
             AND COALESCE($3::date, NOW()::date)
         GROUP BY DATE_TRUNC('month', expense_date::timestamptz)
       ) e ON e.month = months.month_series
       ORDER BY month_series ASC`,
      [businessId, from, to]
    );

    const revenue = parseFloat(revenueResult.rows[0].revenue);
    const gross_profit = revenue - totalExpenses;

    return res.json({
      revenue,
      expenses: totalExpenses,
      gross_profit,
      expense_by_category: expenseResult.rows.map((r) => ({
        category: r.category,
        amount: parseFloat(r.amount),
      })),
      monthly_trend: monthlyResult.rows.map((r) => ({
        month: r.month,
        revenue: parseFloat(r.revenue),
        expenses: parseFloat(r.expenses),
        profit: parseFloat(r.profit),
      })),
    });
  } catch (err) {
    console.error('profitReport error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/erp/reports/inventory
// Inventory valuation + low stock + top moving items
// ─────────────────────────────────────────────────────────────────────────────
const inventoryReport = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const { from, to } = resolveDateRange(req.query);

    // Overall valuation
    const valuationResult = await pool.query(
      `SELECT
         COUNT(*)                                                        AS total_items,
         COALESCE(SUM(current_stock * purchase_price), 0)               AS total_stock_value_cost,
         COALESCE(SUM(current_stock * selling_price), 0)                AS total_stock_value_retail
       FROM src_erp_inventory_items
       WHERE business_id = $1
         AND (status IS NULL OR status != 'archived')`,
      [businessId]
    );

    // Low stock items (current_stock <= reorder_level, reorder_level > 0)
    const lowStockResult = await pool.query(
      `SELECT id, sku, title, category, current_stock, reorder_level,
              selling_price, purchase_price
       FROM src_erp_inventory_items
       WHERE business_id = $1
         AND reorder_level > 0
         AND current_stock <= reorder_level
         AND (status IS NULL OR status != 'archived')
       ORDER BY current_stock ASC
       LIMIT 50`,
      [businessId]
    );

    // Top moving items by qty sold in period
    const topMovingResult = await pool.query(
      `SELECT
         ii.id,
         ii.sku,
         ii.title,
         ii.category,
         ii.current_stock,
         ii.selling_price,
         COALESCE(SUM(si.quantity), 0) AS total_qty_sold
       FROM src_erp_inventory_items ii
       LEFT JOIN src_erp_sale_items si ON si.inventory_item_id = ii.id
       LEFT JOIN src_erp_sales s
         ON s.id = si.sale_id
         AND s.business_id = $1
         AND s.status = 'completed'
         AND s.created_at BETWEEN
               COALESCE($2::timestamptz, NOW() - INTERVAL '30 days')
           AND COALESCE($3::timestamptz, NOW())
       WHERE ii.business_id = $1
         AND (ii.status IS NULL OR ii.status != 'archived')
       GROUP BY ii.id
       ORDER BY total_qty_sold DESC
       LIMIT 20`,
      [businessId, from, to]
    );

    const v = valuationResult.rows[0];
    return res.json({
      total_items: parseInt(v.total_items),
      total_stock_value_cost: parseFloat(v.total_stock_value_cost),
      total_stock_value_retail: parseFloat(v.total_stock_value_retail),
      low_stock_items: lowStockResult.rows.map((r) => ({
        ...r,
        current_stock: parseInt(r.current_stock),
        reorder_level: parseInt(r.reorder_level),
        selling_price: parseFloat(r.selling_price),
        purchase_price: parseFloat(r.purchase_price),
      })),
      top_moving_items: topMovingResult.rows.map((r) => ({
        ...r,
        current_stock: parseInt(r.current_stock),
        selling_price: parseFloat(r.selling_price),
        total_qty_sold: parseInt(r.total_qty_sold),
      })),
    });
  } catch (err) {
    console.error('inventoryReport error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/erp/reports/customers
// Customer stats: totals, new in period, top customers, loyalty summary
// ─────────────────────────────────────────────────────────────────────────────
const customerReport = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const { from, to } = resolveDateRange(req.query);

    // Overall totals
    const totalsResult = await pool.query(
      `SELECT
         COUNT(*)                               AS total_customers,
         COALESCE(SUM(loyalty_points), 0)       AS total_points,
         COALESCE(SUM(store_credit), 0)         AS total_credit
       FROM src_erp_customers
       WHERE business_id = $1 AND is_active = TRUE`,
      [businessId]
    );

    // New customers in period
    const newCustomersResult = await pool.query(
      `SELECT COUNT(*) AS new_customers_period
       FROM src_erp_customers
       WHERE business_id = $1
         AND created_at BETWEEN
               COALESCE($2::timestamptz, NOW() - INTERVAL '30 days')
           AND COALESCE($3::timestamptz, NOW())`,
      [businessId, from, to]
    );

    // Top customers by spend in period
    const topCustomersResult = await pool.query(
      `SELECT
         c.id,
         c.name,
         c.phone,
         c.customer_code,
         c.membership,
         COALESCE(SUM(s.total), 0)   AS total_spend,
         COUNT(s.id)                  AS visit_count
       FROM src_erp_customers c
       LEFT JOIN src_erp_sales s
         ON s.customer_id = c.id
         AND s.business_id = $1
         AND s.status = 'completed'
         AND s.created_at BETWEEN
               COALESCE($2::timestamptz, NOW() - INTERVAL '30 days')
           AND COALESCE($3::timestamptz, NOW())
       WHERE c.business_id = $1
       GROUP BY c.id
       ORDER BY total_spend DESC
       LIMIT 20`,
      [businessId, from, to]
    );

    const t = totalsResult.rows[0];
    return res.json({
      total_customers: parseInt(t.total_customers),
      new_customers_period: parseInt(newCustomersResult.rows[0].new_customers_period),
      top_customers: topCustomersResult.rows.map((r) => ({
        id: r.id,
        name: r.name,
        phone: r.phone || '',
        customer_code: r.customer_code,
        membership: r.membership,
        total_spend: parseFloat(r.total_spend),
        visit_count: parseInt(r.visit_count),
      })),
      loyalty_stats: {
        total_points: parseInt(t.total_points),
        total_credit: parseFloat(t.total_credit),
      },
    });
  } catch (err) {
    console.error('customerReport error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers: build sheets from report data
// ─────────────────────────────────────────────────────────────────────────────

const buildSalesSheets = (data) => {
  // Sheet 1: Daily trend
  const trendHeaders = ['Date', 'Total Sales (₹)', 'Bills'];
  const trendRows = (data.daily_trend || []).map((r) => [r.date, r.total, r.bills]);
  const trendSheet = XLSX.utils.aoa_to_sheet([trendHeaders, ...trendRows]);

  // Sheet 2: Summary
  const s = data.summary || {};
  const summarySheet = XLSX.utils.aoa_to_sheet([
    ['Metric', 'Value'],
    ['Total Sales (₹)', s.total_sales],
    ['Total Bills', s.total_bills],
    ['Average Bill Value (₹)', s.avg_bill_value],
    ['Total Discount (₹)', s.total_discount],
    ['Total Tax (₹)', s.total_tax],
    [],
    ['Payment Method', 'Total (₹)', 'Count'],
    ...(data.payment_method_breakdown || []).map((r) => [r.method, r.total, r.count]),
  ]);

  return [
    { name: 'Daily Trend', sheet: trendSheet },
    { name: 'Summary', sheet: summarySheet },
  ];
};

const buildGstSheets = (data) => {
  const headers = [
    'HSN Code', 'GST Rate (%)', 'Taxable Value (₹)',
    'CGST (₹)', 'SGST (₹)', 'Total GST (₹)', 'Total with GST (₹)', 'Invoice Count',
  ];
  const rows = (data.gst_summary || []).map((r) => [
    r.hsn_code, r.gst_rate, r.taxable_value,
    r.cgst, r.sgst, r.total_gst, r.total_with_gst, r.invoice_count,
  ]);
  const mainSheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Summary: totals row
  const totalTaxable = (data.gst_summary || []).reduce((s, r) => s + r.taxable_value, 0);
  const totalGst = (data.gst_summary || []).reduce((s, r) => s + r.total_gst, 0);
  const summarySheet = XLSX.utils.aoa_to_sheet([
    ['Metric', 'Value'],
    ['Total Taxable Value (₹)', totalTaxable],
    ['Total GST (₹)', totalGst],
    ['Total (₹)', totalTaxable + totalGst],
  ]);

  return [
    { name: 'GST Details (GSTR-1)', sheet: mainSheet },
    { name: 'Summary', sheet: summarySheet },
  ];
};

const buildProfitSheets = (data) => {
  const monthlyHeaders = ['Month', 'Revenue (₹)', 'Expenses (₹)', 'Gross Profit (₹)'];
  const monthlyRows = (data.monthly_trend || []).map((r) => [
    r.month, r.revenue, r.expenses, r.profit,
  ]);
  const mainSheet = XLSX.utils.aoa_to_sheet([monthlyHeaders, ...monthlyRows]);

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ['Metric', 'Value'],
    ['Total Revenue (₹)', data.revenue],
    ['Total Expenses (₹)', data.expenses],
    ['Gross Profit (₹)', data.gross_profit],
    [],
    ['Expense Category', 'Amount (₹)'],
    ...(data.expense_by_category || []).map((r) => [r.category, r.amount]),
  ]);

  return [
    { name: 'Monthly Trend', sheet: mainSheet },
    { name: 'Summary', sheet: summarySheet },
  ];
};

const buildInventorySheets = (data) => {
  const topHeaders = ['SKU', 'Title', 'Category', 'Current Stock', 'Selling Price (₹)', 'Qty Sold'];
  const topRows = (data.top_moving_items || []).map((r) => [
    r.sku, r.title, r.category || '', r.current_stock, r.selling_price, r.total_qty_sold,
  ]);
  const mainSheet = XLSX.utils.aoa_to_sheet([topHeaders, ...topRows]);

  const lowHeaders = ['SKU', 'Title', 'Category', 'Current Stock', 'Reorder Level', 'Selling Price (₹)'];
  const lowRows = (data.low_stock_items || []).map((r) => [
    r.sku, r.title, r.category || '', r.current_stock, r.reorder_level, r.selling_price,
  ]);
  const summarySheet = XLSX.utils.aoa_to_sheet([
    ['Metric', 'Value'],
    ['Total Items', data.total_items],
    ['Stock Value at Cost (₹)', data.total_stock_value_cost],
    ['Stock Value at Retail (₹)', data.total_stock_value_retail],
    ['Low Stock Items', (data.low_stock_items || []).length],
    [],
    ...([[' '], ['--- Low Stock Items ---'], lowHeaders, ...lowRows]),
  ]);

  return [
    { name: 'Top Moving Items', sheet: mainSheet },
    { name: 'Summary & Low Stock', sheet: summarySheet },
  ];
};

const buildCustomerSheets = (data) => {
  const topHeaders = ['Name', 'Phone', 'Customer Code', 'Membership', 'Total Spend (₹)', 'Visit Count'];
  const topRows = (data.top_customers || []).map((r) => [
    r.name, r.phone, r.customer_code, r.membership, r.total_spend, r.visit_count,
  ]);
  const mainSheet = XLSX.utils.aoa_to_sheet([topHeaders, ...topRows]);

  const ls = data.loyalty_stats || {};
  const summarySheet = XLSX.utils.aoa_to_sheet([
    ['Metric', 'Value'],
    ['Total Customers', data.total_customers],
    ['New Customers (Period)', data.new_customers_period],
    ['Total Loyalty Points', ls.total_points],
    ['Total Store Credit (₹)', ls.total_credit],
  ]);

  return [
    { name: 'Top Customers', sheet: mainSheet },
    { name: 'Summary', sheet: summarySheet },
  ];
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/erp/reports/export
// Build multi-sheet Excel workbook and stream as attachment
// Query param: type = sales | gst | profit | inventory | customers
// ─────────────────────────────────────────────────────────────────────────────
const exportReport = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    if (!businessId) return res.status(400).json({ message: 'Business context required' });

    const type = (req.query.type || '').toLowerCase();
    const validTypes = ['sales', 'gst', 'profit', 'inventory', 'customers'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        message: `type must be one of: ${validTypes.join(', ')}`,
      });
    }

    // Call the internal report function to get data
    let reportData;
    const fakeRes = {
      _body: null,
      _status: 200,
      status(code) { this._status = code; return this; },
      json(body) { this._body = body; return this; },
    };

    // Build a minimal fake request reusing same params
    const fakeReq = { query: req.query, tenant: req.tenant, user: req.user };

    switch (type) {
      case 'sales':
        await salesReport(fakeReq, fakeRes);
        break;
      case 'gst':
        await gstReport(fakeReq, fakeRes);
        break;
      case 'profit':
        await profitReport(fakeReq, fakeRes);
        break;
      case 'inventory':
        await inventoryReport(fakeReq, fakeRes);
        break;
      case 'customers':
        await customerReport(fakeReq, fakeRes);
        break;
    }

    if (fakeRes._status !== 200 || !fakeRes._body) {
      return res.status(fakeRes._status || 500).json(
        fakeRes._body || { message: 'Failed to generate report data' }
      );
    }

    const data = fakeRes._body;

    // Build workbook sheets based on type
    let sheets;
    switch (type) {
      case 'sales':
        sheets = buildSalesSheets(data);
        break;
      case 'gst':
        sheets = buildGstSheets(data);
        break;
      case 'profit':
        sheets = buildProfitSheets(data);
        break;
      case 'inventory':
        sheets = buildInventorySheets(data);
        break;
      case 'customers':
        sheets = buildCustomerSheets(data);
        break;
      default:
        sheets = [];
    }

    const wb = XLSX.utils.book_new();
    for (const { name, sheet } of sheets) {
      XLSX.utils.book_append_sheet(wb, sheet, name);
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `report-${type}-${dateStr}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    return res.send(buf);
  } catch (err) {
    console.error('exportReport error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

module.exports = {
  salesReport,
  gstReport,
  profitReport,
  inventoryReport,
  customerReport,
  exportReport,
};
