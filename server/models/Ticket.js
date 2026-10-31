/**
 * models/Ticket.js — Ticket Mongoose schema and model
 * Represents event tickets and temporary ticket holds during checkout.
 * Stores reservation details, hold status, and attendee contact information.
 */
import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: false,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: false,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    ticketHoldId: {
      type: String,
      default: () => new mongoose.Types.ObjectId().toString(),
      index: true,
    },
    ticketId: {
      type: String,
      sparse: true,
      unique: true,
      index: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: [1, 'Quantity must be at least 1'],
    },
    unitPrice: {
      type: Number,
      default: 0,
      min: [0, 'Ticket price cannot be negative'],
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: [0, 'Total amount cannot be negative'],
    },
    status: {
      type: String,
      enum: ['held', 'pending', 'confirmed', 'cancelled', 'canceled', 'expired', 'refunded'],
      default: 'held',
      index: true,
    },
    holdExpiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes hold
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
    confirmedAt: {
      type: Date,
    },
    canceledAt: {
      type: Date,
    },
    cancellationReason: {
      type: String,
      default: '',
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
    // Attendee Contact Details (validated per FR-05)
    contactName: {
      type: String,
      trim: true,
      default: '',
    },
    contactEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    contactPhone: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to synchronize event/eventId and user/userId
ticketSchema.pre('save', function (next) {
  if (this.event && !this.eventId) this.eventId = this.event;
  if (this.eventId && !this.event) this.event = this.eventId;
  if (this.user && !this.userId) this.userId = this.user;
  if (this.userId && !this.user) this.user = this.userId;
  next();
});

// Index to quickly find held tickets and enforce expiration logic
ticketSchema.index({ status: 1, holdExpiresAt: 1 });
// NFR-01: Performance indexes for high-throughput ticket lookups
ticketSchema.index({ event: 1, status: 1 });
ticketSchema.index({ user: 1, status: 1 });

const Ticket = mongoose.model('Ticket', ticketSchema);

export default Ticket;
