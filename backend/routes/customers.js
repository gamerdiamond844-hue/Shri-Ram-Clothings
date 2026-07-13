'use strict';

const router = require('express').Router();
const { auth, requireAnyPermission } = require('../middleware/auth');
const customerCtrl = require('../controllers/customerErpController');

// Guard: authenticated + any of erp.manage_orders or erp.manage_users
const customerGuard = [auth, requireAnyPermission('erp.manage_orders', 'erp.manage_users')];

// NOTE: /export MUST be registered before /:id routes so Express doesn't
// treat the literal string "export" as an :id parameter.
router.get('/export',        ...customerGuard, customerCtrl.exportCustomers);

router.get('/',              ...customerGuard, customerCtrl.listCustomers);
router.post('/',             ...customerGuard, customerCtrl.createCustomer);
router.put('/:id',           ...customerGuard, customerCtrl.updateCustomer);
router.get('/:id/history',   ...customerGuard, customerCtrl.getHistory);
router.post('/:id/adjust',   ...customerGuard, customerCtrl.adjustBalance);

module.exports = router;
