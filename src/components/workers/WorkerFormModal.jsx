import React, { useState, useEffect } from 'react';

export function WorkerFormModal({ isOpen, onClose, onSave, initialData }) {
  const [name, setName] = useState('');
  const [comingDate, setComingDate] = useState('');
  const [goingDate, setGoingDate] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setComingDate(initialData.coming_date ? initialData.coming_date.split('T')[0] : '');
      setGoingDate(initialData.going_date ? initialData.going_date.split('T')[0] : '');
    } else {
      const today = new Date().toISOString().split('T')[0];
      setName('');
      setComingDate(today);
      setGoingDate('');
    }
    setError('');
    setIsSubmitting(false);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Worker name is required');
      return;
    }
    if (!comingDate) {
      setError('Coming date is required');
      return;
    }

    const finalGoingDate = goingDate ? goingDate.trim() : null;

    if (finalGoingDate && finalGoingDate < comingDate) {
      setError('Going date cannot be earlier than Coming date');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        name: name.trim(),
        coming_date: comingDate,
        going_date: finalGoingDate,
      });
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save worker';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="android-bottom-sheet luxury-bottom-sheet"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Drag handle for mobile */}
        <div className="sheet-handle-bar">
          <div className="sheet-handle"></div>
        </div>

        {/* Modal Header */}
        <div className="sheet-header">
          <div className="sheet-title-group">
            <div className="sheet-icon-squircle">
              {initialData ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              )}
            </div>
            <div>
              <h3 className="sheet-title">
                {initialData ? 'Edit Worker Profile' : 'Enroll New Worker'}
              </h3>
              <p className="sheet-subtitle">
                {initialData ? 'Update joining or departure date' : 'Enter worker details and assign joining date'}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="sheet-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form Error Notice */}
        {error && (
          <div className="form-alert-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Worker Form - Strictly 3 Fields */}
        <form onSubmit={handleSubmit} className="sheet-form">
          {/* Field 1: Worker Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="workerName">
              Worker Full Name <span className="required-star">*</span>
            </label>
            <div className="input-with-icon">
              <span className="field-icon">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                id="workerName"
                type="text"
                className="form-input"
                placeholder="e.g. Mohammad Faizan / Imran Khan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                required
              />
            </div>
          </div>

          {/* Field 2: Coming Date */}
          <div className="form-group">
            <label className="form-label" htmlFor="comingDate">
              Coming Date (Joining) <span className="required-star">*</span>
            </label>
            <div className="input-with-icon">
              <span className="field-icon">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </span>
              <input
                id="comingDate"
                type="date"
                className="form-input date-input"
                value={comingDate}
                onChange={(e) => setComingDate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Field 3: Going Date */}
          <div className="form-group">
            <label className="form-label" htmlFor="goingDate">
              Going Date (Relieved / Optional)
            </label>
            <div className="input-with-icon">
              <span className="field-icon">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
              <input
                id="goingDate"
                type="date"
                className="form-input date-input"
                value={goingDate}
                min={comingDate || undefined}
                onChange={(e) => setGoingDate(e.target.value)}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="sheet-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-save"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="spinner-dots">Saving...</span>
              ) : initialData ? (
                'Update Profile'
              ) : (
                'Save Worker'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default WorkerFormModal;
