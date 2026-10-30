/**
 * pages/AttendeeDashboard.jsx — Attendee landing page
 * Provides event attendees with access to browse upcoming events and view/cancel purchased tickets (FR-07).
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import EventCard from '../components/EventCard';

const AttendeeDashboard = () => {
  const { user } = useAuth();
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [cancelingId, setCancelingId] = useState(null);

  const fetchTickets = async () => {
    try {
      setTicketsLoading(true);
      const res = await api.get('/tickets/my-tickets');
      if (res.data && res.data.data) {
        setTickets(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load attendee tickets:', err);
    } finally {
      setTicketsLoading(false);
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

  const handleCancelTicket = async (ticket) => {
    const confirmCancel = window.confirm(
      `Are you sure you want to cancel your ticket for "${ticket.event?.title || 'this event'}"? ` +
      `Your reserved seat(s) will be returned to inventory and a refund of $${Number(ticket.totalAmount || 0).toFixed(2)} will be initiated.`
    );

    if (!confirmCancel) return;

    try {
      setCancelingId(ticket._id);
      setActionMessage(null);
      setActionError(null);

      const res = await api.post(`/tickets/${ticket._id}/cancel`, {
        reason: 'Attendee requested cancellation via dashboard',
      });

      if (res.data && res.data.success) {
        setActionMessage(
          `Ticket for "${ticket.event?.title || 'Event'}" was successfully canceled. Refund of $${Number(ticket.totalAmount || 0).toFixed(2)} has been recorded and seat capacity was restored!`
        );
        await fetchTickets();
      }
    } catch (err) {
      console.error('Error canceling ticket:', err);
      setActionError(
        err.response?.data?.message || 'Failed to cancel ticket. Please try again later.'
      );
    } finally {
      setCancelingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return <span className="badge" style={{ background: '#16a34a', color: '#fff' }}>Confirmed</span>;
      case 'cancelled':
      case 'canceled':
        return <span className="badge" style={{ background: '#ef4444', color: '#fff' }}>Cancelled</span>;
      case 'refunded':
        return <span className="badge" style={{ background: '#0284c7', color: '#fff' }}>Refunded</span>;
      case 'held':
        return <span className="badge" style={{ background: '#f59e0b', color: '#fff' }}>Held (Checkout)</span>;
      default:
        return <span className="badge" style={{ background: '#64748b', color: '#fff' }}>{status}</span>;
    }
  };

  return (
    <div className="container dashboard">
      <header className="dashboard-header card">
        <h1>Attendee Dashboard</h1>
        <p className="welcome-message">
          Welcome, <strong>{user?.name}</strong>! You are logged in as an <strong>Attendee</strong>.
        </p>
      </header>

      {actionMessage && (
        <div className="alert alert-success" style={{ marginTop: '1rem', padding: '1rem', background: '#dcfce7', color: '#166534', borderRadius: '6px', border: '1px solid #86efac' }}>
          ✅ {actionMessage}
        </div>
      )}

      {actionError && (
        <div className="alert alert-danger" style={{ marginTop: '1rem', padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', border: '1px solid #fca5a5' }}>
          ⚠️ {actionError}
        </div>
      )}

      <section className="dashboard-content card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2>Browse Events</h2>
            <p style={{ color: '#666', marginTop: '0.25rem' }}>
              Discover upcoming conferences, workshops, and gatherings.
            </p>
          </div>
          <Link to="/events" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Explore All Events &rarr;
          </Link>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          {loading ? (
            <p style={{ color: '#64748b' }}>Loading upcoming events...</p>
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

      <section className="dashboard-content card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h2>My Tickets & Bookings (FR-07)</h2>
            <p style={{ color: '#666', marginTop: '0.25rem' }}>
              Manage your booked tickets, view confirmation details, or cancel eligible tickets with instant refunds.
            </p>
          </div>
          <button onClick={fetchTickets} className="btn" style={{ border: '1px solid #cbd5e1', background: '#fff', fontSize: '0.9rem' }}>
            🔄 Refresh Tickets
          </button>
        </div>

        {ticketsLoading ? (
          <p style={{ color: '#64748b' }}>Loading your tickets...</p>
        ) : tickets.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {tickets.map((t) => {
              const eventDate = t.event?.date ? new Date(t.event.date).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              }) : 'N/A';
              const isConfirmed = t.status === 'confirmed';
              const isPast = t.event?.date ? new Date(t.event.date) < new Date() : false;

              return (
                <div
                  key={t._id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '1.25rem',
                    background: '#f8fafc',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '1rem',
                  }}
                >
                  <div style={{ flex: '1 1 300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{t.event?.title || 'Unknown Event'}</h3>
                      {getStatusBadge(t.status)}
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#475569', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                      <span>📅 {eventDate} {t.event?.time ? `• ${t.event.time}` : ''}</span>
                      <span>📍 {t.event?.venue || 'TBA'}</span>
                      <span>🎟️ {t.quantity} Seat{t.quantity > 1 ? 's' : ''}</span>
                      <span>💵 $${Number(t.totalAmount || 0).toFixed(2)}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                      Ticket ID: <code>{t.ticketId || t._id}</code>
                      {t.refundId && <span style={{ marginLeft: '1rem' }}>Refund ID: <code>{t.refundId}</code></span>}
                    </div>
                  </div>

                  <div>
                    {isConfirmed && !isPast && (
                      <button
                        onClick={() => handleCancelTicket(t)}
                        disabled={cancelingId === t._id}
                        className="btn btn-outline-danger"
                        style={{
                          borderColor: '#ef4444',
                          color: '#ef4444',
                          padding: '0.5rem 1rem',
                          fontSize: '0.9rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        {cancelingId === t._id ? 'Canceling...' : 'Cancel & Refund Ticket'}
                      </button>
                    )}
                    {(!isConfirmed || isPast) && (
                      <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
                        {isPast ? 'Event Concluded' : 'Not eligible for cancellation'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="placeholder-box" style={{ padding: '2rem', textAlign: 'center', color: '#888', background: '#f8fafc', borderRadius: '8px' }}>
            <p>You have not registered for any events yet.</p>
            <p style={{ marginTop: '0.5rem' }}>
              Browse the catalog above to find and register for an event!
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default AttendeeDashboard;
