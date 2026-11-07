import React from 'react';
import { TruckLogo } from '../common/TruckLogo';

export function QuotationPrintContent({ quotation, isCustomerView = true }) {
  if (!quotation) return null;

  const selectedItems = Array.isArray(quotation.items)
    ? quotation.items.filter((it) => it.selected === true)
    : [];

  return (
    <div id="pdf-single-page" className="pdf-page" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>
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

      {/* Customer & Quotation Meta Grid */}
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

      {/* 1. Body Fabrication Specifications Table */}
      {quotation.body_calc?.has_data && (
        <div style={{ marginBottom: '1.15rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '4px', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
              🚛 ગાડી કાંટલે / બોડી વર્ક (Body Fabrication Specifications)
            </span>
          </div>

          <table className="print-table" style={{ marginBottom: '0.35rem', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '8%', textAlign: 'center' }}>Sr.</th>
                <th style={{ width: '60%' }}>Part Description (વિગત)</th>
                <th style={{ width: '32%', textAlign: 'center' }}>Specification / Dimensions (માપ અને વિગત)</th>
              </tr>
            </thead>
            <tbody>
              {/* Part 1: Platform / Floor */}
              {(Number(quotation.body_calc.taliyu?.amount) > 0 || Number(quotation.body_calc.taliyu?.total_weight) > 0 || Number(quotation.body_calc.taliyu?.total_sqft) > 0 || quotation.body_calc.taliyu?.length) && (
                <tr>
                  <td style={{ textAlign: 'center', color: '#64748b' }}>1</td>
                  <td>
                    <div className="print-item-title">
                      પ્લેટફોર્મ (Platform) - {quotation.body_calc.taliyu.selected_label || quotation.body_calc.taliyu.selected_option || 'પ્લેટ'}
                    </div>
                    <span className="print-item-variant">
                      લંબાઈ: {quotation.body_calc.taliyu.length} ft × પહોળાઈ: {quotation.body_calc.taliyu.width} ft
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }} className="font-mono">
                    <strong>{quotation.body_calc.taliyu.length}' × {quotation.body_calc.taliyu.width}'</strong>
                  </td>
                </tr>
              )}

              {/* Part 2: Side */}
              {(Number(quotation.body_calc.side?.amount) > 0 || Number(quotation.body_calc.side?.total_weight) > 0 || Number(quotation.body_calc.side?.total_sqft) > 0 || quotation.body_calc.side?.length) && (
                <tr>
                  <td style={{ textAlign: 'center', color: '#64748b' }}>2</td>
                  <td>
                    <div className="print-item-title">
                      સાઇડ (Side) - {quotation.body_calc.side.selected_label || quotation.body_calc.side.selected_option || 'ચાદર'}
                    </div>
                    <span className="print-item-variant">
                      લંબાઈ: {quotation.body_calc.side.length} ft × ઉંચાઈ: {quotation.body_calc.side.height} ft × ૨ સાઇડ
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }} className="font-mono">
                    <strong>{quotation.body_calc.side.length}' × {quotation.body_calc.side.height}' (૨ સાઇડ)</strong>
                  </td>
                </tr>
              )}

              {/* Part 3: Dhoka */}
              {(Number(quotation.body_calc.dhoka?.amount) > 0 || Number(quotation.body_calc.dhoka?.total_weight) > 0 || Number(quotation.body_calc.dhoka?.qty) > 0) && (
                <tr>
                  <td style={{ textAlign: 'center', color: '#64748b' }}>3</td>
                  <td>
                    <div className="print-item-title">ધોકા (Cross Members)</div>
                  </td>
                  <td style={{ textAlign: 'center' }} className="font-mono">
                    <strong>{quotation.body_calc.dhoka.qty || 0} નંગ</strong>
                  </td>
                </tr>
              )}

              {/* Part 4: Thambhla */}
              {(Number(quotation.body_calc.thambhla?.amount) > 0 || Number(quotation.body_calc.thambhla?.total_weight) > 0 || Number(quotation.body_calc.thambhla?.qty) > 0) && (
                <tr>
                  <td style={{ textAlign: 'center', color: '#64748b' }}>4</td>
                  <td>
                    <div className="print-item-title">થાંભલા (Pillars)</div>
                    <span className="print-item-variant">
                      {quotation.body_calc.thambhla.qty} નંગ × {quotation.body_calc.thambhla.height} ft
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }} className="font-mono">
                    <strong>{quotation.body_calc.thambhla.total_feet || 0} ft ({quotation.body_calc.thambhla.qty} નંગ)</strong>
                  </td>
                </tr>
              )}

              {/* Part 5: Machado */}
              {Boolean(
                quotation.body_calc.machado?.enabled &&
                (Number(quotation.body_calc.machado?.amount) > 0 || Number(quotation.body_calc.machado?.weight) > 0 || isCustomerView)
              ) && (
                <tr>
                  <td style={{ textAlign: 'center', color: '#64748b' }}>5</td>
                  <td>
                    <div className="print-item-title">માચડો (Machado / Carrier)</div>
                    <span className="print-item-variant">
                      {quotation.body_calc.machado.selected_label || quotation.body_calc.machado.selectedName || 'કેરિયર / માચડો ફીટીંગ વર્ક'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }} className="font-mono">
                    <strong style={{ color: '#16a34a' }}>✓ સામેલ (Included)</strong>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 2. Additional Items Table */}
      {selectedItems.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '4px', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
              📦 વધારાની વસ્તુઓ (Items & Accessories Included)
            </span>
          </div>
          <table className="print-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '8%', textAlign: 'center' }}>Sr.</th>
                <th style={{ width: '62%' }}>Item Description (વસ્તુ નું નામ / સાઇઝ)</th>
                <th style={{ width: '30%', textAlign: 'center' }}>Status (સામેલ)</th>
              </tr>
            </thead>
            <tbody>
              {selectedItems.map((it, idx) => (
                <tr key={idx}>
                  <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                  <td>
                    <div className="print-item-title">{it.name}</div>
                    {it.variant_name && (
                      <span className="print-item-variant">Size/Option: {it.variant_name}</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }} className="font-mono">
                    <strong style={{ color: '#16a34a' }}>✓ સામેલ</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
          <div className="print-grand-total-row">
            <span>TOTAL AMOUNT (કુલ રકમ):</span>
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
  );
}

export default QuotationPrintContent;

