/**
 * routes/payments.js — Express routes for payment operations
 * Handles payment processing, hold detail queries, payment lookup by ticket,
 * and order cancellation.
 */
import express from 'express';
import {
  processPayment,
  getPaymentByTicket,
  getHoldDetails,
  cancelHold,
} from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/payments/process
 * @desc    Process payment for a held ticket and issue ticket ID
 * @access  Private (auth required)
 */
router.post('/process', protect, processPayment);

/**
 * @route   GET /api/payments/ticket/:ticketId
 * @desc    Get payment record and receipt for a given ticket
 * @access  Private (auth required)
 */
router.get('/ticket/:ticketId', protect, getPaymentByTicket);

/**
 * @route   GET /api/payments/hold/:holdId
 * @desc    Get hold summary and event details for checkout screen
 * @access  Private (auth required)
 */
router.get('/hold/:holdId', protect, getHoldDetails);

/**
 * @route   POST /api/payments/hold/:holdId/cancel
 * @desc    Voluntarily cancel a hold and release inventory
 * @access  Private (auth required)
 */
router.post('/hold/:holdId/cancel', protect, cancelHold);

export default router;
