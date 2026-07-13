'use strict';

const router = require('express').Router();
const { auth, requirePermission } = require('../middleware/auth');
const reportCtrl = require('../controllers/reportController');

// Guard: authenticated + has erp.view_reports permission
const reportsGuard = [auth, requirePermission('erp.view_reports')];

// GET /api/erp/reports/sales       — sales summary + daily trend + payment breakdown
router.get('/sales',     ...reportsGuard, reportCtrl.salesReport);

// GET /api/erp/reports/gst         — GST summary by HSN code (GSTR-1 / GSTR-3B)
router.get('/gst',       ...reportsGuard, reportCtrl.gstReport);

// GET /api/erp/reports/profit      — revenue vs expenses + monthly trend
router.get('/profit',    ...reportsGuard, reportCtrl.profitReport);

// GET /api/erp/reports/inventory   — stock valuation + low stock + top movers
router.get('/inventory', ...reportsGuard, reportCtrl.inventoryReport);

// GET /api/erp/reports/customers   — customer stats + top customers + loyalty
router.get('/customers', ...reportsGuard, reportCtrl.customerReport);

// GET /api/erp/reports/export?type=sales|gst|profit|inventory|customers
//     — multi-sheet Excel workbook streamed as attachment
router.get('/export',    ...reportsGuard, reportCtrl.exportReport);

module.exports = router;
