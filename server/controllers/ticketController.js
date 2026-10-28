/**
 * controllers/ticketController.js — Ticket hold and lifecycle management controller
 * Implements FR-04 (Temporary Ticket Hold During Checkout) and FR-05 (Contact Detail Validation).
 */
import mongoose from 'mongoose';
import Ticket from '../models/Ticket.js';
import Event from '../models/Event.js';

/**
 * Internal helper to automatically release expired holds and restore capacity to events
 */
export const releaseExpiredHoldsInternal = async () => {
  const now = new Date();
  const expiredTickets = await Ticket.find({
    status: 'held',
    holdExpiresAt: { $lt: now },
  });

  let releasedCount = 0;
  for (const ticket of expiredTickets) {
    const updated = await Ticket.findOneAndUpdate(
      { _id: ticket._id, status: 'held' },
      { $set: { status: 'expired' } },
      { new: true }
    );

    if (updated) {
      await Event.findByIdAndUpdate(ticket.event, {
        $inc: { availableTickets: ticket.quantity },
      });
      releasedCount += ticket.quantity;
    }
  }

  return releasedCount;
};

/**
 * @desc    Create a temporary 10-minute hold on requested ticket quantity
 * @route   POST /api/tickets/hold
 * @access  Private (Attendee)
 */
export const createHold = async (req, res, next) => {
  try {
    const { eventId, quantity, contactName, contactEmail, contactPhone } = req.body;

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
      // Rollback atomic inventory hold if ticket creation fails
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

    await releaseExpiredHoldsInternal();

    const ticket = await Ticket.findById(id).populate('event');
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket hold not found',
      });
    }

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

    if (ticket.holdExpiresAt && new Date() > new Date(ticket.holdExpiresAt)) {
      await releaseExpiredHoldsInternal();
      return res.status(400).json({
        success: false,
        message: 'Hold has already expired and tickets have been released',
      });
    }

    const updatedTicket = await Ticket.findOneAndUpdate(
      { _id: id, status: 'held' },
      { $set: { status: 'canceled' } },
      { new: true }
    );

    if (updatedTicket) {
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

/**
 * Helper to update contact info on a ticket hold (FR-05)
 */
export const saveContactInfo = async (ticketHoldId, contactName, contactEmail, contactPhone) => {
  let ticket = null;

  if (mongoose.Types.ObjectId.isValid(ticketHoldId)) {
    ticket = await Ticket.findById(ticketHoldId);
  }
  if (!ticket) {
    ticket = await Ticket.findOne({ ticketHoldId });
  }

  if (!ticket) {
    const error = new Error('Ticket hold not found');
    error.statusCode = 404;
    throw error;
  }

  if (ticket.holdExpiresAt && new Date() > new Date(ticket.holdExpiresAt)) {
    ticket.status = 'expired';
    await ticket.save();
    const error = new Error('Ticket hold has expired. Please reserve tickets again.');
    error.statusCode = 410;
    throw error;
  }

  ticket.contactName = contactName ? contactName.trim() : ticket.contactName;
  ticket.contactEmail = contactEmail ? contactEmail.trim().toLowerCase() : ticket.contactEmail;
  ticket.contactPhone = contactPhone ? contactPhone.trim() : ticket.contactPhone;

  return await ticket.save();
};

/**
 * @desc    Validate and update attendee contact details for a held ticket before payment
 * @route   PATCH /api/tickets/:id/contact
 * @access  Private
 */
export const updateContactDetails = async (req, res, next) => {
  if (typeof req === 'string' || (req && !req.headers && !req.params && !req.body && arguments.length > 1)) {
    const [ticketHoldId, contactName, contactEmail, contactPhone] = arguments;
    return await saveContactInfo(ticketHoldId, contactName, contactEmail, contactPhone);
  }

  try {
    const ticketHoldId = req.params?.id || req.body?.ticketHoldId || req.body?.id;
    const { contactName, contactEmail, contactPhone } = req.body || {};

    if (!ticketHoldId) {
      return res.status(400).json({
        success: false,
        message: 'Ticket hold ID is required',
      });
    }

    const updatedTicket = await saveContactInfo(
      ticketHoldId,
      contactName,
      contactEmail,
      contactPhone
    );

    return res.status(200).json({
      success: true,
      message: 'Contact details updated successfully',
      ticket: updatedTicket,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    if (next) {
      return next(error);
    }

    return res.status(500).json({
      success: false,
      message: error.message || 'Internal server error while updating contact details',
    });
  }
};

export default {
  createHold,
  releaseExpiredHolds,
  getMyHolds,
  getHoldById,
  cancelHold,
  saveContactInfo,
  updateContactDetails,
};
