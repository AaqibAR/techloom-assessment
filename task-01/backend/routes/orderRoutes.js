const express = require('express');
const {
  createOrder,
  payOrder,
  cancelOrder,
  getOrder,
  listOrders,
} = require('../controllers/orderController');

const router = express.Router();

router.post('/', createOrder); // checkout: reserve stock, create order
router.post('/:id/pay', payOrder);
router.post('/:id/cancel', cancelOrder);
router.get('/', listOrders);
router.get('/:id', getOrder);

module.exports = router;
