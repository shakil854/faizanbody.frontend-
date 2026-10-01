import React from 'react';

export function WorkerSearchBar({ searchQuery, onSearchChange }) {
  return (
    <div className="search-pill-container luxury-search-wrap">
      <div className="search-pill-box">
        <span className="search-pill-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </span>
        <input
          type="text"
          className="search-pill-input"
          placeholder="Search worker by name..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          aria-label="Search worker by name"
        />
        {searchQuery && (
          <button
            type="button"
            className="search-pill-clear"
            onClick={() => onSearchChange('')}
            title="Clear search"
            aria-label="Clear search"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default WorkerSearchBar;
