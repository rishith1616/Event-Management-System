/**
 * models/Payment.js — Payment Mongoose Schema and Model
 * 
 * Records financial transactions associated with ticket confirmations.
 * Created within an ACID transaction session when confirming a ticket hold.
 * If the transaction aborts due to payment failure or database error,
 * the payment record is automatically rolled back with no orphaned records.
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
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event reference is required'],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      required: true,
      default: 'USD',
      uppercase: true,
      trim: true,
    },
    paymentMethod: {
      type: String,
      required: true,
      default: 'credit_card',
      enum: ['credit_card', 'debit_card', 'mock', 'paypal', 'stripe'],
    },
    paymentIntentId: {
      type: String,
      required: [true, 'Payment intent or transaction reference is required'],
      unique: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'completed',
      index: true,
    },
    receiptUrl: {
      type: String,
      trim: true,
    },
    errorMessage: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
