const Order = require('../models/Order');
const { reserveItems, releaseItems } = require('../services/stockService');
const { processPayment } = require('../services/paymentService');
const { STATUSES, assertTransition } = require('../services/orderStateMachine');

const RESERVATION_TTL_MS = (Number(process.env.RESERVATION_TTL_MINUTES) || 5) * 60 * 1000;

/**
 * Checkout: reserves stock for every item in the cart and creates a Reserved
 * order tied to a client-generated userId (no auth in scope for this
 * assessment). idempotencyKey prevents duplicate order creation on retry.
 */
async function createOrder(req, res) {
  const { items, idempotencyKey, userId } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items must be a non-empty array' });
  }
  if (!idempotencyKey) {
    return res.status(400).json({ error: 'idempotencyKey is required' });
  }
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const existing = await Order.findOne({ idempotencyKey });
    if (existing) {
      return res.status(200).json(existing);
    }

    const orderItems = await reserveItems(items);

    const order = await Order.create({
      userId,
      items: orderItems,
      status: STATUSES.RESERVED,
      reservationExpiresAt: new Date(Date.now() + RESERVATION_TTL_MS),
      idempotencyKey,
    });

    res.status(201).json(order);
  } catch (err) {
    if (err.code === 11000) {
      const existing = await Order.findOne({ idempotencyKey });
      return res.status(200).json(existing);
    }
    if (err.code === 'INSUFFICIENT_STOCK') {
      return res.status(409).json({ error: 'Insufficient stock', productId: err.productId });
    }
    res.status(500).json({ error: err.message });
  }
}

/** Mock payment gateway attempt — same three-outcome simulation as Task 01. */
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
      order.wasPaid = true;
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

    return res.status(202).json({ outcome, order });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * Cancels a Reserved or Paid order, restoring stock either way. If the order
 * had already been paid, this also simulates a refund (no real payment
 * provider is involved — it just flips refunded/refundedAt).
 */
async function cancelOrder(req, res) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    assertTransition(order.status, STATUSES.CANCELLED);

    if (order.status === STATUSES.RESERVED || order.status === STATUSES.PAID) {
      await releaseItems(order.items);
    }

    const wasPaidBeforeCancel = order.status === STATUSES.PAID;

    order.status = STATUSES.CANCELLED;
    order.reservationExpiresAt = null;
    if (wasPaidBeforeCancel) {
      order.refunded = true;
      order.refundedAt = new Date();
    }
    await order.save();
    res.json(order);
  } catch (err) {
    if (err.code === 'INVALID_TRANSITION') {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
}

/**
 * Explicit refund endpoint, for a Cancelled order that was paid but for
 * whatever reason wasn't auto-refunded (idempotent — safe to call again).
 */
async function refundOrder(req, res) {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (!order.wasPaid) {
      return res.status(409).json({ error: 'Order was never paid — nothing to refund' });
    }
    if (order.status !== STATUSES.CANCELLED) {
      return res.status(409).json({ error: 'Only cancelled paid orders can be refunded' });
    }
    if (order.refunded) {
      return res.json(order); // already refunded — idempotent
    }

    order.refunded = true;
    order.refundedAt = new Date();
    await order.save();
    res.json(order);
  } catch (err) {
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

/** Order history for a given user. GET /orders?userId=... */
async function listOrders(req, res) {
  try {
    const { userId } = req.query;
    const query = userId ? { userId } : {};
    const orders = await Order.find(query).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { createOrder, payOrder, cancelOrder, refundOrder, getOrder, listOrders };
