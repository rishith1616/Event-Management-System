/**
 * routes/tickets.js — Express router for ticket endpoints
 * Maps ticket operations including hold reservations, contact detail validation, and payment transition.
 * Implements FR-05 route: PATCH /api/tickets/:id/contact (auth) → validateContact → updateContactDetails
 */
import express from 'express';
import { updateContactDetails } from '../controllers/ticketController.js';
import { validateContact } from '../middleware/validators.js';
import auth from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   PATCH /api/tickets/:id/contact
 * @desc    Validate and update attendee contact details for a held ticket before payment
 * @access  Private (auth required)
 */
router.patch('/:id/contact', auth, validateContact, updateContactDetails);

export default router;
