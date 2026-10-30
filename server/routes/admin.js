/**
 * routes/admin.js — Platform Admin routes for event & account suspensions (FR-09)
 */
import express from 'express';
import {
  getAdminOverview,
  suspendEvent,
  unsuspendEvent,
  suspendUser,
  unsuspendUser,
} from '../controllers/adminController.js';
import auth from '../middleware/auth.js';
import roleCheck from '../middleware/roleCheck.js';

const router = express.Router();

// Enforce admin authentication across all endpoints in this router
router.use(auth, roleCheck('admin'));

// System overview
router.get('/overview', getAdminOverview);

// Event suspension & reinstatement
router.patch('/events/:id/suspend', suspendEvent);
router.patch('/events/:id/unsuspend', unsuspendEvent);

// User & Organizer account suspension & reactivation
router.patch('/users/:id/suspend', suspendUser);
router.patch('/users/:id/unsuspend', unsuspendUser);

export default router;
