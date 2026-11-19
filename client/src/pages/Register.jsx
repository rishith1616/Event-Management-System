/**
 * pages/Register.jsx — Modern User Registration Page
 * Allows new users to create an account with role selection (Organizer or Attendee).
 * Redirects user to their role-specific dashboard upon successful registration.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BrandLogo, UsersIcon, TicketIcon, SparklesIcon, CheckCircleIcon } from '../components/Icons';

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

  const handleRoleSelect = (selectedRole) => {
    setFormData((prev) => ({ ...prev, role: selectedRole }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const user = await register(name, email, password, role);

      // Route to role-specific dashboard on success
      if (user.role === 'organizer') {
        navigate('/dashboard/organizer');
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
    <div className="auth-page-wrapper">
      <div className="auth-card-modern card" style={{ maxWidth: '520px' }}>
        <div className="auth-brand-header">
          <BrandLogo style={{ width: '40px', height: '40px', marginBottom: '12px' }} />
          <h2 className="auth-title">Create Your Account</h2>
          <p className="auth-subtitle">
            Join thousands of attendees and event organizers on EventFlow
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form-modern">
          {/* Visual Role Selector */}
          <div className="form-group-modern">
            <label>I want to join as an:</label>
            <div className="role-selector-grid">
              <div
                className={`role-option-card ${role === 'attendee' ? 'role-selected' : ''}`}
                onClick={() => handleRoleSelect('attendee')}
              >
                <div className="role-card-header">
                  <TicketIcon style={{ color: '#6366f1', fontSize: '1.25rem' }} />
                  {role === 'attendee' && <CheckCircleIcon style={{ color: '#6366f1' }} />}
                </div>
                <h4>Attendee</h4>
                <p>Browse events, hold seats, and manage tickets</p>
              </div>

              <div
                className={`role-option-card ${role === 'organizer' ? 'role-selected' : ''}`}
                onClick={() => handleRoleSelect('organizer')}
              >
                <div className="role-card-header">
                  <SparklesIcon style={{ color: '#8b5cf6', fontSize: '1.25rem' }} />
                  {role === 'organizer' && <CheckCircleIcon style={{ color: '#8b5cf6' }} />}
                </div>
                <h4>Organizer</h4>
                <p>Host events, manage capacity, and track sales</p>
              </div>
            </div>
          </div>

          <div className="form-group-modern">
            <label htmlFor="name">Full Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={name}
              onChange={handleChange}
              placeholder="e.g. John Doe"
              required
              className="modern-text-input"
            />
          </div>

          <div className="form-group-modern">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={handleChange}
              placeholder="e.g. john@example.com"
              required
              className="modern-text-input"
            />
          </div>

          <div className="form-group-modern">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={handleChange}
              placeholder="At least 6 characters"
              required
              minLength={6}
              className="modern-text-input"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-auth-submit"
            disabled={submitting}
          >
            <span>{submitting ? 'Creating Account...' : 'Complete Registration'}</span>
          </button>
        </form>

        <p className="auth-footer-text">
          Already have an account? <Link to="/login" className="auth-switch-link">Sign in here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
