const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { createRazorpayOrder, placeOrder, getMyOrders, getOrderById, validateCoupon } = require('../controllers/orderController');

router.post('/razorpay', auth, createRazorpayOrder);
router.post('/', auth, placeOrder);
router.get('/my', auth, getMyOrders);
router.get('/:id', auth, getOrderById);
router.post('/coupon/validate', auth, validateCoupon);

module.exports = router;
