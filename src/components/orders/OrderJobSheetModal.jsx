import React from 'react';
import { createPortal } from 'react-dom';
import { ORDER_SECTIONS, calculateOrderProgress } from './orderConstants';

export function OrderJobSheetModal({ isOpen, onClose, order, onToggleTask, onEdit, onDelete, isAdmin }) {
  if (!isOpen || !order) return null;

  const { total, done, percentage } = calculateOrderProgress(order);

  const handlePrint = () => {
    window.print();
  };

  const renderSectionHeaderBoxes = (boxes = ['', '', '']) => {
    return (
      <div className="sheet-header-three-boxes">
        <div className="sheet-mini-box">{boxes[0] || ''}</div>
        <div className="sheet-mini-box">{boxes[1] || ''}</div>
        <div className="sheet-mini-box">{boxes[2] || ''}</div>
      </div>
    );
  };

  return createPortal(
    <div className="modal-backdrop-luxury printable-modal-backdrop" onClick={onClose}>
      <div className="jobsheet-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Top Control Bar (Hidden during Print) */}
        <div className="jobsheet-toolbar no-print">
          <div className="jobsheet-toolbar-left">
            <div className="jobsheet-tag">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <span>FAIZAN BODY WORK ORDER</span>
            </div>
            <span className="jobsheet-order-title">{order.order_no || `#${order.id}`}</span>
          </div>

          <div className="jobsheet-toolbar-right">
            <div className="jobsheet-quick-progress">
              <span className="quick-progress-text">
                काम: <strong>{done}</strong> / {total} ({percentage}%)
              </span>
            </div>

            <button type="button" className="btn-jobsheet-action btn-print-jobsheet" onClick={handlePrint}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              प्रिंट / PDF
            </button>

            <button
              type="button"
              className="btn-jobsheet-action btn-edit-jobsheet"
              onClick={() => {
                onClose();
                onEdit(order);
              }}
              title="वर्क आर्डर एडिट करें"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              एडिट
            </button>

            {onDelete && (
              <button
                type="button"
                className="btn-jobsheet-action btn-delete-jobsheet"
                style={{ background: '#ef4444', color: '#fff' }}
                onClick={() => {
                  onClose();
                  onDelete(order);
                }}
                title="वर्क आर्डर हटाएं"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                डिलीट
              </button>
            )}

            <button type="button" className="jobsheet-close-btn" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        {/* Informative Tip for User */}
        <div className="jobsheet-tap-hint no-print">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>
            काम पूरा होने पर साइड वाले डिब्बे (box) पर क्लिक करके <strong>राइट (✓)</strong> करें।
          </span>
        </div>

        {/* Printable Physical Sheet Format */}
        <div className="printable-sheet-paper" id="printableSheet">
          {/* Header Section from Image 1 */}
          <div className="sheet-top-header">
            <div className="sheet-header-line line-1">
              <div className="sheet-field-group">
                <span className="sheet-field-label">Order DATE :</span>
                <span className="sheet-field-underline">{order.order_date || '________________'}</span>
              </div>
              <div className="sheet-field-group">
                <span className="sheet-field-label">Condison :</span>
                <span className="sheet-field-underline">{order.condition_text || '________________'}</span>
              </div>
            </div>

            <div className="sheet-header-line line-2">
              <div className="sheet-field-group">
                <span className="sheet-field-label">Owener Name :</span>
                <span className="sheet-field-underline">{order.owner_name || '________________'}</span>
              </div>
              <div className="sheet-field-group">
                <span className="sheet-field-label">ENTRY DATE :</span>
                <span className="sheet-field-underline">{order.entry_date || '________________'}</span>
              </div>
            </div>

            <div className="sheet-header-line line-3">
              <div className="sheet-field-group">
                <span className="sheet-field-label">Mo. Number :</span>
                <span className="sheet-field-underline">{order.mobile_number || '________________'}</span>
              </div>
              <div className="sheet-field-group">
                <span className="sheet-field-label">Truck/Chassis No :</span>
                <span className="sheet-field-underline highlight-bold">{order.truck_chassis_no || '________________'}</span>
              </div>
              <div className="sheet-field-group">
                <span className="sheet-field-label">Shade No :</span>
                <span className="sheet-field-underline">{order.shade_no || '________________'}</span>
              </div>
            </div>
          </div>

          <div className="sheet-divider-line"></div>

          {/* Sections Loop */}
          {ORDER_SECTIONS.map((sec) => {
            if (sec.isFinishing) {
              // Finishing Work: COLOR, REDIUM, PAINTING, VAYRING
              const finishingData = order.finishing_work || {};
              return (
                <div key={sec.key} className="sheet-section sheet-section-finishing">
                  <div className="sheet-section-content">
                    {sec.items.map((item) => {
                      const itemData = finishingData[item.key] || { value: '', boxes: ['', '', ''], done: false };
                      const isDone = !!itemData.done;

                      return (
                        <div key={item.key} className={`sheet-item-row finishing-row ${isDone ? 'row-done' : ''}`}>
                          {/* Checkbox Box */}
                          <div
                            className={`sheet-check-box ${isDone ? 'box-checked' : ''}`}
                            onClick={() => onToggleTask('finishing_work', item.key, !isDone)}
                            role="button"
                            tabIndex={0}
                            title="क्लिक करके काम पूरा (राइट) करें"
                          >
                            {isDone && <span className="check-mark">✓</span>}
                          </div>

                          {/* Label */}
                          <div className="sheet-item-label-wrap">
                            <span className="sheet-item-label">
                              {item.label} ({item.subLabel}):
                            </span>
                          </div>

                          {/* Text Value */}
                          <div className="sheet-item-value-underline">
                            <span className="item-text-val">{itemData.value || ''}</span>
                          </div>

                          {/* 3 Blank Boxes */}
                          <div className="sheet-finishing-boxes">
                            <div className="sheet-mini-box">{itemData.boxes?.[0] || ''}</div>
                            <div className="sheet-mini-box">{itemData.boxes?.[1] || ''}</div>
                            <div className="sheet-mini-box">{itemData.boxes?.[2] || ''}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // Regular Sections: Cabin Work, Inside Work, Body Work, Accessories, Machro
            const secData = order[sec.key] || { boxes: ['', '', ''], items: {} };
            const itemsData = secData.items || {};

            return (
              <div
                key={sec.key}
                className={`sheet-section ${sec.isMovedDown ? 'sheet-section-machro-moved' : ''}`}
              >
                {/* Section Header with 3 Blank Boxes */}
                <div className="sheet-section-header">
                  <div className="sheet-header-title">
                    <span className="hindi-title">{sec.titleHindi}</span>
                    <span className="english-title">({sec.titleEnglish})</span>
                  </div>
                  {renderSectionHeaderBoxes(secData.boxes)}
                </div>

                {/* Section Items */}
                <div className="sheet-section-content">
                  {sec.items.map((item) => {
                    const itemData = itemsData[item.key] || { value: '', done: false };
                    const isDone = !!itemData.done;

                    return (
                      <div key={item.key} className={`sheet-item-row ${isDone ? 'row-done' : ''}`}>
                        {/* Checkbox box (clickable on screen) */}
                        <div
                          className={`sheet-check-box ${isDone ? 'box-checked' : ''}`}
                          onClick={() => onToggleTask(sec.key, item.key, !isDone)}
                          role="button"
                          tabIndex={0}
                          title="क्लिक करके काम पूरा (राइट) करें"
                        >
                          {isDone && <span className="check-mark">✓</span>}
                        </div>

                        {/* Label */}
                        <div className="sheet-item-label-wrap">
                          <span className="sheet-item-label">{item.label}:</span>
                        </div>

                        {/* Underline Value */}
                        <div className="sheet-item-value-underline">
                          <span className="item-text-val">{itemData.value || ''}</span>
                        </div>

                        {/* Extra field for Jaali -> Vel */}
                        {item.extraKey && (
                          <div className="sheet-extra-field-inline">
                            <span className="extra-label">{item.extraLabel}:</span>
                            <span className="extra-val">{itemsData[item.extraKey]?.value || ''}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Notes if present */}
          {order.notes && (
            <div className="sheet-notes-section">
              <span className="notes-label">विशेष टिप्पणी / Notes:</span>
              <span className="notes-content">{order.notes}</span>
            </div>
          )}

          {/* Signatures from Image 2 */}
          <div className="sheet-signature-section">
            <div className="signature-box">
              <div className="signature-line">
                <span className="signature-val">{order.md_signature || ''}</span>
              </div>
              <span className="signature-title">M. D SIGNATURE</span>
            </div>

            <div className="signature-box">
              <div className="signature-line">
                <span className="signature-val">{order.party_owner_signature || ''}</span>
              </div>
              <span className="signature-title">PARTY OWNER SIGNATURE</span>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default OrderJobSheetModal;
