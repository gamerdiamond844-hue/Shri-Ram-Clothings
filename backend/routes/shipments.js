const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const s = require('../controllers/shipmentController');

const adminGuard = [auth, requireRole('admin')];

// User routes
router.get('/:id/tracking', auth, s.getTracking);
router.post('/:id/cancel', auth, s.cancelOrder);

// Admin routes
router.post('/:id/ship', ...adminGuard, s.shipOrder);
router.post('/:id/admin-cancel', ...adminGuard, s.adminCancelOrder);
router.post('/sync', ...adminGuard, async (req, res) => {
  // Fire and forget — runs in background
  s.syncTracking().catch(() => {});
  res.json({ message: 'Sync started' });
});

module.exports = router;
