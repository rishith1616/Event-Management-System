/**
 * routes/tickets.js — Express Router for Ticket Operations
 * 
 * Exposes atomic, transaction-wrapped endpoints for ticket reservations,
 * confirmation with payment processing, and hold release with inventory recovery.
 * Protected by JWT authentication middleware.
 */
import express from 'express';
import {
  createHoldAtomic,
  confirmTicketAtomic,
  releaseHoldAtomic,
  getTicketById,
  getMyTickets,
} from '../controllers/ticketController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

// ── Atomic ACID Endpoints (NFR-03) ──────────────────────────────────
router.post('/hold-atomic', protect, createHoldAtomic);
router.post('/:id/confirm-atomic', protect, confirmTicketAtomic);
router.delete('/:id/release-atomic', protect, releaseHoldAtomic);

// ── Query Endpoints ─────────────────────────────────────────────────
router.get('/my-tickets', protect, getMyTickets);
router.get('/:id', protect, getTicketById);

export default router;
