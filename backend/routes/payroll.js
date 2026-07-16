'use strict';

const router = require('express').Router();
const { auth, requirePermission } = require('../middleware/auth');
const payrollCtrl = require('../controllers/payrollController');

const guard = [auth, requirePermission('erp.manage_users')];

router.get('/',           ...guard, payrollCtrl.listPayroll);
router.post('/',          ...guard, payrollCtrl.upsertPayroll);
router.patch('/:id/pay',  ...guard, payrollCtrl.markPaid);
router.delete('/:id',     ...guard, payrollCtrl.deletePayroll);
router.get('/export',     ...guard, payrollCtrl.exportPayroll);

module.exports = router;
