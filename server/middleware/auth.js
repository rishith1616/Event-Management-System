/**
 * middleware/auth.js — JWT verification middleware
 * Extracts and verifies bearer token from Authorization header,
 * attaching the authenticated user payload to req.user.
 */
import jwt from 'jsonwebtoken';

const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'jwt_secret_dev_key'
    );

    // Standardize user object structure on req.user
    const userData = decoded.user || decoded;
    req.user = {
      ...userData,
      id: userData.id || userData._id,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};

export default auth;
