import React from 'react';
import { useAuth } from '../../context/AuthContext';

export const QuotationCard = React.memo(function QuotationCard({
  quotation,
  onOpenEdit,
  onDirectWhatsAppShare,
  isSharing = false,
  onDelete,
}) {
  const { isAdmin } = useAuth();
  const cleanPhone = quotation.mobile_number ? quotation.mobile_number.replace(/[^0-9]/g, '') : '';
  const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  const handleCall = (e) => {
    e.stopPropagation();
    if (!cleanPhone) return;
    window.location.href = `tel:${cleanPhone}`;
  };

  const handleWhatsApp = (e) => {
    e.stopPropagation();
    if (!cleanPhone) return;
    const waNativeUrl = `whatsapp://send?phone=${waPhone}`;
    const waWebUrl = `https://wa.me/${waPhone}`;
    try {
      window.location.href = waNativeUrl;
      setTimeout(() => {
        if (!document.hidden) window.open(waWebUrl, '_blank');
      }, 500);
    } catch {
      window.open(waWebUrl, '_blank');
    }
  };

  const selectedItems = Array.isArray(quotation.items)
    ? quotation.items.filter((it) => it.selected !== false && (it.selected === true || parseFloat(it.qty) > 0 || parseFloat(it.amount) > 0 || !('selected' in it)))
    : [];
  const itemsCount = selectedItems.length;
  const itemsSummary = selectedItems
    .map((it) => `${it.name}${it.variant_name ? ` (${it.variant_name})` : ''}`)
    .join(', ');

  const getInitials = (name) => {
    if (!name) return 'QT';
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  };

  const statusColor =
    quotation.status === 'Approved'
      ? 'status-approved'
      : quotation.status === 'Sent'
      ? 'status-sent'
      : 'status-draft';

  return (
    <div
      className="quotation-card luxury-quotation-card"
      onClick={() => onOpenEdit(quotation)}
      role="button"
      tabIndex={0}
      title="Click to view/edit quotation"
    >
      {/* Top Header */}
      <div className="quotation-card-top">
        <div className="quotation-no-badge">
          <span className="quote-icon">📋</span>
          <span className="quote-number-text">{quotation.quotation_no}</span>
        </div>

        <div className="quotation-top-right">
          <span className={`quotation-status-pill ${statusColor}`}>
            {quotation.status || 'Draft'}
          </span>

          <div className="quotation-card-actions">
            <button
              type="button"
              className="action-btn edit-btn"
              onClick={(e) => {
                e.stopPropagation();
                onOpenEdit(quotation);
              }}
              title="Edit Quotation"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            {isAdmin && (
              <button
                type="button"
                className="action-btn delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(quotation);
                }}
                title="Delete Quotation"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Customer Profile Row */}
      <div className="quotation-customer-row">
        <div className="quotation-avatar">
          {getInitials(quotation.customer_name)}
        </div>
        <div className="quotation-customer-meta">
          <h4 className="quotation-customer-name">{quotation.customer_name}</h4>
          <span className="quotation-date-label">Date: {quotation.quotation_date}</span>
        </div>
      </div>

      {/* Truck Chassis Badge (if present) */}
      {quotation.truck_chassis_no && (
        <div className="order-owner-badge-row" style={{ marginBottom: '0.45rem' }}>
          <div className="order-owner-icon-wrap">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 17h4V5H2v12h3" />
              <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" />
              <circle cx="7.5" cy="17.5" r="2.5" />
              <circle cx="17.5" cy="17.5" r="2.5" />
            </svg>
          </div>
          <span className="order-owner-tag">TRUCK:</span>
          <span className="order-owner-text">{quotation.truck_chassis_no}</span>
        </div>
      )}

      {/* Body Work Badge (if present) */}
      {(quotation.body_calc?.has_data || Number(quotation.total_weight) > 0) && (
        <div className="quotation-body-badge">
          <span>🚛 બોડી સાઇઝ:</span>
          <strong>
            {quotation.body_calc?.taliyu?.length && quotation.body_calc?.taliyu?.width
              ? `${quotation.body_calc.taliyu.length}' × ${quotation.body_calc.taliyu.width}'`
              : 'સાઇઝ ઉપલબ્ધ'}
          </strong>
          {isAdmin && Number(quotation.total_weight || quotation.body_calc?.total_weight) > 0 && (
            <span> &bull; ⚖️ {Number(quotation.total_weight || quotation.body_calc?.total_weight).toLocaleString('en-IN')} kg</span>
          )}
          {isAdmin && Number(quotation.body_calc?.total_amount) > 0 && (
            <span> &bull; ₹{Number(quotation.body_calc.total_amount).toLocaleString('en-IN')}</span>
          )}
        </div>
      )}

      {/* Mobile Number & Direct Call / WhatsApp Actions */}
      <div
        className="worker-contact-row order-contact-row"
        style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="contact-mobile-link">
          {quotation.mobile_number ? (
            <>
              <span className="phone-icon-pill">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </span>
              <span className="mobile-number-text">{quotation.mobile_number}</span>
            </>
          ) : (
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Quotation #{quotation.quotation_no}</span>
          )}
        </div>

        <div className="contact-quick-actions" style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          {cleanPhone && (
            <button
              type="button"
              className="quick-contact-btn quick-call-btn"
              title={`Call ${quotation.customer_name}`}
              onClick={handleCall}
            >
              Call
            </button>
          )}
          <button
            type="button"
            className="quick-contact-btn quick-whatsapp-btn"
            title="Share Quotation directly via WhatsApp"
            onClick={(e) => {
              e.stopPropagation();
              onDirectWhatsAppShare?.(quotation);
            }}
            disabled={isSharing}
            style={{
              background: '#16a34a',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.78rem',
              padding: '0.36rem 0.72rem',
              borderRadius: '6px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              border: 'none',
              cursor: isSharing ? 'wait' : 'pointer',
              boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
            }}
          >
            <span>{isSharing ? '⏳' : '💬'}</span>
            <span>{isSharing ? 'શેર થાય છે...' : 'WhatsApp Share'}</span>
          </button>
        </div>
      </div>

      {/* Items Summary Snippet */}
      {itemsCount > 0 && (
        <div className="quotation-items-snippet">
          <span className="items-snippet-badge">{itemsCount} Items</span>
          <span className="items-snippet-text" title={itemsSummary}>
            {itemsSummary}
          </span>
        </div>
      )}

      {/* Price Breakdown & Final Price */}
      <div className="quotation-price-strip">
        <div className="quotation-price-left">
          {isAdmin && (
            <>
              <span className="subtotal-label">
                Subtotal: ₹{Number(quotation.subtotal).toLocaleString('en-IN')}
              </span>
              {Number(quotation.discount_percent) > 0 && (
                <span className="discount-tag">
                  -{quotation.discount_percent}% Disc (₹{Number(quotation.discount_amount).toLocaleString('en-IN')})
                </span>
              )}
            </>
          )}
        </div>

        <div className="quotation-price-right">
          <span className="final-price-label">FINAL PRICE</span>
          <span className="final-price-amount font-mono">
            ₹{Number(quotation.final_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
});

export default QuotationCard;

