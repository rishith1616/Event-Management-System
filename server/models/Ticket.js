/**
 * models/Ticket.js — Ticket Mongoose schema and model
 * Represents event tickets and temporary ticket holds during checkout.
 * Tracks hold lifecycle, confirmation with unique UUID ticketId, and buyer details.
 */
import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: [true, 'Event reference is required'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    quantity: {
      type: Number,
      required: [true, 'Ticket quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    unitPrice: {
      type: Number,
      min: [0, 'Unit price cannot be negative'],
      default: 0,
    },
    totalPrice: {
      type: Number,
      min: [0, 'Total price cannot be negative'],
      default: 0,
    },
    status: {
      type: String,
      enum: ['held', 'confirmed', 'canceled', 'refunded'],
      default: 'held',
      index: true,
    },
    holdExpiresAt: {
      type: Date,
      index: true,
    },
    ticketId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    contactName: {
      type: String,
      trim: true,
    },
    contactEmail: {
      type: String,
      trim: true,
    },
    contactPhone: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookup of held/confirmed tickets
ticketSchema.index({ event: 1, status: 1 });
ticketSchema.index({ user: 1, status: 1 });

const Ticket = mongoose.model('Ticket', ticketSchema);

export default Ticket;
