/**
 * components/ProtectedRoute.jsx — Route guard component
 * Enforces authentication and role-based access control on child routes.
 * Redirects unauthenticated users to /login and unauthorized roles to /.
 */
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, roles }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '3rem' }}>
        <p>Loading application state...</p>
      </div>
    );
  }

  // Redirect to login if user is not logged in
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to home if user role is not authorized for this route
  if (roles && roles.length > 0 && !roles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
