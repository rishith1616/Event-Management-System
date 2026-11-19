/**
 * pages/Profile.jsx — PES University Student Profile & Pass Wallet
 * Allows students to view/edit their identity credentials (Name, SRN, Phone, Email)
 * and manage their confirmed event passes and ticket holds with instant cancellation.
 */
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  UserIcon,
  IdCardIcon,
  MailIcon,
  PhoneIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  TicketIcon,
  CalendarIcon,
  ClockIcon,
  LocationIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
} from '../components/Icons';
import { SRN_REGEX, PHONE_REGEX } from './Checkout';
import './Profile.css';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  // Profile Form State (Pre-filled with Jayanth Kumar P credentials)
  const [name, setName] = useState(user?.name || 'Jayanth Kumar P');
  const [srn, setSrn] = useState(user?.srn || 'PES1UG24CS199');
  const [email, setEmail] = useState(user?.email || 'jayanthkumar08p@gmail.com');
  const [phone, setPhone] = useState(user?.phone || '8217029299');

  const [formErrors, setFormErrors] = useState({});
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // Tickets state
  const [tickets, setTickets] = useState([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [cancelingId, setCancelingId] = useState(null);
  const [ticketFilter, setTicketFilter] = useState('all'); // all, confirmed, held, cancelled

  // Sync state if user context updates
  useEffect(() => {
    if (user) {
      if (user.name) setName(user.name);
      if (user.srn) setSrn(user.srn);
      if (user.email) setEmail(user.email);
      if (user.phone) setPhone(user.phone);
    }
  }, [user]);

  // Fetch attendee's tickets
  const fetchTickets = async () => {
    try {
      setTicketsLoading(true);
      const res = await api.get('/tickets/my-tickets');
      if (res.data && res.data.data) {
        setTickets(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load tickets in profile:', err);
    } finally {
      setTicketsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  // Validate form
  const validate = () => {
    const errs = {};
    if (!name.trim()) errs.name = 'Full name is required';
    if (!srn.trim()) {
      errs.srn = 'SRN is required';
    } else if (!SRN_REGEX.test(srn.trim().toUpperCase())) {
      errs.srn = 'Invalid SRN. Format: PES[1-2]UG[YY][Course][3 digits] (e.g. PES1UG24CS199)';
    }

    if (!email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please enter a valid email address';
    }

    const cleanPhone = phone.trim().replace(/[\s\-\(\)]/g, '');
    if (!phone.trim()) {
      errs.phone = 'Mobile phone number is required';
    } else if (!PHONE_REGEX.test(cleanPhone)) {
      errs.phone = 'Must be a valid 10-digit Indian mobile number';
    }

    return errs;
  };

  // Handle saving profile changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }

    try {
      setSaving(true);
      setSaveSuccess(false);
      setFormErrors({});

      const res = await api.put('/auth/profile', {
        name: name.trim(),
        srn: srn.trim().toUpperCase(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
      });

      if (res.data && res.data.success) {
        updateUser(res.data.user);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 4000);
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      setFormErrors({ submit: err.response?.data?.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  // Handle Cancel Confirmed Ticket with instant refund
  const handleCancelTicket = async (ticket) => {
    const isFree = !ticket.totalAmount || ticket.totalAmount === 0;
    const confirmMsg = isFree
      ? `Cancel your free pass for "${ticket.event?.title || 'this event'}"? Your seat will be returned to inventory.`
      : `Are you sure you want to cancel your pass for "${ticket.event?.title || 'this event'}"?\n\n` +
        `A refund of ₹${Number(ticket.totalAmount).toLocaleString('en-IN')} will be initiated and your seat returned to inventory.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setCancelingId(ticket._id);
      setActionMessage(null);
      setActionError(null);

      const res = await api.post(`/tickets/${ticket._id}/cancel`, {
        reason: 'Student initiated cancellation via profile pass wallet',
      });

      if (res.data && res.data.success) {
        setActionMessage(
          `Pass for "${ticket.event?.title || 'Event'}" was successfully canceled. ` +
          (!isFree ? `Refund of ₹${Number(ticket.totalAmount).toLocaleString('en-IN')} has been initiated!` : 'Seat restored to inventory.')
        );
        await fetchTickets();
      }
    } catch (err) {
      console.error('Error canceling ticket:', err);
      setActionError(err.response?.data?.message || 'Failed to cancel ticket.');
    } finally {
      setCancelingId(null);
    }
  };

  // Handle Cancel Held Reservation
  const handleCancelHold = async (ticket) => {
    if (!window.confirm(`Release your held reservation for "${ticket.event?.title || 'this event'}"?`)) {
      return;
    }

    try {
      setCancelingId(ticket._id);
      setActionMessage(null);
      setActionError(null);

      await api.delete(`/tickets/hold/${ticket._id}`);
      setActionMessage(`Reservation for "${ticket.event?.title || 'Event'}" was released back to event inventory.`);
      await fetchTickets();
    } catch (err) {
      console.error('Error canceling hold:', err);
      setActionError(err.response?.data?.message || 'Failed to release hold.');
    } finally {
      setCancelingId(null);
    }
  };

  // Extract PES Campus & Course from SRN
  const getSrnDetails = (srnString) => {
    if (!srnString || srnString.length < 11) return { campus: 'Campus 1 (RR Campus)', course: 'B.Tech CSE', year: '2024' };
    const campusChar = srnString.charAt(3);
    const campus = campusChar === '2' ? 'Campus 2 (Electronic City Campus)' : 'Campus 1 (Ring Road Campus)';
    const yearDigits = srnString.substring(6, 8);
    const year = `20${yearDigits}`;
    const courseCode = srnString.substring(8, 10).toUpperCase();
    const courseMap = {
      CS: 'Computer Science & Engineering',
      EC: 'Electronics & Communication',
      EE: 'Electrical & Electronics',
      ME: 'Mechanical Engineering',
      BT: 'Biotechnology',
      AM: 'AI & Machine Learning',
    };
    const course = courseMap[courseCode] || `Engineering (${courseCode})`;
    return { campus, course, year };
  };

  const srnInfo = getSrnDetails(srn);

  // Filtered tickets
  const filteredTickets = tickets.filter((t) => {
    if (ticketFilter === 'confirmed') return t.status === 'confirmed';
    if (ticketFilter === 'held') return t.status === 'held';
    if (ticketFilter === 'cancelled') return ['cancelled', 'canceled', 'refunded'].includes(t.status);
    return true;
  });

  const confirmedCount = tickets.filter((t) => t.status === 'confirmed').length;
  const heldCount = tickets.filter((t) => t.status === 'held').length;
  const cancelledCount = tickets.filter((t) => ['cancelled', 'canceled', 'refunded'].includes(t.status)).length;

  return (
    <div className="container" style={{ padding: '2.5rem 1rem 5rem', maxWidth: '1080px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#e0e7ff', color: '#4338ca', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
          <IdCardIcon />
          <span>PES University Student Pass Wallet</span>
        </div>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
          Student Profile & Pass Manager
        </h1>
        <p style={{ color: '#64748b', marginTop: '0.35rem', fontSize: '1rem' }}>
          Manage your verified university credentials, active event passes, and instant cancellations.
        </p>
      </div>

      {actionMessage && (
        <div className="alert-banner success" style={{ marginBottom: '1.5rem' }}>
          <CheckCircleIcon style={{ color: '#16a34a', fontSize: '1.25rem' }} />
          <span>{actionMessage}</span>
        </div>
      )}

      {actionError && (
        <div className="alert-banner error" style={{ marginBottom: '1.5rem' }}>
          <AlertCircleIcon style={{ color: '#dc2626', fontSize: '1.25rem' }} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Top Grid: Student Digital ID Card + Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {/* Visual Student ID Card */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
            color: '#ffffff',
            borderRadius: '16px',
            padding: '1.75rem',
            boxShadow: '0 12px 30px -8px rgba(49, 46, 129, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '120px', height: '120px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '50%', pointerEvents: 'none' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', color: '#cbd5e1' }}>
                PES UNIVERSITY
              </span>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{srnInfo.campus}</div>
            </div>
            <span style={{ background: '#10b981', color: '#ffffff', fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.55rem', borderRadius: '9999px', textTransform: 'uppercase' }}>
              ✓ Verified Student
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', flexShrink: 0, boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
              {name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() || 'JK'}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>{name}</h2>
              <div style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, color: '#a5b4fc', letterSpacing: '0.5px', marginTop: '2px' }}>
                {srn}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.15)', paddingTop: '0.85rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.75rem' }}>
            <div>
              <div style={{ color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.65rem' }}>Branch & Program</div>
              <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{srnInfo.course}</div>
            </div>
            <div>
              <div style={{ color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.65rem' }}>Registered Contact</div>
              <div style={{ fontWeight: 600, color: '#f1f5f9' }}>+91 {phone}</div>
            </div>
          </div>
        </div>

        {/* Quick Booking Metrics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', border: '1px solid #e2e8f0', borderRadius: '14px', background: '#ffffff' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              ✓ Confirmed Passes
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>{confirmedCount}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Ready for campus check-in</div>
          </div>

          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', border: '1px solid #e2e8f0', borderRadius: '14px', background: '#ffffff' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#d97706', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              ⏳ Pending Holds
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>{heldCount}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Awaiting checkout</div>
          </div>

          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', border: '1px solid #e2e8f0', borderRadius: '14px', background: '#ffffff' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              ✕ Cancelled / Refunded
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>{cancelledCount}</div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Restored to inventory</div>
          </div>

          <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', border: '1px solid #e2e8f0', borderRadius: '14px', background: '#f8fafc' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4f46e5', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              Total Campus Passes
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>{tickets.length}</div>
            <Link to="/events" style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 700, textDecoration: 'none' }}>
              Browse Catalog →
            </Link>
          </div>
        </div>
      </div>

      {/* Profile Details Edit Card */}
      <div className="checkout-form-card" style={{ marginBottom: '2.5rem' }}>
        <div className="form-header-box">
          <span className="form-badge-pill">
            <UserIcon />
            <span>Edit University Credentials</span>
          </span>
          <h2 className="form-title">Store & Update Your Student Details</h2>
          <p className="form-desc">
            These credentials are automatically applied when registering for PES hackathons, workshops, and Aatmatrisha passes.
          </p>
        </div>

        {saveSuccess && (
          <div className="alert-banner success" style={{ marginBottom: '1.25rem' }}>
            <CheckCircleIcon style={{ color: '#16a34a' }} />
            <span>Profile details saved successfully!</span>
          </div>
        )}

        {formErrors.submit && (
          <div className="alert-banner error" style={{ marginBottom: '1.25rem' }}>
            <AlertCircleIcon style={{ color: '#dc2626' }} />
            <span>{formErrors.submit}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile}>
          <div className="form-grid-2col">
            <div className="form-group">
              <label htmlFor="studentName" className="form-label">
                <span className="label-left">
                  <UserIcon style={{ color: '#6366f1' }} />
                  <span>Full Name</span>
                  <span className="label-req">*</span>
                </span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon-left"><UserIcon /></span>
                <input
                  id="studentName"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`form-input-modern ${formErrors.name ? 'input-error-state' : ''}`}
                  placeholder="e.g. Jayanth Kumar P"
                  required
                />
              </div>
              {formErrors.name && <div className="field-error-text"><AlertCircleIcon /> {formErrors.name}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="studentSrn" className="form-label">
                <span className="label-left">
                  <IdCardIcon style={{ color: '#6366f1' }} />
                  <span>PES SRN</span>
                  <span className="label-req">*</span>
                </span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon-left"><IdCardIcon /></span>
                <input
                  id="studentSrn"
                  type="text"
                  value={srn}
                  onChange={(e) => setSrn(e.target.value.toUpperCase())}
                  className={`form-input-modern ${formErrors.srn ? 'input-error-state' : ''}`}
                  placeholder="e.g. PES1UG24CS199"
                  maxLength={13}
                  style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
                  required
                />
              </div>
              {formErrors.srn ? (
                <div className="field-error-text"><AlertCircleIcon /> {formErrors.srn}</div>
              ) : (
                <div className="field-hint-text">Format: PES1UG24CS199 or PES2UG26EE322</div>
              )}
            </div>
          </div>

          <div className="form-grid-2col">
            <div className="form-group">
              <label htmlFor="studentEmail" className="form-label">
                <span className="label-left">
                  <MailIcon style={{ color: '#6366f1' }} />
                  <span>Email Address</span>
                  <span className="label-req">*</span>
                </span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon-left"><MailIcon /></span>
                <input
                  id="studentEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`form-input-modern ${formErrors.email ? 'input-error-state' : ''}`}
                  placeholder="e.g. jayanthkumar08p@gmail.com"
                  required
                />
              </div>
              {formErrors.email && <div className="field-error-text"><AlertCircleIcon /> {formErrors.email}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="studentPhone" className="form-label">
                <span className="label-left">
                  <PhoneIcon style={{ color: '#6366f1' }} />
                  <span>Mobile Phone Number</span>
                  <span className="label-req">*</span>
                </span>
              </label>
              <div className="input-wrapper">
                <span className="input-icon-left"><PhoneIcon /></span>
                <input
                  id="studentPhone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`form-input-modern ${formErrors.phone ? 'input-error-state' : ''}`}
                  placeholder="e.g. 8217029299"
                  required
                />
              </div>
              {formErrors.phone ? (
                <div className="field-error-text"><AlertCircleIcon /> {formErrors.phone}</div>
              ) : (
                <div className="field-hint-text">10-digit mobile number for gate access and verification</div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button
              type="submit"
              className="btn-proceed-cta"
              disabled={saving}
              style={{ minWidth: '180px', justifyContent: 'center' }}
            >
              <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
              <CheckCircleIcon />
            </button>
          </div>
        </form>
      </div>

      {/* Tickets & Bookings Manager */}
      <section className="checkout-form-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
          <div>
            <h2 className="form-title" style={{ margin: 0 }}>My Passes & Tickets (FR-07)</h2>
            <p className="form-desc" style={{ marginTop: '0.25rem' }}>
              View digital credentials, complete checkout on pending holds, or cancel eligible tickets with instant capacity restoration.
            </p>
          </div>
          <button
            onClick={fetchTickets}
            className="btn-back-action"
            style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
          >
            🔄 Refresh Passes
          </button>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <button
            type="button"
            onClick={() => setTicketFilter('all')}
            className={`filter-tab-pill ${ticketFilter === 'all' ? 'active' : ''}`}
          >
            All Passes ({tickets.length})
          </button>
          <button
            type="button"
            onClick={() => setTicketFilter('confirmed')}
            className={`filter-tab-pill ${ticketFilter === 'confirmed' ? 'active' : ''}`}
          >
            ✓ Confirmed Passes ({confirmedCount})
          </button>
          <button
            type="button"
            onClick={() => setTicketFilter('held')}
            className={`filter-tab-pill ${ticketFilter === 'held' ? 'active' : ''}`}
          >
            ⏳ Pending Holds ({heldCount})
          </button>
          <button
            type="button"
            onClick={() => setTicketFilter('cancelled')}
            className={`filter-tab-pill ${ticketFilter === 'cancelled' ? 'active' : ''}`}
          >
            ✕ Cancelled ({cancelledCount})
          </button>
        </div>

        {/* Tickets Grid */}
        {ticketsLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
            <div className="spinner-ring" style={{ margin: '0 auto 1rem' }}></div>
            <p style={{ color: '#64748b' }}>Loading your registered tickets...</p>
          </div>
        ) : filteredTickets.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {filteredTickets.map((t) => {
              const eventDate = t.event?.date ? new Date(t.event.date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }) : 'N/A';
              const isConfirmed = t.status === 'confirmed';
              const isHeld = t.status === 'held';
              const isCancelled = ['cancelled', 'canceled', 'refunded'].includes(t.status);
              const isPast = t.event?.date ? new Date(t.event.date) < new Date() : false;

              const cardVariantClass = isConfirmed
                ? 'pass-card-confirmed'
                : isHeld
                ? 'pass-card-held'
                : 'pass-card-cancelled';

              return (
                <div
                  key={t._id}
                  className={`pass-card-modern ${cardVariantClass}`}
                >
                  <div style={{ flex: '1 1 340px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                        {t.event?.title || 'Campus Event'}
                      </h3>
                      {isConfirmed && (
                        <span className="status-pill-confirmed">
                          ✓ Confirmed Pass
                        </span>
                      )}
                      {isHeld && (
                        <span className="status-pill-held">
                          ⏳ Held (Checkout Pending)
                        </span>
                      )}
                      {isCancelled && (
                        <span className="status-pill-cancelled">
                          ✕ Cancelled
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', fontSize: '0.875rem', color: '#475569', marginBottom: '0.65rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <CalendarIcon style={{ color: '#6366f1' }} /> {eventDate} {t.event?.time ? `• ${t.event.time}` : ''}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <LocationIcon style={{ color: '#6366f1' }} /> {t.event?.venue || 'PES Campus'}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <TicketIcon style={{ color: '#6366f1' }} /> {t.quantity} Pass{t.quantity > 1 ? 'es' : ''}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', fontSize: '0.825rem' }}>
                      {t.tierName && (
                        <span className="pill-tier">
                          Tier: {t.tierName}
                        </span>
                      )}
                      {t.seatingLevel && (
                        <span className="pill-section">
                          Section: {t.seatingLevel}
                        </span>
                      )}
                      <span className="pill-price">
                        Total: {t.totalAmount === 0 ? 'FREE' : `₹${Number(t.totalAmount || 0).toLocaleString('en-IN')}`}
                      </span>
                      {t.contactSrn && (
                        <span className="badge-srn-pill">{t.contactSrn}</span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.65rem' }}>
                      Pass ID: <code style={{ background: '#f1f5f9', color: '#475569', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>{t.ticketId || t._id}</code>
                      {t.refundId && (
                        <span style={{ marginLeft: '1rem', color: '#dc2626' }}>
                          Refund Record: <code style={{ background: '#fef2f2', color: '#dc2626', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>{t.refundId}</code>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Confirmed pass actions */}
                    {isConfirmed && !isPast && (
                      <button
                        type="button"
                        onClick={() => handleCancelTicket(t)}
                        disabled={cancelingId === t._id}
                        className="btn-cancel-ticket"
                      >
                        {cancelingId === t._id ? 'Processing Refund...' : 'Cancel Ticket & Refund'}
                      </button>
                    )}

                    {/* Held reservation actions */}
                    {isHeld && (
                      <>
                        <Link
                          to={`/checkout/${t._id}`}
                          className="btn-checkout-held"
                        >
                          <span>Complete Checkout</span>
                          <ArrowRightIcon />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleCancelHold(t)}
                          disabled={cancelingId === t._id}
                          className="btn-cancel-hold"
                        >
                          {cancelingId === t._id ? 'Releasing...' : 'Cancel Hold'}
                        </button>
                      </>
                    )}

                    {/* Cancelled view */}
                    {isCancelled && (
                      <span style={{ fontSize: '0.825rem', color: '#64748b', fontWeight: 600, background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '0.45rem 0.85rem', borderRadius: '6px' }}>
                        Seats Restored to Inventory
                      </span>
                    )}

                    {isPast && isConfirmed && (
                      <span style={{ fontSize: '0.825rem', color: '#64748b' }}>
                        Event Concluded
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
            <p style={{ color: '#64748b', fontSize: '1.05rem', margin: 0 }}>
              No tickets found under this filter.
            </p>
            <Link to="/events" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
              Browse PES Campus Events
            </Link>
          </div>
        )}
      </section>
    </div>
  );
};

export default Profile;
