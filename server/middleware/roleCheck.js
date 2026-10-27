/**
 * middleware/roleCheck.js — Role-based access control middleware
 * Verifies that the authenticated user possesses one of the allowed roles.
 */
const roleCheck = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User role not determined.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access denied for role '${req.user.role}'`,
      });
    }

    next();
  };
};

export default roleCheck;
