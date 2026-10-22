# Use Case Flow - Event Management System

### UC01 - User Role Registration and Dashboard Routing
| Field | Details |
| :--- | :--- |
| **Use Case ID** | UC01 |
| **Use Case Name** | User Role Registration and Dashboard Routing |
| **Actor** | Organizer / Attendee |
| **Precondition** | User has accessed the registration page and does not have an active session. |
| **Main Flow** | 1. User navigates to the sign-up page.<br>2. Selects role: Organizer or Attendee.<br>3. Enters account credentials (name, email, secure password).<br>4. Submits the registration form.<br>5. System validates credentials and uniqueness of email.<br>6. System creates account and assigns role-based permissions.<br>7. System directs user to role-specific dashboard (Organizer event tools or Attendee browsing). |
| **Alternative Flow** | 1. If required fields are omitted, system displays validation error.<br>2. If email already exists, system rejects submission and prompts login.<br>3. If an Attendee attempts to reach Organizer dashboard endpoints, system enforces RBAC and denies access. |
| **Postcondition** | User account is registered and authenticated with appropriate role dashboard. |

### UC02 - Create and Publish Event
| Field | Details |
| :--- | :--- |
| **Use Case ID** | UC02 |
| **Use Case Name** | Create and Publish Event |
| **Actor** | Organizer |
| **Precondition** | Organizer is authenticated with active Organizer session. |
| **Main Flow** | 1. Organizer opens Event Management dashboard.<br>2. Clicks Create Event.<br>3. Enters title, date, start time, venue, ticket capacity, and ticket price.<br>4. Configures event category and description.<br>5. Saves draft or selects Publish.<br>6. System validates inputs and ensures capacity limit is positive and compliant with venue regulations.<br>7. System publishes event to public listing. |
| **Alternative Flow** | 1. If mandatory details (date, price, capacity) are missing, system prevents publishing.<br>2. If event date is in the past, system rejects input with descriptive error.<br>3. If saving encounters database failure, system retains entered draft and alerts organizer. |
| **Postcondition** | Event is live, discoverable in search, and ready to accept ticket purchases. |

### UC03 - Browse and Filter Events
| Field | Details |
| :--- | :--- |
| **Use Case ID** | UC03 |
| **Use Case Name** | Browse and Filter Events |
| **Actor** | Attendee |
| **Precondition** | Platform contains published, active events. |
| **Main Flow** | 1. Attendee visits event discovery page.<br>2. System loads and displays active upcoming events.<br>3. Attendee filters by date range, category, or searches by keyword.<br>4. System queries database and returns matching active events in under 2 seconds.<br>5. Attendee selects an event to view full details and ticket options. |
| **Alternative Flow** | 1. If no events match query, system displays 'No active events found'.<br>2. Canceled, suspended, or past events are automatically omitted from search results.<br>3. If query fails due to connectivity, system displays graceful fallback message. |
| **Postcondition** | Attendee views detailed event page with available inventory count. |

### UC04 - Reserve Tickets and Hold Capacity
| Field | Details |
| :--- | :--- |
| **Use Case ID** | UC04 |
| **Use Case Name** | Reserve Tickets and Hold Capacity |
| **Actor** | Attendee |
| **Precondition** | Attendee is authenticated and selected event has available seats. |
| **Main Flow** | 1. Attendee selects ticket quantity and clicks Checkout.<br>2. System initiates ACID-compliant transaction to check available capacity.<br>3. System places a temporary lock/hold on requested seats and decrements available count.<br>4. System initiates checkout countdown timer.<br>5. Attendee enters/confirms attendee details.<br>6. Attendee proceeds to payment stage. |
| **Alternative Flow** | 1. If requested quantity exceeds remaining capacity, system blocks checkout and displays remaining count.<br>2. If concurrent checkouts compete for the last ticket, transactional lock permits one and informs the other.<br>3. If checkout timer expires, system releases held seats back to available capacity. |
| **Postcondition** | Ticket seats are held temporarily and user is transitioned to payment processing. |

