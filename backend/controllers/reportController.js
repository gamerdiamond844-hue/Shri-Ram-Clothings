'use strict';

const { pool } = require('../config/db');
const XLSX = require('xlsx');

const getScopedBusinessId = (req) => req.tenant?.business_id || req.user?.business_id || null;
const parseDays = (q) => Math.max(1, Number(q?.days || q) || 7);

const buildDateRange = (query, alias = 's', dateColumn = 'created_at', startIndex = 1) => {
  const conditions = [];
  const values = [];
  if (query.from) {
    values.push(query.from);
    conditions.push(`${alias}.${dateColumn} >= $${startIndex + values.length - 1}::date`);
  }
  if (query.to) {
    values.push(query.to);
    conditions.push(`${alias}.${dateColumn} < ($${startIndex + values.length - 1}::date + INTERVAL '1 day')`);
  }
  return { clause: conditions.length ? conditions.join(' AND ') : '', values };
};

const salesReport = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    const range = buildDateRange(req.query, 's', 'created_at', 2);
    const useCustomRange = !!range.clause;

    const summaryQuery = [
      `SELECT COUNT(*) AS orders, COALESCE(SUM(total),0) AS revenue
         FROM src_erp_sales s
        WHERE ($1::int IS NULL OR s.business_id = $1)
          AND s.status = 'completed'`,
    ];
    const trendQuery = [
      `SELECT to_char(s.created_at::date,'YYYY-MM-DD') AS day,
              COUNT(*) AS bills,
              COALESCE(SUM(s.total),0) AS revenue
         FROM src_erp_sales s
        WHERE ($1::int IS NULL OR s.business_id = $1)
          AND s.status = 'completed'`,
    ];
    const paymentsQuery = [
      `SELECT COALESCE(s.payment_method,'unknown') AS payment_method,
              COALESCE(SUM(s.total),0) AS amount
         FROM src_erp_sales s
        WHERE ($1::int IS NULL OR s.business_id = $1)
          AND s.status = 'completed'`,
    ];

    const params = [businessId];
    if (useCustomRange) {
      summaryQuery.push(`AND ${range.clause}`);
      trendQuery.push(`AND ${range.clause}`);
      paymentsQuery.push(`AND ${range.clause}`);
      params.push(...range.values);
    } else {
      const days = parseDays(req.query);
      summaryQuery.push(`AND s.created_at >= NOW() - ($2::int || ' days')::interval`);
      trendQuery.push(`AND s.created_at >= NOW() - ($2::int || ' days')::interval`);
      paymentsQuery.push(`AND s.created_at >= NOW() - ($2::int || ' days')::interval`);
      params.push(days);
    }

    summaryQuery.push('');
    trendQuery.push('GROUP BY day ORDER BY day ASC LIMIT 31');
    paymentsQuery.push('GROUP BY payment_method ORDER BY amount DESC');

    const summaryRes = await pool.query(summaryQuery.join(' '), params);
    const trendRes = await pool.query(trendQuery.join(' '), params);
    const paymentsRes = await pool.query(paymentsQuery.join(' '), params);

    return res.json({
      summary: summaryRes.rows[0] || { orders: 0, revenue: 0 },
      trend: trendRes.rows || [],
      payments: paymentsRes.rows || [],
    });
  } catch (err) {
    console.error('salesReport error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

const gstReport = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);
    const result = await pool.query(
      `SELECT COALESCE(si.hsn_code,'') AS hsn_code,
              COALESCE(si.gst_rate,0) AS gst_rate,
              COUNT(DISTINCT s.id) AS invoice_count,
              COALESCE(SUM(si.quantity),0) AS units,
              COALESCE(SUM(si.line_total - si.tax_amount),0) AS taxable_value,
              COALESCE(SUM(si.tax_amount),0) AS total_gst,
              COALESCE(SUM(si.tax_amount) / 2,0) AS cgst,
              COALESCE(SUM(si.tax_amount) / 2,0) AS sgst,
              COALESCE(SUM(si.line_total),0) AS total_with_gst
         FROM src_erp_sale_items si
         JOIN src_erp_sales s ON s.id = si.sale_id
        WHERE ($1::int IS NULL OR s.business_id = $1)
          AND s.status = 'completed'
          AND s.created_at >= NOW() - INTERVAL '90 days'
        GROUP BY hsn_code, gst_rate
        ORDER BY total_gst DESC
        LIMIT 200`,
      [businessId]
    );
    return res.json({ gst_summary: result.rows || [] });
  } catch (err) {
    console.error('gstReport error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

const profitReport = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);

    const revenueRes = await pool.query(
      `SELECT COALESCE(SUM(total),0) AS revenue
         FROM src_erp_sales
        WHERE ($1::int IS NULL OR business_id = $1)
          AND status = 'completed'
          AND created_at >= NOW() - INTERVAL '30 days'`,
      [businessId]
    );

    const expenseRes = await pool.query(
      `SELECT COALESCE(SUM(amount),0) AS expenses
         FROM src_erp_expenses
        WHERE ($1::int IS NULL OR business_id = $1)
          AND expense_date >= NOW() - INTERVAL '30 days'`,
      [businessId]
    );

    const categoriesRes = await pool.query(
      `SELECT category, COALESCE(SUM(amount),0) AS amount
         FROM src_erp_expenses
        WHERE ($1::int IS NULL OR business_id = $1)
          AND expense_date >= NOW() - INTERVAL '30 days'
        GROUP BY category
        ORDER BY amount DESC
        LIMIT 12`,
      [businessId]
    );

    const monthlySalesRes = await pool.query(
      `SELECT to_char(created_at,'YYYY-MM') AS month, COALESCE(SUM(total),0) AS revenue
         FROM src_erp_sales
        WHERE ($1::int IS NULL OR business_id = $1)
          AND status = 'completed'
          AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '11 months'
        GROUP BY month
        ORDER BY month ASC`,
      [businessId]
    );

    const monthlyExpenseRes = await pool.query(
      `SELECT to_char(expense_date,'YYYY-MM') AS month, COALESCE(SUM(amount),0) AS expenses
         FROM src_erp_expenses
        WHERE ($1::int IS NULL OR business_id = $1)
          AND expense_date >= DATE_TRUNC('month', NOW()) - INTERVAL '11 months'
        GROUP BY month
        ORDER BY month ASC`,
      [businessId]
    );

    const trendMap = new Map();
    monthlySalesRes.rows.forEach((row) => {
      trendMap.set(row.month, { month: row.month, revenue: Number(row.revenue), expenses: 0, profit: 0 });
    });
    monthlyExpenseRes.rows.forEach((row) => {
      const current = trendMap.get(row.month) || { month: row.month, revenue: 0, expenses: 0, profit: 0 };
      current.expenses = Number(row.expenses);
      current.profit = Number(current.revenue) - Number(current.expenses);
      trendMap.set(row.month, current);
    });

    const monthlyTrend = Array.from(trendMap.values()).map((row) => ({
      ...row,
      profit: Number(row.revenue) - Number(row.expenses),
    }));

    const revenue = Number(revenueRes.rows[0].revenue || 0);
    const expenses = Number(expenseRes.rows[0].expenses || 0);

    return res.json({
      revenue,
      expenses,
      gross_profit: revenue - expenses,
      expense_by_category: categoriesRes.rows.map((row) => ({ category: row.category, amount: Number(row.amount) })),
      monthly_trend: monthlyTrend,
    });
  } catch (err) {
    console.error('profitReport error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

const inventoryReport = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);

    const summaryRes = await pool.query(
      `SELECT
         COUNT(*) AS total_items,
         COALESCE(SUM(COALESCE(purchase_price,0) * COALESCE(current_stock,0)),0) AS total_stock_value_cost,
         COALESCE(SUM(COALESCE(selling_price,0) * COALESCE(current_stock,0)),0) AS total_stock_value_retail
       FROM src_erp_inventory_items i
       WHERE ($1::int IS NULL OR business_id = $1)`,
      [businessId]
    );

    const topRes = await pool.query(
      `SELECT i.id, i.title, i.sku, i.category, COALESCE(SUM(si.quantity),0) AS total_qty_sold, COALESCE(i.current_stock,0) AS current_stock, COALESCE(i.selling_price,0) AS selling_price
         FROM src_erp_sale_items si
         JOIN src_erp_sales s ON s.id = si.sale_id
         LEFT JOIN src_erp_inventory_items i ON i.id = si.inventory_item_id
        WHERE ($1::int IS NULL OR s.business_id = $1)
          AND s.status = 'completed'
          AND s.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY i.id, i.title, i.sku, i.category, i.current_stock, i.selling_price
        ORDER BY total_qty_sold DESC
        LIMIT 10`,
      [businessId]
    );

    const lowStockRes = await pool.query(
      `SELECT id, title, sku, category, current_stock, reorder_level, selling_price
         FROM src_erp_inventory_items
        WHERE ($1::int IS NULL OR business_id = $1)
          AND COALESCE(current_stock,0) <= COALESCE(reorder_level,0)
        ORDER BY current_stock ASC
        LIMIT 10`,
      [businessId]
    );

    const summary = summaryRes.rows[0] || { total_items: 0, total_stock_value_cost: 0, total_stock_value_retail: 0 };

    return res.json({
      total_items: Number(summary.total_items || 0),
      total_stock_value_cost: Number(summary.total_stock_value_cost || 0),
      total_stock_value_retail: Number(summary.total_stock_value_retail || 0),
      top_moving_items: topRes.rows || [],
      low_stock_items: lowStockRes.rows || [],
    });
  } catch (err) {
    console.error('inventoryReport error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

const customerReport = async (req, res) => {
  try {
    const businessId = getScopedBusinessId(req);

    const totalRes = await pool.query(
      `SELECT COUNT(*) AS total_customers,
              COALESCE(SUM(loyalty_points),0) AS total_points,
              COALESCE(SUM(store_credit),0) AS total_credit
         FROM src_erp_customers
        WHERE ($1::int IS NULL OR business_id = $1)`,
      [businessId]
    );

    const newRes = await pool.query(
      `SELECT COUNT(*) AS new_customers_period
         FROM src_erp_customers
        WHERE ($1::int IS NULL OR business_id = $1)
          AND created_at >= NOW() - INTERVAL '30 days'`,
      [businessId]
    );

    const topRes = await pool.query(
      `SELECT c.id,
              c.name,
              c.phone,
              c.customer_code,
              c.membership,
              COALESCE(SUM(s.total),0) AS total_spend,
              COUNT(s.id) AS visit_count
         FROM src_erp_customers c
         LEFT JOIN src_erp_sales s ON s.customer_id = c.id AND s.status = 'completed'
        WHERE ($1::int IS NULL OR c.business_id = $1)
        GROUP BY c.id, c.name, c.phone, c.customer_code, c.membership
        ORDER BY total_spend DESC
        LIMIT 10`,
      [businessId]
    );

    const summary = totalRes.rows[0] || { total_customers: 0, total_points: 0, total_credit: 0 };

    return res.json({
      total_customers: Number(summary.total_customers || 0),
      new_customers_period: Number(newRes.rows[0]?.new_customers_period || 0),
      loyalty_stats: {
        total_points: Number(summary.total_points || 0),
        total_credit: Number(summary.total_credit || 0),
      },
      top_customers: topRes.rows || [],
    });
  } catch (err) {
    console.error('customerReport error:', err.message);
    return res.status(500).json({ message: err.message });
  }
};

const exportReport = async (req, res) => {
  try {
    const type = req.query.type || 'sales';
    const businessId = getScopedBusinessId(req);
    const from = req.query.from;
    const to = req.query.to;
    const wb = XLSX.utils.book_new();

    const salesFilter = [];
    const salesParams = [businessId];
    let rangeClause = `($1::int IS NULL OR s.business_id = $1)`;

    if (from) {
      salesParams.push(from);
      rangeClause += ` AND s.created_at >= $${salesParams.length}::date`;
    }
    if (to) {
      salesParams.push(to);
      rangeClause += ` AND s.created_at < ($${salesParams.length}::date + INTERVAL '1 day')`;
    }

    if (type === 'sales' || type === 'full') {
      const salesData = await pool.query(
        `SELECT s.id,
                s.bill_no,
                to_char(s.created_at,'YYYY-MM-DD') AS date,
                s.payment_method,
                s.status,
                s.total,
                s.discount_amount,
                s.tax_amount,
                s.round_off,
                s.customer_id,
                s.cashier_id,
                s.notes
           FROM src_erp_sales s
          WHERE ${rangeClause}
          ORDER BY s.created_at DESC
          LIMIT 1000`,
        salesParams
      );
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salesData.rows), 'Sales');
    }

    if (type === 'gst' || type === 'full') {
      const gstParams = [businessId];
      let gstRange = `($1::int IS NULL OR s.business_id = $1)`;
      if (from) {
        gstParams.push(from);
        gstRange += ` AND s.created_at >= $${gstParams.length}::date`;
      }
      if (to) {
        gstParams.push(to);
        gstRange += ` AND s.created_at < ($${gstParams.length}::date + INTERVAL '1 day')`;
      }
      const gstData = await pool.query(
        `SELECT COALESCE(si.hsn_code,'') AS hsn_code,
                COALESCE(si.gst_rate,0) AS gst_rate,
                COALESCE(SUM(si.quantity),0) AS units,
                COALESCE(SUM(si.line_total - si.tax_amount),0) AS taxable_value,
                COALESCE(SUM(si.tax_amount),0) AS total_gst,
                COALESCE(SUM(si.tax_amount) / 2,0) AS cgst,
                COALESCE(SUM(si.tax_amount) / 2,0) AS sgst,
                COALESCE(SUM(si.line_total),0) AS total_with_gst
           FROM src_erp_sale_items si
           JOIN src_erp_sales s ON s.id = si.sale_id
          WHERE ${gstRange}
            AND s.status = 'completed'
          GROUP BY hsn_code, gst_rate
          ORDER BY total_gst DESC`,
        gstParams
      );
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(gstData.rows), 'GST');
    }

    if (type === 'profit' || type === 'full') {
      const profitParams = [businessId];
      let profitSalesRange = `($1::int IS NULL OR business_id = $1)`;
      if (from) {
        profitParams.push(from);
        profitSalesRange += ` AND created_at >= $${profitParams.length}::date`;
      }
      if (to) {
        profitParams.push(to);
        profitSalesRange += ` AND created_at < ($${profitParams.length}::date + INTERVAL '1 day')`;
      }

      const revenueData = await pool.query(
        `SELECT to_char(created_at,'YYYY-MM-DD') AS date, total
           FROM src_erp_sales
          WHERE ${profitSalesRange}
            AND status = 'completed'
          ORDER BY created_at DESC
          LIMIT 1000`,
        profitParams
      );

      const expenseParams = [businessId];
      let expenseRange = `($1::int IS NULL OR business_id = $1)`;
      if (from) {
        expenseParams.push(from);
        expenseRange += ` AND expense_date >= $${expenseParams.length}::date`;
      }
      if (to) {
        expenseParams.push(to);
        expenseRange += ` AND expense_date <= $${expenseParams.length}::date`;
      }

      const expenseData = await pool.query(
        `SELECT expense_date AS date, amount, category, title, payment_mode, notes
           FROM src_erp_expenses
          WHERE ${expenseRange}
          ORDER BY expense_date DESC
          LIMIT 1000`,
        expenseParams
      );

      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(revenueData.rows), 'Revenue');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenseData.rows), 'Expenses');
    }

    if (type === 'inventory' || type === 'full') {
      const invData = await pool.query(
        `SELECT id,
                title,
                sku,
                category,
                barcode,
                current_stock,
                reorder_level,
                purchase_price,
                selling_price,
                gst_rate,
                hsn_code
           FROM src_erp_inventory_items
          WHERE ($1::int IS NULL OR business_id = $1)
          ORDER BY title ASC`,
        [businessId]
      );
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invData.rows), 'Inventory');
    }

    if (type === 'customers' || type === 'full') {
      const custData = await pool.query(
        `SELECT id,
                customer_code,
                name,
                phone,
                email,
                gst_number,
                membership,
                loyalty_points,
                store_credit,
                outstanding_amount,
                created_at
           FROM src_erp_customers
          WHERE ($1::int IS NULL OR business_id = $1)
          ORDER BY created_at DESC
          LIMIT 1000`,
        [businessId]
      );
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(custData.rows), 'Customers');
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `reports-${type}-${new Date().toISOString().slice(0,10)}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
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
