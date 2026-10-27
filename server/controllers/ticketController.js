/**
 * controllers/ticketController.js — Ticket hold and reservation management controller
 * Implements FR-04: Temporary Ticket Hold During Checkout.
 * Provides atomic capacity decrementing, automatic hold expiry release, and hold cancellation.
 */
import mongoose from 'mongoose';
import Event from '../models/Event.js';
import Ticket from '../models/Ticket.js';

/**
 * Internal helper to find and release all expired ticket holds across the database.
 * Atomically marks ticket status as 'expired' and restores availableTickets to the event.
 * @returns {Promise<number>} Number of expired ticket holds released
 */
export const releaseExpiredHoldsInternal = async () => {
  const now = new Date();

  // Find all tickets currently in 'held' status whose 10-minute hold window has passed
  const expiredTickets = await Ticket.find({
    status: 'held',
    holdExpiresAt: { $lt: now },
  });

  let releasedCount = 0;

  for (const ticket of expiredTickets) {
    // Atomically transition status from 'held' to 'expired' to prevent duplicate capacity restores
    const updatedTicket = await Ticket.findOneAndUpdate(
      { _id: ticket._id, status: 'held' },
      { $set: { status: 'expired' } },
      { new: true }
    );

    if (updatedTicket) {
      // Increment event availableTickets back by the held quantity
      await Event.findByIdAndUpdate(ticket.event, {
        $inc: { availableTickets: ticket.quantity },
      });
      releasedCount += ticket.quantity;
    }
  }

  return releasedCount;
};

/**
 * @desc    Create a temporary ticket hold for checkout (attendee only)
 * @route   POST /api/tickets/hold
 * @access  Private (Attendee)
 */
