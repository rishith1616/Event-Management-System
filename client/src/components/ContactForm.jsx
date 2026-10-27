/**
 * components/ContactForm.jsx — Attendee Contact Details Form
 * Collects and validates attendee name, email address, and phone number before checkout payment.
 * Implements FR-05: Real-time client-side validation, inline error messaging,
 * button disabled state until all fields are valid, and backend PATCH submission.
 */
import React, { useState, useEffect } from 'react';
import api from '../services/api.js';
import './ContactForm.css';

/**
 * Validates a single field by name and value
 * @param {string} fieldName - 'contactName' | 'contactEmail' | 'contactPhone'
 * @param {string} value - The input value to validate
 * @returns {string} Error message or empty string if valid
 */
export const validateField = (fieldName, value) => {
  const trimmed = (value || '').trim();

  switch (fieldName) {
    case 'contactName':
      if (!trimmed) {
        return 'Full name is required';
      }
      if (trimmed.length < 2) {
        return 'Full name must be at least 2 characters';
      }
      if (trimmed.length > 100) {
        return 'Full name cannot exceed 100 characters';
      }
      return '';

    case 'contactEmail':
      if (!trimmed) {
        return 'Email address is required';
      }
      // Strict regex validating standard email pattern with @ and valid domain
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(trimmed)) {
        return 'Please enter a valid email address';
      }
      return '';

    case 'contactPhone':
      if (!trimmed) {
        return 'Phone number is required';
      }
      // Must contain digits only
      if (!/^\d+$/.test(trimmed)) {
        return 'Phone number must contain digits only';
      }
      // Minimum 10 digits
      if (trimmed.length < 10) {
        return 'Phone number must be at least 10 digits';
      }
      if (trimmed.length > 15) {
        return 'Phone number cannot exceed 15 digits';
      }
      return '';

    default:
      return '';
  }
};

/**
 * ContactForm component for checkout contact details step
 *
 * @param {Object} props
 * @param {string} [props.ticketId] - ID of the held ticket
 * @param {Object} [props.initialValues] - Optional prefilled contact details
 * @param {Function} [props.onSuccess] - Callback when contact details are successfully saved
 */
