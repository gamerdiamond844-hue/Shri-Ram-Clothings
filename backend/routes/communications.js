const router = require('express').Router();
const { auth, requireRole, requirePermission, requireAnyPermission } = require('../middleware/auth');
const comms = require('../controllers/communicationsController');

const adminRoles = ['admin', 'super_admin', 'business_owner', 'store_admin', 'store_manager', 'cashier', 'warehouse_manager', 'accountant', 'employee'];
const adminGuard = [auth, requireRole(...adminRoles)];

router.get('/chat/messages', ...adminGuard, comms.listChatMessages);
router.post('/chat/messages', ...adminGuard, comms.createChatMessage);
router.get('/meetings', ...adminGuard, comms.listMeetings);
router.post('/meetings', ...adminGuard, comms.createMeeting);

module.exports = router;
