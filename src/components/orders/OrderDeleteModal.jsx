import React from 'react';
import { createPortal } from 'react-dom';

export function OrderDeleteModal({ isOpen, onClose, onConfirm, order, isDeleting }) {
  if (!isOpen || !order) return null;

  return createPortal(
    <div className="modal-backdrop-luxury luxury-glass-backdrop" onClick={onClose}>
      <div className="modal-card-luxury delete-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="delete-modal-icon-wrap">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </div>

        <h3 className="delete-modal-title">Delete Work Order?</h3>
        <p className="delete-modal-desc">
          Are you sure you want to delete order <strong>{order.order_no || `#${order.id}`}</strong> ({order.truck_chassis_no} - {order.owner_name})? This action cannot be undone.
        </p>

        <div className="delete-modal-actions">
          <button type="button" className="btn btn-secondary-luxury" onClick={onClose} disabled={isDeleting}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger-luxury"
            onClick={() => onConfirm(order.id)}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default OrderDeleteModal;
