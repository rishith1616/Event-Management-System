/**
 * components/EventCard.jsx — Displays summary information for a single event
 * Shows title, date, venue, price, category badge, and available ticket count with a link to details.
 */
import { Link } from 'react-router-dom';

const EventCard = ({ event }) => {
  if (!event) return null;

  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const isSoldOut = event.availableTickets <= 0;
  const isFree = event.price === 0;

  return (
    <div className="event-card card" data-testid={`event-card-${event._id}`}>
      <div className="event-card-header">
        <span className={`badge badge-category badge-${event.category?.toLowerCase() || 'default'}`}>
          {event.category || 'General'}
        </span>
        <span className={`badge badge-price ${isFree ? 'badge-free' : ''}`}>
          {isFree ? 'Free' : `$${Number(event.price).toFixed(2)}`}
        </span>
      </div>

      <div className="event-card-body">
        <h3 className="event-card-title" title={event.title}>
          {event.title}
        </h3>

        <div className="event-card-meta">
          <div className="meta-item">
            <span className="meta-icon" aria-hidden="true">📅</span>
            <span>{formattedDate} {event.time ? `• ${event.time}` : ''}</span>
          </div>
          <div className="meta-item">
            <span className="meta-icon" aria-hidden="true">📍</span>
            <span className="meta-venue">{event.venue}</span>
          </div>
          <div className="meta-item">
            <span className="meta-icon" aria-hidden="true">🎟️</span>
            <span className={isSoldOut ? 'tickets-sold-out' : 'tickets-available'}>
              {isSoldOut ? 'Sold Out' : `${event.availableTickets} tickets remaining`}
            </span>
          </div>
        </div>

        {event.description && (
          <p className="event-card-desc">
            {event.description.length > 110
              ? `${event.description.substring(0, 110)}...`
              : event.description}
          </p>
        )}
      </div>

      <div className="event-card-footer">
        <Link to={`/events/${event._id}`} className="btn btn-primary btn-block">
          View Details
        </Link>
      </div>
    </div>
  );
};

export default EventCard;
