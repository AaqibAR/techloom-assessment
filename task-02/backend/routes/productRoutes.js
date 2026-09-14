const express = require('express');
const {
  createProduct,
  getProducts,
  getProduct,
  getCategories,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');

const router = express.Router();

router.post('/', createProduct);
router.get('/categories', getCategories);
router.get('/', getProducts);
router.get('/:id', getProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;
