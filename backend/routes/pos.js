'use strict';

const router = require('express').Router();
const { auth, requireRole, requireAnyPermission } = require('../middleware/auth');
const pos = require('../controllers/posController');

const adminRoles = [
  'admin', 'super_admin', 'business_owner', 'store_admin',
  'store_manager', 'cashier', 'warehouse_manager', 'accountant', 'employee',
];
const adminGuard = [auth, requireRole(...adminRoles)];
const posGuard = [...adminGuard, requireAnyPermission('erp.manage_pos', 'erp.manage_orders', 'erp.manage_finance')];

router.get('/search', ...posGuard, pos.searchProducts);
router.post('/sale', ...posGuard, pos.createSale);
router.post('/hold', ...posGuard, pos.holdBill);
router.get('/holds', ...posGuard, pos.listHolds);
router.post('/holds/:holdCode/resume', ...posGuard, pos.resumeHold);
router.delete('/holds/:holdCode', ...posGuard, pos.deleteHold);

module.exports = router;
