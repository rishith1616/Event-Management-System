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
    user: {
      type: mongoose.Schema.Types.Mixed,
      ref: 'User',
      required: false,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: false,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: false,
    },
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
      required: false,
    },
    paymentMethod: {
      type: String,
      default: 'credit_card',
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
    // NFR-02: PCI-DSS Compliant Tokenization Fields (Zero Raw PAN Storage)
    token: {
      type: String,
      default: null,
      index: true,
    },
    cardLast4: {
      type: String,
      default: '1234',
    },
    cardBrand: {
      type: String,
      default: 'Visa',
    },
    maskedCardNumber: {
      type: String,
      default: '**** **** **** 1234',
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


// NFR-02 Pre-save hook: Enforce PCI-DSS compliance and sync identifiers
paymentSchema.pre('save', function (next) {
  if (this.event && !this.eventId) this.eventId = this.event;
  if (this.eventId && !this.event) this.event = this.eventId;
  if (this.user && !this.userId) this.userId = this.user;
  if (this.userId && !this.user) this.user = this.userId;

  if (!this.maskedCardNumber && this.cardLast4) {
    this.maskedCardNumber = `**** **** **** ${this.cardLast4}`;
  }

  // Scan all serialized fields to ensure no raw 13-19 digit card numbers exist in storage
  const serialized = JSON.stringify(this.toObject());
  const rawPanRegex = /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/;

  if (rawPanRegex.test(serialized)) {
    return next(
      new Error(
        'PCI-DSS Compliance Error: Raw card number detected. Storing unmasked card numbers is strictly prohibited under PCI-DSS.'
      )
    );
  }
  next();
});

// Fallback to prevent model recompilation errors in hot-reload or test environments
const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

export default Payment;
