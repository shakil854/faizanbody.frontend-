import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { truckAccountService } from '../../services/truckAccountService';
import { downloadPdfFile } from '../../utils/pdfGenerator';

/**
 * Authentic Five Star 2-Column Truck Account Ledger Sheet (ગાડી વાળા નું ખાતાવહી)
 * Matches physical notebook layout from user photo media_1794244300209_fc4b2f65.jpg
 * Left Column: જ. (JAMA - Payment Received)
 * Right Column: ઉ. (UDHAR - Vehicle Cost & Expenses)
 * Bottom Settlement: Total Bill - Total Jama = Baki (બાકી)
 * 100% Responsive on Mobile, Tablet, and PC
 * STRICT RULE: NO Account No. field!
 */
export function TruckAccountModal({
  isOpen,
  onClose,
  accountId,
  initialAccount = null,
  onAccountChanged,
  canManage = true,
  canPrint = true,
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
  const [addToRojmed, setAddToRojmed] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete entry state
  const [deletingEntry, setDeletingEntry] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // PDF state
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfToast, setPdfToast] = useState('');

  // Form input refs for Enter & Arrow Key field navigation
  const amountInputRef = useRef(null);
  const dateInputRef = useRef(null);
  const particularsInputRef = useRef(null);
  const paymentModeRef = useRef(null);
  const jamaTabRef = useRef(null);
  const udharTabRef = useRef(null);

  // Switch to Jama (Side Arrow Left / Tab)
  const switchToJama = useCallback(() => {
    setEntryType('jama');
    setParticulars((prev) => (!prev || prev === 'ગાડી ની કિંમત' ? 'રોકડા જમા' : prev));
  }, []);

  // Switch to Udhar (Side Arrow Right / Tab)
  const switchToUdhar = useCallback(() => {
    setEntryType('udhar');
    setParticulars((prev) => (!prev || prev === 'રોકડા જમા' ? 'ગાડી ની કિંમત' : prev));
  }, []);

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
    setAddToRojmed(false);
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
    setAddToRojmed(false);
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
    setAddToRojmed(Boolean(entry.rojmed_entry_id));
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
        add_to_rojmed: paymentMode === 'Cash' ? addToRojmed : false,
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
      setAddToRojmed(false);
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
        setPdfToast('Could not find printable sheet');
        return;
      }
      const pName = (account?.party_name || 'Truck_Account').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Truck_Khata_${pName}_Page_${account?.page_no || '1'}`;
      await downloadPdfFile({
        elementId: 'printableTruckAccountSheet',
        fileName: filename,
      });
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
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="android-bottom-sheet luxury-bottom-sheet luxury-khata-sheet"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* Mobile Handle */}
          <div className="sheet-handle-bar">
            <div className="sheet-handle"></div>
          </div>

          {/* Sheet Header */}
          <div className="sheet-header khata-sheet-header">
            <div className="sheet-title-group">
              <div
                className="sheet-icon-squircle khata-header-icon"
                style={{ background: '#e0f2fe', borderColor: '#bae6fd' }}
              >
                <span style={{ fontSize: '1.25rem' }}>🚛</span>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <h3 className="sheet-title" style={{ margin: 0 }}>
                    {account?.party_name || 'Truck Account'}
                  </h3>
                  {account?.page_no && (
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        background: '#fee2e2',
                        color: '#991b1b',
                        padding: '0.12rem 0.5rem',
                        borderRadius: '8px',
                        border: '1px solid #fecaca',
                      }}
                    >
                      PAGE {account.page_no}
                    </span>
                  )}
                </div>
                <p className="sheet-subtitle">
                  {account?.truck_no ? `Truck: ${account.truck_no} • ` : ''}
                  {account?.phone ? `📞 ${account.phone} • ` : ''}
                  Vehicle Khata Ledger (ગાડી વાળા નું ખાતાવહી)
                </p>
              </div>
            </div>

            <button
              type="button"
              className="sheet-close-btn"
              onClick={onClose}
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Action Bar (Add Jama, Add Udhar, WhatsApp Share, Download PDF) */}
          <div className="khata-action-bar">
            {canManage && (
              <>
                <button
                  type="button"
                  className="btn btn-add-entry-toggle btn-vahi-action-jama"
                  onClick={handleOpenAddJama}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>+ Jama (રકમ જમા)</span>
                </button>

                <button
                  type="button"
                  className="btn btn-add-entry-toggle btn-vahi-action-udhar"
                  onClick={handleOpenAddUdhar}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>+ Udhar (ગાડી ખર્ચ/બિલ)</span>
                </button>
              </>
            )}

            {canPrint && (
              <>
                <button
                  type="button"
                  className="btn btn-whatsapp-share"
                  onClick={handleShareWhatsApp}
                  title="Share Statement on WhatsApp"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                  <span>Share WhatsApp</span>
                </button>

                <button
                  type="button"
                  className="btn btn-download-pdf-icon"
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  title="Download PDF"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
              </>
            )}
          </div>

          {/* Mobile Column View Switcher (Only visible on Mobile screens < 768px) */}
          <div className="vahi-mobile-tabs-bar">
            <button
              type="button"
              className={`vahi-mob-tab ${mobileTab === 'both' ? 'active' : ''}`}
              onClick={() => setMobileTab('both')}
            >
              📜 Both (જમા + ઉધાર)
            </button>
            <button
              type="button"
              className={`vahi-mob-tab tab-mob-jama ${mobileTab === 'jama' ? 'active' : ''}`}
              onClick={() => setMobileTab('jama')}
            >
              💰 Jama ({jamaRows.length})
            </button>
            <button
              type="button"
              className={`vahi-mob-tab tab-mob-udhar ${mobileTab === 'udhar' ? 'active' : ''}`}
              onClick={() => setMobileTab('udhar')}
            >
              ⚡ Udhar ({udharRows.length})
            </button>
          </div>

          {pdfToast && (
            <div className="khata-pdf-toast-banner">
              <span>{pdfToast}</span>
            </div>
          )}

          {/* Expandable Add / Edit Entry Form (STRICTLY 2 OPTIONS: Jama & Udhar) */}
          {showAddForm && (
            <div className="khata-add-entry-box" style={{ marginBottom: '0.85rem' }}>
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

              <form
                onSubmit={handleSaveEntry}
                className="khata-entry-form"
                onKeyDown={(e) => {
                  if (e.altKey && e.key === 'ArrowLeft') {
                    e.preventDefault();
                    switchToJama();
                    jamaTabRef.current?.focus();
                  } else if (e.altKey && e.key === 'ArrowRight') {
                    e.preventDefault();
                    switchToUdhar();
                    udharTabRef.current?.focus();
                  }
                }}
              >
                {/* 2 Tabs: Left = Jama, Right = Udhar (Navigable with Side Arrows) */}
                <div className="entry-type-selector" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <button
                    ref={jamaTabRef}
                    type="button"
                    className={`entry-type-tab tab-salary ${entryType === 'jama' ? 'active' : ''}`}
                    onClick={switchToJama}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowRight') {
                        e.preventDefault();
                        switchToUdhar();
                        udharTabRef.current?.focus();
                      } else if (e.key === 'Enter' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        amountInputRef.current?.focus();
                      }
                    }}
                    title="Press Left Arrow (◀) to switch to Jama"
                  >
                    💰 ◀ Jama (રોકડા / Received)
                  </button>
                  <button
                    ref={udharTabRef}
                    type="button"
                    className={`entry-type-tab tab-upad ${entryType === 'udhar' ? 'active' : ''}`}
                    onClick={switchToUdhar}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowLeft') {
                        e.preventDefault();
                        switchToJama();
                        jamaTabRef.current?.focus();
                      } else if (e.key === 'Enter' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        amountInputRef.current?.focus();
                      }
                    }}
                    title="Press Right Arrow (▶) to switch to Udhar"
                  >
                    ⚡ Udhar (ગાડી ની કિંમત / Bill) ▶
                  </button>
                </div>

                {/* Quick Suggestion Chips */}
                <div style={{ margin: '0.35rem 0 0.65rem' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, marginRight: '0.4rem' }}>
                    Quick Select:
                  </span>
                  {entryType === 'udhar' ? (
                    <div style={{ display: 'inline-flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {['ગાડી ની કિંમત', 'ગેરેજ - ઓઇલ-એન્જિન', 'માલસામાન', 'કલર કામ', 'રેડિયમ કામ', 'એક્સેસરીઝ'].map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => {
                            setParticulars(sug);
                            amountInputRef.current?.focus();
                          }}
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
                          onClick={() => {
                            setParticulars(sug);
                            amountInputRef.current?.focus();
                          }}
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
                  {/* Amount Input with Enter & Arrow Key Navigation */}
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
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'ArrowDown') {
                            e.preventDefault();
                            dateInputRef.current?.focus();
                          } else if (e.key === 'ArrowLeft') {
                            // Side arrow left: switches to Jama if at start of input
                            if (!amount || e.target.selectionStart === 0 || e.altKey) {
                              e.preventDefault();
                              switchToJama();
                              jamaTabRef.current?.focus();
                            }
                          } else if (e.key === 'ArrowRight') {
                            // Side arrow right: switches to Udhar if at end of input
                            if (!amount || e.target.selectionEnd === String(amount).length || e.altKey) {
                              e.preventDefault();
                              switchToUdhar();
                              udharTabRef.current?.focus();
                            }
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            if (entryType === 'jama') {
                              jamaTabRef.current?.focus();
                            } else {
                              udharTabRef.current?.focus();
                            }
                          }
                        }}
                        required
                        min="1"
                        step="any"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Date Input with Enter & Arrow Key Navigation */}
                  <div className="form-group">
                    <label className="form-label">Date (તારીખ) *</label>
                    <input
                      ref={dateInputRef}
                      type="date"
                      className="form-input date-input"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === 'ArrowDown') {
                          e.preventDefault();
                          particularsInputRef.current?.focus();
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          amountInputRef.current?.focus();
                        }
                      }}
                      required
                    />
                  </div>
                </div>

                <div className="entry-inputs-grid">
                  {/* Particulars with Enter & Arrow Key Navigation */}
                  <div className="form-group">
                    <label className="form-label">Particulars / Details (વિગત)</label>
                    <input
                      ref={particularsInputRef}
                      type="text"
                      className="form-input"
                      placeholder={entryType === 'jama' ? 'e.g. રોકડા જમા' : 'e.g. ગાડી ની કિંમત / ગેરેજ ખર્ચ'}
                      value={particulars}
                      onChange={(e) => setParticulars(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === 'ArrowDown') {
                          e.preventDefault();
                          paymentModeRef.current?.focus();
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          dateInputRef.current?.focus();
                        }
                      }}
                    />
                  </div>

                  {/* Payment Mode with Enter to Submit */}
                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select
                      ref={paymentModeRef}
                      className="form-input select-mode"
                      value={paymentMode}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPaymentMode(val);
                        if (val !== 'Cash') setAddToRojmed(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveEntry(e);
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          particularsInputRef.current?.focus();
                        }
                      }}
                    >
                      <option value="Cash">Cash (રોકડ)</option>
                      <option value="Online/UPI">Online / UPI / PhonePe</option>
                      <option value="Bank">Bank Transfer (NEFT/RTGS)</option>
                      <option value="Cheque">Cheque (ચેક)</option>
                    </select>
                  </div>
                </div>

                {/* Optional Add to Rojmed Checkbox */}
                <div className="rojmed-sync-checkbox-row">
                  <label className={`rojmed-sync-checkbox-label ${paymentMode !== 'Cash' ? 'disabled' : ''}`}>
                    <input
                      type="checkbox"
                      checked={paymentMode === 'Cash' && addToRojmed}
                      disabled={paymentMode !== 'Cash'}
                      onChange={(e) => setAddToRojmed(e.target.checked)}
                    />
                    <span>
                      <strong>📒 રોજમેળમાં ઉમેરો (Also add to Daily Rojmed)</strong>
                      <small>
                        {paymentMode !== 'Cash'
                          ? 'માત્ર Cash (રોકડ) એન્ટ્રી જ રોજમેળમાં ઉમેરી શકાય છે'
                          : entryType === 'jama'
                          ? 'આ એન્ટ્રી રોજમેળમાં આવક (રોકડા જમા) તરીકે પણ ઉમેરાશે'
                          : 'આ એન્ટ્રી રોજમેળમાં જાવક (રોકડ ખર્ચ) તરીકે ઉમેરાશે (માત્ર રોકડ ચૂકવેલ હોય તો જ ટિક કરો)'}
                      </small>
                    </span>
                  </label>
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
                    className="btn btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : editingEntry ? 'Update Entry (Enter ↵)' : 'Save Entry (Enter ↵)'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 2-COLUMN AUTHENTIC KHATA VAHI NOTEBOOK SHEET */}
          <div className="khata-vahi-sheet-container" id="printableTruckAccountSheet">
            {/* Notebook Header Strip (NO Account No.!) */}
            <div className="khata-vahi-header-strip">
              <div className="vahi-header-left">
                <span className="vahi-worker-title">Name / નામ: {account?.party_name}</span>
                <span className="vahi-ac-subtitle">
                  {account?.truck_no ? `Truck: ${account.truck_no} • ` : ''}
                  {account?.phone ? `Phone: ${account.phone} • ` : ''}
                  {account?.address ? `City: ${account.address}` : 'Vehicle Customer Khata'}
                </span>
              </div>

              <div className="vahi-page-stamp">
                <span className="vahi-page-stamp-lbl">PAGE</span>
                <span className="vahi-page-stamp-num">{account?.page_no || '—'}</span>
              </div>
            </div>

            {/* 2 Columns Grid: Left = JAMA (જ.) | Right = UDHAR (ઉ.) */}
            <div className="khata-vahi-grid">
              {/* LEFT COLUMN: જ. (JAMA - Payment Received) */}
              <div className={`khata-vahi-col col-jama ${mobileTab === 'udhar' ? 'mobile-hidden' : ''}`}>
                <div className="vahi-col-top">
                  <div className="vahi-col-title-group">
                    <span className="vahi-col-heading">જ. JAMA (રકમ જમા)</span>
                    <span className="vahi-col-count-badge">{jamaRows.length} items</span>
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      className="btn-vahi-add-entry"
                      onClick={handleOpenAddJama}
                    >
                      + ઉમેરો
                    </button>
                  )}
                </div>

                <div className="vahi-table-wrap">
                  <table className="vahi-table">
                    <thead>
                      <tr>
                        <th style={{ width: '28px', textAlign: 'center' }}>#</th>
                        <th style={{ width: '56px' }}>તારીખ</th>
                        <th>PARTICULARS (વિગત)</th>
                        <th style={{ width: '90px', textAlign: 'right' }}>રૂપિયા ₹</th>
                        {canManage && <th style={{ width: '50px', textAlign: 'center' }}>ક્રિયા</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {jamaRows.length === 0 ? (
                        <tr>
                          <td colSpan={canManage ? 5 : 4} className="vahi-empty-column-box">
                            કોઈ જમા એન્ટ્રી નથી (No Jama entries recorded yet)
                          </td>
                        </tr>
                      ) : (
                        jamaRows.map((row, idx) => (
                          <tr key={row.id}>
                            <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                            <td style={{ fontWeight: 600, color: '#1e293b' }}>
                              {row.date ? row.date.slice(5).replace('-', '/') : '—'}
                            </td>
                            <td>
                              <span style={{ fontWeight: 600 }}>{row.particulars || 'રોકડા જમા'}</span>
                              {row.payment_mode && row.payment_mode !== 'Cash' && (
                                <span className="vahi-mode-badge" style={{ marginLeft: '0.35rem' }}>
                                  {row.payment_mode}
                                </span>
                              )}
                              {row.rojmed_entry_id && (
                                <span className="vahi-mode-badge rojmed-link-pill" style={{ marginLeft: '0.35rem' }}>
                                  📒 Rojmed
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }} className="vahi-amt-jama">
                              ₹{Number(row.amount).toLocaleString('en-IN')}/-
                            </td>
                            {canManage && (
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: '0.85rem' }}
                                  onClick={() => handleEditEntry(row)}
                                  title="Edit Entry"
                                >
                                  ✏️
                                </button>
                                <button
                                  type="button"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: '0.85rem' }}
                                  onClick={() => setDeletingEntry(row)}
                                  title="Delete Entry"
                                >
                                  🗑️
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="vahi-col-footer">
                  <div className="vahi-total-row">
                    <span>ટોટલ જમા (Total Received):</span>
                    <span className="vahi-total-jama-val">₹{totalJama.toLocaleString('en-IN')}/-</span>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: ઉ. (UDHAR - Vehicle Cost & Expenses) */}
              <div className={`khata-vahi-col col-udhar ${mobileTab === 'jama' ? 'mobile-hidden' : ''}`}>
                <div className="vahi-col-top">
                  <div className="vahi-col-title-group">
                    <span className="vahi-col-heading">ઉ. UDHAR (બિલ / ખર્ચ)</span>
                    <span className="vahi-col-count-badge">{udharRows.length} items</span>
                  </div>
                  {canManage && (
                    <button
                      type="button"
                      className="btn-vahi-add-entry"
                      onClick={handleOpenAddUdhar}
                    >
                      + ઉમેરો
                    </button>
                  )}
                </div>

                <div className="vahi-table-wrap">
                  <table className="vahi-table">
                    <thead>
                      <tr>
                        <th style={{ width: '28px', textAlign: 'center' }}>#</th>
                        <th>PARTICULARS (વિગત)</th>
                        <th style={{ width: '90px', textAlign: 'right' }}>રૂપિયા ₹</th>
                        <th style={{ width: '56px' }}>તારીખ</th>
                        {canManage && <th style={{ width: '50px', textAlign: 'center' }}>ક્રિયા</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {udharRows.length === 0 ? (
                        <tr>
                          <td colSpan={canManage ? 5 : 4} className="vahi-empty-column-box">
                            કોઈ ઉધાર એન્ટ્રી નથી (No Udhar entries recorded yet)
                          </td>
                        </tr>
                      ) : (
                        udharRows.map((row, idx) => (
                          <tr key={row.id}>
                            <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{idx + 1}</td>
                            <td>
                              <span style={{ fontWeight: 700, color: '#9a3412' }}>{row.particulars || 'ગાડી ની કિંમત'}</span>
                              {row.rojmed_entry_id && (
                                <span className="vahi-mode-badge rojmed-link-pill" style={{ marginLeft: '0.35rem' }}>
                                  📒 Rojmed
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }} className="vahi-amt-udhar">
                              ₹{Number(row.amount).toLocaleString('en-IN')}/-
                            </td>
                            <td style={{ fontWeight: 600, color: '#1e293b' }}>
                              {row.date ? row.date.slice(5).replace('-', '/') : '—'}
                            </td>
                            {canManage && (
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: '0.85rem' }}
                                  onClick={() => handleEditEntry(row)}
                                  title="Edit Entry"
                                >
                                  ✏️
                                </button>
                                <button
                                  type="button"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: '0.85rem' }}
                                  onClick={() => setDeletingEntry(row)}
                                  title="Delete Entry"
                                >
                                  🗑️
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="vahi-col-footer">
                  <div className="vahi-total-row">
                    <span>ટોટલ બિલ / ઉધાર:</span>
                    <span className="vahi-total-udhar-val">₹{totalUdhar.toLocaleString('en-IN')}/-</span>
                  </div>

                  {/* Closing Settlement Box matching physical notebook pen handwriting */}
                  <div className="vahi-closing-calc-box">
                    <div className="vahi-calc-row calc-subtotal">
                      <span>ટોટલ બિલ / ઉધાર:</span>
                      <span style={{ color: '#b45309' }}>₹{totalUdhar.toLocaleString('en-IN')}/-</span>
                    </div>
                    <div className="vahi-calc-row">
                      <span>- ટોટલ જમા (મળેલ):</span>
                      <span style={{ color: '#15803d' }}>- ₹{totalJama.toLocaleString('en-IN')}/-</span>
                    </div>
                    <div className="vahi-calc-row calc-final">
                      <span style={{ color: remainingBalance > 0 ? '#b91c1c' : remainingBalance < 0 ? '#1d4ed8' : '#15803d' }}>
                        {remainingBalance > 0 ? 'બાકી (Due to Pay):' : remainingBalance < 0 ? 'એડવાન્સ જમા (Advance):' : 'સરભર (Settled):'}
                      </span>
                      <span className={`calc-final-val ${remainingBalance > 0 ? 'val-advance' : 'val-due'}`} style={{ color: remainingBalance > 0 ? '#dc2626' : '#16a34a' }}>
                        ₹{Math.abs(remainingBalance).toLocaleString('en-IN')}/-
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deletingEntry && (
        <div className="modal-backdrop" style={{ zIndex: 100000 }} onClick={() => setDeletingEntry(null)}>
          <div
            className="android-dialog luxury-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '400px' }}
          >
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
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default TruckAccountModal;
