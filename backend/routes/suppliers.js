'use strict';

const router = require('express').Router();
const { auth, requirePermission } = require('../middleware/auth');
const supplierCtrl = require('../controllers/supplierController');

// Guard: must be authenticated + hold erp.manage_suppliers permission
const supplierGuard = [auth, requirePermission('erp.manage_suppliers')];

router.get('/',           ...supplierGuard, supplierCtrl.listSuppliers);
router.post('/',          ...supplierGuard, supplierCtrl.createSupplier);
router.put('/:id',        ...supplierGuard, supplierCtrl.updateSupplier);
router.get('/:id/ledger', ...supplierGuard, supplierCtrl.getSupplierLedger);

module.exports = router;
