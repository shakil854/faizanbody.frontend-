import React, { useState, useEffect, useRef } from 'react';

/**
 * Modal to Create or Edit a Truck Account (ગાડી વાળા નું ખાતું)
 * STRICT RULE: No Account No. field! Only Party Name, Page No., Truck No., Phone, Address, Notes.
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
    <div className="modal-backdrop-luxury animate-fade-in" onClick={onClose}>
      <div
        className="modal-luxury-card animate-scale-up"
        style={{ maxWidth: '500px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-luxury-header">
          <div className="header-icon-title">
            <span className="header-badge-icon">🚛</span>
            <div>
              <h3 className="modal-title">
                {initialData ? 'Edit Truck Account' : 'New Truck Account'}
              </h3>
              <p className="modal-subtitle">
                {initialData ? 'Update vehicle party details' : 'Add new vehicle customer ledger'}
              </p>
            </div>
          </div>
          <button type="button" className="btn-modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {error && (
          <div className="form-alert-error" style={{ margin: '1rem 1.25rem 0' }}>
            <span>⚠️ {error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-luxury-body">
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
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {/* Page Number (as seen in notebook top left) */}
            <div className="form-group">
              <label className="form-label">Page No. (પાનું નં.)</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 54"
                value={pageNo}
                onChange={(e) => setPageNo(e.target.value)}
                min="1"
              />
            </div>

            {/* Truck / Vehicle No. */}
            <div className="form-group">
              <label className="form-label">Truck / Chassis No.</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. GJ-01-XX-1234"
                value={truckNo}
                onChange={(e) => setTruckNo(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {/* Phone */}
            <div className="form-group">
              <label className="form-label">Phone (ફોન)</label>
              <input
                type="tel"
                className="form-input"
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            {/* Address */}
            <div className="form-group">
              <label className="form-label">Address / City (સરનામું)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Kadi / Mehsana"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
          </div>

          {/* Remarks / Notes */}
          <div className="form-group">
            <label className="form-label">Notes / Vehicle Details (વિગત)</label>
            <textarea
              className="form-input"
              rows="2"
              placeholder="e.g. Cabin body fabrication / New truck work"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="modal-actions-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : initialData ? 'Save Changes' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TruckAccountFormModal;

