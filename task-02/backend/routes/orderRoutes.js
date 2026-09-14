const express = require('express');
const {
  createOrder,
  payOrder,
  cancelOrder,
  refundOrder,
  getOrder,
  listOrders,
} = require('../controllers/orderController');

const router = express.Router();

router.post('/', createOrder); // checkout: reserve stock, create order
router.post('/:id/pay', payOrder);
router.post('/:id/cancel', cancelOrder);
router.post('/:id/refund', refundOrder);
router.get('/', listOrders); // ?userId= for order history
router.get('/:id', getOrder);

module.exports = router;
