const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary').cloudinary;
const hp = require('../controllers/homepageController');

const guard = [auth, requireRole('admin')];

// Cloudinary storage for banners (images)
const bannerStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'shriram-clothings/banners', allowed_formats: ['jpg','jpeg','png','webp'], transformation: [{ quality: 'auto', fetch_format: 'auto' }] },
});

// Cloudinary storage for reels (videos + thumbnails)
const reelStorage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => ({
    folder: 'shriram-clothings/reels',
    resource_type: file.mimetype.startsWith('video') ? 'video' : 'image',
    allowed_formats: file.mimetype.startsWith('video') ? ['mp4','mov','webm'] : ['jpg','jpeg','png','webp'],
  }),
});

const uploadBanner = multer({ storage: bannerStorage, limits: { fileSize: 10 * 1024 * 1024 } })
  .fields([{ name: 'desktop', maxCount: 1 }, { name: 'mobile', maxCount: 1 }]);

const uploadReel = multer({ storage: reelStorage, limits: { fileSize: 100 * 1024 * 1024 } })
  .fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]);

// ── Public routes (homepage reads) ───────────────────────────────────────────
router.get('/banners',  hp.getActiveBanners);
router.get('/sections', hp.getActiveSections);
router.get('/reels',    hp.getActiveReels);
router.get('/settings', hp.getSettings);

// ── Admin routes ──────────────────────────────────────────────────────────────
// Banners
router.get('/admin/banners',           ...guard, hp.getBanners);
router.post('/admin/banners',          ...guard, uploadBanner, hp.createBanner);
router.put('/admin/banners/:id',       ...guard, uploadBanner, hp.updateBanner);
router.delete('/admin/banners/:id',    ...guard, hp.deleteBanner);
router.put('/admin/banners/reorder',   ...guard, hp.reorderBanners);

// Sections
router.get('/admin/sections',          ...guard, hp.getSections);
router.post('/admin/sections',         ...guard, hp.createSection);
router.put('/admin/sections/:id',      ...guard, hp.updateSection);
router.delete('/admin/sections/:id',   ...guard, hp.deleteSection);
router.put('/admin/sections/reorder',  ...guard, hp.reorderSections);

// Reels
router.get('/admin/reels',             ...guard, hp.getReels);
router.post('/admin/reels',            ...guard, uploadReel, hp.createReel);
router.put('/admin/reels/:id',         ...guard, uploadReel, hp.updateReel);
router.delete('/admin/reels/:id',      ...guard, hp.deleteReel);

// Settings
router.get('/admin/settings',          ...guard, hp.getSettings);
router.put('/admin/settings',          ...guard, hp.updateSettings);

module.exports = router;
