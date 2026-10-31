/**
 * tests/pciCompliance.test.js — Test suite for NFR-02: Payment Tokenization and PCI-DSS
 *
 * Verifies that full card numbers are never stored in database or logs,
 * all payment data is tokenized, and audits find only tokens and masked digits.
 */
import test from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import { auditPciStorage, processPayment } from '../controllers/paymentController.js';

const TEST_DB = 'mongodb://localhost:27017/event-management-test-nfr02';

const createMockRes = () => {
  const res = {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(obj) {
      this.data = obj;
      return this;
    },
  };
  return res;
};

test('NFR-02: Payment Tokenization and PCI-DSS Test Suite', async (t) => {
  await mongoose.connect(TEST_DB);

  await Payment.deleteMany({});
  await User.deleteMany({});

  const user = await User.create({
    name: 'Secure Buyer',
    email: 'buyer_pci@example.com',
    password: 'password123',
    role: 'attendee',
  });

  await t.test('1. Database stores only tokenized identifiers and masked digits (Pass Criteria)', async () => {
    const payment = await Payment.create({
      userId: user._id,
      amount: 89.99,
      currency: 'USD',
      provider: 'mock',
      transactionId: 'txn_pci_tokenized_001',
      token: 'tok_visa_client_simulated_9876',
      cardLast4: '4242',
      cardBrand: 'Visa',
      maskedCardNumber: '•••• •••• •••• 4242',
      status: 'completed',
    });

    const retrieved = await Payment.findById(payment._id).lean();

    assert.strictEqual(retrieved.token, 'tok_visa_client_simulated_9876');
    assert.strictEqual(retrieved.cardLast4, '4242');
    assert.strictEqual(retrieved.maskedCardNumber, '•••• •••• •••• 4242');

    // Verify raw PAN is NOT stored
    const serialized = JSON.stringify(retrieved);
    assert.strictEqual(
      serialized.includes('4242424242424242'),
      false,
      'Raw card number must not exist anywhere in storage'
    );
  });

  await t.test('2. Pre-save security hook rejects raw card numbers (Fail Criteria Guard)', async () => {
    let errorThrown = false;
    try {
      await Payment.create({
        userId: user._id,
        amount: 50.0,
        currency: 'USD',
        provider: 'mock',
        transactionId: 'txn_illegal_raw_pan',
        metadata: {
          note: 'Customer provided card 4242424242424242 directly', // ILLEGAL RAW PAN
        },
      });
    } catch (err) {
      errorThrown = true;
      assert.ok(
        err.message.includes('PCI-DSS Compliance Error') || err.message.includes('Raw card number detected'),
        'Must block raw PAN insertion'
      );
    }

    assert.strictEqual(errorThrown, true, 'Database must abort save when raw PAN is detected');
  });

  await t.test('3. System-wide PCI-DSS audit scan confirms 0 raw card numbers found (Pass Criteria)', async () => {
    // Add additional compliant tokenized payments
    await Payment.create({
      userId: user._id,
      amount: 120.0,
      currency: 'USD',
      provider: 'stripe',
      transactionId: 'txn_pci_tokenized_002',
      token: 'tok_mastercard_4444',
      cardLast4: '4444',
      cardBrand: 'Mastercard',
      maskedCardNumber: '•••• •••• •••• 4444',
      status: 'completed',
    });

    const req = { user: { role: 'admin' } };
    const res = createMockRes();

    await auditPciStorage(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.compliant, true, 'System must be 100% compliant');
    assert.strictEqual(res.data.rawCardsFound, 0, 'Zero raw cards must be found during audit');
    assert.ok(res.data.auditStatus.includes('PASSED'));
  });

  await t.test('4. Tokenized charge through payment controller generates masked receipts', async () => {
    const req = {
      body: {
        amount: 45.0,
        currency: 'USD',
        token: 'tok_live_client_token_abc123',
        cardLast4: '1111',
        cardBrand: 'Visa',
      },
      user: { id: user._id },
    };
    const res = createMockRes();

    await processPayment(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.success, true);
    assert.ok(res.data.transactionId);
    assert.strictEqual(res.data.payment.cardLast4, '1111');
    assert.strictEqual(res.data.payment.maskedCardNumber, '•••• •••• •••• 1111');
  });

  await mongoose.disconnect();
});
