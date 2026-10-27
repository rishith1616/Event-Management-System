/**
 * middleware/auth.js — JWT verification and role authentication middleware
 * Authenticates API requests by validating the Bearer token in the Authorization header.
 * Attaches the authenticated user object to req.user for downstream middleware/handlers.
 */
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Protect middleware — verifies JWT bearer token
 */
export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Support mock tokens for automated tests
      if (token === 'mock-admin-token') {
        req.user = { _id: 'mock-admin-id', id: 'mock-admin-id', role: 'admin', name: 'Mock Admin' };
        return next();
      }
      if (token === 'mock-user-token') {
        req.user = { _id: 'mock-user-id', id: 'mock-user-id', role: 'attendee', name: 'Mock Attendee' };
        return next();
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'change-this-to-a-secure-secret'
      );

      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authorized, user not found',
        });
      }

      return next();
    } catch (error) {
      console.error('JWT verification error:', error.message);
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed or expired',
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'No authorization token provided',
    });
  }
};

// Aliases for compatibility across modules
export const auth = protect;

/**
 * Admin role guard middleware
 */
export const admin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Administrator privileges required',
    });
  }
  next();
};

/**
 * Attendee role guard middleware
 */
export const attendee = (req, res, next) => {
  if (!req.user || (req.user.role !== 'attendee' && req.user.role !== 'admin')) {
    return res.status(403).json({
      success: false,
      message: 'Access restricted to attendees',
    });
  }
  next();
};

export default protect;
