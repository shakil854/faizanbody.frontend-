import React, { useState, useEffect } from 'react';
import { sharePdfFile, downloadPdfFile } from '../../utils/pdfGenerator';
import { Capacitor } from '@capacitor/core';

/**
 * Stock Purchase Order Modal
 * Generates an official A4 Material Purchase Order PDF Slip
 * and shares it directly to WhatsApp on both Web and Mobile App.
 */
export function StockOrderModal({ isOpen, onClose, item }) {
  const [orderQuantity, setOrderQuantity] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // PO Number & Date generated once per modal open
  const [poNumber, setPoNumber] = useState('');
  const [orderDate, setOrderDate] = useState('');

  useEffect(() => {
    if (isOpen && item) {
      // Default suggested order qty: if low stock, difference to double min alert, or 10
      const current = Number(item.quantity) || 0;
      const minAlert = Number(item.min_alert_quantity) || 0;
      const suggested = minAlert > current ? Math.max(1, minAlert * 2 - current) : 10;
      setOrderQuantity(String(suggested));

      setSupplierName('');
      setSupplierPhone('');
      setOrderNotes(item.notes || '');
      setStatusMessage('');

      const now = new Date();
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      setPoNumber(`PO-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${randomCode}`);
      setOrderDate(now.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }));
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const cleanItemName = (item.name || 'Material').replace(/[^a-zA-Z0-9_-]/g, '_');
  const pdfFileName = `FaizanBody_PO_${cleanItemName}_${poNumber}.pdf`;

  // 1. Share via WhatsApp (Mobile App Native Share + Web WhatsApp Web)
  const handleShareWhatsApp = async () => {
    const qtyNum = parseFloat(orderQuantity);
    if (!qtyNum || qtyNum <= 0) {
      setStatusMessage('Please enter a valid order quantity');
      return;
    }

    try {
      setIsGenerating(true);
      setStatusMessage('Creating Purchase Order PDF...');

      // Small delay to ensure printable sheet DOM is updated
      await new Promise((resolve) => setTimeout(resolve, 200));

      const shareResult = await sharePdfFile({
        elementId: 'stockOrderPrintableSheet',
        fileName: pdfFileName,
      });

      // Format WhatsApp order text message
      const whatsappText = encodeURIComponent(
`*FAIZAN BODY BUILDERS*
*MATERIAL PURCHASE ORDER*
━━━━━━━━━━━━━━━━━━━━━━━━
📄 *PO Number:* ${poNumber}
📅 *Date:* ${orderDate}
${supplierName.trim() ? `🏢 *Supplier:* ${supplierName.trim()}\n` : ''}
📦 *Material:* ${item.name}
📂 *Category:* ${item.category_name || 'Fabrication'}
🔢 *Order Quantity Required:* *${orderQuantity} ${item.unit}*
${item.unit_price ? `💰 *Est. Unit Rate:* ₹${item.unit_price}/${item.unit}\n` : ''}
${orderNotes.trim() ? `📝 *Note:* ${orderNotes.trim()}\n` : (item.notes ? `📝 *Note:* ${item.notes}\n` : '')}
━━━━━━━━━━━━━━━━━━━━━━━━
📍 *Delivery Address:*
Faizan Body Builders Workshop
(Truck & Commercial Vehicle Body Fabricators)

📄 *Note:* Official Purchase Order PDF Slip generated. Please confirm order & delivery date.`
      );

      // On Web or if file was downloaded (not shared via native sheet)
      if (!Capacitor.isNativePlatform() || shareResult?.method === 'downloaded') {
        const cleanPhone = supplierPhone.replace(/\D/g, '');
        const targetPhone = cleanPhone ? (cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone) : '';
        const waUrl = targetPhone
          ? `https://wa.me/${targetPhone}?text=${whatsappText}`
          : `https://api.whatsapp.com/send?text=${whatsappText}`;

        // Open WhatsApp in new tab / app
        window.open(waUrl, '_blank');
        setStatusMessage('✅ PDF downloaded & WhatsApp opened!');
      } else {
        setStatusMessage('✅ Purchase Order shared successfully!');
      }

      setTimeout(() => {
        setIsGenerating(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error generating WhatsApp order PDF:', err);
      setStatusMessage('Failed to generate PDF. Please try again.');
      setIsGenerating(false);
    }
  };

  // 2. Download PDF directly
  const handleDownloadPdf = async () => {
    const qtyNum = parseFloat(orderQuantity);
    if (!qtyNum || qtyNum <= 0) {
      setStatusMessage('Please enter a valid order quantity');
      return;
    }

    try {
      setIsGenerating(true);
      setStatusMessage('Generating PDF download...');
      await new Promise((resolve) => setTimeout(resolve, 200));

      await downloadPdfFile({
        elementId: 'stockOrderPrintableSheet',
        fileName: pdfFileName,
      });

      setStatusMessage('✅ PDF downloaded successfully!');
      setTimeout(() => {
        setIsGenerating(false);
      }, 1200);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setStatusMessage('Download failed. Please try again.');
      setIsGenerating(false);
    }
  };

  return (
    <div className="stock-modal-overlay" onClick={onClose}>
      <div
        className="stock-modal-card modal-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: '620px' }}
      >
        {/* Header */}
        <div className="stock-modal-header" style={{ borderBottomColor: '#bbf7d0', background: '#f0fdf4' }}>
          <div className="stock-header-title-box">
            <span
              className="stock-header-badge"
              style={{ background: '#dcfce7', color: '#15803d', borderColor: '#86efac' }}
            >
              WhatsApp Purchase Order
            </span>
            <h2 className="stock-header-title" style={{ color: '#14532d' }}>
              Order Material (Purchase Slip)
            </h2>
            <p className="stock-header-subtitle" style={{ color: '#166534' }}>
              Enter required quantity to generate & share official PDF slip on WhatsApp
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

        {/* Modal Body */}
        <div className="stock-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Material Snapshot Card */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '0.85rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
              <div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#2563eb',
                    background: '#eff6ff',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid #dbeafe',
                  }}
                >
                  {item.category_name}
                </span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  {item.name}
                </h3>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Current Stock</span>
                <strong style={{ fontSize: '1.15rem', color: Number(item.quantity) <= Number(item.min_alert_quantity) ? '#dc2626' : '#0f172a' }}>
                  {item.quantity} {item.unit}
                </strong>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.8rem', color: '#475569', paddingTop: '4px', borderTop: '1px dashed #cbd5e1' }}>
              {item.location && <span>📍 Rack: <strong>{item.location}</strong></span>}
              <span>⚠️ Min Alert: <strong>{item.min_alert_quantity} {item.unit}</strong></span>
              {item.unit_price ? <span>💰 Unit Rate: <strong>₹{item.unit_price}/{item.unit}</strong></span> : null}
            </div>
          </div>

          {/* Form Inputs */}
          <div>
            {/* Required: Order Quantity */}
            <div style={{ marginBottom: '0.85rem' }}>
              <label
                className="form-label"
                style={{ fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}
              >
                <span>Required Order Quantity: <strong style={{ color: '#dc2626' }}>*</strong></span>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Unit: {item.unit}</span>
              </label>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="number"
                  step="any"
                  min="0.01"
                  className="form-input"
                  placeholder={`Enter order quantity in ${item.unit}`}
                  value={orderQuantity}
                  onChange={(e) => {
                    setOrderQuantity(e.target.value);
                    if (statusMessage) setStatusMessage('');
                  }}
                  autoFocus
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    padding: '0.65rem 0.85rem',
                    borderColor: '#86efac',
                    boxShadow: '0 0 0 1px #86efac',
                  }}
                />
                <span
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '0.7rem 0.9rem',
                    fontWeight: 700,
                    color: '#334155',
                    fontSize: '0.95rem',
                  }}
                >
                  {item.unit}
                </span>
              </div>

              {/* Quick Increment Shortcuts */}
              <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.45rem', flexWrap: 'wrap' }}>
                {[10, 25, 50, 100, 200].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setOrderQuantity(String(q))}
                    style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      color: '#15803d',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    +{q} {item.unit}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Supplier Name & Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.85rem' }}>
              <div>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.3rem', fontSize: '0.82rem' }}>
                  Supplier / Vendor Name:
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Jindal Steel Traders"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  style={{ fontSize: '0.88rem' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.3rem', fontSize: '0.82rem' }}>
                  Supplier WhatsApp Number:
                </label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="e.g. 9876543210 (Optional)"
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  style={{ fontSize: '0.88rem' }}
                />
              </div>
            </div>

            {/* Optional Special Instructions */}
            <div>
              <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.3rem', fontSize: '0.82rem' }}>
                Notes / Delivery Instructions:
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Urgent required by tomorrow, standard gauge required"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                style={{ fontSize: '0.88rem' }}
              />
            </div>
          </div>

          {/* Status / Feedback message */}
          {statusMessage && (
            <div
              style={{
                padding: '0.6rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: statusMessage.includes('✅') ? '#f0fdf4' : '#fef2f2',
                color: statusMessage.includes('✅') ? '#15803d' : '#dc2626',
                border: `1px solid ${statusMessage.includes('✅') ? '#bbf7d0' : '#fecaca'}`,
                textAlign: 'center',
              }}
            >
              {statusMessage}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div
          className="stock-modal-footer"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '0.5rem',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isGenerating}
            style={{ minWidth: '90px' }}
          >
            Cancel
          </button>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Download PDF button */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleDownloadPdf}
              disabled={isGenerating || !orderQuantity}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              title="Download pure A4 PDF file"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Download PDF</span>
            </button>

            {/* WhatsApp Share Button */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              disabled={isGenerating || !orderQuantity}
              style={{
                background: '#25D366',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '0.65rem 1.25rem',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(37, 211, 102, 0.35)',
                transition: 'all 0.15s ease',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              <span>{isGenerating ? 'Generating PDF...' : 'Share on WhatsApp'}</span>
            </button>
          </div>
        </div>

        {/* ========================================================
            OFFSCREEN A4 PRINTABLE PURCHASE ORDER SLIP (FOR PDF)
            ======================================================== */}
        <div
          style={{
            position: 'fixed',
            top: '0px',
            left: '-9999px',
            width: '720px',
            zIndex: -1,
            pointerEvents: 'none',
            visibility: 'visible',
            opacity: 1,
            backgroundColor: '#ffffff',
          }}
          aria-hidden="true"
        >
          <div
            id="stockOrderPrintableSheet"
            style={{
              position: 'relative',
              width: '720px',
              background: '#ffffff',
              color: '#0f172a',
              padding: '36px',
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
              boxSizing: 'border-box',
            }}
          >
          {/* Header Strip */}
          <div style={{ borderBottom: '3px solid #0f172a', paddingBottom: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                  FAIZAN BODY BUILDERS
                </h1>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#475569', fontWeight: 600 }}>
                  Specialist in All Types of Truck Body & Commercial Vehicle Fabrication
                </p>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                  Workshop & Material Requisition Department
                </p>
              </div>

              <div style={{ textAlign: 'right', background: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 800, color: '#2563eb', display: 'block', letterSpacing: '0.05em' }}>
                  OFFICIAL PURCHASE ORDER
                </span>
                <strong style={{ fontSize: '16px', color: '#0f172a', display: 'block', marginTop: '2px' }}>
                  {poNumber}
                </strong>
                <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                  Date: {orderDate}
                </span>
              </div>
            </div>
          </div>

          {/* Supplier & Delivery Info Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '22px' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px 16px' }}>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 800, color: '#64748b', display: 'block', letterSpacing: '0.05em' }}>
                TO (SUPPLIER / VENDOR):
              </span>
              <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block', marginTop: '4px' }}>
                {supplierName.trim() || 'Authorized Material Supplier / Vendor'}
              </strong>
              {supplierPhone.trim() && (
                <span style={{ fontSize: '12px', color: '#475569', display: 'block', marginTop: '2px' }}>
                  Phone / WhatsApp: {supplierPhone.trim()}
                </span>
              )}
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px 16px' }}>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 800, color: '#64748b', display: 'block', letterSpacing: '0.05em' }}>
                DELIVER TO (DESTINATION):
              </span>
              <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block', marginTop: '4px' }}>
                Faizan Body Builders Workshop
              </strong>
              <span style={{ fontSize: '12px', color: '#475569', display: 'block', marginTop: '2px' }}>
                Truck Body Fabrication Division
              </span>
            </div>
          </div>

          {/* Material Order Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
            <thead>
              <tr style={{ background: '#0f172a', color: '#ffffff', textAlign: 'left', fontSize: '12px', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 12px', width: '45px', textAlign: 'center' }}>#</th>
                <th style={{ padding: '10px 12px' }}>Material / Item Description</th>
                <th style={{ padding: '10px 12px' }}>Category</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>Order Qty</th>
                <th style={{ padding: '10px 12px' }}>Unit</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '2px solid #0f172a', fontSize: '13px' }}>
                <td style={{ padding: '14px 12px', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>1</td>
                <td style={{ padding: '14px 12px' }}>
                  <strong style={{ fontSize: '15px', color: '#0f172a', display: 'block' }}>{item.name}</strong>
                  {(orderNotes.trim() || item.notes) && (
                    <span style={{ fontSize: '12px', color: '#334155', display: 'block', marginTop: '4px' }}>
                      <strong>Note:</strong> {orderNotes.trim() || item.notes}
                    </span>
                  )}
                </td>
                <td style={{ padding: '14px 12px', color: '#334155', fontWeight: 600 }}>{item.category_name}</td>
                <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: 900, fontSize: '16px', color: '#15803d' }}>
                  {orderQuantity}
                </td>
                <td style={{ padding: '14px 12px', fontWeight: 700, color: '#0f172a' }}>{item.unit}</td>
              </tr>
            </tbody>
          </table>

          {/* Clean Note Box */}
          <div style={{ background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '14px 18px', marginTop: '16px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#0f172a', display: 'block', letterSpacing: '0.04em' }}>
              NOTE:
            </span>
            <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#0f172a', lineHeight: 1.5, fontWeight: 600 }}>
              {orderNotes.trim() || item.notes || `Please deliver standard quality materials. Delivery challan / invoice must specify PO Number: ${poNumber}.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}

export default StockOrderModal;
