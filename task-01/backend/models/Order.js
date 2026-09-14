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
    items: { type: [orderItemSchema], required: true, validate: (v) => v.length > 0 },
    status: {
      type: String,
      enum: Object.values(STATUSES),
      default: STATUSES.PENDING,
    },
    reservationExpiresAt: { type: Date, default: null },
    idempotencyKey: { type: String, default: null },
  },
  { timestamps: true }
);

// Duplicate order/payment submissions for the same cart are rejected via this
// unique index. `sparse: true` lets orders created without a key (shouldn't
// normally happen, but keeps the index from choking on nulls) coexist.
orderSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Order', orderSchema);
