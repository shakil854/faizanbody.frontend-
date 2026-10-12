import React, { useState, useEffect } from 'react';
import { sharePdfFile, downloadPdfFile } from '../../utils/pdfGenerator';
import { Capacitor } from '@capacitor/core';

/**
 * Stock Purchase Order Modal
 * Supports:
 * 1. Single Material Order (when `item` is passed)
 * 2. Category Multi-Item Bulk Order (when `items` array is passed)
 *
 * Generates an official A4 Material Purchase Order PDF Slip
 * and shares it directly to WhatsApp on both Web and Mobile App.
 */
export function StockOrderModal({
  isOpen,
  onClose,
  item = null,
  items = null,
  categoryName = '',
}) {
  const isMultiItem = Boolean(items && Array.isArray(items) && items.length > 0);

  // Single Item Order State
  const [orderQuantity, setOrderQuantity] = useState('');

  // Multi-Item Order State
  // { [itemId]: boolean }
  const [selectedMap, setSelectedMap] = useState({});
  // { [itemId]: string }
  const [quantityMap, setQuantityMap] = useState({});

  // Common PO Form Fields
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // PO Number & Date
  const [poNumber, setPoNumber] = useState('');
  const [orderDate, setOrderDate] = useState('');

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      setPoNumber(
        `PO-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now
          .getDate()
          .toString()
          .padStart(2, '0')}-${randomCode}`
      );
      setOrderDate(
        now.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      );

      setSupplierName('');
      setSupplierPhone('');
      setOrderNotes('');
      setStatusMessage('');

      if (isMultiItem) {
        // Multi-Item initialization
        const initialSelected = {};
        const initialQuantities = {};

        items.forEach((it) => {
          const current = Number(it.quantity) || 0;
          const minAlert = Number(it.min_alert_quantity) || 0;
          const isLow = current <= minAlert;
          // Default all selected
          initialSelected[it.id] = true;

          // Default suggested quantity
          const suggested = isLow && minAlert > current
            ? Math.max(1, minAlert * 2 - current)
            : Math.max(1, Number(it.quantity) || 10);
          initialQuantities[it.id] = String(suggested);
        });

        setSelectedMap(initialSelected);
        setQuantityMap(initialQuantities);
      } else if (item) {
        // Single Item initialization
        const current = Number(item.quantity) || 0;
        const minAlert = Number(item.min_alert_quantity) || 0;
        const suggested = minAlert > current ? Math.max(1, minAlert * 2 - current) : 10;
        setOrderQuantity(String(suggested));
        setOrderNotes(item.notes || '');
      }
    }
  }, [isOpen, item, items, isMultiItem]);

  if (!isOpen) return null;
  if (!isMultiItem && !item) return null;

  // Selected items list in multi-item mode
  const selectedItemsList = isMultiItem
    ? items
      .filter((it) => selectedMap[it.id])
      .map((it) => ({
        ...it,
        orderQty: parseFloat(quantityMap[it.id]) || 1,
      }))
    : item
      ? [
        {
          ...item,
          orderQty: parseFloat(orderQuantity) || 1,
        },
      ]
      : [];

  const cleanCategory = (categoryName || item?.category_name || 'Materials').replace(/[^a-zA-Z0-9_-]/g, '_');
  const pdfFileName = isMultiItem
    ? `FaizanBody_PO_${cleanCategory}_${poNumber}.pdf`
    : `FaizanBody_PO_${(item?.name || 'Material').replace(/[^a-zA-Z0-9_-]/g, '_')}_${poNumber}.pdf`;

  // Quick select helpers
  const handleSelectAll = () => {
    const next = {};
    items.forEach((it) => (next[it.id] = true));
    setSelectedMap(next);
  };

  const handleSelectLowStockOnly = () => {
    const next = {};
    items.forEach((it) => {
      next[it.id] = Number(it.quantity) <= Number(it.min_alert_quantity);
    });
    setSelectedMap(next);
  };

  const handleDeselectAll = () => {
    const next = {};
    items.forEach((it) => (next[it.id] = false));
    setSelectedMap(next);
  };

  const toggleItemSelection = (itemId) => {
    setSelectedMap((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleQuantityChange = (itemId, val) => {
    setQuantityMap((prev) => ({
      ...prev,
      [itemId]: val,
    }));
  };

  // 1. Share via WhatsApp (Mobile App Native Share + Web WhatsApp Web)
  const handleShareWhatsApp = async () => {
    if (selectedItemsList.length === 0) {
      setStatusMessage('Please select at least one material to order');
      return;
    }

    try {
      setIsGenerating(true);
      setStatusMessage('Creating Purchase Order PDF...');

      await new Promise((resolve) => setTimeout(resolve, 200));

      const shareResult = await sharePdfFile({
        elementId: 'stockOrderPrintableSheet',
        fileName: pdfFileName,
      });

      // Format WhatsApp order text message
      let whatsappText = '';
      if (isMultiItem) {
        const itemsText = selectedItemsList
          .map((it, idx) => `${idx + 1}. *${it.name}* - *${it.orderQty} ${it.unit}*`)
          .join('\n');

        whatsappText = encodeURIComponent(
          `*FAIZAN BODY BUILDERS*
*MATERIAL PURCHASE ORDER - ${categoryName.toUpperCase()}*
━━━━━━━━━━━━━━━━━━━━━━━━
📄 *PO Number:* ${poNumber}
📅 *Date:* ${orderDate}
📂 *Category:* ${categoryName}
${supplierName.trim() ? `🏢 *Supplier:* ${supplierName.trim()}${supplierPhone.trim() ? ` (${supplierPhone.trim()})` : ''}\n` : (supplierPhone.trim() ? `📞 *Supplier Phone:* ${supplierPhone.trim()}\n` : '')}
📦 *Required Materials (${selectedItemsList.length}):*
${itemsText}
${orderNotes.trim() ? `\n📝 *Note:* ${orderNotes.trim()}` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━
📍 *Delivery Address:*
Faizan Body Builders Workshop
(Truck & Commercial Vehicle Body Fabricators)

📄 *Official Purchase Order PDF Slip attached. Please confirm delivery.*`
        );
      } else {
        whatsappText = encodeURIComponent(
          `*FAIZAN BODY BUILDERS*
*MATERIAL PURCHASE ORDER*
━━━━━━━━━━━━━━━━━━━━━━━━
📄 *PO Number:* ${poNumber}
📅 *Date:* ${orderDate}
${supplierName.trim() ? `🏢 *Supplier:* ${supplierName.trim()}${supplierPhone.trim() ? ` (${supplierPhone.trim()})` : ''}\n` : (supplierPhone.trim() ? `📞 *Supplier Phone:* ${supplierPhone.trim()}\n` : '')}
📦 *Material:* ${item.name}
📂 *Category:* ${item.category_name || 'Fabrication'}
🔢 *Order Quantity Required:* *${orderQuantity} ${item.unit}*
${item.unit_price ? `💰 *Est. Unit Rate:* ₹${item.unit_price}/${item.unit}\n` : ''}
${orderNotes.trim() ? `📝 *Note:* ${orderNotes.trim()}\n` : (item.notes ? `📝 *Note:* ${item.notes}\n` : '')}
━━━━━━━━━━━━━━━━━━━━━━━━
📍 *Delivery Address:*
Faizan Body Builders Workshop
(Truck & Commercial Vehicle Body Fabricators)

📄 *Official Purchase Order PDF Slip attached. Please confirm delivery.*`
        );
      }

      // Open WhatsApp App directly (Never WhatsApp Web) so user can select contact
      if (!Capacitor.isNativePlatform() || shareResult?.method === 'downloaded') {
        const waAppUrl = `whatsapp://send?text=${whatsappText}`;
        try {
          window.location.href = waAppUrl;
        } catch {
          const link = document.createElement('a');
          link.href = waAppUrl;
          link.click();
        }
        setStatusMessage('✅ PDF डाउनलोड हो गई & WhatsApp App खुल रहा है!');
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
    if (selectedItemsList.length === 0) {
      setStatusMessage('Please select at least one material to order');
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
        className="stock-modal-card modal-lg stock-order-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: isMultiItem ? '680px' : '540px', width: '96%' }}
      >
        {/* Header */}
        <div
          className="stock-modal-header stock-order-modal-header"
          style={{ borderBottomColor: '#bbf7d0', background: '#f0fdf4' }}
        >
          <div className="stock-header-title-box">
            <span
              className="stock-header-badge"
              style={{ background: '#dcfce7', color: '#15803d', borderColor: '#86efac' }}
            >
              WhatsApp Purchase Order
            </span>
            <h2 className="stock-header-title stock-order-title" style={{ color: '#14532d' }}>
              {isMultiItem
                ? `Order Materials - ${categoryName}`
                : `Order Material: ${item.name}`}
            </h2>
            <p className="stock-header-subtitle stock-order-subtitle" style={{ color: '#166534' }}>
              {isMultiItem
                ? 'Select materials & quantities to share bulk PO slip on WhatsApp'
                : 'Enter order quantity to generate & share PO slip on WhatsApp'}
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
        <div
          className="stock-modal-body stock-order-modal-body"
          style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '74vh', overflowY: 'auto' }}
        >
          {/* ========================================================
              MULTI-ITEM SELECTOR (CATEGORY BULK ORDER)
              ======================================================== */}
          {isMultiItem ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {/* Filter / Selection Control Bar */}
              <div className="stock-order-select-bar">
                <span className="stock-order-select-count">
                  {selectedItemsList.length} of {items.length} Selected
                </span>

                <div className="stock-order-select-btn-group">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="stock-order-quick-btn select-all"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectLowStockOnly}
                    className="stock-order-quick-btn select-low"
                  >
                    Low Stock
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="stock-order-quick-btn clear-all"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Items List with Checkboxes & Order Qty inputs */}
              <div className="stock-order-items-scroll">
                {items.map((it) => {
                  const isChecked = !!selectedMap[it.id];
                  const currentQty = Number(it.quantity) || 0;
                  const isLow = currentQty <= Number(it.min_alert_quantity);

                  return (
                    <div
                      key={it.id}
                      onClick={() => toggleItemSelection(it.id)}
                      className={`stock-order-item-row ${isChecked ? 'is-selected' : ''} ${isLow ? 'is-low' : ''}`}
                    >
                      {/* Checkbox & Item Info */}
                      <div className="stock-order-item-meta">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => { }} // handled by parent div click
                          className="stock-order-checkbox"
                        />

                        <div className="stock-order-item-text">
                          <strong className="stock-order-item-name">
                            {it.name}
                          </strong>
                          <div className="stock-order-item-sub">
                            {isLow ? (
                              <span className="sub-low">⚠️ Stock: {it.quantity} {it.unit}</span>
                            ) : (
                              <span>Stock: {it.quantity} {it.unit}</span>
                            )}
                            {it.location ? <span className="sub-loc">📍 {it.location}</span> : null}
                          </div>
                        </div>
                      </div>

                      {/* Order Quantity Input */}
                      {isChecked && (
                        <div
                          className="stock-order-qty-box"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="stock-order-qty-label">Qty:</span>
                          <input
                            type="number"
                            step="any"
                            min="0.1"
                            value={quantityMap[it.id] || ''}
                            onChange={(e) => handleQuantityChange(it.id, e.target.value)}
                            className="stock-order-qty-input"
                          />
                          <span className="stock-order-qty-unit">
                            {it.unit}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ========================================================
                SINGLE ITEM SNAPSHOT & ORDER QTY (EXISTING COMPONENT)
                ======================================================== */
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '0.75rem 0.9rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: '#2563eb',
                      background: '#eff6ff',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      border: '1px solid #dbeafe',
                    }}
                  >
                    {item.category_name}
                  </span>
                  <h3 style={{ margin: '3px 0 0 0', fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
                    {item.name}
                  </h3>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>Current Stock</span>
                  <strong
                    style={{
                      fontSize: '1.05rem',
                      color: Number(item.quantity) <= Number(item.min_alert_quantity) ? '#dc2626' : '#0f172a',
                    }}
                  >
                    {item.quantity} {item.unit}
                  </strong>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.65rem',
                  fontSize: '0.75rem',
                  color: '#475569',
                  paddingTop: '3px',
                  borderTop: '1px dashed #cbd5e1',
                }}
              >
                {item.location && <span>📍 Rack: <strong>{item.location}</strong></span>}
                <span>⚠️ Min Alert: <strong>{item.min_alert_quantity} {item.unit}</strong></span>
                {item.unit_price ? <span>💰 Unit Rate: <strong>₹{item.unit_price}/{item.unit}</strong></span> : null}
              </div>

              {/* Single item order quantity input */}
              <div style={{ marginTop: '0.35rem' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.25rem', display: 'block' }}>
                  Required Order Quantity ({item.unit}) *
                </label>
                <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                  <input
                    type="number"
                    step="any"
                    min="0.01"
                    className="form-input"
                    placeholder={`Enter order quantity in ${item.unit}`}
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(e.target.value)}
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      padding: '0.45rem 0.75rem',
                      borderColor: '#86efac',
                    }}
                  />
                  <span
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      padding: '0.48rem 0.75rem',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      color: '#334155',
                    }}
                  >
                    {item.unit}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Supplier Info & Notes (Shared for both single and multi-item) */}
          <div className="stock-two-col-grid stock-order-supplier-grid">
            <div>
              <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: '2px' }}>
                Supplier / Vendor Name
              </label>
              <input
                type="text"
                className="form-input form-input-compact"
                placeholder="e.g. Patel Hardware"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: '2px' }}>
                Supplier WhatsApp / Mobile
              </label>
              <input
                type="tel"
                className="form-input form-input-compact"
                placeholder="e.g. 9876543210"
                value={supplierPhone}
                onChange={(e) => setSupplierPhone(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700, marginBottom: '2px' }}>
              Special Instructions / Delivery Notes
            </label>
            <input
              type="text"
              className="form-input form-input-compact"
              placeholder="e.g. Standard grade material, dispatch urgently..."
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
            />
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
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
        <div className="stock-modal-footer stock-order-modal-footer">
          <button
            type="button"
            className="btn btn-secondary stock-order-btn-cancel"
            onClick={onClose}
            disabled={isGenerating}
          >
            Cancel
          </button>

          <div className="stock-order-footer-actions">
            {/* Download PDF button */}
            <button
              type="button"
              className="btn btn-secondary stock-order-btn-pdf"
              onClick={handleDownloadPdf}
              disabled={isGenerating || selectedItemsList.length === 0}
              title="Download pure A4 PDF file"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Download PDF</span>
            </button>

            {/* WhatsApp Share Button */}
            <button
              type="button"
              className="stock-order-btn-whatsapp"
              onClick={handleShareWhatsApp}
              disabled={isGenerating || selectedItemsList.length === 0}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              <span>{isGenerating ? 'Generating...' : 'Share on WhatsApp'}</span>
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

                <div
                  style={{
                    textAlign: 'right',
                    background: '#f8fafc',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <span
                    style={{
                      fontSize: '10px',
                      textTransform: 'uppercase',
                      fontWeight: 800,
                      color: '#2563eb',
                      display: 'block',
                      letterSpacing: '0.05em',
                    }}
                  >
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
                {selectedItemsList.map((it, idx) => (
                  <tr
                    key={it.id || idx}
                    style={{
                      borderBottom: '1px solid #e2e8f0',
                      fontSize: '13px',
                      background: idx % 2 === 1 ? '#f8fafc' : '#ffffff',
                    }}
                  >
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>
                        {it.name}
                      </strong>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#334155', fontWeight: 600 }}>
                      {it.category_name || categoryName || 'Fabrication'}
                    </td>
                    <td
                      style={{
                        padding: '10px 12px',
                        textAlign: 'right',
                        fontWeight: 900,
                        fontSize: '15px',
                        color: '#15803d',
                      }}
                    >
                      {it.orderQty}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>
                      {it.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Clean Note Box */}
            <div
              style={{
                background: '#f8fafc',
                border: '1.5px solid #cbd5e1',
                borderRadius: '8px',
                padding: '14px 18px',
                marginTop: '16px',
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  color: '#0f172a',
                  display: 'block',
                  letterSpacing: '0.04em',
                }}
              >
                NOTE:
              </span>
              <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#0f172a', lineHeight: 1.5, fontWeight: 600 }}>
                {orderNotes.trim() ||
                  `Please deliver standard quality materials. Delivery challan / invoice must specify PO Number: ${poNumber}.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StockOrderModal;
