/**
 * routes/auth.js — Authentication and authorization routes
 * Endpoints for user registration, login, and fetching current user profile.
 */
import express from 'express';
import { register, login, getMe } from '../controllers/authController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', protect, getMe);

export default router;
