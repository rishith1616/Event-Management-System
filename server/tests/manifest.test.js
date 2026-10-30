/**
 * tests/manifest.test.js — Integration & functional test suite for FR-08: Attendee Manifest Download
 *
 * Verifies that organizers can export a CSV manifest of paid, confirmed attendees,
 * and ensures canceled/held/expired tickets are strictly excluded.
 */
import test from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import Event from '../models/Event.js';
import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import { getAttendeeManifest } from '../controllers/eventController.js';

const TEST_DB = 'mongodb://localhost:27017/event-management-test-fr08';

const createMockRes = () => {
  const res = {
    statusCode: 200,
    headers: {},
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, val) {
      this.headers[name] = val;
      return this;
    },
    send(payload) {
      this.data = payload;
      return this;
    },
    json(obj) {
      this.data = obj;
      return this;
    },
  };
  return res;
};

test('FR-08: Attendee Manifest Download Test Suite', async (t) => {
  await mongoose.connect(TEST_DB);

  await Event.deleteMany({});
  await Ticket.deleteMany({});
  await User.deleteMany({});

  const organizer = await User.create({
    name: 'Event Host',
    email: 'host_fr08@example.com',
    password: 'password123',
    role: 'organizer',
  });

  const otherOrganizer = await User.create({
    name: 'Other Host',
    email: 'other_host_fr08@example.com',
    password: 'password123',
    role: 'organizer',
  });

  const admin = await User.create({
    name: 'Platform Admin',
    email: 'admin_fr08@example.com',
    password: 'password123',
    role: 'admin',
  });

  const attendeePaid1 = await User.create({
    name: 'Alice Wonder',
    email: 'alice_fr08@example.com',
    password: 'password123',
    role: 'attendee',
  });

  const attendeePaid2 = await User.create({
    name: 'David Miller',
    email: 'david_fr08@example.com',
    password: 'password123',
    role: 'attendee',
  });

  const attendeeCanceled = await User.create({
    name: 'Eve Canceled',
    email: 'eve_fr08@example.com',
    password: 'password123',
    role: 'attendee',
  });

  const attendeeHeld = await User.create({
    name: 'Frank Held',
    email: 'frank_fr08@example.com',
    password: 'password123',
    role: 'attendee',
  });

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 15);

  const event = await Event.create({
    title: 'PES Tech Symposium 2026',
    date: futureDate,
    time: '11:00 AM',
    venue: 'PES Convention Hall',
    capacity: 100,
    availableTickets: 96,
    price: 50,
    category: 'tech',
    status: 'published',
    organizer: organizer._id,
  });

  // 1. Confirmed ticket 1 (Paid)
  await Ticket.create({
    event: event._id,
    user: attendeePaid1._id,
    quantity: 2,
    unitPrice: 50,
    totalAmount: 100,
    status: 'confirmed',
    ticketId: 'tkt_conf_alice_001',
    contactName: 'Alice Wonder',
    contactEmail: 'alice_fr08@example.com',
    contactPhone: '+1-555-0101',
  });

  // 2. Confirmed ticket 2 (Paid)
  await Ticket.create({
    event: event._id,
    user: attendeePaid2._id,
    quantity: 1,
    unitPrice: 50,
    totalAmount: 50,
    status: 'confirmed',
    ticketId: 'tkt_conf_david_002',
    contactName: 'David Miller',
    contactEmail: 'david_fr08@example.com',
    contactPhone: '+1-555-0202',
  });

  // 3. Canceled ticket (SHOULD NOT APPEAR IN MANIFEST)
  await Ticket.create({
    event: event._id,
    user: attendeeCanceled._id,
    quantity: 1,
    unitPrice: 50,
    totalAmount: 50,
    status: 'cancelled',
    ticketId: 'tkt_canc_eve_003',
    contactName: 'Eve Canceled',
    contactEmail: 'eve_fr08@example.com',
  });

  // 4. Temporary Held ticket (SHOULD NOT APPEAR IN MANIFEST)
  await Ticket.create({
    event: event._id,
    user: attendeeHeld._id,
    quantity: 1,
    unitPrice: 50,
    totalAmount: 50,
    status: 'held',
    ticketId: 'tkt_held_frank_004',
    contactName: 'Frank Held',
    contactEmail: 'frank_fr08@example.com',
  });

  await t.test('1. Organizer can download CSV manifest with text/csv header (Pass)', async () => {
    const req = {
      params: { id: event._id.toString() },
      query: {},
      user: { _id: organizer._id, role: 'organizer' },
    };
    const res = createMockRes();

    await getAttendeeManifest(req, res, () => {});

    assert.strictEqual(res.statusCode, 200, 'Should return HTTP 200 OK');
    assert.ok(
      res.headers['Content-Type'].includes('text/csv'),
      'Content-Type must be text/csv'
    );
    assert.ok(
      res.headers['Content-Disposition'].includes('attachment'),
      'Content-Disposition must be attachment'
    );
    assert.ok(typeof res.data === 'string', 'Payload must be CSV string');
  });

  await t.test('2. CSV contains paid confirmed attendees (Pass Criteria)', async () => {
    const req = {
      params: { id: event._id.toString() },
      query: {},
      user: { _id: organizer._id, role: 'organizer' },
    };
    const res = createMockRes();

    await getAttendeeManifest(req, res, () => {});

    const csvLines = res.data.split('\r\n');
    assert.ok(csvLines.length >= 3, 'CSV should contain header + at least 2 confirmed attendees');

    // Headers check
    const header = csvLines[0];
    assert.ok(header.includes('Ticket ID'), 'Header must contain Ticket ID');
    assert.ok(header.includes('Attendee Name'), 'Header must contain Attendee Name');
    assert.ok(header.includes('Attendee Email'), 'Header must contain Attendee Email');

    // Confirmed attendees check
    assert.ok(res.data.includes('Alice Wonder'), 'Must include Alice Wonder');
    assert.ok(res.data.includes('alice_fr08@example.com'), 'Must include Alice email');
    assert.ok(res.data.includes('tkt_conf_alice_001'), 'Must include Alice ticket ID');

    assert.ok(res.data.includes('David Miller'), 'Must include David Miller');
    assert.ok(res.data.includes('david_fr08@example.com'), 'Must include David email');
  });

  await t.test('3. Canceled and held tickets are strictly excluded (Fail Criteria Test)', async () => {
    const req = {
      params: { id: event._id.toString() },
      query: {},
      user: { _id: organizer._id, role: 'organizer' },
    };
    const res = createMockRes();

    await getAttendeeManifest(req, res, () => {});

    // Must NOT contain canceled or held attendee records
    assert.strictEqual(
      res.data.includes('Eve Canceled'),
      false,
      'Canceled ticket attendee must NOT appear in manifest (Fail Criteria)'
    );
    assert.strictEqual(
      res.data.includes('tkt_canc_eve_003'),
      false,
      'Canceled ticket ID must NOT appear in manifest'
    );
    assert.strictEqual(
      res.data.includes('Frank Held'),
      false,
      'Temporary held ticket must NOT appear in manifest'
    );
  });

  await t.test('4. Unauthorized organizer is rejected with 403 Forbidden', async () => {
    const req = {
      params: { id: event._id.toString() },
      query: {},
      user: { _id: otherOrganizer._id, role: 'organizer' }, // Different organizer!
    };
    const res = createMockRes();

    await getAttendeeManifest(req, res, () => {});

    assert.strictEqual(res.statusCode, 403, 'Should return HTTP 403 Forbidden');
    assert.strictEqual(res.data.success, false);
  });

  await t.test('5. Admin has permission to download manifest', async () => {
    const req = {
      params: { id: event._id.toString() },
      query: {},
      user: { _id: admin._id, role: 'admin' },
    };
    const res = createMockRes();

    await getAttendeeManifest(req, res, () => {});

    assert.strictEqual(res.statusCode, 200, 'Admin should have access to manifest');
    assert.ok(res.data.includes('Alice Wonder'), 'Admin manifest should include attendees');
  });

  await mongoose.disconnect();
});
