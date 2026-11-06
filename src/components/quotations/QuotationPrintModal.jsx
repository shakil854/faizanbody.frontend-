import React, { useState } from 'react';
import { sharePdfFile } from '../../utils/pdfGenerator';
import { QuotationPrintContent } from './QuotationPrintContent';

export function QuotationPrintModal({ isOpen, onClose, quotation }) {
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  if (!isOpen || !quotation) return null;

  // Single Direct Action: Share PDF to WhatsApp
  const handleSharePdfDirect = async () => {
    try {
      setIsProcessingPdf(true);
      setToastMessage('⏳ Generating Quotation PDF...');

      const cleanCustomer = (quotation.customer_name || 'Customer').replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanNo = (quotation.quotation_no || 'Quote').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `FaizanBody_Quotation_${cleanNo}_${cleanCustomer}.pdf`;

      const res = await sharePdfFile({
        elementId: 'quotation-printable-paper',
        fileName,
      });

      if (res?.success) {
        setToastMessage('✓ PDF shared successfully!');
      }
    } catch (err) {
      console.error('Failed to share PDF:', err);
      // Fallback: Open WhatsApp directly
      const cleanPhone = quotation.mobile_number ? quotation.mobile_number.replace(/[^0-9]/g, '') : '';
      const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      const summaryText = encodeURIComponent(
        `*📋 QUOTATION - FAIZAN BODY*\n` +
        `Quote No: ${quotation.quotation_no}\n` +
        `Date: ${quotation.quotation_date}\n` +
        `Customer: ${quotation.customer_name}\n` +
        (quotation.truck_chassis_no ? `Truck: ${quotation.truck_chassis_no}\n` : '') +
        `*TOTAL AMOUNT: ₹${Number(quotation.final_price).toLocaleString('en-IN')}*\n` +
        `_Faizan Body Workshop_`
      );
      const url = waPhone ? `https://wa.me/${waPhone}?text=${summaryText}` : `https://wa.me/?text=${summaryText}`;
      window.open(url, '_blank');
    } finally {
      setIsProcessingPdf(false);
      setTimeout(() => setToastMessage(''), 3000);
    }
  };

  return (
    <div className="quotation-modal-overlay animate-fade-in" onClick={onClose}>
      <div className="quotation-print-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Controls Toolbar (Hidden in Print) - ONLY WHATSAPP SHARE & CLOSE */}
        <div className="print-modal-top-bar no-print">
          <div className="print-bar-left" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span className="print-bar-title" style={{ fontSize: '0.96rem', fontWeight: 800 }}>
              📋 Quotation (કોટેશન) &bull; {quotation.quotation_no}
            </span>
            {toastMessage && (
              <span style={{ fontSize: '0.78rem', color: '#16a34a', fontWeight: 800 }}>
                {toastMessage}
              </span>
            )}
          </div>

          {/* Only 1 Action Button: WhatsApp Share */}
          <div className="print-bar-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn-print-action"
              onClick={handleSharePdfDirect}
              disabled={isProcessingPdf}
              style={{
                background: '#16a34a',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.85rem',
                padding: '0.48rem 1.05rem',
                borderRadius: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(22, 163, 74, 0.35)',
              }}
              title="Share pure PDF file directly to WhatsApp"
            >
              <span style={{ fontSize: '1rem' }}>{isProcessingPdf ? '⏳' : '💬'}</span>
              <span>{isProcessingPdf ? 'PDF શેર થાય છે...' : 'WhatsApp Share (વોટ્સએપ શેર)'}</span>
            </button>

            <button type="button" className="btn-print-close" onClick={onClose} title="Close">
              ✕
            </button>
          </div>
        </div>

        {/* Printable Paper Document */}
        <div id="quotation-printable-paper" className="quotation-print-paper printable-slip">
          <QuotationPrintContent quotation={quotation} isCustomerView={true} />
        </div>
      </div>
    </div>
  );
}

export default QuotationPrintModal;
