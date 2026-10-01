import React from 'react';

export function WorkerDeleteModal({ isOpen, worker, onConfirm, onCancel, isDeleting }) {
  if (!isOpen || !worker) return null;

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="android-dialog luxury-dialog"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
      >
        <div className="dialog-icon-wrapper delete-dialog-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </div>
        <h3 className="dialog-title">Delete Worker Record?</h3>
        <p className="dialog-message">
          Are you sure you want to permanently delete <strong>{worker.name}</strong> from the workshop directory? This action cannot be reversed.
        </p>

        <div className="dialog-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => onConfirm(worker.id)}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Record'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default WorkerDeleteModal;
