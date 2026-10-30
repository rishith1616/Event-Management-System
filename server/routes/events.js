/**
 * routes/events.js — Express routing for event management
 * Mounts endpoints for creating, updating, publishing, and listing events.
 */
import express from 'express';
import {
  createEvent,
  updateEvent,
  publishEvent,
  getMyEvents,
  getEvents,
  getEventById,
  getAttendeeManifest,
} from '../controllers/eventController.js';
import auth from '../middleware/auth.js';
import roleCheck from '../middleware/roleCheck.js';

const router = express.Router();

// ── Public Routes ────────────────────────────────────────────────
// GET /api/events — Public listing of published events
router.get('/', getEvents);

// ── Organizer Routes (Protected) ─────────────────────────────────
// GET /api/events/my-events — Organizer's events (must precede /:id)
router.get('/my-events', auth, roleCheck('organizer'), getMyEvents);

// POST /api/events — Create new event (draft)
router.post('/', auth, roleCheck('organizer'), createEvent);

// PUT /api/events/:id — Update existing event
router.put('/:id', auth, roleCheck('organizer'), updateEvent);

// PATCH /api/events/:id/publish — Publish draft event
router.patch('/:id/publish', auth, roleCheck('organizer'), publishEvent);

// ── Public Single Event Route ────────────────────────────────────

// GET /api/events/:id/manifest — Export attendee manifest CSV (FR-08)
router.get('/:id/manifest', auth, getAttendeeManifest);

// GET /api/events/:id — Get event details
router.get('/:id', getEventById);

export default router;
