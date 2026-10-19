import React, { useState, useEffect } from 'react';
import {
  getOrderBadgeSettings,
  saveOrderBadgeSettings,
  getOrderBadgeColor,
  DEFAULT_ORDER_BADGE_SETTINGS,
} from '../../utils/orderBadgeSettings';

export function OrderBadgeSettingsModal({
  isOpen,
  onClose,
  inProgressCount = 0,
  totalCount = 0,
  onSaved,
}) {
  const [settings, setSettings] = useState(DEFAULT_ORDER_BADGE_SETTINGS);

  useEffect(() => {
    if (isOpen) {
      setSettings(getOrderBadgeSettings());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentCount = settings.countType === 'total' ? totalCount : inProgressCount;
  const previewColor = getOrderBadgeColor(currentCount, settings);

  const handleSave = (e) => {
    e.preventDefault();
    const saved = saveOrderBadgeSettings(settings);
    if (onSaved) onSaved(saved);
    onClose();
  };

  const handleReset = () => {
    setSettings({ ...DEFAULT_ORDER_BADGE_SETTINGS });
  };

  return (
    <div className="modal-backdrop order-badge-modal-backdrop" onClick={onClose}>
      <div
        className="android-dialog luxury-dialog order-badge-settings-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Top Icon Badge */}
        <div className="dialog-icon-wrapper order-settings-icon-wrapper">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a4.5 4.5 0 0 0 0 9 4.5 4.5 0 0 1 0 9" />
            <circle cx="12" cy="7.5" r="1" fill="#2563eb" />
            <circle cx="12" cy="16.5" r="1" fill="#2563eb" />
          </svg>
        </div>

        <h3 className="dialog-title">Order Alert Color Settings</h3>
        <p className="dialog-message">
          Set threshold rules when the bottom Orders badge turns <strong>Red</strong>, <strong>Green</strong>, or <strong>Blue</strong>:
        </p>

        {/* Live Badge Preview Box */}
        <div className={`badge-preview-luxury-card preview-${previewColor}`}>
          <div className="preview-info-col">
            <span className="preview-label">Live Preview (Current Status):</span>
            <span className="preview-details">
              {settings.countType === 'total' ? 'Total Orders' : 'In-Progress Orders'}: <strong>{currentCount}</strong>
            </span>
          </div>
          <div className="preview-badge-display">
            <div className={`nav-alert-badge nav-order-badge nav-order-badge-${previewColor} preview-badge-element`}>
              <span className="alert-pulse-ring"></span>
              {currentCount}
            </div>
            <span className={`preview-color-pill pill-${previewColor}`}>
              {previewColor.toUpperCase()}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="badge-settings-form">
          {/* Tracking Type Toggle */}
          <div className="badge-form-group">
            <label className="badge-field-label">Count Basis:</label>
            <div className="badge-type-selector">
              <button
                type="button"
                className={`badge-type-chip ${settings.countType === 'in_progress' ? 'active' : ''}`}
                onClick={() => setSettings((prev) => ({ ...prev, countType: 'in_progress' }))}
              >
                In-Progress Orders ({inProgressCount})
              </button>
              <button
                type="button"
                className={`badge-type-chip ${settings.countType === 'total' ? 'active' : ''}`}
                onClick={() => setSettings((prev) => ({ ...prev, countType: 'total' }))}
              >
                Total Orders ({totalCount})
              </button>
            </div>
          </div>

          {/* Color 1: RED Threshold */}
          <div className="badge-threshold-card threshold-red">
            <div className="threshold-header">
              <span className="threshold-dot dot-red"></span>
              <div className="threshold-title-col">
                <strong>1. Turn RED When:</strong>
                <span className="threshold-sub">Orders are at or below this number (≤)</span>
              </div>
            </div>
            <div className="threshold-input-row">
              <input
                type="number"
                min="0"
                max="999"
                value={settings.redThreshold}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, redThreshold: Math.max(0, parseInt(e.target.value, 10) || 0) }))
                }
                className="badge-number-input"
                required
              />
              <span className="threshold-rule-text">
                0 to {settings.redThreshold} orders ➔ <strong style={{ color: '#dc2626' }}>RED</strong>
              </span>
            </div>
          </div>

          {/* Color 2: GREEN Threshold */}
          <div className="badge-threshold-card threshold-green">
            <div className="threshold-header">
              <span className="threshold-dot dot-green"></span>
              <div className="threshold-title-col">
                <strong>2. Turn GREEN When:</strong>
                <span className="threshold-sub">Orders are at or below this number (≤)</span>
              </div>
            </div>
            <div className="threshold-input-row">
              <input
                type="number"
                min={settings.redThreshold}
                max="999"
                value={settings.greenThreshold}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, greenThreshold: Math.max(0, parseInt(e.target.value, 10) || 0) }))
                }
                className="badge-number-input"
                required
              />
              <span className="threshold-rule-text">
                {Number(settings.redThreshold) + 1} to {settings.greenThreshold} orders ➔ <strong style={{ color: '#059669' }}>GREEN</strong>
              </span>
            </div>
          </div>

          {/* Color 3: BLUE Threshold (User Editable) */}
          <div className="badge-threshold-card threshold-blue">
            <div className="threshold-header">
              <span className="threshold-dot dot-blue"></span>
              <div className="threshold-title-col">
                <strong>3. Turn BLUE When:</strong>
                <span className="threshold-sub">Orders are at or above this number (≥)</span>
              </div>
            </div>
            <div className="threshold-input-row">
              <input
                type="number"
                min="0"
                max="999"
                value={settings.blueThreshold}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    blueThreshold: Math.max(0, parseInt(e.target.value, 10) || 0),
                  }))
                }
                className="badge-number-input"
                required
              />
              <span className="threshold-rule-text">
                {settings.blueThreshold}+ orders ➔ <strong style={{ color: '#2563eb' }}>BLUE</strong>
              </span>
            </div>
          </div>

          {/* Dialog Actions conforming strictly to Rule 3 */}
          <div className="dialog-actions dialog-actions-split">
            <button
              type="button"
              className="btn btn-secondary btn-reset-link"
              onClick={handleReset}
              title="Reset default 2, 5 thresholds"
            >
              Reset Defaults
            </button>
            <div className="dialog-action-buttons-group">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                Save Settings
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default OrderBadgeSettingsModal;
