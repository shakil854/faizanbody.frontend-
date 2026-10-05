import React, { useState, useRef } from 'react';
import orderService, { getPhotoFullUrl } from '../../services/orderService';

export function OrderPhotosModal({ isOpen, onClose, order, onOrderUpdated }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [activePhotoIndex, setActivePhotoIndex] = useState(null); // For fullscreen preview
  const [deletingPhotoId, setDeletingPhotoId] = useState(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen || !order) return null;

  const photos = Array.isArray(order.photos) ? order.photos : [];
  // Latest photos first so newest photo is at the top
  const sortedPhotos = [...photos].reverse();

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadError('');

    try {
      const res = await orderService.uploadPhotos(order.id, files);
      if (res?.data && onOrderUpdated) {
        onOrderUpdated(res.data);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Photo upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this photo? (क्या आप वाकई यह फोटो हटाना चाहते हैं?)')) {
      return;
    }

    setDeletingPhotoId(photoId);
    try {
      const res = await orderService.deletePhoto(order.id, photoId);
      if (res?.data && onOrderUpdated) {
        onOrderUpdated(res.data);
      }
      if (activePhotoIndex !== null) {
        setActivePhotoIndex(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete photo');
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const handleDeleteAllPhotos = async () => {
    if (!photos || photos.length === 0) return;
    if (
      !window.confirm(
        `Are you sure you want to delete all ${photos.length} photos of this order? (क्या आप इस आर्डर की सभी ${photos.length} फोटो हटाना चाहते हैं?)`
      )
    ) {
      return;
    }

    setIsDeletingAll(true);
    try {
      const res = await orderService.deleteAllPhotos(order.id);
      if (res?.data && onOrderUpdated) {
        onOrderUpdated(res.data);
      }
      setActivePhotoIndex(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete all photos');
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <div className="order-photos-overlay" onClick={onClose}>
      <div className="order-photos-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="order-photos-header">
          <div className="photos-header-info">
            <div className="photos-header-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span>Work Photos ({photos.length})</span>
            </div>
            <h3
              className="photos-order-title"
              title={`${order.truck_chassis_no || order.order_no || 'Order'}${order.owner_name ? ` • ${order.owner_name}` : ''}`}
            >
              <span className="truck-no-title">{order.truck_chassis_no || order.order_no}</span>
              {order.owner_name && <span className="photos-owner-sub"> • {order.owner_name}</span>}
            </h3>
          </div>

          <button
            type="button"
            className="photos-close-btn"
            onClick={onClose}
            title="Close"
            aria-label="Close photos modal"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Upload Action Area */}
        <div className="order-photos-upload-area">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept="image/*"
            style={{ display: 'none' }}
          />

          <div className="order-photos-actions-row">
            <button
              type="button"
              className="photos-upload-trigger-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isDeletingAll}
            >
              {isUploading ? (
                <>
                  <span className="photos-spinner"></span>
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Upload</span>
                </>
              )}
            </button>

            {photos.length > 0 && (
              <button
                type="button"
                className="photos-delete-all-btn"
                onClick={handleDeleteAllPhotos}
                disabled={isDeletingAll || isUploading}
                title="Delete all photos for this order"
              >
                {isDeletingAll ? (
                  <span className="mini-spinner-danger"></span>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                    <span>Delete All</span>
                  </>
                )}
              </button>
            )}
          </div>

          {uploadError && <div className="photos-error-banner">{uploadError}</div>}
        </div>

        {/* Photos Grid Content */}
        <div className="order-photos-content">
          {sortedPhotos.length === 0 ? (
            <div className="order-photos-empty">
              <div className="empty-photo-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.6">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              <h4>No Photos Uploaded Yet</h4>
              <p>Work order progress ki photos upload karein taaki yaha preview aur record rahe.</p>
              <button
                type="button"
                className="btn-upload-first"
                onClick={() => fileInputRef.current?.click()}
              >
                + Select Photos
              </button>
            </div>
          ) : (
            <div className="order-photos-grid">
              {sortedPhotos.map((photo, index) => {
                const fullUrl = getPhotoFullUrl(photo.url);
                const isLatest = index === 0; // Newest photo is first at the top
                const uploadDate = photo.createdAt
                  ? new Date(photo.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '';

                return (
                  <div
                    key={photo.id || index}
                    className={`order-photo-card ${isLatest ? 'is-latest' : ''}`}
                    onClick={() => setActivePhotoIndex(index)}
                  >
                    <div className="photo-thumb-wrapper">
                      <img
                        src={fullUrl}
                        alt={photo.originalName || `Work photo ${index + 1}`}
                        className="photo-thumb-img"
                        loading="lazy"
                      />
                      
                      {/* Latest badge on top left */}
                      {isLatest && <span className="latest-photo-tag">Latest</span>}

                      {/* Delete button directly over the photo on top right */}
                      <button
                        type="button"
                        className="photo-card-delete-overlay-btn"
                        onClick={(e) => handleDeletePhoto(photo.id, e)}
                        disabled={deletingPhotoId === photo.id}
                        title="Delete this photo"
                        aria-label="Delete photo"
                      >
                        {deletingPhotoId === photo.id ? (
                          <span className="mini-spinner"></span>
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        )}
                      </button>

                      {/* Date badge directly over the photo at bottom */}
                      {uploadDate && (
                        <span className="photo-card-date-overlay">
                          {uploadDate}
                        </span>
                      )}

                      <div className="photo-card-overlay">
                        <span className="zoom-hint">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                            <line x1="11" y1="8" x2="11" y2="14" />
                            <line x1="8" y1="11" x2="14" y2="11" />
                          </svg>
                          View Full
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fullscreen Lightbox Preview */}
        {activePhotoIndex !== null && sortedPhotos[activePhotoIndex] && (
          <div className="order-photo-lightbox" onClick={() => setActivePhotoIndex(null)}>
            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="lightbox-close"
                onClick={() => setActivePhotoIndex(null)}
                title="Close Full View"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              {activePhotoIndex > 0 && (
                <button
                  type="button"
                  className="lightbox-nav-btn prev"
                  onClick={() => setActivePhotoIndex(activePhotoIndex - 1)}
                  title="Previous Photo"
                >
                  ‹
                </button>
              )}

              <div className="lightbox-image-holder">
                <img
                  src={getPhotoFullUrl(sortedPhotos[activePhotoIndex].url)}
                  alt={sortedPhotos[activePhotoIndex].originalName || 'Work photo full'}
                  className="lightbox-full-img"
                />
                <div className="lightbox-caption">
                  <span>Photo {activePhotoIndex + 1} of {sortedPhotos.length}</span>
                  {sortedPhotos[activePhotoIndex].createdAt && (
                    <span> • {new Date(sortedPhotos[activePhotoIndex].createdAt).toLocaleString('en-IN')}</span>
                  )}
                </div>
              </div>

              {activePhotoIndex < sortedPhotos.length - 1 && (
                <button
                  type="button"
                  className="lightbox-nav-btn next"
                  onClick={() => setActivePhotoIndex(activePhotoIndex + 1)}
                  title="Next Photo"
                >
                  ›
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OrderPhotosModal;
