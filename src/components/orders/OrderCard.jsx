import React, { useState, useRef } from 'react';
import { calculateOrderProgress } from './orderConstants';
import orderService, { getPhotoFullUrl } from '../../services/orderService';
import { capturePhotoFromCamera, pickPhotosFromGallery } from '../../utils/nativeCamera';

export const OrderCard = React.memo(function OrderCard({
  order,
  onOpen,
  onDelete,
  onViewPhotos,
  onOrderUpdated,
}) {
  const { total, done } = calculateOrderProgress(order);
  const isCompleted = order.status === 'Completed' || (total > 0 && done === total);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const photos = Array.isArray(order.photos) ? order.photos : [];
  const latestPhoto = photos.length > 0 ? photos[photos.length - 1] : null;

  const formatPhotoDate = (photo) => {
    if (!photo) return '';
    if (photo.createdAt) {
      try {
        const d = new Date(photo.createdAt);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          });
        }
      } catch {}
    }
    const match = (photo.id || photo.key || '').match(/(\d{10,13})/);
    if (match) {
      try {
        const ts = Number(match[1]);
        const d = new Date(ts);
        if (!isNaN(d.getTime()) && d.getFullYear() > 2020) {
          return d.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          });
        }
      } catch {}
    }
    return '';
  };

  const latestPhotoDate = formatPhotoDate(latestPhoto);

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

  const uploadFileList = async (files) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const res = await orderService.uploadPhotos(order.id, files);
      if (res?.data && onOrderUpdated) {
        onOrderUpdated(res.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Photo upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleQuickUpload = async (e) => {
    const files = e.target.files;
    await uploadFileList(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleCameraTrigger = async (e) => {
    e.stopPropagation();
    try {
      const files = await capturePhotoFromCamera();
      if (files && files.length > 0) {
        await uploadFileList(files);
      }
    } catch {
      cameraInputRef.current?.click();
    }
  };

  const handleGalleryTrigger = async (e) => {
    e.stopPropagation();
    try {
      const files = await pickPhotosFromGallery();
      if (files && files.length > 0) {
        await uploadFileList(files);
      }
    } catch {
      fileInputRef.current?.click();
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
      {/* Hidden file input for quick card upload (Gallery) */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleQuickUpload}
        multiple
        accept="image/*"
        style={{ display: 'none' }}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Hidden file input for direct mobile camera click */}
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleQuickUpload}
        accept="image/*"
        capture="environment"
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

      {/* Work Photos Section (Cloudflare R2 Integration) */}
      <div className="order-card-photos-container" onClick={(e) => e.stopPropagation()}>
        {photos.length > 0 && latestPhoto ? (
          <div className="order-card-photo-box">
            {/* Latest Photo Preview Thumbnail */}
            <div
              className="order-card-latest-photo"
              onClick={() => onViewPhotos && onViewPhotos(order)}
              title="Click to view all photos"
              style={{
                height: '180px',
                maxHeight: '180px',
                width: '100%',
                position: 'relative',
                borderRadius: '12px',
                overflow: 'hidden',
                backgroundColor: '#0f172a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={getPhotoFullUrl(latestPhoto.url)}
                alt="Latest Work Progress"
                className="latest-photo-img"
                loading="lazy"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
              {isUploading && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.75)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    zIndex: 10,
                    backdropFilter: 'blur(2px)',
                  }}
                >
                  <span className="mini-card-spinner" style={{ width: '22px', height: '22px', borderWidth: '3px' }}></span>
                  <span>Uploading photo... (फोटो अपलोड हो रही है)</span>
                </div>
              )}
              <div
                className="latest-photo-badge"
                title={latestPhotoDate ? `Latest photo: ${latestPhotoDate}` : 'Latest Photo'}
              >
                <span className="live-dot"></span>
                <span>{latestPhotoDate || 'Latest Photo'}</span>
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

            {/* Bottom Actions: View More, Camera & Quick Upload */}
            <div className="order-card-photo-actions">
              <button
                type="button"
                className="btn-card-view-more"
                onClick={() => onViewPhotos && onViewPhotos(order)}
                title="View all photos in gallery"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <span>View ({photos.length})</span>
              </button>

              <button
                type="button"
                className="btn-card-camera"
                onClick={handleCameraTrigger}
                disabled={isUploading}
                title="Click photo from mobile camera"
              >
                {isUploading ? (
                  <>
                    <span className="mini-card-spinner"></span>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    <span>Camera</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn-card-quick-upload"
                onClick={handleGalleryTrigger}
                disabled={isUploading}
                title="Upload more photos from gallery"
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
          /* Empty Photos: Camera & Upload Triggers */
          <div className="order-card-empty-photo-box" onClick={(e) => e.stopPropagation()}>
            {isUploading ? (
              <div className="card-uploading-state">
                <span className="mini-card-spinner"></span>
                <span>Uploading photo to cloud...</span>
              </div>
            ) : (
              <div className="card-photo-cta-wrapper">
                <div className="card-photo-cta-header">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span>Work Progress Photos (फोटो)</span>
                </div>
                <div className="card-empty-photo-actions">
                  <button
                    type="button"
                    className="btn-empty-camera"
                    onClick={handleCameraTrigger}
                    title="Open Camera to Click Photo"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                      <circle cx="12" cy="13" r="4" />
                    </svg>
                    <span>Camera</span>
                  </button>

                  <button
                    type="button"
                    className="btn-empty-upload"
                    onClick={handleGalleryTrigger}
                    title="Upload from Gallery"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>Upload</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

export default OrderCard;
