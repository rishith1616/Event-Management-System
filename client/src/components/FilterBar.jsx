/**
 * components/FilterBar.jsx — Filter and search bar component
 * Provides UI controls for category, date range, keyword search, and sorting.
 */
import { useState, useEffect } from 'react';

const CATEGORIES = [
  'All',
  'Conference',
  'Workshop',
  'Concert',
  'Meetup',
  'Seminar',
  'Exhibition',
  'Sports',
  'Other',
];

const FilterBar = ({ initialFilters, onApplyFilters, onClearFilters }) => {
  const [search, setSearch] = useState(initialFilters?.search || '');
  const [category, setCategory] = useState(initialFilters?.category || 'All');
  const [startDate, setStartDate] = useState(initialFilters?.startDate || '');
  const [endDate, setEndDate] = useState(initialFilters?.endDate || '');
  const [sort, setSort] = useState(initialFilters?.sort || 'date');

  // Sync state if initialFilters changes
  useEffect(() => {
    if (initialFilters) {
      setSearch(initialFilters.search || '');
      setCategory(initialFilters.category || 'All');
      setStartDate(initialFilters.startDate || '');
      setEndDate(initialFilters.endDate || '');
      setSort(initialFilters.sort || 'date');
    }
  }, [initialFilters]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onApplyFilters({
      search: search.trim(),
      category: category === 'All' ? '' : category,
      startDate,
      endDate,
      sort,
    });
  };

  const handleClear = () => {
    setSearch('');
    setCategory('All');
    setStartDate('');
    setEndDate('');
    setSort('date');
    if (onClearFilters) {
      onClearFilters();
    }
  };

  return (
    <div className="filter-bar-container card">
      <form onSubmit={handleSubmit} className="filter-form" role="search" aria-label="Event filters">
        <div className="filter-grid">
          {/* Search keyword input */}
          <div className="form-group filter-item search-item">
            <label htmlFor="filter-search">Search Events</label>
            <input
              id="filter-search"
              type="text"
              placeholder="Search by title or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Category dropdown */}
          <div className="form-group filter-item">
            <label htmlFor="filter-category">Category</label>
            <select
              id="filter-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div className="form-group filter-item">
            <label htmlFor="filter-start-date">From Date</label>
            <input
              id="filter-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* End Date */}
          <div className="form-group filter-item">
            <label htmlFor="filter-end-date">To Date</label>
            <input
              id="filter-end-date"
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {/* Sort dropdown */}
          <div className="form-group filter-item">
            <label htmlFor="filter-sort">Sort By</label>
            <select
              id="filter-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="date">Date: Upcoming First</option>
              <option value="date-desc">Date: Latest First</option>
              <option value="price">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="title">Title: A to Z</option>
              <option value="title-desc">Title: Z to A</option>
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="filter-actions">
          <button type="submit" className="btn btn-primary">
            Apply Filters
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClear}
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
};

export default FilterBar;
