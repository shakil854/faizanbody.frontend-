import React, { useState, useRef } from 'react';
import { calculateOrderProgress } from './orderConstants';
import orderService, { getPhotoFullUrl } from '../../services/orderService';

export const OrderCard = React.memo(function OrderCard({
  order,
  onOpen,
  onDelete,
  onViewPhotos,
  onOrderUpdated,
}) {
  const { total, done, percentage } = calculateOrderProgress(order);
  const isCompleted = order.status === 'Completed' || (total > 0 && done === total);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const photos = Array.isArray(order.photos) ? order.photos : [];
  const latestPhoto = photos.length > 0 ? photos[photos.length - 1] : null;

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

  const handleQuickUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const res = await orderService.uploadPhotos(order.id, files);
      if (res?.data && onOrderUpdated) {
        onOrderUpdated(res.data);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Photo upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className={`worker-card luxury-worker-card ${isCompleted ? 'order-card-completed' : ''}`}
      onClick={() => onOpen(order)}
      role="button"
      tabIndex={0}
      title="Click to open work order form"
    >
      {/* Hidden file input for quick card upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleQuickUpload}
        multiple
        accept="image/*"
        style={{ display: 'none' }}
        onClick={(e) => e.stopPropagation()}
      />

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

      {/* Work Photos Section (Cloudflare R2 Integration) */}
      <div className="order-card-photos-container" onClick={(e) => e.stopPropagation()}>
        {photos.length > 0 && latestPhoto ? (
          <div className="order-card-photo-box">
            {/* Latest Photo Preview Thumbnail */}
            <div
              className="order-card-latest-photo"
              onClick={() => onViewPhotos && onViewPhotos(order)}
              title="Click to view all photos"
            >
              <img
                src={getPhotoFullUrl(latestPhoto.url)}
                alt="Latest Work Progress"
                className="latest-photo-img"
                loading="lazy"
              />
              <div className="latest-photo-badge">
                <span className="live-dot"></span>
                <span>Latest Photo</span>
              </div>
              <div className="photo-count-pill">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>{photos.length}</span>
              </div>
            </div>

            {/* Bottom Actions: View More & Quick Upload */}
            <div className="order-card-photo-actions">
              <button
                type="button"
                className="btn-card-view-more"
                onClick={() => onViewPhotos && onViewPhotos(order)}
                title="View all photos in gallery"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span>View More ({photos.length})</span>
              </button>

              <button
                type="button"
                className="btn-card-quick-upload"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                title="Upload more photos"
              >
                {isUploading ? (
                  <span className="mini-card-spinner"></span>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Upload</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Empty Photos Upload Trigger */
          <div
            className="order-card-empty-photo-trigger"
            onClick={() => fileInputRef.current?.click()}
            title="Click to upload work order progress photos"
          >
            {isUploading ? (
              <div className="card-uploading-state">
                <span className="mini-card-spinner"></span>
                <span>Uploading photo to cloud...</span>
              </div>
            ) : (
              <div className="card-empty-photo-content">
                <div className="card-camera-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                </div>
                <span className="empty-photo-text">+ Upload Progress Photos (फोटो डालें)</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default OrderCard;
