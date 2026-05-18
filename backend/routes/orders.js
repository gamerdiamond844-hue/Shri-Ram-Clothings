const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { createPaytmInitiate, paytmCallback, placeOrder, getMyOrders, getOrderById, validateCoupon } = require('../controllers/orderController');

router.post('/paytm/initiate', auth, createPaytmInitiate);
router.post('/paytm/callback', paytmCallback); // Paytm will POST here (no auth)
router.post('/', auth, placeOrder);
router.get('/my', auth, getMyOrders);
router.get('/:id', auth, getOrderById);
router.post('/coupon/validate', auth, validateCoupon);

module.exports = router;