const ContactForm = ({ ticketId = 'current', initialValues = {}, onSuccess }) => {
  const [formData, setFormData] = useState({
    contactName: initialValues.contactName || '',
    contactEmail: initialValues.contactEmail || '',
    contactPhone: initialValues.contactPhone || '',
  });

  const [errors, setErrors] = useState({
    contactName: '',
    contactEmail: '',
    contactPhone: '',
  });

  const [touched, setTouched] = useState({
    contactName: false,
    contactEmail: false,
    contactPhone: false,
  });

  const [serverErrors, setServerErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Validate fields in real-time as formData changes
  useEffect(() => {
    setErrors({
      contactName: validateField('contactName', formData.contactName),
      contactEmail: validateField('contactEmail', formData.contactEmail),
      contactPhone: validateField('contactPhone', formData.contactPhone),
    });
  }, [formData]);

  // Determine if form is completely valid
  const isFormValid =
    formData.contactName.trim().length >= 2 &&
    errors.contactName === '' &&
    formData.contactEmail.trim().length > 0 &&
    errors.contactEmail === '' &&
    formData.contactPhone.trim().length >= 10 &&
    errors.contactPhone === '';

  /**
   * Handle real-time input change
   */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setTouched((prev) => ({ ...prev, [name]: true }));
    if (serverErrors.length > 0) {
      setServerErrors([]);
    }
  };

  /**
   * Mark field as touched on blur
   */
  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Mark all as touched
    setTouched({
      contactName: true,
      contactEmail: true,
      contactPhone: true,
    });

    const nameErr = validateField('contactName', formData.contactName);
    const emailErr = validateField('contactEmail', formData.contactEmail);
    const phoneErr = validateField('contactPhone', formData.contactPhone);

    if (nameErr || emailErr || phoneErr) {
      setErrors({
        contactName: nameErr,
        contactEmail: emailErr,
        contactPhone: phoneErr,
      });
      return;
    }

    setIsSubmitting(true);
    setServerErrors([]);

    try {
      const response = await api.patch(`/tickets/${ticketId}/contact`, {
        contactName: formData.contactName.trim(),
        contactEmail: formData.contactEmail.trim().toLowerCase(),
        contactPhone: formData.contactPhone.trim(),
      });

      setSubmitSuccess(true);
      if (onSuccess) {
        onSuccess(response.data?.ticket || response.data);
      }
    } catch (err) {
      console.error('Failed to update contact details:', err);
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        setServerErrors(err.response.data.errors);
      } else if (err.response?.data?.message) {
        setServerErrors([err.response.data.message]);
      } else {
        setServerErrors(['Unable to save contact details. Please check connection and try again.']);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Helper to determine input CSS class based on validation state
   */
  const getInputClass = (fieldName) => {
    if (!touched[fieldName]) return 'contact-input';
    if (errors[fieldName]) return 'contact-input input-error';
    if (formData[fieldName].trim()) return 'contact-input input-success';
    return 'contact-input';
  };

  return (
    <div className="contact-form-container">
      <div className="contact-form-card">
        <div className="contact-form-header">
          <h2>Attendee Contact Details</h2>
          <p className="subtitle">
            Please enter your information to proceed with your ticket purchase.
          </p>
        </div>

        {/* Server-Side Error Alert */}
        {serverErrors.length > 0 && (
          <div className="server-error-banner" role="alert">
            <span className="error-icon">⚠️</span>
            <div className="error-list">
              {serverErrors.map((msg, index) => (
                <div key={index} className="server-error-item">
                  {msg}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Success Confirmation */}
        {submitSuccess && (
          <div className="success-banner" role="alert">
            ✓ Contact details validated and saved successfully!
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="contact-form">
          {/* Full Name Field */}
          <div className="form-group">
            <label htmlFor="contactName" className="form-label">
              Full Name <span className="required-star">*</span>
            </label>
            <input
              id="contactName"
              name="contactName"
              type="text"
              placeholder="e.g. Jane Doe"
              value={formData.contactName}
              onChange={handleChange}
              onBlur={handleBlur}
              className={getInputClass('contactName')}
              aria-invalid={touched.contactName && !!errors.contactName}
              aria-describedby={errors.contactName ? 'contactName-error' : undefined}
              required
            />
            {touched.contactName && errors.contactName && (
              <span id="contactName-error" className="error-message" role="alert">
                {errors.contactName}
              </span>
            )}
          </div>

          {/* Email Address Field */}
          <div className="form-group">
            <label htmlFor="contactEmail" className="form-label">
              Email Address <span className="required-star">*</span>
            </label>
            <input
              id="contactEmail"
              name="contactEmail"
              type="email"
              placeholder="e.g. jane.doe@example.com"
              value={formData.contactEmail}
              onChange={handleChange}
              onBlur={handleBlur}
              className={getInputClass('contactEmail')}
              aria-invalid={touched.contactEmail && !!errors.contactEmail}
              aria-describedby={errors.contactEmail ? 'contactEmail-error' : undefined}
              required
            />
            {touched.contactEmail && errors.contactEmail && (
              <span id="contactEmail-error" className="error-message" role="alert">
                {errors.contactEmail}
              </span>
            )}
          </div>

          {/* Phone Number Field */}
          <div className="form-group">
            <label htmlFor="contactPhone" className="form-label">
              Phone Number <span className="required-star">*</span>
            </label>
            <input
              id="contactPhone"
              name="contactPhone"
              type="tel"
              placeholder="e.g. 9876543210 (digits only)"
              value={formData.contactPhone}
              onChange={handleChange}
              onBlur={handleBlur}
              className={getInputClass('contactPhone')}
              aria-invalid={touched.contactPhone && !!errors.contactPhone}
              aria-describedby={errors.contactPhone ? 'contactPhone-error' : undefined}
              required
            />
            {touched.contactPhone && errors.contactPhone && (
              <span id="contactPhone-error" className="error-message" role="alert">
                {errors.contactPhone}
              </span>
            )}
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="submit"
              className="btn-continue"
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? 'Saving details...' : 'Continue to Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ContactForm;
