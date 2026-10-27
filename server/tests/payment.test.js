/**
 * tests/payment.test.js — Unit and Integration Tests for Payment API Layer (NFR-05)
 *
 * Runs with Node.js built-in test runner: node --test tests/payment.test.js
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import PaymentProvider from '../services/paymentService.js';
import StripeProvider from '../services/providers/stripeProvider.js';
import MockProvider from '../services/providers/mockProvider.js';
import {
  getPaymentProvider,
  getActiveProvider,
  registerProvider,
  getSupportedProviders,
} from '../services/paymentGateway.js';
import {
  processPayment,
  processRefund,
  getProviderInfo,
} from '../controllers/paymentController.js';

describe('Payment Strategy Interface (PaymentProvider)', () => {
  test('base class charge() throws error when called directly', async () => {
    const provider = new PaymentProvider();
    await assert.rejects(
      async () => await provider.charge(100, 'USD', 'tok_test'),
      /Method 'charge\(\)' must be implemented/
    );
  });

  test('base class refund() throws error when called directly', async () => {
    const provider = new PaymentProvider();
    await assert.rejects(
      async () => await provider.refund('txn_123', 100),
      /Method 'refund\(\)' must be implemented/
    );
  });

  test('base class getName() throws error when called directly', () => {
    const provider = new PaymentProvider();
    assert.throws(() => provider.getName(), /Method 'getName\(\)' must be implemented/);
  });
});

describe('MockProvider Implementation', () => {
  const provider = new MockProvider();

  test('getName returns MockProvider', () => {
    assert.equal(provider.getName(), 'MockProvider');
  });

  test('charge() succeeds and returns txn_mock_ prefix', async () => {
    const result = await provider.charge(50, 'USD', 'token_123');
    assert.equal(result.success, true);
    assert.match(result.transactionId, /^txn_mock_/);
    assert.equal(result.error, null);
  });

  test('refund() succeeds and returns ref_mock_ prefix', async () => {
    const result = await provider.refund('txn_mock_12345', 50);
    assert.equal(result.success, true);
    assert.match(result.refundId, /^ref_mock_/);
    assert.equal(result.error, null);
  });
});

describe('StripeProvider Implementation', () => {
  const provider = new StripeProvider();

  test('getName returns Stripe', () => {
    assert.equal(provider.getName(), 'Stripe');
  });

  test('charge() succeeds with valid token and returns txn_stripe_ prefix', async () => {
    const result = await provider.charge(75.5, 'USD', 'tok_visa');
    assert.equal(result.success, true);
    assert.match(result.transactionId, /^txn_stripe_/);
    assert.equal(result.error, null);
  });

  test('charge() fails when token contains "declined"', async () => {
    const result = await provider.charge(100, 'USD', 'tok_chargeDeclined');
    assert.equal(result.success, false);
    assert.equal(result.transactionId, null);
    assert.match(result.error, /declined/i);
  });

  test('charge() fails with zero or negative amount', async () => {
    const zeroResult = await provider.charge(0, 'USD', 'tok_visa');
    assert.equal(zeroResult.success, false);

    const negativeResult = await provider.charge(-10, 'USD', 'tok_visa');
    assert.equal(negativeResult.success, false);
  });

  test('charge() fails when token is missing', async () => {
    const result = await provider.charge(50, 'USD', '');
    assert.equal(result.success, false);
    assert.match(result.error, /Missing payment token/);
  });

  test('refund() succeeds with valid transaction ID', async () => {
    const result = await provider.refund('txn_stripe_sample_123', 75.5);
    assert.equal(result.success, true);
    assert.match(result.refundId, /^ref_stripe_/);
    assert.equal(result.error, null);
  });

  test('refund() fails with missing transaction ID', async () => {
    const result = await provider.refund('', 50);
    assert.equal(result.success, false);
    assert.match(result.error, /Missing transaction ID/);
  });

  test('refund() fails with invalid amount', async () => {
    const result = await provider.refund('txn_stripe_123', -5);
    assert.equal(result.success, false);
    assert.match(result.error, /Invalid refund amount/);
  });
});

describe('Payment Gateway Factory', () => {
  test('getPaymentProvider resolves StripeProvider for "stripe"', () => {
    const provider = getPaymentProvider('stripe');
    assert.equal(provider.getName(), 'Stripe');
    assert.ok(provider instanceof StripeProvider);
  });

  test('getPaymentProvider resolves MockProvider for "mock"', () => {
    const provider = getPaymentProvider('mock');
    assert.equal(provider.getName(), 'MockProvider');
    assert.ok(provider instanceof MockProvider);
  });

  test('getPaymentProvider falls back to MockProvider for unknown provider', () => {
    const provider = getPaymentProvider('nonexistent_provider');
    assert.equal(provider.getName(), 'MockProvider');
  });

  test('getActiveProvider reads PAYMENT_PROVIDER env variable', () => {
    const originalEnv = process.env.PAYMENT_PROVIDER;

    try {
      process.env.PAYMENT_PROVIDER = 'stripe';
      assert.equal(getActiveProvider().getName(), 'Stripe');

      process.env.PAYMENT_PROVIDER = 'mock';
      assert.equal(getActiveProvider().getName(), 'MockProvider');
    } finally {
      process.env.PAYMENT_PROVIDER = originalEnv;
    }
  });

  test('registerProvider dynamically registers a new provider strategy', () => {
    class CustomProvider extends PaymentProvider {
      getName() {
        return 'CustomPay';
      }
      async charge() {
        return { success: true, transactionId: 'txn_custom', error: null };
      }
      async refund() {
        return { success: true, refundId: 'ref_custom', error: null };
      }
    }

    registerProvider('custom', CustomProvider);
    const resolved = getPaymentProvider('custom');
    assert.equal(resolved.getName(), 'CustomPay');
    assert.ok(getSupportedProviders().includes('custom'));
  });
});

describe('Payment Controller Integration', () => {
  beforeEach(() => {
    process.env.PAYMENT_PROVIDER = 'mock';
  });

  test('processPayment validates amount and token', async () => {
    const mockRes = {
      statusCode: null,
      jsonData: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        return this;
      },
    };

    // Test missing amount
    await processPayment({ body: { token: 'tok_123' } }, mockRes, () => {});
    assert.equal(mockRes.statusCode, 400);
    assert.match(mockRes.jsonData.message, /Invalid payment amount/);

    // Test missing token
    await processPayment({ body: { amount: 50 } }, mockRes, () => {});
    assert.equal(mockRes.statusCode, 400);
    assert.match(mockRes.jsonData.message, /Payment token is required/);
  });

  test('processPayment succeeds and returns provider-agnostic structure', async () => {
    const mockRes = {
      statusCode: null,
      jsonData: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        return this;
      },
    };

    const req = {
      body: { amount: 150, currency: 'USD', token: 'mock_token' },
      user: { id: 'user_123' },
    };

    await processPayment(req, mockRes, () => {});
    assert.equal(mockRes.statusCode, 200);
    assert.equal(mockRes.jsonData.success, true);
    assert.equal(mockRes.jsonData.provider, 'MockProvider');
    assert.match(mockRes.jsonData.transactionId, /^txn_mock_/);
  });

  test('processPayment handles decline when Stripe provider is active', async () => {
    process.env.PAYMENT_PROVIDER = 'stripe';

    const mockRes = {
      statusCode: null,
      jsonData: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        return this;
      },
    };

    const req = {
      body: { amount: 150, currency: 'USD', token: 'tok_cardDeclined' },
      user: { id: 'user_123' },
    };

    await processPayment(req, mockRes, () => {});
    assert.equal(mockRes.statusCode, 400);
    assert.equal(mockRes.jsonData.success, false);
    assert.match(mockRes.jsonData.message, /declined/i);
    assert.equal(mockRes.jsonData.provider, 'Stripe');
  });

  test('getProviderInfo returns active provider information', () => {
    process.env.PAYMENT_PROVIDER = 'stripe';

    const mockRes = {
      statusCode: null,
      jsonData: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.jsonData = data;
        return this;
      },
    };

    getProviderInfo({}, mockRes);
    assert.equal(mockRes.statusCode, 200);
    assert.equal(mockRes.jsonData.activeProvider, 'Stripe');
  });
});
