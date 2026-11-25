import React, { useState, useEffect, useRef } from 'react';

/**
 * Modal to Create or Edit a Vyapari Account (વેપારી ખાતું)
 * STRICT RULE: No Account No. field! Only Vyapari Name, Page No., Firm/Shop Name, Phone, Address, Notes.
 * 100% Responsive on Mobile, Tablet, and PC.
 */
export function VyapariFormModal({ isOpen, onClose, onSave, initialData = null }) {
  const [partyName, setPartyName] = useState('');
  const [pageNo, setPageNo] = useState('');
  const [firmName, setFirmName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameInputRef = useRef(null);
  const pageNoInputRef = useRef(null);
  const firmNameInputRef = useRef(null);
  const phoneInputRef = useRef(null);
  const addressInputRef = useRef(null);
  const notesInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setPartyName(initialData.party_name || '');
        setPageNo(initialData.page_no ? String(initialData.page_no) : '');
        setFirmName(initialData.firm_name || '');
        setPhone(initialData.phone || '');
        setAddress(initialData.address || '');
        setNotes(initialData.notes || '');
      } else {
        setPartyName('');
        setPageNo('');
        setFirmName('');
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
      setError('Vyapari / Party Name is required (વેપારીનું નામ દાખલ કરવું જરૂરી છે)');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await onSave({
        party_name: partyName.trim(),
        page_no: pageNo ? Number(pageNo) : null,
        firm_name: firmName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Error saving vyapari account');
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
        <div className="sheet-handle-bar">
          <div className="sheet-handle"></div>
        </div>

        <div className="sheet-header">
          <div className="sheet-title-group">
            <div
              className="sheet-icon-squircle"
              style={{ background: '#ccfbf1', borderColor: '#99f6e4' }}
            >
              <span style={{ fontSize: '1.25rem' }}>🏪</span>
            </div>
            <div>
              <h3 className="sheet-title">
                {initialData ? 'Edit Vyapari Account' : 'New Vyapari Account'}
              </h3>
              <p className="sheet-subtitle">
                {initialData ? 'Update vyapari party details' : 'Add new vyapari / merchant ledger page'}
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
          <div className="form-group">
            <label className="form-label">
              Vyapari / Party Name (વેપારીનું નામ) <span className="text-danger">*</span>
            </label>
            <input
              ref={nameInputRef}
              type="text"
              className="form-input"
              placeholder="e.g. પટેલ હાર્ડવેર - રાજકોટ / Patel Hardware"
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
            <div className="form-group">
              <label className="form-label">Page No. (પાનું નં.)</label>
              <input
                ref={pageNoInputRef}
                type="number"
                className="form-input"
                placeholder="e.g. 12"
                value={pageNo}
                onChange={(e) => setPageNo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    firmNameInputRef.current?.focus();
                  }
                }}
                min="1"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Firm / Shop / Material (પેઢી / માલ)</label>
              <input
                ref={firmNameInputRef}
                type="text"
                className="form-input"
                placeholder="e.g. Steel & Iron / Paints"
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
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

            <div className="form-group">
              <label className="form-label">Address / City (સરનામું / શહેર)</label>
              <input
                ref={addressInputRef}
                type="text"
                className="form-input"
                placeholder="e.g. કડી / મહેસાણા / રાજકોટ"
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

          <div className="form-group">
            <label className="form-label">Notes (નોંધ)</label>
            <input
              ref={notesInputRef}
              type="text"
              className="form-input"
              placeholder="Optional notes about vyapari / terms"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="form-actions" style={{ marginTop: '1.25rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
              style={{ backgroundColor: '#0d9488', borderColor: '#0d9488' }}
            >
              {isSubmitting ? 'Saving...' : initialData ? 'Update Vyapari' : 'Save Vyapari'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default VyapariFormModal;
