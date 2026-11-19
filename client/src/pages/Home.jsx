/**
 * pages/Home.jsx — PES University Campus Events Flagship Portal
 * Features Aatmatrisha 2026, PES club workshops, campus search, live metrics,
 * and seamless INR ticket reservations with ACID concurrency guarantees.
 */
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import EventCard from '../components/EventCard';
import {
  SearchIcon,
  SparklesIcon,
  TicketIcon,
  ShieldCheckIcon,
  UsersIcon,
  ArrowRightIcon,
} from '../components/Icons';

const Home = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopEvents = async () => {
      try {
        const res = await api.get('/events?limit=8&sort=date');
        if (res.data && res.data.events) {
          setFeaturedEvents(res.data.events);
        }
      } catch (err) {
        console.error('Failed to load featured events:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTopEvents();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/events?search=${encodeURIComponent(searchTerm.trim())}`);
    } else {
      navigate('/events');
    }
  };

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
    <div className="home-page">
      {/* 1. Hero Section */}
      <section className="hero-section">
        <div className="hero-background-glow"></div>
        <div className="container hero-container">
          <div className="hero-announcement-pill">
            <SparklesIcon style={{ color: '#818cf8', marginRight: '6px' }} />
            <span>PES University Campus Events Portal · RR & EC Campuses</span>
          </div>

          <h1 className="hero-title">
            Experience the Pulse of <br />
            <span className="hero-gradient-text">PES Campus Life</span>
          </h1>

          <p className="hero-subtitle">
            From the grand annual fest <strong>Aatmatrisha</strong> to high-tech hackathons by <strong>Aura</strong>,
            space rocketry with <strong>Equinox</strong>, dance battles with <strong>Trance</strong>, and pitch summits by <strong>E-Cell</strong>.
            Reserve your student passes with instant ACID seat holds.
          </p>

          {/* Quick Search Form */}
          <form onSubmit={handleSearchSubmit} className="hero-search-bar" role="search">
            <div className="search-input-wrapper">
              <SearchIcon className="search-field-icon" />
              <input
                type="text"
                placeholder="Search PES clubs, Aatmatrisha, MRD Auditorium, hackathons..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="hero-search-input"
              />
            </div>
            <button type="submit" className="btn btn-hero-search">
              <span>Search Events</span>
              <ArrowRightIcon style={{ marginLeft: '6px' }} />
            </button>
          </form>

          {/* Quick Action Links / Status */}
          <div className="hero-cta-group">
            <Link to="/events" className="btn btn-primary btn-hero-primary">
              <TicketIcon style={{ marginRight: '8px' }} />
              <span>Browse All Campus Events</span>
            </Link>

            {isAuthenticated ? (
              <Link to={getDashboardPath()} className="btn btn-hero-secondary">
                <span>Go to Dashboard ({user?.role})</span>
              </Link>
            ) : (
              <Link to="/register" className="btn btn-hero-secondary">
                <span>Join as Club Organizer</span>
              </Link>
            )}
          </div>

          {/* Live Trust Metrics */}
          <div className="hero-stats-banner">
            <div className="stat-card">
              <div className="stat-value">13+</div>
              <div className="stat-label">Active PES Clubs</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-card">
              <div className="stat-value">₹0 – ₹499</div>
              <div className="stat-label">Student Passes</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-card">
              <div className="stat-value">100%</div>
              <div className="stat-label">ACID Seat Hold</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-card">
              <div className="stat-value">2</div>
              <div className="stat-label">Campuses (RR & EC)</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Featured & Trending Events Grid */}
      <section className="featured-section">
        <div className="container">
          <div className="featured-header-row">
            <div>
              <span className="section-eyebrow">Live on Campus</span>
              <h2 className="section-heading">Featured Events & Competitions</h2>
            </div>
            <Link to="/events" className="btn-link-action">
              <span>View All Events</span>
              <ArrowRightIcon style={{ marginLeft: '6px' }} />
            </Link>
          </div>

          {loading ? (
            <div className="loading-grid-skeleton">
              <div className="spinner-ring"></div>
              <p>Discovering PES campus events...</p>
            </div>
          ) : featuredEvents.length === 0 ? (
            <div className="empty-catalog-box card">
              <p>No active campus events found.</p>
              <Link to="/events/create" className="btn btn-primary" style={{ marginTop: '1rem' }}>
                Publish First Club Event
              </Link>
            </div>
          ) : (
            <div className="event-grid">
              {featuredEvents.map((event) => (
                <EventCard key={event._id} event={event} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. Aatmatrisha Spotlight Feature */}
      <section style={{ padding: '4rem 0', background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)', color: '#fff' }}>
        <div className="container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', alignItems: 'center' }}>
          <div>
            <span style={{ display: 'inline-block', background: 'rgba(236, 72, 153, 0.2)', color: '#f472b6', padding: '0.35rem 0.85rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1rem', border: '1px solid rgba(236, 72, 153, 0.4)' }}>
              🎉 Flagship Annual Fest Spotlight
            </span>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#fff', marginBottom: '1rem', lineHeight: 1.2 }}>
              Aatmatrisha 2026: Pro-Nite & Concerts
            </h2>
            <p style={{ color: '#cbd5e1', fontSize: '1.1rem', lineHeight: 1.7, marginBottom: '1.75rem' }}>
              The crown jewel of PES University cultural life. Experience two nights of celebrity performances, live DJ sets, inter-college choreography battles, stand-up comedy, and culinary street stalls at the Open Air Amphitheatre.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <Link to="/events?search=Aatmatrisha" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', padding: '0.85rem 1.75rem', borderRadius: '999px', fontSize: '1rem' }}>
                <span>Get Aatmatrisha Passes (₹499)</span>
                <ArrowRightIcon style={{ marginLeft: '8px' }} />
              </Link>
            </div>
          </div>

          <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 35px rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <img
              src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80"
              alt="Aatmatrisha Concert Arena"
              style={{ width: '100%', height: '340px', objectFit: 'cover', display: 'block' }}
            />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1.25rem', background: 'linear-gradient(180deg, transparent 0%, rgba(15,23,42,0.95) 100%)' }}>
              <span style={{ fontSize: '0.8rem', color: '#93c5fd', textTransform: 'uppercase', fontWeight: 700 }}>Venue</span>
              <h4 style={{ color: '#fff', margin: 0, fontSize: '1.1rem' }}>Open Air Amphitheatre & Quadrangle, RR Campus</h4>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Platform Value Pillars */}
      <section className="value-pillars-section">
        <div className="container">
          <div className="section-header-centered">
            <span className="section-eyebrow">Engineered for PES University</span>
            <h2 className="section-heading">Campus-Scale Software Engineering</h2>
            <p className="section-subheading">
              Designed with ACID concurrency guarantees to withstand flash-sale rush when fest registrations open.
            </p>
          </div>

          <div className="pillars-grid">
            <div className="pillar-card card">
              <div className="pillar-icon-box" style={{ background: '#e0e7ff', color: '#4f46e5' }}>
                <TicketIcon style={{ fontSize: '1.75rem' }} />
              </div>
              <h3>10-Min ACID Ticket Hold</h3>
              <p>
                MongoDB two-phase transactions reserve your seat for 10 minutes with zero double-booking, even under heavy flash-sale traffic.
              </p>
            </div>

            <div className="pillar-card card">
              <div className="pillar-icon-box" style={{ background: '#dcfce7', color: '#16a34a' }}>
                <ShieldCheckIcon style={{ fontSize: '1.75rem' }} />
              </div>
              <h3>INR Gateway & Student IDs</h3>
              <p>
                Seamless rupee pricing (₹), student SRN tracking, and tokenized payment verification with instant digital entry receipts.
              </p>
            </div>

            <div className="pillar-card card">
              <div className="pillar-icon-box" style={{ background: '#fef3c7', color: '#d97706' }}>
                <UsersIcon style={{ fontSize: '1.75rem' }} />
              </div>
              <h3>Club Organizer Portals</h3>
              <p>
                Club leads from Equinox, Aura, and Trance can manage capacity, view registrations in real-time, and export CSV attendee manifests with 1 click.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
