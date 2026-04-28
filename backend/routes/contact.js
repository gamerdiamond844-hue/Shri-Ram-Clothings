const router = require('express').Router();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { cloudinary } = require('../config/cloudinary');
const { submitQuery } = require('../controllers/queryController');
const { auth } = require('../middleware/auth');

const attachStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'shriram-clothings/attachments', allowed_formats: ['jpg','jpeg','png','pdf','webp'], transformation: [{ quality: 'auto' }] },
});
const uploadAttach = multer({ storage: attachStorage, limits: { fileSize: 5 * 1024 * 1024 } });

// Optional auth — logged-in users get user_id attached
const optionalAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return next();
  try {
    const jwt = require('jsonwebtoken');
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {}
  next();
};

router.post('/', optionalAuth, uploadAttach.single('attachment'), submitQuery);

module.exports = router;
