/**
 * models/Ticket.js — Ticket / Hold Mongoose schema and model
 * Represents tickets in various lifecycle states: 'held', 'confirmed', 'canceled', 'expired'.
 * Supports temporary checkout holds with an automatic 10-minute expiry window.
 */
import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema(
  {
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
    },
    status: {
      type: String,
      enum: {
        values: ['held', 'confirmed', 'canceled', 'expired'],
        message: '{VALUE} is not a valid ticket status',
      },
      default: 'held',
      index: true,
    },
    holdExpiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes from creation
      index: true,
    },
    ticketId: {
      type: String,
      unique: true,
      sparse: true, // sparse index allows null/undefined values before confirmation
    },
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

// Virtual property to check if a hold is expired in application logic
ticketSchema.virtual('isHoldExpired').get(function () {
  if (this.status !== 'held') return false;
  return new Date() > this.holdExpiresAt;
});

// Helper method to calculate remaining hold seconds
ticketSchema.methods.getSecondsRemaining = function () {
  if (this.status !== 'held' || !this.holdExpiresAt) return 0;
  return Math.max(0, Math.floor((new Date(this.holdExpiresAt).getTime() - Date.now()) / 1000));
};

const Ticket = mongoose.model('Ticket', ticketSchema);

export default Ticket;
