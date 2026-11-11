import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { rojmedService, getTodayLocalDate } from '../../services/rojmedService';
import { downloadPdfFile, sharePdfFile } from '../../utils/pdfGenerator';
import { Snackbar } from '../workers/Snackbar';
import { useAuth } from '../../context/AuthContext';

function shiftDate(dateStr, days) {
  const [y, m, d] = (dateStr || getTodayLocalDate()).split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatRupee(val) {
  const num = Number(val) || 0;
  return `₹${num.toLocaleString('en-IN')}/-`;
}

function getSourceBadgeMeta(entry) {
  if (entry.source_type === 'worker') {
    const name = entry.worker_name || 'Worker';
    if (entry.entry_type === 'aavak') {
      return {
        label: `👷 ${name} • રોકડા જમા`,
        bg: '#dcfce7',
        color: '#166534',
        border: '#86efac',
      };
    }
    const subLabel = entry.sub_type === 'payment' ? 'હિસાબ પેટે' : 'ઉપાડ';
    return {
      label: `👷 ${name} • ${subLabel}`,
      bg: '#fff7ed',
      color: '#c2410c',
      border: '#fed7aa',
    };
  }

  if (entry.source_type === 'truck_account') {
    const label = entry.truck_party_name
      ? entry.truck_no
        ? `${entry.truck_party_name} (${entry.truck_no})`
        : entry.truck_party_name
      : 'Truck Account';
    if (entry.entry_type === 'aavak') {
      return {
        label: `🚛 ${label} • જમા`,
        bg: '#e0f2fe',
        color: '#0369a1',
        border: '#bae6fd',
      };
    }
    return {
      label: `🚛 ${label} • ઉધાર`,
      bg: '#fef3c7',
      color: '#92400e',
      border: '#fde68a',
    };
  }

  return null;
}

export function RojmedPage({ onBackToHome }) {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('rojmed:create');
  const canEdit = hasPermission('rojmed:edit');
  const canDelete = hasPermission('rojmed:delete');
  const canPrint = hasPermission('rojmed:print');

  const todayStr = useMemo(() => getTodayLocalDate(), []);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [viewMode, setViewMode] = useState('daily'); // 'daily' | 'monthly'
  const [mobileTab, setMobileTab] = useState('both'); // 'both' | 'aavak' | 'javak'

  // Daily sheet state
  const [sheet, setSheet] = useState({
    date: todayStr,
    opening_silak: 0,
    is_manual_opening: false,
    opening_notes: '',
    aavak_entries: [],
    javak_entries: [],
    total_aavak_entries: 0,
    total_aavak_with_opening: 0,
    total_javak: 0,
    closing_silak: 0,
  });
  const [loading, setLoading] = useState(true);

  // Linked account options (workers & truck accounts)
  const [accountOptions, setAccountOptions] = useState({ workers: [], truck_accounts: [] });

  // Monthly summary state
  const [selectedMonth, setSelectedMonth] = useState(() => todayStr.slice(0, 7));
  const [summaryData, setSummaryData] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Add / Edit Entry Form state
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [entryType, setEntryType] = useState('javak'); // 'aavak' | 'javak'
  const [sourceType, setSourceType] = useState('general'); // 'general' | 'worker' | 'truck_account'
  const [sourceId, setSourceId] = useState('');
  const [subType, setSubType] = useState('upad'); // 'upad' | 'payment' (for worker javak)
  const [entitySearch, setEntitySearch] = useState('');
  const [amount, setAmount] = useState('');
  const [entryDate, setEntryDate] = useState(todayStr);
  const [particulars, setParticulars] = useState('');
  const [notes, setNotes] = useState('');
  const [isAutoParticulars, setIsAutoParticulars] = useState(true);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Opening Silak Modal state
  const [showOpeningModal, setShowOpeningModal] = useState(false);
  const [openingInput, setOpeningInput] = useState('');
  const [openingNotesInput, setOpeningNotesInput] = useState('');
  const [isSavingOpening, setIsSavingOpening] = useState(false);

  // Delete Entry Dialog state
  const [deletingEntry, setDeletingEntry] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // PDF / Toast state
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [snackbar, setSnackbar] = useState({ message: '', type: 'info' });

  const amountInputRef = useRef(null);
  const particularsInputRef = useRef(null);
  const notesInputRef = useRef(null);

  const showToast = useCallback((message, type = 'info') => {
    setSnackbar({ message, type });
  }, []);

  const handleDateChange = useCallback((nextDate) => {
    if (!nextDate) return;
    setLoading(true);
    setSelectedDate(nextDate);
  }, []);

  const handleViewModeChange = useCallback((nextMode) => {
    if (nextMode === 'monthly') {
      setSummaryLoading(true);
    } else {
      setLoading(true);
    }
    setViewMode(nextMode);
  }, []);

  const handleMonthChange = useCallback((nextMonth) => {
    if (!nextMonth) return;
    setSummaryLoading(true);
    setSelectedMonth(nextMonth);
  }, []);

  const fetchDailySheet = useCallback(async (dateVal = selectedDate) => {
    try {
      const data = await rojmedService.getDailySheet(dateVal);
      if (data) setSheet(data);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load Daily Rojmed', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, showToast]);

  const fetchAccountOptions = useCallback(async () => {
    try {
      const opts = await rojmedService.getAccountOptions();
      setAccountOptions({
        workers: Array.isArray(opts?.workers) ? opts.workers : [],
        truck_accounts: Array.isArray(opts?.truck_accounts) ? opts.truck_accounts : [],
      });
    } catch {
      // ignore non-blocking fetch error
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    rojmedService
      .getDailySheet(selectedDate)
      .then((data) => {
        if (!cancelled && data) setSheet(data);
      })
      .catch((err) => {
        if (!cancelled) showToast(err.response?.data?.message || 'Failed to load Daily Rojmed', 'error');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDate, showToast]);

  useEffect(() => {
    let cancelled = false;
    rojmedService
      .getAccountOptions()
      .then((opts) => {
        if (!cancelled) {
          setAccountOptions({
            workers: Array.isArray(opts?.workers) ? opts.workers : [],
            truck_accounts: Array.isArray(opts?.truck_accounts) ? opts.truck_accounts : [],
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (viewMode !== 'monthly') return;
    let cancelled = false;
    rojmedService
      .getPeriodSummary({ month: selectedMonth })
      .then((data) => {
        if (!cancelled) setSummaryData(data);
      })
      .catch((err) => {
        if (!cancelled) showToast(err.response?.data?.message || 'Failed to load monthly summary', 'error');
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [viewMode, selectedMonth, showToast]);

  // Build smart auto particulars when choosing worker/truck
  const buildSuggestedParticulars = useCallback(
    (nextEntryType, nextSourceType, nextSourceId, nextSubType) => {
      if (nextSourceType === 'worker' && nextSourceId) {
        const w = accountOptions.workers.find((item) => Number(item.id) === Number(nextSourceId));
        if (!w) return '';
        if (nextEntryType === 'aavak') return `${w.name} - રોકડા જમા`;
        return nextSubType === 'payment' ? `${w.name} - હિસાબ પેટે` : `${w.name} - ઉપાડ`;
      }
      if (nextSourceType === 'truck_account' && nextSourceId) {
        const t = accountOptions.truck_accounts.find((item) => Number(item.id) === Number(nextSourceId));
        if (!t) return '';
        const label = t.truck_no ? `${t.party_name} (${t.truck_no})` : t.party_name;
        return nextEntryType === 'aavak' ? `${label} - રોકડા જમા` : `${label} - રોકડ ખર્ચ`;
      }
      return '';
    },
    [accountOptions]
  );

  const applyAutoParticulars = useCallback(
    (nextEntryType, nextSourceType, nextSourceId, nextSubType, forceAuto = isAutoParticulars) => {
      if (editingEntry || !forceAuto) return;
      if (nextSourceType === 'general') {
        setParticulars('');
        return;
      }
      const suggestion = buildSuggestedParticulars(nextEntryType, nextSourceType, nextSourceId, nextSubType);
      if (suggestion) setParticulars(suggestion);
    },
    [editingEntry, isAutoParticulars, buildSuggestedParticulars]
  );

  const openAddEntryModal = (defaultEntryType = 'javak') => {
    fetchAccountOptions();
    setEditingEntry(null);
    setEntryType(defaultEntryType);
    setSourceType('general');
    setSourceId('');
    setSubType('upad');
    setEntitySearch('');
    setAmount('');
    setEntryDate(selectedDate);
    setParticulars('');
    setNotes('');
    setIsAutoParticulars(true);
    setFormError('');
    setShowEntryModal(true);
    setTimeout(() => amountInputRef.current?.focus(), 60);
  };

  const openEditEntryModal = (entry) => {
    fetchAccountOptions();
    setEditingEntry(entry);
    setEntryType(entry.entry_type || 'javak');
    setSourceType(entry.source_type || 'general');
    setSourceId(entry.source_id ? String(entry.source_id) : '');
    setSubType(entry.sub_type === 'payment' ? 'payment' : 'upad');
    setEntitySearch('');
    setAmount(String(entry.amount || ''));
    setEntryDate(entry.date || selectedDate);
    setParticulars(entry.particulars || '');
    setNotes(entry.notes || '');
    setIsAutoParticulars(false);
    setFormError('');
    setShowEntryModal(true);
    setTimeout(() => amountInputRef.current?.focus(), 60);
  };

  const handleSaveEntry = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSubmitting) return;
    setFormError('');

    const numAmt = Number(amount);
    if (!Number.isFinite(numAmt) || numAmt <= 0) {
      setFormError('માન્ય રકમ દાખલ કરો (Please enter a valid positive amount)');
      amountInputRef.current?.focus();
      return;
    }

    if (sourceType === 'general' && !particulars.trim()) {
      setFormError('વિગત દાખલ કરો (Particulars / description is required)');
      particularsInputRef.current?.focus();
      return;
    }

    if ((sourceType === 'worker' || sourceType === 'truck_account') && !sourceId) {
      setFormError(
        sourceType === 'worker'
          ? 'કારીગર પસંદ કરો (Please select a Worker)'
          : 'ગાડી ખાતું પસંદ કરો (Please select a Truck Account)'
      );
      return;
    }

    const payload = {
      date: entryDate || selectedDate,
      entry_type: entryType,
      amount: numAmt,
      particulars: particulars.trim(),
      source_type: sourceType,
      source_id: sourceType === 'general' ? null : Number(sourceId),
      sub_type:
        sourceType === 'worker'
          ? entryType === 'aavak'
            ? 'jama'
            : subType
          : sourceType === 'truck_account'
          ? entryType === 'aavak'
            ? 'jama'
            : 'udhar'
          : null,
      notes: notes.trim(),
    };

    try {
      setIsSubmitting(true);
      if (editingEntry) {
        const res = await rojmedService.updateEntry(editingEntry.id, payload, editingEntry);
        if (res?.sheet && (entryDate || selectedDate) === selectedDate) {
          setSheet(res.sheet);
        } else {
          await fetchDailySheet(selectedDate);
        }
        showToast('રોજમેળ એન્ટ્રી અપડેટ થઈ ગઈ (Entry updated)', 'success');
      } else {
        const res = await rojmedService.createEntry(payload);
        if (res?.sheet && (entryDate || selectedDate) === selectedDate) {
          setSheet(res.sheet);
        } else {
          await fetchDailySheet(selectedDate);
        }
        showToast(
          sourceType === 'general'
            ? 'રોજમેળ એન્ટ્રી ઉમેરાઈ ગઈ (Entry added)'
            : 'રોજમેળ + ખાતાવહી બંનેમાં એન્ટ્રી સેવ થઈ ગઈ!',
          'success'
        );
      }
      setShowEntryModal(false);
      setEditingEntry(null);
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Error saving entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingEntry || isDeleting) return;
    try {
      setIsDeleting(true);
      const res = await rojmedService.deleteEntry(deletingEntry.id, deletingEntry);
      if (res?.sheet) setSheet(res.sheet);
      else await fetchDailySheet(selectedDate);
      setDeletingEntry(null);
      showToast('એન્ટ્રી ડિલીટ થઈ ગઈ (Entry deleted)', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete entry', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const openOpeningSilakModal = () => {
    setOpeningInput(String(sheet.opening_silak ?? 0));
    setOpeningNotesInput(sheet.opening_notes || '');
    setShowOpeningModal(true);
  };

  const handleSaveOpeningSilak = async (e) => {
    e.preventDefault();
    const numBal = Number(openingInput);
    if (openingInput === '' || !Number.isFinite(numBal)) {
      showToast('માન્ય ઓપનિંગ સિલક દાખલ કરો', 'error');
      return;
    }
    try {
      setIsSavingOpening(true);
      const updated = await rojmedService.setDailyOpening({
        date: selectedDate,
        opening_balance: numBal,
        notes: openingNotesInput.trim(),
      });
      if (updated) setSheet(updated);
      setShowOpeningModal(false);
      showToast('ઓપનિંગ સિલક સેવ થઈ ગઈ!', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to set opening balance', 'error');
    } finally {
      setIsSavingOpening(false);
    }
  };

  const handleRevertOpeningToAuto = async () => {
    try {
      setIsSavingOpening(true);
      const updated = await rojmedService.setDailyOpening({
        date: selectedDate,
        clear: true,
      });
      if (updated) setSheet(updated);
      setShowOpeningModal(false);
      showToast('ઓપનિંગ સિલક Auto Carry-Forward પર સેટ થઈ ગઈ', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to revert opening balance', 'error');
    } finally {
      setIsSavingOpening(false);
    }
  };

  const handleShareWhatsAppText = () => {
    let text = `📒 *FAIZAN BODY WORKSHOP — રોજમેળ (ROJMED)*\n`;
    text += `📅 *Date:* ${formatDisplayDate(selectedDate)} (${selectedDate})\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `💰 *ઓપનિંગ સિલક (Opening):* ${formatRupee(sheet.opening_silak)}\n\n`;

    text += `*🔸 આવક (AAVAK - Cash In):*\n`;
    if (sheet.aavak_entries.length === 0) {
      text += `  (કોઈ વધારાની આવક નથી)\n`;
    } else {
      sheet.aavak_entries.forEach((e, i) => {
        text += `  ${i + 1}. ${e.particulars}: ${formatRupee(e.amount)}\n`;
      });
    }
    text += `  *કુલ આવક (સિલક + આવક): ${formatRupee(sheet.total_aavak_with_opening)}*\n\n`;

    text += `*🔹 જાવક (JAVAK - Cash Out):*\n`;
    if (sheet.javak_entries.length === 0) {
      text += `  (કોઈ જાવક નથી)\n`;
    } else {
      sheet.javak_entries.forEach((e, i) => {
        text += `  ${i + 1}. ${e.particulars}: ${formatRupee(e.amount)}\n`;
      });
    }
    text += `  *કુલ જાવક: ${formatRupee(sheet.total_javak)}*\n\n`;

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📥 *આવક:* ${formatRupee(sheet.total_aavak_with_opening)}\n`;
    text += `📤 *જાવક:* ${formatRupee(sheet.total_javak)}\n`;
    text += `✅ *ક્લોઝિંગ સિલક (Closing Balance): ${formatRupee(sheet.closing_silak)}*\n`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleDownloadPdf = async () => {
    if (isGeneratingPdf) return;
    try {
      setIsGeneratingPdf(true);
      showToast('⏳ Generating Rojmed PDF...', 'info');
      await new Promise((r) => setTimeout(r, 150));
      await downloadPdfFile({
        elementId: 'printableRojmedSheet',
        fileName: `FaizanBody_Rojmed_${selectedDate}.pdf`,
      });
      showToast('✅ Rojmed PDF downloaded!', 'success');
    } catch (err) {
      console.error('Rojmed PDF error:', err);
      showToast('⚠️ Failed to generate PDF', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSharePdf = async () => {
    if (isGeneratingPdf) return;
    try {
      setIsGeneratingPdf(true);
      showToast('⏳ Preparing Rojmed PDF...', 'info');
      await new Promise((r) => setTimeout(r, 150));
      await sharePdfFile({
        elementId: 'printableRojmedSheet',
        fileName: `FaizanBody_Rojmed_${selectedDate}.pdf`,
      });
      showToast('✅ Rojmed PDF ready!', 'success');
    } catch (err) {
      console.error('Rojmed PDF share error:', err);
      showToast('⚠️ Failed to share PDF', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Filter entity options in modal
  const filteredWorkers = useMemo(() => {
    const q = entitySearch.trim().toLowerCase();
    if (!q) return accountOptions.workers;
    return accountOptions.workers.filter(
      (w) =>
        (w.name && w.name.toLowerCase().includes(q)) ||
        (w.mobile && w.mobile.includes(q))
    );
  }, [accountOptions.workers, entitySearch]);

  const filteredTrucks = useMemo(() => {
    const q = entitySearch.trim().toLowerCase();
    if (!q) return accountOptions.truck_accounts;
    return accountOptions.truck_accounts.filter(
      (t) =>
        (t.party_name && t.party_name.toLowerCase().includes(q)) ||
        (t.truck_no && t.truck_no.toLowerCase().includes(q)) ||
        (t.page_no && String(t.page_no).includes(q))
    );
  }, [accountOptions.truck_accounts, entitySearch]);

  // Live sync message in form
  const liveSyncNotice = useMemo(() => {
    if (sourceType === 'general') return null;
    if (sourceType === 'worker') {
      const w = accountOptions.workers.find((item) => Number(item.id) === Number(sourceId));
      const wName = w ? w.name : 'પસંદ કરેલ કારીગર';
      if (entryType === 'aavak') {
        return `🔗 Auto-Sync: "${wName}" ના Worker Khata માં 'રોકડા જમા (Jama)' તરીકે ઉમેરાશે.`;
      }
      const modeText = subType === 'payment' ? 'હિસાબ પેટે (Payment)' : 'ઉપાડ (Upad)';
      return `🔗 Auto-Sync: "${wName}" ના Worker Khata માં '${modeText}' તરીકે ઉમેરાશે.`;
    }
    if (sourceType === 'truck_account') {
      const t = accountOptions.truck_accounts.find((item) => Number(item.id) === Number(sourceId));
      const tName = t ? (t.truck_no ? `${t.party_name} (${t.truck_no})` : t.party_name) : 'પસંદ કરેલ ગાડી ખાતું';
      if (entryType === 'aavak') {
        return `🔗 Auto-Sync: "${tName}" ના Truck Khata માં 'જમા (Jama)' તરીકે ઉમેરાશે.`;
      }
      return `🔗 Auto-Sync: "${tName}" ના Truck Khata માં 'ઉધાર (Udhar)' તરીકે ઉમેરાશે.`;
    }
    return null;
  }, [sourceType, sourceId, entryType, subType, accountOptions]);

  return (
    <div className="workers-page-shell rojmed-page-shell">
      {/* Top Header Bar */}
      <div className="orders-header-bar rojmed-top-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {onBackToHome && (
            <button
              type="button"
              className="btn-back-home"
              onClick={onBackToHome}
              title="Back to Dashboard"
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              ←
            </button>
          )}
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>📒</span>
              <span>રોજમેળ (Daily Rojmed)</span>
            </h2>
            <p style={{ margin: 0, fontSize: '0.73rem', color: '#64748b', fontWeight: 600 }}>
              દૈનિક રોકડ આવક-જાવક • સિલક અને ખાતાવહી સિંક
            </p>
          </div>
        </div>

        <div className="rojmed-view-switch">
          <button
            type="button"
            className={`rojmed-view-btn ${viewMode === 'daily' ? 'active' : ''}`}
            onClick={() => handleViewModeChange('daily')}
          >
            📖 Daily Page
          </button>
          <button
            type="button"
            className={`rojmed-view-btn ${viewMode === 'monthly' ? 'active' : ''}`}
            onClick={() => handleViewModeChange('monthly')}
          >
            📅 Summary
          </button>
        </div>
      </div>

      <main className="android-body" style={{ padding: '0.85rem 1rem 5.5rem' }}>
        {viewMode === 'daily' ? (
          <>
            {/* Date Navigation Strip */}
            <div className="rojmed-date-nav-card">
              <button
                type="button"
                className="rojmed-date-arrow-btn"
                onClick={() => handleDateChange(shiftDate(selectedDate, -1))}
                title="Previous Day"
              >
                ◀ Prev
              </button>

              <div className="rojmed-date-center">
                <input
                  type="date"
                  className="rojmed-date-picker"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                />
                <span className="rojmed-date-readable">
                  {formatDisplayDate(selectedDate)}
                  {selectedDate === todayStr && (
                    <span className="rojmed-today-pill">Today</span>
                  )}
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                {selectedDate !== todayStr && (
                  <button
                    type="button"
                    className="rojmed-today-jump-btn"
                    onClick={() => handleDateChange(todayStr)}
                  >
                    Today
                  </button>
                )}
                <button
                  type="button"
                  className="rojmed-date-arrow-btn"
                  onClick={() => handleDateChange(shiftDate(selectedDate, 1))}
                  title="Next Day"
                >
                  Next ▶
                </button>
              </div>
            </div>

            {/* 4 KPI Summary Cards */}
            <div className="rojmed-kpi-grid">
              <div className="rojmed-kpi-card kpi-opening">
                <div className="rojmed-kpi-top">
                  <span className="rojmed-kpi-lbl">ઓપનિંગ સિલક (Opening)</span>
                  {(canCreate || canEdit) && (
                    <button
                      type="button"
                      className="rojmed-opening-edit-btn"
                      onClick={openOpeningSilakModal}
                      title="Set or adjust Opening Silak"
                    >
                      ✏️ Set
                    </button>
                  )}
                </div>
                <span className="rojmed-kpi-val">{formatRupee(sheet.opening_silak)}</span>
                <span className="rojmed-kpi-sub">
                  {sheet.is_manual_opening ? '📌 Manual Opening' : '🔄 Auto Carried Forward'}
                </span>
              </div>

              <div className="rojmed-kpi-card kpi-aavak">
                <span className="rojmed-kpi-lbl">આજની આવક (Cash In)</span>
                <span className="rojmed-kpi-val">+ {formatRupee(sheet.total_aavak_entries)}</span>
                <span className="rojmed-kpi-sub">
                  કુલ આવક: {formatRupee(sheet.total_aavak_with_opening)}
                </span>
              </div>

              <div className="rojmed-kpi-card kpi-javak">
                <span className="rojmed-kpi-lbl">આજની જાવક (Cash Out)</span>
                <span className="rojmed-kpi-val">- {formatRupee(sheet.total_javak)}</span>
                <span className="rojmed-kpi-sub">{sheet.javak_entries.length} entries</span>
              </div>

              <div className="rojmed-kpi-card kpi-closing">
                <span className="rojmed-kpi-lbl">ક્લોઝિંગ સિલક (Balance)</span>
                <span className="rojmed-kpi-val">{formatRupee(sheet.closing_silak)}</span>
                <span className="rojmed-kpi-sub">આવક - જાવક = સિલક</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="khata-action-bar" style={{ marginBottom: '0.85rem' }}>
              {canCreate && (
                <>
                  <button
                    type="button"
                    className="btn btn-add-entry-toggle btn-vahi-action-jama"
                    onClick={() => openAddEntryModal('aavak')}
                  >
                    <span>＋ આવક ઉમેરો (Aavak)</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-add-entry-toggle btn-vahi-action-udhar"
                    onClick={() => openAddEntryModal('javak')}
                  >
                    <span>＋ જાવક ઉમેરો (Javak)</span>
                  </button>
                </>
              )}

              {canPrint && (
                <>
                  <button
                    type="button"
                    className="btn btn-whatsapp-share"
                    onClick={handleShareWhatsAppText}
                    title="Share Text Summary on WhatsApp"
                  >
                    <span>💬 WhatsApp</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-whatsapp-share"
                    style={{ background: '#4f46e5', borderColor: '#4338ca' }}
                    onClick={handleSharePdf}
                    disabled={isGeneratingPdf}
                    title="Share Rojmed PDF"
                  >
                    <span>{isGeneratingPdf ? 'Wait...' : '📄 Share PDF'}</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-download-pdf-icon"
                    onClick={handleDownloadPdf}
                    disabled={isGeneratingPdf}
                    title="Download Rojmed PDF"
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

            {/* Mobile Column Switcher */}
            <div className="vahi-mobile-tabs-bar">
              <button
                type="button"
                className={`vahi-mob-tab ${mobileTab === 'both' ? 'active' : ''}`}
                onClick={() => setMobileTab('both')}
              >
                📜 Both (આવક + જાવક)
              </button>
              <button
                type="button"
                className={`vahi-mob-tab tab-mob-jama ${mobileTab === 'aavak' ? 'active' : ''}`}
                onClick={() => setMobileTab('aavak')}
              >
                💰 આવક ({sheet.aavak_entries.length})
              </button>
              <button
                type="button"
                className={`vahi-mob-tab tab-mob-udhar ${mobileTab === 'javak' ? 'active' : ''}`}
                onClick={() => setMobileTab('javak')}
              >
                💸 જાવક ({sheet.javak_entries.length})
              </button>
            </div>

            {/* Authentic 2-Column Rojmed Diary Sheet */}
            <div className="khata-vahi-sheet-container">
              <div className="khata-vahi-header-strip">
                <div className="vahi-header-left">
                  <span className="vahi-worker-title">📒 રોજમેળ (FAIZAN BODY WORKS)</span>
                  <span className="vahi-ac-subtitle">
                    Date: <strong>{formatDisplayDate(selectedDate)}</strong> ({selectedDate})
                  </span>
                </div>
                <div className="vahi-page-stamp">
                  <span className="vahi-page-stamp-lbl">સિલક</span>
                  <span className="vahi-page-stamp-num" style={{ fontSize: '0.88rem' }}>
                    {formatRupee(sheet.closing_silak)}
                  </span>
                </div>
              </div>

              {loading ? (
                <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
                  ⏳ રોજમેળ લોડ થઈ રહ્યું છે...
                </div>
              ) : (
                <>
                  <div className="khata-vahi-grid">
                    {/* LEFT COLUMN: આવક (AAVAK - Cash In) */}
                    <div className={`khata-vahi-col col-jama ${mobileTab === 'javak' ? 'mobile-hidden' : ''}`}>
                      <div className="vahi-col-top">
                        <div className="vahi-col-title-group">
                          <span className="vahi-col-heading">આવક (AAVAK / Cash In)</span>
                          <span className="vahi-col-count-badge">{sheet.aavak_entries.length} entries</span>
                        </div>
                        {canCreate && (
                          <button
                            type="button"
                            className="btn-vahi-add-entry"
                            onClick={() => openAddEntryModal('aavak')}
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
                              <th>વિગત (PARTICULARS)</th>
                              <th style={{ width: '96px', textAlign: 'right' }}>રૂપિયા ₹</th>
                              {(canEdit || canDelete) && <th style={{ width: '54px', textAlign: 'center' }}>ક્રિયા</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {/* Pinned Row 1: Opening Silak (સિલક) */}
                            <tr className="vahi-bf-row">
                              <td style={{ textAlign: 'center' }}>
                                <span className="vahi-bf-badge">સિલક</span>
                              </td>
                              <td>
                                <div className="vahi-bf-desc">
                                  <span className="vahi-bf-main-text">સિલક (Opening Balance)</span>
                                  <span className="vahi-bf-sub-text">
                                    {sheet.is_manual_opening
                                      ? sheet.opening_notes || 'Manual Opening Set'
                                      : 'Auto Carried Forward from Previous Day'}
                                  </span>
                                </div>
                              </td>
                              <td style={{ textAlign: 'right' }} className="vahi-bf-amount">
                                {formatRupee(sheet.opening_silak)}
                              </td>
                              {(canEdit || canDelete) && (
                                <td style={{ textAlign: 'center' }}>
                                  {(canCreate || canEdit) && (
                                    <button
                                      type="button"
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                                      onClick={openOpeningSilakModal}
                                      title="Edit Opening Silak"
                                    >
                                      ✏️
                                    </button>
                                  )}
                                </td>
                              )}
                            </tr>

                            {sheet.aavak_entries.length === 0 ? (
                              <tr>
                                <td colSpan={canEdit || canDelete ? 4 : 3} className="vahi-empty-column-box">
                                  આજે કોઈ આવક ઉમેરાઈ નથી (No Aavak entries today)
                                </td>
                              </tr>
                            ) : (
                              sheet.aavak_entries.map((row, idx) => {
                                const badge = getSourceBadgeMeta(row);
                                return (
                                  <tr key={row.id}>
                                    <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
                                      {idx + 1}
                                    </td>
                                    <td>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{row.particulars}</span>
                                        {badge && (
                                          <span
                                            style={{
                                              display: 'inline-block',
                                              alignSelf: 'flex-start',
                                              fontSize: '0.64rem',
                                              fontWeight: 700,
                                              padding: '0.08rem 0.4rem',
                                              borderRadius: '8px',
                                              background: badge.bg,
                                              color: badge.color,
                                              border: `1px solid ${badge.border}`,
                                            }}
                                          >
                                            {badge.label}
                                          </span>
                                        )}
                                        {row.notes && row.notes !== row.particulars && (
                                          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{row.notes}</span>
                                        )}
                                      </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }} className="vahi-amt-jama">
                                      {formatRupee(row.amount)}
                                    </td>
                                    {(canEdit || canDelete) && (
                                      <td style={{ textAlign: 'center' }}>
                                        {canEdit && (
                                          <button
                                            type="button"
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: '0.85rem' }}
                                            onClick={() => openEditEntryModal(row)}
                                            title="Edit Entry"
                                          >
                                            ✏️
                                          </button>
                                        )}
                                        {canDelete && (
                                          <button
                                            type="button"
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: '0.85rem' }}
                                            onClick={() => setDeletingEntry(row)}
                                            title="Delete Entry"
                                          >
                                            🗑️
                                          </button>
                                        )}
                                      </td>
                                    )}
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="vahi-col-footer">
                        <div className="vahi-total-row">
                          <span>કુલ આવક (સિલક + આવક):</span>
                          <span className="vahi-total-jama-val">{formatRupee(sheet.total_aavak_with_opening)}</span>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: જાવક (JAVAK - Cash Out) */}
                    <div className={`khata-vahi-col col-udhar ${mobileTab === 'aavak' ? 'mobile-hidden' : ''}`}>
                      <div className="vahi-col-top">
                        <div className="vahi-col-title-group">
                          <span className="vahi-col-heading">જાવક (JAVAK / Cash Out)</span>
                          <span className="vahi-col-count-badge">{sheet.javak_entries.length} entries</span>
                        </div>
                        {canCreate && (
                          <button
                            type="button"
                            className="btn-vahi-add-entry"
                            onClick={() => openAddEntryModal('javak')}
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
                              <th>વિગત (PARTICULARS)</th>
                              <th style={{ width: '96px', textAlign: 'right' }}>રૂપિયા ₹</th>
                              {(canEdit || canDelete) && <th style={{ width: '54px', textAlign: 'center' }}>ક્રિયા</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {sheet.javak_entries.length === 0 ? (
                              <tr>
                                <td colSpan={canEdit || canDelete ? 4 : 3} className="vahi-empty-column-box">
                                  આજે કોઈ જાવક ઉમેરાઈ નથી (No Javak entries today)
                                </td>
                              </tr>
                            ) : (
                              sheet.javak_entries.map((row, idx) => {
                                const badge = getSourceBadgeMeta(row);
                                return (
                                  <tr key={row.id}>
                                    <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
                                      {idx + 1}
                                    </td>
                                    <td>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{row.particulars}</span>
                                        {badge && (
                                          <span
                                            style={{
                                              display: 'inline-block',
                                              alignSelf: 'flex-start',
                                              fontSize: '0.64rem',
                                              fontWeight: 700,
                                              padding: '0.08rem 0.4rem',
                                              borderRadius: '8px',
                                              background: badge.bg,
                                              color: badge.color,
                                              border: `1px solid ${badge.border}`,
                                            }}
                                          >
                                            {badge.label}
                                          </span>
                                        )}
                                        {row.notes && row.notes !== row.particulars && (
                                          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>{row.notes}</span>
                                        )}
                                      </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }} className="vahi-amt-udhar">
                                      {formatRupee(row.amount)}
                                    </td>
                                    {(canEdit || canDelete) && (
                                      <td style={{ textAlign: 'center' }}>
                                        {canEdit && (
                                          <button
                                            type="button"
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: '0.85rem' }}
                                            onClick={() => openEditEntryModal(row)}
                                            title="Edit Entry"
                                          >
                                            ✏️
                                          </button>
                                        )}
                                        {canDelete && (
                                          <button
                                            type="button"
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', fontSize: '0.85rem' }}
                                            onClick={() => setDeletingEntry(row)}
                                            title="Delete Entry"
                                          >
                                            🗑️
                                          </button>
                                        )}
                                      </td>
                                    )}
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="vahi-col-footer">
                        <div className="vahi-total-row">
                          <span>કુલ જાવક (Total Javak):</span>
                          <span className="vahi-total-udhar-val">{formatRupee(sheet.total_javak)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Diary Summary Strip (Exact match to handwritten diary bottom block) */}
                  <div className="rojmed-bottom-summary-box">
                    <div className="rojmed-bottom-compare-row">
                      <div className="rojmed-bottom-col">
                        <span className="rojmed-bottom-lbl">આવક (Total Aavak)</span>
                        <span className="rojmed-bottom-amt text-aavak">{formatRupee(sheet.total_aavak_with_opening)}</span>
                      </div>
                      <div className="rojmed-bottom-divider">−</div>
                      <div className="rojmed-bottom-col">
                        <span className="rojmed-bottom-lbl">જાવક (Total Javak)</span>
                        <span className="rojmed-bottom-amt text-javak">{formatRupee(sheet.total_javak)}</span>
                      </div>
                    </div>

                    <div className="rojmed-closing-banner">
                      <span className="rojmed-closing-title">સિલક (Closing Balance) =</span>
                      <span className="rojmed-closing-value">{formatRupee(sheet.closing_silak)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          /* MONTHLY SUMMARY TAB */
          <div className="rojmed-summary-shell">
            <div className="rojmed-date-nav-card" style={{ marginBottom: '0.85rem' }}>
              <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                📅 મહિનો પસંદ કરો (Select Month):
              </span>
              <input
                type="month"
                className="rojmed-date-picker"
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
              />
            </div>

            {summaryLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
                ⏳ મહિનાનો હિસાબ લોડ થઈ રહ્યો છે...
              </div>
            ) : summaryData ? (
              <>
                <div className="rojmed-kpi-grid" style={{ marginBottom: '0.85rem' }}>
                  <div className="rojmed-kpi-card kpi-opening">
                    <span className="rojmed-kpi-lbl">મહિનાની ઓપનિંગ સિલક</span>
                    <span className="rojmed-kpi-val">{formatRupee(summaryData.opening_silak)}</span>
                  </div>
                  <div className="rojmed-kpi-card kpi-aavak">
                    <span className="rojmed-kpi-lbl">કુલ આવક (Total Aavak)</span>
                    <span className="rojmed-kpi-val">+ {formatRupee(summaryData.total_aavak)}</span>
                  </div>
                  <div className="rojmed-kpi-card kpi-javak">
                    <span className="rojmed-kpi-lbl">કુલ જાવક (Total Javak)</span>
                    <span className="rojmed-kpi-val">- {formatRupee(summaryData.total_javak)}</span>
                  </div>
                  <div className="rojmed-kpi-card kpi-closing">
                    <span className="rojmed-kpi-lbl">મહિનાની આખર સિલક</span>
                    <span className="rojmed-kpi-val">{formatRupee(summaryData.closing_silak)}</span>
                  </div>
                </div>

                <div className="khata-vahi-sheet-container">
                  <div className="khata-vahi-header-strip">
                    <span className="vahi-worker-title">📋 દૈનિક રોજમેળ લિસ્ટ ({summaryData.days?.length || 0} days)</span>
                  </div>
                  <div className="vahi-table-wrap" style={{ maxHeight: '540px' }}>
                    <table className="vahi-table">
                      <thead>
                        <tr>
                          <th>તારીખ (Date)</th>
                          <th style={{ textAlign: 'right' }}>ઓપનિંગ સિલક</th>
                          <th style={{ textAlign: 'right' }}>આવક</th>
                          <th style={{ textAlign: 'right' }}>જાવક</th>
                          <th style={{ textAlign: 'right' }}>ક્લોઝિંગ સિલક</th>
                          <th style={{ textAlign: 'center' }}>ખોલો</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!summaryData.days || summaryData.days.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="vahi-empty-column-box">
                              આ મહિનામાં કોઈ રોજમેળ એન્ટ્રી નથી (No entries for this month)
                            </td>
                          </tr>
                        ) : (
                          summaryData.days.map((d) => (
                            <tr
                              key={d.date}
                              style={{ cursor: 'pointer' }}
                              onClick={() => {
                                handleDateChange(d.date);
                                handleViewModeChange('daily');
                              }}
                            >
                              <td style={{ fontWeight: 700, color: '#0f172a' }}>
                                {formatDisplayDate(d.date)}
                                {d.is_manual_opening && (
                                  <span style={{ marginLeft: '0.35rem', fontSize: '0.62rem', background: '#fef3c7', color: '#92400e', padding: '1px 5px', borderRadius: '6px' }}>
                                    Manual Open
                                  </span>
                                )}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatRupee(d.opening_silak)}</td>
                              <td style={{ textAlign: 'right' }} className="vahi-amt-jama">{formatRupee(d.total_aavak)}</td>
                              <td style={{ textAlign: 'right' }} className="vahi-amt-udhar">{formatRupee(d.total_javak)}</td>
                              <td style={{ textAlign: 'right', fontWeight: 900, color: '#0f172a' }}>{formatRupee(d.closing_silak)}</td>
                              <td style={{ textAlign: 'center' }}>
                                <button
                                  type="button"
                                  className="btn-vahi-add-entry"
                                  style={{ background: '#2563eb', color: '#fff' }}
                                >
                                  View →
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}
      </main>

      {/* ========================================================
          MODAL 1: ADD / EDIT ROJMED ENTRY (General / Worker / Truck)
          ======================================================== */}
      {showEntryModal && (
        <div className="modal-backdrop" style={{ zIndex: 10000 }} onClick={() => setShowEntryModal(false)}>
          <div
            className="android-bottom-sheet luxury-bottom-sheet"
            style={{ maxWidth: '580px', padding: '1.1rem 1.2rem 1.4rem' }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="sheet-handle-bar">
              <div className="sheet-handle"></div>
            </div>

            <div className="sheet-header" style={{ paddingBottom: '0.65rem', marginBottom: '0.75rem' }}>
              <h3 className="sheet-title" style={{ margin: 0 }}>
                {editingEntry ? '✏️ રોજમેળ એન્ટ્રી સુધારો (Edit Entry)' : '📒 નવી રોજમેળ એન્ટ્રી (New Entry)'}
              </h3>
              <button
                type="button"
                className="sheet-close-btn"
                onClick={() => setShowEntryModal(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="form-alert-error" style={{ marginBottom: '0.75rem' }}>
                <span>⚠️ {formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEntry} className="khata-entry-form">
              {/* Step 1: Aavak vs Javak */}
              <div className="entry-type-selector" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '0.75rem' }}>
                <button
                  type="button"
                  className={`entry-type-tab tab-salary ${entryType === 'aavak' ? 'active' : ''}`}
                  onClick={() => {
                    setEntryType('aavak');
                    applyAutoParticulars('aavak', sourceType, sourceId, subType);
                  }}
                >
                  💰 આવક (Aavak - આવ્યા)
                </button>
                <button
                  type="button"
                  className={`entry-type-tab tab-upad ${entryType === 'javak' ? 'active' : ''}`}
                  onClick={() => {
                    setEntryType('javak');
                    applyAutoParticulars('javak', sourceType, sourceId, subType);
                  }}
                >
                  💸 જાવક (Javak - ગયા)
                </button>
              </div>

              {/* Step 2: Account / Link Type */}
              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <label className="form-label">ખાતું પસંદ કરો (Account / Link Type)</label>
                <div className="rojmed-source-selector">
                  <button
                    type="button"
                    className={`rojmed-source-btn ${sourceType === 'general' ? 'active' : ''}`}
                    onClick={() => {
                      setSourceType('general');
                      setSourceId('');
                      applyAutoParticulars(entryType, 'general', '', subType);
                    }}
                  >
                    📝 સામાન્ય (General)
                  </button>
                  <button
                    type="button"
                    className={`rojmed-source-btn ${sourceType === 'worker' ? 'active' : ''}`}
                    onClick={() => {
                      setSourceType('worker');
                      setSourceId('');
                      setEntitySearch('');
                    }}
                  >
                    👷 કારીગર (Worker)
                  </button>
                  <button
                    type="button"
                    className={`rojmed-source-btn ${sourceType === 'truck_account' ? 'active' : ''}`}
                    onClick={() => {
                      setSourceType('truck_account');
                      setSourceId('');
                      setEntitySearch('');
                    }}
                  >
                    🚛 ગાડી ખાતું (Truck)
                  </button>
                </div>
              </div>

              {/* Step 3A: Worker Selection */}
              {sourceType === 'worker' && (
                <div className="rojmed-link-box" style={{ marginBottom: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: '0.55rem' }}>
                    <label className="form-label">કારીગર શોધો અને પસંદ કરો (Select Worker) *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="🔍 કારીગરનું નામ લખી શોધો..."
                      value={entitySearch}
                      onChange={(e) => setEntitySearch(e.target.value)}
                      style={{ marginBottom: '0.4rem' }}
                    />
                    <select
                      className="form-input"
                      value={sourceId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSourceId(val);
                        setIsAutoParticulars(true);
                        applyAutoParticulars(entryType, 'worker', val, subType, true);
                      }}
                      required
                    >
                      <option value="">-- કારીગર પસંદ કરો ({filteredWorkers.length}) --</option>
                      {filteredWorkers.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} {w.mobile ? `(${w.mobile})` : ''} {w.status === 'relieved' ? '[Relieved]' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {entryType === 'javak' && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">કારીગર ખાતામાં પ્રકાર (Khata Type)</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <button
                          type="button"
                          className={`rojmed-subtype-btn ${subType === 'upad' ? 'active' : ''}`}
                          onClick={() => {
                            setSubType('upad');
                            setIsAutoParticulars(true);
                            applyAutoParticulars(entryType, 'worker', sourceId, 'upad', true);
                          }}
                        >
                          ⚡ ઉપાડ (Upad)
                        </button>
                        <button
                          type="button"
                          className={`rojmed-subtype-btn ${subType === 'payment' ? 'active' : ''}`}
                          onClick={() => {
                            setSubType('payment');
                            setIsAutoParticulars(true);
                            applyAutoParticulars(entryType, 'worker', sourceId, 'payment', true);
                          }}
                        >
                          💵 હિસાબ પેટે (Payment)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3B: Truck Account Selection */}
              {sourceType === 'truck_account' && (
                <div className="rojmed-link-box" style={{ marginBottom: '0.75rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">ગાડી ખાતું શોધો અને પસંદ કરો (Select Truck Account) *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="🔍 પાર્ટીનું નામ, ગાડી નંબર કે પેજ નંબર લખો..."
                      value={entitySearch}
                      onChange={(e) => setEntitySearch(e.target.value)}
                      style={{ marginBottom: '0.4rem' }}
                    />
                    <select
                      className="form-input"
                      value={sourceId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSourceId(val);
                        setIsAutoParticulars(true);
                        applyAutoParticulars(entryType, 'truck_account', val, subType, true);
                      }}
                      required
                    >
                      <option value="">-- ગાડી ખાતું પસંદ કરો ({filteredTrucks.length}) --</option>
                      {filteredTrucks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.party_name}
                          {t.truck_no ? ` • ${t.truck_no}` : ''}
                          {t.page_no ? ` (Page ${t.page_no})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Live Sync Preview Banner */}
              {liveSyncNotice && (
                <div className="rojmed-sync-preview-banner">
                  <span>{liveSyncNotice}</span>
                </div>
              )}

              {/* Amount & Date */}
              <div className="entry-inputs-grid">
                <div className="form-group">
                  <label className="form-label">રકમ / Amount (₹) *</label>
                  <div className="input-with-icon">
                    <span className="field-icon rupee-icon">₹</span>
                    <input
                      ref={amountInputRef}
                      type="number"
                      className="form-input amount-input"
                      placeholder="e.g. 5000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          particularsInputRef.current?.focus();
                        }
                      }}
                      min="1"
                      step="any"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">તારીખ (Date) *</label>
                  <input
                    type="date"
                    className="form-input date-input"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Particulars & Optional Notes */}
              <div className="form-group">
                <label className="form-label">
                  વિગત / Particulars {sourceType === 'general' ? '*' : '(Auto-filled / Editable)'}
                </label>
                <input
                  ref={particularsInputRef}
                  type="text"
                  className="form-input"
                  placeholder={
                    sourceType === 'general'
                      ? 'દા.ત. ચા - માવો, રિક્ષા-ભાડુ, પાર્સલ...'
                      : 'વિગત લખો અથવા Auto રહેવા દો'
                  }
                  value={particulars}
                  onChange={(e) => {
                    setParticulars(e.target.value);
                    setIsAutoParticulars(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      notesInputRef.current?.focus();
                    }
                  }}
                  required={sourceType === 'general'}
                />
              </div>

              <div className="form-group">
                <label className="form-label">વધારાની નોંધ / Notes (Optional)</label>
                <input
                  ref={notesInputRef}
                  type="text"
                  className="form-input"
                  placeholder="ખાતામાં દેખાડવા માટે કોઈ ખાસ નોંધ હોય તો લખો..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="entry-form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowEntryModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn ${entryType === 'aavak' ? 'btn-save-salary' : 'btn-save-upad'}`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : editingEntry ? 'Update Entry' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 2: SET / EDIT OPENING SILAK
          ======================================================== */}
      {showOpeningModal && (
        <div className="modal-backdrop" style={{ zIndex: 10000 }} onClick={() => setShowOpeningModal(false)}>
          <div
            className="android-dialog luxury-dialog"
            style={{ maxWidth: '430px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 0.4rem', color: '#0f172a' }}>💰 ઓપનિંગ સિલક સેટ કરો</h3>
            <p style={{ margin: '0 0 0.9rem', fontSize: '0.82rem', color: '#64748b' }}>
              Date: <strong>{formatDisplayDate(selectedDate)}</strong> ({selectedDate})
            </p>

            <form onSubmit={handleSaveOpeningSilak}>
              <div className="form-group">
                <label className="form-label">Opening Cash Silak (₹) *</label>
                <input
                  type="number"
                  className="form-input amount-input"
                  value={openingInput}
                  onChange={(e) => setOpeningInput(e.target.value)}
                  step="any"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Diary starting Silak"
                  value={openingNotesInput}
                  onChange={(e) => setOpeningNotesInput(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: '1rem' }}>
                {sheet.is_manual_opening && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ marginRight: 'auto', fontSize: '0.78rem' }}
                    onClick={handleRevertOpeningToAuto}
                    disabled={isSavingOpening}
                  >
                    🔄 Revert to Auto
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowOpeningModal(false)}
                  disabled={isSavingOpening}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSavingOpening}
                >
                  {isSavingOpening ? 'Saving...' : 'Save Silak'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL 3: DELETE ENTRY CONFIRMATION
          ======================================================== */}
      {deletingEntry && (
        <div className="modal-backdrop" style={{ zIndex: 10000 }} onClick={() => setDeletingEntry(null)}>
          <div className="android-dialog luxury-dialog" style={{ maxWidth: '410px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 0.5rem', color: '#0f172a' }}>Delete Rojmed Entry?</h3>
            <p style={{ color: '#64748b', fontSize: '0.86rem', margin: '0 0 1rem' }}>
              શું તમે <strong>"{deletingEntry.particulars}"</strong> ({formatRupee(deletingEntry.amount)}) એન્ટ્રી ડિલીટ કરવા માંગો છો?
              {deletingEntry.source_type !== 'general' && (
                <span style={{ display: 'block', marginTop: '0.45rem', color: '#b91c1c', fontWeight: 700 }}>
                  ⚠️ આ એન્ટ્રી સાથે જોડાયેલ {deletingEntry.source_type === 'worker' ? 'Worker Khata' : 'Truck Account'} માંથી પણ ડિલીટ થઈ જશે.
                </span>
              )}
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
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          OFF-SCREEN 720PX PRINTABLE A4 ROJMED SHEET FOR PDF EXPORT
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
        <div id="printableRojmedSheet" className="khata-pdf-vahi-paper">
          <div className="khata-pdf-notebook-header">
            <div>
              <div className="pdf-notebook-title">FAIZAN BODY WORKS — દૈનિક રોજમેળ (DAILY ROJMED)</div>
              <div className="pdf-notebook-meta">
                Date: <strong>{formatDisplayDate(selectedDate)}</strong> ({selectedDate})
              </div>
            </div>
            <div className="pdf-page-stamp-box">
              <div style={{ fontSize: '9px' }}>CLOSING સિલક</div>
              <div style={{ fontSize: '14px' }}>{formatRupee(sheet.closing_silak)}</div>
            </div>
          </div>

          <div className="khata-pdf-two-col-grid">
            {/* Left: આવક */}
            <div className="pdf-vahi-col-jama">
              <div className="pdf-col-hdr">
                <span>આવક (AAVAK)</span>
                <span>{sheet.aavak_entries.length + 1} rows</span>
              </div>
              <table className="pdf-vahi-table">
                <thead>
                  <tr>
                    <th style={{ width: '24px', textAlign: 'center' }}>#</th>
                    <th>વિગત (Particulars)</th>
                    <th style={{ width: '85px', textAlign: 'right' }}>રૂપિયા ₹</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="pdf-vahi-bf-tr">
                    <td style={{ textAlign: 'center' }}>—</td>
                    <td>સિલક (Opening Balance)</td>
                    <td style={{ textAlign: 'right' }}>{formatRupee(sheet.opening_silak)}</td>
                  </tr>
                  {sheet.aavak_entries.map((row, idx) => (
                    <tr key={row.id}>
                      <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                      <td>{row.particulars}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#15803d' }}>{formatRupee(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="pdf-col-footer">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '11px', color: '#166534' }}>
                  <span>કુલ આવક:</span>
                  <span>{formatRupee(sheet.total_aavak_with_opening)}</span>
                </div>
              </div>
            </div>

            {/* Right: જાવક */}
            <div className="pdf-vahi-col-udhar">
              <div className="pdf-col-hdr">
                <span>જાવક (JAVAK)</span>
                <span>{sheet.javak_entries.length} rows</span>
              </div>
              <table className="pdf-vahi-table">
                <thead>
                  <tr>
                    <th style={{ width: '24px', textAlign: 'center' }}>#</th>
                    <th>વિગત (Particulars)</th>
                    <th style={{ width: '85px', textAlign: 'right' }}>રૂપિયા ₹</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.javak_entries.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', padding: '14px', color: '#94a3b8' }}>
                        કોઈ જાવક નથી
                      </td>
                    </tr>
                  ) : (
                    sheet.javak_entries.map((row, idx) => (
                      <tr key={row.id}>
                        <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                        <td>{row.particulars}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#b45309' }}>{formatRupee(row.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div className="pdf-col-footer">
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '11px', color: '#92400e' }}>
                  <span>કુલ જાવક:</span>
                  <span>{formatRupee(sheet.total_javak)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Summary Strip matching handwritten diary */}
          <div
            style={{
              border: '1.5px solid #334155',
              borderRadius: '6px',
              padding: '8px 12px',
              background: '#f8fafc',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontWeight: 900,
              fontSize: '12px',
            }}
          >
            <span style={{ color: '#166534' }}>આવક: {formatRupee(sheet.total_aavak_with_opening)}</span>
            <span style={{ color: '#92400e' }}>જાવક: {formatRupee(sheet.total_javak)}</span>
            <span style={{ color: '#1e3a8a', fontSize: '14px', background: '#dbeafe', padding: '3px 10px', borderRadius: '6px' }}>
              સિલક = {formatRupee(sheet.closing_silak)}
            </span>
          </div>
        </div>
      </div>

      {/* Snackbar Toast */}
      <Snackbar
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar({ message: '', type: 'info' })}
      />
    </div>
  );
}

export default RojmedPage;
