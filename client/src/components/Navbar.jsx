/**
 * components/Navbar.jsx — Global navigation bar component
 * Displays branding, navigation links based on authentication state,
 * role-specific dashboard link, and user logout button.
 */
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BrandLogo, TicketIcon, UsersIcon, SparklesIcon, IdCardIcon } from './Icons';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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

  const isActive = (path) => location.pathname === path;

  return (
    <header className="navbar-glass">
      <div className="container navbar-container">
        {/* Brand Logo */}
        <Link to="/" className="navbar-brand">
          <BrandLogo />
          <div className="brand-text-container">
            <span className="brand-title">
              PES Event<span className="brand-gradient">Flow</span>
            </span>
            <span className="brand-badge">PES University</span>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="navbar-menu">
          <Link
            to="/events"
            className={`nav-link ${isActive('/events') ? 'nav-link-active' : ''}`}
          >
            <TicketIcon style={{ marginRight: '6px' }} />
            <span>Browse Events</span>
          </Link>

          {isAuthenticated && user?.role === 'organizer' && (
            <Link
              to="/events/my-events"
              className={`nav-link ${isActive('/events/my-events') ? 'nav-link-active' : ''}`}
            >
              <span>My Events</span>
            </Link>
          )}

          {isAuthenticated && (
            <Link
              to={getDashboardPath()}
              className={`nav-link ${location.pathname.startsWith('/dashboard') ? 'nav-link-active' : ''}`}
            >
              <UsersIcon style={{ marginRight: '6px' }} />
              <span>Dashboard</span>
            </Link>
          )}

          {isAuthenticated && (
            <Link
              to="/profile"
              className={`nav-link ${isActive('/profile') ? 'nav-link-active' : ''}`}
            >
              <IdCardIcon style={{ marginRight: '6px' }} />
              <span>Student ID & Passes</span>
            </Link>
          )}
        </nav>

        {/* Right CTA / Auth Controls */}
        <div className="navbar-actions">
          {isAuthenticated ? (
            <div className="user-nav-group">
              {user?.role === 'organizer' && (
                <Link to="/events/create" className="btn btn-create-event">
                  <SparklesIcon style={{ marginRight: '6px' }} />
                  <span>Create Event</span>
                </Link>
              )}

              <Link to="/profile" className="user-profile-chip" title="View Student Profile & Passes" style={{ textDecoration: 'none' }}>
                <div className="user-avatar-circle">
                  {(user?.name || user?.email || 'J')[0].toUpperCase()}
                </div>
                <div className="user-info-text">
                  <span className="user-name">{user?.name?.split(' ')[0] || 'Jayanth'}</span>
                  <span className={`user-role-badge badge-role-${user?.role || 'attendee'}`}>
                    {user?.srn || user?.role}
                  </span>
                </div>
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-logout"
                title="Sign out"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="guest-nav-group">
              <Link to="/login" className="btn btn-ghost">
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary btn-signup">
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
