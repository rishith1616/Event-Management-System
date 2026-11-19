import { Link } from 'react-router-dom';
import { BrandLogo, ShieldCheckIcon, TicketIcon, SparklesIcon } from './Icons';

const Footer = () => {
  return (
    <footer className="footer-modern">
      <div className="container footer-content">
        <div className="footer-grid">
          {/* Brand Info */}
          <div className="footer-brand-col">
            <Link to="/" className="footer-brand">
              <BrandLogo style={{ width: '32px', height: '32px' }} />
              <span className="brand-text">
                PES Event<span className="brand-gradient">Flow</span>
              </span>
            </Link>
            <p className="footer-desc">
              The official campus events platform for PES University. Powering ticket reservations, ACID holds, and club management across RR Campus & Electronic City Campus.
            </p>
            <div className="footer-status-pill">
              <span className="status-dot"></span>
              <span>PES Campus Production Node · All Systems Online</span>
            </div>
          </div>

          {/* Featured Clubs */}
          <div className="footer-col">
            <h4 className="footer-heading">PES Clubs & Fests</h4>
            <ul className="footer-links">
              <li><Link to="/events?search=Aatmatrisha">Aatmatrisha 2026</Link></li>
              <li><Link to="/events?search=Aura">Aura (AI & ML)</Link></li>
              <li><Link to="/events?search=Equinox">Equinox (Space Club)</Link></li>
              <li><Link to="/events?search=IEEE">IEEE Robotics Club</Link></li>
              <li><Link to="/events?search=Trance">Trance & Sanskriti Dance</Link></li>
              <li><Link to="/events?search=E-Cell">E-Cell & GCube GameDev</Link></li>
            </ul>
          </div>

          {/* Quick Access */}
          <div className="footer-col">
            <h4 className="footer-heading">Portals & Venues</h4>
            <ul className="footer-links">
              <li><Link to="/events">All Campus Events</Link></li>
              <li><Link to="/dashboard/attendee">Student Pass Wallet</Link></li>
              <li><Link to="/dashboard/organizer">Club Organizer Studio</Link></li>
              <li><Link to="/login">SRN / Email Sign In</Link></li>
              <li><span style={{ color: '#64748b' }}>MRD Auditorium (RR Campus)</span></li>
              <li><span style={{ color: '#64748b' }}>Open Air Amphitheatre</span></li>
            </ul>
          </div>

          {/* Architecture Highlights */}
          <div className="footer-col">
            <h4 className="footer-heading">Engineering Highlights</h4>
            <div className="architecture-features">
              <div className="arch-item">
                <TicketIcon style={{ color: '#818cf8', flexShrink: 0 }} />
                <span>NFR-03 ACID Mongo Transactions</span>
              </div>
              <div className="arch-item">
                <ShieldCheckIcon style={{ color: '#34d399', flexShrink: 0 }} />
                <span>NFR-02 Tokenized INR Checkout</span>
              </div>
              <div className="arch-item">
                <SparklesIcon style={{ color: '#fbbf24', flexShrink: 0 }} />
                <span>NFR-01 Flash-Sale Concurrency</span>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} PES EventFlow. PES University Software Engineering Mini-Project.</p>
          <div className="footer-meta">
            <span className="badge-tech">PES RR Campus</span>
            <span className="badge-tech">PES EC Campus</span>
            <span className="badge-tech">MERN Stack</span>
            <span className="badge-tech">INR Gateway</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
