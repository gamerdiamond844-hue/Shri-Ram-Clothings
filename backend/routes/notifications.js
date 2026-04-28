const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const n = require('../controllers/notificationController');

const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try { req.user = require('jsonwebtoken').verify(token, process.env.JWT_SECRET); } catch {}
  }
  next();
};

const guard = [auth, requireRole('admin')];

// Public
router.get('/vapid-key',    n.getVapidKey);
router.post('/subscribe',   optionalAuth, n.subscribe);
router.post('/unsubscribe', n.unsubscribe);

// Admin
router.get('/admin/stats',           ...guard, n.getNotifStats);
router.get('/admin/campaigns',       ...guard, n.getCampaigns);
router.post('/admin/campaigns',      ...guard, n.createCampaign);
router.post('/admin/campaigns/:id/send', ...guard, n.sendCampaign);
router.delete('/admin/campaigns/:id',    ...guard, n.deleteCampaign);

module.exports = router;