### UC05 - Process Payment and Issue Digital Ticket
| Field | Details |
| :--- | :--- |
| **Use Case ID** | UC05 |
| **Use Case Name** | Process Payment and Issue Digital Ticket |
| **Actor** | Attendee / System / Payment Gateway |
| **Precondition** | Active ticket hold exists and Attendee is on payment screen. |
| **Main Flow** | 1. Attendee enters payment details.<br>2. System tokenizes card data and communicates with external payment gateway via REST API.<br>3. Gateway approves charge and returns transaction token.<br>4. System converts temporary hold into permanent inventory reduction.<br>5. System generates unique digital ticket with UUID and QR code.<br>6. System emails confirmation receipt and ticket PDF to buyer.<br>7. System displays confirmation screen with ticket details. |
| **Alternative Flow** | 1. If payment is declined, system releases held tickets back to available inventory.<br>2. System displays payment error message and allows user to retry or cancel.<br>3. Raw credit card data is never stored on platform databases (PCI-DSS compliant). |
| **Postcondition** | Payment is settled, inventory permanently updated, and digital ticket issued. |

### UC06 - Cancel Registration and Process Refund
| Field | Details |
| :--- | :--- |
| **Use Case ID** | UC06 |
| **Use Case Name** | Cancel Registration and Process Refund |
| **Actor** | Attendee |
| **Precondition** | Attendee holds a valid confirmed ticket for an upcoming event. |
| **Main Flow** | 1. Attendee navigates to 'My Tickets' section.<br>2. Selects ticket and clicks Cancel Registration.<br>3. System verifies organizer's refund policy and event date.<br>4. Attendee confirms cancellation.<br>5. System voids unique Ticket ID and restores seat back to available capacity.<br>6. System triggers refund to original payment method via gateway.<br>7. System sends cancellation confirmation email. |
| **Alternative Flow** | 1. If event has already commenced or policy disallows refund, cancellation is denied with clear explanation.<br>2. If refund gateway encounters network timeout, transaction is queued for automatic retry. |
| **Postcondition** | Ticket is voided, seat restored to inventory, and refund credited. |

### UC07 - Export Attendee Manifest (CSV)
| Field | Details |
| :--- | :--- |
| **Use Case ID** | UC07 |
| **Use Case Name** | Export Attendee Manifest (CSV) |
| **Actor** | Organizer |
| **Precondition** | Organizer is logged in and is the owner of the specified event. |
| **Main Flow** | 1. Organizer opens event dashboard and selects specific event.<br>2. Clicks 'Download Attendee Manifest'.<br>3. System executes query joining user, ticket, and payment tables for confirmed attendees.<br>4. System excludes canceled and refunded tickets.<br>5. System generates structured CSV file containing names, emails, and ticket UUIDs.<br>6. Browser initiates download of clean CSV file. |
| **Alternative Flow** | 1. If no tickets have been sold, system provides notification that manifest is currently empty.<br>2. If unauthorized user attempts to trigger manifest endpoint, system blocks request and logs security attempt. |
| **Postcondition** | Clean, verified attendee manifest CSV is downloaded for event check-in staff. |

### UC08 - Platform Admin Suspensions
| Field | Details |
| :--- | :--- |
| **Use Case ID** | UC08 |
| **Use Case Name** | Platform Admin Suspensions |
| **Actor** | Platform Admin |
| **Precondition** | Platform Admin is logged in with administrative privileges. |
| **Main Flow** | 1. Admin accesses Platform Moderation dashboard.<br>2. Reviews flagged event or reported Organizer account.<br>3. Selects 'Suspend Event' or 'Suspend Organizer Account'.<br>4. Enters suspension rationale and confirms action.<br>5. System immediately delists event from public listings.<br>6. System terminates active checkouts and blocks further ticket sales.<br>7. System dispatches policy notification to Organizer. |
| **Alternative Flow** | 1. If someone accesses direct URL of suspended event, system displays 'Event Suspended by Administrator'.<br>2. Admin can review and reinstate mistakenly suspended accounts after verification. |
| **Postcondition** | Fraudulent event/account is deactivated and ticket sales immediately halted. |


# Test Cases – Event Management System

