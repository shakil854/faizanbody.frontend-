import React, { useState, useEffect } from 'react';
import { stockService } from '../../services/stockService';

/**
 * Stock Movement History & Audit Log Modal
 * Displays detailed logs of Stock IN and Stock OUT with quantities, dates, and reference notes.
 */
export function StockHistoryModal({ isOpen, onClose, item = null }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    const fetchPromise = item
      ? stockService.getItemTransactions(item.id)
      : stockService.getAllTransactions(50);

    fetchPromise
      .then((res) => {
        if (res && res.data) {
          setHistory(res.data);
        }
      })
      .catch((err) => {
        console.error('Failed to load stock history:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, item]);

  if (!isOpen) return null;

  return (
    <div className="stock-modal-overlay" onClick={onClose}>
      <div
        className="stock-modal-card modal-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="stock-modal-header">
          <div className="stock-header-title-box">
            <span className="stock-header-badge">Audit Log</span>
            <h2 className="stock-header-title">
              {item ? `${item.name} History` : 'Recent Stock Movements'}
            </h2>
            <p className="stock-header-subtitle">
              {item
                ? `Category: ${item.category_name} | Balance: ${item.quantity} ${item.unit}`
                : 'Last 50 stock in/out transactions across all materials'}
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

        {/* Body */}
        <div className="stock-modal-body">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
              <div className="splash-pulse-bar" style={{ margin: '0 auto 1rem' }}></div>
              <p>Loading transaction history...</p>
            </div>
          ) : history.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '2.5rem 1rem',
                background: '#f8fafc',
                borderRadius: '10px',
                border: '1px dashed #cbd5e1',
                color: '#64748b',
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" style={{ margin: '0 auto 0.75rem' }}>
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 14 14" />
              </svg>
              <h4 style={{ margin: 0, fontWeight: 600, color: '#334155' }}>No Movements Recorded</h4>
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.85rem' }}>
                Transactions will appear here when you add or deduct stock.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {history.map((tx) => {
                const isIN = tx.type === 'IN';
                return (
                  <div
                    key={tx.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.85rem 1rem',
                      background: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isIN ? '#dcfce7' : '#fee2e2',
                          color: isIN ? '#166534' : '#dc2626',
                          fontWeight: 700,
                          fontSize: '1rem',
                        }}
                      >
                        {isIN ? '+' : '-'}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {!item && (
                            <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>
                              {tx.item_name}
                            </strong>
                          )}
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: isIN ? '#f0fdf4' : '#fef2f2',
                              color: isIN ? '#166534' : '#991b1b',
                              border: `1px solid ${isIN ? '#bbf7d0' : '#fecaca'}`,
                            }}
                          >
                            {isIN ? 'STOCK IN' : 'STOCK OUT'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                          <span>{tx.date}</span>
                          {tx.reference_note && (
                            <span style={{ marginLeft: '8px', color: '#334155' }}>
                              • {tx.reference_note}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '0.98rem',
                          color: isIN ? '#166534' : '#dc2626',
                        }}
                      >
                        {isIN ? '+' : '-'}{tx.quantity} {tx.unit}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        Balance: {tx.new_quantity} {tx.unit}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="stock-modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default StockHistoryModal;
