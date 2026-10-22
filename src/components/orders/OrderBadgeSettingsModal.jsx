import React, { useState, useEffect } from 'react';
import {
  getOrderBadgeSettings,
  saveOrderBadgeSettings,
  getOrderBadgeColor,
  DEFAULT_ORDER_BADGE_SETTINGS,
} from '../../utils/orderBadgeSettings';
import { orderService } from '../../services/orderService';

export function OrderBadgeSettingsModal({
  isOpen,
  onClose,
  inProgressCount = 0,
  incomingCount = 0,
  totalCount = 0,
  onSaved,
}) {
  const [settings, setSettings] = useState(DEFAULT_ORDER_BADGE_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSettings(getOrderBadgeSettings());
      // Also sync from backend
      orderService.getBadgeSettings().then((remoteSettings) => {
        if (remoteSettings) setSettings(remoteSettings);
      }).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentCount =
    settings.countType === 'total'
      ? totalCount
      : settings.countType === 'incoming'
      ? incomingCount
      : inProgressCount;

  const currentBasisLabel =
    settings.countType === 'total'
      ? 'Total Orders'
      : settings.countType === 'incoming'
      ? 'Incoming Orders'
      : 'In-Progress Orders';

  const inProgressColor = getOrderBadgeColor(inProgressCount, settings);
  const incomingColor = getOrderBadgeColor(incomingCount, settings);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const saved = await orderService.updateBadgeSettings(settings);
      if (onSaved) onSaved(saved);
      onClose();
    } catch (err) {
      console.error('Error saving badge settings:', err);
      saveOrderBadgeSettings(settings);
      if (onSaved) onSaved(settings);
      onClose();
    } finally {
      setIsSaving(false);
    }
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
          Set threshold rules for bottom <strong>In-Progress Orders</strong> badge and top <strong>Incoming Orders</strong> filter:
        </p>

        {/* Dual Live Preview: Bottom Shortcut (In-Progress) & Top Filter (Incoming) */}
        <div className="dual-preview-grid">
          {/* Card 1: Bottom Orders Shortcut */}
          <div className={`badge-preview-luxury-card preview-${inProgressColor}`}>
            <div className="preview-info-col">
              <span className="preview-label">Bottom Bar (In-Progress):</span>
              <span className="preview-details">
                Orders: <strong>{inProgressCount}</strong>
              </span>
            </div>
            <div className="preview-badge-display">
              <div className={`nav-alert-badge nav-order-badge nav-order-badge-${inProgressColor} preview-badge-element`}>
                <span className="alert-pulse-ring"></span>
                {inProgressCount}
              </div>
              <span className={`preview-color-pill pill-${inProgressColor}`}>
                {inProgressColor.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Card 2: Top Incoming Filter */}
          <div className={`badge-preview-luxury-card preview-${incomingColor}`}>
            <div className="preview-info-col">
              <span className="preview-label">Top Filter (Incoming):</span>
              <span className="preview-details">
                Incoming: <strong>{incomingCount}</strong>
              </span>
            </div>
            <div className="preview-badge-display">
              <div className={`nav-alert-badge nav-order-badge nav-order-badge-${incomingColor} preview-badge-element`}>
                <span className="alert-pulse-ring"></span>
                {incomingCount}
              </div>
              <span className={`preview-color-pill pill-${incomingColor}`}>
                {incomingColor.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="badge-settings-form">
          {/* Tracking Type Toggle */}
          <div className="badge-form-group">
            <label className="badge-field-label">Count Basis:</label>
            <div className="badge-type-selector badge-type-selector-3">
              <button
                type="button"
                className={`badge-type-chip ${settings.countType === 'in_progress' ? 'active' : ''}`}
                onClick={() => setSettings((prev) => ({ ...prev, countType: 'in_progress' }))}
              >
                In-Progress ({inProgressCount})
              </button>
              <button
                type="button"
                className={`badge-type-chip ${settings.countType === 'incoming' ? 'active' : ''}`}
                onClick={() => setSettings((prev) => ({ ...prev, countType: 'incoming' }))}
              >
                Incoming ({incomingCount})
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
                disabled={isSaving}
              >
                {isSaving ? 'Saving to Cloud...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default OrderBadgeSettingsModal;
