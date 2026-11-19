/**
 * pages/AttendeeDashboard.jsx — Modern PES University Attendee Dashboard
 * Features student overview, quick pass wallet access, booking metrics,
 * and recommended PES campus events.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import EventCard from '../components/EventCard';
import {
  IdCardIcon,
  TicketIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ArrowRightIcon,
  CalendarIcon,
} from '../components/Icons';

const AttendeeDashboard = () => {
  const { user } = useAuth();
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    try {
      const res = await api.get('/tickets/my-tickets');
      if (res.data && res.data.data) {
        setTickets(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load attendee tickets:', err);
    }
  };

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await api.get('/events?limit=3');
        if (res.data && res.data.events) {
          setFeaturedEvents(res.data.events);
        }
      } catch (err) {
        console.error('Failed to load events for attendee dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
    fetchTickets();
  }, []);

  const confirmedCount = tickets.filter((t) => t.status === 'confirmed').length;
  const heldCount = tickets.filter((t) => t.status === 'held').length;
  const cancelledCount = tickets.filter((t) => ['cancelled', 'canceled', 'refunded'].includes(t.status)).length;
  const activeHeldTicket = tickets.find((t) => t.status === 'held');

  return (
    <div className="container dashboard" style={{ padding: '2.5rem 1rem 5rem', maxWidth: '1100px' }}>
      {/* Student Identity Header Card */}
      <header
        className="card"
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
          color: '#ffffff',
          borderRadius: '16px',
          padding: '2rem 2.25rem',
          boxShadow: '0 10px 25px -5px rgba(49, 46, 129, 0.4)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          marginBottom: '2rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.65rem',
                fontWeight: 800,
                color: '#ffffff',
                boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                flexShrink: 0,
              }}
            >
              {user?.name ? user.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() : 'JK'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                <h1 style={{ margin: 0, fontSize: '1.85rem', fontWeight: 800, color: '#ffffff' }}>
                  {user?.name || 'Jayanth Kumar P'}
                </h1>
                <span style={{ background: '#10b981', color: '#ffffff', fontSize: '0.75rem', fontWeight: 800, padding: '0.2rem 0.65rem', borderRadius: '9999px', textTransform: 'uppercase' }}>
                  ✓ PES Student Verified
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.45rem', flexWrap: 'wrap', fontSize: '0.9rem', color: '#cbd5e1' }}>
                <span>SRN: <strong style={{ color: '#a5b4fc', fontFamily: 'monospace', letterSpacing: '0.5px' }}>{user?.srn || 'PES1UG24CS199'}</strong></span>
                <span>•</span>
                <span>Phone: <strong style={{ color: '#ffffff' }}>+91 {user?.phone || '8217029299'}</strong></span>
                <span>•</span>
                <span>Email: <strong style={{ color: '#ffffff' }}>{user?.email || 'jayanthkumar08p@gmail.com'}</strong></span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link
              to="/profile"
              className="btn"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(8px)',
                padding: '0.65rem 1.25rem',
                borderRadius: '10px',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <IdCardIcon />
              <span>Student ID & Passes</span>
            </Link>
          </div>
        </div>

        {/* Quick Booking Metrics Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '1.75rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.15)' }}>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#86efac', fontWeight: 700 }}>Confirmed Passes</div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff' }}>{confirmedCount}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#fde68a', fontWeight: 700 }}>Pending Holds</div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff' }}>{heldCount}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#fca5a5', fontWeight: 700 }}>Cancelled & Restored</div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff' }}>{cancelledCount}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#c7d2fe', fontWeight: 700 }}>Campus Events Enrolled</div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff' }}>{tickets.length}</div>
          </div>
        </div>
      </header>

      {/* Pending Hold Action Banner */}
      {heldCount > 0 && activeHeldTicket && (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>⏳</span>
            <div>
              <div style={{ fontWeight: 700, color: '#92400e', fontSize: '1rem' }}>
                You have {heldCount} active ticket hold reserved!
              </div>
              <div style={{ color: '#b45309', fontSize: '0.875rem', marginTop: '0.15rem' }}>
                "{activeHeldTicket.event?.title || 'Campus Event'}" is held for you. Complete your checkout before the timer expires.
              </div>
            </div>
          </div>
          <Link
            to={`/checkout/${activeHeldTicket._id}`}
            className="btn btn-primary"
            style={{
              padding: '0.55rem 1.25rem',
              fontSize: '0.875rem',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <span>Complete Checkout</span>
            <ArrowRightIcon />
          </Link>
        </div>
      )}

      {/* Pass Wallet Hub Card */}
      <section
        className="card"
        style={{
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '2rem',
          marginBottom: '2.5rem',
          background: '#ffffff',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ maxWidth: '650px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#e0e7ff', color: '#4338ca', padding: '0.2rem 0.65rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.65rem' }}>
              <TicketIcon />
              <span>Digital Campus Pass Wallet</span>
            </div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.45rem' }}>
              My Tickets & University Credentials
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0, lineHeight: 1.6 }}>
              {confirmedCount > 0
                ? `You have ${confirmedCount} confirmed campus pass${confirmedCount > 1 ? 'es' : ''} ready for gate check-in, plus instant cancellation and refund options.`
                : 'All your reserved campus passes, active ticket holds, and student identity details are managed in your dedicated wallet.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Link
              to="/profile"
              className="btn btn-primary"
              style={{
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.75rem 1.5rem',
                fontWeight: 700,
              }}
            >
              <IdCardIcon />
              <span>Manage Passes & Student ID →</span>
            </Link>
            <Link
              to="/events"
              className="btn btn-secondary"
              style={{
                textDecoration: 'none',
                padding: '0.75rem 1.25rem',
                fontWeight: 600,
              }}
            >
              Browse Events
            </Link>
          </div>
        </div>
      </section>

      {/* Recommended Campus Events */}
      <section
        className="card"
        style={{
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          padding: '2rem',
          background: '#ffffff',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Upcoming PES Campus Events
            </h2>
            <p style={{ color: '#64748b', marginTop: '0.25rem', fontSize: '0.925rem' }}>
              Explore upcoming hackathons at PESU 52, culturals at GJBC & Amphitheatre, and Aatmatrisha 2026.
            </p>
          </div>
          <Link to="/events" className="btn btn-secondary" style={{ textDecoration: 'none', fontWeight: 600 }}>
            Explore All Events →
          </Link>
        </div>

        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <div className="spinner-ring" style={{ margin: '0 auto 1rem' }}></div>
              <p style={{ color: '#64748b' }}>Discovering upcoming campus events...</p>
            </div>
          ) : featuredEvents.length > 0 ? (
            <div className="event-grid" style={{ marginBottom: 0 }}>
              {featuredEvents.map((evt) => (
                <EventCard key={evt._id} event={evt} />
              ))}
            </div>
          ) : (
            <div className="placeholder-box" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
              <p>No featured events right now.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AttendeeDashboard;
