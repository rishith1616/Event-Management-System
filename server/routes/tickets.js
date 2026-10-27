/**
 * routes/tickets.js — Ticket hold and management routes
 * Endpoints for creating holds, canceling holds, retrieving active holds, and releasing expired holds.
 */
import express from 'express';
import {
  createHold,
  cancelHold,
  getMyHolds,
  getHoldById,
  releaseExpiredHolds,
} from '../controllers/ticketController.js';
import { auth, attendee } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/tickets/hold
 * @desc    Create a 10-minute hold on requested ticket quantity
 * @access  Private (Attendee)
 */
router.post('/hold', auth, attendee, createHold);

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

export default router;
