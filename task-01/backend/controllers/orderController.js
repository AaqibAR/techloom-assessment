const Order = require('../models/Order');
const { reserveItems, releaseItems } = require('../services/stockService');
const { processPayment } = require('../services/paymentService');
const { STATUSES, assertTransition } = require('../services/orderStateMachine');

const RESERVATION_TTL_MS = (Number(process.env.RESERVATION_TTL_MINUTES) || 5) * 60 * 1000;

/**
 * Enters checkout: reserves stock for every item in the cart and creates a
 * Reserved order. `idempotencyKey` should be generated client-side once per
 * checkout attempt and resent on retry — the unique index on the Order model
 * makes a duplicate submission return the original order instead of a second
 * reservation.
 */
async function createOrder(req, res) {
  const { items, idempotencyKey } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' });
  }
  if (!idempotencyKey) {
    return res.status(400).json({ error: 'idempotencyKey is required' });
  }

  try {
    // If this key was already used, hand back the existing order rather
    // than attempting (and failing) a second reservation.
    const existing = await Order.findOne({ idempotencyKey });
    if (existing) {
      return res.status(200).json(existing);
    }

    const orderItems = await reserveItems(items);

    const order = await Order.create({
      items: orderItems,
      status: STATUSES.RESERVED,
      reservationExpiresAt: new Date(Date.now() + RESERVATION_TTL_MS),
      idempotencyKey,
    });

    res.status(201).json(order);
  } catch (err) {
    if (err.code === 11000) {
      // Race: two requests with the same key both got past the findOne
      // check. Whichever lost the unique-index race returns the winner.
      const existing = await Order.findOne({ idempotencyKey });
      return res.status(200).json(existing);
    }
    if (err.code === 'INSUFFICIENT_STOCK') {
      return res.status(409).json({ error: 'Insufficient stock', productId: err.productId });
    }
    res.status(500).json({ error: err.message });
  }
}

/**
 * Attempts mock payment on a Reserved order. Handles all three gateway
 * outcomes distinctly and rejects payment attempts on orders that are not
 * currently payable (covers duplicate payment submissions too).
 */
async function payOrder(req, res) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.status !== STATUSES.RESERVED) {
      return res.status(409).json({
        error: `Order is not payable in status '${order.status}' (duplicate or stale payment attempt)`,
      });
    }

    if (order.reservationExpiresAt && order.reservationExpiresAt < new Date()) {
      await releaseItems(order.items);
      assertTransition(order.status, STATUSES.EXPIRED);
      order.status = STATUSES.EXPIRED;
      order.reservationExpiresAt = null;
      await order.save();
      return res.status(410).json({ outcome: 'expired', order });
    }

    const outcome = processPayment();

    if (outcome === 'success') {
      assertTransition(order.status, STATUSES.PAID);
      order.status = STATUSES.PAID;
      order.reservationExpiresAt = null;
      await order.save();
      return res.json({ outcome, order });
    }

    if (outcome === 'failure') {
      await releaseItems(order.items);
      assertTransition(order.status, STATUSES.FAILED);
      order.status = STATUSES.FAILED;
      order.reservationExpiresAt = null;
      await order.save();
      return res.status(402).json({ outcome, order });
    }

    // timeout: leave the order Reserved. The reservation-expiry job will
    // expire and release it if it's never retried before the 5-minute window
    // closes; the client is free to retry payment in the meantime.
    return res.status(202).json({ outcome, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/** Cancels a Reserved or Paid order, restoring stock either way. */
async function cancelOrder(req, res) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    assertTransition(order.status, STATUSES.CANCELLED);

    if (order.status === STATUSES.RESERVED || order.status === STATUSES.PAID) {
      await releaseItems(order.items);
    }

    order.status = STATUSES.CANCELLED;
    order.reservationExpiresAt = null;
    await order.save();
    res.json(order);
  } catch (err) {
    if (err.code === 'INVALID_TRANSITION') {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
}

async function getOrder(req, res) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function listOrders(req, res) {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createOrder, payOrder, cancelOrder, getOrder, listOrders };