| Test Case ID | Requirement ID | Test Scenario | Preconditions | Test Steps | Expected Result | Priority | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| TC01 | FR-01 | Register as Attendee with valid credentials | User is on registration page | 1. Open Sign Up. 2. Select Attendee role. 3. Enter valid name, email, password. 4. Submit. | Account created and user routed to Attendee browsing dashboard. | High | Not Executed |
| TC02 | FR-01 | Register as Organizer with valid credentials | User is on registration page | 1. Open Sign Up. 2. Select Organizer role. 3. Enter valid name, email, password. 4. Submit. | Account created and user routed to Organizer event creation dashboard. | High | Not Executed |
| TC03 | FR-01 | Prevent duplicate email registration | An account with email test@example.com exists | 1. Fill registration with test@example.com. 2. Submit. | System rejects registration and displays 'Email already registered' error. | High | Not Executed |
| TC04 | FR-01 | Restrict Attendee from Organizer dashboard | User is logged in as Attendee | 1. Manually navigate to /organizer/dashboard. 2. Attempt access. | Access denied (HTTP 403 / redirect to Attendee dashboard). | High | Not Executed |
| TC05 | FR-02 | Create and publish valid event | Organizer is logged in | 1. Open Event Creator. 2. Enter title, date, time, venue, capacity (100), price ($20). 3. Click Publish. | Event is published and immediately visible on public listings. | High | Not Executed |
| TC06 | FR-02 | Reject event creation with missing capacity limit | Organizer is logged in | 1. Fill event details leaving capacity empty. 2. Click Publish. | System blocks publication with 'Capacity limit is required' validation message. | High | Not Executed |
| TC07 | FR-02 | Prevent publishing event with past date | Organizer is logged in | 1. Enter event details with date set to yesterday. 2. Click Publish. | System rejects event and displays date validation error. | High | Not Executed |
| TC08 | FR-02 | Update published event details | Event is published and Organizer is logged in | 1. Open event editor. 2. Modify description and venue. 3. Save changes. | Event details updated successfully and reflected publicly. | Medium | Not Executed |
| TC09 | FR-03 | Filter events by category | Events exist across 'Tech' and 'Music' categories | 1. Navigate to Events page. 2. Select 'Tech' category filter. | Only active events in the 'Tech' category are displayed. | Medium | Not Executed |
| TC10 | FR-03 | Filter events by date range | Active events scheduled across various dates exist | 1. Select date range filter (e.g. Next 7 Days). | Only events scheduled within selected date range are returned. | Medium | Not Executed |
| TC11 | FR-03 | Exclude expired and canceled events from search | Expired and canceled events exist in database | 1. Perform keyword search on main events page. | Expired and canceled events do not appear in default search results. | High | Not Executed |
| TC12 | FR-04 | Immediate ticket capacity decrement on checkout hold | Event has 50 tickets available | 1. Attendee selects 2 tickets and clicks Checkout. | Available ticket count drops from 50 to 48 immediately. | High | Not Executed |
| TC13 | FR-04 | Block ticket request exceeding available capacity | Event has 1 ticket remaining | 1. Attendee attempts to purchase 2 tickets. | System blocks checkout with 'Only 1 ticket remaining' alert. | High | Not Executed |
| TC14 | FR-04 | Release held seats on checkout timeout | Attendee placed 2 tickets on hold | 1. Wait until checkout hold timer expires without paying. | Held tickets are released and event capacity returns to previous count. | High | Not Executed |
| TC15 | FR-05 | Validate contact details during checkout | Attendee is at checkout contact stage | 1. Enter invalid email (missing @). 2. Click Continue. | System halts progression with 'Please enter a valid email address' alert. | Medium | Not Executed |
| TC16 | FR-05 | Accept valid attendee contact information | Attendee is at checkout contact stage | 1. Enter valid full name, email, and phone number. 2. Click Continue. | Contact details verified and attendee proceeds to payment screen. | Medium | Not Executed |
| TC17 | FR-06 | Process successful payment and generate ticket | Tickets held, valid test payment token provided | 1. Submit payment. 2. Gateway returns charge approval. | Unique Ticket UUID and QR code generated; confirmation email dispatched. | High | Not Executed |
| TC18 | FR-06 | Handle declined payment gracefully | Tickets held, card declined by gateway | 1. Submit invalid card/declined charge. | Hold released back to inventory; error message displayed with retry option. | High | Not Executed |
| TC19 | FR-06 | Ensure unique UUID on generated tickets | Multiple concurrent successful ticket purchases | 1. Verify generated ticket IDs in database. | Each issued ticket possesses a distinct, non-overlapping UUID. | High | Not Executed |
| TC20 | FR-07 | Cancel registration and void ticket ID | Attendee has active ticket for upcoming event | 1. Open My Tickets. 2. Select ticket. 3. Click Cancel Registration. 4. Confirm. | Ticket ID is voided, capacity increases by 1, and confirmation is sent. | Medium | Not Executed |
| TC21 | FR-07 | Process refund to original payment method | Attendee cancels eligible ticket | 1. Execute confirmed cancellation. | Refund is initiated through payment gateway back to original payment method. | Medium | Not Executed |
| TC22 | FR-07 | Prevent cancellation of past event ticket | Event finished yesterday | 1. Attempt to click Cancel on finished event ticket. | System disables cancellation and displays 'Event has already concluded'. | Medium | Not Executed |
| TC23 | FR-08 | Export clean attendee manifest as CSV | Event has 15 confirmed attendees and 2 canceled | 1. Organizer clicks 'Download Manifest'. | CSV downloads containing exactly the 15 confirmed attendees. | Medium | Not Executed |
| TC24 | FR-08 | Exclude canceled attendees from manifest | Event has canceled registrations | 1. Inspect downloaded CSV manifest. | Canceled tickets and attendee records are completely excluded from manifest. | High | Not Executed |
| TC25 | FR-08 | Restrict manifest download to event owner | User B is not organizer of Event A | 1. User B sends GET request to manifest endpoint for Event A. | Access denied (HTTP 403 Forbidden). | High | Not Executed |
| TC26 | FR-09 | Suspend fraudulent event by Platform Admin | Admin is logged into moderation console | 1. Open reported event. 2. Click Suspend Event. 3. Confirm. | Event immediately disappears from public listings and sales are halted. | High | Not Executed |
| TC27 | FR-09 | Block direct URL checkout on suspended event | Event is in suspended status | 1. Attendee visits direct event URL. 2. Attempt to checkout. | Checkout is blocked with 'This event has been suspended' notice. | High | Not Executed |
| TC28 | FR-09 | Suspend entire Organizer account | Organizer account violates terms of service | 1. Admin clicks Suspend Organizer. 2. Confirm. | Organizer cannot log in and all their published events are de-listed. | High | Not Executed |
| TC29 | NFR-01 | Checkout response under simulated load | Simulate 500 concurrent checkout requests | 1. Execute automated load test against checkout endpoint. | Sub-3-second response times maintained without server timeout. | High | Not Executed |
| TC30 | NFR-01 | Search page latency under standard traffic | 100 active events in database | 1. Perform event search and filter operations. | Search results returned in under 2 seconds. | High | Not Executed |
| TC31 | NFR-02 | Payment card tokenization verification | Attendee completes checkout with test credit card | 1. Inspect database logs and storage records. | No plain-text credit card numbers stored; only gateway token and last 4 digits present. | High | Not Executed |
| TC32 | NFR-02 | PCI-DSS compliance log audit | Complete multiple test payment transactions | 1. Audit application server logs for PAN/CVV. | Sensitive authentication data (CVV/PIN) is never logged or cached. | High | Not Executed |
| TC33 | NFR-03 | ACID concurrent booking transaction test | Event has exactly 1 remaining seat | 1. Two attendees submit checkout simultaneously for the last seat. | ACID transaction guarantees exactly 1 purchase succeeds; 2nd gets graceful failure. | High | Not Executed |
| TC34 | NFR-03 | Rollback inventory hold on transaction failure | Database error simulated during ticket record creation | 1. Complete payment authorization but trigger database exception. | Transaction rolls back safely; ticket count not corrupted. | High | Not Executed |
| TC35 | NFR-04 | Mobile viewport responsive checkout | Viewport set to mobile dimensions (375x667) | 1. Complete full booking flow on mobile device emulator. | Layout adapts with touch-friendly buttons and no horizontal scrolling. | Medium | Not Executed |
| TC36 | NFR-05 | Payment gateway provider decoupling | Payment service abstraction layer in place | 1. Switch payment gateway provider configuration. | Payment service logic switches without modifying core inventory database schema. | Low | Not Executed |