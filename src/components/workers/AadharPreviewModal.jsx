import React, { useState, useRef } from 'react';
import { getAadharFullUrl } from '../../services/workerService';

export function AadharPreviewModal({ isOpen, onClose, workerName, aadharUrl }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isPinching, setIsPinching] = useState(false);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const pinchStartDistRef = useRef(0);
  const pinchStartScaleRef = useRef(1);
  const lastTapTimeRef = useRef(0);

  if (!isOpen || !aadharUrl) return null;

  const fullImageUrl = getAadharFullUrl(aadharUrl);

  const handleCloseFullscreen = (e) => {
    e?.stopPropagation();
    setIsFullscreen(false);
    setZoomScale(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleResetZoom = (e) => {
    e?.stopPropagation();
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

  // 1. Fullscreen Native Touch Zoom Lightbox Mode (for Mobile App & Web)
  if (isFullscreen) {
    return (
      <div className="order-photo-lightbox" onClick={handleCloseFullscreen}>
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
                  title="Reset (100%)"
                  aria-label="Reset zoom"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                  </svg>
                </button>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              className="lightbox-close"
              onClick={handleCloseFullscreen}
              title="Close Full View"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Zoomable & Pannable Image Stage */}
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
              src={fullImageUrl}
              alt="Aadhar Card Full"
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

          {/* Bottom Caption Bar */}
          <div className="lightbox-caption">
            <span>{workerName ? `${workerName} - Aadhar Card` : 'Worker Aadhar Card'}</span>
            <span> • Double tap or pinch to zoom</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Android Dialog Mode
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="android-dialog luxury-dialog aadhar-preview-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Top Icon Badge */}
        <div className="dialog-icon-wrapper aadhar-dialog-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="3" />
            <circle cx="9" cy="10" r="2" />
            <path d="M15 8h2" />
            <path d="M15 12h2" />
            <path d="M7 16h10" />
          </svg>
        </div>

        {/* Dialog Header */}
        <h3 className="dialog-title">Aadhar Card Document</h3>
        <p className="dialog-message">
          {workerName ? `${workerName}'s verification document` : 'Worker identity verification card'}
        </p>

        {/* Image Preview Container (Tap to open full zoom) */}
        <div
          className="aadhar-modal-img-container"
          onClick={() => setIsFullscreen(true)}
          style={{ cursor: 'pointer', position: 'relative' }}
          title="Click to view full screen with zoom"
        >
          <img
            src={fullImageUrl}
            alt="Aadhar Card"
            className="aadhar-modal-img"
            loading="lazy"
          />
          <div className="aadhar-zoom-hint-pill">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
            <span>Tap for Full Zoom</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="dialog-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsFullscreen(true)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
            Fullscreen Zoom
          </button>
        </div>
      </div>
    </div>
  );
}

export default AadharPreviewModal;
