/**
 * middleware/auth.js — JWT verification and role authorization middleware
 * Authenticates API requests by validating the Bearer token in the Authorization header.
 * Attaches the authenticated user object to req.user for downstream middleware/handlers.
 */
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

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
      message: 'Not authorized, no token provided',
    });
  }
};

// Alias export for consistency with prompt
export const auth = protect;

/**
 * Middleware requiring the authenticated user to have the 'attendee' role
 */
export const attendee = (req, res, next) => {
  if (!req.user || req.user.role !== 'attendee') {
    return res.status(403).json({
      success: false,
      message: `Access denied. Attendee role required, but user has role '${req.user ? req.user.role : 'unauthenticated'}'.`,
    });
  }
  next();
};

/**
 * Generic role authorization middleware factory
 * @param  {...string} roles - Allowed user roles
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user ? req.user.role : 'unauthenticated'}' is not authorized to access this route`,
      });
    }
    next();
  };
};

export default protect;
