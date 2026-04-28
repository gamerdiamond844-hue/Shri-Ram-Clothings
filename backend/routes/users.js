const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { getWishlist, toggleWishlist, getAddresses, addAddress, updateAddress, deleteAddress, getNotifications, markNotificationsRead } = require('../controllers/userController');

router.get('/wishlist', auth, getWishlist);
router.post('/wishlist', auth, toggleWishlist);
router.get('/addresses', auth, getAddresses);
router.post('/addresses', auth, addAddress);
router.put('/addresses/:id', auth, updateAddress);
router.delete('/addresses/:id', auth, deleteAddress);
router.get('/notifications', auth, getNotifications);
router.put('/notifications/read', auth, markNotificationsRead);

module.exports = router;
