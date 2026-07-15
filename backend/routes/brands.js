'use strict';

const router = require('express').Router();
const { auth, requirePermission } = require('../middleware/auth');
const brandCtrl = require('../controllers/brandController');

const brandGuard = [auth, requirePermission('erp.manage_inventory')];

router.get('/', ...brandGuard, brandCtrl.listBrands);
router.post('/', ...brandGuard, brandCtrl.createBrand);
router.put('/:id', ...brandGuard, brandCtrl.updateBrand);
router.delete('/:id', ...brandGuard, brandCtrl.deleteBrand);

module.exports = router;
