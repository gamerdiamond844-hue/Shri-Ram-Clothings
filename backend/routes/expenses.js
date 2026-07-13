'use strict';

const router = require('express').Router();
const { auth, requirePermission } = require('../middleware/auth');
const expCtrl = require('../controllers/expenseController');

const expenseGuard = [auth, requirePermission('erp.manage_finance')];

router.get('/export', ...expenseGuard, expCtrl.exportExpenses);
router.get('/',       ...expenseGuard, expCtrl.listExpenses);
router.post('/',      ...expenseGuard, expCtrl.createExpense);
router.put('/:id',    ...expenseGuard, expCtrl.updateExpense);
router.delete('/:id', ...expenseGuard, expCtrl.deleteExpense);

module.exports = router;
