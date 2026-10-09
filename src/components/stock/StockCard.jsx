import React from 'react';

export const StockCard = React.memo(function StockCard({
  item,
  isAdmin,
  onEdit,
  onDelete,
  onAdjust,
  onViewHistory,
}) {
  const isLow = Number(item.quantity) <= Number(item.min_alert_quantity);

  return (
    <div
      className={`worker-card luxury-worker-card ${isLow ? 'card-alert-urgent' : ''}`}
      style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
    >
      <div>
        {/* Card Header */}
        <div className="worker-card-header" style={{ alignItems: 'flex-start' }}>
          <div className="worker-profile" style={{ flex: 1, minWidth: 0 }}>
            {/* Category Icon Badge */}
            <div
              className={`worker-avatar luxury-avatar ${isLow ? 'avatar-urgent' : ''}`}
              style={{
                background: isLow
                  ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)'
                  : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              }}
            >
              <span className="avatar-initials">
                {item.category_name?.charAt(0)?.toUpperCase() || 'S'}
              </span>
            </div>

            <div className="worker-meta" style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: '#2563eb',
                    background: '#eff6ff',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid #dbeafe',
                  }}
                >
                  {item.category_name}
                </span>
                {item.location && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: '#475569',
                      background: '#f1f5f9',
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    📍 {item.location}
                  </span>
                )}
              </div>

              <h4
                className="worker-name"
                style={{
                  marginTop: '4px',
                  marginBottom: '2px',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: '#0f172a',
                  wordBreak: 'break-word',
                }}
              >
                {item.name}
              </h4>

              <div style={{ marginTop: '2px' }}>
                {isLow ? (
                  <span className="alert-status-pill">
                    <span className="pulse-alert-dot"></span>
                    Low Stock! (Min: {item.min_alert_quantity} {item.unit})
                  </span>
                ) : (
                  <span className="active-dot-pill">
                    <span className="pulse-indicator"></span>
                    In Stock (Healthy)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons: History, Edit, Delete */}
          <div className="card-actions" style={{ marginLeft: '8px' }}>
            {/* View History Button */}
            <button
              type="button"
              className="action-btn"
              onClick={() => onViewHistory(item)}
              title="Stock movement history"
              aria-label="Stock movement history"
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#475569',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 14 14" />
              </svg>
            </button>

            {isAdmin && (
              <>
                <button
                  type="button"
                  className="action-btn edit-btn"
                  onClick={() => onEdit(item)}
                  title="Edit stock item"
                  aria-label={`Edit ${item.name}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="action-btn delete-btn"
                  onClick={() => onDelete(item)}
                  title="Delete stock item"
                  aria-label={`Delete ${item.name}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Stock Quantity Highlight Box */}
        <div
          style={{
            margin: '0.85rem 0 0.6rem',
            padding: '0.75rem 1rem',
            background: isLow ? '#fff1f2' : '#f8fafc',
            border: `1px solid ${isLow ? '#fecdd3' : '#e2e8f0'}`,
            borderRadius: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Available Stock
            </span>
            <div style={{ fontSize: '1.45rem', fontWeight: 800, color: isLow ? '#e11d48' : '#0f172a', lineHeight: 1.2 }}>
              {item.quantity}{' '}
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>
                {item.unit}
              </span>
            </div>
          </div>

          {item.unit_price ? (
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                Est. Price
              </span>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#16a34a' }}>
                ₹ {item.unit_price}{' '}
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>
                  /{item.unit}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Specs / Notes if available */}
        {item.notes && (
          <p
            style={{
              fontSize: '0.82rem',
              color: '#475569',
              background: '#f1f5f9',
              padding: '6px 10px',
              borderRadius: '6px',
              margin: '0 0 0.85rem 0',
              fontStyle: 'italic',
            }}
          >
            "{item.notes}"
          </p>
        )}
      </div>

      {/* Quick Action Buttons for Stock Maintenance */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.5rem',
          paddingTop: '0.75rem',
          borderTop: '1px solid #f1f5f9',
          marginTop: '0.5rem',
        }}
      >
        <button
          type="button"
          onClick={() => onAdjust(item, 'IN')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '0.55rem',
            borderRadius: '8px',
            border: '1px solid #bbf7d0',
            background: '#f0fdf4',
            color: '#166534',
            fontWeight: 700,
            fontSize: '0.86rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Add stock (माल आया)"
        >
          <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>+</span> Maal Aaya (IN)
        </button>

        <button
          type="button"
          onClick={() => onAdjust(item, 'OUT')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '0.55rem',
            borderRadius: '8px',
            border: '1px solid #fecaca',
            background: '#fef2f2',
            color: '#991b1b',
            fontWeight: 700,
            fontSize: '0.86rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          title="Deduct stock (बॉडी में लगा)"
        >
          <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>-</span> Lagaya (OUT)
        </button>
      </div>
    </div>
  );
});

export default StockCard;