export const createHold = async (req, res, next) => {
  try {
    const { eventId, quantity, contactName, contactEmail, contactPhone } = req.body;

    // Validate inputs
    if (!eventId || !mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'A valid event ID is required',
      });
    }

    const qty = parseInt(quantity, 10);
    if (!qty || qty < 1) {
      return res.status(400).json({
        success: false,
        message: 'Ticket quantity must be at least 1',
      });
    }

    // Proactively reclaim any holds that expired prior to this request
    await releaseExpiredHoldsInternal();

    // Verify the event exists and check status
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      });
    }

    if (event.status === 'suspended') {
      return res.status(400).json({
        success: false,
        message: 'This event has been suspended',
      });
    }

    if (event.status === 'canceled') {
      return res.status(400).json({
        success: false,
        message: 'This event has been canceled',
      });
    }

    // Capacity verification: check available tickets
    if (event.availableTickets < qty) {
      const remaining = Math.max(0, event.availableTickets);
      const message =
        remaining === 1
          ? 'Only 1 ticket remaining'
          : `Only ${remaining} ticket(s) remaining`;

      return res.status(400).json({
        success: false,
        message,
        availableTickets: remaining,
      });
    }

    // Atomically decrement availableTickets to guarantee no race condition / double-booking
    const updatedEvent = await Event.findOneAndUpdate(
      {
        _id: eventId,
        status: { $nin: ['canceled', 'suspended'] },
        availableTickets: { $gte: qty },
      },
      {
        $inc: { availableTickets: -qty },
      },
      { new: true }
    );

    // If updatedEvent is null, another concurrent request acquired the remaining tickets first
    if (!updatedEvent) {
      const latest = await Event.findById(eventId);
      const remaining = latest ? Math.max(0, latest.availableTickets) : 0;
      const message =
        remaining === 1
          ? 'Only 1 ticket remaining'
          : `Only ${remaining} ticket(s) remaining`;

      return res.status(400).json({
        success: false,
        message,
        availableTickets: remaining,
      });
    }

    // Set hold expiry timestamp to exactly 10 minutes from now
    const holdExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Create the Ticket record in 'held' status
    let ticket;
    try {
      ticket = await Ticket.create({
        event: eventId,
        user: req.user._id,
        quantity: qty,
        status: 'held',
        holdExpiresAt,
        contactName: contactName || (req.user ? req.user.name : ''),
        contactEmail: contactEmail || (req.user ? req.user.email : ''),
        contactPhone: contactPhone || '',
      });
    } catch (createError) {
      // Rollback atomic inventory hold if ticket creation fails (ACID resilience)
      await Event.findByIdAndUpdate(eventId, {
        $inc: { availableTickets: qty },
      });
      throw createError;
    }

    await ticket.populate('event');

    return res.status(201).json({
      success: true,
      message: 'Tickets held successfully for 10 minutes',
      hold: ticket,
      ticket,
      expiresAt: holdExpiresAt,
      secondsRemaining: 600,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Release all expired holds across the system and restore inventory
 * @route   POST /api/tickets/release-expired
 * @access  Public / Internal
 */
export const releaseExpiredHolds = async (_req, res, next) => {
  try {
    const releasedCount = await releaseExpiredHoldsInternal();
    return res.json({
      success: true,
      message: `Released ${releasedCount} expired hold ticket(s)`,
      releasedCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current user's active, non-expired ticket holds
 * @route   GET /api/tickets/my-holds
 * @access  Private
 */
export const getMyHolds = async (req, res, next) => {
  try {
    // Release any stale holds first
    await releaseExpiredHoldsInternal();

    const now = new Date();
    const holds = await Ticket.find({
      user: req.user._id,
      status: 'held',
      holdExpiresAt: { $gt: now },
    })
      .populate('event')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: holds.length,
      holds,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get specific hold details by ID
 * @route   GET /api/tickets/hold/:id
 * @access  Private
 */
export const getHoldById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid hold ID format',
      });
    }

    // Release any expired holds first
    await releaseExpiredHoldsInternal();

    const ticket = await Ticket.findById(id).populate('event');
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket hold not found',
      });
    }

    // Enforce authorization: only hold owner or admin can view
    if (
      req.user &&
      ticket.user.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this hold',
      });
    }

    const now = new Date();
    const isExpired =
      ticket.status === 'expired' ||
      (ticket.status === 'held' && ticket.holdExpiresAt && now > new Date(ticket.holdExpiresAt));

    const secondsRemaining =
      ticket.status === 'held' && ticket.holdExpiresAt
        ? Math.max(0, Math.floor((new Date(ticket.holdExpiresAt).getTime() - now.getTime()) / 1000))
        : 0;

    return res.json({
      success: true,
      hold: ticket,
      ticket,
      isExpired,
      secondsRemaining,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Cancel an active hold, restoring ticket capacity back to the event
 * @route   DELETE /api/tickets/hold/:id
 * @access  Private
 */
export const cancelHold = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid hold ID format',
      });
    }

    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket hold not found',
      });
    }

    // Enforce user ownership (only the holding user or an admin can cancel)
    if (
      req.user &&
      ticket.user.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this hold',
      });
    }

    if (ticket.status !== 'held') {
      return res.status(400).json({
        success: false,
        message: `Hold cannot be canceled because it is already '${ticket.status}'`,
      });
    }

    // Check if hold already lapsed
    if (ticket.holdExpiresAt && new Date() > new Date(ticket.holdExpiresAt)) {
      // Reclaim expired hold
      await releaseExpiredHoldsInternal();
      return res.status(400).json({
        success: false,
        message: 'Hold has already expired and tickets have been released',
      });
    }

    // Atomically mark the ticket as canceled
    const updatedTicket = await Ticket.findOneAndUpdate(
      { _id: id, status: 'held' },
      { $set: { status: 'canceled' } },
      { new: true }
    );

    if (updatedTicket) {
      // Restore ticket capacity to event
      await Event.findByIdAndUpdate(updatedTicket.event, {
        $inc: { availableTickets: updatedTicket.quantity },
      });
    }

    return res.json({
      success: true,
      message: 'Ticket hold canceled successfully. Capacity returned to event.',
      ticket: updatedTicket,
    });
  } catch (error) {
    next(error);
  }
};
