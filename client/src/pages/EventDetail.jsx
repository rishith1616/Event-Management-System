/**
 * pages/EventDetail.jsx — Modern Detailed Event View Page
 * Authentic PES University Campus Events with Multi-Tier Tickets,
 * Phase Pricing, Opera House Multi-Level Seating & Bundle Support.
 */
import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getEventImage } from '../services/eventImages';
import {
  CalendarIcon,
  ClockIcon,
  LocationIcon,
  TicketIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  CheckCircleIcon,
  SparklesIcon,
  ArrowRightIcon,
} from '../components/Icons';

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTierIndex, setSelectedTierIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    const fetchEvent = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/events/${id}`);
        if (res.data && res.data.success) {
          setEvent(res.data.event);
        } else {
          setError('Event not found');
        }
      } catch (err) {
        console.error('Error fetching event details:', err);
        const message =
          err.response?.status === 404
            ? err.response?.data?.message || 'The requested event was not found or is no longer available.'
            : 'Failed to load event details. Please try again later.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchEvent();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="container detail-loading-container">
        <div className="modern-spinner-box" aria-busy="true">
          <div className="spinner-ring"></div>
          <p className="loading-text">Loading PES event experience...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="container" style={{ padding: '4rem 1rem' }}>
        <div className="empty-state-modern card">
          <div className="empty-icon-circle">⚠️</div>
          <h2>Event Unavailable</h2>
          <p>{error || 'The requested event could not be found.'}</p>
          <Link to="/events" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            ← Return to Event Catalog
          </Link>
        </div>
      </div>
    );
  }

  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const isSuspended = event.status === 'suspended' || event.isSuspended || event.organizer?.isSuspended;
  const imageUrl = getEventImage(event);

  // Tiers and pricing calculations
  const tiers = event.ticketTiers && event.ticketTiers.length > 0 ? event.ticketTiers : null;
  const activeTier = tiers ? tiers[selectedTierIndex] || tiers[0] : null;

  const currentUnitPrice = activeTier ? Number(activeTier.price) : Number(event.price || 0);
  const currentTotal = currentUnitPrice * quantity;
  const isCurrentFree = currentUnitPrice === 0;

  const totalCapacity = event.capacity || 100;
  const overallAvailable = Math.max(0, event.availableTickets ?? totalCapacity);
  const tierCapacity = activeTier?.capacity || totalCapacity;
  const tierAvailable = activeTier?.available !== undefined ? activeTier.available : overallAvailable;
  const isTierSoldOut = tierAvailable <= 0;
  const percentClaimed = Math.min(100, Math.round(((tierCapacity - tierAvailable) / tierCapacity) * 100));

  // Venue classification helpers
  const venueLower = (event.venue || '').toLowerCase();
  const isOperaHouse = venueLower.includes('opera');
  const isPESU52OrMRD = venueLower.includes('pesu 52') || venueLower.includes('mrd');
  const isGJBC = venueLower.includes('gjbc') || venueLower.includes('golden jubilee');
  const isAmphitheatre = venueLower.includes('amphitheatre');
  const isQuadrangle = venueLower.includes('quadrangle');
  const isAatmatrisha =
    (event.title || '').toLowerCase().includes('aatmatrisha') ||
    (event.description || '').toLowerCase().includes('aatmatrisha');

  const handleBookTickets = () => {
    if (!token && !localStorage.getItem('token')) {
      navigate('/login');
      return;
    }
    const tierParams = activeTier
      ? `&tierName=${encodeURIComponent(activeTier.name)}&tierPrice=${activeTier.price}&seatingLevel=${encodeURIComponent(activeTier.seatingLevel || '')}`
      : '';
    navigate(`/checkout?eventId=${id}&quantity=${quantity}${tierParams}`, {
      state: {
        eventId: id,
        event,
        quantity,
        tierName: activeTier?.name,
        tierPrice: activeTier?.price,
        seatingLevel: activeTier?.seatingLevel,
      },
    });
  };

  const handleQtyChange = (delta) => {
    const next = quantity + delta;
    const maxQty = Math.min(5, tierAvailable);
    if (next >= 1 && next <= maxQty) {
      setQuantity(next);
    }
  };

  return (
    <div className="event-detail-page">
      {/* Immersive Cover Banner */}
      <section className="detail-hero-banner" style={{ backgroundImage: `url(${imageUrl})` }}>
        <div className="detail-hero-overlay"></div>
        <div className="container detail-hero-content">
          <nav className="detail-breadcrumb" aria-label="Breadcrumb">
            <Link to="/events" className="breadcrumb-pill">
              ← Back to Catalog
            </Link>
            <span className="breadcrumb-separator">/</span>
            <span className="breadcrumb-current">{event.category}</span>
            {isAatmatrisha && (
              <>
                <span className="breadcrumb-separator">/</span>
                <span className="breadcrumb-fest-tag">Aatmatrisha 2026</span>
              </>
            )}
          </nav>

          <div className="detail-badges-row">
            <span className={`badge-pill badge-cat-${event.category?.toLowerCase() || 'other'}`}>
              {event.category}
            </span>
            <span className={`badge-pill ${isTierSoldOut ? 'badge-soldout-pill' : 'badge-active-pill'}`}>
              {isTierSoldOut ? 'Tier Sold Out' : 'Registration Open'}
            </span>
            {isCurrentFree && <span className="badge-pill badge-free-pill">Free Event</span>}
            {tiers && tiers.length > 1 && (
              <span className="badge-pill badge-tiers-pill">
                {tiers.length} Passes / Phases Available
              </span>
            )}
          </div>

          <h1 className="detail-hero-title">{event.title}</h1>

          <div className="detail-hero-meta">
            <div className="hero-meta-item">
              <CalendarIcon style={{ color: '#a5b4fc', fontSize: '1.25rem' }} />
              <div>
                <span className="hero-meta-label">Date & Time</span>
                <span className="hero-meta-val">{formattedDate} · {event.time}</span>
              </div>
            </div>

            <div className="hero-meta-item">
              <LocationIcon style={{ color: '#a5b4fc', fontSize: '1.25rem' }} />
              <div>
                <span className="hero-meta-label">Campus Venue</span>
                <span className="hero-meta-val">{event.venue}</span>
              </div>
            </div>

            {event.organizer && (
              <div className="hero-meta-item">
                <div className="organizer-avatar-mini">
                  {(event.organizer.name || event.organizer.email || 'P')[0].toUpperCase()}
                </div>
                <div>
                  <span className="hero-meta-label">Organized By</span>
                  <span className="hero-meta-val">{event.organizer.name || event.organizer.email}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Two-Column Content Grid */}
      <div className="container detail-body-layout">
        <div className="detail-columns-grid">
          {/* Left Column: Event Narrative, Tiers, Venue Guide */}
          <main className="detail-main-column">
            {isSuspended && (
              <div className="alert-suspended-box">
                <div className="alert-suspended-icon">🚫</div>
                <div>
                  <h3>Event Suspended by Platform Administration</h3>
                  <p>
                    This event or its organizer account has been temporarily placed on hold for policy verification.
                    Ticket bookings are disabled.
                  </p>
                </div>
              </div>
            )}

            {/* Ticket Tiers / Seating / Phase Selection Section */}
            {tiers && (
              <section className="detail-card card ticket-tiers-section">
                <div className="section-header-row">
                  <div>
                    <h2 className="section-title">Select Pass / Seating Tier</h2>
                    <p className="section-subtitle">
                      Choose your ticket category, early bird phase, seating level, or combo bundle.
                    </p>
                  </div>
                  <span className="tier-count-badge">{tiers.length} Tiers Available</span>
                </div>

                <div className="tiers-selection-grid">
                  {tiers.map((tier, idx) => {
                    const isSelected = selectedTierIndex === idx;
                    const tierSoldOut = tier.available !== undefined && tier.available <= 0;

                    return (
                      <div
                        key={idx}
                        className={`tier-select-card ${isSelected ? 'selected' : ''} ${tierSoldOut ? 'tier-disabled' : ''}`}
                        onClick={() => {
                          if (!tierSoldOut) setSelectedTierIndex(idx);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            if (!tierSoldOut) setSelectedTierIndex(idx);
                          }
                        }}
                      >
                        <div className="tier-card-top">
                          <div className="tier-radio-indicator">
                            <span className={`custom-radio-dot ${isSelected ? 'active' : ''}`}></span>
                          </div>

                          <div className="tier-header-info">
                            <div className="tier-badges-wrap">
                              {tier.phase && <span className="tier-pill-phase">{tier.phase}</span>}
                              {tier.seatingLevel && (
                                <span className="tier-pill-seating">{tier.seatingLevel}</span>
                              )}
                              {tier.name.toLowerCase().includes('bundle') && (
                                <span className="tier-pill-bundle">🔥 Fest Combo</span>
                              )}
                            </div>
                            <h3 className="tier-title">{tier.name}</h3>
                          </div>

                          <div className="tier-price-box">
                            {tier.price === 0 ? (
                              <span className="tier-price-free">FREE</span>
                            ) : (
                              <div className="tier-price-val">
                                <span className="tier-inr">₹</span>
                                <span className="tier-amount">{Number(tier.price).toLocaleString('en-IN')}</span>
                              </div>
                            )}
                            <span className="tier-availability-text">
                              {tierSoldOut ? 'Sold Out' : `${tier.available ?? tier.capacity} seats left`}
                            </span>
                          </div>
                        </div>

                        {tier.description && (
                          <p className="tier-desc-text">{tier.description}</p>
                        )}

                        {tier.perks && tier.perks.length > 0 && (
                          <div className="tier-perks-list">
                            {tier.perks.map((perk, pIdx) => (
                              <div key={pIdx} className="tier-perk-item">
                                <CheckCircleIcon style={{ color: '#10b981', fontSize: '0.95rem' }} />
                                <span>{perk}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* About Section */}
            <section className="detail-card card">
              <div className="section-header-row">
                <h2 className="section-title">About This Event</h2>
                <span className="section-tag">PES University Verified</span>
              </div>
              <div className="event-description-rich">
                {event.description.split('\n').map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            </section>

            {/* Special Venue Architecture & Facilities Guide */}
            {isOperaHouse && (
              <section className="detail-card card venue-spotlight-card">
                <div className="section-header-row">
                  <div>
                    <h2 className="section-title">🏛️ The Opera House Auditorium Guide</h2>
                    <p className="section-subtitle">
                      PES University's flagship 1,000+ seat performing arts complex built across 6 floors.
                    </p>
                  </div>
                  <span className="venue-highlight-badge">1,000+ Capacity · 6 Floors</span>
                </div>

                <div className="opera-house-levels-grid">
                  <div className={`level-box ${activeTier?.seatingLevel?.includes('Level 1') ? 'active-level' : ''}`}>
                    <div className="level-badge">Level 1</div>
                    <h4>Orchestra Ground Floor</h4>
                    <p>Ground-level direct stage proximity with studio-grade line array acoustic tuning.</p>
                  </div>
                  <div className={`level-box ${activeTier?.seatingLevel?.includes('Level 2') ? 'active-level' : ''}`}>
                    <div className="level-badge">Level 2</div>
                    <h4>Mezzanine Tier</h4>
                    <p>Elevated tier offering panoramic acoustic balance and unobstructed stage sightlines.</p>
                  </div>
                  <div className={`level-box ${activeTier?.seatingLevel?.includes('Level 3') ? 'active-level' : ''}`}>
                    <div className="level-badge">Level 3</div>
                    <h4>Balcony Amphitheatre</h4>
                    <p>Grand high-angle vantage point spanning the top floors of the 6-story auditorium.</p>
                  </div>
                </div>
              </section>
            )}

            {isPESU52OrMRD && (
              <section className="detail-card card venue-spotlight-card">
                <div className="section-header-row">
                  <div>
                    <h2 className="section-title">💻 Hackathon & Compute Facilities</h2>
                    <p className="section-subtitle">
                      PESU 52 & MRD Building 24-Hour Innovation Hub
                    </p>
                  </div>
                  <span className="venue-highlight-badge">24/7 Power & Gigabit LAN</span>
                </div>
                <div className="facility-pills-row">
                  <span className="facility-pill">⚡ Uninterrupted Backup Power</span>
                  <span className="facility-pill">🌐 Dedicated 10 Gbps Backbone</span>
                  <span className="facility-pill">☕ 24-Hour Cafeteria & Red Bull Stations</span>
                  <span className="facility-pill">👥 Dedicated Mentor Breakout Pods</span>
                </div>
              </section>
            )}

            {isGJBC && (
              <section className="detail-card card venue-spotlight-card">
                <div className="section-header-row">
                  <div>
                    <h2 className="section-title">🎓 Golden Jubilee Block (GJBC) Halls</h2>
                    <p className="section-subtitle">
                      Premier acoustic seminar amphitheaters B1 & B2 for keynotes and symposiums.
                    </p>
                  </div>
                  <span className="venue-highlight-badge">Dual 4K Laser Projection</span>
                </div>
                <div className="facility-pills-row">
                  <span className="facility-pill">🎙️ Shure Wireless Mic Array</span>
                  <span className="facility-pill">❄️ Central HVAC Climate Control</span>
                  <span className="facility-pill">📹 Multi-Camera Live Broadcast Ready</span>
                </div>
              </section>
            )}

            {isAmphitheatre && (
              <section className="detail-card card venue-spotlight-card">
                <div className="section-header-row">
                  <div>
                    <h2 className="section-title">🎸 Open Air Amphitheatre Arena</h2>
                    <p className="section-subtitle">
                      PES University's central festival venue for high-energy concerts and pro-nites.
                    </p>
                  </div>
                  <span className="venue-highlight-badge">2,500+ Festival Capacity</span>
                </div>
                <div className="facility-pills-row">
                  <span className="facility-pill">🔊 Heavy Touring PA & Subwoofers</span>
                  <span className="facility-pill">✨ DMX Intelligent Stage Lighting</span>
                  <span className="facility-pill">🛡️ PES Security & Medical First-Aid Post</span>
                </div>
              </section>
            )}

            {isQuadrangle && (
              <section className="detail-card card venue-spotlight-card">
                <div className="section-header-row">
                  <div>
                    <h2 className="section-title">🎪 Campus Quadrangle Hub</h2>
                    <p className="section-subtitle">
                      The open heart of PES campus for vibrant student club stalls, exhibitions, and photowalks.
                    </p>
                  </div>
                  <span className="venue-highlight-badge">Open Campus Square</span>
                </div>
                <div className="facility-pills-row">
                  <span className="facility-pill">🎨 Interactive Club Display Zones</span>
                  <span className="facility-pill">📸 Prime Natural Light Photography Area</span>
                  <span className="facility-pill">🍕 Food Truck & Snack Pop-Ups</span>
                </div>
              </section>
            )}

            {/* Event Experience Highlights */}
            <section className="detail-card card">
              <h2 className="section-title">Campus Experience Highlights</h2>
              <div className="experience-grid">
                <div className="exp-card">
                  <div className="exp-icon-box" style={{ background: '#e0e7ff', color: '#4338ca' }}>
                    <SparklesIcon />
                  </div>
                  <div>
                    <h4>Verified PES Club Host</h4>
                    <p>Official student council endorsed event with certified attendance and OD approval.</p>
                  </div>
                </div>

                <div className="exp-card">
                  <div className="exp-icon-box" style={{ background: '#dcfce7', color: '#15803d' }}>
                    <CheckCircleIcon />
                  </div>
                  <div>
                    <h4>Instant Digital Pass</h4>
                    <p>QR-coded digital ticket generated instantly with Apple/Google Wallet support.</p>
                  </div>
                </div>

                <div className="exp-card">
                  <div className="exp-icon-box" style={{ background: '#fef3c7', color: '#b45309' }}>
                    <TicketIcon />
                  </div>
                  <div>
                    <h4>10-Minute ACID Hold</h4>
                    <p>Temporary transactional locking guarantees your pass won't be oversold during checkout.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Venue & Location Details */}
            <section className="detail-card card">
              <h2 className="section-title">Venue & Campus Location</h2>
              <div className="venue-detail-box">
                <div className="venue-map-placeholder">
                  <LocationIcon style={{ fontSize: '2.5rem', color: '#6366f1', marginBottom: '8px' }} />
                  <span className="venue-pin-title">{event.venue}</span>
                  <span className="venue-pin-subtitle">PES University Campus</span>
                </div>
                <div className="venue-info-text">
                  <h3>{event.venue}</h3>
                  <p>
                    PES University, 100 Feet Ring Road, BSK III Stage, Bengaluru, Karnataka 560085.
                    Please arrive 15 minutes before <strong>{event.time}</strong> for security badge verification.
                  </p>
                </div>
              </div>
            </section>
          </main>

          {/* Right Column: Sticky Ticket Booking Sidebar */}
          <aside className="detail-sidebar-column">
            <div className="sticky-booking-card card">
              <div className="booking-header">
                <div className="ticket-tier-name">
                  {activeTier ? activeTier.name : 'General Admission'}
                </div>
                {activeTier?.seatingLevel && (
                  <div className="ticket-tier-sub">{activeTier.seatingLevel}</div>
                )}
                <div className="ticket-price-display">
                  {isCurrentFree ? (
                    <span className="price-free-large">FREE</span>
                  ) : (
                    <>
                      <span className="currency-sign">₹</span>
                      <span className="price-num">{currentUnitPrice.toLocaleString('en-IN')}</span>
                      <span className="price-unit">/ ticket</span>
                    </>
                  )}
                </div>
              </div>

              {/* Quantity Picker */}
              {!isTierSoldOut && !isSuspended && (
                <div className="booking-qty-box">
                  <div className="qty-label-row">
                    <span>Ticket Quantity:</span>
                    <strong>{quantity} {quantity === 1 ? 'Pass' : 'Passes'}</strong>
                  </div>
                  <div className="qty-controls">
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => handleQtyChange(-1)}
                      disabled={quantity <= 1}
                    >
                      –
                    </button>
                    <span className="qty-number">{quantity}</span>
                    <button
                      type="button"
                      className="qty-btn"
                      onClick={() => handleQtyChange(1)}
                      disabled={quantity >= Math.min(5, tierAvailable)}
                    >
                      +
                    </button>
                    <span className="qty-subtext">(Max 5 per order)</span>
                  </div>

                  {!isCurrentFree && (
                    <div className="qty-total-row">
                      <span>Total Price:</span>
                      <strong className="qty-total-val">₹{currentTotal.toLocaleString('en-IN')}</strong>
                    </div>
                  )}
                </div>
              )}

              {/* Progress & Availability */}
              <div className="booking-availability-block">
                <div className="availability-row">
                  <span className="avail-label">Capacity Status</span>
                  <span className={`avail-status ${isTierSoldOut ? 'text-soldout' : 'text-available'}`}>
                    {isTierSoldOut ? 'Sold Out' : `${tierAvailable} seats remaining`}
                  </span>
                </div>
                <div className="capacity-bar-track">
                  <div
                    className={`capacity-bar-fill ${isTierSoldOut ? 'fill-soldout' : ''}`}
                    style={{ width: `${percentClaimed}%` }}
                  ></div>
                </div>
                <span className="capacity-sub">{percentClaimed}% of {tierCapacity} seats claimed</span>
              </div>

              {/* Schedule Quick Info */}
              <div className="booking-meta-box">
                <div className="booking-meta-item">
                  <CalendarIcon style={{ color: '#6366f1', flexShrink: 0 }} />
                  <div>
                    <strong>Date:</strong> {formattedDate}
                  </div>
                </div>
                <div className="booking-meta-item">
                  <ClockIcon style={{ color: '#6366f1', flexShrink: 0 }} />
                  <div>
                    <strong>Time:</strong> {event.time}
                  </div>
                </div>
                <div className="booking-meta-item">
                  <LocationIcon style={{ color: '#6366f1', flexShrink: 0 }} />
                  <div>
                    <strong>Venue:</strong> {event.venue}
                  </div>
                </div>
              </div>

              {/* Booking CTA Button */}
              {isSuspended ? (
                <button type="button" className="btn btn-block btn-suspended-cta" disabled>
                  🚫 Booking Suspended
                </button>
              ) : (
                <button
                  type="button"
                  className={`btn btn-block btn-booking-cta ${isTierSoldOut ? 'btn-disabled' : 'btn-gradient-cta'}`}
                  disabled={isTierSoldOut}
                  onClick={handleBookTickets}
                >
                  <span>{isTierSoldOut ? 'Tier Sold Out' : 'Proceed to Checkout'}</span>
                  {!isTierSoldOut && <ArrowRightIcon style={{ marginLeft: '8px' }} />}
                </button>
              )}

              {/* Trust & Guarantee Badges */}
              <div className="booking-guarantees">
                <div className="guarantee-row">
                  <LockClosedIcon style={{ color: '#10b981' }} />
                  <span>256-Bit SSL Encrypted Checkout</span>
                </div>
                <div className="guarantee-row">
                  <ShieldCheckIcon style={{ color: '#6366f1' }} />
                  <span>10-Minute ACID Seat Hold Guarantee</span>
                </div>
                <div className="guarantee-row">
                  <CheckCircleIcon style={{ color: '#3b82f6' }} />
                  <span>Instant E-Ticket & Receipt Generation</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;