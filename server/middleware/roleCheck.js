/**
 * middleware/roleCheck.js — Role authorization middleware
 * Factory middleware to restrict access to specific user roles (e.g. organizer, admin, attendee).
 */

/**
 * Authorize specified roles
 * @param  {...string} roles - Allowed user roles
 * @returns {Function} Express middleware function
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

export default authorize;
