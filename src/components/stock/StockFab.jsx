import React from 'react';

export function StockFab({ onAddNew }) {
  return (
    <button
      type="button"
      className="android-fab luxury-fab order-fab"
      onClick={onAddNew}
      title="Add Stock Item"
      aria-label="Add Stock Item"
    >
      <span className="fab-plus-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </span>
      <span className="fab-label">Add Stock</span>
    </button>
  );
}

export default StockFab;
