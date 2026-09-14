const STATUSES = {
  PENDING: 'Pending',
  RESERVED: 'Reserved',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
  FAILED: 'Failed',
};

// Map of currentStatus -> array of statuses it may transition to.
const TRANSITIONS = {
  [STATUSES.PENDING]: [STATUSES.RESERVED],
  [STATUSES.RESERVED]: [STATUSES.PAID, STATUSES.EXPIRED, STATUSES.FAILED, STATUSES.CANCELLED],
  [STATUSES.PAID]: [STATUSES.CANCELLED],
  [STATUSES.CANCELLED]: [],
  [STATUSES.EXPIRED]: [],
  [STATUSES.FAILED]: [],
};

function canTransition(from, to) {
  return Boolean(TRANSITIONS[from] && TRANSITIONS[from].includes(to));
}

function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    const err = new Error(`Invalid order status transition: ${from} -> ${to}`);
    err.code = 'INVALID_TRANSITION';
    throw err;
  }
}

module.exports = { STATUSES, TRANSITIONS, canTransition, assertTransition };
