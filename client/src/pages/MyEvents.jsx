/**
 * pages/MyEvents.jsx — Organizer event dashboard
 * Displays all events created by the logged-in organizer with status badges,
 * and allows editing drafts and publishing events.
 */
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

function MyEvents() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  const fetchMyEvents = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/events/my-events');
      setEvents(res.data.events || []);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to fetch your events. Please make sure you are logged in as an Organizer.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyEvents();
  }, []);

  const handlePublish = async (eventId) => {
    try {
      setActionLoading((prev) => ({ ...prev, [eventId]: true }));
      const res = await api.patch(`/events/${eventId}/publish`);
      // Update local state with the published event
      setEvents((prev) =>
        prev.map((ev) => (ev._id === eventId ? res.data.event : ev))
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to publish event');
    } finally {
      setActionLoading((prev) => ({ ...prev, [eventId]: false }));
    }
  };

  const getStatusBadge = (status) => {
    const isPublished = status === 'published';
    const isDraft = status === 'draft';
    const isCanceled = status === 'canceled';

    let bgColor = '#e5e7eb';
    let textColor = '#374151';

    if (isPublished) {
      bgColor = '#dcfce7';
      textColor = '#15803d';
    } else if (isDraft) {
      bgColor = '#fef3c7';
      textColor = '#b45309';
    } else if (isCanceled) {
      bgColor = '#fee2e2';
      textColor = '#b91c1c';
    }

    return (
      <span
        style={{
          display: 'inline-block',
          padding: '0.2rem 0.6rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          backgroundColor: bgColor,
          color: textColor,
        }}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="container" style={{ padding: '2rem 1rem' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Organizer Dashboard</h1>
          <p style={{ color: '#6b7280', marginTop: '0.25rem' }}>
            Manage your created events, update drafts, and publish to attendees
          </p>
        </div>

        <Link to="/events/create" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          + Create New Event
        </Link>
      </div>

      {error && (
        <div
          role="alert"
          style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #f87171',
            color: '#b91c1c',
            padding: '1rem',
            borderRadius: '6px',
            marginBottom: '1.5rem',
          }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: '#6b7280' }}>Loading your events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h3 style={{ marginBottom: '0.5rem', color: '#374151' }}>No events created yet</h3>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            Get started by creating your first event draft or publishing an upcoming event.
          </p>
          <Link to="/events/create" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Create Your First Event
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {events.map((event) => (
            <div
              key={event._id}
              className="card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                borderLeft: event.status === 'published' ? '4px solid #16a34a' : '4px solid #eab308',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{event.title}</h2>
                    {getStatusBadge(event.status)}
                  </div>
                  <p style={{ color: '#4b5563', fontSize: '0.9rem' }}>
                    Category: <strong style={{ textTransform: 'capitalize' }}>{event.category}</strong>
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn"
                    style={{ backgroundColor: '#f3f4f6', color: '#1f2937', fontSize: '0.875rem' }}
                    onClick={() => navigate(`/events/edit/${event._id}`)}
                  >
                    Edit
                  </button>

                  {event.status === 'draft' && (
                    <button
                      type="button"
                      className="btn btn-success"
                      style={{ fontSize: '0.875rem' }}
                      onClick={() => handlePublish(event._id)}
                      disabled={actionLoading[event._id]}
                    >
                      {actionLoading[event._id] ? 'Publishing...' : 'Publish'}
                    </button>
                  )}
                </div>
              </div>

              {event.description && (
                <p style={{ color: '#4b5563', fontSize: '0.95rem' }}>{event.description}</p>
              )}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '0.75rem',
                  backgroundColor: '#f9fafb',
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                }}
              >
                <div>
                  <span style={{ color: '#6b7280', display: 'block' }}>Date</span>
                  <strong>{new Date(event.date).toLocaleDateString()}</strong>
                </div>
                <div>
                  <span style={{ color: '#6b7280', display: 'block' }}>Time</span>
                  <strong>{event.time}</strong>
                </div>
                <div>
                  <span style={{ color: '#6b7280', display: 'block' }}>Venue</span>
                  <strong>{event.venue}</strong>
                </div>
                <div>
                  <span style={{ color: '#6b7280', display: 'block' }}>Capacity</span>
                  <strong>{event.capacity}</strong>
                </div>
                <div>
                  <span style={{ color: '#6b7280', display: 'block' }}>Available Tickets</span>
                  <strong>{event.availableTickets ?? event.capacity}</strong>
                </div>
                <div>
                  <span style={{ color: '#6b7280', display: 'block' }}>Price</span>
                  <strong>{event.price === 0 ? 'Free' : `$${Number(event.price).toFixed(2)}`}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyEvents;
