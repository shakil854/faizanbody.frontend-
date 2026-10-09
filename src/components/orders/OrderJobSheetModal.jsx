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
          Exact 1:1 replica of Faizan Body physical paper job sheets.
          - Full Order: Strictly 2 Pages (#pdf-page-1 and #pdf-page-2)
          - Single Module: Strictly 1 Page (#pdf-single-page) with ONLY Chassis & Shade No
          ======================================================== */}
      <div
        style={{
          position: 'fixed',
          top: '0px',
          left: '0px',
          width: '720px',
          zIndex: -99999,
          pointerEvents: 'none',
          visibility: 'visible',
          opacity: 1,
          backgroundColor: '#ffffff',
        }}
        aria-hidden="true"
      >
        <div id="printableSheet">
          {selectedSection === 'all' ? (
            /* ========================================================
               CASE A: FULL COMPLETE WORK ORDER (EXACTLY 2 PAGES)
               ======================================================== */
            <div className="paper-full-wrapper">
              {/* ===== PAGE 1 OF 2 (Matches Photo 2) ===== */}
              <div className="paper-sheet-page" id="pdf-page-1">
                {/* Header Rows */}
                <div className="paper-header-block">
                  <div className="paper-hdr-row">
                    <div className="paper-hdr-field">
                      <span className="paper-hdr-label">Order DATE :</span>
                      <span className="paper-hdr-underline">{order.order_date || ''}</span>
                    </div>
                    <div className="paper-hdr-field">
                      <span className="paper-hdr-label">Condison :</span>
                      <span className="paper-hdr-underline">{order.condition_text || ''}</span>
                    </div>
                  </div>

                  <div className="paper-hdr-row">
                    <div className="paper-hdr-field" style={{ width: '100%' }}>
                      <span className="paper-hdr-label">Owener Name :</span>
                      <span className="paper-hdr-underline">{order.owner_name || ''}</span>
                    </div>
                  </div>

                  <div className="paper-hdr-row">
                    <div className="paper-hdr-field">
                      <span className="paper-hdr-label">Mo. Number :</span>
                      <span className="paper-hdr-underline">{order.mobile_number || ''}</span>
                    </div>
                    <div className="paper-hdr-field">
                      <span className="paper-hdr-label">ENTRY DATE:</span>
                      <span className="paper-hdr-underline">{order.entry_date || ''}</span>
                    </div>
                  </div>

                  <div className="paper-hdr-row">
                    <div className="paper-hdr-field">
                      <span className="paper-hdr-label">Truck/Chassis No :</span>
                      <span className="paper-hdr-underline highlight-bold">{order.truck_chassis_no || ''}</span>
                    </div>
                    <div className="paper-hdr-field">
                      <span className="paper-hdr-label">Shade No :</span>
                      <span className="paper-hdr-underline highlight-bold">{order.shade_no || ''}</span>
                    </div>
                  </div>
                </div>

                <div className="paper-line-divider"></div>

                {/* Section 1: केबिन वर्क (CABIN WORK) */}
                <div className="paper-section-block">
                  <div className="paper-sec-top-line">
                    <span className="paper-sec-title">केबिन वर्क (CABIN WORK)</span>
                    <div className="paper-three-boxes">
                      <div className="paper-rect-box">{order.cabin_work?.boxes?.[0] || ''}</div>
                      <div className="paper-rect-box">{order.cabin_work?.boxes?.[1] || ''}</div>
                      <div className="paper-rect-box">{order.cabin_work?.boxes?.[2] || ''}</div>
                    </div>
                  </div>

                  <div className="paper-items-list">
                    {[
                      { key: 'moro', label: 'मोरो:' },
                      { key: 'peeth', label: 'पीठ:' },
                      { key: 'panal_chhapni', label: 'पानल / दरवाज़ा की छापनी:' },
                      { key: 'paga_khidki', label: 'पगा की खिड़की:' },
                      { key: 'dashboard_prakar', label: 'डेस्कबोर्ड प्रकार:' },
                      { key: 'anya_kaam', label: 'अन्य काम:' },
                    ].map((item) => {
                      const itemData = order.cabin_work?.items?.[item.key] || { value: '', done: false };
                      return (
                        <div key={item.key} className="paper-item-row right-check">
                          <span className="paper-item-label">{item.label}</span>
                          <span className="paper-item-underline">{itemData.value || ''}</span>
                          <div className={`paper-checkbox-box ${itemData.done ? 'checked' : ''}`}>
                            {itemData.done && '✓'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="paper-line-divider"></div>

                {/* Section 2: अंदर का काम: */}
                <div className="paper-section-block">
                  <div className="paper-sec-top-line">
                    <span className="paper-sec-title">अंदर का काम:</span>
                    <div className="paper-three-boxes">
                      <div className="paper-rect-box">{order.inside_work?.boxes?.[0] || ''}</div>
                      <div className="paper-rect-box">{order.inside_work?.boxes?.[1] || ''}</div>
                      <div className="paper-rect-box">{order.inside_work?.boxes?.[2] || ''}</div>
                    </div>
                  </div>

                  <div className="paper-items-list">
                    {[
                      { key: 'niyamit_furniture_four_t', label: 'नियमित / फर्नीचर / फोर टी:' },
                      { key: 'speaker_size', label: 'स्पीकर साइज:' },
                      { key: 'sofa_seat', label: 'सोफा सीट:' },
                      { key: 'carrier', label: 'कैरियल:' },
                      { key: 'anya_kaam', label: 'अन्य काम:' },
                    ].map((item) => {
                      const itemData = order.inside_work?.items?.[item.key] || { value: '', done: false };
                      return (
                        <div key={item.key} className="paper-item-row right-check">
                          <span className="paper-item-label">{item.label}</span>
                          <span className="paper-item-underline">{itemData.value || ''}</span>
                          <div className={`paper-checkbox-box ${itemData.done ? 'checked' : ''}`}>
                            {itemData.done && '✓'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="paper-line-divider"></div>

                {/* Section 3: बॉडी वर्क (BODY WORK) */}
                <div className="paper-section-block">
                  <div className="paper-sec-top-line">
                    <span className="paper-sec-title">बॉडी वर्क (BODY WORK)</span>
                    <div className="paper-three-boxes">
                      <div className="paper-rect-box">{order.body_work?.boxes?.[0] || ''}</div>
                      <div className="paper-rect-box">{order.body_work?.boxes?.[1] || ''}</div>
                      <div className="paper-rect-box">{order.body_work?.boxes?.[2] || ''}</div>
                    </div>
                  </div>

                  <div className="paper-items-list">
                    <div className="paper-item-row right-check">
                      <span className="paper-item-label">रनर:</span>
                      <span className="paper-item-underline">{order.body_work?.items?.runner?.value || ''}</span>
                      <div className={`paper-checkbox-box ${order.body_work?.items?.runner?.done ? 'checked' : ''}`}>
                        {order.body_work?.items?.runner?.done && '✓'}
                      </div>
                    </div>

                    <div className="paper-item-row right-check">
                      <span className="paper-item-label">धोखा: लम्बाई/मात्रा :</span>
                      <span className="paper-item-underline">{order.body_work?.items?.dhokha_lambai_matra?.value || ''}</span>
                      <div className={`paper-checkbox-box ${order.body_work?.items?.dhokha_lambai_matra?.done ? 'checked' : ''}`}>
                        {order.body_work?.items?.dhokha_lambai_matra?.done && '✓'}
                      </div>
                    </div>

                    <div className="paper-item-row right-check">
                      <span className="paper-item-label">साइड ऊँचाई:</span>
                      <span className="paper-item-underline">{order.body_work?.items?.side_oonchai?.value || ''}</span>
                      <div className={`paper-checkbox-box ${order.body_work?.items?.side_oonchai?.done ? 'checked' : ''}`}>
                        {order.body_work?.items?.side_oonchai?.done && '✓'}
                      </div>
                    </div>

                    <div className="paper-item-row right-check">
                      <span className="paper-item-label">साइड प्रकार: पतरा / प्लाई:</span>
                      <span className="paper-item-underline">{order.body_work?.items?.side_prakar?.value || ''}</span>
                      <div className={`paper-checkbox-box ${order.body_work?.items?.side_prakar?.done ? 'checked' : ''}`}>
                        {order.body_work?.items?.side_prakar?.done && '✓'}
                      </div>
                    </div>

                    <div className="paper-item-row right-check">
                      <span className="paper-item-label">प्लेट की मोटाई/mm</span>
                      <span className="paper-item-underline">{order.body_work?.items?.plate_motai_mm?.value || ''}</span>
                      <div className={`paper-checkbox-box ${order.body_work?.items?.plate_motai_mm?.done ? 'checked' : ''}`}>
                        {order.body_work?.items?.plate_motai_mm?.done && '✓'}
                      </div>
                    </div>

                    <div className="paper-item-row right-check">
                      <span className="paper-item-label">फालका प्रकार: लोखंड / प्लाई / लकड़ी:</span>
                      <span className="paper-item-underline">{order.body_work?.items?.falka_prakar?.value || ''}</span>
                      <div className={`paper-checkbox-box ${order.body_work?.items?.falka_prakar?.done ? 'checked' : ''}`}>
                        {order.body_work?.items?.falka_prakar?.done && '✓'}
                      </div>
                    </div>

                    <div className="paper-item-row right-check">
                      <span className="paper-item-label">पीछे की जाली प्रकार :</span>
                      <span className="paper-item-underline">{order.body_work?.items?.peeche_jaali_prakar?.value || ''}</span>
                      <div className={`paper-checkbox-box ${order.body_work?.items?.peeche_jaali_prakar?.done ? 'checked' : ''}`}>
                        {order.body_work?.items?.peeche_jaali_prakar?.done && '✓'}
                      </div>
                    </div>

                    <div className="paper-item-row right-check">
                      <span className="paper-item-label">साइड में खिड़की: ऊँचाई / लंबाई:</span>
                      <span className="paper-item-underline" style={{ flex: 1.2 }}>{order.body_work?.items?.side_khidki?.value || ''}</span>
                      <span className="paper-item-label" style={{ marginLeft: '8px' }}>बेल:</span>
                      <span className="paper-item-underline" style={{ flex: 0.8 }}>{order.body_work?.items?.peeche_vel?.value || ''}</span>
                      <div className={`paper-checkbox-box ${order.body_work?.items?.side_khidki?.done ? 'checked' : ''}`}>
                        {order.body_work?.items?.side_khidki?.done && '✓'}
                      </div>
                    </div>

                    <div className="paper-item-row right-check">
                      <span className="paper-item-label">अन्य काम:</span>
                      <span className="paper-item-underline">{order.body_work?.items?.anya_kaam?.value || ''}</span>
                      <div className={`paper-checkbox-box ${order.body_work?.items?.anya_kaam?.done ? 'checked' : ''}`}>
                        {order.body_work?.items?.anya_kaam?.done && '✓'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ===== PAGE 2 OF 2 (Matches Photo 1) ===== */}
              <div className="paper-sheet-page" id="pdf-page-2">
                {/* Section 4: ऐसेसरीज (ACCESSORIES) */}
                <div className="paper-section-block">
                  <div className="paper-sec-top-line">
                    <div className="paper-head-left-with-check">
                      <div className="paper-checkbox-box"></div>
                      <span className="paper-sec-title">ऐसेसरीज (ACCESSORIES)</span>
                    </div>
                    <div className="paper-three-boxes">
                      <div className="paper-rect-box">{order.accessories?.boxes?.[0] || ''}</div>
                      <div className="paper-rect-box">{order.accessories?.boxes?.[1] || ''}</div>
                      <div className="paper-rect-box">{order.accessories?.boxes?.[2] || ''}</div>
                    </div>
                  </div>

                  <div className="paper-items-list">
                    {[
                      { key: 'bari_prakar', label: 'बारी प्रकार:' },
                      { key: 'niyamit', label: 'नियमित:' },
                      { key: 'anya_kaam', label: 'अन्य काम:' },
                    ].map((item) => {
                      const itemData = order.accessories?.items?.[item.key] || { value: '', done: false };
                      return (
                        <div key={item.key} className="paper-item-row left-check">
                          <div className={`paper-checkbox-box ${itemData.done ? 'checked' : ''}`}>
                            {itemData.done && '✓'}
                          </div>
                          <span className="paper-item-label">{item.label}</span>
                          <span className="paper-item-underline">{itemData.value || ''}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section 5: माछरो (MACHRO) */}
                <div className="paper-section-block" style={{ marginTop: '16px' }}>
                  <div className="paper-sec-top-line">
                    <div className="paper-head-left-with-check">
                      <div className="paper-checkbox-box"></div>
                      <span className="paper-sec-title">माछरो (MACHRO)</span>
                    </div>
                    <div className="paper-three-boxes">
                      <div className="paper-rect-box">{order.machro?.boxes?.[0] || ''}</div>
                      <div className="paper-rect-box">{order.machro?.boxes?.[1] || ''}</div>
                      <div className="paper-rect-box">{order.machro?.boxes?.[2] || ''}</div>
                    </div>
                  </div>

                  <div className="paper-items-list">
                    {[
                      { key: 'plate_oonchai_thambhla', label: 'प्लेट से ऊँचाई / थांभला मात्रा:' },
                      { key: 'side_pipe_matra_prakar', label: 'साइड में पाइप / मात्रा/प्रकार' },
                      { key: 'bhaya_matra_prakar', label: 'भथा: मात्रा/प्रकार' },
                      { key: 'dhar', label: 'द्वार:' },
                      { key: 'top_pipe_angle_prakar', label: 'टोप पर पाइप / एंगल/ प्रकार' },
                    ].map((item) => {
                      const itemData = order.machro?.items?.[item.key] || { value: '', done: false };
                      return (
                        <div key={item.key} className="paper-item-row left-check">
                          <div className={`paper-checkbox-box ${itemData.done ? 'checked' : ''}`}>
                            {itemData.done && '✓'}
                          </div>
                          <span className="paper-item-label">{item.label}</span>
                          <span className="paper-item-underline">{itemData.value || ''}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="paper-line-divider" style={{ margin: '14px 0' }}></div>

                {/* Section 6: फिनिशिंग (Finishing) */}
                <div className="paper-section-block">
                  <div className="paper-items-list">
                    {[
                      { key: 'color', label: 'कलर (COLOR)' },
                      { key: 'redium', label: 'रेडियम (REDIUM)' },
                      { key: 'painting', label: 'पेंटिंग (PAINTING)' },
                      { key: 'vayring', label: 'वायरिंग (VAYRING)' },
                    ].map((item) => {
                      const itemData = order.finishing_work?.[item.key] || { value: '', boxes: ['', '', ''], done: false };
                      return (
                        <div key={item.key} className="paper-item-row finishing-layout">
                          <div className={`paper-checkbox-box ${itemData.done ? 'checked' : ''}`}>
                            {itemData.done && '✓'}
                          </div>
                          <span className="paper-item-label">{item.label}</span>
                          <span className="paper-item-underline">{itemData.value || ''}</span>
                          <div className="paper-three-boxes">
                            <div className="paper-rect-box">{itemData.boxes?.[0] || ''}</div>
                            <div className="paper-rect-box">{itemData.boxes?.[1] || ''}</div>
                            <div className="paper-rect-box">{itemData.boxes?.[2] || ''}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {order.notes && (
                  <div className="paper-notes-box" style={{ marginTop: '16px' }}>
                    <span className="paper-notes-label">विशेष टिप्पणी / Notes:</span>
                    <span className="paper-notes-text">{order.notes}</span>
                  </div>
                )}

                {/* Bottom Signatures (Matches Photo 1) */}
                <div className="paper-signatures-block">
                  <div className="paper-sig-col">
                    <span className="paper-sig-label">M. D SIGNATURE</span>
                    <div className="paper-sig-underline">
                      {order.md_signature && (order.md_signature.startsWith('data:image/') || order.md_signature.startsWith('http') || order.md_signature.startsWith('/')) ? (
                        <img src={order.md_signature} alt="M.D Signature" className="paper-sig-img" />
                      ) : (
                        <span className="paper-sig-text">{order.md_signature || ''}</span>
                      )}
                    </div>
                  </div>

                  <div className="paper-sig-col">
                    <span className="paper-sig-label">PARTY OWNER SIGNATURE</span>
                    <div className="paper-sig-underline">
                      {order.party_owner_signature && (order.party_owner_signature.startsWith('data:image/') || order.party_owner_signature.startsWith('http') || order.party_owner_signature.startsWith('/')) ? (
                        <img src={order.party_owner_signature} alt="Party Owner Signature" className="paper-sig-img" />
                      ) : (
                        <span className="paper-sig-text">{order.party_owner_signature || ''}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================
               CASE B: SINGLE MODULE SLIP (STRICTLY 1 PAGE)
               ONLY Chassis No & Shade No & Selected Module Details!
               (NO Owner Name, NO Mobile, NO Condition, NO Entry Date!)
               ======================================================== */
            <div className="paper-sheet-page" id="pdf-single-page">
              <div className="paper-single-header-strip">
                <div className="paper-single-title-row">
                  <h2 className="paper-shop-heading">FAIZAN BODY WORKS</h2>
                  <span className="paper-slip-badge">
                    {ORDER_SECTIONS.findIndex((s) => s.key === selectedSection) + 1}. {activeSectionInfo?.titleHindi} ({activeSectionInfo?.titleEnglish}) — कारीगर कार्य स्लिप
                  </span>
                </div>

                {/* ONLY Chassis No & Shade No */}
                <div className="paper-hdr-row" style={{ marginTop: '10px' }}>
                  <div className="paper-hdr-field">
                    <span className="paper-hdr-label">Truck/Chassis No :</span>
                    <span className="paper-hdr-underline highlight-bold">{order.truck_chassis_no || ''}</span>
                  </div>
                  <div className="paper-hdr-field">
                    <span className="paper-hdr-label">Shade No :</span>
                    <span className="paper-hdr-underline highlight-bold">{order.shade_no || ''}</span>
                  </div>
                </div>
              </div>

              <div className="paper-line-divider" style={{ margin: '12px 0 16px' }}></div>

              {/* RENDER THE SELECTED MODULE DETAILS ONLY */}
              <div className="paper-single-module-content">
                {selectedSection === 'finishing_work' ? (
                  <div className="paper-section-block">
                    <div className="paper-items-list">
                      {[
                        { key: 'color', label: 'कलर (COLOR)' },
                        { key: 'redium', label: 'रेडियम (REDIUM)' },
                        { key: 'painting', label: 'पेंटिंग (PAINTING)' },
                        { key: 'vayring', label: 'वायरिंग (VAYRING)' },
                      ].map((item) => {
                        const itemData = order.finishing_work?.[item.key] || { value: '', boxes: ['', '', ''], done: false };
                        return (
                          <div key={item.key} className="paper-item-row finishing-layout" style={{ margin: '8px 0' }}>
                            <div className={`paper-checkbox-box ${itemData.done ? 'checked' : ''}`}>
                              {itemData.done && '✓'}
                            </div>
                            <span className="paper-item-label">{item.label}</span>
                            <span className="paper-item-underline">{itemData.value || ''}</span>
                            <div className="paper-three-boxes">
                              <div className="paper-rect-box">{itemData.boxes?.[0] || ''}</div>
                              <div className="paper-rect-box">{itemData.boxes?.[1] || ''}</div>
                              <div className="paper-rect-box">{itemData.boxes?.[2] || ''}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="paper-section-block">
                    <div className="paper-sec-top-line">
                      <span className="paper-sec-title">
                        {activeSectionInfo?.titleHindi} ({activeSectionInfo?.titleEnglish})
                      </span>
                      <div className="paper-three-boxes">
                        <div className="paper-rect-box">{order[selectedSection]?.boxes?.[0] || ''}</div>
                        <div className="paper-rect-box">{order[selectedSection]?.boxes?.[1] || ''}</div>
                        <div className="paper-rect-box">{order[selectedSection]?.boxes?.[2] || ''}</div>
                      </div>
                    </div>

                    <div className="paper-items-list" style={{ marginTop: '12px' }}>
                      {activeSectionInfo?.items.map((item) => {
                        const itemData = order[selectedSection]?.items?.[item.key] || { value: '', done: false };
                        return (
                          <div key={item.key} className="paper-item-row right-check" style={{ margin: '8px 0' }}>
                            <span className="paper-item-label">{item.label}:</span>
                            <span className="paper-item-underline">{itemData.value || ''}</span>
                            {item.extraKey && (
                              <>
                                <span className="paper-item-label" style={{ marginLeft: '8px' }}>{item.extraLabel}:</span>
                                <span className="paper-item-underline" style={{ flex: 0.6 }}>{order[selectedSection]?.items?.[item.extraKey]?.value || ''}</span>
                              </>
                            )}
                            <div className={`paper-checkbox-box ${itemData.done ? 'checked' : ''}`}>
                              {itemData.done && '✓'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Signatures for Single Slip */}
              <div className="paper-signatures-block" style={{ marginTop: '40px' }}>
                <div className="paper-sig-col">
                  <span className="paper-sig-label">M. D SIGNATURE</span>
                  <div className="paper-sig-underline">
                    {order.md_signature && (order.md_signature.startsWith('data:image/') || order.md_signature.startsWith('http') || order.md_signature.startsWith('/')) ? (
                      <img src={order.md_signature} alt="M.D Signature" className="paper-sig-img" />
                    ) : (
                      <span className="paper-sig-text">{order.md_signature || ''}</span>
                    )}
                  </div>
                </div>
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
