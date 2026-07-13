'use strict';

const router = require('express').Router();
const { auth, requirePermission } = require('../middleware/auth');
const empCtrl = require('../controllers/employeeController');

const employeeGuard = [auth, requirePermission('erp.manage_users')];

router.get('/',    ...employeeGuard, empCtrl.listEmployees);
router.post('/',   ...employeeGuard, empCtrl.createEmployee);
router.put('/:id', ...employeeGuard, empCtrl.updateEmployee);

module.exports = router;
