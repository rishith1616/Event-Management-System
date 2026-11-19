/**
 * components/FilterBar.jsx — Filter and search bar component
 * Provides UI controls for category, date range, keyword search, and sorting.
 */
import { useState, useEffect } from 'react';
import { SearchIcon, FilterIcon } from './Icons';

const CATEGORIES = [
  { id: 'All', label: 'All Categories' },
  { id: 'tech', label: 'Technology' },
  { id: 'music', label: 'Music & Concerts' },
  { id: 'sports', label: 'Sports' },
  { id: 'business', label: 'Business & Pitching' },
  { id: 'arts', label: 'Arts & Culture' },
  { id: 'food', label: 'Food & Culinary' },
  { id: 'other', label: 'Other' },
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

  const handleCategoryPillClick = (catId) => {
    setCategory(catId);
    onApplyFilters({
      search: search.trim(),
      category: catId === 'All' ? '' : catId,
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
    <div className="filter-bar-modern card">
      {/* Category Pills Bar for Instant Filtering */}
      <div className="filter-pills-scroll">
        {CATEGORIES.map((cat) => {
          const isSelected = category.toLowerCase() === cat.id.toLowerCase();
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryPillClick(cat.id)}
              className={`filter-category-pill ${isSelected ? 'pill-selected' : ''}`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="filter-form-modern" role="search" aria-label="Event filters">
        <div className="filter-grid-modern">
          {/* Search keyword input */}
          <div className="form-group-modern search-item-modern">
            <label htmlFor="filter-search">Search Event Catalog</label>
            <div className="search-box-wrapper">
              <SearchIcon className="search-field-icon" />
              <input
                id="filter-search"
                type="text"
                placeholder="Search by event title, speaker, or keywords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-with-icon"
              />
            </div>
          </div>

          {/* Start Date */}
          <div className="form-group-modern">
            <label htmlFor="filter-start-date">From Date</label>
            <input
              id="filter-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="modern-date-input"
            />
          </div>

          {/* End Date */}
          <div className="form-group-modern">
            <label htmlFor="filter-end-date">To Date</label>
            <input
              id="filter-end-date"
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="modern-date-input"
            />
          </div>

          {/* Sort dropdown */}
          <div className="form-group-modern">
            <label htmlFor="filter-sort">Sort Ordering</label>
            <select
              id="filter-sort"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="modern-select-input"
            >
              <option value="date">Date: Upcoming First</option>
              <option value="date-desc">Date: Latest First</option>
              <option value="price">Price: Free & Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="title">Title: Alphabetical (A–Z)</option>
              <option value="title-desc">Title: Reverse (Z–A)</option>
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div className="filter-actions-modern">
          <button type="button" className="btn btn-secondary-modern" onClick={handleClear}>
            Reset Filters
          </button>
          <button type="submit" className="btn btn-primary-modern">
            <FilterIcon style={{ marginRight: '6px' }} />
            <span>Apply Filters</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default FilterBar;
