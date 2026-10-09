import React, { useState, useEffect } from 'react';

/**
 * Quick Stock In / Stock Out Modal
 * Maintains stock accurately with real-time balance calculations and reference notes.
 */
export function StockQuickAdjustModal({
  isOpen,
  onClose,
  item,
  initialType = 'IN',
  onAdjust,
  isSubmitting,
}) {
  const [type, setType] = useState('IN');
  const [quantity, setQuantity] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [referenceNote, setReferenceNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      setQuantity('');
      setDate(new Date().toISOString().split('T')[0]);
      setReferenceNote('');
      setError('');
    }
  }, [isOpen, initialType]);

  if (!isOpen || !item) return null;

  const currentQty = Number(item.quantity) || 0;
  const numAdj = Math.abs(parseFloat(quantity) || 0);

  let newQty = currentQty;
  if (type === 'IN') {
    newQty = currentQty + numAdj;
  } else if (type === 'OUT') {
    newQty = Math.max(0, currentQty - numAdj);
  }

  const isInsufficient = type === 'OUT' && numAdj > currentQty;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!numAdj || numAdj <= 0) {
      setError('Please enter a valid quantity greater than 0');
      return;
    }
    if (isInsufficient) {
      setError(`Cannot deduct more than current stock (${currentQty} ${item.unit})`);
      return;
    }

    try {
      setError('');
      await onAdjust(item.id, {
        type,
        quantity: numAdj,
        date,
        reference_note: referenceNote,
      });
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error updating stock');
    }
  };

  return (
    <div className="stock-modal-overlay" onClick={onClose}>
      <div
        className="stock-modal-card modal-sm"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="stock-modal-header">
          <div className="stock-header-title-box">
            <span
              className="stock-header-badge"
              style={{
                background: type === 'IN' ? '#dcfce7' : '#fee2e2',
                color: type === 'IN' ? '#166534' : '#991b1b',
                borderColor: type === 'IN' ? '#bbf7d0' : '#fecaca',
              }}
            >
              {type === 'IN' ? '+ Stock IN' : '- Stock OUT'}
            </span>
            <h2 className="stock-header-title">{item.name}</h2>
            <p className="stock-header-subtitle">
              Current Stock: <strong>{currentQty} {item.unit}</strong> ({item.category_name})
            </p>
          </div>
          <button
            type="button"
            className="stock-close-circle-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Form Shell */}
        <form onSubmit={handleSubmit} className="stock-modal-form-shell">
          <div className="stock-modal-body">
            {/* Toggle Type Buttons */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.5rem',
                marginBottom: '1.25rem',
                background: '#f1f5f9',
                padding: '4px',
                borderRadius: '8px',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setType('IN');
                  setError('');
                }}
                style={{
                  padding: '0.6rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  background: type === 'IN' ? '#16a34a' : 'transparent',
                  color: type === 'IN' ? '#ffffff' : '#475569',
                  transition: 'all 0.2s ease',
                }}
              >
                + Stock IN
              </button>
              <button
                type="button"
                onClick={() => {
                  setType('OUT');
                  setError('');
                }}
                style={{
                  padding: '0.6rem',
                  borderRadius: '6px',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  background: type === 'OUT' ? '#dc2626' : 'transparent',
                  color: type === 'OUT' ? '#ffffff' : '#475569',
                  transition: 'all 0.2s ease',
                }}
              >
                - Stock OUT
              </button>
            </div>

            {/* Quantity */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                Quantity ({item.unit}) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                step="any"
                className="form-input"
                placeholder={`Enter quantity in ${item.unit}...`}
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setError('');
                }}
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            {/* Live Balance Preview Box */}
            {numAdj > 0 && (
              <div
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  background: isInsufficient ? '#fef2f2' : '#f0fdf4',
                  border: `1px solid ${isInsufficient ? '#fecaca' : '#bbf7d0'}`,
                  marginBottom: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '0.85rem', color: isInsufficient ? '#991b1b' : '#166534' }}>
                  {isInsufficient ? 'Insufficient Stock!' : 'New Stock Balance:'}
                </span>
                <span style={{ fontWeight: 700, fontSize: '1rem', color: isInsufficient ? '#dc2626' : '#15803d' }}>
                  {currentQty} {type === 'IN' ? '+' : '-'} {numAdj} = {newQty} {item.unit}
                </span>
              </div>
            )}

            {/* Date */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                Date
              </label>
              <input
                type="date"
                className="form-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {/* Reference Note / Reason */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>
                Reference / Reason (Bill No / Truck Chassis No / Note)
              </label>
              <input
                type="text"
                className="form-input"
                placeholder={
                  type === 'IN'
                    ? 'e.g. Tata Steel Invoice #402 / Supplier delivery'
                    : 'e.g. Used for Truck Chassis #4409 / Order #12'
                }
                value={referenceNote}
                onChange={(e) => setReferenceNote(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {error && (
              <p style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '0.5rem' }}>
                {error}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="stock-modal-footer">
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
              className={type === 'IN' ? 'btn btn-primary' : 'btn btn-danger'}
              disabled={isSubmitting || !numAdj || isInsufficient}
            >
              {isSubmitting
                ? 'Processing...'
                : type === 'IN'
                ? `Confirm +${numAdj || 0} ${item.unit}`
                : `Confirm -${numAdj || 0} ${item.unit}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default StockQuickAdjustModal;

