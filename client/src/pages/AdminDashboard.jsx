/**
 * pages/AdminDashboard.jsx — Platform Administrator Dashboard & Moderation Console
 * Implements FR-09: Platform Admin Suspensions for events and organizer accounts.
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('events'); // 'events' | 'users'
  const [actionLoading, setActionLoading] = useState({});
  const [notification, setNotification] = useState(null);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/overview');
      if (res.data && res.data.success) {
        setMetrics(res.data.metrics);
        setEvents(res.data.events || []);
        setUsers(res.data.users || []);
      }
    } catch (err) {
      console.error('Failed to load admin overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleToggleEventSuspension = async (event) => {
    const isCurrentlySuspended = event.status === 'suspended' || event.isSuspended;
    const action = isCurrentlySuspended ? 'reinstate' : 'suspend';

    let reason = 'Terms of service violation';
    if (!isCurrentlySuspended) {
      const promptReason = window.prompt(
        `Enter suspension reason for "${event.title}":`,
        'Violated terms of service and community guidelines'
      );
      if (promptReason === null) return; // user cancelled
      if (promptReason.trim()) reason = promptReason.trim();
    } else {
      if (!window.confirm(`Are you sure you want to reinstate "${event.title}" and restore ticket sales?`)) {
        return;
      }
    }

    try {
      setActionLoading((prev) => ({ ...prev, [`event_${event._id}`]: true }));
      const endpoint = isCurrentlySuspended
        ? `/admin/events/${event._id}/unsuspend`
        : `/admin/events/${event._id}/suspend`;

      const res = await api.patch(endpoint, { reason });
      if (res.data && res.data.success) {
        setNotification({
          type: 'success',
          message: res.data.message || `Event ${action}ed successfully!`,
        });
        await fetchOverview();
      }
    } catch (err) {
      console.error(`Failed to ${action} event:`, err);
      setNotification({
        type: 'error',
        message: err.response?.data?.message || `Failed to ${action} event.`,
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [`event_${event._id}`]: false }));
    }
  };

  const handleToggleUserSuspension = async (targetUser) => {
    const isCurrentlySuspended = targetUser.isSuspended;
    const action = isCurrentlySuspended ? 'reactivate' : 'suspend';

    let reason = 'Account suspended for policy violations';
    if (!isCurrentlySuspended) {
      const promptReason = window.prompt(
        `Enter suspension reason for "${targetUser.name}" (${targetUser.email}):`,
        'Abusive behavior and terms of service breach'
      );
      if (promptReason === null) return;
      if (promptReason.trim()) reason = promptReason.trim();
    } else {
      if (!window.confirm(`Reactivate account for ${targetUser.email}?`)) {
        return;
      }
    }

    try {
      setActionLoading((prev) => ({ ...prev, [`user_${targetUser._id}`]: true }));
      const endpoint = isCurrentlySuspended
        ? `/admin/users/${targetUser._id}/unsuspend`
        : `/admin/users/${targetUser._id}/suspend`;

      const res = await api.patch(endpoint, { reason });
      if (res.data && res.data.success) {
        setNotification({
          type: 'success',
          message: res.data.message || `User account ${action}ed successfully!`,
        });
        await fetchOverview();
      }
    } catch (err) {
      console.error(`Failed to ${action} user:`, err);
      setNotification({
        type: 'error',
        message: err.response?.data?.message || `Failed to ${action} user.`,
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [`user_${targetUser._id}`]: false }));
    }
  };

  return (
    <div className="container dashboard" style={{ padding: '2rem 1rem' }}>
      <header className="dashboard-header card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 700, margin: 0 }}>🛡️ Platform Admin Console</h1>
            <p className="welcome-message" style={{ margin: '0.25rem 0 0', color: '#64748b' }}>
              Welcome, <strong>{user?.name}</strong>! System governance, event moderation, and account suspension controls (FR-09).
            </p>
          </div>
          <button onClick={fetchOverview} className="btn" style={{ border: '1px solid #cbd5e1', background: '#fff' }}>
            🔄 Refresh Data
          </button>
        </div>
      </header>

      {/* KPI Overview Cards */}
      {metrics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ padding: '1.25rem', textAlign: 'center', borderLeft: '4px solid #4f46e5' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Total Users</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b' }}>{metrics.totalUsers}</div>
          </div>
          <div className="card" style={{ padding: '1.25rem', textAlign: 'center', borderLeft: '4px solid #0284c7' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Total Organizers</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0284c7' }}>{metrics.totalOrganizers}</div>
          </div>
          <div className="card" style={{ padding: '1.25rem', textAlign: 'center', borderLeft: '4px solid #16a34a' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Published Events</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#16a34a' }}>{metrics.publishedEventsCount}</div>
          </div>
          <div className="card" style={{ padding: '1.25rem', textAlign: 'center', borderLeft: '4px solid #ef4444' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Suspended Events</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ef4444' }}>{metrics.suspendedEventsCount}</div>
          </div>
          <div className="card" style={{ padding: '1.25rem', textAlign: 'center', borderLeft: '4px solid #f97316' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Suspended Accounts</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f97316' }}>{metrics.suspendedUsersCount}</div>
          </div>
        </div>
      )}

      {/* Notification banner */}
      {notification && (
        <div
          className={`alert alert-${notification.type}`}
          style={{
            padding: '1rem',
            borderRadius: '6px',
            marginBottom: '1.5rem',
            background: notification.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: notification.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${notification.type === 'success' ? '#86efac' : '#fca5a5'}`,
          }}
        >
          {notification.message}
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid #e2e8f0', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('events')}
          className="btn"
          style={{
            background: activeTab === 'events' ? '#4f46e5' : '#f1f5f9',
            color: activeTab === 'events' ? '#fff' : '#475569',
            fontWeight: 600,
            borderRadius: '6px 6px 0 0',
          }}
        >
          🎪 Event Moderation ({events.length})
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className="btn"
          style={{
            background: activeTab === 'users' ? '#4f46e5' : '#f1f5f9',
            color: activeTab === 'users' ? '#fff' : '#475569',
            fontWeight: 600,
            borderRadius: '6px 6px 0 0',
          }}
        >
          👥 User & Organizer Accounts ({users.length})
        </button>
      </div>

      {/* Events Moderation Table */}
      {activeTab === 'events' && (
        <section className="card" style={{ overflowX: 'auto' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Events Moderation Queue</h2>
          {loading ? (
            <p>Loading events...</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
                  <th style={{ padding: '0.75rem' }}>Event Title</th>
                  <th style={{ padding: '0.75rem' }}>Organizer</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem' }}>Tickets</th>
                  <th style={{ padding: '0.75rem' }}>Suspension Reason</th>
                  <th style={{ padding: '0.75rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {events.map((evt) => {
                  const isSusp = evt.status === 'suspended' || evt.isSuspended;
                  const isOrgSusp = evt.organizer?.isSuspended;

                  return (
                    <tr key={evt._id} style={{ borderBottom: '1px solid #f1f5f9', background: isSusp ? '#fef2f2' : 'transparent' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>{evt.title}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <div>{evt.organizer?.name || 'Unknown'}</div>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{evt.organizer?.email}</span>
                        {isOrgSusp && <span className="badge" style={{ marginLeft: '0.5rem', background: '#ef4444', color: '#fff', fontSize: '0.7rem' }}>Org Suspended</span>}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {isSusp ? (
                          <span className="badge" style={{ background: '#ef4444', color: '#fff' }}>Suspended</span>
                        ) : evt.status === 'published' ? (
                          <span className="badge" style={{ background: '#16a34a', color: '#fff' }}>Published</span>
                        ) : (
                          <span className="badge" style={{ background: '#f59e0b', color: '#fff' }}>{evt.status}</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem' }}>{evt.availableTickets ?? evt.capacity} / {evt.capacity}</td>
                      <td style={{ padding: '0.75rem', color: '#ef4444', fontSize: '0.85rem' }}>
                        {evt.suspensionReason || '—'}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <button
                          onClick={() => handleToggleEventSuspension(evt)}
                          disabled={actionLoading[`event_${evt._id}`]}
                          className="btn"
                          style={{
                            background: isSusp ? '#16a34a' : '#ef4444',
                            color: '#fff',
                            fontSize: '0.8rem',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          {actionLoading[`event_${evt._id}`]
                            ? 'Processing...'
                            : isSusp
                            ? '✅ Reinstate Event'
                            : '🚫 Suspend Event'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* Users Moderation Table */}
      {activeTab === 'users' && (
        <section className="card" style={{ overflowX: 'auto' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>User & Organizer Accounts Moderation</h2>
          {loading ? (
            <p>Loading users...</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
                  <th style={{ padding: '0.75rem' }}>Name</th>
                  <th style={{ padding: '0.75rem' }}>Email</th>
                  <th style={{ padding: '0.75rem' }}>Role</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem' }}>Suspension Reason</th>
                  <th style={{ padding: '0.75rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSusp = u.isSuspended;
                  const isAdmin = u.role === 'admin';

                  return (
                    <tr key={u._id} style={{ borderBottom: '1px solid #f1f5f9', background: isSusp ? '#fef2f2' : 'transparent' }}>
                      <td style={{ padding: '0.75rem', fontWeight: 600 }}>{u.name}</td>
                      <td style={{ padding: '0.75rem' }}>{u.email}</td>
                      <td style={{ padding: '0.75rem' }}>
                        <span className="badge" style={{ background: u.role === 'admin' ? '#4f46e5' : u.role === 'organizer' ? '#0284c7' : '#64748b', color: '#fff' }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {isSusp ? (
                          <span className="badge" style={{ background: '#ef4444', color: '#fff' }}>Suspended</span>
                        ) : (
                          <span className="badge" style={{ background: '#16a34a', color: '#fff' }}>Active</span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem', color: '#ef4444', fontSize: '0.85rem' }}>
                        {u.suspensionReason || '—'}
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        {isAdmin ? (
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Protected Admin</span>
                        ) : (
                          <button
                            onClick={() => handleToggleUserSuspension(u)}
                            disabled={actionLoading[`user_${u._id}`]}
                            className="btn"
                            style={{
                              background: isSusp ? '#16a34a' : '#ef4444',
                              color: '#fff',
                              fontSize: '0.8rem',
                              padding: '0.4rem 0.8rem',
                              borderRadius: '4px',
                              cursor: 'pointer',
                            }}
                          >
                            {actionLoading[`user_${u._id}`]
                              ? 'Processing...'
                              : isSusp
                              ? '✅ Reactivate'
                              : '🚫 Suspend Account'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      )}
    </div>
  );
};

export default AdminDashboard;
