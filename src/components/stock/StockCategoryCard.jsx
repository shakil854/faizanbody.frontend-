import React from 'react';

/**
 * StockCategoryCard Component (Compact & Mobile Responsive)
 * Displays a sleek luxury Category Card on the Stock Page.
 * Touching the card opens the Category Items Modal showing all items under this category.
 */
export const StockCategoryCard = React.memo(function StockCategoryCard({
  category,
  items = [],
  canOrder = true,
  onClick,
  onOrderCategory,
}) {
  const totalItems = items.length;
  const lowStockItems = items.filter(
    (it) => Number(it.quantity) <= Number(it.min_alert_quantity)
  );
  const lowCount = lowStockItems.length;
  const hasLowStock = lowCount > 0;

  // Get preview names for first 2-3 items
  const previewItems = items.slice(0, 3);
  const remainingCount = totalItems - previewItems.length;

  return (
    <div
      className={`stock-category-card luxury-category-card ${hasLowStock ? 'has-low-stock-alert' : ''}`}
      onClick={() => onClick && onClick(category, items)}
      role="button"
      tabIndex={0}
      title={`Touch to view all ${totalItems} items in ${category.name}`}
    >
      {/* Top Header: Category Icon & Title & Badges */}
      <div className="category-card-header">
        <div className="category-title-wrap">
          <div className="category-icon-avatar">
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className="category-text-meta">
            <h4 className="category-card-name">{category.name}</h4>
            <span className="category-items-count-text">
              {totalItems} {totalItems === 1 ? 'Item' : 'Items'}
            </span>
          </div>
        </div>

        {/* Status Pills */}
        <div className="category-status-pills">
          {hasLowStock ? (
            <span className="cat-low-stock-pill" title={`${lowCount} items low stock`}>
              ⚠️ {lowCount} Low
            </span>
          ) : (
            <span className="cat-total-pill">
              ✓ In Stock
            </span>
          )}
        </div>
      </div>

      {/* Materials Preview Chips */}
      {items.length > 0 && (
        <div className="category-items-preview-strip">
          <div className="category-preview-chips">
            {previewItems.map((it) => (
              <span
                key={it.id}
                className={`cat-preview-tag ${
                  Number(it.quantity) <= Number(it.min_alert_quantity) ? 'tag-is-low' : ''
                }`}
              >
                {it.name}
              </span>
            ))}
            {remainingCount > 0 && (
              <span className="cat-preview-more-tag">+{remainingCount}</span>
            )}
          </div>
        </div>
      )}

      {/* Footer / Action Row */}
      <div className="category-card-footer" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="cat-view-items-btn"
          onClick={() => onClick && onClick(category, items)}
          title="Open items list modal"
        >
          <span>View Items ({totalItems})</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {canOrder && totalItems > 0 && (
          <button
            type="button"
            className="cat-quick-order-btn"
            onClick={(e) => {
              e.stopPropagation();
              onOrderCategory && onOrderCategory(category.name, items);
            }}
            title="Order materials from this category on WhatsApp"
            aria-label={`Order materials from ${category.name}`}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            <span>Order</span>
          </button>
        )}
      </div>
    </div>
  );
});

export default StockCategoryCard;
