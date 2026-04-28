const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { uploadAvatar } = require('../config/cloudinary');
const { register, login, getMe, updateProfile, changePassword, forgotPassword, resetPassword, googleLogin } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/me', auth, getMe);
router.put('/profile', auth, uploadAvatar.single('avatar'), updateProfile);
router.put('/password', auth, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
