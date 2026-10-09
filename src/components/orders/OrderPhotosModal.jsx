import React, { useState, useRef, useEffect } from 'react';
import orderService, { getPhotoFullUrl } from '../../services/orderService';
import { capturePhotoFromCamera, pickPhotosFromGallery } from '../../utils/nativeCamera';
import { sharePhoto } from '../../utils/photoShare';

export function OrderPhotosModal({ isOpen, onClose, order, onOrderUpdated }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [activePhotoIndex, setActivePhotoIndex] = useState(null); // For fullscreen preview
  const [sharingPhotoId, setSharingPhotoId] = useState(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const pinchStartDistRef = useRef(0);
  const pinchStartScaleRef = useRef(1);
  const lastTapTimeRef = useRef(0);

  const [deletingPhotoId, setDeletingPhotoId] = useState(null);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleCloseLightbox = () => {
    setActivePhotoIndex(null);
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleResetZoom = () => {
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleZoomIn = (e) => {
    e?.stopPropagation();
    setZoomScale((prev) => Math.min(Number((prev + 0.5).toFixed(1)), 4));
  };

  const handleZoomOut = (e) => {
    e?.stopPropagation();
    setZoomScale((prev) => {
      const next = Math.max(Number((prev - 0.5).toFixed(1)), 1);
      if (next === 1) setPanOffset({ x: 0, y: 0 });
      return next;
    });
  };

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (zoomScale > 1) {
      handleResetZoom();
    } else {
      setZoomScale(2);
      setPanOffset({ x: 0, y: 0 });
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoomScale((prev) => Math.min(Number((prev + 0.25).toFixed(2)), 4));
    } else {
      setZoomScale((prev) => {
        const next = Math.max(Number((prev - 0.25).toFixed(2)), 1);
        if (next === 1) setPanOffset({ x: 0, y: 0 });
        return next;
      });
    }
  };

  const handleMouseDown = (e) => {
    if (zoomScale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...panOffset };
  };

  const handleMouseMove = (e) => {
    if (!isDragging || zoomScale <= 1) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPanOffset({
      x: panStartRef.current.x + dx,
      y: panStartRef.current.y + dy,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      setIsPinching(true);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartDistRef.current = dist;
      pinchStartScaleRef.current = zoomScale;
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapTimeRef.current < 300) {
        handleDoubleClick(e);
        lastTapTimeRef.current = 0;
        return;
      }
      lastTapTimeRef.current = now;

      if (zoomScale > 1) {
        setIsDragging(true);
        dragStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        panStartRef.current = { ...panOffset };
      }
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && isPinching) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (pinchStartDistRef.current > 0) {
        const factor = dist / pinchStartDistRef.current;
        const newScale = Math.min(Math.max(pinchStartScaleRef.current * factor, 1), 4);
        setZoomScale(Number(newScale.toFixed(2)));
        if (newScale <= 1) {
          setPanOffset({ x: 0, y: 0 });
        }
      }
    } else if (e.touches.length === 1 && isDragging && zoomScale > 1) {
      e.preventDefault();
      const dx = e.touches[0].clientX - dragStartRef.current.x;
      const dy = e.touches[0].clientY - dragStartRef.current.y;
      setPanOffset({
        x: panStartRef.current.x + dx,
        y: panStartRef.current.y + dy,
      });
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) {
      setIsPinching(false);
    }
    if (e.touches.length === 0) {
      setIsDragging(false);
    }
  };

  if (!isOpen || !order) return null;

  const photos = Array.isArray(order.photos) ? order.photos : [];
  // Latest photos first so newest photo is at the top
  const sortedPhotos = [...photos].reverse();

  const uploadFileList = async (files) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    setUploadError('');
    try {
      const res = await orderService.uploadPhotos(order.id, files);
      if (res?.data && onOrderUpdated) {
        onOrderUpdated(res.data);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    } catch (err) {
      setUploadError(err.response?.data?.message || err.message || 'Photo upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e) => {
    const files = e.target.files;
    await uploadFileList(files);
  };

  const handleCameraTrigger = async () => {
    try {
      const files = await capturePhotoFromCamera();
      if (files && files.length > 0) {
        await uploadFileList(files);
      }
    } catch {
      cameraInputRef.current?.click();
    }
  };

  const handleGalleryTrigger = async () => {
    try {
      const files = await pickPhotosFromGallery();
      if (files && files.length > 0) {
        await uploadFileList(files);
      }
    } catch {
      fileInputRef.current?.click();
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

  const handleShareSinglePhoto = async (photo, e) => {
    e?.stopPropagation();
    if (!photo) return;
    try {
      setSharingPhotoId(photo.id || 'active');
      const url = getPhotoFullUrl(photo.url);
      await sharePhoto({
        photoUrl: url,
        truckNo: order.truck_chassis_no,
        shadeNo: order.shade_no,
        ownerName: order.owner_name,
      });
    } catch (err) {
      console.error('Failed to share photo:', err);
    } finally {
      setSharingPhotoId(null);
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
          {/* Direct Camera Input for Mobile & Capacitor */}
          <input
            type="file"
            ref={cameraInputRef}
            onChange={handleFileChange}
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
          />

          {/* Gallery / File Picker Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            accept="image/*"
            style={{ display: 'none' }}
          />

          <div className="order-photos-actions-row">
            {/* Direct Camera Button */}
            <button
              type="button"
              className="photos-camera-btn"
              onClick={handleCameraTrigger}
              disabled={isUploading || isDeletingAll}
              title="Click photo directly from camera"
            >
              {isUploading ? (
                <>
                  <span className="photos-spinner"></span>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <span>Camera</span>
                </>
              )}
            </button>

            {/* Gallery Upload Button */}
            <button
              type="button"
              className="photos-upload-trigger-btn"
              onClick={handleGalleryTrigger}
              disabled={isUploading || isDeletingAll}
              title="Upload photos from gallery"
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
                className="photos-share-latest-btn"
                onClick={() => handleShareSinglePhoto(sortedPhotos[0])}
                disabled={sharingPhotoId !== null}
                title="लेटेस्ट फोटो WhatsApp पर शेयर करें"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                <span>{sharingPhotoId ? 'Sharing...' : 'Share'}</span>
              </button>
            )}

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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
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

                      {/* WhatsApp Share button on photo */}
                      <button
                        type="button"
                        className="photo-card-share-overlay-btn"
                        onClick={(e) => handleShareSinglePhoto(photo, e)}
                        disabled={sharingPhotoId === photo.id}
                        title="यह फोटो WhatsApp पर शेयर करें"
                        aria-label="Share photo"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                        </svg>
                      </button>

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

        {/* Fullscreen Lightbox Preview with Zoom Controls & No Side Arrows */}
        {activePhotoIndex !== null && sortedPhotos[activePhotoIndex] && (
          <div className="order-photo-lightbox" onClick={handleCloseLightbox}>
            <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
              {/* Top Floating Controls Bar */}
              <div className="lightbox-top-bar">
                <div className="lightbox-zoom-toolbar">
                  <button
                    type="button"
                    className="lightbox-tool-btn"
                    onClick={handleZoomOut}
                    disabled={zoomScale <= 1}
                    title="Zoom Out (-)"
                    aria-label="Zoom out"
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      <line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    className="lightbox-zoom-level-badge"
                    onClick={handleResetZoom}
                    title="Click to reset (100%)"
                  >
                    {Math.round(zoomScale * 100)}%
                  </button>

                  <button
                    type="button"
                    className="lightbox-tool-btn"
                    onClick={handleZoomIn}
                    disabled={zoomScale >= 4}
                    title="Zoom In (+)"
                    aria-label="Zoom in"
                  >
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      <line x1="11" y1="8" x2="11" y2="14" />
                      <line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                  </button>

                  {zoomScale > 1 && (
                    <button
                      type="button"
                      className="lightbox-tool-btn reset-btn"
                      onClick={handleResetZoom}
                      title="Reset / Fit (100%)"
                      aria-label="Reset zoom"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                        <path d="M3 3v5h5" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="lightbox-right-tools" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* WhatsApp Share in Lightbox */}
                  <button
                    type="button"
                    className="lightbox-tool-btn share-btn"
                    onClick={() => handleShareSinglePhoto(sortedPhotos[activePhotoIndex])}
                    title="यह फोटो WhatsApp पर शेयर करें"
                    aria-label="Share photo"
                    style={{
                      background: '#16a34a',
                      color: '#ffffff',
                      borderColor: '#15803d',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '0 10px',
                      width: 'auto',
                      height: '34px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: 'none',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                    <span style={{ fontSize: '12px', fontWeight: 700 }}>WhatsApp</span>
                  </button>

                  {/* Close Button */}
                  <button
                    type="button"
                    className="lightbox-close"
                    onClick={handleCloseLightbox}
                    title="Close Full View"
                    aria-label="Close"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Zoomable & Pannable Image Stage (Double-tap, Pinch or Drag) */}
              <div
                className="lightbox-image-stage"
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onDoubleClick={handleDoubleClick}
                style={{
                  cursor: zoomScale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
                  touchAction: 'none',
                }}
              >
                <img
                  src={getPhotoFullUrl(sortedPhotos[activePhotoIndex].url)}
                  alt={sortedPhotos[activePhotoIndex].originalName || 'Work photo full'}
                  className="lightbox-full-img"
                  style={{
                    transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoomScale})`,
                    transition: isDragging || isPinching ? 'none' : 'transform 0.2s ease-out',
                    userSelect: 'none',
                    WebkitUserDrag: 'none',
                  }}
                  draggable={false}
                />
              </div>

              {/* Bottom Caption Pill */}
              <div className="lightbox-caption">
                <span>Photo {activePhotoIndex + 1} of {sortedPhotos.length}</span>
                {sortedPhotos[activePhotoIndex].createdAt && (
                  <span> • {new Date(sortedPhotos[activePhotoIndex].createdAt).toLocaleString('en-IN')}</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OrderPhotosModal;
