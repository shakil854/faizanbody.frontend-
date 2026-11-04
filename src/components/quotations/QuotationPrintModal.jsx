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

    if (quotation.body_calc?.has_data) {
      lines.push(`*🚛 BODY FABRICATION (ગાડી કાંટલે):*`);
      if (Number(quotation.body_calc.taliyu?.amount) > 0) {
        const t = quotation.body_calc.taliyu;
        lines.push(`• *તળીયું (${t.selected_label || t.selected_option})*: ${t.length}' × ${t.width}' = ${t.total_sqft} S.F.${Number(t.total_weight) > 0 ? ` (${t.total_weight} kg)` : ''} @ ₹${t.rate}/kg = *₹${Number(t.amount).toLocaleString('en-IN')}*`);
      }
      if (Number(quotation.body_calc.side?.amount) > 0) {
        const s = quotation.body_calc.side;
        lines.push(`• *Side (${s.selected_label || s.selected_option})*: ${s.length}' × ${s.height}' × 2 = ${s.total_sqft} S.F.${Number(s.total_weight) > 0 ? ` (${s.total_weight} kg)` : ''} @ ₹${s.rate}/kg = *₹${Number(s.amount).toLocaleString('en-IN')}*`);
      }
      if (Number(quotation.body_calc.dhoka?.amount) > 0) {
        const d = quotation.body_calc.dhoka;
        lines.push(`• *ધોકા*: ${d.qty} નંગ (${d.total_weight} kg) @ ₹${d.rate}/kg = *₹${Number(d.amount).toLocaleString('en-IN')}*`);
      }
      if (Number(quotation.body_calc.thambhla?.amount) > 0) {
        const th = quotation.body_calc.thambhla;
        lines.push(`• *થાંભલા*: ${th.qty} નંગ (${th.total_weight} kg) @ ₹${th.rate}/kg = *₹${Number(th.amount).toLocaleString('en-IN')}*`);
      }
      if (Number(quotation.body_calc.purchuran?.amount) > 0) {
        const p = quotation.body_calc.purchuran;
        lines.push(`• *પરચુરણ*: ${p.qty} નંગ @ ₹${p.rate} = *₹${Number(p.amount).toLocaleString('en-IN')}*`);
      }
      if (Number(quotation.body_calc.total_weight) > 0) {
        lines.push(`  _Total Body Weight: ${Number(quotation.body_calc.total_weight).toLocaleString('en-IN')} kg_`);
      }
      lines.push(`--------------------------------`);
    }

    if (Array.isArray(quotation.items) && quotation.items.length > 0) {
      lines.push(`*ITEMS & ACCESSORIES:*`);
      quotation.items.forEach((it, idx) => {
        const variantText = it.variant_name ? ` (${it.variant_name})` : '';
        lines.push(`${idx + 1}. *${it.name}${variantText}*`);
        lines.push(`   ${it.qty} × ₹${it.rate} = *₹${Number(it.amount).toLocaleString('en-IN')}*`);
      });
      lines.push(`--------------------------------`);
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

          {/* 1. Body Fabrication Specifications Table (If Body Calc exists) */}
          {quotation.body_calc?.has_data && (
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '4px', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                  🚛 ગાડી કાંટલે / બોડી વર્ક (Body Fabrication Work)
                </span>
                {Number(quotation.body_calc.total_weight) > 0 && (
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                    કુલ અંદાજિત વજન: <strong>{Number(quotation.body_calc.total_weight).toLocaleString('en-IN')} kg</strong>
                  </span>
                )}
              </div>

              <table className="print-table" style={{ marginBottom: '0.35rem' }}>
                <thead>
                  <tr>
                    <th style={{ width: '6%', textAlign: 'center' }}>Sr.</th>
                    <th style={{ width: '46%' }}>Part Description (વિગત)</th>
                    <th style={{ width: '16%', textAlign: 'center' }}>Size / Sq.Ft. / Qty</th>
                    <th style={{ width: '16%', textAlign: 'right' }}>Rate (₹)</th>
                    <th style={{ width: '16%', textAlign: 'right' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {Number(quotation.body_calc.taliyu?.amount) > 0 && (
                    <tr>
                      <td style={{ textAlign: 'center', color: '#64748b' }}>1</td>
                      <td>
                        <div className="print-item-title">
                          તળીયું (Floor) - {quotation.body_calc.taliyu.selected_label || quotation.body_calc.taliyu.selected_option}
                        </div>
                        <span className="print-item-variant">
                          લંબાઈ: {quotation.body_calc.taliyu.length} ft × પહોળાઈ: {quotation.body_calc.taliyu.width} ft
                          {Number(quotation.body_calc.taliyu.total_weight) > 0 && ` • વજન: ${quotation.body_calc.taliyu.total_weight} kg`}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }} className="font-mono">
                        {Number(quotation.body_calc.taliyu.total_weight) > 0 ? (
                          <>
                            <strong>{quotation.body_calc.taliyu.total_weight} kg</strong>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>({quotation.body_calc.taliyu.total_sqft} Sq.Ft.)</span>
                          </>
                        ) : (
                          `${quotation.body_calc.taliyu.total_sqft} Sq.Ft.`
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }} className="font-mono">
                        ₹{Number(quotation.body_calc.taliyu.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })} / kg
                      </td>
                      <td style={{ textAlign: 'right' }} className="font-mono font-semibold">
                        ₹{Number(quotation.body_calc.taliyu.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}

                  {Number(quotation.body_calc.side?.amount) > 0 && (
                    <tr>
                      <td style={{ textAlign: 'center', color: '#64748b' }}>2</td>
                      <td>
                        <div className="print-item-title">
                          Side (બાજુ) - {quotation.body_calc.side.selected_label || quotation.body_calc.side.selected_option}
                        </div>
                        <span className="print-item-variant">
                          લંબાઈ: {quotation.body_calc.side.length} ft × ઉંચાઈ: {quotation.body_calc.side.height} ft × 2 બાજુ
                          {Number(quotation.body_calc.side.total_weight) > 0 && ` • વજન: ${quotation.body_calc.side.total_weight} kg`}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }} className="font-mono">
                        {Number(quotation.body_calc.side.total_weight) > 0 ? (
                          <>
                            <strong>{quotation.body_calc.side.total_weight} kg</strong>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>({quotation.body_calc.side.total_sqft} Sq.Ft.)</span>
                          </>
                        ) : (
                          `${quotation.body_calc.side.total_sqft} Sq.Ft.`
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }} className="font-mono">
                        ₹{Number(quotation.body_calc.side.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })} / kg
                      </td>
                      <td style={{ textAlign: 'right' }} className="font-mono font-semibold">
                        ₹{Number(quotation.body_calc.side.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}

                  {Number(quotation.body_calc.dhoka?.amount) > 0 && (
                    <tr>
                      <td style={{ textAlign: 'center', color: '#64748b' }}>3</td>
                      <td>
                        <div className="print-item-title">ધોકા (Cross Members)</div>
                        <span className="print-item-variant">
                          {quotation.body_calc.dhoka.qty} નંગ (૧ નંગ નો વજન: {quotation.body_calc.dhoka.weight_per_piece} kg) • કુલ વજન: {quotation.body_calc.dhoka.total_weight} kg
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }} className="font-mono">
                        {quotation.body_calc.dhoka.total_weight} kg
                      </td>
                      <td style={{ textAlign: 'right' }} className="font-mono">
                        ₹{Number(quotation.body_calc.dhoka.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })} / kg
                      </td>
                      <td style={{ textAlign: 'right' }} className="font-mono font-semibold">
                        ₹{Number(quotation.body_calc.dhoka.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}

                  {Number(quotation.body_calc.thambhla?.amount) > 0 && (
                    <tr>
                      <td style={{ textAlign: 'center', color: '#64748b' }}>4</td>
                      <td>
                        <div className="print-item-title">થાંભલા (Pillars)</div>
                        <span className="print-item-variant">
                          {quotation.body_calc.thambhla.qty} નંગ × {quotation.body_calc.thambhla.height} ft = {quotation.body_calc.thambhla.total_feet} ft • કુલ વજન: {quotation.body_calc.thambhla.total_weight} kg
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }} className="font-mono">
                        {quotation.body_calc.thambhla.total_weight} kg
                      </td>
                      <td style={{ textAlign: 'right' }} className="font-mono">
                        ₹{Number(quotation.body_calc.thambhla.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })} / kg
                      </td>
                      <td style={{ textAlign: 'right' }} className="font-mono font-semibold">
                        ₹{Number(quotation.body_calc.thambhla.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}

                  {Number(quotation.body_calc.purchuran?.amount) > 0 && (
                    <tr>
                      <td style={{ textAlign: 'center', color: '#64748b' }}>5</td>
                      <td>
                        <div className="print-item-title">પરચુરણ (Purchuran / Misc)</div>
                      </td>
                      <td style={{ textAlign: 'center' }} className="font-mono">
                        {quotation.body_calc.purchuran.qty}
                      </td>
                      <td style={{ textAlign: 'right' }} className="font-mono">
                        ₹{Number(quotation.body_calc.purchuran.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'right' }} className="font-mono font-semibold">
                        ₹{Number(quotation.body_calc.purchuran.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 2. Additional Items Table */}
          {Array.isArray(quotation.items) && quotation.items.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              {quotation.body_calc?.has_data && (
                <div style={{ borderBottom: '2px solid #0f172a', paddingBottom: '4px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                    📦 વધારાની વસ્તુઓ અને એક્સેસરીઝ (Additional Items & Accessories)
                  </span>
                </div>
              )}
              <table className="print-table">
                <thead>
                  <tr>
                    <th style={{ width: '8%', textAlign: 'center' }}>Sr.</th>
                    <th style={{ width: '47%' }}>Item Description (वस्तु का नाम)</th>
                    <th style={{ width: '12%', textAlign: 'center' }}>Qty</th>
                    <th style={{ width: '15%', textAlign: 'right' }}>Rate (₹)</th>
                    <th style={{ width: '18%', textAlign: 'right' }}>Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.items.map((it, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                      <td>
                        <div className="print-item-title">{it.name}</div>
                        {it.variant_name && (
                          <span className="print-item-variant">Size/Option: {it.variant_name}</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }} className="font-mono">{it.qty}</td>
                      <td style={{ textAlign: 'right' }} className="font-mono">
                        ₹{Number(it.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: 'right' }} className="font-mono font-semibold">
                        ₹{Number(it.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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

