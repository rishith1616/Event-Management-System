/**
 * pages/Register.jsx — User registration page
 * Allows new users to create an account with role selection (Organizer or Attendee).
 * Redirects user to their role-specific dashboard upon successful registration.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'attendee',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const { name, email, password, role } = formData;

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const user = await register(name, email, password, role);

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
        err.response?.data?.message || err.message || 'Registration failed'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container auth-container">
      <div className="card auth-card">
        <h2 style={{ marginBottom: '1rem', textAlign: 'center' }}>Create Account</h2>
        <p style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#666' }}>
          Choose your role to get started with the Event Management System
        </p>

        {error && <div className="error-text alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={name}
              onChange={handleChange}
              placeholder="Enter your full name"
              required
            />
          </div>

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
              placeholder="Minimum 6 characters"
              minLength={6}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="role">Register As</label>
            <select
              id="role"
              name="role"
              value={role}
              onChange={handleChange}
            >
              <option value="attendee">Attendee</option>
              <option value="organizer">Organizer</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={submitting}
          >
            {submitting ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
