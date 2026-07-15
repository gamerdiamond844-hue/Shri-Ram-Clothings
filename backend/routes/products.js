const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const { uploadProduct } = require('../config/cloudinary');
const {
  getProducts, getProduct, createProduct, updateProduct, deleteProduct,
  addReview, getProductReviews, getCategories, deleteProductImage, setPrimaryImage, addProductImages,
  getAdminReviews, exportReviews, updateReview, deleteReview, getReviewStats,
} = require('../controllers/productController');

router.get('/categories', getCategories);
router.get('/', getProducts);

// Admin review management
router.get('/admin/reviews/export', auth, requireRole('admin', 'super_admin'), exportReviews);
router.get('/admin/reviews', auth, requireRole('admin', 'super_admin'), getAdminReviews);
router.get('/admin/reviews/stats', auth, requireRole('admin', 'super_admin'), getReviewStats);
router.put('/admin/reviews/:reviewId', auth, requireRole('admin', 'super_admin'), updateReview);
router.delete('/admin/reviews/:reviewId', auth, requireRole('admin', 'super_admin'), deleteReview);

router.get('/:id/reviews', getProductReviews);
router.get('/:id', getProduct);
router.post('/:id', auth, requireRole('seller', 'admin', 'super_admin'), uploadProduct.array('images', 10), createProduct);
router.put('/:id', auth, uploadProduct.array('images', 10), updateProduct);
router.delete('/:id', auth, deleteProduct);
router.post('/:id/reviews', auth, uploadProduct.single('review_image'), addReview);

// Image management
router.post('/:id/images', auth, requireRole('admin', 'super_admin'), uploadProduct.array('images', 10), addProductImages);
router.delete('/:id/images/:imageId', auth, requireRole('admin', 'super_admin'), deleteProductImage);
router.put('/:id/images/:imageId/primary', auth, requireRole('admin', 'super_admin'), setPrimaryImage);

module.exports = router;
