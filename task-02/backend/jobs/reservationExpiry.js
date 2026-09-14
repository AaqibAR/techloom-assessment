const Order = require('../models/Order');
const { releaseItems } = require('../services/stockService');
const { STATUSES } = require('../services/orderStateMachine');

const POLL_INTERVAL_MS = 30 * 1000;

/**
 * Polls for Reserved orders whose 5-minute window has passed, releases their
 * stock, and marks them Expired. Runs on an interval rather than a per-order
 * timer so it survives server restarts and works the same whether one order
 * or a thousand are pending.
 */
async function expireStaleReservations() {
  const now = new Date();
  const stale = await Order.find({
    status: STATUSES.RESERVED,
    reservationExpiresAt: { $lt: now },
  });

  for (const order of stale) {
    try {
      await releaseItems(order.items);
      order.status = STATUSES.EXPIRED;
      order.reservationExpiresAt = null;
      await order.save();
      console.log(`Order ${order._id} expired, stock released`);
    } catch (err) {
      console.error(`Failed to expire order ${order._id}:`, err.message);
    }
  }
}

function startReservationExpiryJob() {
  setInterval(() => {
    expireStaleReservations().catch((err) =>
      console.error('Reservation expiry job error:', err.message)
    );
  }, POLL_INTERVAL_MS);
  console.log('Reservation expiry job started (30s interval)');
}

module.exports = { startReservationExpiryJob, expireStaleReservations };
