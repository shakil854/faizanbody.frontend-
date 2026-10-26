import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { workerService } from '../../services/workerService';
import { sharePdfFile, downloadPdfFile } from '../../utils/pdfGenerator';

export function WorkerKhataModal({ isOpen, onClose, worker, canManage = true }) {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    total_salary: 0,
    total_upad: 0,
    total_paid: 0,
    balance: 0,
  });

  // Date Range Filter state for PDF & Ledger list
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfToast, setPdfToast] = useState('');

  // Add Entry Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [entryType, setEntryType] = useState('upad'); // 'upad', 'payment', 'salary'
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Refs for seamless Enter key field navigation
  const amountInputRef = useRef(null);
  const dateInputRef = useRef(null);
  const notesInputRef = useRef(null);
  const paymentModeRef = useRef(null);

  // Auto-focus amount input whenever the add form opens
  useEffect(() => {
    if (showAddForm) {
      const timer = setTimeout(() => {
        amountInputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [showAddForm]);

  // Delete confirmation state
  const [deletingTx, setDeletingTx] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filter state for history list
  const [filterType, setFilterType] = useState('all'); // 'all', 'upad', 'payment', 'salary'

  // Fetch transactions
  const fetchKhata = useCallback(async () => {
    if (!worker?.id) return;
    try {
      setLoading(true);
      const res = await workerService.getWorkerTransactions(worker.id);
      setTransactions(Array.isArray(res?.transactions) ? res.transactions : []);
      if (res?.summary) {
        setSummary(res.summary);
      }
    } catch (err) {
      console.error('Error loading worker khata:', err);
    } finally {
      setLoading(false);
    }
  }, [worker?.id]);

  useEffect(() => {
    if (isOpen && worker?.id) {
      fetchKhata();
      setShowAddForm(false);
      setFormError('');
      setAmount('');
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
      setEntryType('upad');
      setPdfToast('');
    }
  }, [isOpen, worker?.id, fetchKhata]);

  // 1. Filter all transactions by Date Range (From Date -> To Date)
  const dateFilteredTransactions = useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    return transactions.filter((t) => {
      if (!t) return false;
      const txDate = t.date ? String(t.date).slice(0, 10) : '';
      if (fromDate && txDate && txDate < fromDate) return false;
      if (toDate && txDate && txDate > toDate) return false;
      return true;
    });
  }, [transactions, fromDate, toDate]);

  // 2. Filter by category tab (All / Work / Upad / Paid) for onscreen list
  const filteredTransactions = useMemo(() => {
    if (filterType === 'all') return dateFilteredTransactions;
    return dateFilteredTransactions.filter((t) => t && t.type === filterType);
  }, [dateFilteredTransactions, filterType]);

  // Guaranteed safe summary numbers (HOOK MUST BE BEFORE ANY EARLY RETURN)
  const safeSummary = useMemo(() => ({
    total_salary: Number(summary?.total_salary) || 0,
    total_upad: Number(summary?.total_upad) || 0,
    total_paid: Number(summary?.total_paid) || 0,
    balance: Number(summary?.balance) || 0,
  }), [summary]);

  const isDateFilterActive = Boolean(fromDate || toDate);

  // Period-specific summary when date range is selected
  const rangeSummary = useMemo(() => {
    if (!isDateFilterActive) return safeSummary;
    const totalSalary = dateFilteredTransactions
      .filter((t) => t?.type === 'salary')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const totalUpad = dateFilteredTransactions
      .filter((t) => t?.type === 'upad')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const totalPaid = dateFilteredTransactions
      .filter((t) => t?.type === 'payment')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const balance = totalSalary - (totalUpad + totalPaid);

    return {
      total_salary: totalSalary,
      total_upad: totalUpad,
      total_paid: totalPaid,
      balance,
    };
  }, [dateFilteredTransactions, isDateFilterActive, safeSummary]);

  const effectiveSummary = isDateFilterActive ? rangeSummary : safeSummary;

  const balanceColorClass = effectiveSummary.balance > 0
    ? 'balance-due-pay'
    : effectiveSummary.balance < 0
    ? 'balance-advance-due'
    : 'balance-settled';

  // Return early ONLY AFTER all hooks have executed
  if (!isOpen || !worker) return null;

  // Handle Save New Entry
  const handleSaveEntry = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSubmitting) return;
    setFormError('');

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setFormError('Please enter a valid amount (₹)');
      amountInputRef.current?.focus();
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await workerService.addWorkerTransaction(worker.id, {
        type: entryType,
        amount: numAmount,
        date: date || new Date().toISOString().split('T')[0],
        notes: notes.trim(),
        payment_mode: paymentMode,
      });

      if (res && res.transaction) {
        setTransactions((prev) => [res.transaction, ...(Array.isArray(prev) ? prev : [])]);
        if (res.summary) {
          setSummary(res.summary);
        }
      }

      setAmount('');
      setNotes('');
      setShowAddForm(false);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save transaction entry';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Entry
  const handleConfirmDelete = async () => {
    if (!deletingTx) return;
    try {
      setIsDeleting(true);
      const res = await workerService.deleteWorkerTransaction(worker.id, deletingTx.id);
      setTransactions((prev) => (Array.isArray(prev) ? prev.filter((t) => t.id !== deletingTx.id) : []));
      if (res && res.summary) {
        setSummary(res.summary);
      }
      setDeletingTx(null);
    } catch (err) {
      console.error('Error deleting transaction:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper to chunk transactions into pages for the printable PDF
  const getPdfPagesData = () => {
    const list = dateFilteredTransactions;
    // Page 1 with brand header, meta card, 4 KPI cards and settlement callout can fit up to 12 rows comfortably on 1 page
    if (list.length <= 12) {
      return [{ pageNum: 1, totalPages: 1, rows: list, isFirst: true, isLast: true, startIndex: 0 }];
    }
    const pages = [];
    // Page 1 gets 10 rows when multi-page
    pages.push({ pageNum: 1, rows: list.slice(0, 10), isFirst: true, isLast: false, startIndex: 0 });
    let remaining = list.slice(10);
    let currentIdx = 10;
    while (remaining.length > 0) {
      // Continuation pages have a compact top strip (no banner, no meta box, no KPIs).
      // If final page with settlement callout + signatures, fit up to 14 rows.
      // If middle page, fit up to 18 rows.
      const isNextLast = remaining.length <= 14;
      const rowsCount = isNextLast ? remaining.length : 18;
      const pageRows = remaining.slice(0, rowsCount);
      remaining = remaining.slice(rowsCount);
      const isLast = remaining.length === 0;
      pages.push({
        pageNum: pages.length + 1,
        rows: pageRows,
        startIndex: currentIdx,
        isFirst: false,
        isLast,
      });
      currentIdx += pageRows.length;
    }
    const totalPages = pages.length;
    return pages.map((p) => ({ ...p, totalPages }));
  };

  // Generate and Share PDF statement on WhatsApp
  const handleShareKhataPdf = async () => {
    if (isGeneratingPdf) return;
    try {
      setIsGeneratingPdf(true);
      setPdfToast('⏳ PDF तैयार हो रही है, WhatsApp खुल रहा है...');
      await new Promise((r) => setTimeout(r, 200));

      const cleanName = (worker.name || 'Worker').replace(/[^a-zA-Z0-9_-]/g, '_');
      const datePart = fromDate || toDate
        ? `_${fromDate || 'Start'}_to_${toDate || 'Today'}`
        : '_Full';
      const fileName = `FaizanBody_Khata_${cleanName}${datePart}.pdf`;
      const title = `Faizan Body Works - ${worker.name}'s Khata Statement`;

      const result = await sharePdfFile({
        elementId: 'printableKhataSheet',
        fileName,
        title,
        text: `Khata Statement PDF: ${worker.name} (${fromDate ? `${fromDate} to ${toDate || 'Today'}` : 'Complete Ledger'}) - Faizan Body Works`,
      });

      if (result?.method === 'downloaded') {
        setPdfToast('✅ PDF डाउनलोड हो गई है! आप इसे WhatsApp पर भेज सकते हैं।');
        setTimeout(() => setPdfToast(''), 5000);
      } else if (result?.success) {
        setPdfToast('✅ PDF WhatsApp पर शेयर हो गई!');
        setTimeout(() => setPdfToast(''), 4000);
      } else {
        setPdfToast('');
      }
    } catch (err) {
      console.error('Error sharing Khata PDF:', err);
      setPdfToast('⚠️ PDF शेयर करने में समस्या आई।');
      setTimeout(() => setPdfToast(''), 4000);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Direct Download PDF
  const handleDownloadKhataPdf = async () => {
    if (isGeneratingPdf) return;
    try {
      setIsGeneratingPdf(true);
      setPdfToast('⏳ PDF डाउनलोड हो रही है...');
      await new Promise((r) => setTimeout(r, 200));

      const cleanName = (worker.name || 'Worker').replace(/[^a-zA-Z0-9_-]/g, '_');
      const datePart = fromDate || toDate
        ? `_${fromDate || 'Start'}_to_${toDate || 'Today'}`
        : '_Full';
      const fileName = `FaizanBody_Khata_${cleanName}${datePart}.pdf`;

      await downloadPdfFile({
        elementId: 'printableKhataSheet',
        fileName,
      });

      setPdfToast('✅ PDF सफलतापूर्वक सेव हो गई!');
      setTimeout(() => setPdfToast(''), 4000);
    } catch (err) {
      console.error('Error downloading Khata PDF:', err);
      setPdfToast('⚠️ PDF डाउनलोड करने में समस्या आई।');
      setTimeout(() => setPdfToast(''), 4000);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <>
      <div className="modal-backdrop" onClick={onClose}>
        <div
          className="android-bottom-sheet luxury-bottom-sheet luxury-khata-sheet"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* Drag Handle */}
          <div className="sheet-handle-bar">
            <div className="sheet-handle"></div>
          </div>

          {/* Sheet Header */}
          <div className="sheet-header khata-sheet-header">
            <div className="sheet-title-group">
              <div className="sheet-icon-squircle khata-header-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  <line x1="9" y1="7" x2="15" y2="7" />
                  <line x1="9" y1="11" x2="13" y2="11" />
                </svg>
              </div>
              <div>
                <h3 className="sheet-title">{worker.name}'s Khata</h3>
                <p className="sheet-subtitle">
                  {worker.mobile ? `Mobile: ${worker.mobile} • ` : ''}Debit & Credit Ledger
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

          {/* 4 Summary KPIs Grid (Reflects filtered date range if active) */}
          <div className="khata-kpi-grid">
            {/* Card 1: Total Salary / Earned */}
            <div className="khata-kpi-card card-salary">
              <span className="kpi-label">TOTAL WORK</span>
              <span className="kpi-amount">₹{effectiveSummary.total_salary.toLocaleString('en-IN')}</span>
              <span className="kpi-tag">{isDateFilterActive ? 'In Selected Period' : 'Total Earned'}</span>
            </div>

            {/* Card 2: Total Upaad (Advance) */}
            <div className="khata-kpi-card card-upad">
              <span className="kpi-label">UPAD (ADVANCE)</span>
              <span className="kpi-amount">₹{effectiveSummary.total_upad.toLocaleString('en-IN')}</span>
              <span className="kpi-tag">{isDateFilterActive ? 'In Selected Period' : 'Total Advance'}</span>
            </div>

            {/* Card 3: Total Paid */}
            <div className="khata-kpi-card card-payment">
              <span className="kpi-label">TOTAL PAID</span>
              <span className="kpi-amount">₹{effectiveSummary.total_paid.toLocaleString('en-IN')}</span>
              <span className="kpi-tag">{isDateFilterActive ? 'In Selected Period' : 'Payment Settled'}</span>
            </div>

            {/* Card 4: Net Balance */}
            <div className={`khata-kpi-card card-balance ${balanceColorClass}`}>
              <span className="kpi-label">NET BALANCE</span>
              <span className="kpi-amount">₹{Math.abs(effectiveSummary.balance).toLocaleString('en-IN')}</span>
              <span className="kpi-tag">
                {effectiveSummary.balance > 0 ? 'Due to Pay' : effectiveSummary.balance < 0 ? 'Advance Due' : 'All Clear'}
              </span>
            </div>
          </div>

          {/* Toast Banner for PDF Generation / Feedback */}
          {pdfToast && (
            <div className="khata-pdf-toast-banner">
              <span>{pdfToast}</span>
            </div>
          )}

          {/* Statement Date Range Selector for PDF & Ledger List */}
          <div className="khata-date-range-card">
            <div className="date-range-header">
              <div className="date-range-title">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <span>Date Range Filter (तारीख से तारीख तक फ़िल्टर)</span>
              </div>
              {isDateFilterActive && (
                <button
                  type="button"
                  className="btn-clear-date-filter"
                  onClick={() => { setFromDate(''); setToDate(''); }}
                  title="Show all time transactions"
                >
                  ✕ Show All Time
                </button>
              )}
            </div>

            <div className="date-range-fields-row">
              <div className="date-range-col">
                <label className="date-range-label">From Date (तारीख से):</label>
                <input
                  type="date"
                  className="date-range-input"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>

              <div className="date-range-col">
                <label className="date-range-label">To Date (तारीख तक):</label>
                <input
                  type="date"
                  className="date-range-input"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>

            {isDateFilterActive && (
              <div className="date-range-info-pill">
                <span>
                  📅 <strong>{fromDate || 'Beginning'}</strong> से <strong>{toDate || 'Today'}</strong> तक के <strong>{dateFilteredTransactions.length}</strong> लेन-देन चुने गए हैं (PDF में यही शामिल होंगे)।
                </span>
              </div>
            )}
          </div>

          {/* Quick Action Buttons Bar */}
          <div className="khata-action-bar">
            {canManage && (
              <button
                type="button"
                className={`btn ${showAddForm ? 'btn-secondary' : 'btn-primary'} btn-add-entry-toggle`}
                onClick={() => setShowAddForm((prev) => !prev)}
              >
                {showAddForm ? (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    Close Form
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    + Add New Entry
                  </>
                )}
              </button>
            )}

            {/* Share PDF on WhatsApp */}
            <button
              type="button"
              className="btn btn-whatsapp-share"
              onClick={handleShareKhataPdf}
              disabled={isGeneratingPdf}
              title="Share PDF statement on WhatsApp"
            >
              {isGeneratingPdf ? (
                <>
                  <span className="mini-spinner" style={{ width: '13px', height: '13px' }}></span>
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                  <span>Share on WhatsApp</span>
                </>
              )}
            </button>

            {/* Direct Download PDF Button */}
            <button
              type="button"
              className="btn btn-download-pdf-icon"
              onClick={handleDownloadKhataPdf}
              disabled={isGeneratingPdf}
              title="Download PDF statement (PDF सेव करें)"
              aria-label="Download PDF statement"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
          </div>

          {/* Expandable Add Entry Form */}
          {showAddForm && (
            <div className="khata-add-entry-box">
              <h4 className="entry-box-title">Record New Transaction</h4>

              {formError && (
                <div className="form-alert-error" style={{ marginBottom: '0.65rem' }}>
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSaveEntry} className="khata-entry-form">
                {/* 3 Entry Type Tabs */}
                <div className="entry-type-selector">
                  <button
                    type="button"
                    className={`entry-type-tab tab-salary ${entryType === 'salary' ? 'active' : ''}`}
                    onClick={() => setEntryType('salary')}
                  >
                    💰 Total Work
                  </button>
                  <button
                    type="button"
                    className={`entry-type-tab tab-upad ${entryType === 'upad' ? 'active' : ''}`}
                    onClick={() => setEntryType('upad')}
                  >
                    ⚡ Advance (Upad)
                  </button>
                  <button
                    type="button"
                    className={`entry-type-tab tab-payment ${entryType === 'payment' ? 'active' : ''}`}
                    onClick={() => setEntryType('payment')}
                  >
                    💳 Payment Paid
                  </button>
                </div>

                {/* Amount & Date Grid */}
                <div className="entry-inputs-grid">
                  <div className="form-group">
                    <label className="form-label">Amount (₹) *</label>
                    <div className="input-with-icon">
                      <span className="field-icon rupee-icon">₹</span>
                      <input
                        ref={amountInputRef}
                        type="number"
                        className="form-input amount-input"
                        placeholder="e.g. 1500"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            dateInputRef.current?.focus();
                          }
                        }}
                        autoFocus
                        required
                        min="1"
                        step="any"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <input
                      ref={dateInputRef}
                      type="date"
                      className="form-input date-input"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          notesInputRef.current?.focus();
                        }
                      }}
                      required
                    />
                  </div>
                </div>

                {/* Notes & Mode Grid */}
                <div className="entry-inputs-grid">
                  <div className="form-group">
                    <label className="form-label">Notes / Description (Optional)</label>
                    <input
                      ref={notesInputRef}
                      type="text"
                      className="form-input"
                      placeholder="e.g. Body work wage / Ration advance / Cash paid"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          paymentModeRef.current?.focus();
                        }
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Payment Mode</label>
                    <select
                      ref={paymentModeRef}
                      className="form-input select-mode"
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSaveEntry(e);
                        }
                      }}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Online/UPI">Online / PhonePe / GPay</option>
                      <option value="Bank">Bank Transfer (NEFT/RTGS)</option>
                    </select>
                  </div>
                </div>

                {/* Form Submit Actions */}
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
                    {isSubmitting ? 'Saving...' : 'Save Entry'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* History Filters & Section Title */}
          <div className="khata-history-header">
            <h4 className="history-title">Transaction History ({filteredTransactions.length})</h4>

            <div className="khata-filter-chips">
              <button
                type="button"
                className={`filter-chip ${filterType === 'all' ? 'active' : ''}`}
                onClick={() => setFilterType('all')}
              >
                All
              </button>
              <button
                type="button"
                className={`filter-chip chip-salary ${filterType === 'salary' ? 'active' : ''}`}
                onClick={() => setFilterType('salary')}
              >
                Total Work
              </button>
              <button
                type="button"
                className={`filter-chip chip-upad ${filterType === 'upad' ? 'active' : ''}`}
                onClick={() => setFilterType('upad')}
              >
                Upad (Adv)
              </button>
              <button
                type="button"
                className={`filter-chip chip-payment ${filterType === 'payment' ? 'active' : ''}`}
                onClick={() => setFilterType('payment')}
              >
                Paid
              </button>
            </div>
          </div>

          {/* Transaction History List */}
          <div className="khata-history-list">
            {loading ? (
              <div className="khata-loading-spinner">
                <span className="spinner-dots">Loading Khata history...</span>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="empty-workers-state khata-empty-state">
                <div className="empty-luxury-illustration">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                </div>
                <h3>No transactions found</h3>
                <p>
                  {filterType !== 'all'
                    ? 'No entries found in this filter category.'
                    : 'No transaction recorded for this worker yet. Tap above to add an entry.'}
                </p>
                {canManage && filterType === 'all' && (
                  <button
                    type="button"
                    className="btn btn-primary btn-empty-cta"
                    onClick={() => setShowAddForm(true)}
                  >
                    + Add First Entry
                  </button>
                )}
              </div>
            ) : (
              filteredTransactions.map((tx) => {
                const isSalary = tx.type === 'salary';
                const isUpad = tx.type === 'upad';
                const isPayment = tx.type === 'payment';

                return (
                  <div key={tx.id} className={`khata-tx-card tx-${tx.type}`}>
                    <div className="tx-left">
                      <div className={`tx-icon-pill icon-${tx.type}`}>
                        {isSalary ? (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="19" x2="12" y2="5" />
                            <polyline points="5 12 12 5 19 12" />
                          </svg>
                        ) : isUpad ? (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <polyline points="19 12 12 19 5 12" />
                          </svg>
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        )}
                      </div>

                      <div className="tx-info">
                        <div className="tx-title-row">
                          <span className={`tx-type-badge badge-${tx.type}`}>
                            {isSalary ? '💰 Total Work' : isUpad ? '⚡ Upad (Advance)' : '💳 Payment Paid'}
                          </span>
                          <span className="tx-date-text">{tx.date}</span>
                        </div>
                        {tx.notes && <p className="tx-notes-text">{tx.notes}</p>}
                        <span className="tx-mode-tag">
                          {tx.payment_mode || 'Cash'}
                        </span>
                      </div>
                    </div>

                    <div className="tx-right">
                      <span className={`tx-amount amount-${tx.type}`}>
                        {isSalary ? '+' : '-'}₹{(Number(tx?.amount) || 0).toLocaleString('en-IN')}
                      </span>

                      {canManage && (
                        <button
                          type="button"
                          className="tx-delete-btn"
                          onClick={() => setDeletingTx(tx)}
                          title="Delete entry"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Delete Transaction Confirmation Dialog (Strict Luxury Android Dialog pattern) */}
      {deletingTx && (
        <div className="modal-backdrop" onClick={() => setDeletingTx(null)}>
          <div
            className="android-dialog luxury-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="dialog-icon-wrapper delete-dialog-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </div>
            <h3 className="dialog-title">Delete Transaction?</h3>
            <p className="dialog-message">
              Are you sure you want to delete this ₹{(Number(deletingTx?.amount) || 0).toLocaleString('en-IN')} entry? The account balance will adjust automatically.
            </p>
            <div className="dialog-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeletingTx(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          BACKGROUND PRINTABLE WORKER KHATA STATEMENT
          A4 High-Resolution Canvas for WhatsApp & PDF Export
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
        <div id="printableKhataSheet" className="khata-printable-paper">
          {getPdfPagesData().map((page) => (
            <div
              key={page.pageNum}
              id={page.totalPages === 1 ? 'pdf-single-page' : undefined}
              className="pdf-page khata-pdf-sheet-page"
            >
              {/* Header: Full brand header on Page 1, compact continuation header on Page 2+ */}
              {page.isFirst ? (
                <>
                  <div className="khata-pdf-top-banner">
                    <div className="khata-pdf-brand-col">
                      <h1 className="khata-pdf-main-brand">FAIZAN BODY WORKS</h1>
                      <p className="khata-pdf-sub-brand">Truck Body Builders & Commercial Fabricators</p>
                      <p className="khata-pdf-brand-extra">Specialist in Cabin, Platform, Dumper & All Body Repair Work</p>
                    </div>
                    <div className="khata-pdf-badge-col">
                      <div className="khata-pdf-statement-badge">
                        <span className="badge-eng">WORKER KHATA STATEMENT</span>
                        <span className="badge-hin">कर्मचारी खाता बही (लेजर)</span>
                      </div>
                    </div>
                  </div>

                  {/* Worker & Statement Meta Info Box */}
                  <div className="khata-pdf-meta-card">
                    <div className="khata-meta-grid">
                      <div className="meta-item">
                        <span className="meta-lbl">Worker Name (कर्मचारी):</span>
                        <span className="meta-val meta-worker-name">{worker.name}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-lbl">Mobile (मोबाइल नंबर):</span>
                        <span className="meta-val">{worker.mobile || '—'}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-lbl">Statement Period (अवधि):</span>
                        <span className="meta-val meta-period-val">
                          {fromDate || toDate
                            ? `${fromDate || 'Beginning'} से ${toDate || 'आज तक'}`
                            : 'All Transactions (शुरू से अब तक)'}
                        </span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-lbl">Generated On (दिनांक):</span>
                        <span className="meta-val">
                          {new Date().toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 4 Summary KPI Cards */}
                  <div className="khata-pdf-kpi-row">
                    <div className="pdf-kpi-box box-salary">
                      <span className="kpi-hdr">TOTAL WORK (कुल काम)</span>
                      <span className="kpi-val">₹{effectiveSummary.total_salary.toLocaleString('en-IN')}</span>
                      <span className="kpi-desc">Total Earned</span>
                    </div>
                    <div className="pdf-kpi-box box-upad">
                      <span className="kpi-hdr">TOTAL UPAD (उपाड़)</span>
                      <span className="kpi-val">₹{effectiveSummary.total_upad.toLocaleString('en-IN')}</span>
                      <span className="kpi-desc">Total Advance</span>
                    </div>
                    <div className="pdf-kpi-box box-payment">
                      <span className="kpi-hdr">TOTAL PAID (भुगतान)</span>
                      <span className="kpi-val">₹{effectiveSummary.total_paid.toLocaleString('en-IN')}</span>
                      <span className="kpi-desc">Payment Settled</span>
                    </div>
                    <div className={`pdf-kpi-box box-balance ${effectiveSummary.balance >= 0 ? 'due-pay' : 'due-adv'}`}>
                      <span className="kpi-hdr">NET BALANCE (बाकी)</span>
                      <span className="kpi-val">₹{Math.abs(effectiveSummary.balance).toLocaleString('en-IN')}</span>
                      <span className="kpi-desc">
                        {effectiveSummary.balance > 0 ? 'Due to Worker' : effectiveSummary.balance < 0 ? 'Advance Due' : 'All Settled'}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="khata-pdf-continuation-header">
                  <div className="cont-brand">FAIZAN BODY WORKS • WORKER KHATA</div>
                  <div className="cont-worker">{worker.name} — Statement Page {page.pageNum} of {page.totalPages}</div>
                </div>
              )}

              {/* Transaction Table */}
              <div className="khata-pdf-table-container">
                <div className="khata-pdf-section-title">
                  <span>
                    Transaction Ledger ({page.rows.length} of {dateFilteredTransactions.length} Entries
                    {page.totalPages > 1 ? ` • Page ${page.pageNum} of ${page.totalPages}` : ''})
                  </span>
                </div>
                <table className="khata-pdf-table">
                  <thead>
                    <tr>
                      <th style={{ width: '36px', textAlign: 'center' }}>#</th>
                      <th style={{ width: '88px' }}>Date</th>
                      <th style={{ width: '105px' }}>Type</th>
                      <th>Work / Description / Notes</th>
                      <th style={{ width: '75px' }}>Mode</th>
                      <th style={{ width: '85px', textAlign: 'right' }}>Work (+)</th>
                      <th style={{ width: '85px', textAlign: 'right' }}>Upad (-)</th>
                      <th style={{ width: '85px', textAlign: 'right' }}>Paid (-)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.rows.length === 0 ? (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>
                          कोई लेन-देन दर्ज नहीं मिला (No transactions found)
                        </td>
                      </tr>
                    ) : (
                      page.rows.map((tx, rIdx) => {
                        const globalIdx = (page.startIndex || 0) + rIdx + 1;
                        const isSalary = tx.type === 'salary';
                        const isUpad = tx.type === 'upad';
                        const isPayment = tx.type === 'payment';
                        const amt = Number(tx.amount) || 0;

                        return (
                          <tr key={tx.id || rIdx} className={rIdx % 2 === 1 ? 'row-even' : ''}>
                            <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{globalIdx}</td>
                            <td style={{ fontWeight: 600, color: '#1e293b' }}>{tx.date || '—'}</td>
                            <td>
                              <span className={`pdf-pill-badge badge-${tx.type}`}>
                                {isSalary ? 'Total Work' : isUpad ? 'Upad (Adv)' : 'Payment'}
                              </span>
                            </td>
                            <td>
                              <span className="pdf-tx-notes">{tx.notes || '—'}</span>
                            </td>
                            <td>
                              <span className="pdf-tx-mode">{tx.payment_mode || 'Cash'}</span>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: isSalary ? 700 : 400, color: isSalary ? '#16a34a' : '#cbd5e1' }}>
                              {isSalary ? `₹${amt.toLocaleString('en-IN')}` : '—'}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: isUpad ? 700 : 400, color: isUpad ? '#d97706' : '#cbd5e1' }}>
                              {isUpad ? `₹${amt.toLocaleString('en-IN')}` : '—'}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: isPayment ? 700 : 400, color: isPayment ? '#2563eb' : '#cbd5e1' }}>
                              {isPayment ? `₹${amt.toLocaleString('en-IN')}` : '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {page.isLast && (
                    <tfoot>
                      <tr className="khata-pdf-totals-tr">
                        <td colSpan="5" style={{ textAlign: 'right', fontWeight: 800 }}>
                          Total Summary ({dateFilteredTransactions.length} Transactions):
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>
                          ₹{effectiveSummary.total_salary.toLocaleString('en-IN')}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#d97706' }}>
                          ₹{effectiveSummary.total_upad.toLocaleString('en-IN')}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#2563eb' }}>
                          ₹{effectiveSummary.total_paid.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* On Last Page: Final Balance Settlement Callout, Signatures, and Footer */}
              {page.isLast ? (
                <>
                  <div className="khata-pdf-settlement-callout">
                    <div className="settle-left">
                      <span className="settle-title">Net Balance Status (अंतिम हिसाब):</span>
                      <span className="settle-desc">
                        {effectiveSummary.balance > 0
                          ? `₹${effectiveSummary.balance.toLocaleString('en-IN')} कारीगर को देना बाकी है (Due to Worker)`
                          : effectiveSummary.balance < 0
                          ? `₹${Math.abs(effectiveSummary.balance).toLocaleString('en-IN')} एडवांस कारीगर पर बाकी है (Advance on Worker)`
                          : 'खाता पूर्ण चुकता है (Account Settled - All Clear)'}
                      </span>
                    </div>
                    <div className="settle-right">
                      <span className="settle-amount">₹{Math.abs(effectiveSummary.balance).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="khata-pdf-sign-row">
                    <div className="sign-col left-sign">
                      <div className="sign-draw-line"></div>
                      <span className="sign-owner-lbl">Worker Signature / अंगूठा</span>
                      <span className="sign-sub-lbl">({worker.name})</span>
                    </div>
                    <div className="sign-col right-sign">
                      <div className="sign-draw-line"></div>
                      <span className="sign-owner-lbl">Authorized Signatory</span>
                      <span className="sign-sub-lbl">Faizan Body Works</span>
                    </div>
                  </div>

                  <div className="khata-pdf-bottom-notice">
                    <span>Faizan Body Works • Computerized Ledger Statement • Contact office for any clarification.</span>
                    <span className="pdf-page-num-tag">Page {page.pageNum} of {page.totalPages}</span>
                  </div>
                </>
              ) : (
                <div className="khata-pdf-page-footer-cont">
                  <span className="cont-text">Continued on Page {page.pageNum + 1}...</span>
                  <span className="pdf-page-num-tag">Page {page.pageNum} of {page.totalPages}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default WorkerKhataModal;
