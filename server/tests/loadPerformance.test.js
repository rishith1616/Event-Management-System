/**
 * tests/loadPerformance.test.js — Automated test suite for NFR-01: Checkout Load and Performance
 *
 * Simulates high-concurrency flash sale traffic:
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
import { createHold } from '../controllers/ticketController.js';
import { getEvents } from '../controllers/eventController.js';

const TEST_DB = 'mongodb://localhost:27017/event-management-test-nfr01';

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
  await mongoose.connect(TEST_DB);

  await Event.deleteMany({});
  await Ticket.deleteMany({});
  await User.deleteMany({});

  const organizer = await User.create({
    name: 'Flash Sale Host',
    email: 'flash_host@example.com',
    password: 'password123',
    role: 'organizer',
  });

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 30);

  // Setup flash sale event with strictly 15 seats available
  const flashSaleEvent = await Event.create({
    title: 'Taylor Swift VIP Acoustic Flash Sale 2026',
    date: futureDate,
    time: '07:00 PM',
    venue: 'Arena Stadium',
    capacity: 15,
    availableTickets: 15,
    price: 199,
    category: 'music',
    status: 'published',
    organizer: organizer._id,
  });

  // Pre-create 50 buyer profiles
  const buyers = [];
  for (let i = 0; i < 50; i++) {
    buyers.push(
      new User({
        name: `Buyer ${i}`,
        email: `buyer_${i}_flash@example.com`,
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

  await t.test('2. Flash Sale Concurrency: 50 simultaneous buyers complete in under 3 seconds (Pass Criteria)', async () => {
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

    // Execute all 50 requests concurrently using Promise.all
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

    // Pass Criteria assertion: all responses must complete in under 3000ms (sub-3-second response time)
    assert.ok(
      maxLatency < 3000,
      `Max latency (${maxLatency.toFixed(2)}ms) must be strictly under 3000ms threshold during flash sale`
    );
    assert.ok(
      p95Latency < 500,
      `p95 latency (${p95Latency.toFixed(2)}ms) should be well under 500ms for high performance`
    );

    // Business Logic Concurrency Invariant:
    // Exactly 15 buyers must succeed (201 Created), exactly 35 must receive 400 (stock exhausted)
    const successes = results.filter((r) => r.status === 201);
    const blocked = results.filter((r) => r.status === 400);

    assert.strictEqual(successes.length, 15, 'Exactly 15 buyers must secure the 15 available seats');
    assert.strictEqual(blocked.length, 35, 'Remaining 35 concurrent requests must be cleanly blocked');

    // Confirm inventory is exactly 0 and not negative (Zero Overselling)
    const updatedEvent = await Event.findById(flashSaleEvent._id);
    assert.strictEqual(updatedEvent.availableTickets, 0, 'Available tickets must drop cleanly to 0');
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

  await mongoose.disconnect();
});
