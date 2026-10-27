/**
 * pages/EventList.jsx — Public Event Browsing and Filtering Page
 * Allows users to search, filter by category/date, sort, and paginate through active events.
 */
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import EventCard from '../components/EventCard';
import FilterBar from '../components/FilterBar';

const EventList = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize filters from searchParams or defaults
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    sort: searchParams.get('sort') || 'date',
  });

  const [page, setPage] = useState(parseInt(searchParams.get('page'), 10) || 1);
  const [events, setEvents] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      if (filters.category && filters.category !== 'All') params.category = filters.category;
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

  // Trigger fetch when filters or page change
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Update query params in URL
  useEffect(() => {
    const nextParams = {};
    if (filters.search) nextParams.search = filters.search;
    if (filters.category && filters.category !== 'All') nextParams.category = filters.category;
    if (filters.startDate) nextParams.startDate = filters.startDate;
    if (filters.endDate) nextParams.endDate = filters.endDate;
    if (filters.sort && filters.sort !== 'date') nextParams.sort = filters.sort;
    if (page > 1) nextParams.page = page.toString();

    setSearchParams(nextParams, { replace: true });
  }, [filters, page, setSearchParams]);

  const handleApplyFilters = (newFilters) => {
    setPage(1); // Reset to first page upon applying new filter
    setFilters(newFilters);
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
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="event-list-page container">
      <header className="page-header">
        <h1>Discover Events</h1>
        <p className="page-subtitle">
          Find and book tickets for upcoming conferences, workshops, concerts, and more.
        </p>
      </header>

      {/* Filter and Search Bar */}
      <FilterBar
        initialFilters={filters}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
      />

      {/* Results Header */}
      <div className="results-header">
        {!loading && (
          <p className="results-count">
            Showing <strong>{events.length}</strong> of <strong>{totalCount}</strong> upcoming {totalCount === 1 ? 'event' : 'events'}
          </p>
        )}
      </div>

      {/* Error State */}
      {error && (
        <div className="alert alert-error" role="alert">
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={fetchEvents}>
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="loading-state" aria-busy="true">
          <div className="spinner"></div>
          <p>Loading upcoming events...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && events.length === 0 && (
        <div className="empty-state card">
          <div className="empty-state-icon">🔍</div>
          <h3>No events found</h3>
          <p>We couldn't find any active events matching your filter criteria.</p>
          <button className="btn btn-primary" onClick={handleClearFilters}>
            Clear Filters
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
        <nav className="pagination-container" aria-label="Pagination">
          <button
            className="btn btn-pagination"
            disabled={page <= 1}
            onClick={() => handlePageChange(page - 1)}
            aria-label="Previous page"
          >
            ← Previous
          </button>

          <div className="pagination-pages">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
              // Only render nearby pages for clean pagination UI
              if (
                pageNum === 1 ||
                pageNum === totalPages ||
                (pageNum >= page - 2 && pageNum <= page + 2)
              ) {
                return (
                  <button
                    key={pageNum}
                    className={`btn-page-number ${pageNum === page ? 'active' : ''}`}
                    onClick={() => handlePageChange(pageNum)}
                    aria-current={pageNum === page ? 'page' : undefined}
                  >
                    {pageNum}
                  </button>
                );
              }
              if (
                (pageNum === page - 3 && pageNum > 1) ||
                (pageNum === page + 3 && pageNum < totalPages)
              ) {
                return <span key={pageNum} className="pagination-ellipsis">...</span>;
              }
              return null;
            })}
          </div>

          <button
            className="btn btn-pagination"
            disabled={page >= totalPages}
            onClick={() => handlePageChange(page + 1)}
            aria-label="Next page"
          >
            Next →
          </button>
        </nav>
      )}
    </div>
  );
};

export default EventList;
