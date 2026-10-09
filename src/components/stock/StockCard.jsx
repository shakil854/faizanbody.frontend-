import React from 'react';

export const StockCard = React.memo(function StockCard({
  item,
  isAdmin,
  onEdit,
  onDelete,
  onAdjust,
  onViewHistory,
  onOrder,
}) {
  const isLow = Number(item.quantity) <= Number(item.min_alert_quantity);

  return (
    <div className={`stock-item-compact-card ${isLow ? 'is-low-stock' : ''}`}>
      {/* Top Row: Category & Location Tags + Title + Actions */}
      <div className="stock-card-top-row">
        <div className="stock-card-meta">
          <div className="stock-card-badge-line">
            <span className="stock-category-pill">{item.category_name}</span>
            {item.location && (
              <span className="stock-location-pill">📍 {item.location}</span>
            )}
          </div>
          <h4 className="stock-card-title">{item.name}</h4>
        </div>

        {/* Compact Action Icons */}
        <div className="stock-card-actions">
          {/* WhatsApp Order Button */}
          <button
            type="button"
            className="stock-mini-btn order"
            onClick={() => onOrder && onOrder(item)}
            title="Order Material on WhatsApp (PDF)"
            aria-label={`Order ${item.name} on WhatsApp`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </button>

          <button
            type="button"
            className="stock-mini-btn"
            onClick={() => onViewHistory(item)}
            title="Movement History"
            aria-label="History"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 14 14" />
            </svg>
          </button>

          {isAdmin && (
            <>
              <button
                type="button"
                className="stock-mini-btn edit"
                onClick={() => onEdit(item)}
                title="Edit Item"
                aria-label={`Edit ${item.name}`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button
                type="button"
                className="stock-mini-btn delete"
                onClick={() => onDelete(item)}
                title="Delete Item"
                aria-label={`Delete ${item.name}`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Middle Row: Quantity & Status */}
      <div className="stock-card-qty-row">
        <div className="stock-qty-display">
          <span className="stock-qty-num">{item.quantity}</span>
          <span className="stock-qty-unit">{item.unit}</span>
        </div>

        <div className="stock-status-wrap">
          {isLow ? (
            <span
              className="stock-alert-pill"
              onClick={() => onOrder && onOrder(item)}
              style={{ cursor: 'pointer' }}
              title="Click to Order Material on WhatsApp (PDF)"
            >
              <span className="pulse-alert-dot"></span>
              Low Stock (Order 📲)
            </span>
          ) : (
            <span className="stock-healthy-pill">
              <span className="pulse-indicator"></span>
              In Stock
            </span>
          )}
          {item.unit_price ? (
            <span className="stock-price-tag">₹{item.unit_price}/{item.unit}</span>
          ) : null}
        </div>
      </div>

      {/* Notes / Specs if any */}
      {item.notes && (
        <div className="stock-card-notes" title={item.notes}>
          "{item.notes}"
        </div>
      )}

      {/* Bottom Action Buttons: Clean English Labels */}
      <div className="stock-card-btn-row">
        <button
          type="button"
          className="stock-btn-in"
          onClick={() => onAdjust(item, 'IN')}
          title="Add Stock (IN)"
        >
          <span className="btn-sign">+</span> Stock IN
        </button>
        <button
          type="button"
          className="stock-btn-out"
          onClick={() => onAdjust(item, 'OUT')}
          title="Use Stock (OUT)"
        >
          <span className="btn-sign">-</span> Stock OUT
        </button>
      </div>
    </div>
  );
});

export default StockCard;
