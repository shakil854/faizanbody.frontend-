import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { truckAccountService } from '../../services/truckAccountService';
import { sharePdfFile, downloadPdfFile } from '../../utils/pdfGenerator';

/**
 * Authentic Five Star 2-Column Truck Account Ledger Sheet (ગાડી વાળા નું ખાતાવહી)
 * Matches physical notebook layout from user photo media_1794244300209_fc4b2f65.jpg
 * Left Column: જ. (JAMA - Payment Received)
 * Right Column: ઉ. (UDHAR - Vehicle Cost & Expenses)
 * Bottom Settlement: Total Bill - Total Jama = Baki (બાકી)
 * STRICT RULE: NO Account No. field!
 */
export function TruckAccountModal({
  isOpen,
  onClose,
  accountId,
  initialAccount = null,
  onAccountChanged,
}) {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState(initialAccount);
  const [entries, setEntries] = useState([]);
  const [mobileTab, setMobileTab] = useState('both'); // 'both' | 'jama' | 'udhar'

  // Add / Edit Entry state (STRICTLY 2 TYPES: 'jama' vs 'udhar')
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [entryType, setEntryType] = useState('jama'); // 'jama' | 'udhar'
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [particulars, setParticulars] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete entry state
  const [deletingEntry, setDeletingEntry] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // PDF state
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfToast, setPdfToast] = useState('');

  const amountInputRef = useRef(null);

  const fetchAccountData = useCallback(async () => {
    if (!accountId) return;
    try {
      setLoading(true);
      const res = await truckAccountService.getAccountById(accountId);
      if (res && res.data) {
        setAccount(res.data);
        setEntries(res.data.entries || []);
      }
    } catch (err) {
      console.error('Error loading truck account details:', err);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    if (isOpen && accountId) {
      fetchAccountData();
      setShowAddForm(false);
      setEditingEntry(null);
      setFormError('');
    }
  }, [isOpen, accountId, fetchAccountData]);

  useEffect(() => {
    if (showAddForm) {
      setTimeout(() => amountInputRef.current?.focus(), 60);
    }
  }, [showAddForm]);

  // Separate Jama and Udhar rows
  const jamaRows = useMemo(() => {
    return (entries || [])
      .filter((e) => e && e.type === 'jama')
      .sort((a, b) => (String(a.date) > String(b.date) ? 1 : -1));
  }, [entries]);

  const udharRows = useMemo(() => {
    return (entries || [])
      .filter((e) => e && e.type === 'udhar')
      .sort((a, b) => (String(a.date) > String(b.date) ? 1 : -1));
  }, [entries]);

  const totalJama = useMemo(() => {
    return jamaRows.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [jamaRows]);

  const totalUdhar = useMemo(() => {
    return udharRows.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [udharRows]);

  const remainingBalance = totalUdhar - totalJama; // > 0: Due to pay (બાકી), <= 0: Settled/Advance

  // Quick Open Add Jama
  const handleOpenAddJama = () => {
    setEditingEntry(null);
    setEntryType('jama');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setParticulars('રોકડા જમા');
    setPaymentMode('Cash');
    setFormError('');
    setShowAddForm(true);
  };

  // Quick Open Add Udhar
  const handleOpenAddUdhar = () => {
    setEditingEntry(null);
    setEntryType('udhar');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setParticulars('ગાડી ની કિંમત');
    setPaymentMode('Cash');
    setFormError('');
    setShowAddForm(true);
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setEntryType(entry.type);
    setAmount(String(entry.amount));
    setDate(entry.date || new Date().toISOString().split('T')[0]);
    setParticulars(entry.particulars || '');
    setPaymentMode(entry.payment_mode || 'Cash');
    setFormError('');
    setShowAddForm(true);
  };

  const handleSaveEntry = async (e) => {
    e.preventDefault();
    const cleanAmt = Number(amount);
    if (!cleanAmt || cleanAmt <= 0) {
      setFormError('Please enter a valid amount greater than ₹0');
      amountInputRef.current?.focus();
      return;
    }
    if (!date) {
      setFormError('Please select a valid date');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError('');

      const payload = {
        type: entryType,
        amount: cleanAmt,
        date,
        particulars: particulars.trim() || (entryType === 'jama' ? 'રોકડા જમા' : 'ગાડી ની કિંમત'),
        payment_mode: paymentMode,
      };

      if (editingEntry) {
        await truckAccountService.updateEntry(accountId, editingEntry.id, payload);
      } else {
        await truckAccountService.addEntry(accountId, payload);
      }

      await fetchAccountData();
      if (typeof onAccountChanged === 'function') {
        onAccountChanged();
      }

      setShowAddForm(false);
      setEditingEntry(null);
      setAmount('');
      setParticulars('');
    } catch (err) {
      setFormError(err.message || 'Error saving entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!deletingEntry) return;
    try {
      setIsDeleting(true);
      await truckAccountService.deleteEntry(accountId, deletingEntry.id);
      await fetchAccountData();
      if (typeof onAccountChanged === 'function') {
        onAccountChanged();
      }
      setDeletingEntry(null);
    } catch (err) {
      console.error('Error deleting entry:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // WhatsApp Share
  const handleShareWhatsApp = () => {
    const pName = account?.party_name || 'Truck Account';
    const pageStr = account?.page_no ? `Page No: ${account.page_no}` : '';
    const truckStr = account?.truck_no ? `Truck No: ${account.truck_no}` : '';

    let text = `🚛 *FAIZAN BODY WORKSHOP*\n`;
    text += `*Vehicle Khata Ledger (ગાડી વાળા નું ખાતું)*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `👤 *Party:* ${pName}\n`;
    if (pageStr) text += `📖 *${pageStr}*\n`;
    if (truckStr) text += `🚚 *${truckStr}*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    text += `*🔹 ઉધાર / TOTAL BILL (Charges):* ₹${totalUdhar.toLocaleString('en-IN')}/-\n`;
    udharRows.forEach((r, i) => {
      text += `  ${i + 1}. ${r.particulars || 'Bill'}: ₹${Number(r.amount).toLocaleString('en-IN')}/-\n`;
    });

    text += `\n*🔸 જમા / TOTAL RECEIVED (Payments):* ₹${totalJama.toLocaleString('en-IN')}/-\n`;
    jamaRows.forEach((r, i) => {
      text += `  ${i + 1}. ${r.date?.slice(5) || ''} ${r.particulars || 'Rokda'}: ₹${Number(r.amount).toLocaleString('en-IN')}/-\n`;
    });

    text += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `*💰 TOTAL BILL:* ₹${totalUdhar.toLocaleString('en-IN')}/-\n`;
    text += `*💵 LESS RECEIVED:* - ₹${totalJama.toLocaleString('en-IN')}/-\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    if (remainingBalance > 0) {
      text += `*🔴 બાકી રહેલ રકમ (Remaining Due): ₹${remainingBalance.toLocaleString('en-IN')}/-*\n`;
    } else if (remainingBalance < 0) {
      text += `*🟢 એડવાન્સ જમા (Advance Paid): ₹${Math.abs(remainingBalance).toLocaleString('en-IN')}/-*\n`;
    } else {
      text += `*✅ સંપૂર્ણ હિસાબ સરભર (Fully Settled - ₹0 Due)*\n`;
    }

    const cleanPhone = (account?.phone || '').replace(/[^0-9]/g, '');
    const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const url = waPhone
      ? `https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
  };

  // PDF Export
  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      setPdfToast('Generating PDF...');
      const element = document.getElementById('printableTruckAccountSheet');
      if (!element) {
        setPdfToast('Could not find printable element');
        return;
      }
      const pName = (account?.party_name || 'Truck_Account').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Truck_Khata_${pName}_Page_${account?.page_no || '1'}`;
      await downloadPdfFile('printableTruckAccountSheet', filename);
      setPdfToast('PDF downloaded successfully!');
      setTimeout(() => setPdfToast(''), 3000);
    } catch (err) {
      console.error('PDF error:', err);
      setPdfToast('Failed to generate PDF');
      setTimeout(() => setPdfToast(''), 3000);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop-luxury animate-fade-in" onClick={onClose}>
      <div
        className="modal-luxury-card animate-scale-up khata-modal-fullscreen"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top App Bar */}
        <div className="khata-modal-top-bar">
          <div className="top-bar-left">
            <span className="khata-app-pill-icon">🚛</span>
            <div>
              <div className="khata-title-row">
                <h3 className="khata-modal-title">
                  {account?.party_name || 'Truck Account'}
                </h3>
                {account?.page_no && (
                  <span className="khata-page-tag">
                    Page {account.page_no}
                  </span>
                )}
              </div>
              <p className="khata-modal-subtitle">
                {account?.truck_no ? `Truck: ${account.truck_no}` : 'Vehicle Customer Khata (ગાડી વાળા નું ખાતાવહી)'}
                {account?.phone ? ` • 📞 ${account.phone}` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Action Ribbon & Quick Buttons */}
        <div className="khata-modal-body-scroll">
          <div className="khata-action-ribbon">
            <button
              type="button"
              className="btn-khata-action btn-add-jama"
              onClick={handleOpenAddJama}
            >
              <span>+</span>
              <span>💰 + Jama (રોકડા જમા)</span>
            </button>

            <button
              type="button"
              className="btn-khata-action btn-add-udhar"
              onClick={handleOpenAddUdhar}
            >
              <span>+</span>
              <span>⚡ + Udhar (ગાડી ની કિંમત / ખર્ચ)</span>
            </button>

            <button
              type="button"
              className="btn-khata-action btn-share-pdf"
              onClick={handleShareWhatsApp}
            >
              <span>💬</span>
              <span>Share WhatsApp</span>
            </button>

            <button
              type="button"
              className="btn-khata-action btn-download-pdf"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
            >
              <span>📥</span>
              <span>{isGeneratingPdf ? 'PDF...' : 'Download PDF'}</span>
            </button>
          </div>

          {pdfToast && (
            <div className="khata-pdf-toast-banner">
              <span>{pdfToast}</span>
            </div>
          )}

          {/* Add / Edit Entry Form (Strictly 2 Tabs: Jama & Udhar) */}
          {showAddForm && (
            <div className="khata-add-entry-box animate-fade-in" style={{ margin: '0.75rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <h4 className="entry-box-title" style={{ margin: 0 }}>
                  {editingEntry
                    ? '✏️ Edit Entry'
                    : entryType === 'jama'
                    ? '💰 New Jama Entry (રકમ જમા / Payment)'
                    : '⚡ New Udhar Entry (ગાડી ની કિંમત / ખર્ચ)'}
                </h4>
                <button
                  type="button"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#64748b' }}
                  onClick={() => setShowAddForm(false)}
                >
                  ✕
                </button>
              </div>

              {formError && (
                <div className="form-alert-error" style={{ marginBottom: '0.65rem' }}>
                  <span>⚠️ {formError}</span>
                </div>
              )}

              <form onSubmit={handleSaveEntry} className="khata-entry-form">
                {/* 2-Option Selector */}
                <div className="entry-type-selector" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <button
                    type="button"
                    className={`entry-type-tab tab-salary ${entryType === 'jama' ? 'active' : ''}`}
                    onClick={() => {
                      setEntryType('jama');
                      setParticulars('રોકડા જમા');
                    }}
                  >
                    💰 Jama (રોકડા / Received)
                  </button>
                  <button
                    type="button"
                    className={`entry-type-tab tab-upad ${entryType === 'udhar' ? 'active' : ''}`}
                    onClick={() => {
                      setEntryType('udhar');
                      setParticulars('ગાડી ની કિંમત');
                    }}
                  >
                    ⚡ Udhar (ગાડી ની કિંમત / Bill)
                  </button>
                </div>

                {/* Quick Suggestion Chips */}
                <div style={{ margin: '0.35rem 0 0.65rem' }}>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, marginRight: '0.4rem' }}>
                    Quick Select:
                  </span>
                  {entryType === 'udhar' ? (
                    <div style={{ display: 'inline-flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {['ગાડી ની કિંમત', 'ગેરેજ - ઓઇલ-એન્જિન', 'માલસામાન', 'કલર કામ', 'રેડિયમ કામ', 'એક્સેસરીઝ'].map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => setParticulars(sug)}
                          style={{
                            background: particulars === sug ? '#ea580c' : '#fff7ed',
                            color: particulars === sug ? '#fff' : '#c2410c',
                            border: '1px solid #fed7aa',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            padding: '0.2rem 0.55rem',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'inline-flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {['રોકડા જમા', 'બેંક ટ્રાન્સફર', 'ચેક થી જમા', 'UPI / Online'].map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => setParticulars(sug)}
                          style={{
                            background: particulars === sug ? '#16a34a' : '#f0fdf4',
                            color: particulars === sug ? '#fff' : '#15803d',
                            border: '1px solid #bbf7d0',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            padding: '0.2rem 0.55rem',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="entry-inputs-grid">
                  {/* Amount */}
                  <div className="form-group">
                    <label className="form-label">Amount (₹) *</label>
                    <div className="input-with-icon">
                      <span className="field-icon rupee-icon">₹</span>
                      <input
                        ref={amountInputRef}
                        type="number"
                        className="form-input amount-input"
                        placeholder="e.g. 100000"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                        min="1"
                        step="any"
                      />
                    </div>
                  </div>

                  {/* Date */}
                  <div className="form-group">
                    <label className="form-label">Date (તારીખ) *</label>
                    <input
                      type="date"
                      className="form-input date-input"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="entry-inputs-grid">
                  {/* Particulars */}
                  <div className="form-group">
                    <label className="form-label">Particulars / Details (વિગત)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder={entryType === 'jama' ? 'e.g. રોકડા જમા' : 'e.g. ગાડી ની કિંમત / ગેરેજ ખર્ચ'}
                      value={particulars}
                      onChange={(e) => setParticulars(e.target.value)}
                    />
                  </div>

                  {/* Payment Mode */}
                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select
                      className="form-input select-mode"
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                    >
                      <option value="Cash">Cash (રોકડા)</option>
                      <option value="Bank">Bank Transfer (NEFT/RTGS)</option>
                      <option value="UPI">UPI / GPay / PhonePe</option>
                      <option value="Cheque">Cheque (ચેક)</option>
                    </select>
                  </div>
                </div>

                <div className="entry-form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowAddForm(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`btn ${entryType === 'jama' ? 'btn-save-salary' : 'btn-save-upad'}`}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : editingEntry ? 'Save Changes' : `Save ${entryType === 'jama' ? 'Jama' : 'Udhar'}`}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Mobile Tab Switcher (<768px screens) */}
          <div className="vahi-mobile-tabs-bar">
            <button
              type="button"
              className={`vahi-mobile-tab ${mobileTab === 'both' ? 'active' : ''}`}
              onClick={() => setMobileTab('both')}
            >
              📜 Both Columns
            </button>
            <button
              type="button"
              className={`vahi-mobile-tab tab-mobile-jama ${mobileTab === 'jama' ? 'active' : ''}`}
              onClick={() => setMobileTab('jama')}
            >
              💰 Jama ({jamaRows.length})
            </button>
            <button
              type="button"
              className={`vahi-mobile-tab tab-mobile-udhar ${mobileTab === 'udhar' ? 'active' : ''}`}
              onClick={() => setMobileTab('udhar')}
            >
              ⚡ Udhar ({udharRows.length})
            </button>
          </div>

          {/* ====================================================================
              AUTHENTIC PHYSICAL NOTEBOOK LEDGER SHEET
              Matches Five Star physical book layout
              ==================================================================== */}
          <div
            id="printableTruckAccountSheet"
            className={`luxury-khata-sheet mobile-tab-${mobileTab}`}
          >
            {/* Physical Notebook Header (NO Account No.!) */}
            <div className="vahi-header-row" style={{ borderBottom: '2px solid #334155', paddingBottom: '0.85rem' }}>
              {/* Page Number Box (Top-Left, matching '54' in notebook!) */}
              <div
                style={{
                  minWidth: '55px',
                  height: '55px',
                  border: '2.5px solid #1e293b',
                  borderRadius: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f8fafc',
                  padding: '0.2rem',
                }}
              >
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>
                  PAGE
                </span>
                <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>
                  {account?.page_no || '—'}
                </span>
              </div>

              {/* Center / Right Details (Name, Address, Phone, Truck No.) */}
              <div style={{ flex: 1, paddingLeft: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px dashed #cbd5e1', paddingBottom: '0.35rem', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#475569' }}>
                    Name / નામ:
                  </span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>
                    {account?.party_name}
                  </span>
                  {account?.truck_no && (
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, background: '#dbeafe', color: '#1e40af', padding: '0.1rem 0.5rem', borderRadius: '12px' }}>
                      🚛 {account.truck_no}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.8rem', color: '#475569' }}>
                  {account?.address && (
                    <div>
                      <strong style={{ color: '#64748b' }}>Address / સરનામું:</strong> {account.address}
                    </div>
                  )}
                  {account?.phone && (
                    <div>
                      <strong style={{ color: '#64748b' }}>Phone:</strong> {account.phone}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Two Column Layout (Left: Jama, Right: Udhar) */}
            <div className="vahi-two-columns-grid">
              {/* ========================================================
                  LEFT COLUMN: જ. (JAMA - Received / Payment)
                  ======================================================== */}
              <div className="vahi-column vahi-column-jama">
                <div className="vahi-column-title-bar bar-jama">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 900 }}>જ.</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>JAMA (રકમ જમા)</span>
                  </div>
                  <button
                    type="button"
                    className="btn-col-quick-add"
                    onClick={handleOpenAddJama}
                    title="Add Jama Entry"
                  >
                    + ઉમેરો
                  </button>
                </div>

                <div className="vahi-table-wrapper">
                  <table className="vahi-table">
                    <thead>
                      <tr>
                        <th style={{ width: '45px' }}>#</th>
                        <th style={{ width: '75px' }}>તારીખ</th>
                        <th>PARTICULARS (વિગત)</th>
                        <th style={{ textAlign: 'right', width: '110px' }}>રૂપિયા ₹</th>
                        <th style={{ width: '65px', textAlign: 'center' }}>ક્રિયા</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jamaRows.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="vahi-empty-row">
                            કોઈ જમા એન્ટ્રી નથી (No Jama entries yet)
                          </td>
                        </tr>
                      ) : (
                        jamaRows.map((row, idx) => (
                          <tr key={row.id}>
                            <td className="col-idx">{idx + 1}</td>
                            <td className="col-date">
                              {row.date ? row.date.slice(5).replace('-', '/') : '—'}
                            </td>
                            <td className="col-notes">
                              <span style={{ fontWeight: 600 }}>{row.particulars || 'રોકડા જમા'}</span>
                              {row.payment_mode && row.payment_mode !== 'Cash' && (
                                <span style={{ fontSize: '0.68rem', color: '#64748b', marginLeft: '0.4rem' }}>
                                  ({row.payment_mode})
                                </span>
                              )}
                            </td>
                            <td className="col-amount text-amount-jama">
                              ₹{Number(row.amount).toLocaleString('en-IN')}/-
                            </td>
                            <td className="col-actions">
                              <button
                                type="button"
                                className="row-action-btn btn-row-edit"
                                onClick={() => handleEditEntry(row)}
                                title="Edit Entry"
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="row-action-btn btn-row-delete"
                                onClick={() => setDeletingEntry(row)}
                                title="Delete Entry"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Left Total Footer */}
                <div className="vahi-col-footer-total footer-jama">
                  <span className="footer-label">ટોટલ જમા (Total Received):</span>
                  <span className="footer-amount">₹{totalJama.toLocaleString('en-IN')}/-</span>
                </div>
              </div>

              {/* ========================================================
                  RIGHT COLUMN: ઉ. (UDHAR - Vehicle Cost & Expenses)
                  ======================================================== */}
              <div className="vahi-column vahi-column-udhar">
                <div className="vahi-column-title-bar bar-udhar">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: 900 }}>ઉ.</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>UDHAR (બિલ / ખર્ચ)</span>
                  </div>
                  <button
                    type="button"
                    className="btn-col-quick-add btn-add-orange"
                    onClick={handleOpenAddUdhar}
                    title="Add Udhar Entry"
                  >
                    + ઉમેરો
                  </button>
                </div>

                <div className="vahi-table-wrapper">
                  <table className="vahi-table">
                    <thead>
                      <tr>
                        <th style={{ width: '45px' }}>#</th>
                        <th>PARTICULARS (વિગત)</th>
                        <th style={{ textAlign: 'right', width: '110px' }}>રૂપિયા ₹</th>
                        <th style={{ width: '75px' }}>તારીખ</th>
                        <th style={{ width: '65px', textAlign: 'center' }}>ક્રિયા</th>
                      </tr>
                    </thead>
                    <tbody>
                      {udharRows.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="vahi-empty-row">
                            કોઈ ઉધાર એન્ટ્રી નથી (No Udhar entries yet)
                          </td>
                        </tr>
                      ) : (
                        udharRows.map((row, idx) => (
                          <tr key={row.id}>
                            <td className="col-idx">{idx + 1}</td>
                            <td className="col-notes">
                              <span style={{ fontWeight: 700, color: '#9a3412' }}>
                                {row.particulars || 'ગાડી ની કિંમત'}
                              </span>
                            </td>
                            <td className="col-amount text-amount-udhar">
                              ₹{Number(row.amount).toLocaleString('en-IN')}/-
                            </td>
                            <td className="col-date">
                              {row.date ? row.date.slice(5).replace('-', '/') : '—'}
                            </td>
                            <td className="col-actions">
                              <button
                                type="button"
                                className="row-action-btn btn-row-edit"
                                onClick={() => handleEditEntry(row)}
                                title="Edit Entry"
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                className="row-action-btn btn-row-delete"
                                onClick={() => setDeletingEntry(row)}
                                title="Delete Entry"
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Right Total Footer */}
                <div className="vahi-col-footer-total footer-udhar">
                  <span className="footer-label">ટોટલ બિલ / ઉધાર:</span>
                  <span className="footer-amount">₹{totalUdhar.toLocaleString('en-IN')}/-</span>
                </div>

                {/* ========================================================
                    AUTHENTIC PHYSICAL NOTEBOOK SETTLEMENT BOX
                    Exactly as written in pen in the user's photo!
                    ======================================================== */}
                <div
                  style={{
                    margin: '0.85rem 0.5rem 0.5rem',
                    padding: '0.85rem 1rem',
                    background: '#f8fafc',
                    border: '2px solid #cbd5e1',
                    borderRadius: '12px',
                    fontFamily: 'monospace',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.35rem' }}>
                    <span>ટોટલ બિલ / ઉધાર:</span>
                    <span style={{ color: '#ea580c' }}>₹{totalUdhar.toLocaleString('en-IN')}/-</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem', fontWeight: 700, color: '#1e293b', borderBottom: '2px solid #94a3b8', paddingBottom: '0.35rem', marginBottom: '0.45rem' }}>
                    <span>- ટોટલ જમા (મળેલ):</span>
                    <span style={{ color: '#16a34a' }}>- ₹{totalJama.toLocaleString('en-IN')}/-</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '1.15rem', fontWeight: 900 }}>
                    <span style={{ color: remainingBalance > 0 ? '#b91c1c' : remainingBalance < 0 ? '#1d4ed8' : '#15803d' }}>
                      {remainingBalance > 0 ? 'બાકી (Due to Pay):' : remainingBalance < 0 ? 'એડવાન્સ જમા (Advance):' : 'સરભર (Settled):'}
                    </span>
                    <span style={{ color: remainingBalance > 0 ? '#b91c1c' : remainingBalance < 0 ? '#1d4ed8' : '#15803d' }}>
                      ₹{Math.abs(remainingBalance).toLocaleString('en-IN')}/-
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notebook Signature & Footer Line */}
            <div style={{ marginTop: '1.25rem', paddingTop: '0.65rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
              <span>FAIZAN BODY TRUCK ACCOUNT</span>
              <span>FIVE STAR LEDGER</span>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {deletingEntry && (
          <div className="modal-backdrop-luxury animate-fade-in" style={{ zIndex: 1100 }}>
            <div className="modal-luxury-card animate-scale-up" style={{ maxWidth: '420px', padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.5rem', color: '#0f172a' }}>Delete Entry?</h3>
              <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 1.25rem' }}>
                Are you sure you want to delete this {deletingEntry.type === 'jama' ? 'Jama' : 'Udhar'} entry of{' '}
                <strong>₹{Number(deletingEntry.amount).toLocaleString('en-IN')}/-</strong> ({deletingEntry.particulars})?
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setDeletingEntry(null)}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDeleteEntry}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete Entry'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TruckAccountModal;

