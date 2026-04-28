const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const { uploadProduct } = require('../config/cloudinary');
const {
  getProducts, getProduct, createProduct, updateProduct, deleteProduct,
  addReview, getCategories, deleteProductImage, setPrimaryImage, addProductImages,
} = require('../controllers/productController');

router.get('/categories', getCategories);
router.get('/', getProducts);
router.get('/:id', getProduct);
router.post('/', auth, requireRole('seller', 'admin'), uploadProduct.array('images', 10), createProduct);
router.put('/:id', auth, uploadProduct.array('images', 10), updateProduct);
router.delete('/:id', auth, deleteProduct);
router.post('/:id/reviews', auth, addReview);

// Image management
router.post('/:id/images', auth, requireRole('admin'), uploadProduct.array('images', 10), addProductImages);
router.delete('/:id/images/:imageId', auth, requireRole('admin'), deleteProductImage);
router.put('/:id/images/:imageId/primary', auth, requireRole('admin'), setPrimaryImage);

module.exports = router;
