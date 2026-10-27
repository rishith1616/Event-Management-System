/**
 * services/providers/mockProvider.js — Mock/Test Payment Provider Implementation
 *
 * Implements the PaymentProvider strategy interface for testing and local development.
 * Always produces successful charges and refunds without making external API network calls,
 * allowing end-to-end checkout flows to be tested reliably in automated suites.
 */

import { PaymentProvider } from '../paymentService.js';
import crypto from 'crypto';

export class MockProvider extends PaymentProvider {
  /**
   * Process a payment charge in mock environment.
   * Always succeeds for automated tests and offline development.
   *
   * @param {number} amount - Charge amount
   * @param {string} currency - Currency code (default: 'USD')
   * @param {string} token - Payment method token
   * @returns {Promise<{ success: boolean, transactionId: string, error: null }>}
   */
  async charge(amount, currency = 'USD', token = 'mock_token') {
    const randomSuffix = crypto.randomBytes(8).toString('hex');
    const transactionId = `txn_mock_${Date.now()}_${randomSuffix}`;

    return {
      success: true,
      transactionId,
      error: null,
    };
  }

  /**
   * Process a refund in mock environment.
   * Always succeeds.
   *
   * @param {string} transactionId - Original transaction ID
   * @param {number} amount - Refund amount
   * @returns {Promise<{ success: boolean, refundId: string, error: null }>}
   */
  async refund(transactionId, amount) {
    const randomSuffix = crypto.randomBytes(8).toString('hex');
    const refundId = `ref_mock_${Date.now()}_${randomSuffix}`;

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
    return 'MockProvider';
  }
}

export default MockProvider;
