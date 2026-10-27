/**
 * models/Payment.js — Payment Mongoose schema and model
 * Represents payment transactions processed for ticket holds.
 * Strictly adheres to PCI-DSS by never storing raw card numbers —
 * only storing tokenized gateway references and masked last-4 digits.
 */
import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: [true, 'Ticket reference is required'],
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'USD',
      trim: true,
      uppercase: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'declined', 'refunded'],
      default: 'pending',
      index: true,
    },
    gatewayTransactionId: {
      type: String,
      trim: true,
    },
    gatewayToken: {
      type: String,
      trim: true,
    },
    last4: {
      type: String,
      trim: true,
      maxlength: 4,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for transaction lookups and reporting
paymentSchema.index({ ticket: 1, createdAt: -1 });
paymentSchema.index({ user: 1, createdAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
