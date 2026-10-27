/**
 * controllers/paymentController.js — Payment processing and ticket issuance controller
 * Handles payment verification through a simulated gateway, converts temporary ticket
 * holds into confirmed tickets with UUID ticketId, sends simulated confirmation emails,
 * releases holds and capacity on payment declines, and queries payment records.
 */
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import Payment from '../models/Payment.js';
import Ticket from '../models/Ticket.js';
import Event from '../models/Event.js';

/**
 * Loosely-coupled Payment Gateway Adapter (NFR-05)
 * Simulates an external payment gateway (e.g., Stripe, PayPal).
 * In production, this module would invoke the external payment provider's SDK.
 *
 * @param {object} params - Gateway parameters
 * @param {string} params.paymentToken - Tokenized payment credential (PCI-DSS compliant)
 * @param {number} params.amount - Total charge amount
 * @param {string} params.currency - ISO currency code
 * @returns {Promise<{success: boolean, status: string, gatewayTransactionId: string, error?: string}>}
 */
export const simulateGatewayCharge = async ({ paymentToken, amount, currency = 'USD' }) => {
  // Simulate network latency of payment gateway (100ms)
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Gateways decline tokens matching failure test tokens
  if (paymentToken && paymentToken.startsWith('tok_declined_')) {
    const gatewayTransactionId = `txn_declined_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    return {
      success: false,
      status: 'declined',
      gatewayTransactionId,
      error: 'Card was declined by issuing bank (insufficient funds or fraud check).',
    };
  }

  // Gateway approval
  const gatewayTransactionId = `txn_appr_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
  return {
    success: true,
    status: 'approved',
    gatewayTransactionId,
  };
};

/**
 * @desc    Process payment for a held ticket and issue confirmed ticket
 * @route   POST /api/payments/process
 * @access  Private (Authenticated user)
 */
export const processPayment = async (req, res, next) => {
  try {
    const { holdId, paymentToken, last4 } = req.body;

    // Validate request parameters
    if (!holdId || !paymentToken) {
      return res.status(400).json({
        success: false,
        message: 'holdId and paymentToken are required',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(holdId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid hold ID format',
      });
    }

    // Retrieve ticket hold with populated event details
    const ticket = await Ticket.findById(holdId).populate('event');
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket hold not found',
      });
    }

    // Determine associated user ID (from auth middleware or ticket record)
    const userId = req.user?._id || ticket.user;

    // Verify hold status
    if (ticket.status === 'confirmed') {
      return res.status(400).json({
        success: false,
        message: 'This ticket hold has already been paid and confirmed.',
        ticketId: ticket.ticketId,
      });
    }

    // Check if hold has expired while in 'held' status
    const now = new Date();
    if (ticket.status === 'held' && ticket.holdExpiresAt && now > new Date(ticket.holdExpiresAt)) {
      // Hold has expired: release inventory and mark canceled
      if (ticket.event) {
        await Event.findByIdAndUpdate(ticket.event._id || ticket.event, {
          $inc: { availableTickets: ticket.quantity },
        });
      }
      ticket.status = 'canceled';
      await ticket.save();

      return res.status(400).json({
        success: false,
        message: 'Ticket hold has expired. The held tickets have been returned to available inventory.',
        retryable: false,
      });
    }

    // Handle retry on a previously canceled hold (e.g., following a payment decline)
    if (ticket.status === 'canceled') {
      const eventDoc = await Event.findById(ticket.event._id || ticket.event);
      if (!eventDoc || eventDoc.availableTickets < ticket.quantity) {
        return res.status(400).json({
          success: false,
          message: 'This hold was canceled and tickets are no longer available to re-reserve. Please start a new checkout.',
          retryable: false,
        });
      }

      // Re-reserve inventory for retry attempt
      eventDoc.availableTickets -= ticket.quantity;
      await eventDoc.save();

      ticket.status = 'held';
      ticket.holdExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10-minute hold window
      await ticket.save();
    }

    // Compute total charge amount
    const ticketPrice = ticket.totalPrice || (ticket.event?.price ? ticket.event.price * ticket.quantity : 0);
    const amount = Number(ticketPrice);

    // Extract masked last 4 digits (strictly compliant with PCI-DSS: never raw card numbers)
    let cardLast4 = '4242';
    if (last4 && typeof last4 === 'string') {
      cardLast4 = last4.slice(-4);
    } else if (paymentToken.includes('_')) {
      const parts = paymentToken.split('_');
      const lastPart = parts[parts.length - 1];
      if (/^\d{4}$/.test(lastPart)) {
        cardLast4 = lastPart;
      }
    }

    // Call payment gateway adapter
    const gatewayResult = await simulateGatewayCharge({
      paymentToken,
      amount,
      currency: 'USD',
    });

    // ── Payment Declined Branch ──────────────────────────────────────────
    if (!gatewayResult.success) {
      // 1. Create Payment record with 'declined' status
      const payment = await Payment.create({
        ticket: ticket._id,
        user: userId,
        amount,
        currency: 'USD',
        status: 'declined',
        gatewayTransactionId: gatewayResult.gatewayTransactionId,
        gatewayToken: paymentToken,
        last4: cardLast4,
      });

      // 2. Release hold: Restore availableTickets on Event
      if (ticket.event) {
        await Event.findByIdAndUpdate(ticket.event._id || ticket.event, {
          $inc: { availableTickets: ticket.quantity },
        });
      }

      // 3. Mark Ticket status as 'canceled'
      ticket.status = 'canceled';
      await ticket.save();

      console.warn(
        `[Payment Service] Payment DECLINED for Ticket ${ticket._id}. Gateway Txn: ${gatewayResult.gatewayTransactionId}. Hold released.`
      );

      // 4. Return error with retry option
      return res.status(400).json({
        success: false,
        message: gatewayResult.error || 'Payment was declined by the card issuer. Please try another card.',
        error: 'Payment declined',
        retryable: true,
        holdId: ticket._id,
        payment: {
          _id: payment._id,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          gatewayTransactionId: payment.gatewayTransactionId,
          last4: payment.last4,
          createdAt: payment.createdAt,
        },
      });
    }

    // ── Payment Approved Branch ──────────────────────────────────────────
    // 1. Generate unique UUID Ticket ID
    const generatedTicketId = uuidv4();

    // 2. Update Ticket status to 'confirmed' and assign ticketId
    ticket.status = 'confirmed';
    ticket.ticketId = generatedTicketId;
    ticket.holdExpiresAt = null; // Clear hold expiration once confirmed
    await ticket.save();

    // 3. Create Payment record with 'approved' status
    const payment = await Payment.create({
      ticket: ticket._id,
      user: userId,
      amount,
      currency: 'USD',
      status: 'approved',
      gatewayTransactionId: gatewayResult.gatewayTransactionId,
      gatewayToken: paymentToken,
      last4: cardLast4,
    });

    // 4. Simulate sending confirmation email and receipt (console.log)
    const recipientEmail = ticket.contactEmail || req.user?.email || 'attendee@example.com';
    const recipientName = ticket.contactName || req.user?.name || 'Valued Attendee';
    const eventName = ticket.event?.title || 'Event';

    console.log(
      `[Email Service] Confirmation email and receipt sent to ${recipientName} <${recipientEmail}> for Ticket ID: ${generatedTicketId} (Event: "${eventName}", Quantity: ${ticket.quantity}, Total: $${amount})`
    );

    // 5. Return success confirmation with Ticket ID and payment summary
    return res.status(200).json({
      success: true,
      message: 'Payment processed successfully. Ticket confirmed and email receipt issued.',
      ticketId: generatedTicketId,
      ticket: {
        _id: ticket._id,
        ticketId: ticket.ticketId,
        status: ticket.status,
        quantity: ticket.quantity,
        totalPrice: amount,
        contactName: recipientName,
        contactEmail: recipientEmail,
        contactPhone: ticket.contactPhone,
        event: ticket.event,
      },
      payment: {
        _id: payment._id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        gatewayTransactionId: payment.gatewayTransactionId,
        last4: payment.last4,
        createdAt: payment.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get payment record for a given ticket (by Ticket _id or UUID ticketId)
 * @route   GET /api/payments/ticket/:ticketId
 * @access  Private (Authenticated user)
 */
export const getPaymentByTicket = async (req, res, next) => {
  try {
    const { ticketId } = req.params;

    if (!ticketId) {
      return res.status(400).json({
        success: false,
        message: 'ticketId parameter is required',
      });
    }

    // Resolve ticket by MongoDB ObjectId or UUID ticketId
    let ticketDoc = null;
    if (mongoose.Types.ObjectId.isValid(ticketId)) {
      ticketDoc = await Ticket.findById(ticketId).populate('event');
    }
    if (!ticketDoc) {
      ticketDoc = await Ticket.findOne({ ticketId }).populate('event');
    }

    if (!ticketDoc) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    // Find the latest payment record for this ticket
    const payment = await Payment.findOne({ ticket: ticketDoc._id })
      .sort({ createdAt: -1 })
      .populate('user', 'name email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'No payment record found for this ticket',
      });
    }

    return res.status(200).json({
      success: true,
      payment,
      ticket: ticketDoc,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get hold / order summary details for the checkout payment screen
 * @route   GET /api/payments/hold/:holdId
 * @access  Private (Authenticated user)
 */
export const getHoldDetails = async (req, res, next) => {
  try {
    const { holdId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(holdId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid hold ID format',
      });
    }

    const ticket = await Ticket.findById(holdId).populate('event');
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket hold not found',
      });
    }

    const isExpired =
      ticket.status === 'held' &&
      ticket.holdExpiresAt &&
      new Date() > new Date(ticket.holdExpiresAt);

    const unitPrice = ticket.event?.price || 0;
    const totalPrice = ticket.totalPrice || unitPrice * ticket.quantity;

    return res.status(200).json({
      success: true,
      hold: {
        _id: ticket._id,
        ticketId: ticket.ticketId,
        status: ticket.status,
        quantity: ticket.quantity,
        unitPrice,
        totalPrice,
        holdExpiresAt: ticket.holdExpiresAt,
        isExpired,
        contactName: ticket.contactName,
        contactEmail: ticket.contactEmail,
        contactPhone: ticket.contactPhone,
        event: ticket.event,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Voluntarily cancel a hold and release event capacity
 * @route   POST /api/payments/hold/:holdId/cancel
 * @access  Private (Authenticated user)
 */
export const cancelHold = async (req, res, next) => {
  try {
    const { holdId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(holdId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid hold ID format',
      });
    }

    const ticket = await Ticket.findById(holdId);
    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket hold not found',
      });
    }

    if (ticket.status === 'held') {
      if (ticket.event) {
        await Event.findByIdAndUpdate(ticket.event, {
          $inc: { availableTickets: ticket.quantity },
        });
      }
      ticket.status = 'canceled';
      await ticket.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Hold released and order canceled successfully.',
    });
  } catch (error) {
    next(error);
  }
};
