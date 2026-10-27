/**
 * routes/events.js — Public event browsing routes
 * Exposes endpoints for listing and viewing active, published events.
 */
import express from 'express';
import { getEvents, getEventById } from '../controllers/eventController.js';

const router = express.Router();

// GET /api/events - Browse and filter active published events
router.get('/', getEvents);

// GET /api/events/:id - View single event detail
router.get('/:id', getEventById);

export default router;
