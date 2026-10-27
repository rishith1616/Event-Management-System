/**
 * pages/AttendeeDashboard.jsx — Attendee landing page
 * Provides event attendees with access to browse upcoming events and view purchased tickets.
 */
import { useAuth } from '../context/AuthContext';

const AttendeeDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="container dashboard">
      <header className="dashboard-header card">
        <h1>Attendee Dashboard</h1>
        <p className="welcome-message">
          Welcome, <strong>{user?.name}</strong>! You are an <strong>Attendee</strong>.
        </p>
      </header>

      <section className="dashboard-content card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Browse Events</h2>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => alert('Browse Events feature coming soon!')}
          >
            Explore All Events
          </button>
        </div>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>
          Discover upcoming conferences, workshops, and gatherings.
        </p>
        <div className="placeholder-box" style={{ padding: '2rem', textAlign: 'center', color: '#888', marginTop: '1rem' }}>
          <p>No featured events right now. Check back soon!</p>
        </div>
      </section>

      <section className="dashboard-content card" style={{ marginTop: '1.5rem' }}>
        <h2>My Tickets</h2>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>
          Manage your booked tickets and registration confirmations.
        </p>
        <div className="placeholder-box" style={{ padding: '2rem', textAlign: 'center', color: '#888', marginTop: '1rem' }}>
          <p>You have not registered for any events yet.</p>
        </div>
      </section>
    </div>
  );
};

export default AttendeeDashboard;
