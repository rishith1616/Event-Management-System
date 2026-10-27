/**
 * middleware/auth.js — JWT verification middleware
 * Authenticates API requests by validating the Bearer token in the Authorization header.
 * Attaches the authenticated user payload to req.user for downstream middleware/handlers.
 */
import jwt from 'jsonwebtoken';

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

      req.user = decoded;
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

export const auth = protect;
export default protect;
