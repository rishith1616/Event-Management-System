/**
 * components/Navbar.jsx — Global navigation bar component
 * Displays branding, navigation links based on authentication state,
 * role-specific dashboard link, and user logout button.
 */
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Determine dashboard link path based on user role
  const getDashboardPath = () => {
    if (!user) return '/';
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
    <nav className="navbar">
      <div className="container navbar-container">
        <Link to="/" className="navbar-brand">
          Event Management System
        </Link>
        <div className="navbar-links">
          <Link to="/events" className="nav-link" style={{ fontWeight: 600, color: '#4f46e5' }}>
            Browse Events
          </Link>
          {isAuthenticated ? (
            <>
              {user?.role === 'organizer' && (
                <>
                  <Link to="/events/my-events" className="nav-link">
                    My Events
                  </Link>
                  <Link to="/events/create" className="btn btn-success btn-sm" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>
                    + Create Event
                  </Link>
                </>
              )}
              <span className="navbar-user">
                {user?.name} ({user?.role})
              </span>
              <Link to={getDashboardPath()} className="nav-link">
                Dashboard
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-danger btn-sm"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">
                Login
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
