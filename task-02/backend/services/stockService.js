const mongoose = require('mongoose');
const Product = require('../models/Product');

/**
 * Atomically decrements stock for a single product, but only if enough is
 * available. The $gte check and the $inc happen as one atomic document
 * operation, so two concurrent requests can never both pass the check and
 * both decrement past zero — this is what prevents overselling.
 */
async function reserveOne(productId, quantity, session) {
  const product = await Product.findOneAndUpdate(
    { _id: productId, stock: { $gte: quantity } },
    { $inc: { stock: -quantity } },
    { new: true, session }
  );
  if (!product) {
    const err = new Error(`INSUFFICIENT_STOCK:${productId}`);
    err.code = 'INSUFFICIENT_STOCK';
    err.productId = productId;
    throw err;
  }
  return product;
}

/** Reverses reserveOne — restores stock, used on release/cancel/expiry/failure. */
async function releaseOne(productId, quantity, session) {
  await Product.findOneAndUpdate(
    { _id: productId },
    { $inc: { stock: quantity } },
    { session }
  );
}

/**
 * Reserves stock for every item in a cart as a single atomic unit. If any
 * item is short on stock, the whole transaction is rolled back — no partial
 * reservation is left behind. Fetches current price/name from the Product
 * record so the caller can't spoof pricing.
 */
async function reserveItems(items) {
  const session = await mongoose.startSession();
  let orderItems = [];
  try {
    await session.withTransaction(async () => {
      orderItems = [];
      for (const { productId, quantity } of items) {
        const product = await reserveOne(productId, quantity, session);
        orderItems.push({
          productId: product._id,
          name: product.name,
          quantity,
          price: product.price,
        });
      }
    });
  } finally {
    await session.endSession();
  }
  return orderItems;
}

/** Releases stock for every item in an order as a single atomic unit. */
async function releaseItems(items) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      for (const { productId, quantity } of items) {
        await releaseOne(productId, quantity, session);
      }
    });
  } finally {
    await session.endSession();
  }
}

module.exports = { reserveOne, releaseOne, reserveItems, releaseItems };
