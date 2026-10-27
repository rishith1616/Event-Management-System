/**
 * services/providers/stripeProvider.js — Stripe Payment Provider Implementation
 *
 * Implements the PaymentProvider strategy interface for Stripe.
 * Simulates Stripe API calls including token validation, decline simulation,
 * and refunds with realistic Stripe transaction prefixes ('txn_stripe_' / 'ref_stripe_').
 */

import { PaymentProvider } from '../paymentService.js';
import crypto from 'crypto';

export class StripeProvider extends PaymentProvider {
  /**
   * Process a payment charge simulating Stripe PaymentIntents/Charges API.
   *
   * @param {number} amount - Transaction amount
   * @param {string} currency - Currency code (e.g. 'USD')
   * @param {string} token - Stripe payment token (e.g. 'tok_visa', 'tok_chargeDeclined')
   * @returns {Promise<{ success: boolean, transactionId: string|null, error: string|null }>}
   */
  async charge(amount, currency = 'USD', token) {
    // Basic input validation
    if (!amount || amount <= 0) {
      return {
        success: false,
        transactionId: null,
        error: 'Invalid charge amount: amount must be greater than zero',
      };
    }

    if (!token) {
      return {
        success: false,
        transactionId: null,
        error: 'Missing payment token: Stripe requires a valid token or source',
      };
    }

    // Simulate Stripe payment failure / card declined scenarios
    if (typeof token === 'string' && token.toLowerCase().includes('declined')) {
      return {
        success: false,
        transactionId: null,
        error: 'Payment declined: The card has been declined by the issuer (Stripe)',
      };
    }

    // Simulate successful Stripe transaction
    const randomSuffix = crypto.randomBytes(8).toString('hex');
    const transactionId = `txn_stripe_${Date.now()}_${randomSuffix}`;

    return {
      success: true,
      transactionId,
      error: null,
    };
  }

  /**
   * Process a refund simulating Stripe Refunds API.
   *
   * @param {string} transactionId - Original Stripe transaction ID
   * @param {number} amount - Amount to refund
   * @returns {Promise<{ success: boolean, refundId: string|null, error: string|null }>}
   */
  async refund(transactionId, amount) {
    if (!transactionId) {
      return {
        success: false,
        refundId: null,
        error: 'Missing transaction ID: Stripe requires a valid charge ID for refunds',
      };
    }

    if (amount !== undefined && amount <= 0) {
      return {
        success: false,
        refundId: null,
        error: 'Invalid refund amount: amount must be greater than zero',
      };
    }

    // Simulate successful Stripe refund
    const randomSuffix = crypto.randomBytes(8).toString('hex');
    const refundId = `ref_stripe_${Date.now()}_${randomSuffix}`;

    return {
      success: true,
      refundId,
      error: null,
    };
  }

  /**
   * Return provider name identifier.
   *
   * @returns {string} Provider name
   */
  getName() {
    return 'Stripe';
  }
}

export default StripeProvider;
