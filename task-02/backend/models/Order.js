const mongoose = require('mongoose');
const { STATUSES } = require('../services/orderStateMachine');

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true }, // no auth in scope — a stable client-generated id
    items: { type: [orderItemSchema], required: true, validate: (v) => v.length > 0 },
    status: {
      type: String,
      enum: Object.values(STATUSES),
      default: STATUSES.PENDING,
    },
    reservationExpiresAt: { type: Date, default: null },
    idempotencyKey: { type: String, default: null },
    wasPaid: { type: Boolean, default: false }, // tracks whether this order ever reached Paid, for refund eligibility
    refunded: { type: Boolean, default: false },
    refundedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

orderSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });
orderSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
