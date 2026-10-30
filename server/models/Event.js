/**
 * models/Event.js — Event model schema
 * Defines event attributes, capacity, category, status lifecycle,
 * and references the organizer user.
 */
import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Event date is required'],
      validate: {
        validator: function (value) {
          // If date was not modified on update, skip future check
          if (this.isModified && !this.isModified('date')) return true;
          return value && new Date(value) > new Date();
        },
        message: 'Event date must be in the future',
      },
    },
    time: {
      type: String,
      required: [true, 'Event time is required'],
      trim: true,
    },
    venue: {
      type: String,
      required: [true, 'Venue is required'],
      trim: true,
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity limit is required'],
      min: [1, 'Capacity must be at least 1'],
    },
    availableTickets: {
      type: Number,
      min: [0, 'Available tickets cannot be negative'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be non-negative'],
      default: 0,
    },
    category: {
      type: String,
      enum: ['tech', 'music', 'sports', 'business', 'arts', 'food', 'other'],
      default: 'other',
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'canceled', 'suspended'],
      default: 'draft',
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Organizer is required'],
    },
    isSuspended: {
      type: Boolean,
      default: false,
      index: true,
    },
    suspensionReason: {
      type: String,
      default: '',
    },
    suspendedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to initialize availableTickets to capacity on creation
eventSchema.pre('save', function (next) {
  if (this.isNew && (this.availableTickets === undefined || this.availableTickets === null)) {
    this.availableTickets = this.capacity;
  }
  next();
});

const Event = mongoose.model('Event', eventSchema);

export default Event;
