/**
 * models/Ticket.js — Ticket Mongoose schema and model
 * Represents event tickets and temporary ticket holds during checkout.
 * Stores reservation details, hold status, and attendee contact information.
 */
import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
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
      enum: ['held', 'pending', 'confirmed', 'cancelled', 'expired'],
      default: 'held',
      index: true,
    },
    holdExpiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes hold
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

// Index to quickly find held tickets and enforce expiration logic
ticketSchema.index({ status: 1, holdExpiresAt: 1 });

const Ticket = mongoose.model('Ticket', ticketSchema);

export default Ticket;
