/**
 * middleware/validators.js — Express validation middleware
 * Uses express-validator to define validation rules for incoming requests.
 * Specifically validates attendee contact details (FR-05) prior to checkout payment.
 */
import { body, validationResult } from 'express-validator';

/**
 * Middleware array to validate attendee contact details for held tickets.
 * Validates:
 * - contactName: required, not empty, trimmed, 2-100 characters
 * - contactEmail: required, valid email format (contains @, valid domain)
 * - contactPhone: required, matches phone pattern (10+ digits, digits only or phone format)
 * Returns 400 with an array of specific error messages if validation fails.
 */
export const validateContact = [
  body('contactName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .bail()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),

  body('contactEmail')
    .trim()
    .notEmpty()
    .withMessage('Email address is required')
    .bail()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),

  body('contactPhone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .bail()
    .custom((value) => {
      // Must contain digits only or standard phone characters (+, -, spaces, parentheses)
      // and must have at least 10 digits
      const validChars = /^[\d\s\-()+]+$/.test(value);
      const digits = (value || '').replace(/\D/g, '');
      if (!validChars || digits.length < 10) {
        throw new Error('Please enter a valid phone number');
      }
      return true;
    }),

  /**
   * Evaluates validation results and halts pipeline if errors exist
   */
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map((err) => err.msg);
      return res.status(400).json({
        success: false,
        message: errorMessages[0] || 'Validation failed',
        errors: errorMessages,
        errorDetails: errors.array(),
      });
    }
    next();
  },
];

export default {
  validateContact,
};
