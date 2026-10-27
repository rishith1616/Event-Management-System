/**
 * controllers/ticketController.js — Ticket hold and lifecycle management controller
 * Implements MongoDB ACID Multi-Document Transactions for atomic holds, confirmations, and releases.
 */
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import Ticket from '../models/Ticket.js';
import Event from '../models/Event.js';
import Payment from '../models/Payment.js';
import { withTransaction } from '../services/transactionService.js';

/**
 * @desc    Atomically create a temporary ticket hold with capacity decrement
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
      const totalAmount = event.price * qty;

      const [ticket] = await Ticket.create(
        [
          {
            event: eventId,
            user: userId,
            quantity: qty,
            unitPrice: event.price,
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
 * @desc    Atomically confirm a ticket hold and record payment
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
            status: 'approved',
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
 * @desc    Atomically release a ticket hold and restore event capacity
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
  createHoldAtomic,
  confirmTicketAtomic,
  releaseHoldAtomic,
  getTicketById,
  getMyTickets,
  updateContactDetails,
};
