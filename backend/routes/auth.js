const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { uploadAvatar } = require('../config/cloudinary');
const { authRateLimit } = require('../middleware/rateLimiter');
const { register, login, getMe, updateProfile, changePassword, forgotPassword, resetPassword, googleLogin } = require('../controllers/authController');

router.post('/register',       authRateLimit, register);
router.post('/login',          authRateLimit, login);
router.post('/google',         authRateLimit, googleLogin);
router.get('/me',              auth, getMe);
router.put('/profile',         auth, uploadAvatar.single('avatar'), updateProfile);
router.put('/password',        auth, changePassword);
router.post('/forgot-password', authRateLimit, forgotPassword);
router.post('/reset-password',  authRateLimit, resetPassword);

module.exports = router;
