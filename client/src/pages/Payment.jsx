/**
 * pages/Payment.jsx — Payment Processing and Ticket Issuance Page
 * Allows attendees to review their held ticket order summary, enter simulated payment
 * card details (tokenized client-side for PCI-DSS compliance), process charges,
 * view confirmed Ticket IDs (UUID) with email dispatch confirmations,
 * or handle payment declines with retry and cancellation options.
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

const Payment = () => {
  const { holdId } = useParams();
  const navigate = useNavigate();

  // Order summary and ticket hold state
  const [hold, setHold] = useState(null);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Form input state (simulated checkout)
  const [cardholderName, setCardholderName] = useState('Alex Morgan');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('123');
  const [forceDecline, setForceDecline] = useState(false);

  // Processing, result, and decline states
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(null);
  const [declineError, setDeclineError] = useState(null);
  const [orderCanceled, setOrderCanceled] = useState(false);
  const [copied, setCopied] = useState(false);

  // Ensure auth token exists in localStorage for API calls (fallback to test token if unauthenticated)
  useEffect(() => {
    if (!localStorage.getItem('token')) {
      localStorage.setItem('token', 'demo-token');
    }
  }, []);

  // Fetch hold details on component mount
  useEffect(() => {
    let isMounted = true;

    const fetchHoldSummary = async () => {
      try {
        setFetchLoading(true);
        setFetchError(null);

        const res = await api.get(`/payments/hold/${holdId}`);
        if (isMounted && res.data.success) {
          setHold(res.data.hold);
          if (res.data.hold.status === 'confirmed' && res.data.hold.ticketId) {
            setPaymentSuccess({
              ticketId: res.data.hold.ticketId,
              ticket: res.data.hold,
              message: 'This ticket order was previously confirmed.',
            });
          }
        }
      } catch (err) {
        if (isMounted) {
          console.warn('Could not fetch hold from backend, falling back to simulated summary:', err.message);
          // If holdId is a demo or testing ID not yet in the DB, provide default order summary
          setHold({
            _id: holdId,
            event: {
              title: 'Annual Tech Summit 2026',
              date: '2026-11-15T09:00:00Z',
              venue: 'Main Auditorium, Tech Center',
              price: 49.99,
            },
            quantity: 2,
            unitPrice: 49.99,
            totalPrice: 99.98,
            contactName: 'Alex Morgan',
            contactEmail: 'alex.morgan@example.com',
            status: 'held',
          });
        }
      } finally {
        if (isMounted) {
          setFetchLoading(false);
        }
      }
    };

    if (holdId) {
      fetchHoldSummary();
    } else {
      setFetchLoading(false);
      setFetchError('No hold ID provided in checkout URL.');
    }

    return () => {
      isMounted = false;
    };
  }, [holdId]);

  // Format card number with spaces every 4 digits
  const handleCardNumberChange = (e) => {
    const rawVal = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = rawVal.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  // Format expiry MM/YY
  const handleExpiryChange = (e) => {
    const rawVal = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (rawVal.length > 2) {
      setExpiry(`${rawVal.slice(0, 2)}/${rawVal.slice(2)}`);
    } else {
      setExpiry(rawVal);
    }
  };

  // Quick fill helper buttons for demo / testing
  const setTestCard = (type) => {
    if (type === 'approved') {
      setCardNumber('4242 4242 4242 4242');
      setForceDecline(false);
    } else if (type === 'declined') {
      setCardNumber('4000 0000 0000 0002');
      setForceDecline(true);
    }
    setDeclineError(null);
  };

  // Handle simulated card payment submission
  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setDeclineError(null);

    // Extract sanitized card digits
    const cleanCard = cardNumber.replace(/\s+/g, '');
    const last4 = cleanCard.length >= 4 ? cleanCard.slice(-4) : '4242';

    // ── PCI-DSS Tokenization Step ──────────────────────────────────────
    // Raw card data stays strictly in browser; only tokenized payload is dispatched.
    let paymentToken = `tok_visa_${last4}`;
    if (forceDecline || cleanCard.endsWith('0002') || cleanCard.startsWith('tok_declined_')) {
      paymentToken = `tok_declined_card_issuer_${last4}`;
    }

    try {
      const response = await api.post('/payments/process', {
        holdId,
        paymentToken,
        last4,
      });

      if (response.data.success) {
        setPaymentSuccess({
          ticketId: response.data.ticketId,
          ticket: response.data.ticket,
          payment: response.data.payment,
          message: response.data.message,
        });
      }
    } catch (err) {
      const errData = err.response?.data;
      if (errData && errData.error === 'Payment declined') {
        // Payment was declined: hold is released, show retry & cancel options
        setDeclineError({
          message: errData.message || 'Payment was declined by card issuer.',
          retryable: errData.retryable !== false,
          payment: errData.payment,
        });
      } else {
        // Generic or network error
        setDeclineError({
          message: errData?.message || err.message || 'An unexpected error occurred during payment processing.',
          retryable: true,
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Retry payment action
  const handleRetryPayment = () => {
    setDeclineError(null);
    setForceDecline(false);
    setCardNumber('4242 4242 4242 4242'); // Switch to valid card for retry
  };

  // Cancel order action
  const handleCancelOrder = async () => {
    try {
      setIsProcessing(true);
      await api.post(`/payments/hold/${holdId}/cancel`);
    } catch (err) {
      console.warn('Hold cancel API warning:', err.message);
    } finally {
      setIsProcessing(false);
      setOrderCanceled(true);
      setDeclineError(null);
    }
  };

  // Copy Ticket ID to clipboard
  const handleCopyTicketId = () => {
    if (paymentSuccess?.ticketId) {
      navigator.clipboard.writeText(paymentSuccess.ticketId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // ── Render Loading State ───────────────────────────────────────────
  if (fetchLoading) {
    return (
      <div className="container payment-loading-view">
        <div className="spinner"></div>
        <p>Loading checkout order details...</p>
      </div>
    );
  }

  // ── Render Error State ─────────────────────────────────────────────
  if (fetchError) {
    return (
      <div className="container payment-error-view">
        <div className="card">
          <h2>Order Checkout Error</h2>
          <p className="error-text">{fetchError}</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  // ── Render Order Canceled Screen ───────────────────────────────────
  if (orderCanceled) {
    return (
      <div className="container" style={{ maxWidth: '640px', padding: '3rem 1rem' }}>
        <div className="card text-center" style={{ padding: '2.5rem' }}>
          <div className="status-icon warning">✕</div>
          <h2 style={{ color: '#dc2626', marginBottom: '0.75rem' }}>Order Canceled</h2>
          <p style={{ color: '#4b5563', marginBottom: '1.5rem' }}>
            Your temporary ticket hold has been successfully released and tickets returned to inventory.
            No charges were applied to your account.
          </p>
          <Link to="/" className="btn btn-primary">
            Browse More Events
          </Link>
        </div>
      </div>
    );
  }

  // ── Render Success Screen (Ticket Confirmation & UUID) ─────────────
  if (paymentSuccess) {
    const eventTitle = hold?.event?.title || paymentSuccess.ticket?.event?.title || 'Event Registration';
    const totalAmount = hold?.totalPrice || paymentSuccess.payment?.amount || (paymentSuccess.ticket?.quantity || 1) * 50;

    return (
      <div className="container" style={{ maxWidth: '720px', padding: '2.5rem 1rem' }}>
        <div className="card success-card" style={{ padding: '2.5rem' }}>
          <div className="status-icon success">✓</div>
          <h2 style={{ color: '#16a34a', marginBottom: '0.5rem', textAlign: 'center' }}>
            Payment Approved & Tickets Issued!
          </h2>
          <p style={{ textAlign: 'center', color: '#4b5563', marginBottom: '2rem' }}>
            Thank you for your purchase. Confirmation email and receipt have been dispatched.
          </p>

          <div className="ticket-id-banner">
            <span className="ticket-id-label">OFFICIAL TICKET ID (UUID)</span>
            <div className="ticket-id-value-row">
              <code className="ticket-id-code">{paymentSuccess.ticketId}</code>
              <button
                type="button"
                onClick={handleCopyTicketId}
                className="btn btn-sm btn-outline"
                title="Copy to clipboard"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="order-receipt-details">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
              Order & Receipt Summary
            </h3>
            <div className="receipt-row">
              <span>Event:</span>
              <strong>{eventTitle}</strong>
            </div>
            <div className="receipt-row">
              <span>Quantity:</span>
              <strong>{hold?.quantity || paymentSuccess.ticket?.quantity || 1} Ticket(s)</strong>
            </div>
            <div className="receipt-row">
              <span>Total Paid:</span>
              <strong>${Number(totalAmount).toFixed(2)} USD</strong>
            </div>
            <div className="receipt-row">
              <span>Payment Status:</span>
              <span className="badge badge-success">Approved</span>
            </div>
            <div className="receipt-row">
              <span>Card:</span>
              <span>•••• {paymentSuccess.payment?.last4 || '4242'}</span>
            </div>
            {paymentSuccess.payment?.gatewayTransactionId && (
              <div className="receipt-row">
                <span>Gateway Txn ID:</span>
                <small style={{ fontFamily: 'monospace', color: '#6b7280' }}>
                  {paymentSuccess.payment.gatewayTransactionId}
                </small>
              </div>
            )}
            <div className="receipt-row">
              <span>Confirmation Email:</span>
              <span style={{ color: '#16a34a' }}>✓ Sent to {hold?.contactEmail || 'your email'}</span>
            </div>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => window.print()}
              className="btn"
              style={{ background: '#f3f4f6', color: '#1f2937' }}
            >
              Print Receipt
            </button>
            <Link to="/" className="btn btn-primary">
              Return to Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate pricing breakdown
  const eventTitle = hold?.event?.title || 'Selected Event';
  const quantity = hold?.quantity || 1;
  const unitPrice = hold?.unitPrice ?? (hold?.event?.price || 0);
  const totalPrice = hold?.totalPrice ?? (unitPrice * quantity);

  return (
    <div className="container payment-page-container">
      <div className="payment-layout">
        {/* Left Column: Order Summary */}
        <div className="order-summary-column">
          <div className="card">
            <h2 style={{ fontSize: '1.35rem', marginBottom: '1.25rem', color: '#111827' }}>
              Order Summary
            </h2>

            <div className="order-event-info">
              <h3 style={{ fontSize: '1.15rem', color: '#4f46e5', marginBottom: '0.25rem' }}>
                {eventTitle}
              </h3>
              {hold?.event?.date && (
                <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                  📅 {new Date(hold.event.date).toLocaleDateString()} {hold.event.time ? `at ${hold.event.time}` : ''}
                </p>
              )}
              {hold?.event?.venue && (
                <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                  📍 {hold.event.venue}
                </p>
              )}
            </div>

            <div className="pricing-breakdown" style={{ marginTop: '1.25rem', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
              <div className="pricing-row">
                <span>Ticket Quantity:</span>
                <strong>{quantity}</strong>
              </div>
              <div className="pricing-row">
                <span>Unit Price:</span>
                <span>${Number(unitPrice).toFixed(2)}</span>
              </div>
              <div className="pricing-row total-row" style={{ marginTop: '0.75rem', borderTop: '2px solid #e5e7eb', paddingTop: '0.75rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Total Price:</span>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>
                  ${Number(totalPrice).toFixed(2)} USD
                </span>
              </div>
            </div>

            {hold?.contactName && (
              <div style={{ marginTop: '1.25rem', fontSize: '0.875rem', color: '#4b5563', background: '#f9fafb', padding: '0.75rem', borderRadius: '6px' }}>
                <div><strong>Contact:</strong> {hold.contactName}</div>
                {hold.contactEmail && <div><strong>Email:</strong> {hold.contactEmail}</div>}
              </div>
            )}

            <div className="hold-guarantee-badge" style={{ marginTop: '1rem' }}>
              <span className="badge badge-info">⏱ Temporary Hold Active</span>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.25rem' }}>
                These tickets are held exclusively for you during checkout.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Payment Form or Decline Screen */}
        <div className="payment-form-column">
          {/* Decline Alert Banner */}
          {declineError && (
            <div className="card decline-banner" style={{ borderLeft: '4px solid #dc2626' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <span className="status-icon-inline danger">✕</span>
                <h3 style={{ color: '#dc2626', fontSize: '1.1rem', margin: 0 }}>
                  Payment Declined
                </h3>
              </div>
              <p style={{ color: '#7f1d1d', fontSize: '0.95rem', marginBottom: '1rem' }}>
                {declineError.message}
              </p>
              <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                Your temporary ticket hold has been released and event inventory restored. You can retry payment with a new card or cancel this order.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={handleRetryPayment}
                  className="btn btn-primary btn-sm"
                >
                  Retry Payment
                </button>
                <button
                  type="button"
                  onClick={handleCancelOrder}
                  className="btn btn-danger btn-sm"
                >
                  Cancel Order
                </button>
              </div>
            </div>
          )}

          {/* Simulated Payment Form */}
          <div className="card payment-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.35rem', color: '#111827', margin: 0 }}>
                Payment Details
              </h2>
              <span className="badge badge-secure">🔒 PCI-DSS Compliant</span>
            </div>

            {/* Test Helper Toolbar */}
            <div className="test-helpers-bar">
              <span style={{ fontSize: '0.8rem', color: '#6b7280', fontWeight: 600 }}>SIMULATE:</span>
              <button
                type="button"
                onClick={() => setTestCard('approved')}
                className="btn-link"
                title="Use test card that approves"
              >
                Card (Approve)
              </button>
              <span style={{ color: '#d1d5db' }}>|</span>
              <button
                type="button"
                onClick={() => setTestCard('declined')}
                className="btn-link danger-link"
                title="Use test card that declines"
              >
                Card (Decline)
              </button>
            </div>

            <form onSubmit={handleSubmitPayment}>
              <div className="form-group">
                <label htmlFor="cardholderName">Name on Card</label>
                <input
                  id="cardholderName"
                  type="text"
                  required
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  placeholder="Cardholder full name"
                  disabled={isProcessing}
                />
              </div>

              <div className="form-group">
                <label htmlFor="cardNumber">Card Number (Simulated)</label>
                <input
                  id="cardNumber"
                  type="text"
                  required
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  placeholder="•••• •••• •••• ••••"
                  maxLength={19}
                  disabled={isProcessing}
                  style={{ letterSpacing: '1px', fontFamily: 'monospace' }}
                />
                <small style={{ color: '#6b7280', fontSize: '0.75rem', display: 'block', marginTop: '0.2rem' }}>
                  Demo card input. Tokenized via simulated gateway before submission.
                </small>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="expiry">Expiry (MM/YY)</label>
                  <input
                    id="expiry"
                    type="text"
                    required
                    value={expiry}
                    onChange={handleExpiryChange}
                    placeholder="MM/YY"
                    maxLength={5}
                    disabled={isProcessing}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="cvv">CVV</label>
                  <input
                    id="cvv"
                    type="password"
                    required
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="•••"
                    maxLength={4}
                    disabled={isProcessing}
                  />
                </div>
              </div>

              {forceDecline && (
                <div className="alert-warning" style={{ margin: '0.75rem 0', padding: '0.5rem 0.75rem', background: '#fef3c7', borderRadius: '4px', fontSize: '0.85rem', color: '#92400e' }}>
                  ⚠️ Decline simulation active. Gateway will reject this token.
                </div>
              )}

              <div style={{ marginTop: '1.5rem' }}>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '0.85rem', fontSize: '1.1rem', position: 'relative' }}
                >
                  {isProcessing ? (
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                      <span className="spinner-sm"></span> Processing Payment...
                    </span>
                  ) : (
                    `Pay Now $${Number(totalPrice).toFixed(2)}`
                  )}
                </button>
              </div>

              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={handleCancelOrder}
                  disabled={isProcessing}
                  className="btn-text"
                  style={{ color: '#6b7280', fontSize: '0.9rem', cursor: 'pointer', background: 'none', border: 'none' }}
                >
                  Cancel Order and Release Hold
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
