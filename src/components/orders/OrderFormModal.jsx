import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DEFAULT_ORDER_DATA, ORDER_SECTIONS, calculateOrderProgress } from './orderConstants';

export function OrderFormModal({ isOpen, onClose, onSave, initialData }) {
  const [formData, setFormData] = useState(DEFAULT_ORDER_DATA);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (initialData) {
      setFormData(JSON.parse(JSON.stringify(initialData)));
    } else {
      const today = new Date().toISOString().split('T')[0];
      const newOrder = JSON.parse(JSON.stringify(DEFAULT_ORDER_DATA));
      newOrder.order_date = today;
      newOrder.entry_date = today;
      newOrder.order_no = `WO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      setFormData(newOrder);
    }
    setError('');
    setIsSubmitting(false);
  }, [initialData, isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const { total, done, percentage } = calculateOrderProgress(formData);

  // Field change handlers
  const handleBasicChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSectionBoxChange = (sectionKey, boxIndex, value) => {
    setFormData((prev) => {
      const copy = { ...prev };
      if (!copy[sectionKey]) copy[sectionKey] = { boxes: ['', '', ''], items: {} };
      if (!Array.isArray(copy[sectionKey].boxes)) copy[sectionKey].boxes = ['', '', ''];
      copy[sectionKey].boxes[boxIndex] = value;
      return copy;
    });
  };

  const handleSectionItemChange = (sectionKey, itemKey, field, value) => {
    setFormData((prev) => {
      const copy = { ...prev };
      if (!copy[sectionKey]) copy[sectionKey] = { boxes: ['', '', ''], items: {} };
      if (!copy[sectionKey].items) copy[sectionKey].items = {};
      if (!copy[sectionKey].items[itemKey]) {
        copy[sectionKey].items[itemKey] = { value: '', done: false };
      }
      copy[sectionKey].items[itemKey][field] = value;
      return copy;
    });
  };

  const handleFinishingItemChange = (itemKey, field, value) => {
    setFormData((prev) => {
      const copy = { ...prev };
      if (!copy.finishing_work) copy.finishing_work = {};
      if (!copy.finishing_work[itemKey]) {
        copy.finishing_work[itemKey] = { value: '', boxes: ['', '', ''], done: false };
      }
      copy.finishing_work[itemKey][field] = value;
      return copy;
    });
  };

  const handleFinishingBoxChange = (itemKey, boxIndex, value) => {
    setFormData((prev) => {
      const copy = { ...prev };
      if (!copy.finishing_work) copy.finishing_work = {};
      if (!copy.finishing_work[itemKey]) {
        copy.finishing_work[itemKey] = { value: '', boxes: ['', '', ''], done: false };
      }
      if (!Array.isArray(copy.finishing_work[itemKey].boxes)) {
        copy.finishing_work[itemKey].boxes = ['', '', ''];
      }
      copy.finishing_work[itemKey].boxes[boxIndex] = value;
      return copy;
    });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');

    if (!formData.owner_name?.trim()) {
      setError('गाड़ी मालिक का नाम (Owener Name) आवश्यक है');
      return;
    }
    if (!formData.truck_chassis_no?.trim()) {
      setError('ट्रक / चेसिस नं. (Truck/Chassis No) आवश्यक है');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave(formData);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Error saving work order';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div className="modal-backdrop-luxury luxury-glass-backdrop" onClick={onClose}>
      <div className="modern-order-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* ========================================================
            MODAL HEADER: EXECUTIVE AUTOMOTIVE STYLING
            ======================================================== */}
        <div className="modern-modal-header">
          <div className="modern-header-left">
            <div className="modern-modal-icon-badge">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 17h4V5H2v12h3" />
                <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" />
                <circle cx="7.5" cy="17.5" r="2.5" />
                <circle cx="17.5" cy="17.5" r="2.5" />
              </svg>
            </div>
            <div>
              <div className="header-badge-row">
                <span className="order-pill-badge">{initialData ? 'EDIT ORDER' : 'NEW ORDER'}</span>
                <span className="order-id-label">{formData.order_no || 'WO-NEW'}</span>
              </div>
              <h3 className="modern-modal-title">
                {initialData ? 'Edit Work Order / Job Card' : 'New Work Order / Job Card'}
              </h3>
              <p className="modern-modal-subtitle">
                Faizan Body Manufacturing • All-in-one Job Sheet Entry & Task Checkoffs
              </p>
            </div>
          </div>

          <div className="modern-header-right">
            <div className="modern-progress-box">
              <div className="progress-mini-label">
                <span>Completed:</span>
                <strong>{done} / {total} ({percentage}%)</strong>
              </div>
              <div className="modern-progress-mini-bar">
                <div
                  className={`modern-progress-mini-fill ${percentage === 100 ? 'fill-green' : ''}`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>

            <button type="button" className="btn-modern-print" onClick={handlePrint} title="Print or Save as PDF">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              <span>Print / PDF</span>
            </button>

            <button type="button" className="btn-modern-close" onClick={onClose} aria-label="Close" title="Close">
              ✕
            </button>
          </div>
        </div>

        {error && (
          <div className="modal-error-banner" style={{ margin: '1rem 1.5rem 0' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* ========================================================
            MODAL BODY: ALL SECTIONS TOGETHER IN ONE VIEW
            ======================================================== */}
        <form onSubmit={handleSubmit} className="modern-modal-form-shell">
          <div className="modern-modal-body-scroll" ref={scrollRef} id="printableSheet">
          {/* SECTION 1: HEADER VEHICLE & OWNER DETAILS */}
          <div className="modern-section-card basic-info-card">
            <div className="modern-card-header-line">
              <div className="card-title-group">
                <span className="card-num-badge">1</span>
                <h4 className="card-heading-title">Vehicle & Owner Information</h4>
              </div>
              <div className="status-selector-wrap">
                <label className="status-sel-lbl">Status:</label>
                <select
                  className="modern-select-pill"
                  value={formData.status || 'In Progress'}
                  onChange={(e) => handleBasicChange('status', e.target.value)}
                >
                  <option value="In Progress">⚡ In Progress</option>
                  <option value="Completed">✓ Completed</option>
                  <option value="Cancelled">✕ Cancelled</option>
                </select>
              </div>
            </div>

            <div className="modern-inputs-grid-3col">
              {/* Truck / Chassis No */}
              <div className="modern-form-field field-chassis-highlight">
                <label className="field-lbl required">
                  Truck / Chassis No *
                </label>
                <div className="input-with-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2">
                    <path d="M10 17h4V5H2v12h3" />
                    <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" />
                    <circle cx="7.5" cy="17.5" r="2.5" />
                    <circle cx="17.5" cy="17.5" r="2.5" />
                  </svg>
                  <input
                    type="text"
                    className="modern-input-ctrl chassis-input-text"
                    placeholder="e.g. GJ-01-AB-1234"
                    value={formData.truck_chassis_no || ''}
                    onChange={(e) => handleBasicChange('truck_chassis_no', e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Owner Name */}
              <div className="modern-form-field">
                <label className="field-lbl required">
                  Owener Name *
                </label>
                <div className="input-with-icon">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <input
                    type="text"
                    className="modern-input-ctrl"
                    placeholder="e.g. Ramesh Patel"
                    value={formData.owner_name || ''}
                    onChange={(e) => handleBasicChange('owner_name', e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div className="modern-form-field">
                <label className="field-lbl">
                  Mo. Number
                </label>
                <div className="input-with-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  <input
                    type="tel"
                    className="modern-input-ctrl"
                    placeholder="e.g. 9876543210"
                    value={formData.mobile_number || ''}
                    onChange={(e) => handleBasicChange('mobile_number', e.target.value)}
                  />
                </div>
              </div>

              {/* Order Date */}
              <div className="modern-form-field">
                <label className="field-lbl">
                  Order DATE
                </label>
                <input
                  type="date"
                  className="modern-input-ctrl"
                  value={formData.order_date || ''}
                  onChange={(e) => handleBasicChange('order_date', e.target.value)}
                />
              </div>

              {/* Entry Date */}
              <div className="modern-form-field">
                <label className="field-lbl">
                  ENTRY DATE
                </label>
                <input
                  type="date"
                  className="modern-input-ctrl"
                  value={formData.entry_date || ''}
                  onChange={(e) => handleBasicChange('entry_date', e.target.value)}
                />
              </div>

              {/* Shade No */}
              <div className="modern-form-field">
                <label className="field-lbl">
                  Shade No
                </label>
                <input
                  type="text"
                  className="modern-input-ctrl"
                  placeholder="e.g. Royal Blue / 402"
                  value={formData.shade_no || ''}
                  onChange={(e) => handleBasicChange('shade_no', e.target.value)}
                />
              </div>

              {/* Condition (Span 2 col) */}
              <div className="modern-form-field field-span-full">
                <label className="field-lbl">
                  Condison
                </label>
                <input
                  type="text"
                  className="modern-input-ctrl"
                  placeholder="e.g. Cabin and body fabrication specifications..."
                  value={formData.condition_text || ''}
                  onChange={(e) => handleBasicChange('condition_text', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ========================================================
              ALL WORK SECTIONS: CABIN, INSIDE, BODY, ACCESSORIES, FINISHING, MACHRO
              ======================================================== */}
          {ORDER_SECTIONS.map((sec, secIdx) => {
            if (sec.isFinishing) {
              // Section 5: Finishing Work (COLOR, REDIUM, PAINTING, VAYRING)
              const finishingData = formData.finishing_work || {};

              return (
                <div key={sec.key} className="modern-section-card finishing-section-card">
                  <div className="modern-card-header-line">
                    <div className="card-title-group">
                      <span className="card-num-badge">5</span>
                      <div>
                        <h4 className="card-heading-title">
                          {sec.titleHindi} <span className="eng-sub">({sec.titleEnglish})</span>
                        </h4>
                        <span className="card-hint-sub">3 blank boxes & Right (✓) checkoff included</span>
                      </div>
                    </div>
                  </div>

                  <div className="finishing-grid-cards">
                    {sec.items.map((item) => {
                      const itemData = finishingData[item.key] || { value: '', boxes: ['', '', ''], done: false };
                      const isDone = !!itemData.done;
                      const boxes = itemData.boxes || ['', '', ''];

                      return (
                        <div key={item.key} className={`modern-finishing-item-box ${isDone ? 'box-is-done' : ''}`}>
                          <div className="finishing-item-top">
                            {/* Checkbox (Right ✓) */}
                            <div
                              className={`modern-checkbox-square ${isDone ? 'checked-green' : ''}`}
                              onClick={() => handleFinishingItemChange(item.key, 'done', !isDone)}
                              role="button"
                              tabIndex={0}
                              title="Click to mark complete (✓)"
                            >
                              {isDone ? <span className="check-tick">✓</span> : <span className="empty-box-dot"></span>}
                            </div>

                            <div className="finishing-names">
                              <span className="finishing-hi">{item.label}</span>
                              <span className="finishing-en">({item.subLabel})</span>
                            </div>

                            {/* 3 Blank Boxes */}
                            <div className="three-blank-boxes-group">
                              <input
                                type="text"
                                placeholder="Box 1"
                                className="box-rect-input"
                                value={boxes[0] || ''}
                                onChange={(e) => handleFinishingBoxChange(item.key, 0, e.target.value)}
                              />
                              <input
                                type="text"
                                placeholder="Box 2"
                                className="box-rect-input"
                                value={boxes[1] || ''}
                                onChange={(e) => handleFinishingBoxChange(item.key, 1, e.target.value)}
                              />
                              <input
                                type="text"
                                placeholder="Box 3"
                                className="box-rect-input"
                                value={boxes[2] || ''}
                                onChange={(e) => handleFinishingBoxChange(item.key, 2, e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="finishing-item-bottom">
                            <input
                              type="text"
                              className="modern-input-ctrl line-input"
                              placeholder={`Enter ${item.label} (${item.subLabel}) details...`}
                              value={itemData.value || ''}
                              onChange={(e) => handleFinishingItemChange(item.key, 'value', e.target.value)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // Regular Sections: Cabin Work (2), Inside Work (3), Body Work (4), Accessories (5), Machro (6)
            const secData = formData[sec.key] || { boxes: ['', '', ''], items: {} };
            const secBoxes = secData.boxes || ['', '', ''];
            const itemsData = secData.items || {};

            return (
              <div
                key={sec.key}
                className={`modern-section-card ${sec.isMovedDown ? 'machro-moved-card' : ''}`}
              >
                {/* Section Header with 3 Blank Boxes */}
                <div className="modern-card-header-line">
                  <div className="card-title-group">
                    <span className="card-num-badge">{sec.isMovedDown ? '6' : secIdx + 1}</span>
                    <div>
                      <h4 className="card-heading-title">
                        {sec.titleHindi} <span className="eng-sub">({sec.titleEnglish})</span>
                      </h4>
                      {sec.isMovedDown && (
                        <span className="moved-down-tag">↓ एरो के अनुसार फिनिशिंग के बाद रखा गया</span>
                      )}
                    </div>
                  </div>

                  {/* 3 Blank Boxes */}
                  <div className="three-blank-boxes-container">
                    <span className="boxes-title-hint">3 Boxes:</span>
                    <div className="three-blank-boxes-group">
                      <input
                        type="text"
                        placeholder="Box 1"
                        className="box-rect-input"
                        value={secBoxes[0] || ''}
                        onChange={(e) => handleSectionBoxChange(sec.key, 0, e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Box 2"
                        className="box-rect-input"
                        value={secBoxes[1] || ''}
                        onChange={(e) => handleSectionBoxChange(sec.key, 1, e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Box 3"
                        className="box-rect-input"
                        value={secBoxes[2] || ''}
                        onChange={(e) => handleSectionBoxChange(sec.key, 2, e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Section Items Grid */}
                <div className="modern-items-list">
                  {sec.items.map((item) => {
                    const itemData = itemsData[item.key] || { value: '', done: false };
                    const isDone = !!itemData.done;

                    return (
                      <div key={item.key} className={`modern-item-row ${isDone ? 'row-is-completed' : ''}`}>
                        {/* Checkbox (Right ✓) */}
                        <div
                          className={`modern-checkbox-square ${isDone ? 'checked-green' : ''}`}
                          onClick={() => handleSectionItemChange(sec.key, item.key, 'done', !isDone)}
                          role="button"
                          tabIndex={0}
                          title="Click to mark complete (✓)"
                        >
                          {isDone ? <span className="check-tick">✓</span> : <span className="empty-box-dot"></span>}
                        </div>

                        {/* Item Label (Hindi item label as per physical paper sheet) */}
                        <div className="item-label-wrap">
                          <span className="item-hindi-label">{item.label}</span>
                        </div>

                        {/* Value Input */}
                        <div className="item-input-wrap">
                          <input
                            type="text"
                            className="modern-input-ctrl line-input"
                            placeholder="Enter details..."
                            value={itemData.value || ''}
                            onChange={(e) =>
                              handleSectionItemChange(sec.key, item.key, 'value', e.target.value)
                            }
                          />
                        </div>

                        {/* Extra field (Jaali -> Vel) */}
                        {item.extraKey && (
                          <div className="item-extra-field-wrap">
                            <span className="extra-lbl">{item.extraLabel}:</span>
                            <input
                              type="text"
                              className="modern-input-ctrl line-input extra-input"
                              placeholder="वेल..."
                              value={itemsData[item.extraKey]?.value || ''}
                              onChange={(e) =>
                                handleSectionItemChange(sec.key, item.extraKey, 'value', e.target.value)
                              }
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* SECTION 7: SIGNATURES & NOTES */}
          <div className="modern-section-card signatures-card">
            <div className="modern-card-header-line">
              <div className="card-title-group">
                <span className="card-num-badge">7</span>
                <h4 className="card-heading-title">Signatures & Notes</h4>
              </div>
            </div>

            <div className="modern-signatures-grid">
              <div className="signature-input-group">
                <label className="sig-lbl">M. D SIGNATURE</label>
                <div className="sig-input-box">
                  <input
                    type="text"
                    className="sig-ctrl"
                    placeholder="M.D Name / Signature"
                    value={formData.md_signature || ''}
                    onChange={(e) => handleBasicChange('md_signature', e.target.value)}
                  />
                  <div className="sig-line-draw"></div>
                </div>
              </div>

              <div className="signature-input-group">
                <label className="sig-lbl">PARTY OWNER SIGNATURE</label>
                <div className="sig-input-box">
                  <input
                    type="text"
                    className="sig-ctrl"
                    placeholder="Party / Owner Name"
                    value={formData.party_owner_signature || ''}
                    onChange={(e) => handleBasicChange('party_owner_signature', e.target.value)}
                  />
                  <div className="sig-line-draw"></div>
                </div>
              </div>
            </div>

            <div className="modern-form-field" style={{ marginTop: '1rem' }}>
              <label className="field-lbl">Notes / Special Instructions</label>
              <textarea
                className="modern-input-ctrl notes-textarea"
                rows={2}
                placeholder="Any special fabrication instructions or terms..."
                value={formData.notes || ''}
                onChange={(e) => handleBasicChange('notes', e.target.value)}
              />
            </div>
          </div>
        </div>

          {/* ========================================================
              STICKY BOTTOM ACTION BAR (Save / Print / Cancel)
              ======================================================== */}
          <div className="modern-modal-sticky-footer no-print">
            <div className="footer-left">
              <button type="button" className="btn btn-secondary-luxury btn-cancel" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </button>
            </div>

            <div className="footer-right">
              <button type="button" className="btn-modern-print-footer" onClick={handlePrint}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                Print / PDF
              </button>

              <button type="submit" className="btn-modern-save-submit" disabled={isSubmitting}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
                <span>{isSubmitting ? 'Saving...' : initialData ? 'Update Order' : 'Save Work Order'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default OrderFormModal;
