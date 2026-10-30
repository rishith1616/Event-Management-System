/**
 * pages/EventDetail.jsx — Detailed Event View Page
 * Shows complete event details including date, time, venue, category, pricing,
 * ticket availability, and booking action placeholder.
 */
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bookingMessage, setBookingMessage] = useState('');

  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/events/${id}`);
        if (res.data && res.data.success) {
          setEvent(res.data.event);
        } else {
          setError('Event not found');
        }
      } catch (err) {
        console.error('Error fetching event details:', err);
        const message =
          err.response?.status === 404
            ? err.response?.data?.message || 'The requested event was not found or is no longer available.'
            : 'Failed to load event details. Please try again later.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchEvent();
    }
  }, [id]);

  const handleBookTickets = () => {
    if (!token && !localStorage.getItem('token')) {
      navigate('/login');
      return;
    }
    navigate(`/checkout?eventId=${id}&quantity=1`);
  };

  if (loading) {
    return (
      <div className="container event-detail-container">
        <div className="loading-state" aria-busy="true">
          <div className="spinner"></div>
          <p>Loading event information...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="container event-detail-container">
        <div className="card empty-state not-found-state">
          <div className="empty-state-icon">⚠️</div>
          <h2>Event Unavailable</h2>
          <p>{error || 'The requested event could not be found.'}</p>
          <Link to="/events" className="btn btn-primary">
            ← Browse All Events
          </Link>
        </div>
      </div>
    );
  }

  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const isSoldOut = event.availableTickets <= 0;
  const isFree = event.price === 0;
  const isSuspended = event.status === 'suspended' || event.isSuspended || event.organizer?.isSuspended;

  return (
    <div className="container event-detail-container">
      <nav className="detail-breadcrumb" aria-label="Breadcrumb">
        <Link to="/events" className="breadcrumb-link">
          ← Back to All Events
        </Link>
      </nav>

      <div className="event-detail-card card">
        {isSuspended && (
          <div className="alert alert-danger" style={{ marginBottom: '1.5rem', background: '#fee2e2', border: '1px solid #ef4444', color: '#991b1b', padding: '1rem', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 0.25rem' }}>🚫 Event Suspended by Platform Administration</h3>
            <p style={{ margin: 0, fontSize: '0.95rem' }}>
              This event or its organizer account has been suspended for terms of service violations. Ticket sales and booking are strictly disabled.
            </p>
          </div>
        )}
        <div className="event-detail-header">
          <div className="badge-group">
            <span className={`badge badge-category badge-${event.category?.toLowerCase() || 'default'}`}>
              {event.category}
            </span>
            <span className={`badge ${isSoldOut ? 'badge-soldout' : 'badge-status-active'}`}>
              {isSoldOut ? 'Sold Out' : 'Active'}
            </span>
          </div>

          <h1 className="event-detail-title">{event.title}</h1>

          {event.organizer && (
            <p className="event-organizer">
              Organized by: <strong>{event.organizer.name || event.organizer.email || 'Event Organizer'}</strong>
            </p>
          )}
        </div>

        <div className="event-detail-grid">
          {/* Main Content */}
          <div className="event-main-content">
            <section className="detail-section">
              <h2>About this event</h2>
              <div className="event-description">
                {event.description.split('\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar / Info Box */}
          <aside className="event-sidebar">
            <div className="info-card">
              <h3 className="info-card-heading">Event Details</h3>

              <div className="info-item">
                <span className="info-icon" aria-hidden="true">📅</span>
                <div>
                  <div className="info-label">Date & Time</div>
                  <div className="info-value">{formattedDate}</div>
                  <div className="info-subvalue">{event.time}</div>
                </div>
              </div>

              <div className="info-item">
                <span className="info-icon" aria-hidden="true">📍</span>
                <div>
                  <div className="info-label">Location / Venue</div>
                  <div className="info-value">{event.venue}</div>
                </div>
              </div>

              <div className="info-item">
                <span className="info-icon" aria-hidden="true">🏷️</span>
                <div>
                  <div className="info-label">Ticket Price</div>
                  <div className="info-value price-highlight">
                    {isFree ? 'Free Admission' : `$${Number(event.price).toFixed(2)}`}
                  </div>
                </div>
              </div>

              <div className="info-item">
                <span className="info-icon" aria-hidden="true">🎟️</span>
                <div>
                  <div className="info-label">Tickets Availability</div>
                  <div className={`info-value ${isSoldOut ? 'tickets-sold-out' : 'tickets-available'}`}>
                    {isSoldOut ? 'Sold Out' : `${event.availableTickets} of ${event.capacity} remaining`}
                  </div>
                </div>
              </div>

              {bookingMessage && (
                <div className="alert alert-info" role="status">
                  {bookingMessage}
                </div>
              )}

              {isSuspended ? (
                <button
                  type="button"
                  className="btn btn-block btn-disabled btn-large"
                  style={{ background: '#dc2626', color: '#fff', cursor: 'not-allowed' }}
                  disabled={true}
                >
                  🚫 Event Suspended
                </button>
              ) : (
                <button
                  type="button"
                  className={`btn btn-block ${isSoldOut ? 'btn-disabled' : 'btn-primary'} btn-large`}
                  disabled={isSoldOut}
                  onClick={handleBookTickets}
                >
                  {isSoldOut ? 'Sold Out' : 'Book Tickets'}
                </button>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
