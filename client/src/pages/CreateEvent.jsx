/**
 * pages/CreateEvent.jsx — Event creation and editing form
 * Provides form controls, client-side validation (future date, capacity limit,
 * price, and required fields), draft saving, and instant publishing.
 */
import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../services/api';

const CATEGORIES = [
  { value: 'tech', label: 'Tech' },
  { value: 'music', label: 'Music' },
  { value: 'sports', label: 'Sports' },
  { value: 'business', label: 'Business' },
  { value: 'arts', label: 'Arts' },
  { value: 'food', label: 'Food' },
  { value: 'other', label: 'Other' },
];

function CreateEvent() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    venue: '',
    capacity: '',
    price: '0',
    category: 'other',
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditMode);

  // If in edit mode, fetch current event details
  useEffect(() => {
    if (!isEditMode) return;

    const fetchEvent = async () => {
      try {
        const res = await api.get(`/events/${id}`);
        const event = res.data.event;
        const formattedDate = event.date ? new Date(event.date).toISOString().split('T')[0] : '';
        setFormData({
          title: event.title || '',
          description: event.description || '',
          date: formattedDate,
          time: event.time || '',
          venue: event.venue || '',
          capacity: event.capacity !== undefined ? String(event.capacity) : '',
          price: event.price !== undefined ? String(event.price) : '0',
          category: event.category || 'other',
        });
      } catch (err) {
        setServerError(err.response?.data?.message || 'Failed to load event details for editing.');
      } finally {
        setInitialLoading(false);
      }
    };

    fetchEvent();
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field-specific validation error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Event title is required';
    }

    if (!formData.date) {
      newErrors.date = 'Event date is required';
    } else {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (isNaN(selectedDate.getTime()) || selectedDate <= today) {
        newErrors.date = 'Event date must be in the future';
      }
    }

    if (!formData.time.trim()) {
      newErrors.time = 'Event time is required';
    }

    if (!formData.venue.trim()) {
      newErrors.venue = 'Venue is required';
    }

    if (formData.capacity === '' || formData.capacity === null || formData.capacity === undefined) {
      newErrors.capacity = 'Capacity limit is required';
    } else {
      const parsedCap = Number(formData.capacity);
      if (isNaN(parsedCap) || parsedCap <= 0 || !Number.isInteger(parsedCap)) {
        newErrors.capacity = 'Capacity limit is required and must be a positive integer';
      }
    }

    if (formData.price === '' || formData.price === null || formData.price === undefined) {
      newErrors.price = 'Price is required';
    } else {
      const parsedPrice = Number(formData.price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        newErrors.price = 'Price must be non-negative';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submitForm = async (shouldPublish) => {
    setServerError('');
    if (!validate()) {
      return;
    }

    setLoading(true);

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      date: formData.date,
      time: formData.time.trim(),
      venue: formData.venue.trim(),
      capacity: Number(formData.capacity),
      price: Number(formData.price),
      category: formData.category,
    };

    try {
      if (isEditMode) {
        // Update event
        await api.put(`/events/${id}`, payload);
        if (shouldPublish) {
          await api.patch(`/events/${id}/publish`);
        }
      } else {
        // Create draft event
        const res = await api.post('/events', payload);
        const createdEventId = res.data.event?._id || res.data.event?.id;
        if (shouldPublish && createdEventId) {
          await api.patch(`/events/${createdEventId}/publish`);
        }
      }

      // Navigate to Organizer Dashboard / Events List
      navigate('/events/my-events');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'An error occurred while saving the event.';
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Min date string for date picker (tomorrow)
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  if (initialLoading) {
    return (
      <div className="container" style={{ padding: '2rem 1rem' }}>
        <p>Loading event details...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '720px', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>{isEditMode ? 'Edit Event' : 'Create New Event'}</h2>
        <Link to="/events/my-events" style={{ textDecoration: 'none', color: '#4f46e5', fontWeight: 500 }}>
          ← Back to My Events
        </Link>
      </div>

      {serverError && (
        <div
          role="alert"
          style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #f87171',
            color: '#b91c1c',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            marginBottom: '1rem',
          }}
        >
          {serverError}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitForm(false);
        }}
        className="card"
        noValidate
      >
        <div className="form-group">
          <label htmlFor="title">Event Title *</label>
          <input
            id="title"
            name="title"
            type="text"
            placeholder="e.g. Annual Tech Symposium 2026"
            value={formData.title}
            onChange={handleChange}
          />
          {errors.title && <div className="error-text">{errors.title}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            rows="4"
            placeholder="Provide a detailed overview of the event, speakers, schedule, etc."
            value={formData.description}
            onChange={handleChange}
          />
          {errors.description && <div className="error-text">{errors.description}</div>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label htmlFor="date">Date *</label>
            <input
              id="date"
              name="date"
              type="date"
              min={tomorrowStr}
              value={formData.date}
              onChange={handleChange}
            />
            {errors.date && <div className="error-text">{errors.date}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="time">Time *</label>
            <input
              id="time"
              name="time"
              type="text"
              placeholder="e.g. 10:00 AM or 18:00"
              value={formData.time}
              onChange={handleChange}
            />
            {errors.time && <div className="error-text">{errors.time}</div>}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="venue">Venue *</label>
          <input
            id="venue"
            name="venue"
            type="text"
            placeholder="e.g. Grand Auditorium, Hall B, or Online"
            value={formData.venue}
            onChange={handleChange}
          />
          {errors.venue && <div className="error-text">{errors.venue}</div>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label htmlFor="capacity">Capacity *</label>
            <input
              id="capacity"
              name="capacity"
              type="number"
              min="1"
              placeholder="e.g. 100"
              value={formData.capacity}
              onChange={handleChange}
            />
            {errors.capacity && <div className="error-text">{errors.capacity}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="price">Price ($) *</label>
            <input
              id="price"
              name="price"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={formData.price}
              onChange={handleChange}
            />
            {errors.price && <div className="error-text">{errors.price}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
            {errors.category && <div className="error-text">{errors.category}</div>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn"
            style={{ backgroundColor: '#e5e7eb', color: '#374151' }}
            onClick={() => navigate('/events/my-events')}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn"
            style={{ backgroundColor: '#4b5563', color: '#fff' }}
            onClick={() => submitForm(false)}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save as Draft'}
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => submitForm(true)}
            disabled={loading}
          >
            {loading ? 'Publishing...' : 'Publish Event'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateEvent;
