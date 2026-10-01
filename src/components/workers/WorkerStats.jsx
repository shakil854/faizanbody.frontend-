import React from 'react';

export function WorkerStats({ totalCount, activeCount, relievedCount, currentFilter, onFilterChange }) {
  return (
    <div className="worker-stats-container">
      {/* 1. Total Workers */}
      <button
        type="button"
        className={`stat-card ${currentFilter === 'all' ? 'active-filter' : ''}`}
        onClick={() => onFilterChange('all')}
        aria-label="Filter all workers"
      >
        <div className="stat-icon-wrapper total-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <div className="stat-content">
          <span className="stat-label">Total</span>
          <span className="stat-value">{totalCount}</span>
        </div>
      </button>

      {/* 2. Currently Working */}
      <button
        type="button"
        className={`stat-card ${currentFilter === 'active' ? 'active-filter' : ''}`}
        onClick={() => onFilterChange('active')}
        aria-label="Filter currently active workers"
      >
        <div className="stat-icon-wrapper active-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div className="stat-content">
          <span className="stat-label">Working</span>
          <span className="stat-value text-success">{activeCount}</span>
        </div>
      </button>

      {/* 3. Relieved / Left */}
      <button
        type="button"
        className={`stat-card ${currentFilter === 'relieved' ? 'active-filter' : ''}`}
        onClick={() => onFilterChange('relieved')}
        aria-label="Filter relieved workers"
      >
        <div className="stat-icon-wrapper relieved-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
            <line x1="4" y1="22" x2="4" y2="15" />
          </svg>
        </div>
        <div className="stat-content">
          <span className="stat-label">Relieved</span>
          <span className="stat-value text-warning">{relievedCount}</span>
        </div>
      </button>
    </div>
  );
}

export default WorkerStats;
