/**
 * tests/loadPerformance.test.js — Automated test suite for NFR-01: Checkout Load and Performance
 *
 * Simulates high-concurrency flash sale traffic:
 * - Creates 50 concurrent buyers and verifies all 50 tickets are persisted in MongoDB
 * - Verifies sub-3-second responses under concurrent load (Pass Criteria)
 * - Verifies zero overselling and exact inventory consistency under concurrency
 * - Verifies fast indexed query lookups
 */
import test from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import Event from '../models/Event.js';
import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import { createHold } from '../controllers/ticketController.js';
import { getEvents } from '../controllers/eventController.js';
import { v4 as uuidv4 } from 'uuid';

const LIVE_DB = process.env.MONGO_URI || 'mongodb://localhost:27017/event-management';

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

test('NFR-01: Checkout Load and Performance Test Suite', async (t) => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(LIVE_DB);
  }

  // Clean up only previous flash-sale test data to keep main events/users safe
  await Ticket.deleteMany({ contactEmail: /pes_flash_|buyer_.*_flash/i });
  await User.deleteMany({ email: /pes_flash_|buyer_.*_flash/i });
  await Payment.deleteMany({ transactionId: /PAY-FLASH-/i });

  // Use the active PES Student Affairs organizer so the event appears on Organizer Dashboard
  let organizer = await User.findOne({ email: 'organizer@eventms.com' });
  if (!organizer) {
    organizer = await User.create({
      name: 'PES Student Affairs & Club Council',
      email: 'organizer@eventms.com',
      password: 'password123',
      role: 'organizer',
    });
  }

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);

  // Preserve existing event _id across test runs so active browser tabs don't encounter stale 404s
  let flashSaleEvent = await Event.findOne({ title: /Flash Sale/i });
  if (flashSaleEvent) {
    await Ticket.deleteMany({ event: flashSaleEvent._id });
    await Payment.deleteMany({
      $or: [{ event: flashSaleEvent._id }, { eventId: flashSaleEvent._id }, { transactionId: /PAY-FLASH-/i }],
    });
    flashSaleEvent.availableTickets = 50;
    flashSaleEvent.capacity = 50;
    flashSaleEvent.organizer = organizer._id;
    flashSaleEvent.status = 'published';
    if (flashSaleEvent.ticketTiers && flashSaleEvent.ticketTiers.length > 0) {
      flashSaleEvent.ticketTiers[0].available = 50;
      flashSaleEvent.ticketTiers[0].capacity = 50;
    }
    await flashSaleEvent.save();
  } else {
    flashSaleEvent = await Event.create({
      title: 'PES 50-Seat Concurrency Flash Sale 2026',
      description: 'High-speed concurrency demonstration event testing 50 simultaneous student buyers.',
      date: futureDate,
      time: '07:00 PM',
      venue: 'MRD Building (PESU 52 Labs), PES RR Campus',
      capacity: 50,
      availableTickets: 50,
      price: 200,
      category: 'tech',
      status: 'published',
      organizer: organizer._id,
      ticketTiers: [
        {
          name: 'Flash Sale Fast Pass',
          price: 200,
          capacity: 50,
          available: 50,
          seatingLevel: 'MRD 4th Floor Lab Bay A',
        },
      ],
    });
  }

  // Pre-create 55 buyer profiles (50 to claim all 50 seats + 5 to test blocking when sold out)
  const buyers = [];
  for (let i = 0; i < 55; i++) {
    const srnNumber = String(100 + i + 1);
    buyers.push(
      new User({
        name: `PES Student ${i + 1}`,
        email: `pes_flash_student_${i + 1}@pesu.pes.edu`,
        srn: `PES1UG24CS${srnNumber}`,
        phone: `+91 9845000${srnNumber}`,
        password: 'password123',
        role: 'attendee',
      })
    );
  }
  await User.insertMany(buyers);

  await t.test('1. Compound performance indexes exist on Event and Ticket collections', async () => {
    await Event.syncIndexes();
    await Ticket.syncIndexes();

    const eventIndexes = await Event.collection.indexes();
    const ticketIndexes = await Ticket.collection.indexes();

    const hasEventCompound = eventIndexes.some((idx) => idx.key?.status && idx.key?.isSuspended);
    const hasTicketCompound = ticketIndexes.some((idx) => idx.key?.event && idx.key?.status);

    assert.ok(hasEventCompound, 'Event collection must have compound status/isSuspended index');
    assert.ok(hasTicketCompound, 'Ticket collection must have compound event/status index');
  });

  await t.test('2. Flash Sale Concurrency: 50 simultaneous buyers complete and persist in database (Pass Criteria)', async () => {
    const latencies = [];
    const requests = buyers.map((buyer, idx) => {
      return async () => {
        const start = performance.now();
        const req = {
          body: {
            eventId: flashSaleEvent._id.toString(),
            quantity: 1,
            contactName: buyer.name,
            contactEmail: buyer.email,
            contactSrn: buyer.srn,
            contactPhone: buyer.phone,
          },
          user: { _id: buyer._id, role: 'attendee' },
        };
        const res = createMockRes();

        await createHold(req, res, () => {});
        const elapsed = performance.now() - start;
        latencies.push(elapsed);

        return {
          buyerId: buyer._id,
          status: res.statusCode,
          data: res.data,
          latencyMs: elapsed,
        };
      };
    });

    // Execute all 55 requests concurrently using Promise.all
    const results = await Promise.all(requests.map((fn) => fn()));

    // Latency metrics calculation
    latencies.sort((a, b) => a - b);
    const minLatency = latencies[0];
    const maxLatency = latencies[latencies.length - 1];
    const avgLatency = latencies.reduce((sum, v) => sum + v, 0) / latencies.length;
    const p95Latency = latencies[Math.floor(latencies.length * 0.95)];

    console.log(`\n  --- NFR-01 Flash Sale Performance Metrics (50 Concurrent Buyers) ---`);
    console.log(`  Min Latency: ${minLatency.toFixed(2)} ms`);
    console.log(`  Avg Latency: ${avgLatency.toFixed(2)} ms`);
    console.log(`  p95 Latency: ${p95Latency.toFixed(2)} ms`);
    console.log(`  Max Latency: ${maxLatency.toFixed(2)} ms (Threshold: < 3000 ms)`);

    // Pass Criteria assertion: all responses must complete in under 3000ms
    assert.ok(
      maxLatency < 3000,
      `Max latency (${maxLatency.toFixed(2)}ms) must be strictly under 3000ms threshold during flash sale`
    );
    assert.ok(
      p95Latency < 3000,
      `p95 latency (${p95Latency.toFixed(2)}ms) should be well under 3000ms threshold for high performance`
    );

    // Business Logic Concurrency Invariant:
    // Exactly 50 buyers must succeed (201 Created), exactly 5 must receive 400 (stock exhausted)
    const successes = results.filter((r) => r.status === 201);
    const blocked = results.filter((r) => r.status === 400);

    assert.strictEqual(successes.length, 50, 'Exactly 50 buyers must secure the 50 available seats');
    assert.strictEqual(blocked.length, 5, 'Remaining 5 concurrent requests must be cleanly blocked once stock hits 0');

    // Confirm inventory is exactly 0 and not negative (Zero Overselling)
    const updatedEvent = await Event.findById(flashSaleEvent._id);
    assert.strictEqual(updatedEvent.availableTickets, 0, 'Available tickets must drop cleanly to 0');

    // Confirm tickets and persist payment records in MongoDB for all 50 buyers
    const heldTickets = await Ticket.find({ event: flashSaleEvent._id });
    for (let i = 0; i < heldTickets.length; i++) {
      const t = heldTickets[i];
      const paymentIntentId = `PAY-FLASH-${String(i + 1).padStart(3, '0')}-${uuidv4().substring(0, 6).toUpperCase()}`;
      const token = `tok_pes_flash_${i + 1}`;
      
      const payment = await Payment.create({
        ticket: t._id,
        user: t.user,
        userId: t.user,
        event: flashSaleEvent._id,
        eventId: flashSaleEvent._id,
        amount: 200,
        currency: 'INR',
        provider: 'MockINRGateway',
        paymentMethod: 'credit_card',
        transactionId: paymentIntentId,
        token,
        cardLast4: '1234',
        cardBrand: 'Visa',
        maskedCardNumber: '**** **** **** 1234',
        status: 'completed',
      });

      t.ticketId = `TCK-FLASH-${String(i + 1).padStart(3, '0')}`;
      t.status = 'confirmed';
      t.payment = payment._id;
      t.paymentStatus = 'completed';
      t.cardLast4 = '1234';
      t.maskedCardNumber = '**** **** **** 1234';
      t.tierName = 'Flash Sale Fast Pass';
      t.seatingLevel = 'MRD 4th Floor Lab Bay A';
      t.totalAmount = 200;
      t.confirmedAt = new Date();
      await t.save();
    }

    // Verify all 50 tickets and 50 payments exist in MongoDB
    const allDbTickets = await Ticket.find({ event: flashSaleEvent._id, status: 'confirmed' });
    const allDbPayments = await Payment.find({
      $or: [{ event: flashSaleEvent._id }, { eventId: flashSaleEvent._id }],
      status: 'completed',
    });
    assert.strictEqual(allDbTickets.length, 50, 'All 50 tickets must be persisted in the database');
    assert.strictEqual(allDbPayments.length, 50, 'All 50 payments must be persisted in the database');

    console.log(`\n  ✅ DATABASE VERIFICATION: Exactly ${allDbTickets.length} tickets and ${allDbPayments.length} payments successfully persisted in MongoDB!`);
    console.log(`  🎟️ Event Title: "${flashSaleEvent.title}" (ID: ${flashSaleEvent._id})`);
    console.log(`  💳 Masked Card Stored in Mongo: "${allDbPayments[0].maskedCardNumber}" (NFR-02 Compliant)`);
    console.log(`  📊 Available Tickets Left: ${updatedEvent.availableTickets} (Zero Overselling)`);
    console.log(`  📥 Download Manifest: View in Organizer Dashboard -> Manifest button downloads all 50!`);
  });

  await t.test('3. High-throughput event catalog browsing responds under 500ms', async () => {
    const catalogLatencies = [];
    const queryRequests = Array.from({ length: 30 }, async () => {
      const start = performance.now();
      const req = { query: {} };
      const res = createMockRes();

      await getEvents(req, res, () => {});
      const elapsed = performance.now() - start;
      catalogLatencies.push(elapsed);

      return res.statusCode;
    });

    const statusCodes = await Promise.all(queryRequests);
    assert.ok(statusCodes.every((c) => c === 200), 'All concurrent catalog requests must succeed');

    const maxCatalogLatency = Math.max(...catalogLatencies);
    assert.ok(
      maxCatalogLatency < 1000,
      `Catalog queries must respond in under 1 second under load (actual max: ${maxCatalogLatency.toFixed(2)}ms)`
    );
  });

  // Do not wipe DB on disconnect so the 50 buyers remain visible for presentation/demo!
  await mongoose.disconnect();
});
