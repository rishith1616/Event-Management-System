/**
 * components/EventCard.jsx — Displays summary information for a single event
 * Shows high-res category photography, title, date, venue, price, category badge,
 * capacity progress meter, and quick-action link to details.
 */
import { Link } from 'react-router-dom';
import { getEventImage } from '../services/eventImages';
import { CalendarIcon, ClockIcon, LocationIcon, TicketIcon, ArrowRightIcon } from './Icons';

const EventCard = ({ event }) => {
  if (!event) return null;

  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const monthShort = eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const dayNumber = eventDate.getDate();

  const isSoldOut = event.availableTickets <= 0;
  let isFree = event.price === 0;
  let priceDisplay = isFree ? 'FREE' : `₹${Number(event.price).toLocaleString('en-IN')}`;

  if (event.ticketTiers && event.ticketTiers.length > 0) {
    const prices = event.ticketTiers.map((t) => Number(t.price));
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    if (minPrice === 0 && maxPrice === 0) {
      priceDisplay = 'FREE';
      isFree = true;
    } else if (minPrice === 0) {
      priceDisplay = `Free – ₹${maxPrice.toLocaleString('en-IN')}`;
      isFree = false;
    } else if (minPrice === maxPrice) {
      priceDisplay = `₹${minPrice.toLocaleString('en-IN')}`;
      isFree = false;
    } else {
      priceDisplay = `₹${minPrice.toLocaleString('en-IN')} – ₹${maxPrice.toLocaleString('en-IN')}`;
      isFree = false;
    }
  }

  const imageUrl = getEventImage(event);
  const totalCapacity = event.capacity || 100;
  const available = Math.max(0, event.availableTickets ?? totalCapacity);
  const percentClaimed = Math.min(100, Math.round(((totalCapacity - available) / totalCapacity) * 100));

  return (
    <article className="event-card-modern" data-testid={`event-card-${event._id}`}>
      {/* Media & Thumbnail Area */}
      <div className="card-media-wrapper">
        <img
          src={imageUrl}
          alt={event.title}
          className="card-media-img"
          loading="lazy"
        />
        <div className="card-media-overlay"></div>

        {/* Top Floating Badges */}
        <div className="card-badges-top">
          <span className={`badge-pill badge-cat-${event.category?.toLowerCase() || 'other'}`}>
            {event.category || 'General'}
          </span>
          <span className={`badge-pill badge-price-pill ${isFree ? 'is-free' : ''}`}>
            {priceDisplay}
          </span>
        </div>

        {/* Bottom Floating Date Block */}
        <div className="card-date-ribbon">
          <span className="ribbon-month">{monthShort}</span>
          <span className="ribbon-day">{dayNumber}</span>
        </div>
      </div>

      {/* Card Content Area */}
      <div className="card-body-modern">
        <h3 className="card-title-modern" title={event.title}>
          <Link to={`/events/${event._id}`}>{event.title}</Link>
        </h3>

        <div className="card-meta-list">
          <div className="meta-row">
            <CalendarIcon className="meta-svg" />
            <span>{formattedDate} {event.time ? `• ${event.time}` : ''}</span>
          </div>

          <div className="meta-row">
            <LocationIcon className="meta-svg" />
            <span className="meta-venue-text" title={event.venue}>{event.venue}</span>
          </div>
        </div>

        {event.description && (
          <p className="card-excerpt">
            {event.description.length > 95
              ? `${event.description.substring(0, 95)}...`
              : event.description}
          </p>
        )}

        {/* Capacity / Availability Progress Bar */}
        <div className="card-capacity-box">
          <div className="capacity-label-row">
            <span className="capacity-text">
              <TicketIcon style={{ marginRight: '4px', verticalAlign: '-1px' }} />
              {isSoldOut ? (
                <strong className="text-soldout">Sold Out</strong>
              ) : (
                <><strong>{available}</strong> tickets left</>
              )}
            </span>
            <span className="capacity-percent">{percentClaimed}% booked</span>
          </div>
          <div className="capacity-bar-track">
            <div
              className={`capacity-bar-fill ${isSoldOut ? 'fill-soldout' : ''}`}
              style={{ width: `${percentClaimed}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Footer CTA */}
      <div className="card-footer-modern">
        <Link
          to={`/events/${event._id}`}
          className={`btn btn-card-action ${isSoldOut ? 'btn-view-only' : 'btn-book-action'}`}
        >
          <span>{isSoldOut ? 'View Event' : 'Get Tickets'}</span>
          <ArrowRightIcon style={{ marginLeft: '6px' }} />
        </Link>
      </div>
    </article>
  );
};

export default EventCard;
