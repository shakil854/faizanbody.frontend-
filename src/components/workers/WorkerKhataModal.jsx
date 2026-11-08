import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { workerService } from '../../services/workerService';
import { sharePdfFile, downloadPdfFile } from '../../utils/pdfGenerator';
import {
  getPeriodDateRange,
  getAvailableKhataMonths,
  calculateMonthKhataVahi,
  getMonthName,
} from '../../utils/khataPeriodHelper';

export function WorkerKhataModal({
  isOpen,
  onClose,
  worker,
  canManage = true,
  initialFromDate = '',
  initialToDate = '',
  initialPeriod = '',
}) {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    total_salary: 0,
    total_upad: 0,
    total_paid: 0,
    balance: 0,
  });

  // View Mode: 'vahi_page' (Authentic Monthly Khata Page) or 'all_history' (Flat List)
  const [viewMode, setViewMode] = useState('vahi_page');

  // Mobile Column Tab Filter: 'both' | 'jama' | 'udhar'
  const [mobileTab, setMobileTab] = useState('both');

  // Selected Month for the Khata Vahi Page (e.g. '2026-09', '2026-10')
  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [selectedMonthKey, setSelectedMonthKey] = useState(() => {
    if (initialFromDate && /^\d{4}-\d{2}/.test(initialFromDate)) {
      return initialFromDate.slice(0, 7);
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Date Range Filter state for All History mode & PDF
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfToast, setPdfToast] = useState('');

  // Add / Edit Entry Form state (ONLY 2 TYPES: 'salary' [Jama] & 'upad' [Udhar])
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [entryType, setEntryType] = useState('upad'); // 'salary' (Jama / Work) or 'upad' (Udhar / Advance)
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Refs for Enter key field navigation
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
  const [filterType, setFilterType] = useState('all'); // 'all', 'salary', 'upad'

  // Fetch transactions from backend
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
      setEditingTx(null);
      setFormError('');
      setAmount('');
      setNotes('');
      setDate(new Date().toISOString().split('T')[0]);
      setEntryType('upad');
      setPdfToast('');
      setFromDate(initialFromDate || '');
      setToDate(initialToDate || '');
      if (initialFromDate && /^\d{4}-\d{2}/.test(initialFromDate)) {
        setSelectedMonthKey(initialFromDate.slice(0, 7));
      }
    }
  }, [isOpen, worker?.id, fetchKhata, initialFromDate, initialToDate]);

  // Available Months for Month Selector
  const availableMonths = useMemo(() => {
    return getAvailableKhataMonths(transactions, selectedMonthKey);
  }, [transactions, selectedMonthKey]);

  // Current Month's Authentic 2-Column Khata Vahi Ledger
  const vahiData = useMemo(() => {
    return calculateMonthKhataVahi(transactions, selectedMonthKey);
  }, [transactions, selectedMonthKey]);

  // Month Navigation Handlers
  const handlePrevMonth = () => {
    const idx = availableMonths.findIndex((m) => m.monthKey === selectedMonthKey);
    if (idx > 0) {
      setSelectedMonthKey(availableMonths[idx - 1].monthKey);
    } else {
      const [y, m] = selectedMonthKey.split('-').map(Number);
      const prev = new Date(y, m - 2, 1);
      setSelectedMonthKey(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
    }
  };

  const handleNextMonth = () => {
    const idx = availableMonths.findIndex((m) => m.monthKey === selectedMonthKey);
    if (idx >= 0 && idx < availableMonths.length - 1) {
      setSelectedMonthKey(availableMonths[idx + 1].monthKey);
    } else {
      const [y, m] = selectedMonthKey.split('-').map(Number);
      const next = new Date(y, m, 1);
      setSelectedMonthKey(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
    }
  };

  const handleJumpCurrentMonth = () => {
    setSelectedMonthKey(currentMonthKey);
  };

  // Quick Open Add Jama (Work Done)
  const handleOpenAddJama = () => {
    setEditingTx(null);
    setEntryType('salary');
    setAmount('');
    setNotes('');
    const nowStr = new Date().toISOString().split('T')[0];
    if (nowStr.startsWith(selectedMonthKey)) {
      setDate(nowStr);
    } else {
      setDate(`${selectedMonthKey}-01`);
    }
    setShowAddForm(true);
  };

  // Quick Open Add Udhar (Upad / Advance)
  const handleOpenAddUdhar = () => {
    setEditingTx(null);
    setEntryType('upad');
    setAmount('');
    setNotes('');
    const nowStr = new Date().toISOString().split('T')[0];
    if (nowStr.startsWith(selectedMonthKey)) {
      setDate(nowStr);
    } else {
      setDate(`${selectedMonthKey}-01`);
    }
    setShowAddForm(true);
  };

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

  // 2. Filter by category tab (All / Jama / Udhar) for onscreen list
  const filteredTransactions = useMemo(() => {
    if (filterType === 'all') return dateFilteredTransactions;
    if (filterType === 'salary') return dateFilteredTransactions.filter((t) => t && t.type === 'salary');
    if (filterType === 'upad') return dateFilteredTransactions.filter((t) => t && (t.type === 'upad' || t.type === 'payment'));
    return dateFilteredTransactions;
  }, [dateFilteredTransactions, filterType]);

  // Guaranteed safe summary numbers
  const safeSummary = useMemo(() => ({
    total_salary: Number(summary?.total_salary) || 0,
    total_upad: (Number(summary?.total_upad) || 0) + (Number(summary?.total_paid) || 0),
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
      .filter((t) => t?.type === 'upad' || t?.type === 'payment')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const balance = totalSalary - totalUpad;

    return {
      total_salary: totalSalary,
      total_upad: totalUpad,
      total_paid: 0,
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

  // Start editing an existing transaction
  const handleStartEdit = (tx) => {
    setEditingTx(tx);
    // Strict 2 options: salary -> salary (Jama), anything else -> upad (Udhar)
    setEntryType(tx.type === 'salary' ? 'salary' : 'upad');
    setAmount(String(tx.amount || ''));
    setDate(tx.date ? String(tx.date).slice(0, 10) : new Date().toISOString().split('T')[0]);
    setNotes(tx.notes || '');
    setPaymentMode(tx.payment_mode || 'Cash');
    setFormError('');
    setShowAddForm(true);
    setTimeout(() => {
      amountInputRef.current?.focus();
      amountInputRef.current?.select?.();
    }, 60);
  };

  // Cancel adding or editing entry
  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingTx(null);
    setAmount('');
    setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
    setFormError('');
  };

  // Handle Save Entry (Only Jama [salary] or Udhar [upad])
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
      if (editingTx) {
        const res = await workerService.updateWorkerTransaction(worker.id, editingTx.id, {
          type: entryType, // 'salary' or 'upad'
          amount: numAmount,
          date: date || new Date().toISOString().split('T')[0],
          notes: notes.trim(),
          payment_mode: paymentMode,
        });

        if (res && res.transaction) {
          setTransactions((prev) =>
            (Array.isArray(prev) ? prev : []).map((t) => (t.id === editingTx.id ? res.transaction : t))
          );
          if (res.summary) {
            setSummary(res.summary);
          }
        }
      } else {
        const res = await workerService.addWorkerTransaction(worker.id, {
          type: entryType, // 'salary' or 'upad'
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
      }

      setAmount('');
      setNotes('');
      setEditingTx(null);
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

  // Helper to chunk transactions for printable PDF
  const getPdfPagesData = () => {
    const list = dateFilteredTransactions;
    if (list.length <= 12) {
      return [{ pageNum: 1, totalPages: 1, rows: list, isFirst: true, isLast: true, startIndex: 0 }];
    }
    const pages = [];
    pages.push({ pageNum: 1, rows: list.slice(0, 10), isFirst: true, isLast: false, startIndex: 0 });
    let remaining = list.slice(10);
    let currentIdx = 10;
    while (remaining.length > 0) {
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
      setPdfToast('⏳ Generating PDF, opening WhatsApp...');
      await new Promise((r) => setTimeout(r, 200));

      const cleanName = (worker.name || 'Worker').replace(/[^a-zA-Z0-9_-]/g, '_');
      const targetElementId = viewMode === 'vahi_page' ? 'printableKhataVahiSheet' : 'printableKhataSheet';
      const fileSuffix = viewMode === 'vahi_page' ? `_Month_${vahiData.accountNo}` : `_Full`;
      const fileName = `FaizanBody_Khata_${cleanName}${fileSuffix}.pdf`;
      const title = `Faizan Body Works - ${worker.name}'s Khata (${vahiData.accountNo})`;

      const result = await sharePdfFile({
        elementId: targetElementId,
        fileName,
        title,
        text: `Khata Statement PDF: ${worker.name} (A/c No: ${vahiData.accountNo} • Page ${vahiData.pageNo}) - Faizan Body Works`,
      });

      if (result?.method === 'downloaded') {
        setPdfToast('✅ PDF downloaded successfully! You can share it on WhatsApp.');
        setTimeout(() => setPdfToast(''), 5000);
      } else if (result?.success) {
        setPdfToast('✅ PDF shared on WhatsApp!');
        setTimeout(() => setPdfToast(''), 4000);
      } else {
        setPdfToast('');
      }
    } catch (err) {
      console.error('Error sharing Khata PDF:', err);
      setPdfToast('⚠️ Issue sharing PDF.');
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
      setPdfToast('⏳ Downloading PDF...');
      await new Promise((r) => setTimeout(r, 200));

      const cleanName = (worker.name || 'Worker').replace(/[^a-zA-Z0-9_-]/g, '_');
      const targetElementId = viewMode === 'vahi_page' ? 'printableKhataVahiSheet' : 'printableKhataSheet';
      const fileSuffix = viewMode === 'vahi_page' ? `_Month_${vahiData.accountNo}` : `_Full`;
      const fileName = `FaizanBody_Khata_${cleanName}${fileSuffix}.pdf`;

      await downloadPdfFile({
        elementId: targetElementId,
        fileName,
      });

      setPdfToast('✅ PDF saved successfully!');
      setTimeout(() => setPdfToast(''), 4000);
    } catch (err) {
      console.error('Error downloading Khata PDF:', err);
      setPdfToast('⚠️ Issue downloading PDF.');
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
                  {worker.mobile ? `Mobile: ${worker.mobile} • ` : ''}Worker Khata Ledger (Desi Nama)
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

          {/* View Mode Selector Tabs - Short & 100% Mobile Responsive */}
          <div className="khata-view-mode-tabs">
            <button
              type="button"
              className={`khata-view-tab ${viewMode === 'vahi_page' ? 'active' : ''}`}
              onClick={() => setViewMode('vahi_page')}
            >
              📖 Monthly Page
            </button>
            <button
              type="button"
              className={`khata-view-tab ${viewMode === 'all_history' ? 'active' : ''}`}
              onClick={() => setViewMode('all_history')}
            >
              📋 All History
            </button>
          </div>

          {/* Toast Banner for PDF Generation / Feedback */}
          {pdfToast && (
            <div className="khata-pdf-toast-banner">
              <span>{pdfToast}</span>
            </div>
          )}

          {/* ========================================================
              VIEW 1: AUTHENTIC MONTHLY KHATA VAHI PAGE
              ======================================================== */}
          {viewMode === 'vahi_page' ? (
            <>
              {/* Month Navigation Ribbon */}
              <div className="khata-month-nav-ribbon">
                <div className="month-nav-main-row">
                  <button
                    type="button"
                    className="btn-month-nav-arrow"
                    onClick={handlePrevMonth}
                    title="View Previous Month"
                  >
                    <span>◀</span>
                    <span className="arrow-text-full">Prev Month</span>
                    <span className="arrow-text-short">Prev</span>
                  </button>

                  <div className="month-nav-center">
                    <select
                      className="khata-month-select-dropdown"
                      value={selectedMonthKey}
                      onChange={(e) => setSelectedMonthKey(e.target.value)}
                    >
                      {availableMonths.map((m) => (
                        <option key={m.monthKey} value={m.monthKey}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    className="btn-month-nav-arrow"
                    onClick={handleNextMonth}
                    title="View Next Month"
                  >
                    <span className="arrow-text-full">Next Month</span>
                    <span className="arrow-text-short">Next</span>
                    <span>▶</span>
                  </button>
                </div>

                <div className="month-nav-badge-strip">
                  <span className="month-nav-badge">
                    A/c No.: <strong>{vahiData.accountNo}</strong>
                  </span>
                  <span className="month-nav-badge">
                    Page No.: <strong>{vahiData.pageNo}</strong>
                  </span>
                  {selectedMonthKey !== currentMonthKey && (
                    <button
                      type="button"
                      className="btn-jump-current-month"
                      onClick={handleJumpCurrentMonth}
                    >
                      📌 Current Month
                    </button>
                  )}
                </div>
              </div>

              {/* Action Buttons: Add Jama, Add Udhar, WhatsApp Share, Download */}
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
                      <span>Jama (Add Work)</span>
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
                      <span>Udhar (Add Upad)</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  className="btn btn-whatsapp-share"
                  onClick={handleShareKhataPdf}
                  disabled={isGeneratingPdf}
                  title="Share Month Page on WhatsApp"
                >
                  {isGeneratingPdf ? (
                    <span>Generating...</span>
                  ) : (
                    <>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                      </svg>
                      <span>Share PDF</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="btn btn-download-pdf-icon"
                  onClick={handleDownloadKhataPdf}
                  disabled={isGeneratingPdf}
                  title="Download PDF"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
              </div>

              {/* Mobile Column View Switcher (Only visible on Mobile screens < 768px) */}
              <div className="vahi-mobile-tabs-bar">
                <button
                  type="button"
                  className={`vahi-mob-tab ${mobileTab === 'both' ? 'active' : ''}`}
                  onClick={() => setMobileTab('both')}
                >
                  📜 Both (Jama + Udhar)
                </button>
                <button
                  type="button"
                  className={`vahi-mob-tab tab-mob-jama ${mobileTab === 'jama' ? 'active' : ''}`}
                  onClick={() => setMobileTab('jama')}
                >
                  💰 Jama ({vahiData.jamaRows.length})
                </button>
                <button
                  type="button"
                  className={`vahi-mob-tab tab-mob-udhar ${mobileTab === 'udhar' ? 'active' : ''}`}
                  onClick={() => setMobileTab('udhar')}
                >
                  ⚡ Udhar ({(vahiData.openingUdharRow ? 1 : 0) + vahiData.udharRows.length})
                </button>
              </div>

              {/* Expandable Add / Edit Entry Form (STRICTLY 2 OPTIONS: Jama & Udhar) */}
              {showAddForm && (
                <div className="khata-add-entry-box" style={{ marginBottom: '0.85rem' }}>
                  <h4 className="entry-box-title">
                    {editingTx
                      ? '✏️ Edit Transaction'
                      : entryType === 'salary'
                      ? '💰 New Jama Entry (Work / Earning)'
                      : '⚡ New Udhar Entry (Upad / Advance)'}
                  </h4>

                  {formError && (
                    <div className="form-alert-error" style={{ marginBottom: '0.65rem' }}>
                      <span>{formError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveEntry} className="khata-entry-form">
                    {/* STRICT 2 TABS ONLY: JAMA & UDHAR */}
                    <div className="entry-type-selector" style={{ gridTemplateColumns: '1fr 1fr' }}>
                      <button
                        type="button"
                        className={`entry-type-tab tab-salary ${entryType === 'salary' ? 'active' : ''}`}
                        onClick={() => setEntryType('salary')}
                      >
                        💰 Jama (Work Done)
                      </button>
                      <button
                        type="button"
                        className={`entry-type-tab tab-upad ${entryType === 'upad' ? 'active' : ''}`}
                        onClick={() => setEntryType('upad')}
                      >
                        ⚡ Udhar (Upad / Advance)
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
                            placeholder="e.g. 45000"
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

                    {/* Description / Notes & Payment Mode */}
                    <div className="entry-inputs-grid">
                      <div className="form-group">
                        <label className="form-label">Description / Work Details (Optional)</label>
                        <input
                          ref={notesInputRef}
                          type="text"
                          className="form-input"
                          placeholder={entryType === 'salary' ? 'e.g. Nurani Transport cabin work' : 'e.g. Cash upad / House installment'}
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
                        onClick={handleCancelForm}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isSubmitting}
                      >
                        {isSubmitting
                          ? (editingTx ? 'Updating...' : 'Saving...')
                          : (editingTx ? 'Update Entry' : 'Save Entry')}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* 2-COLUMN AUTHENTIC KHATA VAHI NOTEBOOK SHEET */}
              <div className="khata-vahi-sheet-container">
                {/* Notebook Header Strip */}
                <div className="khata-vahi-header-strip">
                  <div className="vahi-header-left">
                    <span className="vahi-worker-title">Name: {worker.name}</span>
                    <span className="vahi-ac-subtitle">
                      A/c No.: <strong>{vahiData.accountNo}</strong> ({vahiData.monthName} {vahiData.year})
                    </span>
                  </div>

                  <div className="vahi-page-stamp">
                    <span className="vahi-page-stamp-lbl">PAGE</span>
                    <span className="vahi-page-stamp-num">{vahiData.pageNo}</span>
                  </div>
                </div>

                {/* 2 Columns Grid: Left = JAMA (Work) | Right = UDHAR (Upad) */}
                <div className="khata-vahi-grid">
                  {/* LEFT COLUMN: JAMA (Work Done) */}
                  <div className={`khata-vahi-col col-jama ${mobileTab === 'udhar' ? 'mobile-hidden' : ''}`}>
                    <div className="vahi-col-top">
                      <div className="vahi-col-title-group">
                        <span className="vahi-col-heading">JAMA (Work Done)</span>
                        <span className="vahi-col-count-badge">{vahiData.jamaRows.length} items</span>
                      </div>
                      {canManage && (
                        <button
                          type="button"
                          className="btn-vahi-add-entry"
                          onClick={handleOpenAddJama}
                        >
                          + Add Work
                        </button>
                      )}
                    </div>

                    <div className="vahi-table-wrap">
                      <table className="vahi-table">
                        <thead>
                          <tr>
                            <th style={{ width: '26px', textAlign: 'center' }}>#</th>
                            <th style={{ width: '52px' }}>Date</th>
                            <th>Work / Vehicle Details</th>
                            <th style={{ width: '80px', textAlign: 'right' }}>Amount ₹</th>
                            {canManage && <th style={{ width: '40px', textAlign: 'center' }}>Action</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {/* Rare: Opening Jama B/F if worker had positive salary credit */}
                          {vahiData.openingJamaRow && (
                            <tr className="vahi-bf-row">
                              <td style={{ textAlign: 'center' }}>
                                <span className="vahi-bf-badge">B/F</span>
                              </td>
                              <td style={{ fontWeight: 600 }}>01/{vahiData.month}</td>
                              <td>
                                <div className="vahi-bf-desc">
                                  <span className="vahi-bf-main-text">{vahiData.openingJamaRow.label}</span>
                                  <span className="vahi-bf-sub-text">{vahiData.openingJamaRow.sublabel}</span>
                                </div>
                              </td>
                              <td style={{ textAlign: 'right' }} className="vahi-bf-amount">
                                ₹{vahiData.openingJamaRow.amount.toLocaleString('en-IN')}/-
                              </td>
                              {canManage && <td></td>}
                            </tr>
                          )}

                          {vahiData.jamaRows.length === 0 && !vahiData.openingJamaRow ? (
                            <tr>
                              <td colSpan={canManage ? 5 : 4} className="vahi-empty-column-box">
                                No work (Jama) recorded for this month yet.
                              </td>
                            </tr>
                          ) : (
                            vahiData.jamaRows.map((tx, idx) => (
                              <tr key={tx.id || idx}>
                                <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
                                  {idx + 1}
                                </td>
                                <td style={{ fontWeight: 600, color: '#1e293b' }}>
                                  {tx.date ? String(tx.date).slice(8, 10) + '/' + String(tx.date).slice(5, 7) : '—'}
                                </td>
                                <td>
                                  <span style={{ fontWeight: 600, color: '#0f172a' }}>{tx.notes || 'Work Done'}</span>
                                </td>
                                <td style={{ textAlign: 'right' }} className="vahi-amt-jama">
                                  ₹{(Number(tx.amount) || 0).toLocaleString('en-IN')}/-
                                </td>
                                {canManage && (
                                  <td style={{ textAlign: 'center' }}>
                                    <div className="tx-actions-btn-group" style={{ justifyContent: 'center' }}>
                                      <button
                                        type="button"
                                        className="tx-action-btn tx-edit-btn"
                                        onClick={() => handleStartEdit(tx)}
                                        title="Edit Entry"
                                      >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                      </button>
                                      <button
                                        type="button"
                                        className="tx-action-btn tx-delete-btn"
                                        onClick={() => setDeletingTx(tx)}
                                        title="Delete Entry"
                                      >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                          <polyline points="3 6 5 6 21 6" />
                                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        </svg>
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Left Column Bottom Footer: Total Work Done */}
                    <div className="vahi-col-footer">
                      <div className="vahi-total-row">
                        <span>Total Work (Jama):</span>
                        <span className="vahi-total-jama-val">₹{vahiData.totalJama.toLocaleString('en-IN')}/-</span>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: UDHAR (Upad / Advance) */}
                  <div className={`khata-vahi-col col-udhar ${mobileTab === 'jama' ? 'mobile-hidden' : ''}`}>
                    <div className="vahi-col-top">
                      <div className="vahi-col-title-group">
                        <span className="vahi-col-heading">UDHAR (Upad / Advance)</span>
                        <span className="vahi-col-count-badge">
                          {(vahiData.openingUdharRow ? 1 : 0) + vahiData.udharRows.length} entries
                        </span>
                      </div>
                      {canManage && (
                        <button
                          type="button"
                          className="btn-vahi-add-entry"
                          onClick={handleOpenAddUdhar}
                        >
                          + Add Upad
                        </button>
                      )}
                    </div>

                    <div className="vahi-table-wrap">
                      <table className="vahi-table">
                        <thead>
                          <tr>
                            <th style={{ width: '26px', textAlign: 'center' }}>#</th>
                            <th style={{ width: '52px' }}>Date</th>
                            <th>Description</th>
                            <th style={{ width: '80px', textAlign: 'right' }}>Amount ₹</th>
                            {canManage && <th style={{ width: '40px', textAlign: 'center' }}>Action</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {/* CRITICAL ROW 1: Previous Advance (Carried Forward B/F) */}
                          {vahiData.openingUdharRow && (
                            <tr className="vahi-bf-row">
                              <td style={{ textAlign: 'center' }}>
                                <span className="vahi-bf-badge">B/F</span>
                              </td>
                              <td style={{ fontWeight: 600 }}>01/{vahiData.month}</td>
                              <td>
                                <div className="vahi-bf-desc">
                                  <span className="vahi-bf-main-text">{vahiData.openingUdharRow.label}</span>
                                  <span className="vahi-bf-sub-text">{vahiData.openingUdharRow.sublabel}</span>
                                </div>
                              </td>
                              <td style={{ textAlign: 'right' }} className="vahi-bf-amount">
                                ₹{vahiData.openingUdharRow.amount.toLocaleString('en-IN')}/-
                              </td>
                              {canManage && (
                                <td style={{ textAlign: 'center', fontSize: '0.62rem', color: '#94a3b8' }}>
                                  Auto
                                </td>
                              )}
                            </tr>
                          )}

                          {vahiData.udharRows.length === 0 && !vahiData.openingUdharRow ? (
                            <tr>
                              <td colSpan={canManage ? 5 : 4} className="vahi-empty-column-box">
                                No upad recorded for this month yet.
                              </td>
                            </tr>
                          ) : (
                            vahiData.udharRows.map((tx, idx) => (
                              <tr key={tx.id || idx}>
                                <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
                                  {(vahiData.openingUdharRow ? 1 : 0) + idx + 1}
                                </td>
                                <td style={{ fontWeight: 600, color: '#1e293b' }}>
                                  {tx.date ? String(tx.date).slice(8, 10) + '/' + String(tx.date).slice(5, 7) : '—'}
                                </td>
                                <td>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span style={{ fontWeight: 600, color: '#0f172a' }}>
                                      {tx.notes || (tx.type === 'payment' ? 'Payment' : 'Upad (Advance)')}
                                    </span>
                                    {tx.payment_mode && tx.payment_mode !== 'Cash' && (
                                      <span className="vahi-mode-badge">{tx.payment_mode}</span>
                                    )}
                                  </div>
                                </td>
                                <td style={{ textAlign: 'right' }} className="vahi-amt-udhar">
                                  ₹{(Number(tx.amount) || 0).toLocaleString('en-IN')}/-
                                </td>
                                {canManage && (
                                  <td style={{ textAlign: 'center' }}>
                                    <div className="tx-actions-btn-group" style={{ justifyContent: 'center' }}>
                                      <button
                                        type="button"
                                        className="tx-action-btn tx-edit-btn"
                                        onClick={() => handleStartEdit(tx)}
                                        title="Edit Entry"
                                      >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                        </svg>
                                      </button>
                                      <button
                                        type="button"
                                        className="tx-action-btn tx-delete-btn"
                                        onClick={() => setDeletingTx(tx)}
                                        title="Delete Entry"
                                      >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                          <polyline points="3 6 5 6 21 6" />
                                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                        </svg>
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Right Column Bottom Footer: Calculation Box */}
                    <div className="vahi-col-footer">
                      <div className="vahi-closing-calc-box">
                        <div className="vahi-calc-row calc-subtotal">
                          <span>Total Upad:</span>
                          <span className="vahi-total-udhar-val">₹{vahiData.totalUdhar.toLocaleString('en-IN')}/-</span>
                        </div>

                        <div className="vahi-calc-row">
                          <span>- Total Work (Jama):</span>
                          <span>- ₹{vahiData.totalJama.toLocaleString('en-IN')}/-</span>
                        </div>

                        <div className="vahi-calc-row calc-final">
                          <span>
                            {vahiData.closingAdvance > 0
                              ? 'Net Advance Due:'
                              : vahiData.closingAdvance < 0
                              ? 'Due to Worker:'
                              : 'Account Settled:'}
                          </span>
                          <span
                            className={`calc-final-val ${
                              vahiData.closingAdvance > 0
                                ? 'val-advance'
                                : vahiData.closingAdvance < 0
                                ? 'val-due'
                                : ''
                            }`}
                          >
                            ₹{Math.abs(vahiData.closingAdvance).toLocaleString('en-IN')}/-
                          </span>
                        </div>

                        <p className="calc-forward-note">
                          {vahiData.closingAdvance > 0
                            ? '➜ Automatically carried forward as opening B/F next month.'
                            : vahiData.closingAdvance < 0
                            ? '➜ Due amount to worker carried forward as credit next month.'
                            : '➜ All settled.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* ========================================================
               VIEW 2: ALL-TIME FLAT TRANSACTION HISTORY LIST
               ======================================================== */
            <>
              {/* 3 Summary KPIs Grid */}
              <div className="khata-kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="khata-kpi-card card-salary">
                  <span className="kpi-label">TOTAL WORK (JAMA)</span>
                  <span className="kpi-amount">₹{effectiveSummary.total_salary.toLocaleString('en-IN')}</span>
                  <span className="kpi-tag">{isDateFilterActive ? 'In Selected Period' : 'Total Earned'}</span>
                </div>

                <div className="khata-kpi-card card-upad">
                  <span className="kpi-label">TOTAL UPAD (UDHAR)</span>
                  <span className="kpi-amount">₹{effectiveSummary.total_upad.toLocaleString('en-IN')}</span>
                  <span className="kpi-tag">{isDateFilterActive ? 'In Selected Period' : 'Total Advance'}</span>
                </div>

                <div className={`khata-kpi-card card-balance ${balanceColorClass}`}>
                  <span className="kpi-label">NET BALANCE</span>
                  <span className="kpi-amount">₹{Math.abs(effectiveSummary.balance).toLocaleString('en-IN')}</span>
                  <span className="kpi-tag">
                    {effectiveSummary.balance > 0 ? 'Due to Pay' : effectiveSummary.balance < 0 ? 'Advance Due' : 'All Clear'}
                  </span>
                </div>
              </div>

              {/* Date Range Filter Box */}
              <div className="khata-date-range-card">
                <div className="date-range-header">
                  <div className="date-range-title">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    <span>Date Range Filter</span>
                  </div>
                  {isDateFilterActive && (
                    <button
                      type="button"
                      className="btn-clear-date-filter"
                      onClick={() => { setFromDate(''); setToDate(''); }}
                    >
                      ✕ Show All Time
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', margin: '0.45rem 0 0.65rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const r = getPeriodDateRange('running_month');
                      setFromDate(r.startDate);
                      setToDate(r.endDate);
                    }}
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: '16px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      background: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe',
                      cursor: 'pointer',
                    }}
                  >
                    📅 Running Month
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const r = getPeriodDateRange('last_month');
                      setFromDate(r.startDate);
                      setToDate(r.endDate);
                    }}
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: '16px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      background: '#f8fafc',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      cursor: 'pointer',
                    }}
                  >
                    ⏮️ Last Month
                  </button>

                  <button
                    type="button"
                    onClick={() => { setFromDate(''); setToDate(''); }}
                    style={{
                      padding: '0.3rem 0.65rem',
                      borderRadius: '16px',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      background: '#f8fafc',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      cursor: 'pointer',
                    }}
                  >
                    🌐 All Time
                  </button>
                </div>

                <div className="date-range-fields-row">
                  <div className="date-range-col">
                    <label className="date-range-label">From Date:</label>
                    <input
                      type="date"
                      className="date-range-input"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                    />
                  </div>

                  <div className="date-range-col">
                    <label className="date-range-label">To Date:</label>
                    <input
                      type="date"
                      className="date-range-input"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="khata-action-bar">
                {canManage && (
                  <button
                    type="button"
                    className={`btn ${showAddForm ? 'btn-secondary' : 'btn-primary'} btn-add-entry-toggle`}
                    onClick={() => {
                      if (showAddForm) {
                        handleCancelForm();
                      } else {
                        setEditingTx(null);
                        setAmount('');
                        setNotes('');
                        setDate(new Date().toISOString().split('T')[0]);
                        setShowAddForm(true);
                      }
                    }}
                  >
                    {showAddForm ? 'Close Form' : '+ Add New Entry'}
                  </button>
                )}

                <button
                  type="button"
                  className="btn btn-whatsapp-share"
                  onClick={handleShareKhataPdf}
                  disabled={isGeneratingPdf}
                >
                  {isGeneratingPdf ? <span>Generating...</span> : <span>Share on WhatsApp</span>}
                </button>

                <button
                  type="button"
                  className="btn btn-download-pdf-icon"
                  onClick={handleDownloadKhataPdf}
                  disabled={isGeneratingPdf}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
              </div>

              {/* Expandable Add Form (2 TABS: Jama & Udhar) */}
              {showAddForm && (
                <div className="khata-add-entry-box">
                  <h4 className="entry-box-title">
                    {editingTx
                      ? '✏️ Edit Transaction'
                      : entryType === 'salary'
                      ? '💰 New Jama Entry (Work)'
                      : '⚡ New Udhar Entry (Upad)'}
                  </h4>

                  {formError && (
                    <div className="form-alert-error" style={{ marginBottom: '0.65rem' }}>
                      <span>{formError}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveEntry} className="khata-entry-form">
                    <div className="entry-type-selector" style={{ gridTemplateColumns: '1fr 1fr' }}>
                      <button
                        type="button"
                        className={`entry-type-tab tab-salary ${entryType === 'salary' ? 'active' : ''}`}
                        onClick={() => setEntryType('salary')}
                      >
                        💰 Jama (Work Done)
                      </button>
                      <button
                        type="button"
                        className={`entry-type-tab tab-upad ${entryType === 'upad' ? 'active' : ''}`}
                        onClick={() => setEntryType('upad')}
                      >
                        ⚡ Udhar (Upad / Advance)
                      </button>
                    </div>

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

                    <div className="entry-inputs-grid">
                      <div className="form-group">
                        <label className="form-label">Description / Work Details (Optional)</label>
                        <input
                          ref={notesInputRef}
                          type="text"
                          className="form-input"
                          placeholder="e.g. Body work wage / Cash advance"
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

                    <div className="entry-form-actions">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleCancelForm}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isSubmitting}
                      >
                        {isSubmitting
                          ? (editingTx ? 'Updating...' : 'Saving...')
                          : (editingTx ? 'Update Entry' : 'Save Entry')}
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
                    Jama (Work)
                  </button>
                  <button
                    type="button"
                    className={`filter-chip chip-upad ${filterType === 'upad' ? 'active' : ''}`}
                    onClick={() => setFilterType('upad')}
                  >
                    Udhar (Upad)
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
                    <h3>No transactions found</h3>
                    <p>No transaction recorded for this worker yet.</p>
                  </div>
                ) : (
                  filteredTransactions.map((tx) => {
                    const isSalary = tx.type === 'salary';

                    return (
                      <div key={tx.id} className={`khata-tx-card tx-${tx.type}`}>
                        <div className="tx-left">
                          <div className={`tx-icon-pill icon-${tx.type}`}>
                            {isSalary ? (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="19" x2="12" y2="5" />
                                <polyline points="5 12 12 5 19 12" />
                              </svg>
                            ) : (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19" />
                                <polyline points="19 12 12 19 5 12" />
                              </svg>
                            )}
                          </div>

                          <div className="tx-info">
                            <div className="tx-title-row">
                              <span className={`tx-type-badge badge-${tx.type}`}>
                                {isSalary ? '💰 Jama (Work Done)' : '⚡ Udhar (Upad / Advance)'}
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
                            <div className="tx-actions-btn-group">
                              <button
                                type="button"
                                className="tx-action-btn tx-edit-btn"
                                onClick={() => handleStartEdit(tx)}
                                title="Edit Entry"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                className="tx-action-btn tx-delete-btn"
                                onClick={() => setDeletingTx(tx)}
                                title="Delete Entry"
                              >
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete Transaction Confirmation Dialog */}
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
              Are you sure you want to delete this ₹{(Number(deletingTx?.amount) || 0).toLocaleString('en-IN')} entry?
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
          BACKGROUND PRINTABLE 1: 2-COLUMN KHATA VAHI
          For WhatsApp Share & Monthly Page PDF Export
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
        <div id="printableKhataVahiSheet" className="khata-pdf-vahi-paper">
          {/* Top Banner */}
          <div className="khata-pdf-top-banner">
            <div className="khata-pdf-brand-col">
              <h1 className="khata-pdf-main-brand">FAIZAN BODY WORKS</h1>
              <p className="khata-pdf-sub-brand">Truck Body Builders & Commercial Fabricators</p>
              <p className="khata-pdf-brand-extra">Specialist in Cabin, Platform, Dumper & All Body Repair Work</p>
            </div>
            <div className="khata-pdf-badge-col">
              <div className="khata-pdf-statement-badge">
                <span className="badge-eng">WORKER KHATA VAHI</span>
                <span className="badge-hin">MONTHLY LEDGER PAGE</span>
              </div>
            </div>
          </div>

          {/* Notebook Header Strip */}
          <div className="khata-pdf-notebook-header">
            <div>
              <div className="pdf-notebook-title">Name: {worker.name}</div>
              <div className="pdf-notebook-meta">
                Mobile: {worker.mobile || '—'} • A/c No.: <strong>{vahiData.accountNo}</strong> ({vahiData.monthName} {vahiData.year})
              </div>
            </div>
            <div className="pdf-page-stamp-box">
              <div>PAGE</div>
              <div style={{ fontSize: '18px' }}>{vahiData.pageNo}</div>
            </div>
          </div>

          {/* 2-Column Ledger Grid */}
          <div className="khata-pdf-two-col-grid">
            {/* Left Column: JAMA (Work Done) */}
            <div className="pdf-vahi-col-jama">
              <div className="pdf-col-hdr">
                <span>JAMA (Work Done)</span>
                <span>{vahiData.jamaRows.length} Entries</span>
              </div>

              <table className="pdf-vahi-table">
                <thead>
                  <tr>
                    <th style={{ width: '24px', textAlign: 'center' }}>#</th>
                    <th style={{ width: '50px' }}>Date</th>
                    <th>Work / Description</th>
                    <th style={{ width: '80px', textAlign: 'right' }}>Amount ₹</th>
                  </tr>
                </thead>
                <tbody>
                  {vahiData.openingJamaRow && (
                    <tr className="pdf-vahi-bf-tr">
                      <td style={{ textAlign: 'center' }}>B/F</td>
                      <td>01/{vahiData.month}</td>
                      <td>{vahiData.openingJamaRow.label}</td>
                      <td style={{ textAlign: 'right' }}>₹{vahiData.openingJamaRow.amount.toLocaleString('en-IN')}/-</td>
                    </tr>
                  )}
                  {vahiData.jamaRows.length === 0 && !vahiData.openingJamaRow ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '12px', color: '#64748b' }}>
                        No work recorded this month
                      </td>
                    </tr>
                  ) : (
                    vahiData.jamaRows.map((tx, idx) => (
                      <tr key={tx.id || idx}>
                        <td style={{ textAlign: 'center', color: '#64748b' }}>{idx + 1}</td>
                        <td>{tx.date ? String(tx.date).slice(8, 10) + '/' + String(tx.date).slice(5, 7) : '—'}</td>
                        <td style={{ fontWeight: 600 }}>{tx.notes || 'Work Done'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                          ₹{(Number(tx.amount) || 0).toLocaleString('en-IN')}/-
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="pdf-col-footer">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '11px', color: '#166534' }}>
                  <span>Total Work (Jama):</span>
                  <span>₹{vahiData.totalJama.toLocaleString('en-IN')}/-</span>
                </div>
              </div>
            </div>

            {/* Right Column: UDHAR (Upad / Advance) */}
            <div className="pdf-vahi-col-udhar">
              <div className="pdf-col-hdr">
                <span>UDHAR (Upad / Advance)</span>
                <span>{(vahiData.openingUdharRow ? 1 : 0) + vahiData.udharRows.length} Entries</span>
              </div>

              <table className="pdf-vahi-table">
                <thead>
                  <tr>
                    <th style={{ width: '24px', textAlign: 'center' }}>#</th>
                    <th style={{ width: '50px' }}>Date</th>
                    <th>Description</th>
                    <th style={{ width: '80px', textAlign: 'right' }}>Amount ₹</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Row 1: Previous Advance (B/F) */}
                  {vahiData.openingUdharRow && (
                    <tr className="pdf-vahi-bf-tr">
                      <td style={{ textAlign: 'center' }}>B/F</td>
                      <td>01/{vahiData.month}</td>
                      <td>{vahiData.openingUdharRow.label}</td>
                      <td style={{ textAlign: 'right', fontWeight: 900, color: '#b45309' }}>
                        ₹{vahiData.openingUdharRow.amount.toLocaleString('en-IN')}/-
                      </td>
                    </tr>
                  )}
                  {vahiData.udharRows.length === 0 && !vahiData.openingUdharRow ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '12px', color: '#64748b' }}>
                        No upad recorded this month
                      </td>
                    </tr>
                  ) : (
                    vahiData.udharRows.map((tx, idx) => (
                      <tr key={tx.id || idx}>
                        <td style={{ textAlign: 'center', color: '#64748b' }}>
                          {(vahiData.openingUdharRow ? 1 : 0) + idx + 1}
                        </td>
                        <td>{tx.date ? String(tx.date).slice(8, 10) + '/' + String(tx.date).slice(5, 7) : '—'}</td>
                        <td style={{ fontWeight: 600 }}>
                          {tx.notes || 'Upad (Advance)'}
                          {tx.payment_mode && tx.payment_mode !== 'Cash' ? ` (${tx.payment_mode})` : ''}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#d97706' }}>
                          ₹{(Number(tx.amount) || 0).toLocaleString('en-IN')}/-
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="pdf-col-footer">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '10.5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                    <span>Total Upad:</span>
                    <span style={{ color: '#b45309' }}>₹{vahiData.totalUdhar.toLocaleString('en-IN')}/-</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                    <span>- Total Work (Jama):</span>
                    <span>- ₹{vahiData.totalJama.toLocaleString('en-IN')}/-</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '12px', borderTop: '1px solid #cbd5e1', paddingTop: '3px' }}>
                    <span>
                      {vahiData.closingAdvance > 0
                        ? 'Net Advance Due:'
                        : vahiData.closingAdvance < 0
                        ? 'Due to Worker:'
                        : 'Settled:'}
                    </span>
                    <span style={{ color: vahiData.closingAdvance > 0 ? '#dc2626' : '#16a34a' }}>
                      ₹{Math.abs(vahiData.closingAdvance).toLocaleString('en-IN')}/-
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="khata-pdf-sign-row" style={{ marginTop: '14px' }}>
            <div className="sign-col left-sign">
              <div className="sign-draw-line"></div>
              <span className="sign-owner-lbl">Worker Signature</span>
              <span className="sign-sub-lbl">({worker.name})</span>
            </div>
            <div className="sign-col right-sign">
              <div className="sign-draw-line"></div>
              <span className="sign-owner-lbl">Authorized Signatory</span>
              <span className="sign-sub-lbl">Faizan Body Works</span>
            </div>
          </div>

          <div className="khata-pdf-bottom-notice" style={{ marginTop: '10px' }}>
            <span>Faizan Body Works • Worker Khata Ledger • Computerized Statement</span>
            <span className="pdf-page-num-tag">Page {vahiData.pageNo}</span>
          </div>
        </div>
      </div>

      {/* ========================================================
          BACKGROUND PRINTABLE 2: ALL TIME TABULAR STATEMENT
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
                        <span className="badge-hin">ACCOUNT STATEMENT</span>
                      </div>
                    </div>
                  </div>

                  <div className="khata-pdf-meta-card">
                    <div className="khata-meta-grid">
                      <div className="meta-item">
                        <span className="meta-lbl">Worker Name:</span>
                        <span className="meta-val meta-worker-name">{worker.name}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-lbl">Mobile:</span>
                        <span className="meta-val">{worker.mobile || '—'}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-lbl">Period:</span>
                        <span className="meta-val meta-period-val">
                          {fromDate || toDate
                            ? `${fromDate || 'Beginning'} to ${toDate || 'Today'}`
                            : 'All Transactions (Complete Ledger)'}
                        </span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-lbl">Date:</span>
                        <span className="meta-val">
                          {new Date().toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="khata-pdf-kpi-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    <div className="pdf-kpi-box box-salary">
                      <span className="kpi-hdr">TOTAL WORK (JAMA)</span>
                      <span className="kpi-val">₹{effectiveSummary.total_salary.toLocaleString('en-IN')}</span>
                      <span className="kpi-desc">Total Earned</span>
                    </div>
                    <div className="pdf-kpi-box box-upad">
                      <span className="kpi-hdr">TOTAL UPAD (UDHAR)</span>
                      <span className="kpi-val">₹{effectiveSummary.total_upad.toLocaleString('en-IN')}</span>
                      <span className="kpi-desc">Total Advance</span>
                    </div>
                    <div className={`pdf-kpi-box box-balance ${effectiveSummary.balance >= 0 ? 'due-pay' : 'due-adv'}`}>
                      <span className="kpi-hdr">NET BALANCE</span>
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
                      <th style={{ width: '85px', textAlign: 'right' }}>Jama (+)</th>
                      <th style={{ width: '85px', textAlign: 'right' }}>Udhar (-)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {page.rows.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '16px', color: '#64748b' }}>
                          No transactions found
                        </td>
                      </tr>
                    ) : (
                      page.rows.map((tx, rIdx) => {
                        const globalIdx = (page.startIndex || 0) + rIdx + 1;
                        const isSalary = tx.type === 'salary';
                        const amt = Number(tx.amount) || 0;

                        return (
                          <tr key={tx.id || rIdx} className={rIdx % 2 === 1 ? 'row-even' : ''}>
                            <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>{globalIdx}</td>
                            <td style={{ fontWeight: 600, color: '#1e293b' }}>{tx.date || '—'}</td>
                            <td>
                              <span className={`pdf-pill-badge badge-${tx.type}`}>
                                {isSalary ? 'Jama (Work)' : 'Udhar (Upad)'}
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
                            <td style={{ textAlign: 'right', fontWeight: !isSalary ? 700 : 400, color: !isSalary ? '#d97706' : '#cbd5e1' }}>
                              {!isSalary ? `₹${amt.toLocaleString('en-IN')}` : '—'}
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
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {page.isLast && (
                <>
                  <div className="khata-pdf-settlement-callout">
                    <div className="settle-left">
                      <span className="settle-title">Net Balance Status:</span>
                      <span className="settle-desc">
                        {effectiveSummary.balance > 0
                          ? `₹${effectiveSummary.balance.toLocaleString('en-IN')} Due to Worker`
                          : effectiveSummary.balance < 0
                          ? `₹${Math.abs(effectiveSummary.balance).toLocaleString('en-IN')} Advance on Worker`
                          : 'Account Settled (All Clear)'}
                      </span>
                    </div>
                    <div className="settle-right">
                      <span className="settle-amount">₹{Math.abs(effectiveSummary.balance).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="khata-pdf-sign-row">
                    <div className="sign-col left-sign">
                      <div className="sign-draw-line"></div>
                      <span className="sign-owner-lbl">Worker Signature</span>
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
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default WorkerKhataModal;
