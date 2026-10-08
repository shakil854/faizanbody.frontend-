import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ORDER_SECTIONS } from './orderConstants';
import { sharePdfFile, downloadPdfFile } from '../../utils/pdfGenerator';

export function OrderJobSheetModal({ isOpen, onClose, order }) {
  const [selectedSection, setSelectedSection] = useState('all'); // used for rendering #printableSheet
  const [chosenFunction, setChosenFunction] = useState('body_work'); // selected 1-6 function
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfToast, setPdfToast] = useState('');

  if (!isOpen || !order) return null;

  const activeChosenSecInfo = ORDER_SECTIONS.find((s) => s.key === chosenFunction);
  const activeChosenSecIndex = ORDER_SECTIONS.findIndex((s) => s.key === chosenFunction) + 1;

  // 1. Share PDF directly to WhatsApp / Apps
  const handleShareDirect = async (sectionKey) => {
    try {
      setIsGeneratingPdf(true);
      setSelectedSection(sectionKey);
      setPdfToast('⏳ PDF तैयार हो रही है, WhatsApp खुल रहा है...');

      // Allow DOM to update #printableSheet with the chosen section
      await new Promise((r) => setTimeout(r, 80));

      const cleanTruck = (order.truck_chassis_no || 'order').replace(/[^a-zA-Z0-9_-]/g, '_');
      const activeSec = sectionKey !== 'all'
        ? ORDER_SECTIONS.find((s) => s.key === sectionKey)
        : null;

      const secIndex = activeSec
        ? ORDER_SECTIONS.findIndex((s) => s.key === sectionKey) + 1
        : null;

      const secName = activeSec
        ? `${secIndex}_${activeSec.titleHindi.replace(/\s+/g, '_')}`
        : 'पूरा_आर्डर';

      const fileName = `FaizanBody_${cleanTruck}_${secName}.pdf`;
      const slipTitle = activeSec
        ? `Faizan Body Works - ${secIndex}. ${activeSec.titleHindi} (${activeSec.titleEnglish})`
        : `Faizan Body Works - पूरा आर्डर (${order.truck_chassis_no || 'Order'})`;

      const result = await sharePdfFile({
        elementId: 'printableSheet',
        fileName,
        title: slipTitle,
        text: `Job Slip PDF: ${order.truck_chassis_no || 'Order'} - ${activeSec ? `${secIndex}. ${activeSec.titleHindi}` : 'पूरा आर्डर'} (Shade: ${order.shade_no || '—'})`,
      });

      if (result?.method === 'downloaded') {
        setPdfToast('✅ PDF डाउनलोड हो गई है! आप इसे सीधे WhatsApp में भेज सकते हैं।');
        setTimeout(() => setPdfToast(''), 5000);
      } else {
        setPdfToast('');
      }
    } catch (err) {
      console.error('Error sharing PDF:', err);
      setPdfToast('⚠️ PDF तैयार करने में समस्या आई।');
      setTimeout(() => setPdfToast(''), 4000);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 2. Download PDF directly
  const handleDownloadDirect = async (sectionKey) => {
    try {
      setIsGeneratingPdf(true);
      setSelectedSection(sectionKey);
      setPdfToast('Downloading PDF...');

      await new Promise((r) => setTimeout(r, 80));

      const cleanTruck = (order.truck_chassis_no || 'order').replace(/[^a-zA-Z0-9_-]/g, '_');
      const activeSec = sectionKey !== 'all'
        ? ORDER_SECTIONS.find((s) => s.key === sectionKey)
        : null;

      const secIndex = activeSec
        ? ORDER_SECTIONS.findIndex((s) => s.key === sectionKey) + 1
        : null;

      const secName = activeSec
        ? `${secIndex}_${activeSec.titleHindi.replace(/\s+/g, '_')}`
        : 'पूरा_आर्डर';

      const fileName = `FaizanBody_${cleanTruck}_${secName}.pdf`;

      await downloadPdfFile({
        elementId: 'printableSheet',
        fileName,
      });

      setPdfToast(`✅ ${activeSec ? `${secIndex}. ${activeSec.titleHindi}` : 'पूरा आर्डर'} PDF सेव हो गई!`);
      setTimeout(() => setPdfToast(''), 3000);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setPdfToast('Failed to download PDF');
      setTimeout(() => setPdfToast(''), 3000);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Determine sections displayed inside the hidden printable sheet
  const page1Sections = ORDER_SECTIONS.slice(0, 3); // Cabin, Inside, Body
  const page2Sections = ORDER_SECTIONS.slice(3, 6); // Machro, Accessories, Finishing

  const activeSectionInfo = selectedSection !== 'all'
    ? ORDER_SECTIONS.find((s) => s.key === selectedSection)
    : null;

  // Render individual section with fields and checkboxes
  const renderSection = (sec) => {
    if (!sec) return null;
    if (sec.isFinishing) {
      const finishingData = order.finishing_work || {};
      return (
        <div key={sec.key} className="sheet-section sheet-section-finishing">
          <div className="sheet-section-header">
            <div className="sheet-header-title">
              <span className="hindi-title">{sec.titleHindi}</span>
              <span className="english-title">({sec.titleEnglish})</span>
            </div>
          </div>

          <div className="sheet-section-content">
            {sec.items.map((item) => {
              const itemData = finishingData[item.key] || { value: '', boxes: ['', '', ''], done: false };
              const isDone = !!itemData.done;

              return (
                <div key={item.key} className={`sheet-item-row finishing-row ${isDone ? 'row-done' : ''}`}>
                  <div className={`sheet-check-box ${isDone ? 'box-checked' : ''}`}>
                    {isDone && <span className="check-mark">✓</span>}
                  </div>

                  <div className="sheet-item-label-wrap">
                    <span className="sheet-item-label">
                      {item.label} ({item.subLabel}):
                    </span>
                  </div>

                  <div className="sheet-item-value-underline">
                    <span className="item-text-val">{itemData.value || ''}</span>
                  </div>

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

    const secData = order[sec.key] || { boxes: ['', '', ''], items: {} };
    const itemsData = secData.items || {};

    return (
      <div key={sec.key} className="sheet-section">
        <div className="sheet-section-header">
          <div className="sheet-header-title">
            <span className="hindi-title">{sec.titleHindi}</span>
            <span className="english-title">({sec.titleEnglish})</span>
          </div>
          <div className="sheet-header-three-boxes">
            <div className="sheet-mini-box">{secData.boxes?.[0] || ''}</div>
            <div className="sheet-mini-box">{secData.boxes?.[1] || ''}</div>
            <div className="sheet-mini-box">{secData.boxes?.[2] || ''}</div>
          </div>
        </div>

        <div className="sheet-section-content">
          {sec.items.map((item) => {
            const itemData = itemsData[item.key] || { value: '', done: false };
            const isDone = !!itemData.done;

            return (
              <div key={item.key} className={`sheet-item-row ${isDone ? 'row-done' : ''}`}>
                <div className={`sheet-check-box ${isDone ? 'box-checked' : ''}`}>
                  {isDone && <span className="check-mark">✓</span>}
                </div>

                <div className="sheet-item-label-wrap">
                  <span className="sheet-item-label">{item.label}:</span>
                </div>

                <div className="sheet-item-value-underline">
                  <span className="item-text-val">{itemData.value || ''}</span>
                </div>

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
  };

  return createPortal(
    <div className="modal-backdrop-luxury printable-modal-backdrop pdf-share-modal-backdrop" onClick={onClose}>
      {/* ========================================================
          CLEAN PDF SHARE DIALOG (NOT A CONFUSING FORM!)
          ======================================================== */}
      <div className="android-dialog luxury-dialog pdf-share-luxury-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Top-Right Quick Close Button */}
        <button
          type="button"
          className="pdf-dialog-corner-close"
          onClick={onClose}
          aria-label="Close"
          title="बंद करें"
        >
          ✕
        </button>

        {/* Top Icon Badge & Title */}
        <div className="dialog-icon-wrapper" style={{ background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)', color: '#2563eb' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </div>

        <h3 className="dialog-title" style={{ textAlign: 'center', marginBottom: '0.2rem' }}>
          PDF शेयर करें (WhatsApp & डाउनलोड)
        </h3>
        <p className="dialog-message" style={{ textAlign: 'center', marginBottom: '1rem' }}>
          पूरा आर्डर या 1 से 6 में से किसी भी काम की अलग PDF स्लिप सीधे WhatsApp पर भेजें
        </p>

        {/* Truck Chassis No & Shade No Info Banner */}
        <div className="pdf-summary-vehicle-strip">
          <div className="summary-truck-card">
            <span className="summary-card-lbl">Truck / Chassis No *</span>
            <div className="summary-card-val">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.3">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
              <strong>{order.truck_chassis_no || '—'}</strong>
            </div>
          </div>

          <div className="summary-shade-card">
            <span className="summary-card-lbl">Shade No</span>
            <strong className="summary-shade-val">{order.shade_no || '—'}</strong>
          </div>

          <div className="summary-owner-card">
            <span className="summary-card-lbl">Owner / मालिक</span>
            <strong className="summary-owner-val">{order.owner_name || '—'}</strong>
          </div>
        </div>

        {/* Real-time PDF Status Toast */}
        {pdfToast && (
          <div className="pdf-status-alert-banner">
            <span>{pdfToast}</span>
          </div>
        )}

        {/* DIALOG MAIN OPTIONS */}
        <div className="pdf-options-container">
          {/* OPTION 1: COMPLETE FULL ORDER PDF (2 PAGES) */}
          <div className="pdf-choice-card full-order-card">
            <div className="choice-header">
              <span className="choice-badge">1</span>
              <div className="choice-title-group">
                <h4 className="choice-heading">पूरा आर्डर PDF (Complete Work Order - 2 Pages)</h4>
                <p className="choice-subtext">सभी काम, पूरी डिटेल व डिजिटल हस्ताक्षर सहित (2 पेज)</p>
              </div>
            </div>

            <div className="choice-actions-row">
              <button
                type="button"
                className="btn-pdf-share-wa"
                onClick={() => handleShareDirect('all')}
                disabled={isGeneratingPdf}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                <span>{isGeneratingPdf && selectedSection === 'all' ? 'PDF बन रहा है...' : 'पूरा PDF WhatsApp पर भेजें'}</span>
              </button>

              <button
                type="button"
                className="btn-pdf-download-file"
                onClick={() => handleDownloadDirect('all')}
                disabled={isGeneratingPdf}
                title="Download full order PDF file"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>डाउनलोड</span>
              </button>
            </div>
          </div>

          {/* OPTION 2: INDIVIDUAL 1 TO 6 FUNCTION SLIP (1 PAGE) */}
          <div className="pdf-choice-card single-function-card">
            <div className="choice-header">
              <span className="choice-badge" style={{ background: '#f59e0b', color: '#ffffff' }}>2</span>
              <div className="choice-title-group">
                <h4 className="choice-heading">1 से 6 मेन फंक्शन की अलग स्लिप (1 Page Slip)</h4>
                <p className="choice-subtext">कारीगर को केवल उसका काम भेजने के लिए (सिर्फ Truck No व Shade No):</p>
              </div>
            </div>

            {/* 6 Clean Selection Chips */}
            <div className="function-chips-selector">
              {ORDER_SECTIONS.map((sec, idx) => (
                <button
                  key={sec.key}
                  type="button"
                  className={`function-chip-pill ${chosenFunction === sec.key ? 'active' : ''}`}
                  onClick={() => setChosenFunction(sec.key)}
                >
                  <span className="chip-pill-num">{idx + 1}</span>
                  <span className="chip-pill-text">{sec.titleHindi}</span>
                </button>
              ))}
            </div>

            {/* Action Button for Selected Function */}
            <div className="choice-actions-row">
              <button
                type="button"
                className="btn-pdf-share-wa"
                onClick={() => handleShareDirect(chosenFunction)}
                disabled={isGeneratingPdf}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
                <span>
                  {isGeneratingPdf && selectedSection === chosenFunction
                    ? 'PDF बन रहा है...'
                    : `${activeChosenSecIndex}. ${activeChosenSecInfo?.titleHindi} PDF WhatsApp भेजें`}
                </span>
              </button>

              <button
                type="button"
                className="btn-pdf-download-file"
                onClick={() => handleDownloadDirect(chosenFunction)}
                disabled={isGeneratingPdf}
                title="Download selected function slip"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                <span>डाउनलोड</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dialog Actions / Close */}
        <div className="dialog-actions" style={{ justifyContent: 'center', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} style={{ minWidth: '130px' }}>
            बंद करें (Close)
          </button>
        </div>
      </div>

      {/* ========================================================
          BACKGROUND PRINTABLE PAPER CONTAINER
          Used by pdfGenerator to create exact 2-page or 1-page A4 PDF.
          ======================================================== */}
      <div
        style={{
          position: 'fixed',
          top: '0',
          left: '-9999px',
          width: '794px',
          zIndex: -99999,
          pointerEvents: 'none',
          opacity: 0.01,
          backgroundColor: '#ffffff',
        }}
        aria-hidden="true"
      >
        <div className="printable-sheet-paper" id="printableSheet">
          {selectedSection === 'all' ? (
            /* ========================================================
               CASE A: FULL COMPLETE WORK ORDER (STRICTLY 2 PAGES)
               ======================================================== */
            <div className="pdf-two-page-wrapper">
              {/* --- PAGE 1 OF 2 --- */}
              <div className="pdf-page-container pdf-page-1">
                <div className="sheet-top-header">
                  <div className="sheet-brand-heading">
                    <h2 className="workshop-name-title">FAIZAN BODY WORKS</h2>
                    <span className="workshop-slip-type">COMPLETE WORK ORDER (पेज 1/2)</span>
                  </div>

                  {/* Prominent Truck / Chassis No & Shade No */}
                  <div className="sheet-prominent-truck-strip">
                    <div className="truck-prominent-card">
                      <span className="prominent-card-title">Truck / Chassis No *</span>
                      <div className="prominent-card-val-row">
                        <span className="truck-card-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="1" y="3" width="15" height="13" />
                            <polygon points="16 8 20 8 23 11 23 16 16 8" />
                            <circle cx="5.5" cy="18.5" r="2.5" />
                            <circle cx="18.5" cy="18.5" r="2.5" />
                          </svg>
                        </span>
                        <span className="truck-chassis-prominent-number">
                          {order.truck_chassis_no || '________________'}
                        </span>
                      </div>
                    </div>

                    <div className="shade-prominent-card">
                      <span className="prominent-card-title">Shade No</span>
                      <span className="shade-prominent-number">
                        {order.shade_no || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Full Order Header Rows */}
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
                      <span className="sheet-field-label">Order No :</span>
                      <span className="sheet-field-underline highlight-bold">{order.order_no || `#${order.id}`}</span>
                    </div>
                  </div>
                </div>

                <div className="sheet-divider-line"></div>

                {/* Page 1: Sections 1. Cabin Work, 2. Inside Work, 3. Body Work */}
                <div className="sheet-sections-group">
                  {page1Sections.map(renderSection)}
                </div>

                <div className="sheet-page-number-footer">
                  <span>Faizan Body Works — Complete Order • Page 1 of 2</span>
                </div>
              </div>

              {/* STRICT HARD PAGE BREAK */}
              <div className="html2pdf__page-break" style={{ pageBreakBefore: 'always', breakBefore: 'page' }}></div>

              {/* --- PAGE 2 OF 2 --- */}
              <div className="pdf-page-container pdf-page-2">
                <div className="sheet-top-header sheet-page2-header">
                  <div className="sheet-page2-substrip">
                    <div className="page2-brand">
                      <strong>FAIZAN BODY WORKS</strong> — COMPLETE WORK ORDER (पेज 2/2)
                    </div>
                    <div className="page2-vehicle-ref">
                      <span>Truck No: <strong>{order.truck_chassis_no || '—'}</strong></span>
                      <span>Shade No: <strong>{order.shade_no || '—'}</strong></span>
                      <span>Order: <strong>{order.order_no || `#${order.id}`}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="sheet-divider-line"></div>

                {/* Page 2: Sections 4. Machro, 5. Accessories, 6. Finishing Work */}
                <div className="sheet-sections-group">
                  {page2Sections.map(renderSection)}
                </div>

                {/* Notes if present */}
                {order.notes && (
                  <div className="sheet-notes-section">
                    <span className="notes-label">विशेष टिप्पणी / Notes:</span>
                    <span className="notes-content">{order.notes}</span>
                  </div>
                )}

                {/* Signatures on Page 2 */}
                <div className="sheet-signature-section">
                  <div className="signature-box">
                    <div className="signature-line">
                      {order.md_signature && (order.md_signature.startsWith('data:image/') || order.md_signature.startsWith('http') || order.md_signature.startsWith('/')) ? (
                        <img src={order.md_signature} alt="M.D Signature" className="signature-rendered-img" />
                      ) : (
                        <span className="signature-val">{order.md_signature || ''}</span>
                      )}
                    </div>
                    <span className="signature-title">M. D SIGNATURE</span>
                  </div>

                  <div className="signature-box">
                    <div className="signature-line">
                      {order.party_owner_signature && (order.party_owner_signature.startsWith('data:image/') || order.party_owner_signature.startsWith('http') || order.party_owner_signature.startsWith('/')) ? (
                        <img src={order.party_owner_signature} alt="Party Owner Signature" className="signature-rendered-img" />
                      ) : (
                        <span className="signature-val">{order.party_owner_signature || ''}</span>
                      )}
                    </div>
                    <span className="signature-title">PARTY OWNER SIGNATURE</span>
                  </div>
                </div>

                <div className="sheet-page-number-footer">
                  <span>Faizan Body Works — Complete Order • Page 2 of 2</span>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================
               CASE B: SINGLE MODULE SLIP (STRICTLY 1 PAGE)
               ONLY Chassis No & Shade No & Selected Module Details!
               NO Owner Name, NO Mobile, NO Condition, NO Entry Date!
               ======================================================== */
            <div className="pdf-single-page-wrapper">
              <div className="sheet-single-module-header">
                <div className="sheet-brand-heading">
                  <h2 className="workshop-name-title">FAIZAN BODY WORKS</h2>
                  <span className="workshop-slip-type">
                    {ORDER_SECTIONS.findIndex((s) => s.key === selectedSection) + 1}. {activeSectionInfo?.titleHindi} ({activeSectionInfo?.titleEnglish}) — कार्य स्लिप
                  </span>
                </div>

                {/* ONLY Chassis No & Shade No (NO Owner, NO Date, NO Mobile!) */}
                <div className="sheet-prominent-truck-strip">
                  <div className="truck-prominent-card">
                    <span className="prominent-card-title">Truck / Chassis No *</span>
                    <div className="prominent-card-val-row">
                      <span className="truck-card-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="1" y="3" width="15" height="13" />
                          <polygon points="16 8 20 8 23 11 23 16 16 8" />
                          <circle cx="5.5" cy="18.5" r="2.5" />
                          <circle cx="18.5" cy="18.5" r="2.5" />
                        </svg>
                      </span>
                      <span className="truck-chassis-prominent-number">
                        {order.truck_chassis_no || '________________'}
                      </span>
                    </div>
                  </div>

                  <div className="shade-prominent-card">
                    <span className="prominent-card-title">Shade No</span>
                    <span className="shade-prominent-number">
                      {order.shade_no || '—'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="sheet-divider-line"></div>

              {/* ONLY SELECTED MODULE CONTENT */}
              <div className="sheet-single-section-body">
                {renderSection(activeSectionInfo)}
              </div>

              {/* Worker & M.D Signatures */}
              <div className="sheet-signature-section" style={{ marginTop: '2.5rem' }}>
                <div className="signature-box">
                  <div className="signature-line">
                    {order.md_signature && (order.md_signature.startsWith('data:image/') || order.md_signature.startsWith('http') || order.md_signature.startsWith('/')) ? (
                      <img src={order.md_signature} alt="M.D Signature" className="signature-rendered-img" />
                    ) : (
                      <span className="signature-val">{order.md_signature || ''}</span>
                    )}
                  </div>
                  <span className="signature-title">M. D SIGNATURE</span>
                </div>

                <div className="signature-box">
                  <div className="signature-line"></div>
                  <span className="signature-title">कारीगर हस्ताक्षर (WORKER SIGN)</span>
                </div>
              </div>

              <div className="sheet-page-number-footer">
                <span>Faizan Body Works — {activeSectionInfo?.titleHindi} स्लिप • 1 Page Slip</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default OrderJobSheetModal;
