import React, { useRef, useState, useEffect, useCallback } from 'react';

/**
 * Scan canvas pixels to find precise bounding box of drawn ink.
 * Sub-millisecond execution via 2px stepping.
 */
function getCanvasBoundingBox(ctx, width, height) {
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;
    let minX = width, minY = height, maxX = 0, maxY = 0;
    let found = false;

    for (let y = 0; y < height; y += 2) {
      const rowOffset = y * width;
      for (let x = 0; x < width; x += 2) {
        const alpha = data[(rowOffset + x) * 4 + 3];
        if (alpha > 20) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          found = true;
        }
      }
    }

    if (!found) return null;
    return { minX, minY, maxX, maxY };
  } catch {
    return null;
  }
}

/**
 * DigitalSignaturePad Component
 * 100% Mobile & Tablet App Responsive Touch Signature Pad.
 * Engineered for Both New Signatures AND Existing Saved Signatures:
 * - Reliably loads and displays existing saved signatures when editing orders
 * - Full Undo & Redo working on both fresh signings and revisions of saved signatures
 * - Pixel-perfect incremental snapshot history
 * - Single PointerEvent listener preventing duplicate touch/pointer firing
 * - Lightweight bounding-box cropped PNG export
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
  const [hasDrawn, setHasDrawn] = useState(Boolean(value));
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const lastPointTimeRef = useRef(0);
  const pointsSinceSnapshotRef = useRef(0);

  // Snapshot History for 100% reliable Undo / Redo
  const historyRef = useRef([]);
  const redoStackRef = useRef([]);
  const initialDataUrlRef = useRef(isImageValue ? value : '');
  const savedDataUrlRef = useRef(isImageValue ? value : '');
  const isCanvasInitializedRef = useRef(false);

  // Export lightweight cropped signature PNG
  const exportSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return '';

    try {
      const ctx = canvas.getContext('2d');
      const box = getCanvasBoundingBox(ctx, canvas.width, canvas.height);

      if (box && box.maxX > box.minX && box.maxY > box.minY) {
        const padding = 12;
        const cropX = Math.max(0, box.minX - padding);
        const cropY = Math.max(0, box.minY - padding);
        const cropW = Math.min(canvas.width - cropX, (box.maxX - box.minX) + padding * 2);
        const cropH = Math.min(canvas.height - cropY, (box.maxY - box.minY) + padding * 2);

        const maxH = 100;
        const scale = cropH > maxH ? maxH / cropH : 1;
        const targetW = Math.max(1, Math.round(cropW * scale));
        const targetH = Math.max(1, Math.round(cropH * scale));

        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = targetW;
        cropCanvas.height = targetH;
        const cropCtx = cropCanvas.getContext('2d');
        cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);
        return cropCanvas.toDataURL('image/png');
      }

      return canvas.toDataURL('image/png');
    } catch (err) {
      console.error('Failed to export signature image:', err);
      return '';
    }
  }, []);

  // Accurate coordinate calculation from PointerEvent
  const getCoordinates = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Setup canvas size according to container dimensions & DPR
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width === 0) return;

    const dpr = Math.max(window.devicePixelRatio || 1, 2);
    const displayWidth = rect.width;
    const isTablet = window.innerWidth >= 600 && window.innerWidth <= 1024;
    const displayHeight = isTablet ? 155 : 140;

    const targetWidth = Math.floor(displayWidth * dpr);
    const targetHeight = Math.floor(displayHeight * dpr);

    // Save existing bitmap if resizing
    let existingImgData = null;
    if (isCanvasInitializedRef.current && historyRef.current.length > 1) {
      try {
        existingImgData = canvas.toDataURL('image/png');
      } catch {
        // ignore
      }
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.fillStyle = '#0f172a';
    ctx.lineWidth = 2.6;

    isCanvasInitializedRef.current = true;

    if (existingImgData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
      };
      img.src = existingImgData;
      return;
    }

    try {
      historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
    } catch {
      historyRef.current = [];
    }
    redoStackRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  // Load existing saved signature image onto canvas
  const loadImageOntoCanvas = useCallback((imgSrc) => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !imgSrc) return;

    const rect = container.getBoundingClientRect();
    if (rect.width === 0) {
      // If modal is still animating open, retry shortly
      const timer = setTimeout(() => loadImageOntoCanvas(imgSrc), 60);
      return () => clearTimeout(timer);
    }

    const dpr = Math.max(window.devicePixelRatio || 1, 2);
    const displayWidth = rect.width;
    const isTablet = window.innerWidth >= 600 && window.innerWidth <= 1024;
    const displayHeight = isTablet ? 155 : 140;

    const targetWidth = Math.floor(displayWidth * dpr);
    const targetHeight = Math.floor(displayHeight * dpr);

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.fillStyle = '#0f172a';
    ctx.lineWidth = 2.6;

    isCanvasInitializedRef.current = true;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.clearRect(0, 0, displayWidth, displayHeight);
      const hRatio = displayWidth / img.width;
      const vRatio = displayHeight / img.height;
      const ratio = Math.min(hRatio, vRatio, 1);
      const drawW = img.width * ratio;
      const drawH = img.height * ratio;
      const posX = (displayWidth - drawW) / 2;
      const posY = (displayHeight - drawH) / 2;

      ctx.drawImage(img, posX, posY, drawW, drawH);
      setHasDrawn(true);

      try {
        // Base state is the loaded saved signature
        historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
      } catch {
        historyRef.current = [];
      }
      redoStackRef.current = [];
      setCanUndo(false);
      setCanRedo(false);
    };
    img.src = imgSrc;
  }, []);

  // Initial mount setup
  useEffect(() => {
    if (mode === 'draw') {
      if (value && isImageValue) {
        loadImageOntoCanvas(value);
      } else {
        setupCanvas();
      }
    }
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Orientation and window resize handler
  useEffect(() => {
    let timeoutId;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (mode === 'draw') {
          if (historyRef.current.length > 1) {
            setupCanvas();
          } else if (value && isImageValue) {
            loadImageOntoCanvas(value);
          } else {
            setupCanvas();
          }
        }
      }, 120);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [mode, value, isImageValue, loadImageOntoCanvas, setupCanvas]);

  // Sync when an existing order's signature value loads or updates from outside
  useEffect(() => {
    // If value matches what was just exported by this pad, avoid redundant reload
    if (value === savedDataUrlRef.current) return;

    savedDataUrlRef.current = value || '';

    if (!value) {
      // External clear
      initialDataUrlRef.current = '';
      redoStackRef.current = [];
      setCanUndo(false);
      setCanRedo(false);
      setHasDrawn(false);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const dpr = Math.max(window.devicePixelRatio || 1, 2);
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        try {
          historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
        } catch {
          historyRef.current = [];
        }
      }
    } else if (isImageValue) {
      // Existing saved signature loaded from database
      initialDataUrlRef.current = value;
      loadImageOntoCanvas(value);
    }
  }, [value, isImageValue, loadImageOntoCanvas]);

  // Pointer Drawing Listeners (Universal for Touch, Pen, Mouse)
  useEffect(() => {
    if (mode !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    const onPointerDown = (e) => {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();

      isDrawingRef.current = true;
      const coords = getCoordinates(e, canvas);
      lastPosRef.current = coords;
      lastPointTimeRef.current = Date.now();
      pointsSinceSnapshotRef.current = 0;

      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    };

    const onPointerMove = (e) => {
      if (!isDrawingRef.current) return;
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();

      const coords = getCoordinates(e, canvas);
      const prev = lastPosRef.current;
      if (prev.x === coords.x && prev.y === coords.y) return;

      const now = Date.now();
      const timeDelta = now - lastPointTimeRef.current;
      lastPointTimeRef.current = now;

      const midX = (prev.x + coords.x) / 2;
      const midY = (prev.y + coords.y) / 2;

      ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
      ctx.stroke();

      lastPosRef.current = coords;
      pointsSinceSnapshotRef.current += 1;
      setHasDrawn(true);

      // Save incremental micro-snapshots during continuous drawing
      // Every ~18 points or on slight pause (~160ms)
      if (
        pointsSinceSnapshotRef.current >= 18 ||
        (timeDelta > 160 && pointsSinceSnapshotRef.current >= 6)
      ) {
        try {
          const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
          historyRef.current.push(snapshot);
          if (historyRef.current.length > 50) historyRef.current.shift();
          redoStackRef.current = [];
          setCanUndo(true);
          setCanRedo(false);
          pointsSinceSnapshotRef.current = 0;
        } catch {
          // ignore
        }
      }
    };

    const onPointerUp = (e) => {
      if (!isDrawingRef.current) return;
      if (e && e.cancelable) e.preventDefault();
      isDrawingRef.current = false;

      // If user tapped a single dot
      if (pointsSinceSnapshotRef.current === 0) {
        ctx.beginPath();
        ctx.arc(lastPosRef.current.x, lastPosRef.current.y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Save snapshot of this finished stroke
      try {
        const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
        historyRef.current.push(snapshot);
        if (historyRef.current.length > 50) historyRef.current.shift();
        redoStackRef.current = [];
        setCanUndo(historyRef.current.length > 1);
        setCanRedo(false);
      } catch {
        // ignore
      }

      setHasDrawn(true);
      pointsSinceSnapshotRef.current = 0;

      const dataUrl = exportSignature();
      savedDataUrlRef.current = dataUrl;
      onChange(dataUrl);
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerUp);
    };
  }, [mode, onChange, exportSignature]);

  // Stroke-by-stroke UNDO Handler
  // Removes ONLY the last drawn part/letter, keeping the rest completely undisturbed!
  const handleUndo = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    if (historyRef.current.length <= 1) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Pop the current state and push to redo stack
    const currentSnap = historyRef.current.pop();
    redoStackRef.current.push(currentSnap);
    setCanRedo(true);

    // Restore previous state
    const prevSnap = historyRef.current[historyRef.current.length - 1];
    if (prevSnap) {
      ctx.putImageData(prevSnap, 0, 0);
    }

    const hasRemainingDrawn = historyRef.current.length > 1;
    setCanUndo(hasRemainingDrawn);

    if (!hasRemainingDrawn) {
      const isBlank = !initialDataUrlRef.current;
      setHasDrawn(!isBlank);
      savedDataUrlRef.current = initialDataUrlRef.current || '';
      onChange(savedDataUrlRef.current);
    } else {
      const dataUrl = exportSignature();
      savedDataUrlRef.current = dataUrl || '';
      setHasDrawn(true);
      onChange(savedDataUrlRef.current);
    }
  };

  // REDO Handler
  const handleRedo = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    if (redoStackRef.current.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const nextSnap = redoStackRef.current.pop();
    if (nextSnap) {
      ctx.putImageData(nextSnap, 0, 0);
      historyRef.current.push(nextSnap);
    }

    setCanRedo(redoStackRef.current.length > 0);
    setCanUndo(historyRef.current.length > 1);

    const dataUrl = exportSignature();
    savedDataUrlRef.current = dataUrl || '';
    setHasDrawn(true);
    onChange(savedDataUrlRef.current);
  };

  // Clear Signature Handler
  const handleClear = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const dpr = Math.max(window.devicePixelRatio || 1, 2);
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      try {
        const blankSnap = ctx.getImageData(0, 0, canvas.width, canvas.height);
        // Push blank snapshot so if user cleared by mistake, Undo can bring it back!
        historyRef.current.push(blankSnap);
        setCanUndo(historyRef.current.length > 1);
      } catch {
        historyRef.current = [];
        setCanUndo(false);
      }
    }

    redoStackRef.current = [];
    savedDataUrlRef.current = '';
    setCanRedo(false);
    setHasDrawn(false);
    onChange('');
  };

  const handleSwitchToDraw = () => {
    setMode('draw');
    if (!isImageValue) {
      handleClear();
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

          {/* Action Buttons: Undo, Redo, Clear */}
          <div className="sig-pad-actions-bar">
            {canUndo && (
              <button
                type="button"
                className="sig-action-btn sig-undo-btn"
                onClick={handleUndo}
                title="Undo last stroke/part (आखरी हिस्सा हटाएं)"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7v6h6" />
                  <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
                </svg>
                Undo
              </button>
            )}

            {canRedo && (
              <button
                type="button"
                className="sig-action-btn sig-redo-btn"
                onClick={handleRedo}
                title="Redo stroke/part (वापस लाएं)"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 7v6h-6" />
                  <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
                </svg>
                Redo
              </button>
            )}

            {hasDrawn && (
              <button
                type="button"
                className="sig-action-btn sig-clear-btn"
                onClick={handleClear}
                title="Clear and sign again (पूरा साफ़ करें)"
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
