/**
 * pages/OrganizerDashboard.jsx — Organizer landing page
 * Provides event organizers with event creation and management tools.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const OrganizerDashboard = () => {
  const { user } = useAuth();
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyEvents = async () => {
      try {
        const res = await api.get('/events/my-events');
        if (res.data && res.data.events) {
          setMyEvents(res.data.events);
        }
      } catch (err) {
        console.error('Failed to load organizer events:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMyEvents();
  }, []);

  return (
    <div className="container dashboard">
      <header className="dashboard-header card">
        <h1>Organizer Dashboard</h1>
        <p className="welcome-message">
          Welcome, <strong>{user?.name}</strong>! You are logged in as an <strong>Organizer</strong>.
        </p>
      </header>

      <section className="dashboard-actions card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2>Event Management</h2>
            <p style={{ color: '#666', marginTop: '0.25rem' }}>
              Publish new conferences, meetups, hackathons, and workshops.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link to="/events/my-events" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              My Events List
            </Link>
            <Link to="/events/create" className="btn btn-success" style={{ textDecoration: 'none' }}>
              + Create New Event
            </Link>
          </div>
        </div>
      </section>

      <section className="dashboard-content card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Recent Events Overview</h2>
          <Link to="/events/my-events" style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: 500 }}>
            Manage All ({myEvents.length}) &rarr;
          </Link>
        </div>

        {loading ? (
          <p style={{ color: '#64748b' }}>Loading your events...</p>
        ) : myEvents.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {myEvents.slice(0, 4).map((evt) => (
              <div
                key={evt._id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  background: '#f8fafc',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: '#0f172a', marginBottom: '0.25rem' }}>
                    {evt.title}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                    {new Date(evt.date).toLocaleDateString()} at {evt.time} &bull; {evt.venue}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span
                    className={`badge ${evt.status === 'published' ? 'badge-status-active' : 'badge-workshop'}`}
                    style={{ textTransform: 'uppercase', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                  >
                    {evt.status}
                  </span>
                  <Link to={`/events/edit/${evt._id}`} className="btn btn-sm btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', textDecoration: 'none' }}>
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="placeholder-box" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
            <p>No events published yet.</p>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Click &ldquo;+ Create New Event&rdquo; above to publish your first event!
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default OrganizerDashboard;
