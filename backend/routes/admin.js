const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const { uploadProduct } = require('../config/cloudinary');
const admin = require('../controllers/adminController');
const { updateProduct, deleteProduct: deleteProductCtrl } = require('../controllers/productController');

const guard = [auth, requireRole('admin')];

router.get('/stats', ...guard, admin.getStats);
router.get('/analytics', ...guard, admin.getAnalytics);
router.get('/analytics/export', ...guard, admin.exportAnalytics);
router.get('/users', ...guard, admin.getUsers);
router.get('/users/stats', ...guard, admin.getUserStats);
router.get('/users/export', ...guard, admin.exportUsers);
router.get('/users/:id', ...guard, admin.getUserDetail);
router.put('/users/:id/ban', ...guard, admin.banUser);
router.post('/users/:id/notify', ...guard, admin.sendUserNotification);
router.delete('/users/:id', ...guard, admin.deleteUser);
router.get('/products', ...guard, admin.getAdminProducts);
// Full product update (title, price, images, sizes) — uses productController
router.put('/products/:id', ...guard, uploadProduct.array('images', 10), updateProduct);
router.delete('/products/:id', ...guard, admin.deleteAdminProduct);
router.get('/orders', ...guard, admin.getAdminOrders);
router.put('/orders/:id/status', ...guard, admin.updateOrderStatus);
router.get('/categories', ...guard, admin.getAdminCategories);
router.post('/categories', ...guard, uploadProduct.single('image'), admin.createCategory);
router.put('/categories/:id', ...guard, uploadProduct.single('image'), admin.updateCategory);
router.get('/coupons', ...guard, admin.getCoupons);
router.post('/coupons', ...guard, admin.createCoupon);
router.put('/coupons/:id/toggle', ...guard, admin.toggleCoupon);
router.delete('/coupons/:id', ...guard, admin.deleteCoupon);
router.get('/logs', ...guard, admin.getActivityLogs);

// ── Customer Queries ──────────────────────────────────────────────────────────
const q = require('../controllers/queryController');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary } = require('../config/cloudinary');
const attachStorage = new CloudinaryStorage({ cloudinary, params: { folder: 'shriram-clothings/attachments', allowed_formats: ['jpg','jpeg','png','pdf','webp'], transformation: [{ quality: 'auto' }] } });
const uploadAttach = multer({ storage: attachStorage, limits: { fileSize: 5 * 1024 * 1024 } });

// Public
router.post('/queries', uploadAttach.single('attachment'), q.submitQuery);
router.get('/queries/track', q.trackQuery);
// Admin
router.get('/queries',          ...guard, q.getQueries);
router.get('/queries/stats',    ...guard, q.getQueryStats);
router.get('/queries/export',   ...guard, q.exportQueries);
router.get('/queries/:id',      ...guard, q.getQuery);
router.put('/queries/:id',      ...guard, q.updateQuery);
router.post('/queries/:id/reply', ...guard, q.replyQuery);
router.delete('/queries/:id',   ...guard, q.deleteQuery);

module.exports = router;
