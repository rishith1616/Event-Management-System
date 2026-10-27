/**
 * controllers/paymentController.js — Loosely Coupled Payment Controller
 *
 * Implements NFR-05: Processes payments and refunds via the active PaymentProvider strategy.
 * Decouples checkout and ticketing inventory logic from specific gateway SDKs.
 */

import mongoose from 'mongoose';
import { getActiveProvider, getPaymentProvider, getSupportedProviders } from '../services/paymentGateway.js';
import Payment from '../models/Payment.js';

/**
 * Process a customer payment charge using the configured active payment provider.
 *
 * Route: POST /api/payments/process
 * Access: Authenticated (auth middleware)
 *
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Express next middleware
 */
export const processPayment = async (req, res, next) => {
  try {
    const { amount, currency = 'USD', token, eventId, metadata } = req.body;

    // Validate request parameters
    if (amount === undefined || amount === null || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment amount: amount must be a positive number',
      });
    }

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Payment token is required to process transaction',
      });
    }

    // Resolve the active payment provider strategy
    const provider = getActiveProvider();

    // Execute charge through the provider abstraction
    const chargeResult = await provider.charge(amount, currency, token);

    // Handle provider-agnostic payment failure
    if (!chargeResult.success) {
      return res.status(400).json({
        success: false,
        message: chargeResult.error || 'Payment transaction failed',
        provider: provider.getName(),
      });
    }

    // Persist payment record with provider audit data if database is connected
    let paymentRecord;
    try {
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        paymentRecord = await Payment.create({
          userId: req.user?.id || req.user?._id || null,
          eventId: eventId || null,
          amount,
          currency,
          provider: provider.getName(),
          transactionId: chargeResult.transactionId,
          status: 'completed',
          metadata: metadata || {},
        });
      } else {
        paymentRecord = {
          _id: chargeResult.transactionId,
          userId: req.user?.id || req.user?._id || null,
          eventId: eventId || null,
          amount,
          currency,
          provider: provider.getName(),
          transactionId: chargeResult.transactionId,
          status: 'completed',
          metadata: metadata || {},
          createdAt: new Date(),
        };
      }
    } catch (dbError) {
      // In-memory fallback if database write encounters an error
      console.warn('[PaymentController] Database save warning:', dbError.message);
      paymentRecord = {
        _id: chargeResult.transactionId,
        userId: req.user?.id || req.user?._id || null,
        eventId: eventId || null,
        amount,
        currency,
        provider: provider.getName(),
        transactionId: chargeResult.transactionId,
        status: 'completed',
        metadata: metadata || {},
        createdAt: new Date(),
      };
    }

    return res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      provider: provider.getName(),
      transactionId: chargeResult.transactionId,
      payment: paymentRecord,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Process a refund for a previously captured transaction.
 *
 * Route: POST /api/payments/:id/refund
 * Access: Authenticated (auth middleware)
 *
 * @param {import('express').Request} req - Express request
 * @param {import('express').Response} res - Express response
 * @param {import('express').NextFunction} next - Express next middleware
 */
export const processRefund = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Payment identifier is required for refund',
      });
    }

    // Lookup payment record by MongoDB _id or transactionId
    let payment = null;
    try {
      if (mongoose.Types.ObjectId.isValid(id)) {
        payment = await Payment.findById(id);
      }
      if (!payment) {
        payment = await Payment.findOne({ transactionId: id });
      }
    } catch (lookupErr) {
      console.warn('[PaymentController] Payment lookup warning:', lookupErr.message);
    }

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: `Payment record not found for identifier: ${id}`,
      });
    }

    if (payment.status === 'refunded') {
      return res.status(400).json({
        success: false,
        message: 'Payment has already been refunded',
      });
    }

    // Route refund through the original provider or the active provider
    const provider = payment.provider
      ? getPaymentProvider(payment.provider)
      : getActiveProvider();

    const refundAmount = amount !== undefined ? amount : payment.amount;
    const refundResult = await provider.refund(payment.transactionId, refundAmount);

    if (!refundResult.success) {
      return res.status(400).json({
        success: false,
        message: refundResult.error || 'Refund processing failed',
        provider: provider.getName(),
      });
    }

    // Update payment record status
    payment.status = 'refunded';
    payment.refundId = refundResult.refundId;
    payment.refundAmount = refundAmount;
    payment.refundedAt = new Date();

    if (typeof payment.save === 'function') {
      await payment.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      refundId: refundResult.refundId,
      provider: provider.getName(),
      payment,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve metadata about the currently active payment provider.
 *
 * Route: GET /api/payments/provider-info
 * Access: Authenticated Admin (auth, admin middleware)
 *
 * @param {import('express').Request} _req - Express request
 * @param {import('express').Response} res - Express response
 */
export const getProviderInfo = (_req, res) => {
  const provider = getActiveProvider();

  return res.status(200).json({
    success: true,
    activeProvider: provider.getName(),
    configuredEnv: process.env.PAYMENT_PROVIDER || 'mock',
    supportedProviders: getSupportedProviders(),
  });
};

export default {
  processPayment,
  processRefund,
  getProviderInfo,
};
