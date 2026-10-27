/**
 * pages/Login.jsx — User login page
 * Authenticates registered users and redirects them to their respective role dashboard.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const { email, password } = formData;

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Please provide both email and password');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const user = await login(email, password);

      // Route to role-specific dashboard on success
      if (user.role === 'organizer') {
        navigate('/dashboard/organizer');
      } else if (user.role === 'admin') {
        navigate('/dashboard/admin');
      } else {
        navigate('/dashboard/attendee');
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Login failed'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container auth-container">
      <div className="card auth-card">
        <h2 style={{ marginBottom: '1rem', textAlign: 'center' }}>Welcome Back</h2>
        <p style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#666' }}>
          Sign in to access your dashboard
        </p>

        {error && <div className="error-text alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={submitting}
          >
            {submitting ? 'Signing In...' : 'Login'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
