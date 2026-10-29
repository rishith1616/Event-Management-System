/**
 * App.jsx — Root component with route definitions and global context
 * Configures authentication state provider, navigation bar, and role-protected routes.
 */
import { Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import OrganizerDashboard from './pages/OrganizerDashboard';
import AttendeeDashboard from './pages/AttendeeDashboard';
import AdminDashboard from './pages/AdminDashboard';
import CreateEvent from './pages/CreateEvent';
import MyEvents from './pages/MyEvents';
import EventList from './pages/EventList';
import EventDetail from './pages/EventDetail';
import ContactForm from './components/ContactForm';
import Payment from './pages/Payment';
import Checkout from './pages/Checkout';

// Home landing page component
const Home = () => {
  const { user, isAuthenticated } = useAuth();

  const getDashboardPath = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'organizer':
        return '/dashboard/organizer';
      case 'admin':
        return '/dashboard/admin';
      case 'attendee':
      default:
        return '/dashboard/attendee';
    }
  };

  return (
    <div className="container" style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: '#1e293b' }}>
        Event Management System
      </h1>
      <p style={{ fontSize: '1.2rem', color: '#64748b', maxWidth: '600px', margin: '0 auto 2rem' }}>
        Plan, host, and discover events seamlessly. Register as an Organizer to create events, or as an Attendee to explore and purchase tickets.
      </p>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
        <Link to="/events" className="btn btn-primary" style={{ background: '#4f46e5' }}>
          Browse Events
        </Link>
      </div>

      {isAuthenticated ? (
        <div>
          <p style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>
            Logged in as <strong>{user?.name}</strong> ({user?.role})
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link to={getDashboardPath()} className="btn btn-primary">
              Go to Your Dashboard
            </Link>
            {user?.role === 'organizer' && (
              <>
                <Link to="/events/my-events" className="btn btn-primary" style={{ background: '#0284c7' }}>
                  My Events
                </Link>
                <Link to="/events/create" className="btn btn-success">
                  + Create Event
                </Link>
              </>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link to="/register" className="btn btn-primary">
            Get Started
          </Link>
          <Link to="/login" className="btn" style={{ border: '1px solid #d1d5db', background: '#fff' }}>
            Sign In
          </Link>
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <div className="app">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/events" element={<EventList />} />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* FR-04 & FR-05 Checkout Flow */}
            <Route path="/checkout/:holdId" element={<Checkout />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/checkout/contact" element={<ContactForm />} />
            <Route path="/checkout/:ticketId/contact" element={<ContactForm />} />

            {/* FR-06 Payment Processing Route */}
            <Route path="/payment/:holdId" element={<Payment />} />

            {/* Role-Specific Dashboards */}
            <Route
              path="/dashboard/organizer"
              element={
                <ProtectedRoute roles={['organizer']}>
                  <OrganizerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/attendee"
              element={
                <ProtectedRoute roles={['attendee']}>
                  <AttendeeDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/admin"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* FR-02 Organizer Event Management */}
            <Route
              path="/events/create"
              element={
                <ProtectedRoute roles={['organizer']}>
                  <CreateEvent />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events/edit/:id"
              element={
                <ProtectedRoute roles={['organizer']}>
                  <CreateEvent />
                </ProtectedRoute>
              }
            />
            <Route
              path="/events/my-events"
              element={
                <ProtectedRoute roles={['organizer']}>
                  <MyEvents />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Home />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
}

export default App;
