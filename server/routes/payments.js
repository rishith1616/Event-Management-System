/**
 * routes/payments.js — Payment API Routes
 *
 * Defines REST endpoints for processing charges, issuing refunds,
 * and inspecting payment provider configurations.
 */

import express from 'express';
import {
  processPayment,
  processRefund,
  getProviderInfo,
  auditPciStorage,
} from '../controllers/paymentController.js';
import { auth, admin } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route   POST /api/payments/process
 * @desc    Process a new payment via the active PaymentProvider
 * @access  Private (auth required)
 */
router.post('/process', auth, processPayment);

/**
 * @route   POST /api/payments/:id/refund
 * @desc    Issue a refund for a previously captured payment
 * @access  Private (auth required)
 */
router.post('/:id/refund', auth, processRefund);

/**
 * @route   GET /api/payments/provider-info
 * @desc    Retrieve information about the active payment gateway provider
 * @access  Private/Admin (auth + admin required)
 */
router.get('/provider-info', auth, admin, getProviderInfo);

/**
 * @route   GET /api/payments/pci-audit
 * @desc    Run PCI-DSS compliance storage audit
 * @access  Private
 */
router.get('/pci-audit', auth, auditPciStorage);


export default router;
