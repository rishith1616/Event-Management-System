/**
 * controllers/ticketController.js — Ticket hold and lifecycle management controller
 * Implements FR-04 (Ticket Hold), FR-05 (Contact Validation), and NFR-03 (MongoDB ACID Multi-Document Transactions).
 */
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import Ticket from '../models/Ticket.js';
import Event from '../models/Event.js';
import Payment from '../models/Payment.js';
import { withTransaction } from '../services/transactionService.js';
import { getActiveProvider } from '../services/paymentGateway.js';

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

    const holdExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    let ticket;
    try {
      ticket = await Ticket.create({
        event: eventId,
        user: req.user?._id || req.user?.id,
        quantity: qty,
        status: 'held',
        holdExpiresAt,
        contactName: contactName || (req.user ? req.user.name : ''),
        contactEmail: contactEmail || (req.user ? req.user.email : ''),
        contactPhone: contactPhone || '',
      });
    } catch (createError) {
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
 * @desc    Atomically create a temporary ticket hold with capacity decrement under ACID transaction
 * @route   POST /api/tickets/hold-atomic
 * @access  Private (Attendee)
 */
export const createHoldAtomic = async (req, res, next) => {
  try {
    const { eventId, quantity, customerInfo } = req.body;
    const userId = req.user?._id || req.user?.id;

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

    const transactionResult = await withTransaction(async (session) => {
      const event = await Event.findById(eventId).session(session);

      if (!event) {
        const error = new Error('Event not found');
        error.statusCode = 404;
        throw error;
      }

      if (event.status === 'suspended') {
        const error = new Error('This event has been suspended');
        error.statusCode = 400;
        throw error;
      }

      if (event.status === 'canceled') {
        const error = new Error('This event has been canceled');
        error.statusCode = 400;
        throw error;
      }

      if (event.availableTickets < qty) {
        const remaining = Math.max(0, event.availableTickets);
        const error = new Error(
          remaining === 1 ? 'Only 1 ticket remaining' : `Only ${remaining} ticket(s) remaining`
        );
        error.statusCode = 400;
        error.availableTickets = remaining;
        throw error;
      }

      const updatedEvent = await Event.findOneAndUpdate(
        {
          _id: eventId,
          status: { $nin: ['canceled', 'suspended'] },
          availableTickets: { $gte: qty },
        },
        {
          $inc: { availableTickets: -qty },
        },
        { new: true, session, runValidators: true }
      );

      if (!updatedEvent) {
        const latest = await Event.findById(eventId).session(session);
        const remaining = latest ? Math.max(0, latest.availableTickets) : 0;
        const error = new Error(
          remaining === 1 ? 'Only 1 ticket remaining' : `Only ${remaining} ticket(s) remaining`
        );
        error.statusCode = 409;
        error.availableTickets = remaining;
        throw error;
      }

      const holdExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      const totalAmount = (event.price || 0) * qty;

      const [ticket] = await Ticket.create(
        [
          {
            event: eventId,
            user: userId,
            quantity: qty,
            unitPrice: event.price || 0,
            totalAmount,
            status: 'held',
            holdExpiresAt,
            contactName: customerInfo?.name || req.user?.name || '',
            contactEmail: customerInfo?.email || req.user?.email || '',
            contactPhone: customerInfo?.phone || '',
          },
        ],
        { session }
      );

      return {
        ticket,
        event: {
          id: updatedEvent._id,
          title: updatedEvent.title,
          price: updatedEvent.price,
          remainingTickets: updatedEvent.availableTickets,
        },
        holdExpiresAt,
      };
    });

    return res.status(201).json({
      success: true,
      message: 'Ticket hold created successfully under ACID transaction',
      data: transactionResult,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Atomically confirm a ticket hold and record payment under ACID transaction
 * @route   POST /api/tickets/:id/confirm-atomic
 * @access  Private
 */
export const confirmTicketAtomic = async (req, res, next) => {
  try {
    const { id: ticketId } = req.params;
    const { paymentMethod = 'credit_card', simulateFailure = false } = req.body;
    const userId = req.user?._id || req.user?.id;

    const transactionResult = await withTransaction(async (session) => {
      const ticket = await Ticket.findById(ticketId).session(session);

      if (!ticket) {
        const error = new Error('Ticket hold record not found');
        error.statusCode = 404;
        throw error;
      }

      if (userId && ticket.user && ticket.user.toString() !== userId.toString()) {
        const error = new Error('Not authorized to confirm this ticket hold');
        error.statusCode = 403;
        throw error;
      }

      if (ticket.status !== 'held') {
        const error = new Error(
          `Cannot confirm ticket: current status is '${ticket.status}'. Ticket must be in 'held' status.`
        );
        error.statusCode = 400;
        throw error;
      }

      if (ticket.holdExpiresAt && new Date() > new Date(ticket.holdExpiresAt)) {
        const expiredError = new Error(
          `Ticket hold has expired at ${ticket.holdExpiresAt.toISOString()}. Please make a new reservation.`
        );
        expiredError.statusCode = 410;
        throw expiredError;
      }

      const paymentIntentId = `PAY-${uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase()}`;

      const [payment] = await Payment.create(
        [
          {
            ticket: ticket._id,
            user: ticket.user,
            event: ticket.event,
            amount: ticket.totalAmount || 0,
            currency: 'USD',
            paymentMethod,
            transactionId: paymentIntentId,
            status: 'completed',
          },
        ],
        { session }
      );

      if (simulateFailure) {
        const failureError = new Error(
          'Simulated database/downstream failure during confirmation: transaction rolled back'
        );
        failureError.statusCode = 500;
        throw failureError;
      }

      const generatedTicketId = `TCK-${uuidv4().substring(0, 8).toUpperCase()}`;

      ticket.ticketId = generatedTicketId;
      ticket.status = 'confirmed';
      ticket.payment = payment._id;
      ticket.confirmedAt = new Date();

      await ticket.save({ session });

      return {
        ticket,
        payment,
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Ticket confirmed and payment recorded atomically',
      data: transactionResult,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Atomically release a ticket hold and restore event capacity under ACID transaction
 * @route   DELETE /api/tickets/:id/release-atomic
 * @access  Private
 */
export const releaseHoldAtomic = async (req, res, next) => {
  try {
    const { id: ticketId } = req.params;
    const userId = req.user?._id || req.user?.id;

    const transactionResult = await withTransaction(async (session) => {
      const ticket = await Ticket.findById(ticketId).session(session);

      if (!ticket) {
        const error = new Error('Ticket hold record not found');
        error.statusCode = 404;
        throw error;
      }

      if (userId && ticket.user && ticket.user.toString() !== userId.toString()) {
        const error = new Error('Not authorized to release this ticket hold');
        error.statusCode = 403;
        throw error;
      }

      if (ticket.status !== 'held') {
        const error = new Error(
          `Cannot release ticket: current status is '${ticket.status}'. Only held tickets can be released.`
        );
        error.statusCode = 400;
        throw error;
      }

      ticket.status = 'canceled';
      ticket.canceledAt = new Date();
      await ticket.save({ session });

      const updatedEvent = await Event.findByIdAndUpdate(
        ticket.event,
        { $inc: { availableTickets: ticket.quantity } },
        { new: true, session, runValidators: true }
      );

      if (!updatedEvent) {
        const error = new Error('Associated event could not be found to restore ticket inventory');
        error.statusCode = 404;
        throw error;
      }

      return {
        ticket,
        restoredQuantity: ticket.quantity,
        event: {
          id: updatedEvent._id,
          title: updatedEvent.title,
          availableTickets: updatedEvent.availableTickets,
        },
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Ticket hold released and inventory restored atomically',
      data: transactionResult,
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
      user: req.user?._id || req.user?.id,
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
      ticket.user &&
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
      ticket.user &&
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

/**
 * @desc    Get details of a specific ticket
 * @route   GET /api/tickets/:id
 * @access  Private
 */
export const getTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findById(id).populate('event');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all tickets belonging to authenticated user
 * @route   GET /api/tickets/my-tickets
 * @access  Private
 */

/**
 * @desc    Cancel a confirmed ticket, process refund, and restore event inventory (FR-07)
 * @route   POST /api/tickets/:id/cancel
 * @access  Private (Attendee / Admin)
 */
export const cancelTicketAndRefund = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason = 'Attendee requested cancellation' } = req.body || {};
    const userId = req.user?._id || req.user?.id;
    const userRole = req.user?.role;

    const ticket = await Ticket.findById(id).populate('event');
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    // Verify ownership or admin privilege
    const ticketUserId = ticket.user?._id?.toString() || ticket.user?.toString() || ticket.userId?.toString();
    if (ticketUserId && ticketUserId !== userId?.toString() && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to cancel this ticket',
      });
    }

    // Check if already cancelled
    if (['cancelled', 'canceled', 'refunded'].includes(ticket.status)) {
      return res.status(400).json({
        success: false,
        message: 'This ticket has already been canceled',
      });
    }

    const event = ticket.event;
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Associated event not found',
      });
    }

    // Check if event has already occurred
    if (event.date && new Date(event.date) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a ticket for an event that has already occurred',
      });
    }

    // Process refund via Payment Gateway if totalAmount > 0
    let refundResult = null;
    const refundAmount = ticket.totalAmount || (ticket.unitPrice * ticket.quantity) || 0;

    if (refundAmount > 0) {
      const activeProvider = getActiveProvider();
      let transactionId = null;

      if (ticket.payment) {
        const paymentDoc = await Payment.findById(ticket.payment);
        if (paymentDoc) {
          transactionId = paymentDoc.transactionId;
        }
      }

      if (!transactionId) {
        transactionId = `txn_${ticket.ticketId || ticket._id}`;
      }

      refundResult = await activeProvider.refund(transactionId, refundAmount);

      // Update payment record if exists
      if (ticket.payment) {
        await Payment.findByIdAndUpdate(ticket.payment, {
          status: 'refunded',
          refundId: refundResult.refundId,
          refundAmount: refundAmount,
          refundedAt: new Date(),
        });
      }
    }

    // Void ticket and set status to 'cancelled'
    ticket.status = 'cancelled';
    ticket.canceledAt = new Date();
    ticket.cancellationReason = reason;
    if (refundResult) {
      ticket.refundId = refundResult.refundId;
      ticket.refundAmount = refundAmount;
      ticket.refundedAt = new Date();
    }
    await ticket.save();

    // Restore available tickets back to event inventory (FR-07 acceptance criteria)
    await Event.findByIdAndUpdate(event._id, {
      $inc: { availableTickets: ticket.quantity },
    });

    const updatedEvent = await Event.findById(event._id);

    return res.status(200).json({
      success: true,
      message: 'Ticket successfully canceled, refund processed, and seat returned to inventory',
      data: {
        ticket,
        refund: refundResult,
        event: {
          id: updatedEvent._id,
          title: updatedEvent.title,
          availableTickets: updatedEvent.availableTickets,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyTickets = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const tickets = await Ticket.find({ user: userId })
      .populate('event', 'title date time venue price status')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  createHold,
  createHoldAtomic,
  confirmTicketAtomic,
  releaseHoldAtomic,
  releaseExpiredHolds,
  getMyHolds,
  getHoldById,
  cancelHold,
  saveContactInfo,
  updateContactDetails,
  getTicketById,
  getMyTickets,
  cancelTicketAndRefund,
};
