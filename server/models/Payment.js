/**
 * models/Payment.js — Mongoose Schema for Payment Transactions
 *
 * Stores payment records, active provider audit trails, and refund history.
 * Decoupled from ticket inventory logic to satisfy NFR-05.
 */

import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'User',
      required: false,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: false,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Amount must be greater than or equal to 0'],
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      trim: true,
    },
    provider: {
      type: String,
      required: [true, 'Payment provider name is required'],
      trim: true,
    },
    transactionId: {
      type: String,
      required: [true, 'Transaction ID is required'],
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'completed',
    },
    refundId: {
      type: String,
      default: null,
    },
    refundAmount: {
      type: Number,
      default: null,
    },
    refundedAt: {
      type: Date,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Fallback to prevent model recompilation errors in hot-reload or test environments
const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

export default Payment;
