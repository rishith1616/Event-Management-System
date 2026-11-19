/**
 * pages/EventList.jsx — Public Event Browsing and Filtering Page
 * Allows users to search, filter by category/date, sort, and paginate through active events.
 */
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import EventCard from '../components/EventCard';
import FilterBar from '../components/FilterBar';
import { SearchIcon, SparklesIcon } from '../components/Icons';

const EventList = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize filters from searchParams
  const categoryParam = searchParams.get('category') || '';
  const searchParam = searchParams.get('search') || '';
  const sortParam = searchParams.get('sort') || 'date';
  const pageParam = parseInt(searchParams.get('page'), 10) || 1;

  const [filters, setFilters] = useState({
    search: searchParam,
    category: categoryParam,
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    sort: sortParam,
  });

  const [page, setPage] = useState(pageParam);
  const [events, setEvents] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sync state if URL search params change (e.g. clicking category pill on home)
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      search: searchParams.get('search') || '',
      category: searchParams.get('category') || '',
      sort: searchParams.get('sort') || 'date',
    }));
    setPage(parseInt(searchParams.get('page'), 10) || 1);
  }, [searchParams]);

  // Fetch events from API
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 12,
        sort: filters.sort,
      };

      if (filters.search) params.search = filters.search;
      if (filters.category && filters.category !== 'All') params.category = filters.category.toLowerCase();
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const res = await api.get('/events', { params });

      if (res.data && res.data.success) {
        setEvents(res.data.events || []);
        setTotalPages(res.data.totalPages || 1);
        setTotalCount(res.data.total || 0);
      } else {
        setEvents([]);
        setTotalPages(1);
        setTotalCount(0);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(err.response?.data?.message || 'Failed to load events. Please try again.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleApplyFilters = (newFilters) => {
    setPage(1);
    setFilters(newFilters);
    const nextParams = {};
    if (newFilters.search) nextParams.search = newFilters.search;
    if (newFilters.category && newFilters.category !== 'All') nextParams.category = newFilters.category;
    if (newFilters.startDate) nextParams.startDate = newFilters.startDate;
    if (newFilters.endDate) nextParams.endDate = newFilters.endDate;
    if (newFilters.sort && newFilters.sort !== 'date') nextParams.sort = newFilters.sort;
    setSearchParams(nextParams, { replace: true });
  };

  const handleClearFilters = () => {
    setPage(1);
    setFilters({
      search: '',
      category: '',
      startDate: '',
      endDate: '',
      sort: 'date',
    });
    setSearchParams({}, { replace: true });
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="event-list-page container">
      {/* Modern Catalog Header */}
      <header className="catalog-header-modern">
        <div className="catalog-header-text">
          <span className="section-eyebrow">
            <SparklesIcon style={{ marginRight: '6px' }} />
            Explore What's Happening
          </span>
          <h1 className="catalog-title">PES Campus Events & Club Workshops</h1>
          <p className="catalog-subtitle">
            Explore Aatmatrisha passes, technical hackathons, dance battles, rock concerts, and club orientations across RR and EC campuses.
          </p>
        </div>
      </header>

      {/* Filter and Search Bar */}
      <FilterBar
        initialFilters={filters}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
      />

      {/* Results Meta Header */}
      <div className="catalog-meta-bar">
        {!loading && (
          <p className="catalog-count-text">
            Showing <strong className="text-primary">{events.length}</strong> of <strong>{totalCount}</strong> published {totalCount === 1 ? 'event' : 'events'}
            {filters.category && filters.category !== 'All' && (
              <span className="active-filter-tag">in {filters.category}</span>
            )}
            {filters.search && (
              <span className="active-filter-tag">matching "{filters.search}"</span>
            )}
          </p>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="alert alert-error" role="alert">
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={fetchEvents} style={{ marginTop: '8px' }}>
            Retry Loading
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="catalog-loading-box" aria-busy="true">
          <div className="spinner-ring"></div>
          <p>Discovering upcoming events...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && events.length === 0 && (
        <div className="empty-catalog-state card">
          <div className="empty-icon-circle">
            <SearchIcon style={{ fontSize: '2rem', color: '#6366f1' }} />
          </div>
          <h3>No events match your criteria</h3>
          <p>Try adjusting your search keywords, clearing category filters, or selecting a broader date range.</p>
          <button className="btn btn-primary" onClick={handleClearFilters} style={{ marginTop: '1rem' }}>
            Reset All Filters
          </button>
        </div>
      )}

      {/* Event Grid */}
      {!loading && !error && events.length > 0 && (
        <div className="event-grid">
          {events.map((event) => (
            <EventCard key={event._id} event={event} />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && !error && totalPages > 1 && (
        <nav className="pagination-modern" aria-label="Pagination">
          <button
            className="btn btn-pagination-nav"
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
          >
            ← Previous
          </button>

          <div className="pagination-page-pills">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                className={`btn-page-pill ${pageNum === page ? 'pill-active' : ''}`}
                onClick={() => handlePageChange(pageNum)}
              >
                {pageNum}
              </button>
            ))}
          </div>

          <button
            className="btn btn-pagination-nav"
            disabled={page >= totalPages}
            onClick={() => handlePageChange(page + 1)}
          >
            Next →
          </button>
        </nav>
      )}
    </div>
  );
};

export default EventList;
