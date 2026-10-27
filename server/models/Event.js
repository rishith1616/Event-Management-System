/**
 * models/Event.js — Event Mongoose schema and model
 * Defines the data structure for events managed in the system.
 */
import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
      maxlength: [120, 'Event title cannot exceed 120 characters'],
    },
    description: {
      type: String,
      required: [true, 'Event description is required'],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Event date is required'],
    },
    time: {
      type: String,
      required: [true, 'Event start time is required'],
      trim: true,
    },
    venue: {
      type: String,
      required: [true, 'Event venue is required'],
      trim: true,
    },
    capacity: {
      type: Number,
      required: [true, 'Event capacity is required'],
      min: [1, 'Capacity must be at least 1'],
    },
    availableTickets: {
      type: Number,
      required: [true, 'Available tickets count is required'],
      min: [0, 'Available tickets cannot be negative'],
    },
    price: {
      type: Number,
      required: [true, 'Ticket price is required'],
      min: [0, 'Ticket price cannot be negative'],
      default: 0,
    },
    category: {
      type: String,
      required: [true, 'Event category is required'],
      trim: true,
      enum: [
        'Conference',
        'Workshop',
        'Concert',
        'Meetup',
        'Seminar',
        'Exhibition',
        'Sports',
        'Other',
      ],
      default: 'Other',
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'canceled', 'suspended'],
      default: 'draft',
      index: true,
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimal filtering and sorting performance
eventSchema.index({ status: 1, date: 1 });
eventSchema.index({ category: 1, date: 1 });
eventSchema.index({ title: 'text', description: 'text' });

const Event = mongoose.model('Event', eventSchema);

export default Event;
