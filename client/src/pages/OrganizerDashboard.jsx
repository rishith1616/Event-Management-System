/**
 * pages/OrganizerDashboard.jsx — Organizer landing page
 * Provides event organizers with event creation and management tools.
 */
import { useAuth } from '../context/AuthContext';

const OrganizerDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="container dashboard">
      <header className="dashboard-header card">
        <h1>Organizer Dashboard</h1>
        <p className="welcome-message">
          Welcome, <strong>{user?.name}</strong>! You are an <strong>Organizer</strong>.
        </p>
      </header>

      <section className="dashboard-actions card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Event Management</h2>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => alert('Create Event feature coming soon!')}
          >
            + Create Event
          </button>
        </div>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>
          Use the button above to publish new conferences, meetups, and workshops.
        </p>
      </section>

      <section className="dashboard-content card" style={{ marginTop: '1.5rem' }}>
        <h2>My Events</h2>
        <div className="placeholder-box" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
          <p>No events published yet.</p>
          <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Click &ldquo;Create Event&rdquo; to launch your first event.
          </p>
        </div>
      </section>
    </div>
  );
};

export default OrganizerDashboard;
