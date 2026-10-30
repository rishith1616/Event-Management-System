/**
 * tests/cancellation.test.js — Automated test suite for FR-07: Attendee Cancellations and Refunds
 * Verifies that canceling voids the ticket, restores event seat capacity, and issues a refund.
 */
import test from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import Event from '../models/Event.js';
import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import { cancelTicketAndRefund } from '../controllers/ticketController.js';

const TEST_DB = 'mongodb://localhost:27017/event-management-test-fr07';

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

test('FR-07: Attendee Cancellations and Refunds Test Suite', async (t) => {
  await mongoose.connect(TEST_DB);

  await Event.deleteMany({});
  await Ticket.deleteMany({});
  await User.deleteMany({});
  await Payment.deleteMany({});

  const organizer = await User.create({
    name: 'Test Organizer',
    email: 'organizer_fr07@example.com',
    password: 'password123',
    role: 'organizer',
  });

  const attendee = await User.create({
    name: 'Bob Attendee',
    email: 'bob_fr07@example.com',
    password: 'password123',
    role: 'attendee',
  });

  const otherAttendee = await User.create({
    name: 'Charlie Attendee',
    email: 'charlie_fr07@example.com',
    password: 'password123',
    role: 'attendee',
  });

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 10);

  const testEvent = await Event.create({
    title: 'Future Tech Conference 2026',
    date: futureDate,
    time: '10:00 AM',
    venue: 'Convention Center',
    capacity: 50,
    availableTickets: 48, // 2 tickets booked
    price: 75,
    category: 'tech',
    status: 'published',
    organizer: organizer._id,
  });

  const paymentRecord = await Payment.create({
    userId: attendee._id,
    eventId: testEvent._id,
    amount: 150,
    currency: 'USD',
    provider: 'mock',
    transactionId: 'txn_mock_fr07_test',
    status: 'completed',
  });

  const confirmedTicket = await Ticket.create({
    event: testEvent._id,
    user: attendee._id,
    quantity: 2,
    unitPrice: 75,
    totalAmount: 150,
    status: 'confirmed',
    ticketId: 'tkt_fr07_12345',
    payment: paymentRecord._id,
    contactName: 'Bob Attendee',
    contactEmail: 'bob_fr07@example.com',
  });

  await t.test('1. Canceling voids ticket and restores seat capacity (Pass Criteria)', async () => {
    const req = {
      params: { id: confirmedTicket._id.toString() },
      body: { reason: 'Schedule conflict' },
      user: { _id: attendee._id, role: 'attendee' },
    };
    const res = createMockRes();

    await cancelTicketAndRefund(req, res, () => {});

    assert.strictEqual(res.statusCode, 200, 'Should return HTTP 200 OK');
    assert.strictEqual(res.data.success, true, 'Response success should be true');

    // Check updated ticket status
    const updatedTicket = await Ticket.findById(confirmedTicket._id);
    assert.strictEqual(updatedTicket.status, 'cancelled', 'Ticket status should be voided/cancelled');
    assert.ok(updatedTicket.canceledAt, 'Canceled timestamp should be set');
    assert.strictEqual(updatedTicket.cancellationReason, 'Schedule conflict');

    // Verify seat inventory incremented (48 -> 50)
    const updatedEvent = await Event.findById(testEvent._id);
    assert.strictEqual(updatedEvent.availableTickets, 50, 'Available tickets must increment back by ticket quantity (2 seats freed)');
  });

  await t.test('2. Refund is recorded and linked with refundId', async () => {
    const updatedTicket = await Ticket.findById(confirmedTicket._id);
    assert.ok(updatedTicket.refundId, 'Refund ID must be generated');
    assert.strictEqual(updatedTicket.refundAmount, 150, 'Refund amount must equal totalAmount');

    const updatedPayment = await Payment.findById(paymentRecord._id);
    assert.strictEqual(updatedPayment.status, 'refunded', 'Payment record status should be refunded');
    assert.ok(updatedPayment.refundId, 'Payment record refundId should be populated');
  });

  await t.test('3. A canceled ticket cannot be canceled again', async () => {
    const req = {
      params: { id: confirmedTicket._id.toString() },
      body: {},
      user: { _id: attendee._id, role: 'attendee' },
    };
    const res = createMockRes();

    await cancelTicketAndRefund(req, res, () => {});

    assert.strictEqual(res.statusCode, 400, 'Should return 400 for already canceled ticket');
    assert.strictEqual(res.data.message, 'This ticket has already been canceled');
  });

  await t.test('4. Unauthorized user cannot cancel another attendees ticket', async () => {
    const otherTicket = await Ticket.create({
      event: testEvent._id,
      user: attendee._id,
      quantity: 1,
      unitPrice: 75,
      totalAmount: 75,
      status: 'confirmed',
      ticketId: 'tkt_fr07_other',
    });

    const req = {
      params: { id: otherTicket._id.toString() },
      body: {},
      user: { _id: otherAttendee._id, role: 'attendee' }, // Different user!
    };
    const res = createMockRes();

    await cancelTicketAndRefund(req, res, () => {});

    assert.strictEqual(res.statusCode, 403, 'Should return 403 Forbidden for unauthorized user');
  });

  await t.test('5. Canceled tickets do not count as active seats (Acceptance Criteria)', async () => {
    const activeTicketsCount = await Ticket.countDocuments({
      event: testEvent._id,
      status: 'confirmed',
    });

    assert.strictEqual(activeTicketsCount, 1, 'Only non-canceled tickets count as active');
  });

  await mongoose.disconnect();
});
