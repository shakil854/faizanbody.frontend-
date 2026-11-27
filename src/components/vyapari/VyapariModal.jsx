import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { vyapariService } from '../../services/vyapariService';
import { stockService } from '../../services/stockService';
import { sharePdfFile, downloadPdfFile } from '../../utils/pdfGenerator';
import { DeleteActionButton } from '../common/DeleteActionButton';

/**
 * Authentic Five Star 2-Column Vyapari Account Ledger Sheet (ગાડી વાળા નું ખાતાવહી)
 * Matches physical notebook layout from user photo media_1794244300209_fc4b2f65.jpg
 * Left Column: જ. (JAMA - Payment Received)
 * Right Column: ઉ. (UDHAR - Vehicle Cost & Expenses)
 * Bottom Settlement: Total Bill - Total Jama = Baki (બાકી)
 * 100% Responsive on Mobile, Tablet, and PC
 * STRICT RULE: NO Account No. field!
 */
export function VyapariModal({
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
  const [selectedCycle, setSelectedCycle] = useState('active'); // 'active' | number (e.g. 1, 2) | 'all'

  // Settle Round / Cycle modal state
  const [showSettleDialog, setShowSettleDialog] = useState(false);
  const [settleNotes, setSettleNotes] = useState('');
  const [isSettling, setIsSettling] = useState(false);
  const [isReopening, setIsReopening] = useState(false);

  // Add / Edit Entry state (STRICTLY 2 TYPES: 'jama' vs 'udhar')
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [entryType, setEntryType] = useState('jama'); // 'jama' | 'udhar'
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [particulars, setParticulars] = useState('');
  const [billNo, setBillNo] = useState('');
  const [stockItemId, setStockItemId] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [stockSearch, setStockSearch] = useState('');
  const [stockItems, setStockItems] = useState(() => stockService.getCachedItems());
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
    setParticulars((prev) => (!prev || prev === 'માલ ઉધાર / બિલ' ? 'રોકડા જમા' : prev));
  }, []);

  // Switch to Udhar (Side Arrow Right / Tab)
  const switchToUdhar = useCallback(() => {
    setEntryType('udhar');
    setParticulars((prev) => (!prev || prev === 'રોકડા જમા' ? 'માલ ઉધાર / બિલ' : prev));
  }, []);

  const fetchAccountData = useCallback(async () => {
    if (!accountId) return;
    try {
      setLoading(true);
      const res = await vyapariService.getAccountById(accountId);
      if (res && res.data) {
        setAccount(res.data);
        setEntries(res.data.entries || []);
      }
    } catch (err) {
      console.error('Error loading vyapari account details:', err);
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    if (isOpen && accountId) {
      fetchAccountData();
      stockService.getItems().then((res) => {
        if (res?.data) setStockItems(res.data);
      }).catch(() => {});
      setShowAddForm(false);
      setEditingEntry(null);
      setFormError('');
      setSelectedCycle('active');
    }
  }, [isOpen, accountId, fetchAccountData]);

  useEffect(() => {
    if (showAddForm) {
      setTimeout(() => amountInputRef.current?.focus(), 60);
    }
  }, [showAddForm]);

  // Current Cycle Number
  const currentCycleNo = Number(account?.current_cycle) || 1;

  // Extract past settled cycles from entries
  const pastCycles = useMemo(() => {
    const cycles = new Set();
    (entries || []).forEach((e) => {
      if (e.is_settled && e.cycle_no) {
        cycles.add(Number(e.cycle_no));
      }
    });
    return Array.from(cycles).sort((a, b) => a - b);
  }, [entries]);

  // Active entries count and active balance
  const activeEntriesCount = useMemo(() => {
    return (entries || []).filter((e) => !e.is_settled).length;
  }, [entries]);

  const activeBalance = useMemo(() => {
    const activeJama = (entries || [])
      .filter((e) => !e.is_settled && e.type === 'jama')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const activeUdhar = (entries || [])
      .filter((e) => !e.is_settled && e.type === 'udhar')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    return activeUdhar - activeJama;
  }, [entries]);

  // Filter entries based on selectedCycle
  const displayedEntries = useMemo(() => {
    if (selectedCycle === 'active') {
      return (entries || []).filter((e) => !e.is_settled);
    }
    if (selectedCycle === 'all') {
      return entries || [];
    }
    return (entries || []).filter((e) => Number(e.cycle_no) === Number(selectedCycle));
  }, [entries, selectedCycle]);

  // Separate Jama and Udhar rows for current displayed selection
  const jamaRows = useMemo(() => {
    return (displayedEntries || [])
      .filter((e) => e && e.type === 'jama')
      .sort((a, b) => (String(a.date) > String(b.date) ? 1 : -1));
  }, [displayedEntries]);

  const udharRows = useMemo(() => {
    return (displayedEntries || [])
      .filter((e) => e && e.type === 'udhar')
      .sort((a, b) => (String(a.date) > String(b.date) ? 1 : -1));
  }, [displayedEntries]);

  const totalJama = useMemo(() => {
    return jamaRows.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [jamaRows]);

  const totalUdhar = useMemo(() => {
    return udharRows.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [udharRows]);

  const remainingBalance = totalUdhar - totalJama; // > 0: Due to pay (બાકી), <= 0: Settled/Advance

  // Helper to chunk entries for printable PDF ensuring all entries appear across pages
  const getPdfPagesData = useCallback(() => {
    const maxEntries = Math.max(jamaRows.length, udharRows.length);
    if (maxEntries <= 18) {
      return [
        {
          pageNum: 1,
          totalPages: 1,
          jamaPageRows: jamaRows,
          udharPageRows: udharRows,
          isFirst: true,
          isLast: true,
          startIndex: 0,
        },
      ];
    }

    const pages = [];
    const firstPageRowsCount = 14;
    const continuationRowsCount = 18;

    let currentIdx = 0;
    while (currentIdx < maxEntries) {
      const isFirst = pages.length === 0;
      const count = isFirst ? firstPageRowsCount : continuationRowsCount;
      const nextIdx = currentIdx + count;
      const isLast = nextIdx >= maxEntries;

      pages.push({
        pageNum: pages.length + 1,
        jamaPageRows: jamaRows.slice(currentIdx, nextIdx),
        udharPageRows: udharRows.slice(currentIdx, nextIdx),
        startIndex: currentIdx,
        isFirst,
        isLast,
      });

      currentIdx = nextIdx;
    }

    const totalPages = pages.length;
    return pages.map((p) => ({ ...p, totalPages }));
  }, [jamaRows, udharRows]);

  // Quick Open Add Jama
  const handleOpenAddJama = () => {
    setEditingEntry(null);
    setEntryType('jama');
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setParticulars('રોકડા જમા');
    setBillNo('');
    setStockItemId('');
    setStockQty('');
    setStockSearch('');
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
    setParticulars('માલ ઉધાર / બિલ');
    setBillNo('');
    setStockItemId('');
    setStockQty('');
    setStockSearch('');
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
    setBillNo(entry.bill_no || '');
    setStockItemId('');
    setStockQty('');
    setStockSearch('');
    setPaymentMode(entry.payment_mode || 'Cash');
    setAddToRojmed(Boolean(entry.rojmed_entry_id));
    setFormError('');
    setShowAddForm(true);
  };

  const filteredStockItems = useMemo(() => {
    const q = stockSearch.trim().toLowerCase();
    if (!q) return stockItems || [];
    return (stockItems || []).filter(
      (item) =>
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.category_name && item.category_name.toLowerCase().includes(q))
    );
  }, [stockItems, stockSearch]);

  const selectedStockItemObj = useMemo(() => {
    if (!stockItemId) return null;
    return (stockItems || []).find((item) => Number(item.id) === Number(stockItemId)) || null;
  }, [stockItems, stockItemId]);

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

    if (!editingEntry && stockItemId && (!Number(stockQty) || Number(stockQty) <= 0)) {
      setFormError('સ્ટોક પસંદ કર્યો છે તો મહેરબાની કરીને માન્ય જથ્થો (Qty) દાખલ કરો (અથવા સ્ટોક ખાલી રાખો)');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError('');

      const payload = {
        type: entryType,
        amount: cleanAmt,
        date,
        particulars: particulars.trim() || (entryType === 'jama' ? 'રોકડા જમા' : 'માલ ઉધાર / બિલ'),
        bill_no: billNo.trim() || null,
        payment_mode: paymentMode,
        add_to_rojmed: paymentMode === 'Cash' ? addToRojmed : false,
      };

      if (!editingEntry && stockItemId && Number(stockQty) > 0) {
        payload.stock_item_id = Number(stockItemId);
        payload.stock_qty = Number(stockQty);
      }

      if (editingEntry) {
        await vyapariService.updateEntry(accountId, editingEntry.id, payload);
      } else {
        await vyapariService.addEntry(accountId, payload);
      }

      await fetchAccountData();
      if (payload.stock_item_id) {
        stockService.getItems({ forceRefresh: true }).catch(() => {});
      }
      if (typeof onAccountChanged === 'function') {
        onAccountChanged();
      }

      setShowAddForm(false);
      setEditingEntry(null);
      setAmount('');
      setParticulars('');
      setBillNo('');
      setStockItemId('');
      setStockQty('');
      setStockSearch('');
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
      await vyapariService.deleteEntry(accountId, deletingEntry.id);
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

  // Settle current cycle and open new round
  const handleSettleCycle = async () => {
    try {
      setIsSettling(true);
      await vyapariService.settleCycle(accountId, { notes: settleNotes });
      await fetchAccountData();
      if (typeof onAccountChanged === 'function') {
        onAccountChanged();
      }
      setShowSettleDialog(false);
      setSettleNotes('');
      setSelectedCycle('active');
      setPdfToast('✅ હિસાબ સરભર થયો અને નવો રાઉન્ડ શરૂ થયો!');
      setTimeout(() => setPdfToast(''), 3500);
    } catch (err) {
      console.error('Error settling cycle:', err);
      alert(err.message || 'Error settling cycle');
    } finally {
      setIsSettling(false);
    }
  };

  // Reopen previous cycle
  const handleReopenCycle = async () => {
    if (!window.confirm('શું તમે પાછલો રાઉન્ડ ફરી ચાલુ (Reopen) કરવા માંગો છો?')) return;
    try {
      setIsReopening(true);
      await vyapariService.reopenCycle(accountId);
      await fetchAccountData();
      if (typeof onAccountChanged === 'function') {
        onAccountChanged();
      }
      setSelectedCycle('active');
      setPdfToast('✅ પાછલો રાઉન્ડ ફરી ચાલુ થઈ ગયો!');
      setTimeout(() => setPdfToast(''), 3500);
    } catch (err) {
      console.error('Error reopening cycle:', err);
      alert(err.message || 'Error reopening cycle');
    } finally {
      setIsReopening(false);
    }
  };

  const getCycleFilenameSuffix = () => {
    if (selectedCycle === 'active') return `_Round_${currentCycleNo}`;
    if (selectedCycle === 'all') return '_All_History';
    return `_Round_${selectedCycle}_Settled`;
  };

  // WhatsApp Share (Sends Pure PDF File Directly)
  const handleShareWhatsApp = async () => {
    if (isGeneratingPdf) return;
    try {
      setIsGeneratingPdf(true);
      setPdfToast('⏳ Generating PDF, opening WhatsApp...');
      await new Promise((r) => setTimeout(r, 200));

      const pName = (account?.party_name || 'Truck_Account').replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Vyapari_Khata_${pName}${getCycleFilenameSuffix()}_Page_${account?.page_no || '1'}.pdf`;

      const result = await sharePdfFile({
        elementId: 'printableTruckAccountSheet',
        fileName: filename,
      });

      if (result?.method === 'downloaded') {
        setPdfToast('✅ PDF downloaded! WhatsApp par share kar sakte hain.');
        setTimeout(() => setPdfToast(''), 4000);
      } else if (result?.success) {
        setPdfToast('✅ PDF WhatsApp par share ho gaya!');
        setTimeout(() => setPdfToast(''), 3000);
      } else {
        setPdfToast('');
      }
    } catch (err) {
      console.error('WhatsApp PDF share error:', err);
      setPdfToast('⚠️ Issue sharing PDF.');
      setTimeout(() => setPdfToast(''), 3000);
    } finally {
      setIsGeneratingPdf(false);
    }
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
      const filename = `Vyapari_Khata_${pName}${getCycleFilenameSuffix()}_Page_${account?.page_no || '1'}`;
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
                <span style={{ fontSize: '1.25rem' }}>🏪</span>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <h3 className="sheet-title" style={{ margin: 0 }}>
                    {account?.party_name || 'Vyapari Account'}
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
                  {account?.firm_name ? `Truck: ${account.firm_name} • ` : ''}
                  {account?.phone ? `📞 ${account.phone} • ` : ''}
                  {currentCycleNo > 1 ? `Round ${currentCycleNo} • ` : ''}
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

          {/* Cycle / Round Navigation Bar */}
          <div className="vahi-cycle-nav-bar">
            <div className="cycle-pills-wrap">
              <button
                type="button"
                className={`cycle-pill ${selectedCycle === 'active' ? 'active' : ''}`}
                onClick={() => setSelectedCycle('active')}
              >
                <span>🟢 Round {currentCycleNo} (ચાલુ)</span>
                {activeEntriesCount > 0 && <span className="cycle-pill-count">{activeEntriesCount}</span>}
              </button>

              {pastCycles.map((cycleNum) => (
                <button
                  key={cycleNum}
                  type="button"
                  className={`cycle-pill pill-settled ${selectedCycle === cycleNum ? 'active' : ''}`}
                  onClick={() => setSelectedCycle(cycleNum)}
                >
                  <span>✓ Round {cycleNum} (સરભર)</span>
                </button>
              ))}

              {pastCycles.length > 0 && (
                <button
                  type="button"
                  className={`cycle-pill pill-all ${selectedCycle === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedCycle('all')}
                >
                  <span>📋 તમામ હિસાબ ({entries.length})</span>
                </button>
              )}
            </div>

            {/* Settle Round Button (only in active cycle when entries exist) */}
            {canManage && selectedCycle === 'active' && activeEntriesCount > 0 && (
              <button
                type="button"
                className="btn btn-settle-cycle"
                onClick={() => setShowSettleDialog(true)}
                title="Mark current round as settled & archive entries"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>સરભર કરો & નવો રાઉન્ડ</span>
              </button>
            )}

            {canManage && typeof selectedCycle === 'number' && selectedCycle === currentCycleNo - 1 && (
              <button
                type="button"
                className="btn btn-reopen-cycle"
                onClick={handleReopenCycle}
                disabled={isReopening}
                title="Reopen this settled round"
              >
                <span>↩️ રાઉન્ડ ફરી ચાલુ કરો</span>
              </button>
            )}
          </div>

          {/* Past Cycle Notice Banner */}
          {selectedCycle !== 'active' && (
            <div className="vahi-past-cycle-notice">
              <span>
                {selectedCycle === 'all'
                  ? '📋 તમામ હિસાબ (All History): બધી જ એન્ટ્રીઓ દર્શાવેલ છે.'
                  : `✓ Round ${selectedCycle} (સરભર થયેલ હિસાબ): આ રાઉન્ડ પૂર્ણ અને સરભર થઈ ગયેલ છે.`}
              </span>
              {selectedCycle === currentCycleNo - 1 && canManage && (
                <button
                  type="button"
                  className="btn btn-link-reopen"
                  onClick={handleReopenCycle}
                  disabled={isReopening}
                >
                  રાઉન્ડ ફરી ખોલો (Reopen)
                </button>
              )}
            </div>
          )}

          {/* Action Bar (Add Jama, Add Udhar, WhatsApp Share, Download PDF) */}
          <div className="khata-action-bar">
            {canManage && selectedCycle === 'active' && (
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

            {canManage && selectedCycle !== 'active' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 700, color: '#64748b', padding: '0.3rem 0' }}>
                <span>🔒 આ રાઉન્ડ સરભર થયેલ છે (Viewing Past History)</span>
              </div>
            )}

            {canPrint && (
              <>
                <button
                  type="button"
                  className="btn btn-whatsapp-share"
                  onClick={handleShareWhatsApp}
                  disabled={isGeneratingPdf}
                  title="Share PDF Statement on WhatsApp"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                  <span>{isGeneratingPdf ? '⏳ PDF Ban Rahi Hai...' : 'Share WhatsApp (PDF)'}</span>
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
                    : '⚡ New Udhar Entry (માલ ઉધાર / બિલ / ખર્ચ)'}
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
                    ⚡ Udhar (માલ ઉધાર / બિલ / Bill) ▶
                  </button>
                </div>

                {/* Quick Suggestion Chips */}
                <div style={{ margin: '0.35rem 0 0.65rem' }}>
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, marginRight: '0.4rem' }}>
                    Quick Select:
                  </span>
                  {entryType === 'udhar' ? (
                    <div style={{ display: 'inline-flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {['માલ ઉધાર / બિલ', 'ગેરેજ - ઓઇલ-એન્જિન', 'માલસામાન', 'કલર કામ', 'રેડિયમ કામ', 'એક્સેસરીઝ'].map((sug) => (
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
                      placeholder={entryType === 'jama' ? 'e.g. રોકડા જમા' : 'e.g. માલ ઉધાર / બિલ / ગેરેજ ખર્ચ'}
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

                {/* Optional Bill No. & Optional Stock In (+Stock) */}
                <div className="entry-inputs-grid" style={{ marginTop: '0.5rem' }}>
                  <div className="form-group">
                    <label className="form-label">Bill No. / બિલ નં. (Optional)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. INV-104 (વૈકલ્પિક)"
                      value={billNo}
                      onChange={(e) => setBillNo(e.target.value)}
                    />
                  </div>

                  {!editingEntry && (
                    <div className="form-group">
                      <label className="form-label">📦 Stock Select (+Stock Optional)</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="🔍 સ્ટોક આઇટમ શોધો (Optional)..."
                        value={stockSearch}
                        onChange={(e) => setStockSearch(e.target.value)}
                        style={{ marginBottom: '0.35rem', fontSize: '0.78rem' }}
                      />
                      <select
                        className="form-input"
                        value={stockItemId}
                        onChange={(e) => {
                          setStockItemId(e.target.value);
                          if (!e.target.value) setStockQty('');
                        }}
                      >
                        <option value="">-- સ્ટોક પસંદ ન કરવો (Optional / Only Vyapari Entry) --</option>
                        {filteredStockItems.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.category_name}) • હાલ: {Number(item.quantity || 0)} {item.unit || 'Pcs'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {!editingEntry && stockItemId && (
                  <div
                    style={{
                      background: '#f0fdfa',
                      border: '1px solid #99f6e4',
                      borderRadius: '10px',
                      padding: '0.65rem 0.75rem',
                      marginBottom: '0.65rem',
                    }}
                  >
                    <div className="entry-inputs-grid" style={{ alignItems: 'center' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ color: '#0f766e' }}>
                          Add Stock Qty (+ {selectedStockItemObj?.unit || 'Qty'}) *
                        </label>
                        <input
                          type="number"
                          className="form-input"
                          placeholder={`કેટલો જથ્થો ઉમેરવો? (${selectedStockItemObj?.unit || 'Pcs'})`}
                          value={stockQty}
                          onChange={(e) => setStockQty(e.target.value)}
                          min="0.01"
                          step="any"
                        />
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#0f766e', fontWeight: 700, paddingTop: '0.85rem' }}>
                        ✅ સેવ કરતા જ <strong>{selectedStockItemObj?.name}</strong> માં{' '}
                        <strong>+{Number(stockQty) > 0 ? Number(stockQty) : 0} {selectedStockItemObj?.unit || 'Pcs'}</strong>{' '}
                        સ્ટોક ઉમેરાઈ જશે!
                      </div>
                    </div>
                  </div>
                )}

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
          <div className="khata-vahi-sheet-container">
            {/* Notebook Header Strip (NO Account No.!) */}
            <div className="khata-vahi-header-strip">
              <div className="vahi-header-left">
                <span className="vahi-worker-title">Name / નામ: {account?.party_name}</span>
                <span className="vahi-ac-subtitle">
                  {account?.firm_name ? `Truck: ${account.firm_name} • ` : ''}
                  {account?.phone ? `Phone: ${account.phone} • ` : ''}
                  {account?.address ? `City: ${account.address} • ` : ''}
                  {selectedCycle === 'active'
                    ? `Round ${currentCycleNo} (Active Ledger)`
                    : selectedCycle === 'all'
                    ? 'All History (તમામ હિસાબ)'
                    : `Round ${selectedCycle} (Settled સરભર)`}
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
                  {canManage && selectedCycle === 'active' && (
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
                              {row.bill_no && (
                                <span
                                  className="vahi-mode-badge"
                                  style={{ marginLeft: '0.35rem', background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }}
                                >
                                  🧾 Bill #{row.bill_no}
                                </span>
                              )}
                              {row.stock_item_name && (
                                <span
                                  className="vahi-mode-badge"
                                  style={{ marginLeft: '0.35rem', background: '#ccfbf1', color: '#0f766e', borderColor: '#99f6e4' }}
                                >
                                  📦 +{Number(row.stock_qty || 0)} {row.stock_item_name}
                                </span>
                              )}
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
                                <DeleteActionButton
                                  permission="vyapari:khata"
                                  module="vyapari_entry"
                                  entityId={row.id}
                                  entityMeta={{ accountId }}
                                  entityLabel={`Vyapari Khata (${account?.party_name || ''}): ${row.type} ₹${row.amount}`}
                                  entitySnapshot={{ party_name: account?.party_name, type: row.type, amount: row.amount, date: row.date, particulars: row.particulars }}
                                  onDirectDelete={() => setDeletingEntry(row)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: '0.85rem' }}
                                  title="Delete Entry"
                                  requestTitle="Request Admin to Delete Vyapari Entry"
                                  requestChildren="📩"
                                >
                                  🗑️
                                </DeleteActionButton>
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
                  {canManage && selectedCycle === 'active' && (
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
                              <span style={{ fontWeight: 700, color: '#9a3412' }}>{row.particulars || 'માલ ઉધાર / બિલ'}</span>
                              {row.bill_no && (
                                <span
                                  className="vahi-mode-badge"
                                  style={{ marginLeft: '0.35rem', background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }}
                                >
                                  🧾 Bill #{row.bill_no}
                                </span>
                              )}
                              {row.stock_item_name && (
                                <span
                                  className="vahi-mode-badge"
                                  style={{ marginLeft: '0.35rem', background: '#ccfbf1', color: '#0f766e', borderColor: '#99f6e4' }}
                                >
                                  📦 +{Number(row.stock_qty || 0)} {row.stock_item_name}
                                </span>
                              )}
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
                                <DeleteActionButton
                                  permission="vyapari:khata"
                                  module="vyapari_entry"
                                  entityId={row.id}
                                  entityMeta={{ accountId }}
                                  entityLabel={`Vyapari Khata (${account?.party_name || ''}): ${row.type} ₹${row.amount}`}
                                  entitySnapshot={{ party_name: account?.party_name, type: row.type, amount: row.amount, date: row.date, particulars: row.particulars }}
                                  onDirectDelete={() => setDeletingEntry(row)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: '0.85rem' }}
                                  title="Delete Entry"
                                  requestTitle="Request Admin to Delete Vyapari Entry"
                                  requestChildren="📩"
                                >
                                  🗑️
                                </DeleteActionButton>
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

      {/* ========================================================
          BACKGROUND PRINTABLE PDF SHEET (Fixed 720px, All Entries, Multi-Page Support)
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
        <div id="printableTruckAccountSheet" className="khata-printable-paper">
          {getPdfPagesData().map((page) => (
            <div
              key={page.pageNum}
              id={page.totalPages === 1 ? 'pdf-single-page' : undefined}
              className="pdf-page khata-pdf-sheet-page"
              style={{
                width: '720px',
                minHeight: '980px',
                padding: '16px 20px',
                backgroundColor: '#ffffff',
                boxSizing: 'border-box',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Header: Full brand banner on Page 1, compact continuation header on Page 2+ */}
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
                        <span className="badge-eng">TRUCK KHATA VAHI</span>
                        <span className="badge-hin">CUSTOMER LEDGER STATEMENT</span>
                      </div>
                    </div>
                  </div>

                  <div className="khata-pdf-notebook-header">
                    <div>
                      <div className="pdf-notebook-title">Name / નામ: {account?.party_name}</div>
                      <div className="pdf-notebook-meta">
                        {account?.firm_name ? `Truck: ${account.firm_name} • ` : ''}
                        {account?.phone ? `Phone: ${account.phone} • ` : ''}
                        {account?.address ? `City: ${account.address} • ` : ''}
                        {selectedCycle === 'active'
                          ? `Round ${currentCycleNo} (Active Ledger)`
                          : selectedCycle === 'all'
                          ? 'All-Time Complete Ledger'
                          : `Round ${selectedCycle} (Settled Statement)`}
                      </div>
                    </div>
                    <div className="pdf-page-stamp-box">
                      <div>PAGE</div>
                      <div style={{ fontSize: '18px' }}>{account?.page_no || '—'}</div>
                    </div>
                  </div>
                </>
              ) : (
                <div
                  className="khata-pdf-continuation-header"
                  style={{
                    marginBottom: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '2px solid #1e3a8a',
                    paddingBottom: '4px',
                  }}
                >
                  <span style={{ fontWeight: 800, fontSize: '12px', color: '#1e3a8a' }}>
                    FAIZAN BODY WORKS • {account?.party_name} {account?.firm_name ? `(${account.firm_name})` : ''} — Page {page.pageNum} of {page.totalPages}
                  </span>
                  <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
                    Vehicle Khata Ledger Statement (Continuation)
                  </span>
                </div>
              )}

              {/* 2-Column Ledger Grid (Never hidden, no scroll cutoff) */}
              <div className="khata-pdf-two-col-grid" style={{ flex: 1, minHeight: '380px' }}>
                {/* Left Column: JAMA (Payment Received) */}
                <div className="pdf-vahi-col-jama">
                  <div className="pdf-col-hdr">
                    <span>જ. JAMA (રકમ જમા / Payment)</span>
                    <span>{page.jamaPageRows.length} {page.totalPages > 1 ? `(Pg ${page.pageNum})` : 'Entries'}</span>
                  </div>

                  <table className="pdf-vahi-table">
                    <thead>
                      <tr>
                        <th style={{ width: '24px', textAlign: 'center' }}>#</th>
                        <th style={{ width: '50px' }}>તારીખ</th>
                        <th>PARTICULARS (વિગત)</th>
                        <th style={{ width: '80px', textAlign: 'right' }}>રૂપિયા ₹</th>
                      </tr>
                    </thead>
                    <tbody>
                      {page.jamaPageRows.length === 0 ? (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', padding: '14px', color: '#94a3b8', fontStyle: 'italic' }}>
                            {page.isFirst ? 'કોઈ જમા એન્ટ્રી નથી (No Jama entries)' : '(બધી જમા એન્ટ્રીઓ આગળ દર્શાવેલ છે)'}
                          </td>
                        </tr>
                      ) : (
                        page.jamaPageRows.map((row, idx) => (
                          <tr key={row.id || idx}>
                            <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                              {page.startIndex + idx + 1}
                            </td>
                            <td style={{ fontWeight: 600, color: '#1e293b' }}>
                              {row.date ? String(row.date).slice(5).replace('-', '/') : '—'}
                            </td>
                            <td>
                              <span style={{ fontWeight: 600 }}>{row.particulars || 'રોકડા જમા'}</span>
                              {row.payment_mode && row.payment_mode !== 'Cash' ? (
                                <span style={{ marginLeft: '4px', fontSize: '8.5px', background: '#f1f5f9', padding: '1px 3px', borderRadius: '3px', color: '#475569' }}>
                                  {row.payment_mode}
                                </span>
                              ) : null}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#16a34a' }}>
                              ₹{Number(row.amount).toLocaleString('en-IN')}/-
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {page.isLast && (
                    <div
                      className="pdf-col-footer"
                      style={{
                        marginTop: 'auto',
                        padding: '6px 8px',
                        borderTop: '1.5px solid #64748b',
                        background: '#f0fdf4',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '11px', color: '#166534' }}>
                        <span>ટોટલ જમા (Total Received):</span>
                        <span>₹{totalJama.toLocaleString('en-IN')}/-</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: UDHAR (Vehicle Cost & Expenses) */}
                <div className="pdf-vahi-col-udhar">
                  <div className="pdf-col-hdr">
                    <span>ઉ. UDHAR (બિલ / ખર્ચ)</span>
                    <span>{page.udharPageRows.length} {page.totalPages > 1 ? `(Pg ${page.pageNum})` : 'Entries'}</span>
                  </div>

                  <table className="pdf-vahi-table">
                    <thead>
                      <tr>
                        <th style={{ width: '24px', textAlign: 'center' }}>#</th>
                        <th>PARTICULARS (વિગત)</th>
                        <th style={{ width: '80px', textAlign: 'right' }}>રૂપિયા ₹</th>
                        <th style={{ width: '50px', textAlign: 'center' }}>તારીખ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {page.udharPageRows.length === 0 ? (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center', padding: '14px', color: '#94a3b8', fontStyle: 'italic' }}>
                            {page.isFirst ? 'કોઈ ઉધાર એન્ટ્રી નથી (No Udhar entries)' : '(બધી ઉધાર એન્ટ્રીઓ આગળ દર્શાવેલ છે)'}
                          </td>
                        </tr>
                      ) : (
                        page.udharPageRows.map((row, idx) => (
                          <tr key={row.id || idx}>
                            <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                              {page.startIndex + idx + 1}
                            </td>
                            <td>
                              <span style={{ fontWeight: 700, color: '#9a3412' }}>{row.particulars || 'માલ ઉધાર / બિલ'}</span>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#d97706' }}>
                              ₹{Number(row.amount).toLocaleString('en-IN')}/-
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 600, color: '#1e293b' }}>
                              {row.date ? String(row.date).slice(5).replace('-', '/') : '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {page.isLast && (
                    <div
                      className="pdf-col-footer"
                      style={{
                        marginTop: 'auto',
                        padding: '6px 8px',
                        borderTop: '1.5px solid #64748b',
                        background: '#fffbeb',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '10.5px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                          <span>ટોટલ બિલ / ઉધાર:</span>
                          <span style={{ color: '#b45309' }}>₹{totalUdhar.toLocaleString('en-IN')}/-</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                          <span>- ટોટલ જમા (મળેલ):</span>
                          <span style={{ color: '#16a34a' }}>- ₹{totalJama.toLocaleString('en-IN')}/-</span>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            fontWeight: 900,
                            fontSize: '11.5px',
                            borderTop: '1px solid #cbd5e1',
                            paddingTop: '3px',
                          }}
                        >
                          <span style={{ color: remainingBalance > 0 ? '#b91c1c' : remainingBalance < 0 ? '#1d4ed8' : '#15803d' }}>
                            {remainingBalance > 0 ? 'બાકી (Due to Pay):' : remainingBalance < 0 ? 'એડવાન્સ જમા (Advance):' : 'સરભર (Settled):'}
                          </span>
                          <span style={{ color: remainingBalance > 0 ? '#b91c1c' : remainingBalance < 0 ? '#1d4ed8' : '#15803d' }}>
                            ₹{Math.abs(remainingBalance).toLocaleString('en-IN')}/-
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Signatures on Last Page */}
              {page.isLast && (
                <div className="khata-pdf-sign-row" style={{ marginTop: '12px' }}>
                  <div className="sign-col left-sign">
                    <div className="sign-draw-line"></div>
                    <span className="sign-owner-lbl">Customer Signature</span>
                    <span className="sign-sub-lbl">({account?.party_name})</span>
                  </div>
                  <div className="sign-col right-sign">
                    <div className="sign-draw-line"></div>
                    <span className="sign-owner-lbl">Authorized Signatory</span>
                    <span className="sign-sub-lbl">Faizan Body Works</span>
                  </div>
                </div>
              )}

              {/* Bottom Statement Footer */}
              <div className="khata-pdf-bottom-notice" style={{ marginTop: 'auto', paddingTop: '8px' }}>
                <span>Faizan Body Works • Vehicle Customer Khata • Computerized Statement</span>
                <span className="pdf-page-num-tag">Page {page.pageNum} of {page.totalPages}</span>
              </div>
            </div>
          ))}
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
      {/* Settle Round Confirmation Dialog */}
      {showSettleDialog && (
        <div className="modal-backdrop" style={{ zIndex: 100000 }} onClick={() => setShowSettleDialog(false)}>
          <div
            className="android-dialog luxury-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '440px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '1.4rem' }}>✅</span>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.05rem', fontWeight: 800 }}>
                  હિસાબ સરભર કરો & નવો રાઉન્ડ
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                  Round {currentCycleNo} Final Settlement
                </span>
              </div>
            </div>

            <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '0.75rem 0.9rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>Party:</span>
                <strong style={{ color: '#0f172a' }}>{account?.party_name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>ટોટલ બિલ (ઉધાર):</span>
                <strong style={{ color: '#b45309' }}>₹{totalUdhar.toLocaleString('en-IN')}/-</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.35rem' }}>
                <span style={{ color: '#64748b', fontWeight: 600 }}>ટોટલ મળેલ (જમા):</span>
                <strong style={{ color: '#15803d' }}>₹{totalJama.toLocaleString('en-IN')}/-</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', borderTop: '1px solid #cbd5e1', paddingTop: '0.45rem', marginTop: '0.45rem' }}>
                <span style={{ fontWeight: 800, color: remainingBalance > 0 ? '#b91c1c' : '#15803d' }}>
                  {remainingBalance === 0 ? 'સરભર (Net Settled):' : remainingBalance > 0 ? 'બાકી રકમ (Due):' : 'એડવાન્સ જમા:'}
                </span>
                <strong style={{ fontWeight: 900, fontSize: '0.95rem', color: remainingBalance === 0 ? '#15803d' : remainingBalance > 0 ? '#dc2626' : '#2563eb' }}>
                  ₹{Math.abs(remainingBalance).toLocaleString('en-IN')}/-
                </strong>
              </div>
            </div>

            {remainingBalance !== 0 ? (
              <div style={{ background: remainingBalance > 0 ? '#fef2f2' : '#eff6ff', border: `1.5px solid ${remainingBalance > 0 ? '#fecaca' : '#bfdbfe'}`, borderRadius: '10px', padding: '0.65rem 0.8rem', marginBottom: '0.9rem' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: remainingBalance > 0 ? '#991b1b' : '#1e40af', lineHeight: 1.45 }}>
                  {remainingBalance > 0
                    ? `📌 બાકી રકમ ₹${Math.abs(remainingBalance).toLocaleString('en-IN')}/- નવા Round ${currentCycleNo + 1} માં આપમેળે ઉધાર બાજુ "Round ${currentCycleNo} ની આગળની બાકી રહેલ રકમ" તરીકે કેરી-ફોરવર્ડ થઈ જશે.`
                    : `📌 એડવાન્સ રકમ ₹${Math.abs(remainingBalance).toLocaleString('en-IN')}/- નવા Round ${currentCycleNo + 1} માં આપમેળે જમા બાજુ "Round ${currentCycleNo} ની આગળની એડવાન્સ જમા રકમ" તરીકે કેરી-ફોરવર્ડ થઈ જશે.`}
                </p>
              </div>
            ) : (
              <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '10px', padding: '0.65rem 0.8rem', marginBottom: '0.9rem' }}>
                <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: '#166534' }}>
                  ✓ હિસાબ સંપૂર્ણ સરભર (₹0) છે. નવો Round {currentCycleNo + 1} એકદમ ખાલી/સાફ શરૂ થશે.
                </p>
              </div>
            )}

            <p style={{ color: '#64748b', fontSize: '0.78rem', lineHeight: 1.45, margin: '0 0 1rem' }}>
              ℹ️ હાલની એન્ટ્રીઓ <strong>Round {currentCycleNo}</strong> તરીકે સચવાઈ જશે. જૂનો હિસાબ ગમે ત્યારે &quot;Round {currentCycleNo}&quot; ટેબ પરથી જોઈ અને WhatsApp/PDF કરી શકાશે.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowSettleDialog(false)}
                disabled={isSettling}
              >
                રદ કરો (Cancel)
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: '#059669', borderColor: '#059669' }}
                onClick={handleSettleCycle}
                disabled={isSettling}
              >
                {isSettling ? 'સરભર થઈ રહ્યું છે...' : '✅ હા, સરભર કરી નવો રાઉન્ડ શરૂ કરો'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default VyapariModal;
