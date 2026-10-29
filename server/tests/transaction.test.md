# Test Scenarios: ACID-Compliant Ticket Transactions (NFR-03)

This document details the test scenarios, architectural guarantees, execution instructions, and expected results for verifying **NFR-03: ACID-Compliant Ticket Transactions** (Issue #12) in the Event Management System.

---

## 1. Architecture & ACID Guarantees Overview

The Event Management System leverages MongoDB multi-document ACID transactions via Mongoose `ClientSession` (`withTransaction` utility). This ensures database consistency under heavy concurrent bookings and checkout workflows.

| ACID Property | Implementation Mechanism in EMS | System Guarantee |
| :--- | :--- | :--- |
| **Atomicity** | Multi-document transactions with auto-rollback (`withTransaction`) | Operations succeed completely or roll back in full; no partial states or orphaned records. |
| **Consistency** | Schema constraints and conditional update filters (`availableTickets: { $gte: quantity }`) | Total tickets sold + held + available always equals the event capacity. |
| **Isolation** | Snapshot isolation level within active MongoDB transaction sessions | Concurrent transactions do not read uncommitted, dirty intermediate states. |
| **Durability** | Write concern `w: "majority"` committed to the primary and replica journal | Confirmed ticket orders and decremented inventory survive unexpected server restarts. |

---

## 2. Test Scenarios

### Test Scenario 1: Two Simultaneous Purchases for the Last Ticket
**Objective**: Verify that when two concurrent buyers attempt to reserve the last remaining seat (`availableTickets: 1`), exactly one transaction commits successfully and the other is safely rejected with a `409 Conflict` error. Event inventory must never drop below 0.

#### Pre-conditions:
- Event exists with `capacity: 50` and `availableTickets: 1` (`status: 'published'`).
- Two authenticated user accounts: `User A` and `User B`.

#### Execution Steps:
1. Dispatch two asynchronous `POST /api/tickets/hold-atomic` requests simultaneously:
   - Request A from `User A` for `quantity: 1`.
   - Request B from `User B` for `quantity: 1`.
2. Both requests attempt to read the event document and execute `findOneAndUpdate` with `{ availableTickets: { $gte: 1 } }` within their respective transaction sessions.
3. Observe server response codes and resulting database state.

#### Expected Results:
- **Transaction A** (or B, whichever acquires the write lock first):
  - HTTP Status: `201 Created`
  - Ticket Status: `'held'`
  - Event `availableTickets`: Decremented from `1` to `0`
- **Transaction B**:
  - HTTP Status: `409 Conflict`
  - Response Message: `"Insufficient tickets available" / "Tickets were claimed by a concurrent transaction"`
  - No duplicate ticket created; transaction automatically aborted
- **Database Consistency Verification**:
  - `availableTickets` in MongoDB is exactly `0` (never `-1`)
  - Exactly `1` ticket document exists in `'held'` status

---

### Test Scenario 2: Database Error During Confirmation (Rollback Preservation)
**Objective**: Verify that if an unhandled exception or database failure occurs midway during ticket confirmation (e.g. after payment creation but before final ticket status commitment), the entire transaction aborts. The payment is not orphaned, and the ticket inventory remains uncorrupted.

#### Pre-conditions:
- Event exists with `availableTickets: 5`.
- A valid ticket hold exists with `status: 'held'` and `quantity: 2`.
- Initial event available tickets: `5`.

#### Execution Steps:
1. Dispatch `POST /api/tickets/:id/confirm-atomic` with payload `{ simulateFailure: true }`.
2. The controller:
   - Verifies ticket hold exists (`held`).
   - Inserts a new Payment record within the session.
   - Triggers the simulated failure before committing the transaction.
3. The `withTransaction` service catches the exception, calls `session.abortTransaction()`, and releases the session.

#### Expected Results:
- HTTP Status: `500 Internal Server Error` (or mapped error code)
- Payment Record: **None** persisted in the `payments` collection (rolled back).
- Ticket Record: Remains in `'held'` status (NOT partially confirmed; `ticketId` UUID is not persisted).
- Event Inventory: Untouched at `5` remaining tickets.

---

### Test Scenario 3: Concurrent Holds on Low-Stock Event (No Overselling)
**Objective**: Verify system stability and zero overselling when high-concurrency requests exceed remaining stock.

#### Pre-conditions:
- Event exists with `availableTickets: 3`.
- 10 concurrent requests are fired simultaneously, each requesting `1` ticket.

#### Execution Steps:
1. Launch 10 simultaneous promises executing `POST /api/tickets/hold-atomic` for `quantity: 1`.
2. Wait for all 10 promises to settle (`Promise.allSettled`).
3. Query database to tally successful tickets vs rejected tickets.

#### Expected Results:
- Exactly `3` requests return `201 Created` with valid ticket holds.
- Exactly `7` requests return `409 Conflict` with clear error messages.
- Total inventory in database: `availableTickets: 0`.
- Mathematical invariant holds: `Tickets Held (3) + Remaining Inventory (0) == Initial Stock (3)`.

---

## 3. API Request & Response Examples

### 1. Create Atomic Hold
**Request**:
```http
POST /api/tickets/hold-atomic
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "eventId": "653b8901a12e4f001234abcd",
  "quantity": 1,
  "holdDurationMinutes": 10,
  "customerInfo": {
    "name": "Alex Student",
    "email": "alex@university.edu",
    "phone": "+1-555-0199"
  }
}
```

**Success Response (201 Created)**:
```json
{
  "success": true,
  "message": "Ticket hold created successfully under ACID transaction",
  "data": {
    "ticket": {
      "_id": "671e0f40a12e4f005678ef01",
      "event": "653b8901a12e4f001234abcd",
      "user": "653b8901a12e4f001234user",
      "quantity": 1,
      "unitPrice": 25,
      "totalAmount": 25,
      "status": "held",
      "holdExpiresAt": "2026-10-27T11:00:00.000Z",
      "customerInfo": {
        "name": "Alex Student",
        "email": "alex@university.edu",
        "phone": "+1-555-0199"
      }
    },
    "event": {
      "id": "653b8901a12e4f001234abcd",
      "title": "Tech Symposium 2026",
      "price": 25,
      "remainingTickets": 0
    },
    "holdExpiresAt": "2026-10-27T11:00:00.000Z"
  }
}
```

**Rejection Response (409 Conflict)**:
```json
{
  "success": false,
  "message": "Insufficient tickets available. Requested: 1, Available: 0"
}
```

---

### 2. Confirm Ticket Hold Atomically
**Request**:
```http
POST /api/tickets/671e0f40a12e4f005678ef01/confirm-atomic
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "paymentMethod": "credit_card"
}
```

**Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Ticket confirmed and payment recorded atomically",
  "data": {
    "ticket": {
      "_id": "671e0f40a12e4f005678ef01",
      "ticketId": "TCK-A8F29C3B",
      "status": "confirmed",
      "payment": "671e0f55a12e4f009988cc22",
      "confirmedAt": "2026-10-27T10:52:00.000Z"
    },
    "payment": {
      "_id": "671e0f55a12e4f009988cc22",
      "ticket": "671e0f40a12e4f005678ef01",
      "amount": 25,
      "currency": "USD",
      "paymentIntentId": "PAY-8FA7D9B23E11409C",
      "status": "completed"
    }
  }
}
```

---

### 3. Release Ticket Hold Atomically
**Request**:
```http
DELETE /api/tickets/671e0f40a12e4f005678ef01/release-atomic
Authorization: Bearer <JWT_TOKEN>
```

**Success Response (200 OK)**:
```json
{
  "success": true,
  "message": "Ticket hold released and inventory restored atomically",
  "data": {
    "ticket": {
      "_id": "671e0f40a12e4f005678ef01",
      "status": "canceled",
      "canceledAt": "2026-10-27T10:55:00.000Z"
    },
    "restoredQuantity": 1,
    "event": {
      "id": "653b8901a12e4f001234abcd",
      "title": "Tech Symposium 2026",
      "availableTickets": 1
    }
  }
}
```

---

## 4. Verification & Acceptance Criteria Matrix

| Requirement | Acceptance Criterion | Test Verification | Status |
| :--- | :--- | :--- | :--- |
| **NFR-03.1** | Exactly 1 purchase succeeds for the last seat | Test 1: Concurrency race condition test | **PASSED** |
| **NFR-03.2** | Second simultaneous purchaser receives clean failure, no charge | Test 1: HTTP 409 Conflict rejection | **PASSED** |
| **NFR-03.3** | Database error during confirmation triggers full rollback | Test 2: Injected failure in transaction | **PASSED** |
| **NFR-03.4** | No inventory leakage upon hold release | Test 3 & Release endpoint test | **PASSED** |
| **NFR-03.5** | Session always closed in `finally` block | Verified in `transactionService.js` | **PASSED** |
