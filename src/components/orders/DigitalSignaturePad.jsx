import React, { useRef, useState, useEffect, useCallback } from 'react';

/**
 * DigitalSignaturePad Component
 * 100% Mobile & Tablet App Responsive Touch Signature Pad.
 * Engineered specifically for Android / iOS WebView and Tablet usage:
 * - Direct non-passive touch listeners ({ passive: false }) preventing screen scroll/jitter
 * - High-DPR Retina/AMOLED anti-aliasing with quadratic curve smoothing
 * - Auto-preserves signature upon device rotation (Portrait <-> Landscape)
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
  const savedDataUrlRef = useRef(isImageValue ? value : '');

  // Keep savedDataUrlRef in sync when value changes externally
  useEffect(() => {
    if (isImageValue) {
      savedDataUrlRef.current = value;
      setHasDrawn(true);
    } else if (!value && mode === 'draw') {
      savedDataUrlRef.current = '';
      setHasDrawn(false);
    }
  }, [value, isImageValue, mode]);

  // Setup canvas size according to container dimensions & DPR
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width === 0) return;

    const dpr = Math.max(window.devicePixelRatio || 1, 2);
    const displayWidth = rect.width;
    // Responsive height: slightly taller on tablets for comfortable signing
    const isTablet = window.innerWidth >= 600 && window.innerWidth <= 1024;
    const displayHeight = isTablet ? 155 : 140;

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

    // Restore any existing signature image upon resize/orientation change
    const signatureToLoad = savedDataUrlRef.current || (isImageValue ? value : '');
    if (signatureToLoad) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.clearRect(0, 0, displayWidth, displayHeight);
        ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
        setHasDrawn(true);
      };
      img.src = signatureToLoad;
    }
  }, [isImageValue, value]);

  useEffect(() => {
    if (mode === 'draw') {
      setupCanvas();
    }
  }, [mode, setupCanvas]);

  // Orientation and window resize handler (preserves drawing without loss)
  useEffect(() => {
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (mode === 'draw') {
          setupCanvas();
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
      const coords = getCoordinates(e, canvas);
      lastPosRef.current = coords;

      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    };

    const drawMove = (e) => {
      if (!isDrawingRef.current) return;
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();

      const coords = getCoordinates(e, canvas);
      const prev = lastPosRef.current;

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

      try {
        const dataUrl = canvas.toDataURL('image/png');
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
    setHasDrawn(false);
    onChange('');
  };

  const handleSwitchToDraw = () => {
    setMode('draw');
    if (!isImageValue) {
      savedDataUrlRef.current = '';
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
