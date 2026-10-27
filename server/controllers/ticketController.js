/**
 * controllers/ticketController.js — ACID-Compliant Ticket Operations Controller
 * 
 * Implements NFR-03: ACID-Compliant Ticket Transactions.
 * Guarantees zero overselling, zero orphaned payments, and atomic capacity restoration
 * by wrapping hold, confirmation, and release operations inside MongoDB transactions
 * via the withTransaction service utility.
 */
import { v4 as uuidv4 } from 'uuid';
import Event from '../models/Event.js';
import Ticket from '../models/Ticket.js';
import Payment from '../models/Payment.js';
import { withTransaction } from '../services/transactionService.js';

/**
 * @desc    Atomically hold tickets for an event during checkout
 * @route   POST /api/tickets/hold-atomic
 * @access  Private
 * 
 * ACID guarantees:
 * 1. Checks current available tickets inside the transaction.
 * 2. Atomically decrements event inventory using conditional findOneAndUpdate.
 * 3. Creates the ticket hold document with session.
 * 4. If concurrent requests compete for the last ticket, exactly one succeeds.
 *    The other encounters conditional query mismatch and rolls back with 409 Conflict.
 */
export const createHoldAtomic = async (req, res, next) => {
  try {
    const { eventId, quantity = 1, customerInfo, holdDurationMinutes = 10 } = req.body;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required to reserve a ticket hold',
      });
    }

    const requestedQty = parseInt(quantity, 10);
    if (isNaN(requestedQty) || requestedQty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Ticket quantity must be a positive integer',
      });
    }

    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user ID is required',
      });
    }

    // Execute within MongoDB ACID Multi-Document Transaction
    const transactionResult = await withTransaction(async (session) => {
      // 1. Read event and verify sufficient inventory within active session
      const event = await Event.findById(eventId).session(session);

      if (!event) {
        const error = new Error('Event not found');
        error.statusCode = 404;
        throw error;
      }

      if (event.status !== 'published') {
        const error = new Error(`Cannot reserve tickets: event status is '${event.status}'`);
        error.statusCode = 400;
        throw error;
      }

      if (event.availableTickets < requestedQty) {
        const error = new Error(
          `Insufficient tickets available. Requested: ${requestedQty}, Available: ${event.availableTickets}`
        );
        error.statusCode = 409; // 409 Conflict / Out of Stock
        throw error;
      }

      // 2. Atomically decrement availableTickets with conditional query
      const updatedEvent = await Event.findOneAndUpdate(
        {
          _id: eventId,
          availableTickets: { $gte: requestedQty },
          status: 'published',
        },
        {
          $inc: { availableTickets: -requestedQty },
        },
        {
          new: true,
          session,
          runValidators: true,
        }
      );

      // Concurrency race condition safeguard: if another thread claimed the seat first
      if (!updatedEvent) {
        const raceError = new Error(
          'Failed to reserve tickets: tickets were claimed by a concurrent transaction'
        );
        raceError.statusCode = 409;
        throw raceError;
      }

      // 3. Create Ticket hold document within the transaction
      const holdExpiresAt = new Date(
        Date.now() + (parseInt(holdDurationMinutes, 10) || 10) * 60 * 1000
      );
      const unitPrice = updatedEvent.price || 0;
      const totalAmount = unitPrice * requestedQty;

      const [ticket] = await Ticket.create(
        [
          {
            event: eventId,
            user: userId,
            quantity: requestedQty,
            unitPrice,
            totalAmount,
            status: 'held',
            holdExpiresAt,
            customerInfo: {
              name: customerInfo?.name || req.user?.name || '',
              email: customerInfo?.email || req.user?.email || '',
              phone: customerInfo?.phone || '',
            },
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
 * 
 * ACID guarantees:
 * 1. Verifies the ticket hold exists, is in 'held' status, and has not expired.
 * 2. Creates payment record with transaction session.
 * 3. Updates ticket status to 'confirmed' and assigns unique UUID ticketId.
 * 4. If any error or simulated exception occurs, the entire transaction rolls back.
 *    No orphaned payment is persisted, and ticket status is not corrupted.
 */
export const confirmTicketAtomic = async (req, res, next) => {
  try {
    const { id: ticketId } = req.params;
    const { paymentMethod = 'credit_card', simulateFailure = false } = req.body;
    const userId = req.user?._id || req.user?.id;

    // Execute within MongoDB ACID Multi-Document Transaction
    const transactionResult = await withTransaction(async (session) => {
      // 1. Verify ticket hold exists and is in 'held' state
      const ticket = await Ticket.findById(ticketId).session(session);

      if (!ticket) {
        const error = new Error('Ticket hold record not found');
        error.statusCode = 404;
        throw error;
      }

      // Authorization check (if user id present)
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

      // Check hold expiration
      if (ticket.holdExpiresAt && new Date() > new Date(ticket.holdExpiresAt)) {
        const expiredError = new Error(
          `Ticket hold has expired at ${ticket.holdExpiresAt.toISOString()}. Please make a new reservation.`
        );
        expiredError.statusCode = 410; // Gone
        throw expiredError;
      }

      // 2. Create Payment record within session
      const paymentIntentId = `PAY-${uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase()}`;

      const [payment] = await Payment.create(
        [
          {
            ticket: ticket._id,
            user: ticket.user,
            event: ticket.event,
            amount: ticket.totalAmount,
            currency: 'USD',
            paymentMethod,
            paymentIntentId,
            status: 'completed',
          },
        ],
        { session }
      );

      // Simulated failure trigger for testing transaction rollback behavior
      if (simulateFailure) {
        const failureError = new Error(
          'Simulated database/downstream failure during confirmation: transaction rolled back'
        );
        failureError.statusCode = 500;
        throw failureError;
      }

      // 3 & 4. Update ticket status to confirmed and generate UUID ticketId
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
 * 
 * ACID guarantees:
 * 1. Validates that the ticket is in 'held' status.
 * 2. Marks ticket status as 'canceled'.
 * 3. Increments event availableTickets by the held quantity.
 * 4. All-or-nothing guarantee: capacity is never leaked or duplicated.
 */
export const releaseHoldAtomic = async (req, res, next) => {
  try {
    const { id: ticketId } = req.params;
    const userId = req.user?._id || req.user?.id;

    // Execute within MongoDB ACID Multi-Document Transaction
    const transactionResult = await withTransaction(async (session) => {
      // 1. Locate the ticket within session
      const ticket = await Ticket.findById(ticketId).session(session);

      if (!ticket) {
        const error = new Error('Ticket hold record not found');
        error.statusCode = 404;
        throw error;
      }

      // Authorization check (if user id present)
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

      // 2. Mark ticket status as canceled
      ticket.status = 'canceled';
      ticket.canceledAt = new Date();
      await ticket.save({ session });

      // 3. Atomically restore inventory to event capacity
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
 * @desc    Get details of a specific ticket
 * @route   GET /api/tickets/:id
 * @access  Private
 */
export const getTicketById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findById(id)
      .populate('event', 'title date time venue price status')
      .populate('payment', 'amount currency paymentMethod paymentIntentId status createdAt');

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
      .populate('payment', 'amount currency status')
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
