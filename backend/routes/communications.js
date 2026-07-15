const router = require('express').Router();
const { auth, requireRole, requirePermission, requireAnyPermission } = require('../middleware/auth');
const comms = require('../controllers/communicationsController');

const adminRoles = ['admin', 'super_admin', 'business_owner', 'store_admin', 'store_manager', 'cashier', 'warehouse_manager', 'accountant', 'employee'];
const adminGuard = [auth, requireRole(...adminRoles)];

router.get('/chat/messages', ...adminGuard, comms.listChatMessages);
router.post('/chat/messages', ...adminGuard, comms.createChatMessage);

router.get('/users/search', ...adminGuard, comms.searchUsers);
router.post('/private-threads', ...adminGuard, comms.createPrivateThread);
router.get('/private-threads', ...adminGuard, comms.listPrivateThreads);
router.get('/private-threads/:threadId/messages', ...adminGuard, comms.listPrivateMessages);
router.post('/private-threads/:threadId/messages', ...adminGuard, comms.sendPrivateMessage);
router.get('/admin/private-threads', ...adminGuard, comms.adminListAllThreads);

router.get('/meetings', ...adminGuard, comms.listMeetings);
router.post('/meetings', ...adminGuard, comms.createMeeting);

module.exports = router;
