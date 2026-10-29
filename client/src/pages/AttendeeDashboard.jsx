/**
 * pages/AttendeeDashboard.jsx — Attendee landing page
 * Provides event attendees with access to browse upcoming events and view purchased tickets.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import EventCard from '../components/EventCard';

const AttendeeDashboard = () => {
  const { user } = useAuth();
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [loading, setLoading] = useState(true);

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
  }, []);

  return (
    <div className="container dashboard">
      <header className="dashboard-header card">
        <h1>Attendee Dashboard</h1>
        <p className="welcome-message">
          Welcome, <strong>{user?.name}</strong>! You are logged in as an <strong>Attendee</strong>.
        </p>
      </header>

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
        <h2>My Tickets</h2>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>
          Manage your booked tickets and registration confirmations.
        </p>
        <div className="placeholder-box" style={{ padding: '2rem', textAlign: 'center', color: '#888', marginTop: '1rem' }}>
          <p>You have not registered for any events yet.</p>
          <p style={{ marginTop: '0.5rem' }}>
            Browse the catalog above to find and register for an event!
          </p>
        </div>
      </section>
    </div>
  );
};

export default AttendeeDashboard;
