/**
 * models/Ticket.js — Ticket Mongoose Schema and Model
 * 
 * Represents both temporary ticket holds during checkout and finalized, confirmed tickets.
 * Tracks lifecycle status transitions: held -> confirmed OR held -> canceled/expired.
 * In an ACID transaction, status changes and inventory updates occur atomically.
 */
import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      unique: true,
      sparse: true, // Only set once confirmed
      trim: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event reference is required'],
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Ticket quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
      min: [0, 'Unit price cannot be negative'],
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: [true, 'Total amount is required'],
      min: [0, 'Total amount cannot be negative'],
      default: 0,
    },
    status: {
      type: String,
      enum: {
        values: ['held', 'confirmed', 'canceled', 'expired', 'refunded'],
        message: '{VALUE} is not a valid ticket status',
      },
      default: 'held',
      index: true,
      required: true,
    },
    holdExpiresAt: {
      type: Date,
      required: false,
      index: true,
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: false,
    },
    customerInfo: {
      name: { type: String, trim: true },
      email: { type: String, trim: true },
      phone: { type: String, trim: true },
    },
    confirmedAt: {
      type: Date,
      required: false,
    },
    canceledAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying user's tickets by status
ticketSchema.index({ user: 1, status: 1 });
ticketSchema.index({ event: 1, status: 1 });

const Ticket = mongoose.model('Ticket', ticketSchema);

export default Ticket;
