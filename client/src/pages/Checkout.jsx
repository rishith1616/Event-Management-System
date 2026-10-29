/**
 * pages/Checkout.jsx — Multi-step checkout page with temporary ticket hold timer
 * Implements FR-04: Temporary Ticket Hold During Checkout.
 *
 * Steps:
 *  1. Hold Confirmed — Displays reserved seats, event details, and active 10-minute countdown
 *  2. Contact Details — Validates attendee contact information before payment
 *  3. Payment (Placeholder) — Order recap and simulated card input for order completion
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import api from '../services/api';
import './Checkout.css';

const DEFAULT_HOLD_DURATION_SECONDS = 600; // 10 minutes

const Checkout = () => {
  const { holdId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Multi-step progress: 1 = Hold Confirmed, 2 = Contact Details, 3 = Payment (Placeholder), 4 = Completed
  const [currentStep, setCurrentStep] = useState(1);

  // Core hold & event state
  const [hold, setHold] = useState(location.state?.hold || null);
  const [event, setEvent] = useState(location.state?.event || location.state?.hold?.event || null);
  const [quantity, setQuantity] = useState(
    location.state?.quantity || location.state?.hold?.quantity || parseInt(searchParams.get('quantity') || '1', 10)
  );

  // Status flags
  const [loading, setLoading] = useState(!location.state?.hold && !hold);
  const [error, setError] = useState(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isCanceled, setIsCanceled] = useState(false);
  const [canceling, setCanceling] = useState(false);

  // Timer state
  const [secondsRemaining, setSecondsRemaining] = useState(DEFAULT_HOLD_DURATION_SECONDS);

  // Contact form state
  const [contactName, setContactName] = useState(location.state?.hold?.contactName || '');
  const [contactEmail, setContactEmail] = useState(location.state?.hold?.contactEmail || '');
  const [contactPhone, setContactPhone] = useState(location.state?.hold?.contactPhone || '');
  const [formErrors, setFormErrors] = useState({});

  // Payment mock state
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('123');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Prevent multiple simultaneous hold creation requests
  const holdCreationAttempted = useRef(false);

  /**
   * Fetch existing hold by ID
   */
  const fetchHold = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/tickets/hold/${id}`);
      const holdData = res.data.hold || res.data.ticket;

      setHold(holdData);
      if (holdData.event) {
        setEvent(holdData.event);
      }
      setQuantity(holdData.quantity);

      if (holdData.contactName) setContactName(holdData.contactName);
      if (holdData.contactEmail) setContactEmail(holdData.contactEmail);
      if (holdData.contactPhone) setContactPhone(holdData.contactPhone);

      if (holdData.status === 'canceled') {
        setIsCanceled(true);
      } else if (holdData.status === 'expired' || res.data.isExpired) {
        setIsExpired(true);
      } else if (holdData.holdExpiresAt) {
        const remaining = Math.max(
          0,
          Math.floor((new Date(holdData.holdExpiresAt).getTime() - Date.now()) / 1000)
        );
        setSecondsRemaining(remaining);
        if (remaining <= 0) {
          setIsExpired(true);
        }
      }
    } catch (err) {
      console.error('Error fetching ticket hold:', err);
      const msg = err.response?.data?.message || 'Failed to retrieve ticket hold details.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a new hold if eventId and quantity are provided but no holdId exists yet
   */
  const createNewHold = useCallback(
    async (eventIdParam, qtyParam) => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.post('/tickets/hold', {
          eventId: eventIdParam,
          quantity: qtyParam,
        });

        const newHold = res.data.hold || res.data.ticket;
        setHold(newHold);
        setEvent(newHold.event || null);
        setQuantity(newHold.quantity);

        if (newHold.holdExpiresAt) {
          const remaining = Math.max(
            0,
            Math.floor((new Date(newHold.holdExpiresAt).getTime() - Date.now()) / 1000)
          );
          setSecondsRemaining(remaining);
        }

        // Update browser URL without full reload to reflect the active hold ID
        navigate(`/checkout/${newHold._id}`, { replace: true, state: { hold: newHold } });
      } catch (err) {
        console.error('Error creating ticket hold:', err);
        const msg =
          err.response?.data?.message ||
          'Unable to hold tickets. Please check availability and try again.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [navigate]
  );

  // Initialize or fetch hold on mount
  useEffect(() => {
    if (holdId) {
      fetchHold(holdId);
    } else {
      const eventIdParam = location.state?.eventId || searchParams.get('eventId');
      const qtyParam = location.state?.quantity || parseInt(searchParams.get('quantity') || '1', 10);

      if (eventIdParam && !holdCreationAttempted.current) {
        holdCreationAttempted.current = true;
        createNewHold(eventIdParam, qtyParam);
      } else if (!eventIdParam) {
        setLoading(false);
      }
    }
  }, [holdId, location.state, searchParams, fetchHold, createNewHold]);

  // Countdown timer effect
  useEffect(() => {
    if (!hold || isExpired || isCanceled || currentStep === 4) return;

    const timer = setInterval(() => {
      if (hold.holdExpiresAt) {
        const remaining = Math.max(
          0,
          Math.floor((new Date(hold.holdExpiresAt).getTime() - Date.now()) / 1000)
        );
        setSecondsRemaining(remaining);

        if (remaining <= 0) {
          setIsExpired(true);
          clearInterval(timer);
        }
      } else {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            setIsExpired(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [hold, isExpired, isCanceled, currentStep]);

  /**
   * Handle user canceling their temporary hold
   */
  const handleCancelHold = async () => {
    if (!hold?._id) return;

    if (!window.confirm('Are you sure you want to cancel this ticket hold? Tickets will be returned to the event inventory.')) {
      return;
    }

    try {
      setCanceling(true);
      await api.delete(`/tickets/hold/${hold._id}`);
      setIsCanceled(true);
    } catch (err) {
      console.error('Error canceling hold:', err);
      const msg = err.response?.data?.message || 'Failed to cancel ticket hold.';
      alert(msg);
    } finally {
      setCanceling(false);
    }
  };

  /**
   * Validate contact information before moving to payment (FR-05)
   */
  const handleProceedToPayment = (e) => {
    e.preventDefault();
    const errors = {};

    if (!contactName.trim()) {
      errors.name = 'Full name is required';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!contactEmail.trim()) {
      errors.email = 'Email address is required';
    } else if (!emailRegex.test(contactEmail.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setCurrentStep(3);
  };

  /**
   * Simulate payment confirmation (FR-06 placeholder)
   */
  const handleSimulatePayment = async () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      setIsProcessingPayment(false);
      setCurrentStep(4);
    }, 1200);
  };

  // Format seconds into MM:SS
  const formatTime = (secs) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Pricing calculations
  const unitPrice = event?.price || 0;
  const totalPrice = unitPrice * quantity;

  // Visual timer styling classes
  const timerClass =
    secondsRemaining <= 120
      ? 'hold-timer-card timer-danger'
      : secondsRemaining <= 300
      ? 'hold-timer-card timer-warning'
      : 'hold-timer-card';

  const progressClass =
    secondsRemaining <= 120
      ? 'timer-progress-bar danger'
      : secondsRemaining <= 300
      ? 'timer-progress-bar warning'
      : 'timer-progress-bar';

  const progressPercent = Math.min(100, (secondsRemaining / DEFAULT_HOLD_DURATION_SECONDS) * 100);

  // Loading state
  if (loading) {
    return (
      <div className="checkout-container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ fontSize: '1.2rem', color: '#4f46e5' }}>Reserving your tickets...</p>
        </div>
      </div>
    );
  }

  // Error state (e.g. Insufficient tickets remaining)
  if (error && !hold) {
    return (
      <div className="checkout-container">
        <div className="alert-banner error">
          <div>
            <strong style={{ display: 'block', fontSize: '1.1rem', marginBottom: '0.25rem' }}>
              Checkout Blocked
            </strong>
            <p>{error}</p>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link to="/" className="btn btn-primary">
            Return to Event Listings
          </Link>
        </div>
      </div>
    );
  }

  // Expired hold view
  if (isExpired) {
    return (
      <div className="checkout-container">
        <div className="expired-card">
          <div className="expired-icon">⏱️</div>
          <h2>Hold Expired</h2>
          <p>
            Your 10-minute temporary ticket hold has expired. To give other attendees a fair chance,
            the {quantity} ticket{quantity > 1 ? 's have' : ' has'} been released back to general availability.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link to="/" className="btn btn-primary">
              Browse Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Canceled hold view
  if (isCanceled) {
    return (
      <div className="checkout-container">
        <div className="expired-card">
          <div className="expired-icon">✓</div>
          <h2 style={{ color: '#16a34a' }}>Hold Canceled</h2>
          <p>
            Your ticket reservation has been canceled and your {quantity} ticket
            {quantity > 1 ? 's have' : ''} been returned to the event inventory.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link to="/" className="btn btn-primary">
              Return to Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // No hold found and no event specified
  if (!hold && !event) {
    return (
      <div className="checkout-container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h2>No Active Hold Found</h2>
          <p style={{ margin: '1rem 0 2rem', color: '#64748b' }}>
            Please select an event to purchase tickets and begin checkout.
          </p>
          <Link to="/" className="btn btn-primary">
            Browse Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-container">
      <div className="checkout-header">
        <h1>Event Checkout</h1>
        <p className="checkout-subtitle">Complete your purchase within 10 minutes to secure your tickets</p>
      </div>

      {/* Visual Step Indicator */}
      <div className="checkout-steps">
        <div className={`checkout-step ${currentStep === 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
          <span className="step-number">1</span>
          <span>Hold Confirmed</span>
        </div>
        <div className="step-divider" />
        <div className={`checkout-step ${currentStep === 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
          <span className="step-number">2</span>
          <span>Contact Details</span>
        </div>
        <div className="step-divider" />
        <div className={`checkout-step ${currentStep === 3 ? 'active' : ''} ${currentStep === 4 ? 'completed' : ''}`}>
          <span className="step-number">3</span>
          <span>Payment</span>
        </div>
      </div>

      {/* 10-Minute Hold Countdown Timer Card */}
      {currentStep < 4 && (
        <div className={timerClass}>
          <div className="timer-header">
            <span className="timer-title">
              <span role="img" aria-label="clock">⏳</span> Tickets Held For You
            </span>
            <span className="timer-countdown">{formatTime(secondsRemaining)}</span>
          </div>
          <div className="timer-progress-track">
            <div
              className={progressClass}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="timer-hint">
            Seats are held for {quantity} attendee{quantity > 1 ? 's' : ''}. Complete checkout before the timer hits 00:00.
          </p>
        </div>
      )}

      {/* STEP 1: Hold Confirmed & Summary */}
      {currentStep === 1 && (
        <>
          <div className="alert-banner success">
            <span>✓</span>
            <div>
              <strong>Hold Confirmed!</strong> Your {quantity} ticket{quantity > 1 ? 's are' : ' is'} held exclusively for you.
            </div>
          </div>

          <div className="event-summary-card">
            <h2>{event?.title || 'Event Details'}</h2>
            <div className="event-meta-grid">
              <div className="meta-item">
                <span className="meta-label">Date & Time</span>
                <span className="meta-value">
                  {event?.date ? new Date(event.date).toLocaleDateString(undefined, { dateStyle: 'medium' }) : 'N/A'}{' '}
                  at {event?.time || 'TBD'}
                </span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Venue</span>
                <span className="meta-value">{event?.venue || 'TBD'}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Category</span>
                <span className="meta-value">{event?.category || 'General'}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Hold Status</span>
                <span className="meta-value" style={{ color: '#16a34a', textTransform: 'capitalize' }}>
                  {hold?.status || 'Active Hold'}
                </span>
              </div>
            </div>

            <table className="ticket-breakdown-table">
              <tbody>
                <tr>
                  <td>Ticket Quantity:</td>
                  <td style={{ textAlign: 'right' }}><strong>{quantity}</strong></td>
                </tr>
                <tr>
                  <td>Price per Ticket:</td>
                  <td style={{ textAlign: 'right' }}>${unitPrice.toFixed(2)}</td>
                </tr>
                <tr className="total-row">
                  <td>Total Amount:</td>
                  <td style={{ textAlign: 'right', color: '#4f46e5' }}>${totalPrice.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={handleCancelHold}
              disabled={canceling}
              className="btn btn-outline-danger"
            >
              {canceling ? 'Canceling Hold...' : 'Cancel Hold'}
            </button>
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="btn btn-primary"
            >
              Continue to Contact Details →
            </button>
          </div>
        </>
      )}

      {/* STEP 2: Contact Details */}
      {currentStep === 2 && (
        <form onSubmit={handleProceedToPayment} className="checkout-form-card">
          <h3>Step 2: Attendee Contact Information</h3>
          <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            We'll send your digital tickets and receipt to these contact details.
          </p>

          <div className="form-group">
            <label htmlFor="contactName">Full Name *</label>
            <input
              id="contactName"
              type="text"
              placeholder="e.g. Jane Doe"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              required
            />
            {formErrors.name && <div className="error-text">{formErrors.name}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="contactEmail">Email Address *</label>
            <input
              id="contactEmail"
              type="email"
              placeholder="e.g. jane@example.com"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              required
            />
            {formErrors.email && <div className="error-text">{formErrors.email}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="contactPhone">Phone Number (Optional)</label>
            <input
              id="contactPhone"
              type="tel"
              placeholder="e.g. +1 (555) 000-0000"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="btn btn-secondary"
            >
              ← Back to Summary
            </button>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={handleCancelHold}
                disabled={canceling}
                className="btn btn-outline-danger"
              >
                {canceling ? 'Canceling...' : 'Cancel Hold'}
              </button>
              <button type="submit" className="btn btn-primary">
                Continue to Payment →
              </button>
            </div>
          </div>
        </form>
      )}

      {/* STEP 3: Payment Placeholder */}
      {currentStep === 3 && (
        <div className="checkout-form-card">
          <h3>Step 3: Payment (Placeholder)</h3>
          
          <div className="payment-mock-badge">
            🔒 <strong>Demo Payment Gateway:</strong> Payment capture is simulated for FR-04. Full gateway tokenization is implemented in FR-06.
          </div>

          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <div className="credit-card-preview">
              <div className="cc-chip" />
              <div className="cc-number">{cardNumber}</div>
              <div className="cc-meta">
                <div>
                  <div style={{ fontSize: '0.65rem' }}>CARDHOLDER</div>
                  <div>{contactName.toUpperCase() || 'VALUED ATTENDEE'}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem' }}>EXPIRES</div>
                  <div>{cardExpiry}</div>
                </div>
              </div>
            </div>

            <div style={{ flex: 1, minWidth: '240px' }}>
              <div className="form-group">
                <label>Card Number</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4242 4242 4242 4242"
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Expiry</label>
                  <input
                    type="text"
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    placeholder="MM/YY"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>CVC</label>
                  <input
                    type="text"
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    placeholder="123"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ background: '#f8fafc', padding: '1rem', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span>Attendee:</span>
              <strong>{contactName} ({contactEmail})</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span>Tickets Reserved:</span>
              <strong>{quantity} seat{quantity > 1 ? 's' : ''}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: 'bold' }}>
              <span>Total Due:</span>
              <span style={{ color: '#4f46e5' }}>${totalPrice.toFixed(2)}</span>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="btn btn-secondary"
            >
              ← Back to Contact
            </button>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={handleCancelHold}
                disabled={canceling}
                className="btn btn-outline-danger"
              >
                {canceling ? 'Canceling...' : 'Cancel Hold'}
              </button>
              <button
                type="button"
                onClick={handleSimulatePayment}
                disabled={isProcessingPayment}
                className="btn btn-success"
              >
                {isProcessingPayment ? 'Processing Order...' : `Pay $${totalPrice.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Completed Order Simulation */}
      {currentStep === 4 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎉</div>
          <h2 style={{ color: '#16a34a', marginBottom: '0.75rem' }}>Order Placed Successfully!</h2>
          <p style={{ color: '#64748b', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
            Your hold was converted to a confirmed booking. We have sent a confirmation email to <strong>{contactEmail}</strong>.
          </p>
          <div style={{ display: 'inline-block', background: '#f1f5f9', padding: '1rem 2rem', borderRadius: '8px', marginBottom: '2rem' }}>
            <div><strong>Event:</strong> {event?.title}</div>
            <div><strong>Tickets:</strong> {quantity}</div>
            <div><strong>Total Paid:</strong> ${totalPrice.toFixed(2)}</div>
          </div>
          <div>
            <Link to="/" className="btn btn-primary">
              Return to Home
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;
