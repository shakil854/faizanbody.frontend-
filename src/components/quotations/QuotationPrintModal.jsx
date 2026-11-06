import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { TruckLogo } from '../common/TruckLogo';

export function QuotationPrintModal({ isOpen, onClose, quotation }) {
  const { isAdmin } = useAuth();
  const [viewMode, setViewMode] = useState(!isAdmin ? 'worker' : 'full');

  if (!isOpen || !quotation) return null;

  const isWorkerSlip = !isAdmin || viewMode === 'worker';

  const handlePrint = () => {
    window.print();
  };

  const cleanPhone = quotation.mobile_number ? quotation.mobile_number.replace(/[^0-9]/g, '') : '';
  const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  const handleWhatsAppShare = () => {
    const lines = [];
    if (isWorkerSlip) {
      lines.push(`*🛠️ WORK SPECIFICATION / JOB SLIP*`);
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
        lines.push(`*🚛 BODY SPECIFICATIONS (ગાડી કાંટલે):*`);
        const t = quotation.body_calc.taliyu;
        if (t && (Number(t.amount) > 0 || Number(t.total_weight) > 0 || Number(t.total_sqft) > 0 || t.length)) {
          lines.push(`• *૧. તળીયું (${t.selected_label || t.selected_option || 'પ્લેટ'})*: ${t.length}' × ${t.width}' = ${t.total_sqft || 0} Sq.Ft.`);
        }
        const s = quotation.body_calc.side;
        if (s && (Number(s.amount) > 0 || Number(s.total_weight) > 0 || Number(s.total_sqft) > 0 || s.length)) {
          lines.push(`• *૨. Side (${s.selected_label || s.selected_option || 'ચાદર'})*: ${s.length}' × ${s.height}' × 2 = ${s.total_sqft || 0} Sq.Ft.`);
        }
        const d = quotation.body_calc.dhoka;
        if (d && (Number(d.amount) > 0 || Number(d.qty) > 0)) {
          lines.push(`• *૩. ધોકા*: ${d.qty || 0} નંગ`);
        }
        const th = quotation.body_calc.thambhla;
        if (th && (Number(th.amount) > 0 || Number(th.qty) > 0)) {
          lines.push(`• *૪. થાંભલા*: ${th.qty || 0} નંગ × ${th.height || 0} ft = ${th.total_feet || 0} ft`);
        }
        const p = quotation.body_calc.purchuran;
        if (p && (p.enabled || Number(p.amount) > 0 || Number(p.rate) > 0)) {
          lines.push(`• *૫. પરચુરણ (Purchuran)*: સામાન્ય ફિટિંગ અને પરચુરણ સામગ્રી`);
        }
        if (quotation.body_calc.machado?.enabled) {
          lines.push(`• *૬. માચડો (Machado)*: કેરિયર / માચડો ફીટીંગ વર્ક`);
        }
        lines.push(`--------------------------------`);
      }

      if (Array.isArray(quotation.items) && quotation.items.length > 0) {
        lines.push(`*ITEMS & SPECIFICATIONS:*`);
        quotation.items.forEach((it, idx) => {
          const variantText = it.variant_name ? ` (${it.variant_name})` : '';
          lines.push(`${idx + 1}. *${it.name}${variantText}* — Qty: ${it.qty}`);
        });
        lines.push(`--------------------------------`);
      }

      lines.push(`*TOTAL AMOUNT (કુલ રકમ):* ₹${Number(quotation.final_price).toLocaleString('en-IN')}`);
      lines.push(`--------------------------------`);
      if (quotation.notes) {
        lines.push(`*Note:* ${quotation.notes}`);
      }
      lines.push(`_Faizan Body Workshop_`);
    } else {
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
        if (Number(quotation.body_calc.taliyu?.amount) > 0 || Number(quotation.body_calc.taliyu?.total_weight) > 0 || Number(quotation.body_calc.taliyu?.total_sqft) > 0) {
          const t = quotation.body_calc.taliyu;
          lines.push(`• *૧. તળીયું (${t.selected_label || t.selected_option || 'પ્લેટ'})*: ${t.length}' × ${t.width}' = ${t.total_sqft} S.F.${Number(t.total_weight) > 0 ? ` (${t.total_weight} kg)` : ''} @ ₹${t.rate || 0}/kg = *₹${Number(t.amount || 0).toLocaleString('en-IN')}*`);
        }
        if (Number(quotation.body_calc.side?.amount) > 0 || Number(quotation.body_calc.side?.total_weight) > 0 || Number(quotation.body_calc.side?.total_sqft) > 0) {
          const s = quotation.body_calc.side;
          lines.push(`• *૨. Side (${s.selected_label || s.selected_option || 'ચાદર'})*: ${s.length}' × ${s.height}' × 2 = ${s.total_sqft} S.F.${Number(s.total_weight) > 0 ? ` (${s.total_weight} kg)` : ''} @ ₹${s.rate || 0}/kg = *₹${Number(s.amount || 0).toLocaleString('en-IN')}*`);
        }
        if (Number(quotation.body_calc.dhoka?.amount) > 0 || Number(quotation.body_calc.dhoka?.total_weight) > 0 || Number(quotation.body_calc.dhoka?.qty) > 0) {
          const d = quotation.body_calc.dhoka;
          lines.push(`• *૩. ધોકા*: ${d.qty || 0} નંગ (${d.total_weight || 0} kg) @ ₹${d.rate || 0}/kg = *₹${Number(d.amount || 0).toLocaleString('en-IN')}*`);
        }
        if (Number(quotation.body_calc.thambhla?.amount) > 0 || Number(quotation.body_calc.thambhla?.total_weight) > 0 || Number(quotation.body_calc.thambhla?.qty) > 0) {
          const th = quotation.body_calc.thambhla;
          lines.push(`• *૪. થાંભલા*: ${th.qty || 0} નંગ (${th.total_weight || 0} kg) @ ₹${th.rate || 0}/kg = *₹${Number(th.amount || 0).toLocaleString('en-IN')}*`);
        }
        if (Number(quotation.body_calc.purchuran?.amount) > 0 || Number(quotation.body_calc.purchuran?.rate) > 0 || quotation.body_calc.purchuran?.enabled) {
          const p = quotation.body_calc.purchuran;
          const pAmt = Number(p.amount || p.rate || 0);
          lines.push(`• *૫. પરચુરણ (Purchuran)*: સામાન્ય ફિટિંગ અને પરચુરણ સામગ્રી = *₹${pAmt.toLocaleString('en-IN')}*`);
        }
        if (quotation.body_calc.machado?.enabled && Number(quotation.body_calc.machado?.amount) > 0) {
          lines.push(`• *૬. માચડો (Machado)*: *₹${Number(quotation.body_calc.machado.amount).toLocaleString('en-IN')}*`);
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
    }

    const text = encodeURIComponent(lines.join('\n'));
    const url = waPhone ? `https://wa.me/${waPhone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  return (
    <div className="quotation-modal-overlay animate-fade-in" onClick={onClose}>
      <div className="quotation-print-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Controls Toolbar (Hidden in Print) */}
        <div className="print-modal-top-bar no-print">
          <div className="print-bar-left" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span className="print-bar-title">
              {isWorkerSlip ? '🛠️ Worker Job Slip' : '📋 Customer Quotation'} &bull; {quotation.quotation_no}
            </span>

            {/* Toggle view mode for Admin */}
            {isAdmin && (
              <div style={{ display: 'inline-flex', background: '#e2e8f0', borderRadius: '6px', padding: '2px' }}>
                <button
                  type="button"
                  onClick={() => setViewMode('full')}
                  style={{
                    border: 'none',
                    background: viewMode === 'full' ? '#ffffff' : 'transparent',
                    color: viewMode === 'full' ? '#0f172a' : '#64748b',
                    fontWeight: 700,
                    fontSize: '0.74rem',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    boxShadow: viewMode === 'full' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  📄 Full Bill (ગ્રાહક બિલ)
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('worker')}
                  style={{
                    border: 'none',
                    background: viewMode === 'worker' ? '#ffffff' : 'transparent',
                    color: viewMode === 'worker' ? '#1d4ed8' : '#64748b',
                    fontWeight: 700,
                    fontSize: '0.74rem',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    boxShadow: viewMode === 'worker' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                >
                  🛠️ Worker Slip (કારીગર સ્લિપ)
                </button>
              </div>
            )}
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
              <span className="doc-type-badge">{isWorkerSlip ? 'WORKER SLIP' : 'QUOTATION'}</span>
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
                {!isWorkerSlip && Number(quotation.body_calc.total_weight) > 0 && (
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155' }}>
                    કુલ અંદાજિત વજન: <strong>{Number(quotation.body_calc.total_weight).toLocaleString('en-IN')} kg</strong>
                  </span>
                )}
              </div>

              <table className="print-table" style={{ marginBottom: '0.35rem' }}>
                <thead>
                  {isWorkerSlip ? (
                    <tr>
                      <th style={{ width: '8%', textAlign: 'center' }}>Sr.</th>
                      <th style={{ width: '62%' }}>Part Description (વિગત)</th>
                      <th style={{ width: '30%', textAlign: 'center' }}>Size / Specification / Qty</th>
                    </tr>
                  ) : (
                    <tr>
                      <th style={{ width: '6%', textAlign: 'center' }}>Sr.</th>
                      <th style={{ width: '46%' }}>Part Description (વિગત)</th>
                      <th style={{ width: '16%', textAlign: 'center' }}>Size / Sq.Ft. / Qty</th>
                      <th style={{ width: '16%', textAlign: 'right' }}>Rate (₹)</th>
                      <th style={{ width: '16%', textAlign: 'right' }}>Amount (₹)</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {(Number(quotation.body_calc.taliyu?.amount) > 0 || Number(quotation.body_calc.taliyu?.total_weight) > 0 || Number(quotation.body_calc.taliyu?.total_sqft) > 0 || quotation.body_calc.taliyu?.length) && (
                    <tr>
                      <td style={{ textAlign: 'center', color: '#64748b' }}>1</td>
                      <td>
                        <div className="print-item-title">
                          તળીયું (Floor) - {quotation.body_calc.taliyu.selected_label || quotation.body_calc.taliyu.selected_option || 'પ્લેટ'}
                        </div>
                        <span className="print-item-variant">
                          લંબાઈ: {quotation.body_calc.taliyu.length} ft × પહોળાઈ: {quotation.body_calc.taliyu.width} ft
                          {Number(quotation.body_calc.taliyu.total_sqft) > 0 && ` • ${quotation.body_calc.taliyu.total_sqft} Sq.Ft.`}
                          {!isWorkerSlip && Number(quotation.body_calc.taliyu.total_weight) > 0 && ` • વજન: ${quotation.body_calc.taliyu.total_weight} kg`}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }} className="font-mono">
                        {isWorkerSlip ? (
                          <strong>{quotation.body_calc.taliyu.total_sqft || 0} Sq.Ft.</strong>
                        ) : Number(quotation.body_calc.taliyu.total_weight) > 0 ? (
                          <>
                            <strong>{quotation.body_calc.taliyu.total_weight} kg</strong>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>({quotation.body_calc.taliyu.total_sqft} Sq.Ft.)</span>
                          </>
                        ) : (
                          `${quotation.body_calc.taliyu.total_sqft || 0} Sq.Ft.`
                        )}
                      </td>
                      {!isWorkerSlip && (
                        <td style={{ textAlign: 'right' }} className="font-mono">
                          ₹{Number(quotation.body_calc.taliyu.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} / kg
                        </td>
                      )}
                      {!isWorkerSlip && (
                        <td style={{ textAlign: 'right' }} className="font-mono font-semibold">
                          ₹{Number(quotation.body_calc.taliyu.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      )}
                    </tr>
                  )}

                  {(Number(quotation.body_calc.side?.amount) > 0 || Number(quotation.body_calc.side?.total_weight) > 0 || Number(quotation.body_calc.side?.total_sqft) > 0 || quotation.body_calc.side?.length) && (
                    <tr>
                      <td style={{ textAlign: 'center', color: '#64748b' }}>2</td>
                      <td>
                        <div className="print-item-title">
                          Side (બાજુ) - {quotation.body_calc.side.selected_label || quotation.body_calc.side.selected_option || 'ચાદર'}
                        </div>
                        <span className="print-item-variant">
                          લંબાઈ: {quotation.body_calc.side.length} ft × ઉંચાઈ: {quotation.body_calc.side.height} ft × 2 બાજુ
                          {Number(quotation.body_calc.side.total_sqft) > 0 && ` • ${quotation.body_calc.side.total_sqft} Sq.Ft.`}
                          {!isWorkerSlip && Number(quotation.body_calc.side.total_weight) > 0 && ` • વજન: ${quotation.body_calc.side.total_weight} kg`}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }} className="font-mono">
                        {isWorkerSlip ? (
                          <strong>{quotation.body_calc.side.total_sqft || 0} Sq.Ft.</strong>
                        ) : Number(quotation.body_calc.side.total_weight) > 0 ? (
                          <>
                            <strong>{quotation.body_calc.side.total_weight} kg</strong>
                            <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>({quotation.body_calc.side.total_sqft} Sq.Ft.)</span>
                          </>
                        ) : (
                          `${quotation.body_calc.side.total_sqft || 0} Sq.Ft.`
                        )}
                      </td>
                      {!isWorkerSlip && (
                        <td style={{ textAlign: 'right' }} className="font-mono">
                          ₹{Number(quotation.body_calc.side.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} / kg
                        </td>
                      )}
                      {!isWorkerSlip && (
                        <td style={{ textAlign: 'right' }} className="font-mono font-semibold">
                          ₹{Number(quotation.body_calc.side.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      )}
                    </tr>
                  )}

                  {(Number(quotation.body_calc.dhoka?.amount) > 0 || Number(quotation.body_calc.dhoka?.total_weight) > 0 || Number(quotation.body_calc.dhoka?.qty) > 0) && (
                    <tr>
                      <td style={{ textAlign: 'center', color: '#64748b' }}>3</td>
                      <td>
                        <div className="print-item-title">ધોકા (Cross Members)</div>
                        <span className="print-item-variant">
                          {quotation.body_calc.dhoka.qty} નંગ
                          {!isWorkerSlip && (
                            <> {quotation.body_calc.dhoka.weight_per_piece ? `(૧ નંગ: ${quotation.body_calc.dhoka.weight_per_piece} kg)` : ''} • કુલ વજન: {quotation.body_calc.dhoka.total_weight} kg</>
                          )}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }} className="font-mono">
                        {isWorkerSlip ? (
                          <strong>{quotation.body_calc.dhoka.qty || 0} નંગ</strong>
                        ) : (
                          <>
                            <strong>{quotation.body_calc.dhoka.total_weight || 0} kg</strong>
                            {Number(quotation.body_calc.dhoka.qty) > 0 && (
                              <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>({quotation.body_calc.dhoka.qty} નંગ)</span>
                            )}
                          </>
                        )}
                      </td>
                      {!isWorkerSlip && (
                        <td style={{ textAlign: 'right' }} className="font-mono">
                          ₹{Number(quotation.body_calc.dhoka.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} / kg
                        </td>
                      )}
                      {!isWorkerSlip && (
                        <td style={{ textAlign: 'right' }} className="font-mono font-semibold">
                          ₹{Number(quotation.body_calc.dhoka.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      )}
                    </tr>
                  )}

                  {(Number(quotation.body_calc.thambhla?.amount) > 0 || Number(quotation.body_calc.thambhla?.total_weight) > 0 || Number(quotation.body_calc.thambhla?.qty) > 0) && (
                    <tr>
                      <td style={{ textAlign: 'center', color: '#64748b' }}>4</td>
                      <td>
                        <div className="print-item-title">થાંભલા (Pillars)</div>
                        <span className="print-item-variant">
                          {quotation.body_calc.thambhla.qty} નંગ × {quotation.body_calc.thambhla.height} ft = {quotation.body_calc.thambhla.total_feet} ft
                          {!isWorkerSlip && (
                            <> {quotation.body_calc.thambhla.weight_per_foot ? `(૧ ફૂટ: ${quotation.body_calc.thambhla.weight_per_foot} kg)` : ''} • કુલ વજન: {quotation.body_calc.thambhla.total_weight} kg</>
                          )}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }} className="font-mono">
                        {isWorkerSlip ? (
                          <strong>{quotation.body_calc.thambhla.total_feet || 0} ft ({quotation.body_calc.thambhla.qty} નંગ)</strong>
                        ) : (
                          <>
                            <strong>{quotation.body_calc.thambhla.total_weight || 0} kg</strong>
                            {Number(quotation.body_calc.thambhla.total_feet) > 0 && (
                              <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block' }}>({quotation.body_calc.thambhla.total_feet} ft)</span>
                            )}
                          </>
                        )}
                      </td>
                      {!isWorkerSlip && (
                        <td style={{ textAlign: 'right' }} className="font-mono">
                          ₹{Number(quotation.body_calc.thambhla.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} / kg
                        </td>
                      )}
                      {!isWorkerSlip && (
                        <td style={{ textAlign: 'right' }} className="font-mono font-semibold">
                          ₹{Number(quotation.body_calc.thambhla.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      )}
                    </tr>
                  )}

                  {Boolean(
                    (quotation.body_calc.purchuran?.enabled ?? (Number(quotation.body_calc.purchuran?.amount) > 0 || Number(quotation.body_calc.purchuran?.rate) > 0)) &&
                    (Number(quotation.body_calc.purchuran?.amount || quotation.body_calc.purchuran?.rate) > 0 || isWorkerSlip)
                  ) && (
                    <tr>
                      <td style={{ textAlign: 'center', color: '#64748b' }}>5</td>
                      <td>
                        <div className="print-item-title">પરચુરણ (Purchuran / Misc)</div>
                        <span className="print-item-variant">સામાન્ય ફિટિંગ અને પરચુરણ સામગ્રી</span>
                      </td>
                      <td style={{ textAlign: 'center' }} className="font-mono">
                        <strong>1 Job</strong>
                      </td>
                      {!isWorkerSlip && (
                        <td style={{ textAlign: 'right' }} className="font-mono">
                          ₹{Number(quotation.body_calc.purchuran.amount || quotation.body_calc.purchuran.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      )}
                      {!isWorkerSlip && (
                        <td style={{ textAlign: 'right' }} className="font-mono font-semibold">
                          ₹{Number(quotation.body_calc.purchuran.amount || quotation.body_calc.purchuran.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      )}
                    </tr>
                  )}

                  {Boolean(quotation.body_calc.machado?.enabled && (Number(quotation.body_calc.machado?.amount) > 0 || isWorkerSlip)) && (
                    <tr>
                      <td style={{ textAlign: 'center', color: '#64748b' }}>6</td>
                      <td>
                        <div className="print-item-title">માચડો (Machado / Carrier)</div>
                        <span className="print-item-variant">કેરિયર / માચડો ફીટીંગ વર્ક</span>
                      </td>
                      <td style={{ textAlign: 'center' }} className="font-mono">
                        <strong>1 Job</strong>
                      </td>
                      {!isWorkerSlip && (
                        <td style={{ textAlign: 'right' }} className="font-mono">
                          ₹{Number(quotation.body_calc.machado.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      )}
                      {!isWorkerSlip && (
                        <td style={{ textAlign: 'right' }} className="font-mono font-semibold">
                          ₹{Number(quotation.body_calc.machado.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      )}
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
                    📦 {isWorkerSlip ? 'વધારાની વસ્તુઓ (Additional Items & Parts)' : 'વધારાની વસ્તુઓ અને એક્સેસરીઝ (Additional Items & Accessories)'}
                  </span>
                </div>
              )}
              <table className="print-table">
                <thead>
                  {isWorkerSlip ? (
                    <tr>
                      <th style={{ width: '10%', textAlign: 'center' }}>Sr.</th>
                      <th style={{ width: '65%' }}>Item Description (વસ્તુ નું નામ / સાઇઝ)</th>
                      <th style={{ width: '25%', textAlign: 'center' }}>Status (સામેલ)</th>
                    </tr>
                  ) : (
                    <tr>
                      <th style={{ width: '8%', textAlign: 'center' }}>Sr.</th>
                      <th style={{ width: '47%' }}>Item Description (वस्तु का नाम)</th>
                      <th style={{ width: '12%', textAlign: 'center' }}>Status</th>
                      <th style={{ width: '15%', textAlign: 'right' }}>Rate (₹)</th>
                      <th style={{ width: '18%', textAlign: 'right' }}>Amount (₹)</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {quotation.items
                    .filter((it) => it.selected !== false && (it.selected === true || parseFloat(it.qty) > 0 || parseFloat(it.amount) > 0 || !('selected' in it)))
                    .map((it, idx) => (
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
                      {!isWorkerSlip && (
                        <td style={{ textAlign: 'right' }} className="font-mono">
                          ₹{Number(it.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      )}
                      {!isWorkerSlip && (
                        <td style={{ textAlign: 'right' }} className="font-mono font-semibold">
                          ₹{Number(it.amount || it.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      )}
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
              {!isWorkerSlip && (
                <>
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
                </>
              )}

              <div className="print-grand-total-row">
                <span>{isWorkerSlip ? 'TOTAL AMOUNT (કુલ રકમ):' : 'FINAL PRICE:'}</span>
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
