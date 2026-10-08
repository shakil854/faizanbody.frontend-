import React, { useRef, useState, useEffect, useCallback } from 'react';

/**
 * DigitalSignaturePad Component
 * 100% Mobile & Tablet App Responsive Touch Signature Pad.
 * Engineered specifically for Android / iOS WebView and Tablet usage:
 * - Natural letter-by-letter signing with ZERO zoom, jump, or stretch
 * - Direct non-passive touch listeners ({ passive: false }) preventing screen scroll/jitter
 * - High-DPR Retina/AMOLED anti-aliasing with quadratic curve smoothing
 * - Bounding-box crop only on export so database stays ultra-lightweight (~3KB - 5KB)
 * - Finger & Stylus (S-Pen / Apple Pencil) precision tracking
 * - 44px+ touch-friendly buttons for easy mobile tapping
 */
export function DigitalSignaturePad({
  label,
  value = '',
  onChange,
  placeholder = 'Sign here with finger / stylus',
  typePlaceholder = 'Type name...',
}) {
  const isImageValue = Boolean(
    value &&
    typeof value === 'string' &&
    (value.startsWith('data:image/') || value.startsWith('http') || value.startsWith('/'))
  );

  const [mode, setMode] = useState(isImageValue || !value ? 'draw' : 'type');
  const [hasDrawn, setHasDrawn] = useState(isImageValue);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const boundsRef = useRef(null);

  // Guards to prevent canvas re-clearing / zooming during live signing
  const isCanvasInitializedRef = useRef(false);
  const hasUserDrawnRef = useRef(false);
  const savedDataUrlRef = useRef(isImageValue ? value : '');

  // Setup canvas size according to container dimensions & DPR
  const setupCanvas = useCallback((forceReloadImage = false) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width === 0) return;

    const dpr = Math.max(window.devicePixelRatio || 1, 2);
    const displayWidth = rect.width;
    const isTablet = window.innerWidth >= 600 && window.innerWidth <= 1024;
    const displayHeight = isTablet ? 155 : 140;

    // Check if canvas dimensions actually need changing
    const needDimensionChange =
      canvas.width !== Math.floor(displayWidth * dpr) ||
      canvas.height !== Math.floor(displayHeight * dpr);

    if (needDimensionChange || !isCanvasInitializedRef.current) {
      // Save existing strokes if resizing
      let existingImgData = null;
      if (isCanvasInitializedRef.current && hasUserDrawnRef.current) {
        try {
          existingImgData = canvas.toDataURL('image/png');
        } catch {
          // ignore
        }
      }

      canvas.width = Math.floor(displayWidth * dpr);
      canvas.height = Math.floor(displayHeight * dpr);
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;

      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#0f172a'; // Deep ink color
      ctx.lineWidth = 2.6;

      isCanvasInitializedRef.current = true;

      // If user was already drawing and screen resized, preserve their live drawing
      if (existingImgData) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
        };
        img.src = existingImgData;
        return;
      }

      // Load initial saved signature image (only once on load or explicit mode switch)
      const initialImg = savedDataUrlRef.current || (isImageValue ? value : '');
      if (initialImg && (forceReloadImage || !hasUserDrawnRef.current)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.clearRect(0, 0, displayWidth, displayHeight);
          // Center and preserve aspect ratio cleanly
          const hRatio = displayWidth / img.width;
          const vRatio = displayHeight / img.height;
          const ratio = Math.min(hRatio, vRatio, 1);
          const drawW = img.width * ratio;
          const drawH = img.height * ratio;
          const posX = (displayWidth - drawW) / 2;
          const posY = (displayHeight - drawH) / 2;

          ctx.drawImage(img, posX, posY, drawW, drawH);
          setHasDrawn(true);
        };
        img.src = initialImg;
      }
    }
  }, [isImageValue, value]);

  // Initial mount setup
  useEffect(() => {
    if (mode === 'draw') {
      setupCanvas(false);
    }
  }, [mode, setupCanvas]);

  // Orientation and window resize handler
  useEffect(() => {
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (mode === 'draw') {
          setupCanvas(false);
        }
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [mode, setupCanvas]);

  // Accurate coordinate calculation supporting both Touch & Mouse
  const getCoordinates = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  // Direct native DOM event listeners with { passive: false } for mobile WebView
  useEffect(() => {
    if (mode !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    const startDrawing = (e) => {
      // Prevent mobile WebView gestures, scroll, and pull-to-refresh
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();

      isDrawingRef.current = true;
      hasUserDrawnRef.current = true;

      const coords = getCoordinates(e, canvas);
      lastPosRef.current = coords;

      if (!boundsRef.current) {
        boundsRef.current = { minX: coords.x, minY: coords.y, maxX: coords.x, maxY: coords.y };
      } else {
        boundsRef.current.minX = Math.min(boundsRef.current.minX, coords.x);
        boundsRef.current.minY = Math.min(boundsRef.current.minY, coords.y);
        boundsRef.current.maxX = Math.max(boundsRef.current.maxX, coords.x);
        boundsRef.current.maxY = Math.max(boundsRef.current.maxY, coords.y);
      }

      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    };

    const drawMove = (e) => {
      if (!isDrawingRef.current) return;
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();

      const coords = getCoordinates(e, canvas);
      const prev = lastPosRef.current;

      // Track bounding box for cropping later without disrupting live drawing
      if (boundsRef.current) {
        boundsRef.current.minX = Math.min(boundsRef.current.minX, coords.x);
        boundsRef.current.minY = Math.min(boundsRef.current.minY, coords.y);
        boundsRef.current.maxX = Math.max(boundsRef.current.maxX, coords.x);
        boundsRef.current.maxY = Math.max(boundsRef.current.maxY, coords.y);
      }

      // Smooth midpoint quadratic curve for realistic signature stroke
      const midX = (prev.x + coords.x) / 2;
      const midY = (prev.y + coords.y) / 2;

      ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
      ctx.stroke();

      lastPosRef.current = coords;
      setHasDrawn(true);
    };

    const stopDrawing = (e) => {
      if (!isDrawingRef.current) return;
      if (e && e.cancelable) e.preventDefault();
      isDrawingRef.current = false;

      // DO NOT clear or reload the canvas here!
      // All user strokes remain completely undisturbed on screen as they write letter-by-letter.
      try {
        const dpr = Math.max(window.devicePixelRatio || 1, 2);
        let dataUrl;

        // Auto-crop to bounds for the data payload so the database stays ultra-lightweight
        if (boundsRef.current && boundsRef.current.maxX > boundsRef.current.minX) {
          const padding = 12;
          const cropX = Math.max(0, (boundsRef.current.minX - padding) * dpr);
          const cropY = Math.max(0, (boundsRef.current.minY - padding) * dpr);
          const cropW = Math.min(canvas.width - cropX, (boundsRef.current.maxX - boundsRef.current.minX + padding * 2) * dpr);
          const cropH = Math.min(canvas.height - cropY, (boundsRef.current.maxY - boundsRef.current.minY + padding * 2) * dpr);

          const maxH = 100;
          const scale = cropH > maxH ? maxH / cropH : 1;
          const targetW = Math.max(1, Math.round(cropW * scale));
          const targetH = Math.max(1, Math.round(cropH * scale));

          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = targetW;
          cropCanvas.height = targetH;
          const cropCtx = cropCanvas.getContext('2d');
          cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);
          dataUrl = cropCanvas.toDataURL('image/png');
        } else {
          dataUrl = canvas.toDataURL('image/png');
        }

        savedDataUrlRef.current = dataUrl;
        onChange(dataUrl);
      } catch (err) {
        console.error('Failed to export signature image:', err);
      }
    };

    // Mobile Touch Listeners (Non-passive for zero screen scroll jitter)
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', drawMove, { passive: false });
    canvas.addEventListener('touchend', stopDrawing, { passive: false });
    canvas.addEventListener('touchcancel', stopDrawing, { passive: false });

    // Desktop & Stylus Pointer / Mouse Listeners
    canvas.addEventListener('pointerdown', startDrawing);
    canvas.addEventListener('pointermove', drawMove);
    canvas.addEventListener('pointerup', stopDrawing);
    canvas.addEventListener('pointercancel', stopDrawing);
    canvas.addEventListener('pointerleave', stopDrawing);

    return () => {
      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', drawMove);
      canvas.removeEventListener('touchend', stopDrawing);
      canvas.removeEventListener('touchcancel', stopDrawing);

      canvas.removeEventListener('pointerdown', startDrawing);
      canvas.removeEventListener('pointermove', drawMove);
      canvas.removeEventListener('pointerup', stopDrawing);
      canvas.removeEventListener('pointercancel', stopDrawing);
      canvas.removeEventListener('pointerleave', stopDrawing);
    };
  }, [mode, onChange]);

  // Clear Signature Handler
  const handleClear = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const dpr = Math.max(window.devicePixelRatio || 1, 2);
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    }

    savedDataUrlRef.current = '';
    boundsRef.current = null;
    hasUserDrawnRef.current = false;
    setHasDrawn(false);
    onChange('');
  };

  const handleSwitchToDraw = () => {
    setMode('draw');
    if (!isImageValue) {
      savedDataUrlRef.current = '';
      boundsRef.current = null;
      hasUserDrawnRef.current = false;
      setHasDrawn(false);
      onChange('');
    }
  };

  const handleSwitchToType = () => {
    setMode('type');
    if (isImageValue) {
      onChange('');
    }
  };

  return (
    <div className="digital-signature-field-container">
      {/* Field Header: Label & Mode Switcher */}
      <div className="sig-field-header">
        <label className="sig-field-label">
          {label}
          {hasDrawn || value ? (
            <span className="sig-recorded-tag">✓ Signed</span>
          ) : (
            <span className="sig-pending-tag">Pending</span>
          )}
        </label>

        <div className="sig-mode-pills">
          <button
            type="button"
            className={`sig-mode-pill ${mode === 'draw' ? 'active' : ''}`}
            onClick={handleSwitchToDraw}
            title="Sign with finger or stylus on mobile/tablet"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              <path d="M2 2l7.586 7.586" />
              <circle cx="11" cy="11" r="2" />
            </svg>
            Draw Sign
          </button>

          <button
            type="button"
            className={`sig-mode-pill ${mode === 'type' ? 'active' : ''}`}
            onClick={handleSwitchToType}
            title="Type name using keyboard"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 7 4 4 20 4 20 7" />
              <line x1="9" y1="20" x2="15" y2="20" />
              <line x1="12" y1="4" x2="12" y2="20" />
            </svg>
            Type
          </button>
        </div>
      </div>

      {/* DRAW MODE: Mobile Touch Canvas Pad */}
      {mode === 'draw' ? (
        <div className="sig-pad-wrapper" ref={containerRef}>
          <canvas
            ref={canvasRef}
            className="sig-pad-canvas"
          />

          {/* Dotted Signing Baseline Guide */}
          <div className="sig-baseline-guide" pointerEvents="none">
            <span className="sig-x-mark">✕</span>
            <div className="sig-baseline-line"></div>
          </div>

          {/* Watermark Instruction when empty */}
          {!hasDrawn && (
            <div className="sig-empty-watermark" pointerEvents="none">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
              <span>{placeholder}</span>
            </div>
          )}

          {/* Mobile-Friendly Clear Button */}
          <div className="sig-pad-actions-bar">
            {hasDrawn && (
              <button
                type="button"
                className="sig-action-btn sig-clear-btn"
                onClick={handleClear}
                title="Clear and sign again"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Clear
              </button>
            )}
          </div>
        </div>
      ) : (
        /* TYPE MODE: Text input */
        <div className="sig-input-box">
          <input
            type="text"
            className="sig-ctrl"
            placeholder={typePlaceholder}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
          />
          <div className="sig-line-draw"></div>
        </div>
      )}
    </div>
  );
}

export default DigitalSignaturePad;
