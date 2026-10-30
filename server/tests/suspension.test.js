/**
 * tests/suspension.test.js — Test suite for FR-09: Platform Admin Suspensions
 *
 * Verifies that event or organizer suspension instantly removes public listings
 * and blocks ticket sales via direct links, and that reinstatements restore functionality.
 */
import test from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import Event from '../models/Event.js';
import User from '../models/User.js';
import Ticket from '../models/Ticket.js';
import {
  suspendEvent,
  unsuspendEvent,
  suspendUser,
  unsuspendUser,
  getAdminOverview,
} from '../controllers/adminController.js';
import { getEvents } from '../controllers/eventController.js';
import { createHold, createHoldAtomic } from '../controllers/ticketController.js';

const TEST_DB = 'mongodb://localhost:27017/event-management-test-fr09';

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

test('FR-09: Platform Admin Suspensions Test Suite', async (t) => {
  await mongoose.connect(TEST_DB);

  await Event.deleteMany({});
  await User.deleteMany({});
  await Ticket.deleteMany({});

  const admin = await User.create({
    name: 'Chief Admin',
    email: 'admin_fr09@example.com',
    password: 'password123',
    role: 'admin',
  });

  const organizer1 = await User.create({
    name: 'Bad Actor Organizer',
    email: 'bad_org_fr09@example.com',
    password: 'password123',
    role: 'organizer',
  });

  const organizer2 = await User.create({
    name: 'Good Organizer',
    email: 'good_org_fr09@example.com',
    password: 'password123',
    role: 'organizer',
  });

  const attendee = await User.create({
    name: 'Curious Attendee',
    email: 'buyer_fr09@example.com',
    password: 'password123',
    role: 'attendee',
  });

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 20);

  const suspiciousEvent = await Event.create({
    title: 'Suspicious Scalper Gala 2026',
    date: futureDate,
    time: '08:00 PM',
    venue: 'Underground Warehouse',
    capacity: 100,
    availableTickets: 100,
    price: 250,
    category: 'other',
    status: 'published',
    organizer: organizer1._id,
  });

  const legitimateEvent = await Event.create({
    title: 'Legitimate Science Expo 2026',
    date: futureDate,
    time: '09:00 AM',
    venue: 'City Science Center',
    capacity: 200,
    availableTickets: 200,
    price: 30,
    category: 'tech',
    status: 'published',
    organizer: organizer2._id,
  });

  await t.test('1. Admin suspends suspicious event successfully', async () => {
    const req = {
      params: { id: suspiciousEvent._id.toString() },
      body: { reason: 'Violated anti-scalping terms and fraudulent pricing' },
      user: { _id: admin._id, role: 'admin' },
    };
    const res = createMockRes();

    await suspendEvent(req, res, () => {});

    assert.strictEqual(res.statusCode, 200, 'Should return HTTP 200');
    assert.strictEqual(res.data.success, true);

    const updated = await Event.findById(suspiciousEvent._id);
    assert.strictEqual(updated.status, 'suspended');
    assert.strictEqual(updated.isSuspended, true);
    assert.ok(updated.suspendedAt, 'Suspended timestamp must be populated');
    assert.ok(updated.suspensionReason.includes('anti-scalping'));
  });

  await t.test('2. Public catalog immediately removes suspended event (Pass Criteria)', async () => {
    const req = {};
    const res = createMockRes();

    await getEvents(req, res, () => {});

    assert.strictEqual(res.statusCode, 200);
    const eventTitles = res.data.events.map((e) => e.title);

    assert.ok(
      eventTitles.includes('Legitimate Science Expo 2026'),
      'Legitimate event should remain visible'
    );
    assert.strictEqual(
      eventTitles.includes('Suspicious Scalper Gala 2026'),
      false,
      'Suspended event must be completely hidden from public listings (Pass Criteria)'
    );
  });

  await t.test('3. Direct booking/hold on suspended event is blocked with 403 (Fail Criteria check)', async () => {
    const req = {
      body: {
        eventId: suspiciousEvent._id.toString(),
        quantity: 1,
      },
      user: { _id: attendee._id, role: 'attendee' },
    };
    const res = createMockRes();

    await createHold(req, res, () => {});

    assert.strictEqual(
      res.statusCode,
      403,
      'Direct hold attempt on suspended event must return 403 Forbidden (Fail if bought via direct link)'
    );
    assert.strictEqual(res.data.isSuspended, true);
  });

  await t.test('4. Admin suspends bad organizer account and blocks all associated event sales', async () => {
    // Recreate a published event under organizer1
    const secondEvent = await Event.create({
      title: 'Bad Organizer Second Event',
      date: futureDate,
      time: '02:00 PM',
      venue: 'Another Venue',
      capacity: 50,
      availableTickets: 50,
      price: 15,
      category: 'other',
      status: 'published',
      organizer: organizer1._id,
    });

    const suspendUserReq = {
      params: { id: organizer1._id.toString() },
      body: { reason: 'Repeated terms violations across events' },
      user: { _id: admin._id, role: 'admin' },
    };
    const suspendUserRes = createMockRes();

    await suspendUser(suspendUserReq, suspendUserRes, () => {});
    assert.strictEqual(suspendUserRes.statusCode, 200);

    // Verify buyer attempting direct purchase on second event is blocked because organizer is suspended
    const buyReq = {
      body: {
        eventId: secondEvent._id.toString(),
        quantity: 1,
      },
      user: { _id: attendee._id, role: 'attendee' },
    };
    const buyRes = createMockRes();

    await createHold(buyReq, buyRes, () => {});

    assert.strictEqual(
      buyRes.statusCode,
      403,
      'Must block direct link purchase when organizer is suspended'
    );
    assert.ok(
      buyRes.data.message.includes('organizer') && buyRes.data.message.includes('suspended')
    );
  });

  await t.test('5. Admin reinstates event and restores public listing and booking ability', async () => {
    const reinstateReq = {
      params: { id: suspiciousEvent._id.toString() },
      user: { _id: admin._id, role: 'admin' },
    };
    const reinstateRes = createMockRes();

    await unsuspendEvent(reinstateReq, reinstateRes, () => {});
    assert.strictEqual(reinstateRes.statusCode, 200);

    const reinstated = await Event.findById(suspiciousEvent._id);
    assert.strictEqual(reinstated.status, 'published');
    assert.strictEqual(reinstated.isSuspended, false);
  });

  await t.test('6. Admin overview reports correct metric counts', async () => {
    const req = { user: { _id: admin._id, role: 'admin' } };
    const res = createMockRes();

    await getAdminOverview(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.data.metrics.totalEvents >= 2);
    assert.ok(res.data.metrics.totalOrganizers >= 2);
    assert.ok(res.data.metrics.suspendedUsersCount >= 1);
  });

  await mongoose.disconnect();
});
