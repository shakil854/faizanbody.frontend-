import React from 'react';
import { calculateOrderProgress } from './orderConstants';

export function OrderCard({ order, onOpen, onDelete }) {
  const { total, done, percentage } = calculateOrderProgress(order);
  const isCompleted = order.status === 'Completed' || (total > 0 && done === total);

  return (
    <div
      className={`worker-card order-card luxury-order-card ${isCompleted ? 'order-card-completed' : ''}`}
      onClick={() => onOpen(order)}
      role="button"
      tabIndex={0}
      title="Click to open work order form"
    >
      {/* Top Meta Line: Order No & Status */}
      <div className="order-card-header">
        <div className="order-no-group">
          <span className="order-tag-badge">Truck Order</span>
          <h4 className="order-no-text">{order.order_no || `WO-#${order.id}`}</h4>
        </div>
        <div className="order-status-group">
          <span className={`order-status-pill ${isCompleted ? 'status-pill-completed' : 'status-pill-progress'}`}>
            <span className={`status-pulse-dot ${isCompleted ? 'dot-completed' : 'dot-progress'}`}></span>
            {order.status || (isCompleted ? 'Completed' : 'In Progress')}
          </span>
        </div>
      </div>

      {/* Main Details: Truck / Owner / Contact */}
      <div className="order-card-body">
        <div className="order-primary-info">
          <div className="order-truck-badge">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 17h4V5H2v12h3" />
              <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" />
              <circle cx="7.5" cy="17.5" r="2.5" />
              <circle cx="17.5" cy="17.5" r="2.5" />
            </svg>
            <span className="truck-plate-number">{order.truck_chassis_no || 'N/A'}</span>
          </div>

          <div className="order-owner-details">
            <div className="order-owner-name">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="owner-title">{order.owner_name}</span>
            </div>
            {order.mobile_number && (
              <a href={`tel:${order.mobile_number}`} className="order-mobile-link" onClick={(e) => e.stopPropagation()}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                {order.mobile_number}
              </a>
            )}
          </div>
        </div>

        {/* Condition & Shade Info */}
        <div className="order-specs-grid">
          {order.condition_text && (
            <div className="order-spec-item">
              <span className="spec-label">Condition:</span>
              <span className="spec-value">{order.condition_text}</span>
            </div>
          )}
          {order.shade_no && (
            <div className="order-spec-item">
              <span className="spec-label">Shade No:</span>
              <span className="spec-value">{order.shade_no}</span>
            </div>
          )}
          {order.order_date && (
            <div className="order-spec-item">
              <span className="spec-label">Date:</span>
              <span className="spec-value">{order.order_date}</span>
            </div>
          )}
        </div>

        {/* Progress Bar for Completed Tasks */}
        <div className="order-progress-section">
          <div className="progress-label-row">
            <span className="progress-task-count">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Completed: <strong>{done}</strong> / {total} Tasks
            </span>
            <span className="progress-percent-badge">{percentage}%</span>
          </div>
          <div className="progress-track">
            <div
              className={`progress-fill ${percentage === 100 ? 'progress-fill-100' : ''}`}
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="order-card-actions" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="btn-order-action btn-view-sheet"
          onClick={() => onOpen(order)}
          title="Open work order form"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          Open Form
        </button>

        <button
          type="button"
          className="btn-order-action btn-delete-order"
          onClick={() => onDelete(order)}
          title="Delete Order"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Delete
        </button>
      </div>
    </div>
  );
}

export default OrderCard;
