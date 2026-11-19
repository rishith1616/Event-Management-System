/**
 * pages/Login.jsx — Modern User Login Page
 * Authenticates registered users with quick-fill demo presets for seamless evaluation.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BrandLogo, LockClosedIcon, SparklesIcon, UsersIcon } from '../components/Icons';

const DEMO_PRESETS = [
  { role: 'Attendee', email: 'jayanthkumar08p@gmail.com', label: 'Student' },
  { role: 'Organizer', email: 'organizer@eventms.com', label: 'Club Council Lead' },
  { role: 'Admin', email: 'admin@eventms.com', label: 'Dean / Admin' },
];

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

  const handleFillDemo = async (demoEmail) => {
    setFormData({
      email: demoEmail,
      password: 'password123',
    });
    setError('');

    // Instant one-click demo login
    try {
      setSubmitting(true);
      const user = await login(demoEmail, 'password123');
      if (user.role === 'organizer') {
        navigate('/dashboard/organizer');
      } else if (user.role === 'admin') {
        navigate('/dashboard/admin');
      } else {
        navigate('/dashboard/attendee');
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || 'Invalid email or password'
      );
    } finally {
      setSubmitting(false);
    }
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
        err.response?.data?.message || err.message || 'Invalid email or password'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card-modern card">
        <div className="auth-brand-header">
          <BrandLogo style={{ width: '40px', height: '40px', marginBottom: '12px' }} />
          <h2 className="auth-title">Welcome Back</h2>
          <p className="auth-subtitle">
            Sign in to access your event dashboard and tickets
          </p>
        </div>

        {/* Demo Fast-Fill Bar */}
        <div className="demo-credentials-banner">
          <div className="demo-label">
            <SparklesIcon style={{ marginRight: '4px', verticalAlign: '-1px' }} />
            <span>One-Click Demo Credentials:</span>
          </div>
          <div className="demo-presets-row">
            {DEMO_PRESETS.map((p) => (
              <button
                key={p.role}
                type="button"
                className="btn-demo-preset"
                onClick={() => handleFillDemo(p.email)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form-modern">
          <div className="form-group-modern">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={handleChange}
              placeholder="e.g. attendee@eventms.com"
              required
              className="modern-text-input"
            />
          </div>

          <div className="form-group-modern">
            <div className="label-with-hint">
              <label htmlFor="password">Password</label>
              <span className="hint-text">Demo password: password123</span>
            </div>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={handleChange}
              placeholder="••••••••••••"
              required
              className="modern-text-input"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-auth-submit"
            disabled={submitting}
          >
            <LockClosedIcon style={{ marginRight: '6px' }} />
            <span>{submitting ? 'Authenticating...' : 'Sign In to Account'}</span>
          </button>
        </form>

        <p className="auth-footer-text">
          New to EventFlow? <Link to="/register" className="auth-switch-link">Create an account</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
