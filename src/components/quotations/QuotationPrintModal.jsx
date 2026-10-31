import React from 'react';
import { TruckLogo } from '../common/TruckLogo';

export function QuotationPrintModal({ isOpen, onClose, quotation }) {
  if (!isOpen || !quotation) return null;

  const handlePrint = () => {
    window.print();
  };

  const cleanPhone = quotation.mobile_number ? quotation.mobile_number.replace(/[^0-9]/g, '') : '';
  const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  const handleWhatsAppShare = () => {
    const lines = [];
    lines.push(`*📋 QUOTATION / ESTIMATE*`);
    lines.push(`*Faizan Body Workshop*`);
    lines.push(`--------------------------------`);
    lines.push(`*Quote No:* ${quotation.quotation_no}`);
    lines.push(`*Date:* ${quotation.quotation_date}`);
    lines.push(`*Customer:* ${quotation.customer_name}`);
    if (quotation.truck_chassis_no) {
      lines.push(`*Truck/Chassis:* ${quotation.truck_chassis_no}`);
    }
    lines.push(`--------------------------------`);
    lines.push(`*ITEMS & RATES:*`);

    if (Array.isArray(quotation.items)) {
      quotation.items.forEach((it, idx) => {
        const variantText = it.variant_name ? ` (${it.variant_name})` : '';
        lines.push(`${idx + 1}. *${it.name}${variantText}*`);
        lines.push(`   ₹${it.rate} × ${it.qty} = *₹${Number(it.amount).toLocaleString('en-IN')}*`);
      });
    }

    lines.push(`--------------------------------`);
    lines.push(`*Subtotal:* ₹${Number(quotation.subtotal).toLocaleString('en-IN')}`);

    if (Number(quotation.extra_percent) > 0) {
      lines.push(`*Extra (+${quotation.extra_percent}%):* ₹${Number(quotation.extra_amount).toLocaleString('en-IN')}`);
    }

    if (Number(quotation.discount_percent) > 0) {
      lines.push(`*Discount (-${quotation.discount_percent}%):* ₹${Number(quotation.discount_amount).toLocaleString('en-IN')}`);
    }

    lines.push(`*FINAL PRICE:* ₹${Number(quotation.final_price).toLocaleString('en-IN')}`);
    lines.push(`--------------------------------`);
    if (quotation.notes) {
      lines.push(`*Note:* ${quotation.notes}`);
    }
    lines.push(`_Thank you for choosing Faizan Body!_`);

    const text = encodeURIComponent(lines.join('\n'));
    const url = waPhone ? `https://wa.me/${waPhone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  return (
    <div className="quotation-modal-overlay animate-fade-in" onClick={onClose}>
      <div className="quotation-print-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Controls Toolbar (Hidden in Print) */}
        <div className="print-modal-top-bar no-print">
          <div className="print-bar-left">
            <span className="print-bar-title">Quotation Slip &bull; {quotation.quotation_no}</span>
          </div>
          <div className="print-bar-actions">
            <button type="button" className="btn-print-action print-btn-blue" onClick={handlePrint}>
              🖨️ Print / Save PDF
            </button>
            <button type="button" className="btn-print-action print-btn-emerald" onClick={handleWhatsAppShare}>
              💬 WhatsApp Share
            </button>
            <button type="button" className="btn-print-close" onClick={onClose} title="Close">
              ✕
            </button>
          </div>
        </div>

        {/* Printable Paper Document */}
        <div className="quotation-print-paper printable-slip">
          {/* Letterhead */}
          <div className="print-letterhead">
            <div className="letterhead-brand">
              <div className="letterhead-logo">
                <TruckLogo size={38} />
              </div>
              <div className="letterhead-text">
                <h1 className="letterhead-company-name">FAIZAN BODY</h1>
                <p className="letterhead-tagline">High Performance Truck Body Fabrication & Workshop</p>
                <p className="letterhead-contact">Mobile: 7984882103 &bull; Quality &bull; Strength &bull; Precision</p>
              </div>
            </div>
            <div className="letterhead-badge">
              <span className="doc-type-badge">QUOTATION</span>
              <span className="doc-number font-mono">{quotation.quotation_no}</span>
            </div>
          </div>

          <div className="print-divider-line"></div>

          {/* Quotation & Customer Details Grid */}
          <div className="print-info-grid">
            <div className="info-block">
              <span className="info-label">Customer / Party Name:</span>
              <span className="info-value-strong">{quotation.customer_name}</span>
            </div>

            <div className="info-block">
              <span className="info-label">Quotation Date:</span>
              <span className="info-value font-mono">{quotation.quotation_date}</span>
            </div>

            <div className="info-block">
              <span className="info-label">Contact Mobile:</span>
              <span className="info-value font-mono">{quotation.mobile_number || '—'}</span>
            </div>

            <div className="info-block">
              <span className="info-label">Truck / Chassis No:</span>
              <span className="info-value font-mono font-semibold">{quotation.truck_chassis_no || '—'}</span>
            </div>
          </div>

          {/* Items Table */}
          <table className="print-table">
            <thead>
              <tr>
                <th style={{ width: '8%', textAlign: 'center' }}>Sr.</th>
                <th style={{ width: '47%' }}>Item Description (वस्तु का नाम)</th>
                <th style={{ width: '15%', textAlign: 'right' }}>Rate (₹)</th>
                <th style={{ width: '12%', textAlign: 'center' }}>Qty</th>
                <th style={{ width: '18%', textAlign: 'right' }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(quotation.items) && quotation.items.map((it, idx) => (
                <tr key={idx}>
                  <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                  <td>
                    <div className="print-item-title">{it.name}</div>
                    {it.variant_name && (
                      <span className="print-item-variant">Size/Option: {it.variant_name}</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }} className="font-mono">
                    ₹{Number(it.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'center' }} className="font-mono">{it.qty}</td>
                  <td style={{ textAlign: 'right' }} className="font-mono font-semibold">
                    ₹{Number(it.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Financial Summary Breakdown */}
          <div className="print-summary-wrap">
            <div className="print-terms-col">
              {quotation.notes && (
                <div className="print-notes-box">
                  <span className="notes-heading">Terms & Conditions:</span>
                  <p className="notes-content">{quotation.notes}</p>
                </div>
              )}
            </div>

            <div className="print-totals-col">
              <div className="print-total-row">
                <span>Subtotal (कुल रकम):</span>
                <span className="font-mono">₹{Number(quotation.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              {Number(quotation.extra_percent) > 0 && (
                <div className="print-total-row">
                  <span>Extra / Tax (+{quotation.extra_percent}%):</span>
                  <span className="font-mono text-emerald">+ ₹{Number(quotation.extra_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              {Number(quotation.discount_percent) > 0 && (
                <div className="print-total-row">
                  <span>Discount (-{quotation.discount_percent}%):</span>
                  <span className="font-mono text-red">- ₹{Number(quotation.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              )}

              <div className="print-grand-total-row">
                <span>FINAL PRICE:</span>
                <span className="grand-price-val font-mono">
                  ₹{Number(quotation.final_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Signature */}
          <div className="print-footer-signatures">
            <div className="sig-side">
              <span className="sig-line"></span>
              <span className="sig-label">Customer Signature</span>
            </div>
            <div className="sig-side">
              <span className="sig-line"></span>
              <span className="sig-label">Authorized Signatory &bull; Faizan Body</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QuotationPrintModal;

