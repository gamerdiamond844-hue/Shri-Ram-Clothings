'use strict';

const router = require('express').Router();
const { auth, requireAnyPermission } = require('../middleware/auth');
const salesCtrl = require('../controllers/salesOrderController');

const salesGuard = [auth, requireAnyPermission('erp.manage_orders', 'erp.manage_pos', 'erp.manage_finance')];

// NOTE: /export MUST be before /:id to avoid Express matching 'export' as an id
router.get('/export',           ...salesGuard, salesCtrl.exportSales);
router.get('/',                 ...salesGuard, salesCtrl.listSales);
router.get('/:id',              ...salesGuard, salesCtrl.getSale);
router.post('/:id/void',        ...salesGuard, salesCtrl.voidSale);
router.post('/:id/credit-note', ...salesGuard, salesCtrl.issueCreditNote);

module.exports = router;
