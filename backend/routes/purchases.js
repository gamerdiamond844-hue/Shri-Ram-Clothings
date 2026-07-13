'use strict';

const router = require('express').Router();
const { auth, requirePermission } = require('../middleware/auth');
const purchaseCtrl = require('../controllers/purchaseController');

// purchaseGuard: must be authenticated AND hold the erp.manage_suppliers permission
const purchaseGuard = [auth, requirePermission('erp.manage_suppliers')];

// GET  /api/erp/purchases           — list purchase orders
router.get('/', purchaseGuard, purchaseCtrl.listPurchases);

// POST /api/erp/purchases           — create a new purchase order
router.post('/', purchaseGuard, purchaseCtrl.createPurchase);

// POST /api/erp/purchases/:id/grn   — record a Goods Receipt Note
router.post('/:id/grn', purchaseGuard, purchaseCtrl.recordGRN);

// POST /api/erp/purchases/:id/return — record a purchase return
router.post('/:id/return', purchaseGuard, purchaseCtrl.purchaseReturn);

module.exports = router;
