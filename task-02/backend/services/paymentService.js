/**
 * Simulates a payment gateway. Real gateways are unpredictable, so this
 * returns one of three outcomes at random: success, failure, or timeout.
 * Weighted so 'success' is most common, which keeps manual testing sane
 * while still regularly exercising the failure/timeout paths.
 */
function processPayment() {
  const roll = Math.random();
  if (roll < 0.6) return 'success';
  if (roll < 0.85) return 'failure';
  return 'timeout';
}

module.exports = { processPayment };
