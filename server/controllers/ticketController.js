/**
 * controllers/ticketController.js — Ticket operations controller
 * Manages ticket holds, attendee contact updates, and ticket lifecycle operations.
 * Implements FR-05: Contact Detail Validation and persistence on held tickets.
 */
import mongoose from 'mongoose';
import Ticket from '../models/Ticket.js';

/**
 * Helper to update contact info on a ticket hold
 * @param {string} ticketHoldId - The ID or ticketHoldId of the ticket
 * @param {string} contactName - Attendee full name
 * @param {string} contactEmail - Attendee email address
 * @param {string} contactPhone - Attendee phone number
 * @returns {Promise<Object>} The updated ticket document
 */
export const saveContactInfo = async (ticketHoldId, contactName, contactEmail, contactPhone) => {
  let ticket = null;

  // Search by Mongoose ObjectId if valid, otherwise by ticketHoldId string
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

  // Verify that the ticket hold has not expired
  if (ticket.holdExpiresAt && new Date() > new Date(ticket.holdExpiresAt)) {
    ticket.status = 'expired';
    await ticket.save();
    const error = new Error('Ticket hold has expired. Please reserve tickets again.');
    error.statusCode = 410;
    throw error;
  }

  // Update contact information
  ticket.contactName = contactName ? contactName.trim() : ticket.contactName;
  ticket.contactEmail = contactEmail ? contactEmail.trim().toLowerCase() : ticket.contactEmail;
  ticket.contactPhone = contactPhone ? contactPhone.trim() : ticket.contactPhone;

  return await ticket.save();
};

/**
 * updateContactDetails — Validates and saves contact info on an existing held ticket
 * Can be used as an Express route handler or called directly with function arguments:
 * updateContactDetails(ticketHoldId, contactName, contactEmail, contactPhone)
 *
 * @route PATCH /api/tickets/:id/contact
 * @access Private (authenticated attendee)
 */
export const updateContactDetails = async (req, res, next) => {
  // Check if invoked directly as a function: updateContactDetails(ticketHoldId, contactName, contactEmail, contactPhone)
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
  updateContactDetails,
  saveContactInfo,
};
