'use strict';

const router = require('express').Router();
const { auth, requirePermission } = require('../middleware/auth');
const attCtrl = require('../controllers/attendanceController');

const attendanceGuard = [auth, requirePermission('erp.manage_users')];

router.get('/export', ...attendanceGuard, attCtrl.exportAttendance);
router.get('/',       ...attendanceGuard, attCtrl.getMonthlyGrid);
router.post('/',      ...attendanceGuard, attCtrl.markAttendance);

module.exports = router;
