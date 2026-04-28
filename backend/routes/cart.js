const router = require('express').Router();
const { auth } = require('../middleware/auth');
const { getCart, addToCart, updateCart, removeFromCart, clearCart } = require('../controllers/cartController');

router.get('/', auth, getCart);
router.post('/', auth, addToCart);
router.put('/:id', auth, updateCart);
router.delete('/clear', auth, clearCart);
router.delete('/:id', auth, removeFromCart);

module.exports = router;
