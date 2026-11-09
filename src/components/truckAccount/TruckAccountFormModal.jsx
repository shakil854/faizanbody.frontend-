import React, { useState, useEffect, useRef } from 'react';

/**
 * Modal to Create or Edit a Truck Account (ગાડી વાળા નું ખાતું)
 * STRICT RULE: No Account No. field! Only Party Name, Page No., Truck No., Phone, Address, Notes.
 * 100% Responsive on Mobile, Tablet, and PC.
 */
export function TruckAccountFormModal({ isOpen, onClose, onSave, initialData = null }) {
  const [partyName, setPartyName] = useState('');
  const [pageNo, setPageNo] = useState('');
  const [truckNo, setTruckNo] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameInputRef = useRef(null);
  const pageNoInputRef = useRef(null);
  const truckNoInputRef = useRef(null);
  const phoneInputRef = useRef(null);
  const addressInputRef = useRef(null);
  const notesInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setPartyName(initialData.party_name || '');
        setPageNo(initialData.page_no ? String(initialData.page_no) : '');
        setTruckNo(initialData.truck_no || '');
        setPhone(initialData.phone || '');
        setAddress(initialData.address || '');
        setNotes(initialData.notes || '');
      } else {
        setPartyName('');
        setPageNo('');
        setTruckNo('');
        setPhone('');
        setAddress('');
        setNotes('');
      }
      setError('');
      setIsSubmitting(false);
      setTimeout(() => nameInputRef.current?.focus(), 60);
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!partyName.trim()) {
      setError('Party / Owner Name is required (નામ દાખલ કરવું જરૂરી છે)');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await onSave({
        party_name: partyName.trim(),
        page_no: pageNo ? Number(pageNo) : null,
        truck_no: truckNo.trim(),
        phone: phone.trim(),
        address: address.trim(),
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Error saving truck account');
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
        style={{ maxWidth: '560px' }}
      >
        {/* Drag handle for mobile */}
        <div className="sheet-handle-bar">
          <div className="sheet-handle"></div>
        </div>

        {/* Sheet Header */}
        <div className="sheet-header">
          <div className="sheet-title-group">
            <div
              className="sheet-icon-squircle"
              style={{ background: '#e0f2fe', borderColor: '#bae6fd' }}
            >
              <span style={{ fontSize: '1.25rem' }}>🚛</span>
            </div>
            <div>
              <h3 className="sheet-title">
                {initialData ? 'Edit Truck Account' : 'New Truck Account'}
              </h3>
              <p className="sheet-subtitle">
                {initialData ? 'Update vehicle party details' : 'Add new vehicle customer ledger page'}
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

        {error && (
          <div className="form-alert-error" style={{ marginBottom: '1rem' }}>
            <span>⚠️ {error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="worker-form">
          {/* Party / Owner Name */}
          <div className="form-group">
            <label className="form-label">
              Party / Owner Name (નામ) <span className="text-danger">*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              className="form-input"
              placeholder="e.g. પ્રવીણભાઈ - કડી / Pravinbhai - Kadi"
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  pageNoInputRef.current?.focus();
                }
              }}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {/* Page Number (as seen in notebook top left) */}
            <div className="form-group">
              <label className="form-label">Page No. (પાનું નં.)</label>
              <input
                ref={pageNoInputRef}
                type="number"
                className="form-input"
                placeholder="e.g. 54"
                value={pageNo}
                onChange={(e) => setPageNo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    truckNoInputRef.current?.focus();
                  }
                }}
                min="1"
              />
            </div>

            {/* Truck / Vehicle No. */}
            <div className="form-group">
              <label className="form-label">Truck / Chassis No.</label>
              <input
                ref={truckNoInputRef}
                type="text"
                className="form-input"
                placeholder="e.g. GJ-01-XX-1234"
                value={truckNo}
                onChange={(e) => setTruckNo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    phoneInputRef.current?.focus();
                  }
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            {/* Phone */}
            <div className="form-group">
              <label className="form-label">Phone (ફોન)</label>
              <input
                ref={phoneInputRef}
                type="tel"
                className="form-input"
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addressInputRef.current?.focus();
                  }
                }}
              />
            </div>

            {/* Address */}
            <div className="form-group">
              <label className="form-label">Address / City (સરનામું)</label>
              <input
                ref={addressInputRef}
                type="text"
                className="form-input"
                placeholder="e.g. Kadi / Mehsana"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    notesInputRef.current?.focus();
                  }
                }}
              />
            </div>
          </div>

          {/* Remarks / Notes */}
          <div className="form-group">
            <label className="form-label">Notes / Vehicle Details (વિગત)</label>
            <textarea
              ref={notesInputRef}
              className="form-input"
              rows="2"
              placeholder="e.g. Cabin body fabrication / New truck work"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="form-actions" style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
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
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : initialData ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TruckAccountFormModal;
