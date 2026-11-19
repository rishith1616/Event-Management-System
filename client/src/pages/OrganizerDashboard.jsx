/**
 * pages/OrganizerDashboard.jsx — Organizer landing page
 * Provides event organizers with event creation and management tools.
 */
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const OrganizerDashboard = () => {
  const { user } = useAuth();
  const [myEvents, setMyEvents] = useState([]);
  const [loading, setLoading] = useState(true);


  const [downloadingId, setDownloadingId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyEvents = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/events/my-events');
      if (res.data && res.data.events) {
        setMyEvents(res.data.events);
      }
    } catch (err) {
      console.error('Failed to load organizer events:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleDownloadManifest = async (eventId, eventTitle) => {
    try {
      setDownloadingId(eventId);
      let targetId = eventId;
      let res;
      try {
        res = await api.get(`/events/${targetId}/manifest`, {
          responseType: 'blob',
        });
      } catch (firstErr) {
        // If event was re-seeded with a new ID (e.g. freshly re-run test), refresh and retry seamlessly
        if (firstErr.response?.status === 404) {
          const freshRes = await api.get('/events/my-events');
          if (freshRes.data?.events) {
            setMyEvents(freshRes.data.events);
            const matched = freshRes.data.events.find(
              (e) => e.title === eventTitle || e._id === eventId
            );
            if (matched) {
              targetId = matched._id;
              res = await api.get(`/events/${targetId}/manifest`, {
                responseType: 'blob',
              });
            } else {
              throw firstErr;
            }
          } else {
            throw firstErr;
          }
        } else {
          throw firstErr;
        }
      }

      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      const safeTitle = (eventTitle || 'event').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.setAttribute('download', `attendee-manifest-${safeTitle}-${targetId.slice(-6)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download manifest:', err);
      let errMsg = 'Failed to download manifest.';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          if (parsed.message) errMsg = parsed.message;
        } catch (_) {}
      } else if (err.response?.data?.message) {
        errMsg = err.response.data.message;
      }
      alert(errMsg);
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    fetchMyEvents();
  }, [fetchMyEvents]);

  return (
    <div className="container dashboard">
      <header className="dashboard-header card">
        <h1>Organizer Dashboard</h1>
        <p className="welcome-message">
          Welcome, <strong>{user?.name}</strong>! You are logged in as an <strong>Organizer</strong>.
        </p>
      </header>

      <section className="dashboard-actions card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2>Event Management</h2>
            <p style={{ color: '#666', marginTop: '0.25rem' }}>
              Publish new conferences, meetups, hackathons, and workshops.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={fetchMyEvents}
              disabled={refreshing}
              className="btn btn-outline"
              style={{ padding: '0.55rem 1rem', fontSize: '0.9rem', cursor: 'pointer' }}
            >
              {refreshing ? 'Refreshing...' : '↻ Refresh'}
            </button>
            <Link to="/events/my-events" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              My Events List
            </Link>
            <Link to="/events/create" className="btn btn-success" style={{ textDecoration: 'none' }}>
              + Create New Event
            </Link>
          </div>
        </div>
      </section>

      <section className="dashboard-content card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Recent Events Overview</h2>
          <Link to="/events/my-events" style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: 500 }}>
            Manage All ({myEvents.length}) &rarr;
          </Link>
        </div>

        {loading ? (
          <p style={{ color: '#64748b' }}>Loading your events...</p>
        ) : myEvents.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {myEvents.slice(0, 4).map((evt) => (
              <div
                key={evt._id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  background: '#f8fafc',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: '#0f172a', marginBottom: '0.25rem' }}>
                    {evt.title}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
                    {new Date(evt.date).toLocaleDateString()} at {evt.time} &bull; {evt.venue}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span
                    className={`badge ${evt.status === 'published' ? 'badge-status-active' : 'badge-workshop'}`}
                    style={{ textTransform: 'uppercase', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                  >
                    {evt.status}
                  </span>
                  
                  <button
                    onClick={() => handleDownloadManifest(evt._id, evt.title)}
                    disabled={downloadingId === evt._id}
                    className="btn btn-sm"
                    style={{ backgroundColor: '#0284c7', color: '#fff', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                    title="Download attendee manifest CSV"
                  >
                    {downloadingId === evt._id ? 'Exporting...' : '📥 Manifest'}
                  </button>

                  <Link to={`/events/edit/${evt._id}`} className="btn btn-sm btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', textDecoration: 'none' }}>
                    Edit
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="placeholder-box" style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
            <p>No events published yet.</p>
            <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
              Click &ldquo;+ Create New Event&rdquo; above to publish your first event!
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default OrganizerDashboard;
