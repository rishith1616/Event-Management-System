/**
 * pages/AdminDashboard.jsx — Administrator landing page
 * Provides platform administrators with controls to manage users and system-wide events.
 */
import { useAuth } from '../context/AuthContext';

const AdminDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="container dashboard">
      <header className="dashboard-header card">
        <h1>Admin Dashboard</h1>
        <p className="welcome-message">
          Welcome, <strong>{user?.name}</strong>! System Administrator control panel.
        </p>
      </header>

      <section className="dashboard-content card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Manage Users</h2>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => alert('User management coming soon!')}
          >
            View All Users
          </button>
        </div>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>
          Review registered attendees, organizers, and user roles across the platform.
        </p>
        <div className="placeholder-box" style={{ padding: '2rem', textAlign: 'center', color: '#888', marginTop: '1rem' }}>
          <p>User administration metrics and user list will be displayed here.</p>
        </div>
      </section>

      <section className="dashboard-content card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Manage Events</h2>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => alert('Event moderation coming soon!')}
          >
            Moderate Events
          </button>
        </div>
        <p style={{ color: '#666', marginTop: '0.5rem' }}>
          Approve, edit, or remove events across all organizers.
        </p>
        <div className="placeholder-box" style={{ padding: '2rem', textAlign: 'center', color: '#888', marginTop: '1rem' }}>
          <p>Global event moderation queue will be displayed here.</p>
        </div>
      </section>
    </div>
  );
};

export default AdminDashboard;
