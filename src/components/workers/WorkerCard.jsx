import React from 'react';

/**
 * Format date string (YYYY-MM-DD) to friendly luxury format (e.g. 10 Jan 2025)
 */
function formatDisplayDate(dateStr) {
  if (!dateStr) return null;
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch (e) {
    return dateStr;
  }
}

export function WorkerCard({ worker, onEdit, onDelete }) {
  const getAvatarInitials = (name) => {
    if (!name) return 'W';
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const formattedComing = formatDisplayDate(worker.coming_date) || '—';
  const formattedGoing = formatDisplayDate(worker.going_date);

  return (
    <div className="worker-card luxury-worker-card">
      <div className="worker-card-header">
        <div className="worker-profile">
          <div className="worker-avatar luxury-avatar">
            <span className="avatar-initials">{getAvatarInitials(worker.name)}</span>
          </div>
          <div className="worker-meta">
            <h4 className="worker-name">{worker.name}</h4>
            <span className="worker-status-indicator">
              {!worker.going_date ? (
                <span className="active-dot-pill">
                  <span className="pulse-indicator"></span>
                  Active On Duty
                </span>
              ) : (
                <span className="relieved-dot-pill">
                  Relieved
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Card Actions */}
        <div className="card-actions">
          <button
            type="button"
            className="action-btn edit-btn"
            onClick={() => onEdit(worker)}
            title="Edit worker"
            aria-label={`Edit ${worker.name}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            type="button"
            className="action-btn delete-btn"
            onClick={() => onDelete(worker)}
            title="Delete worker"
            aria-label={`Delete ${worker.name}`}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        </div>
      </div>

      {/* Worker Dates Grid */}
      <div className="worker-dates-grid luxury-dates-grid">
        {/* Coming Date */}
        <div className="date-item coming-date-box">
          <div className="date-icon-circle coming-icon-bg">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="date-content">
            <span className="date-label">COMING DATE</span>
            <span className="date-value">{formattedComing}</span>
          </div>
        </div>

        {/* Going Date */}
        <div className="date-item going-date-box">
          <div className="date-icon-circle going-icon-bg">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="date-content">
            <span className="date-label">GOING DATE</span>
            <span className={`date-value ${!formattedGoing ? 'date-empty-val' : ''}`}>
              {formattedGoing || 'Present'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkerCard;
