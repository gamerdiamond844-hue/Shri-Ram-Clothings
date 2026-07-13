'use strict';

const router = require('express').Router();
const { auth, requireAnyPermission } = require('../middleware/auth');
const returnCtrl = require('../controllers/returnController');

// posGuard: authenticated + any one of the POS/orders/finance permissions
const posGuard = [
  auth,
  requireAnyPermission('erp.manage_pos', 'erp.manage_orders', 'erp.manage_finance'),
];

// GET  /api/erp/returns        — paginated list with optional search
router.get('/',  ...posGuard, returnCtrl.listReturns);

// POST /api/erp/returns        — create return (refund | store_credit | exchange)
router.post('/', ...posGuard, returnCtrl.createReturn);

module.exports = router;
