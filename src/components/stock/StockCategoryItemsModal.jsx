import React, { useState, useMemo } from 'react';

/**
 * StockCategoryItemsModal Component (Compact & Mobile Responsive)
 * Opens when touching a Category Card.
 * Displays all items under the selected category in a clean, compact mobile-friendly list.
 */
export function StockCategoryItemsModal({
  isOpen,
  categoryName,
  items = [],
  isAdmin,
  onClose,
  onOrderCategory,
  onEditItem,
  onDeleteItem,
  onAdjustItem,
  onViewHistory,
  onOrderItem,
  onAddNewItem,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'low_stock'

  // Filter items in modal
  const filteredCategoryItems = useMemo(() => {
    let result = [...items];

    if (filterMode === 'low_stock') {
      result = result.filter(
        (it) => Number(it.quantity) <= Number(it.min_alert_quantity)
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (it) =>
          it.name?.toLowerCase().includes(q) ||
          it.location?.toLowerCase().includes(q) ||
          it.notes?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [items, filterMode, searchQuery]);

  if (!isOpen) return null;

  const totalCount = items.length;
  const lowCount = items.filter(
    (it) => Number(it.quantity) <= Number(it.min_alert_quantity)
  ).length;

  return (
    <div className="stock-modal-overlay category-items-modal-overlay" onClick={onClose}>
      <div
        className="stock-modal-card category-items-modal-shell"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* ========================================================
            MODAL HEADER: CATEGORY NAME & STATS & ACTIONS
            ======================================================== */}
        <div className="modern-modal-header category-modal-compact-header">
          <div className="modern-header-left">
            <div className="cat-modal-title-box">
              <span className="cat-modal-header-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <div>
                <h3 className="cat-modal-main-title">
                  {categoryName || 'Category Materials'}
                </h3>
                <div className="cat-modal-sub-chips">
                  <span className="cat-chip-total">{totalCount} Items</span>
                  {lowCount > 0 && (
                    <span className="cat-chip-low">⚠️ {lowCount} Low</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="modern-header-right cat-modal-header-actions">
            {/* Quick Order Materials button */}
            {totalCount > 0 && (
              <button
                type="button"
                className="btn-cat-header-order"
                onClick={() => {
                  onOrderCategory && onOrderCategory(categoryName, items);
                }}
                title="Order materials from this category on WhatsApp (PO Slip)"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                <span>Order</span>
              </button>
            )}

            {/* Add Material button */}
            {isAdmin && (
              <button
                type="button"
                className="btn btn-primary btn-cat-header-add"
                onClick={() => onAddNewItem && onAddNewItem(categoryName)}
                title="Add new item to this category"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>Add</span>
              </button>
            )}

            <button type="button" className="btn-modern-close" onClick={onClose} aria-label="Close" title="Close">
              ✕
            </button>
          </div>
        </div>

        {/* ========================================================
            SUB-HEADER: IN-MODAL SEARCH & STATUS TABS
            ======================================================== */}
        <div className="cat-modal-search-bar-wrap">
          {/* Quick Search inside this category */}
          <div className="cat-modal-search-box">
            <span className="cat-modal-search-icon">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              placeholder={`Search in ${categoryName}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="cat-modal-search-input"
            />
          </div>

          {/* Quick Filter tabs */}
          <div className="cat-modal-tabs-group">
            <button
              type="button"
              className={`stock-filter-tab cat-tab-btn ${filterMode === 'all' ? 'active' : ''}`}
              onClick={() => setFilterMode('all')}
            >
              All ({totalCount})
            </button>
            {lowCount > 0 && (
              <button
                type="button"
                className={`stock-filter-tab low-stock cat-tab-btn ${filterMode === 'low_stock' ? 'active' : ''}`}
                onClick={() => setFilterMode('low_stock')}
              >
                ⚠️ Low ({lowCount})
              </button>
            )}
          </div>
        </div>

        {/* ========================================================
            MODAL BODY: COMPACT ITEMS LIST (MOBILE-FIRST)
            ======================================================== */}
        <div className="modern-modal-body-scroll cat-modal-scrollable-body">
          {filteredCategoryItems.length === 0 ? (
            <div className="empty-category-modal-state">
              <div className="empty-icon-sub">📦</div>
              <h4>{searchQuery ? 'No matching materials found' : 'No materials in this category'}</h4>
              <p>
                {searchQuery
                  ? `No items match "${searchQuery}". Clear search to view all.`
                  : `Start by adding materials belonging to "${categoryName}".`}
              </p>
              {isAdmin && !searchQuery && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onAddNewItem && onAddNewItem(categoryName)}
                >
                  <span>+ Add First Material</span>
                </button>
              )}
            </div>
          ) : (
            <div className="cat-modal-items-column">
              {filteredCategoryItems.map((item) => {
                const isLow = Number(item.quantity) <= Number(item.min_alert_quantity);

                return (
                  <div
                    key={item.id}
                    className={`cat-compact-item-card ${isLow ? 'card-is-low' : ''}`}
                  >
                    {/* Line 1: Name, Location, Stock Badge */}
                    <div className="cat-item-top-line">
                      <div className="cat-item-info-meta">
                        <span className="cat-item-title">{item.name}</span>
                        {item.location && (
                          <span className="cat-item-rack-tag">📍 {item.location}</span>
                        )}
                      </div>

                      <div className={`cat-item-stock-badge ${isLow ? 'badge-low' : 'badge-ok'}`}>
                        <span className="cat-item-qty">{item.quantity}</span>
                        <span className="cat-item-unit">{item.unit}</span>
                      </div>
                    </div>

                    {/* Line 2: Alert info & Action buttons */}
                    <div className="cat-item-bottom-line">
                      <div className="cat-item-alert-text">
                        {isLow ? (
                          <span className="cat-alert-warning">⚠️ Low Stock (Min: {item.min_alert_quantity})</span>
                        ) : (
                          <span className="cat-alert-normal">Min: {item.min_alert_quantity} {item.unit}</span>
                        )}
                        {item.notes && <span className="cat-item-note-inline">• {item.notes}</span>}
                      </div>

                      <div className="cat-item-actions-cluster">
                        {/* Quick Adjust IN/OUT buttons */}
                        <div className="cat-adjust-btns">
                          <button
                            type="button"
                            className="stock-btn-in cat-mini-adj"
                            onClick={() => onAdjustItem && onAdjustItem(item, 'IN')}
                            title="Stock IN (+)"
                          >
                            <span className="btn-sign">+</span> IN
                          </button>
                          <button
                            type="button"
                            className="stock-btn-out cat-mini-adj"
                            onClick={() => onAdjustItem && onAdjustItem(item, 'OUT')}
                            title="Stock OUT (-)"
                          >
                            <span className="btn-sign">-</span> OUT
                          </button>
                        </div>

                        {/* Order & History & Edit & Delete */}
                        <div className="cat-tools-cluster">
                          <button
                            type="button"
                            className="stock-mini-btn order"
                            onClick={() => onOrderItem && onOrderItem(item)}
                            title="Order this material on WhatsApp (PO Slip)"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                            </svg>
                          </button>

                          <button
                            type="button"
                            className="stock-mini-btn"
                            onClick={() => onViewHistory && onViewHistory(item)}
                            title="Movement History"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 14 14" />
                            </svg>
                          </button>

                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                className="stock-mini-btn edit"
                                onClick={() => onEditItem && onEditItem(item)}
                                title="Edit Material"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>

                              <button
                                type="button"
                                className="stock-mini-btn delete"
                                onClick={() => onDeleteItem && onDeleteItem(item)}
                                title="Delete Material"
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ========================================================
            STICKY BOTTOM ACTION BAR: CLOSE & BULK ORDER
            ======================================================== */}
        <div className="modern-modal-sticky-footer cat-modal-sticky-footer">
          <div className="footer-left">
            <button type="button" className="btn btn-secondary cat-footer-close-btn" onClick={onClose}>
              Close
            </button>
          </div>

          <div className="footer-right">
            {totalCount > 0 && (
              <button
                type="button"
                className="btn-modern-save-submit cat-footer-order-btn"
                onClick={() => {
                  onOrderCategory && onOrderCategory(categoryName, items);
                }}
                title="Create Purchase Order for this category"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                <span>Order Category ({totalCount})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StockCategoryItemsModal;
