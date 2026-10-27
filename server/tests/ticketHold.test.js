/**
 * tests/ticketHold.test.js — Integration & functional test suite for FR-04: Temporary Ticket Hold
 * Verifies atomic capacity management, hold expiration release, and concurrency safety.
 */
import mongoose from 'mongoose';
import Event from '../models/Event.js';
import Ticket from '../models/Ticket.js';
import User from '../models/User.js';
import {
  createHold,
  releaseExpiredHolds,
  releaseExpiredHoldsInternal,
  getMyHolds,
  cancelHold,
  getHoldById,
} from '../controllers/ticketController.js';

const TEST_DB = 'mongodb://localhost:27017/event-management-test-fr04';

// Mock Express response helper
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

async function runTests() {
  console.log('--- Starting FR-04 Ticket Hold Test Suite ---');
  await mongoose.connect(TEST_DB);

  // Clean test database
  await Event.deleteMany({});
  await Ticket.deleteMany({});
  await User.deleteMany({});

  // Setup test users
  const attendeeUser1 = await User.create({
    name: 'Alice Attendee',
    email: 'alice@example.com',
    password: 'password123',
    role: 'attendee',
  });

  const attendeeUser2 = await User.create({
    name: 'Bob Attendee',
    email: 'bob@example.com',
    password: 'password123',
    role: 'attendee',
  });

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // Test 1: TC12 - Immediate ticket capacity decrement on checkout hold
    // -------------------------------------------------------------
    console.log('\nTest 1: Immediate ticket capacity decrement on checkout hold (TC12)');
    const event1 = await Event.create({
      title: 'Tech Conference 2026',
      description: 'Annual flagship technology conference',
      date: new Date('2026-11-15'),
      time: '09:00 AM',
      venue: 'Metropolitan Convention Center',
      capacity: 50,
      availableTickets: 50,
      price: 150,
      category: 'Conference',
      status: 'published',
    });

    const req1 = {
      user: attendeeUser1,
      body: { eventId: event1._id.toString(), quantity: 2 },
    };
    const res1 = createMockRes();

    await createHold(req1, res1, (err) => console.error(err));

    assert(res1.statusCode === 201, 'Status code is 201 Created');
    assert(res1.data?.success === true, 'Hold creation returns success: true');
    assert(res1.data?.hold?.status === 'held', "Ticket status is set to 'held'");
    assert(res1.data?.hold?.quantity === 2, 'Held ticket quantity is 2');

    const updatedEvent1 = await Event.findById(event1._id);
    assert(
      updatedEvent1.availableTickets === 48,
      'Available ticket count immediately drops from 50 to 48'
    );

    // -------------------------------------------------------------
    // Test 2: TC13 - Block ticket request exceeding available capacity
    // -------------------------------------------------------------
    console.log('\nTest 2: Block ticket request exceeding available capacity (TC13)');
    const event2 = await Event.create({
      title: 'Exclusive VIP Masterclass',
      description: 'Intimate workshop with industry leaders',
      date: new Date('2026-12-01'),
      time: '02:00 PM',
      venue: 'Studio A',
      capacity: 10,
      availableTickets: 1, // Only 1 ticket remaining
      price: 500,
      category: 'Workshop',
      status: 'published',
    });

    const req2 = {
      user: attendeeUser1,
      body: { eventId: event2._id.toString(), quantity: 2 },
    };
    const res2 = createMockRes();

    await createHold(req2, res2, (err) => console.error(err));

    assert(res2.statusCode === 400, 'Status code is 400 Bad Request');
    assert(
      res2.data?.message === 'Only 1 ticket remaining',
      "Returns exact alert: 'Only 1 ticket remaining'"
    );

    const checkEvent2 = await Event.findById(event2._id);
    assert(checkEvent2.availableTickets === 1, 'Event capacity remains unchanged at 1');

    // -------------------------------------------------------------
    // Test 3: Concurrency safety - Two buyers cannot hold the same last ticket
    // -------------------------------------------------------------
    console.log('\nTest 3: Concurrency safety - Two buyers competing for 1 last ticket');
    const reqBuyer1 = {
      user: attendeeUser1,
      body: { eventId: event2._id.toString(), quantity: 1 },
    };
    const resBuyer1 = createMockRes();

    const reqBuyer2 = {
      user: attendeeUser2,
      body: { eventId: event2._id.toString(), quantity: 1 },
    };
    const resBuyer2 = createMockRes();

    // Execute both hold requests concurrently
    await Promise.all([
      createHold(reqBuyer1, resBuyer1, (e) => console.error(e)),
      createHold(reqBuyer2, resBuyer2, (e) => console.error(e)),
    ]);

    const buyer1Won = resBuyer1.statusCode === 201;
    const buyer2Won = resBuyer2.statusCode === 201;

    assert(
      (buyer1Won && !buyer2Won) || (!buyer1Won && buyer2Won),
      'Exactly one buyer succeeded and the other was blocked'
    );

    const blockedRes = buyer1Won ? resBuyer2 : resBuyer1;
    assert(blockedRes.statusCode === 400, 'The losing concurrent buyer received HTTP 400');
    assert(
      blockedRes.data?.message?.includes('remaining'),
      'The losing concurrent buyer received insufficient stock alert'
    );

    const postConcurrentEvent = await Event.findById(event2._id);
    assert(postConcurrentEvent.availableTickets === 0, 'Event capacity is now 0 (sold out)');

    // -------------------------------------------------------------
    // Test 4: TC14 - Release held seats on checkout timeout
    // -------------------------------------------------------------
    console.log('\nTest 4: Release held seats on checkout timeout (TC14)');
    const event4 = await Event.create({
      title: 'Morning Yoga Workshop',
      description: 'Wellness event',
      date: new Date('2026-11-20'),
      time: '07:00 AM',
      venue: 'Skyline Park',
      capacity: 20,
      availableTickets: 20,
      price: 30,
      category: 'Other',
      status: 'published',
    });

    // Create a hold that has already expired (15 minutes in past)
    const expiredTimestamp = new Date(Date.now() - 15 * 60 * 1000);
    const expiredHold = await Ticket.create({
      event: event4._id,
      user: attendeeUser1._id,
      quantity: 3,
      status: 'held',
      holdExpiresAt: expiredTimestamp,
    });
    // Deduct the 3 tickets as createHold would
    await Event.findByIdAndUpdate(event4._id, { $inc: { availableTickets: -3 } });

    const beforeReleaseEvent = await Event.findById(event4._id);
    assert(beforeReleaseEvent.availableTickets === 17, 'Event capacity was decremented to 17');

    // Run expiration sweep
    const released = await releaseExpiredHoldsInternal();
    assert(released >= 3, 'Expired hold sweep released at least 3 tickets');

    const refreshedHold = await Ticket.findById(expiredHold._id);
    assert(refreshedHold.status === 'expired', "Hold ticket status updated to 'expired'");

    const restoredEvent = await Event.findById(event4._id);
    assert(
      restoredEvent.availableTickets === 20,
      'Event capacity successfully restored back to 20'
    );

    // -------------------------------------------------------------
    // Test 5: Attendee cancels their own hold
    // -------------------------------------------------------------
    console.log('\nTest 5: Attendee cancels their own hold');
    const reqCancelHold = {
      user: attendeeUser1,
      body: { eventId: event4._id.toString(), quantity: 2 },
    };
    const resCancelHold = createMockRes();
    await createHold(reqCancelHold, resCancelHold, (e) => console.error(e));

    const holdToCancelId = resCancelHold.data?.hold?._id.toString();
    const eventAfterHold = await Event.findById(event4._id);
    assert(eventAfterHold.availableTickets === 18, 'Capacity decremented to 18');

    const reqDoCancel = {
      user: attendeeUser1,
      params: { id: holdToCancelId },
    };
    const resDoCancel = createMockRes();
    await cancelHold(reqDoCancel, resDoCancel, (e) => console.error(e));

    assert(resDoCancel.statusCode === 200, 'Cancel hold returns 200 OK');
    assert(
      resDoCancel.data?.ticket?.status === 'canceled',
      "Ticket status updated to 'canceled'"
    );

    const eventAfterCancel = await Event.findById(event4._id);
    assert(
      eventAfterCancel.availableTickets === 20,
      'Ticket capacity successfully restored to 20'
    );

    // -------------------------------------------------------------
    // Test 6: getMyHolds returns only active holds
    // -------------------------------------------------------------
    console.log('\nTest 6: getMyHolds returns active, non-expired holds only');
    const reqMyHolds = {
      user: attendeeUser1,
    };
    const resMyHolds = createMockRes();
    await getMyHolds(reqMyHolds, resMyHolds, (e) => console.error(e));

    assert(resMyHolds.statusCode === 200, 'getMyHolds returns 200 OK');
    // All returned holds must have status 'held'
    const allHeld = resMyHolds.data?.holds?.every((h) => h.status === 'held');
    assert(allHeld === true, 'All returned holds are in active held status');

    // -------------------------------------------------------------
    // Test 7: getHoldById returns correct details and countdown
    // -------------------------------------------------------------
    console.log('\nTest 7: getHoldById endpoint');
    const activeHold = resMyHolds.data?.holds?.[0];
    if (activeHold) {
      const reqGetHold = {
        user: attendeeUser1,
        params: { id: activeHold._id.toString() },
      };
      const resGetHold = createMockRes();
      await getHoldById(reqGetHold, resGetHold, (e) => console.error(e));

      assert(resGetHold.statusCode === 200, 'getHoldById returns 200 OK');
      assert(resGetHold.data?.isExpired === false, 'isExpired is false for active hold');
      assert(resGetHold.data?.secondsRemaining > 0, 'secondsRemaining is positive');
    }

  } catch (err) {
    console.error('Unexpected error during testing:', err);
    failed++;
  } finally {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    console.log(`\n--- Test Results: ${passed} Passed, ${failed} Failed ---`);
    if (failed > 0) process.exit(1);
  }
}

runTests();
