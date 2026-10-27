/**
 * App.jsx — Root component with route definitions
 * Feature branches will add their specific routes here.
 */
import { Routes, Route, Link } from 'react-router-dom';
import CreateEvent from './pages/CreateEvent';
import MyEvents from './pages/MyEvents';

/**
 * OrganizerRoute — Protects organizer-specific views
 * Blocks attendees from accessing event-creation and management tools.
 */
function OrganizerRoute({ children }) {
  const userStr = localStorage.getItem('user');
  const role = localStorage.getItem('role');
  let userRole = role;

  if (!userRole && userStr) {
    try {
      userRole = JSON.parse(userStr).role;
    } catch (err) {
      userRole = null;
    }
  }

  if (userRole && userRole !== 'organizer' && userRole !== 'admin') {
    return (
      <div className="container" style={{ padding: '2rem 1rem' }}>
        <div className="card" style={{ borderLeft: '4px solid #dc2626' }}>
          <h2>Access Denied</h2>
          <p style={{ marginTop: '0.5rem', color: '#6b7280' }}>
            This page is restricted to Organizers. Your current role is <strong>{userRole}</strong>.
          </p>
          <div style={{ marginTop: '1rem' }}>
            <Link to="/" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

function App() {
  return (
    <div className="app">
      <header
        style={{
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e5e7eb',
          padding: '0.75rem 0',
          marginBottom: '1rem',
        }}
      >
        <div
          className="container"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Link
            to="/"
            style={{
              textDecoration: 'none',
              color: '#111827',
              fontSize: '1.25rem',
              fontWeight: 700,
            }}
          >
            Event Management System
          </Link>
          <nav style={{ display: 'flex', gap: '1rem' }}>
            <Link
              to="/events/my-events"
              style={{
                textDecoration: 'none',
                color: '#4b5563',
                fontWeight: 500,
              }}
            >
              My Events
            </Link>
            <Link
              to="/events/create"
              style={{
                textDecoration: 'none',
                color: '#4f46e5',
                fontWeight: 500,
              }}
            >
              + Create Event
            </Link>
          </nav>
        </div>
      </header>

      <Routes>
        <Route
          path="/"
          element={
            <div className="container" style={{ padding: '2rem 1rem' }}>
              <h1>Event Management System</h1>
              <p style={{ color: '#6b7280', marginTop: '0.5rem' }}>
                Welcome to the university event management portal.
              </p>
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
                <Link to="/events/my-events" className="btn btn-primary" style={{ textDecoration: 'none' }}>
                  Organizer Dashboard
                </Link>
                <Link to="/events/create" className="btn btn-success" style={{ textDecoration: 'none' }}>
                  Create Event
                </Link>
              </div>
            </div>
          }
        />

        {/* FR-02 Organizer Routes */}
        <Route
          path="/events/create"
          element={
            <OrganizerRoute>
              <CreateEvent />
            </OrganizerRoute>
          }
        />
        <Route
          path="/events/edit/:id"
          element={
            <OrganizerRoute>
              <CreateEvent />
            </OrganizerRoute>
          }
        />
        <Route
          path="/events/my-events"
          element={
            <OrganizerRoute>
              <MyEvents />
            </OrganizerRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
