import React from 'react';
import { calculateOrderProgress } from './orderConstants';

export const OrderCard = React.memo(function OrderCard({ order, onOpen, onDelete }) {
  const { total, done, percentage } = calculateOrderProgress(order);
  const isCompleted = order.status === 'Completed' || (total > 0 && done === total);

  // Avatar initials from truck chassis number or owner name
  const getInitials = () => {
    if (order.truck_chassis_no) {
      const clean = order.truck_chassis_no.replace(/[^a-zA-Z0-9]/g, '');
      return clean.slice(0, 2).toUpperCase() || 'TR';
    }
    if (order.owner_name) {
      const parts = order.owner_name.trim().split(/\s+/);
      return parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : order.owner_name.slice(0, 2).toUpperCase();
    }
    return 'WO';
  };

  return (
    <div
      className={`worker-card luxury-worker-card ${isCompleted ? 'order-card-completed' : ''}`}
      onClick={() => onOpen(order)}
      role="button"
      tabIndex={0}
      title="Click to open work order form"
    >
      {/* Header Matching WorkerCard Header */}
      <div className="worker-card-header">
        <div className="worker-profile">
          <div
            className="worker-avatar luxury-avatar"
            style={{ background: 'linear-gradient(145deg, #1e3a8a 0%, #1d4ed8 60%, #2563eb 100%)' }}
          >
            <span className="avatar-initials">{getInitials()}</span>
          </div>
          <div className="worker-meta">
            <h4 className="worker-name">{order.truck_chassis_no || order.order_no || 'Truck Order'}</h4>
            <span className="worker-status-indicator">
              {isCompleted ? (
                <span className="relieved-dot-pill" style={{ color: '#059669', fontWeight: 700 }}>
                  <span className="pulse-indicator" style={{ background: '#059669', boxShadow: '0 0 0 2px rgba(5, 150, 105, 0.25)' }}></span>
                  Completed
                </span>
              ) : (
                <span className="active-dot-pill">
                  <span className="pulse-indicator"></span>
                  {order.status || 'In Progress'}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Action Buttons: Edit & Delete (Exact WorkerCard style) */}
        <div className="card-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="action-btn edit-btn"
            onClick={() => onOpen(order)}
            title="Edit / Open Order"
            aria-label={`Edit ${order.truck_chassis_no || 'order'}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            type="button"
            className="action-btn delete-btn"
            onClick={() => onDelete(order)}
            title="Delete Order"
            aria-label={`Delete ${order.truck_chassis_no || 'order'}`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </button>
        </div>
      </div>

      {/* Worker Dates Grid: Owner & Date */}
      <div className="worker-dates-grid luxury-dates-grid">
        {/* Owner */}
        <div className="date-item coming-date-box" title={`Owner: ${order.owner_name || 'N/A'}`}>
          <div className="date-icon-circle coming-icon-bg">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="date-content">
            <span className="date-label">OWNER</span>
            <span className="date-value" title={order.owner_name || '—'}>{order.owner_name || '—'}</span>
          </div>
        </div>

        {/* Date */}
        <div className="date-item going-date-box" title={`Date: ${order.order_date || 'N/A'}`}>
          <div className="date-icon-circle going-icon-bg">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="date-content">
            <span className="date-label">DATE</span>
            <span className="date-value" title={order.order_date || '—'}>{order.order_date || '—'}</span>
          </div>
        </div>
      </div>

      {/* Progress Strip */}
      <div className="order-compact-progress">
        <div className="order-compact-progress-meta">
          <span className="progress-task-text">Tasks: <strong>{done}</strong>/{total}</span>
          <span className="progress-task-pct">{percentage}%</span>
        </div>
        <div className="order-compact-progress-track">
          <div
            className={`order-compact-progress-fill ${percentage === 100 ? 'fill-green' : ''}`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
});

export default OrderCard;
