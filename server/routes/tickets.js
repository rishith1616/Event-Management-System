/**
 * routes/tickets.js — Ticket hold, transaction, and management routes
 * Endpoints for creating holds, updating contact info, canceling holds, atomic ACID transactions, and retrieval.
 */
import express from 'express';
import {
  createHold,
  createHoldAtomic,
  confirmTicketAtomic,
  releaseHoldAtomic,
  cancelHold,
  getMyHolds,
  getHoldById,
  releaseExpiredHolds,
  updateContactDetails,
  getMyTickets,
  getTicketById,
} from '../controllers/ticketController.js';
import { validateContact } from '../middleware/validators.js';
import auth from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/tickets/hold
 * @desc    Create a 10-minute hold on requested ticket quantity
 * @access  Private (Attendee)
 */
router.post('/hold', auth, createHold);

/**
 * @route   POST /api/tickets/hold-atomic
 * @desc    Atomically create a ticket hold with multi-document transaction
 * @access  Private (Attendee)
 */
router.post('/hold-atomic', auth, createHoldAtomic);

/**
 * @route   POST /api/tickets/:id/confirm-atomic
 * @desc    Atomically confirm ticket and record payment with rollback guarantee
 * @access  Private
 */
router.post('/:id/confirm-atomic', auth, confirmTicketAtomic);

/**
 * @route   DELETE /api/tickets/:id/release-atomic
 * @desc    Atomically cancel hold and restore event capacity
 * @access  Private
 */
router.delete('/:id/release-atomic', auth, releaseHoldAtomic);

/**
 * @route   PATCH /api/tickets/:id/contact
 * @desc    Validate and update attendee contact details for a held ticket before payment
 * @access  Private
 */
router.patch('/:id/contact', auth, validateContact, updateContactDetails);

/**
 * @route   DELETE /api/tickets/hold/:id
 * @desc    Cancel an active hold and return tickets to event inventory
 * @access  Private
 */
router.delete('/hold/:id', auth, cancelHold);

/**
 * @route   GET /api/tickets/my-holds
 * @desc    Get all active, non-expired ticket holds for current user
 * @access  Private
 */
router.get('/my-holds', auth, getMyHolds);

/**
 * @route   GET /api/tickets/my-tickets
 * @desc    Get all tickets belonging to authenticated user
 * @access  Private
 */
router.get('/my-tickets', auth, getMyTickets);

/**
 * @route   GET /api/tickets/hold/:id
 * @desc    Get details and countdown timer for a specific hold
 * @access  Private
 */
router.get('/hold/:id', auth, getHoldById);

/**
 * @route   POST /api/tickets/release-expired
 * @desc    Trigger system sweep to release all expired holds
 * @access  Public / Internal
 */
router.post('/release-expired', releaseExpiredHolds);

/**
 * @route   GET /api/tickets/:id
 * @desc    Get details of a specific ticket
 * @access  Private
 */
router.get('/:id', auth, getTicketById);

export default router;
