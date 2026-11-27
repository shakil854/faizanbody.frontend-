import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { upiRojmedService } from '../../services/upiRojmedService';
import { downloadPdfFile, sharePdfFile } from '../../utils/pdfGenerator';

const KHATA_TYPES = [
  { key: 'general', label: '📝 General' },
  { key: 'worker', label: '👷 Worker' },
  { key: 'truck_account', label: '🚛 Truck' },
  { key: 'vyapari_account', label: '🏪 Vyapari' },
];

function formatRupee(val) {
  const num = Number(val) || 0;
  return `₹${num.toLocaleString('en-IN')}`;
}

function shiftDate(dateStr, deltaDays) {
  const [y, m, d] = (dateStr || '').split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getTodayStr() {
  const dt = new Date();
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function UpiRojmedPanel({
  selectedDate,
  onDateChange,
  onNotify,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  canPrint = true,
}) {
  const todayStr = getTodayStr();
  const [upiView, setUpiView] = useState('daily'); // 'daily' | 'summary'
  const [selectedMonth, setSelectedMonth] = useState(() => todayStr.slice(0, 7));
  const [summaryData, setSummaryData] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [mobileTab, setMobileTab] = useState('both'); // 'both' | 'aavak' | 'javak'
  const [sheet, setSheet] = useState({
    date: selectedDate,
    opening_silak: 0,
    aavak_entries: [],
    javak_entries: [],
    total_aavak_entries: 0,
    total_aavak_with_opening: 0,
    total_javak: 0,
    closing_silak: 0,
    account_balances: [],
  });
  const [options, setOptions] = useState({
    workers: [],
    truck_accounts: [],
    vyapari_accounts: [],
  });
  const [loading, setLoading] = useState(true);

  // Add / Edit Entry Modal (matches Normal Rojmed)
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [entryType, setEntryType] = useState('aavak'); // 'aavak' | 'javak'
  const [fromType, setFromType] = useState('truck_account');
  const [fromId, setFromId] = useState('');
  const [toType, setToType] = useState('general');
  const [toId, setToId] = useState('');
  const [toMode, setToMode] = useState('khata'); // 'khata' (ચૂકવ્યા - add to Khata) | 'balance' (ખાલી UPI Balance રાખવા આપ્યા - no Khata)
  const [amount, setAmount] = useState('');
  const [entryDate, setEntryDate] = useState(selectedDate);
  const [particulars, setParticulars] = useState('');
  const [notes, setNotes] = useState('');
  const [savingEntry, setSavingEntry] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const loadAll = useCallback(async (dateVal = selectedDate) => {
    try {
      setLoading(true);
      const [sheetRes, optRes] = await Promise.all([
        upiRojmedService.getDailySheet(dateVal),
        upiRojmedService.getOptions(),
      ]);
      if (sheetRes && typeof sheetRes === 'object') {
        const fallbackEntries = Array.isArray(sheetRes.entries) ? sheetRes.entries : [];
        const aavakList = Array.isArray(sheetRes.aavak_entries)
          ? sheetRes.aavak_entries
          : fallbackEntries.filter((e) => e.entry_type !== 'javak');
        const javakList = Array.isArray(sheetRes.javak_entries)
          ? sheetRes.javak_entries
          : fallbackEntries.filter((e) => e.entry_type === 'javak');

        setSheet({
          date: sheetRes.date || dateVal,
          opening_silak: Number(sheetRes.opening_silak) || 0,
          aavak_entries: aavakList,
          javak_entries: javakList,
          total_aavak_entries: Number(sheetRes.total_aavak_entries) || 0,
          total_aavak_with_opening: Number(sheetRes.total_aavak_with_opening) || 0,
          total_javak: Number(sheetRes.total_javak) || 0,
          closing_silak: Number(sheetRes.closing_silak) || 0,
          account_balances: Array.isArray(sheetRes.account_balances) ? sheetRes.account_balances : [],
        });
      }
      if (optRes && typeof optRes === 'object') {
        setOptions({
          workers: Array.isArray(optRes.workers) ? optRes.workers : [],
          truck_accounts: Array.isArray(optRes.truck_accounts) ? optRes.truck_accounts : [],
          vyapari_accounts: Array.isArray(optRes.vyapari_accounts) ? optRes.vyapari_accounts : [],
        });
      }
    } catch (err) {
      if (onNotify) onNotify(err?.response?.data?.message || 'Failed to load UPI Rojmed', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, onNotify]);

  useEffect(() => {
    loadAll(selectedDate);
  }, [selectedDate, loadAll]);

  useEffect(() => {
    if (upiView !== 'summary') return;
    let cancelled = false;
    setSummaryLoading(true);
    upiRojmedService
      .getPeriodSummary({ month: selectedMonth })
      .then((res) => {
        if (!cancelled) setSummaryData(res);
      })
      .catch((err) => {
        if (!cancelled && onNotify) {
          onNotify(err?.response?.data?.message || 'Failed to load UPI summary', 'error');
        }
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [upiView, selectedMonth, onNotify]);

  const getOptionListForType = (type) => {
    if (type === 'truck_account') {
      return (options.truck_accounts || []).map((t) => ({
        id: t.id,
        label: `${t.party_name}${t.truck_no ? ` • ${t.truck_no}` : ''}`,
      }));
    }
    if (type === 'vyapari_account') {
      return (options.vyapari_accounts || []).map((v) => ({
        id: v.id,
        label: `${v.party_name}${v.firm_name ? ` (${v.firm_name})` : ''}`,
      }));
    }
    if (type === 'worker') {
      return (options.workers || []).map((w) => ({
        id: w.id,
        label: w.name,
      }));
    }
    return [];
  };

  const openEntryModal = (defaultType = 'aavak') => {
    setEditingEntry(null);
    setEntryType(defaultType);
    if (defaultType === 'aavak') {
      setFromType('truck_account');
      setFromId('');
      setToType('general');
      setToId('');
      setToMode('balance');
    } else {
      setFromType('general');
      setFromId('');
      setToType('vyapari_account');
      setToId('');
      setToMode('khata');
    }
    setAmount('');
    setEntryDate(selectedDate);
    setParticulars('');
    setNotes('');
    setShowEntryModal(true);
  };

  const openEditEntryModal = (row) => {
    setEditingEntry(row);
    setEntryType(row.entry_type || 'aavak');
    setFromType(row.from_type || 'general');
    setFromId(row.from_id ? String(row.from_id) : '');
    setToType(row.to_type || 'general');
    setToId(row.to_id ? String(row.to_id) : '');
    setToMode(row.to_mode || 'khata');
    setAmount(String(row.amount || ''));
    setEntryDate(row.date || selectedDate);
    setParticulars(row.particulars || '');
    setNotes(row.notes || '');
    setShowEntryModal(true);
  };

  const handleSaveEntry = async (e) => {
    e.preventDefault();
    const numAmt = Number(amount);
    if (!numAmt || numAmt <= 0) {
      if (onNotify) onNotify('Valid amount enter karo', 'error');
      return;
    }
    if (fromType !== 'general' && !fromId) {
      if (onNotify) onNotify('કોની પાસેથી આવ્યા તે પસંદ કરો', 'error');
      return;
    }
    if (toType !== 'general' && !toId) {
      if (onNotify) onNotify('કોના ખાતામાં પડ્યા / કોને આપ્યા તે પસંદ કરો', 'error');
      return;
    }

    const payload = {
      date: entryDate || selectedDate,
      entry_type: entryType,
      amount: numAmt,
      from_type: fromType,
      from_id: fromType === 'general' ? null : Number(fromId),
      to_type: toType,
      to_id: toType === 'general' ? null : Number(toId),
      to_mode: toType === 'general' ? 'balance' : toMode,
      particulars: particulars.trim(),
      notes: notes.trim(),
    };

    try {
      setSavingEntry(true);
      if (editingEntry) {
        await upiRojmedService.updateEntry(editingEntry.id, payload, editingEntry);
        if (onNotify) onNotify('✓ UPI Entry updated & Khata synced!', 'success');
      } else {
        await upiRojmedService.createEntry(payload);
        if (onNotify) onNotify('✓ UPI Entry saved & Khata updated!', 'success');
      }
      setShowEntryModal(false);
      setEditingEntry(null);
      await loadAll(selectedDate);
    } catch (err) {
      if (onNotify) onNotify(err?.response?.data?.message || 'Error saving UPI entry', 'error');
    } finally {
      setSavingEntry(false);
    }
  };

  const handleDeleteEntry = async (entry) => {
    if (!window.confirm('Delete this UPI entry? Linked Khata entry will also be removed.')) return;
    try {
      await upiRojmedService.deleteEntry(entry.id, entry);
      if (onNotify) onNotify('UPI entry deleted', 'success');
      await loadAll(selectedDate);
    } catch (err) {
      if (onNotify) onNotify(err?.response?.data?.message || 'Error deleting UPI entry', 'error');
    }
  };

  const handleShareWhatsAppText = () => {
    const aavakRows = sheet.aavak_entries || [];
    const javakRows = sheet.javak_entries || [];
    let text = `*FAIZAN BODY WORKS - UPI રોજમેળ*\n`;
    text += `📅 Date: *${selectedDate}*\n\n`;
    text += `💰 *ઓપનિંગ UPI સિલક:* ${formatRupee(sheet.opening_silak)}\n\n`;

    text += `📥 *UPI આવક (Aavak):*\n`;
    if (aavakRows.length === 0) {
      text += `• કોઈ આવક નથી\n`;
    } else {
      aavakRows.forEach((e, i) => {
        text += `${i + 1}. ${e.from_label} ➔ ${e.to_label} : *${formatRupee(e.amount)}*\n`;
      });
    }
    text += `*કુલ UPI આવક (સિલક સહિત): ${formatRupee(sheet.total_aavak_with_opening)}*\n\n`;

    text += `📤 *UPI જાવક (Javak):*\n`;
    if (javakRows.length === 0) {
      text += `• કોઈ જાવક નથી\n`;
    } else {
      javakRows.forEach((e, i) => {
        text += `${i + 1}. ${e.from_label} ➔ ${e.to_label} : *${formatRupee(e.amount)}*\n`;
      });
    }
    text += `*કુલ UPI જાવક: ${formatRupee(sheet.total_javak)}*\n\n`;
    text += `✅ *ક્લોઝિંગ UPI સિલક: ${formatRupee(sheet.closing_silak)}*`;

    if (Array.isArray(sheet.account_balances) && sheet.account_balances.length > 0) {
      text += `\n\n💳 *ખાતા મુજબ પડેલ UPI Balance:*\n`;
      sheet.account_balances.forEach((b) => {
        text += `• ${b.label}: ${formatRupee(b.balance)}\n`;
      });
    }

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleDownloadPdf = async () => {
    if (isGeneratingPdf) return;
    try {
      setIsGeneratingPdf(true);
      if (onNotify) onNotify('⏳ Generating UPI Rojmed PDF...', 'info');
      await new Promise((r) => setTimeout(r, 150));
      await downloadPdfFile({
        elementId: 'printableUpiRojmedSheet',
        fileName: `FaizanBody_UPI_Rojmed_${selectedDate}.pdf`,
      });
      if (onNotify) onNotify('✅ UPI Rojmed PDF downloaded!', 'success');
    } catch (err) {
      console.error('UPI Rojmed PDF error:', err);
      if (onNotify) onNotify('⚠️ Failed to generate PDF', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSharePdf = async () => {
    if (isGeneratingPdf) return;
    try {
      setIsGeneratingPdf(true);
      if (onNotify) onNotify('⏳ Preparing UPI Rojmed PDF...', 'info');
      await new Promise((r) => setTimeout(r, 150));
      await sharePdfFile({
        elementId: 'printableUpiRojmedSheet',
        fileName: `FaizanBody_UPI_Rojmed_${selectedDate}.pdf`,
      });
      if (onNotify) onNotify('✅ UPI Rojmed PDF ready!', 'success');
    } catch (err) {
      console.error('UPI Rojmed PDF share error:', err);
      if (onNotify) onNotify('⚠️ Failed to share PDF', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const aavakList = sheet.aavak_entries || [];
  const javakList = sheet.javak_entries || [];

  return (
    <>
      {/* UPI Daily Page vs UPI Monthly Summary Toggle */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
        <div className="rojmed-view-switch" style={{ background: '#e2e8f0', padding: '3px', borderRadius: '10px' }}>
          <button
            type="button"
            className={`rojmed-view-btn ${upiView === 'daily' ? 'active' : ''}`}
            onClick={() => setUpiView('daily')}
          >
            📖 UPI Daily Page
          </button>
          <button
            type="button"
            className={`rojmed-view-btn ${upiView === 'summary' ? 'active' : ''}`}
            onClick={() => setUpiView('summary')}
          >
            📅 UPI Summary
          </button>
        </div>
      </div>

      {upiView === 'summary' ? (
        <div className="rojmed-summary-shell">
          <div className="rojmed-date-nav-card" style={{ marginBottom: '0.85rem' }}>
            <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
              📅 મહિનો પસંદ કરો (Select Month):
            </span>
            <input
              type="month"
              className="rojmed-date-picker"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>

          {summaryLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
              ⏳ UPI મહિનાનો હિસાબ લોડ થઈ રહ્યો છે...
            </div>
          ) : summaryData ? (
            <>
              <div className="rojmed-kpi-grid" style={{ marginBottom: '0.85rem' }}>
                <div className="rojmed-kpi-card kpi-opening">
                  <span className="rojmed-kpi-lbl">મહિનાની UPI ઓપનિંગ સિલક</span>
                  <span className="rojmed-kpi-val">{formatRupee(summaryData.opening_silak)}</span>
                </div>
                <div className="rojmed-kpi-card kpi-aavak">
                  <span className="rojmed-kpi-lbl">કુલ UPI આવક</span>
                  <span className="rojmed-kpi-val">+ {formatRupee(summaryData.total_aavak)}</span>
                </div>
                <div className="rojmed-kpi-card kpi-javak">
                  <span className="rojmed-kpi-lbl">કુલ UPI જાવક</span>
                  <span className="rojmed-kpi-val">- {formatRupee(summaryData.total_javak)}</span>
                </div>
                <div className="rojmed-kpi-card kpi-closing">
                  <span className="rojmed-kpi-lbl">મહિનાની આખર UPI સિલક</span>
                  <span className="rojmed-kpi-val">{formatRupee(summaryData.closing_silak)}</span>
                </div>
              </div>

              <div className="khata-vahi-sheet-container">
                <div className="khata-vahi-header-strip">
                  <span className="vahi-worker-title">💳 દૈનિક UPI રોજમેળ લિસ્ટ ({summaryData.days?.length || 0} days)</span>
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
                            આ મહિનામાં કોઈ UPI રોજમેળ એન્ટ્રી નથી
                          </td>
                        </tr>
                      ) : (
                        summaryData.days.map((d) => (
                          <tr
                            key={d.date}
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              onDateChange(d.date);
                              setUpiView('daily');
                            }}
                          >
                            <td style={{ fontWeight: 700, color: '#0f172a' }}>{d.date}</td>
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
      ) : (
        <>
      {/* Date Navigation Strip (Exact Normal Rojmed Style) */}
      <div className="rojmed-date-nav-card">
        <button
          type="button"
          className="rojmed-date-arrow-btn"
          onClick={() => onDateChange(shiftDate(selectedDate, -1))}
        >
          ◀ Prev
        </button>

        <div className="rojmed-date-center">
          <input
            type="date"
            className="rojmed-date-picker"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
          />
          <span className="rojmed-date-readable">
            {selectedDate}
            {selectedDate === todayStr && <span className="rojmed-today-pill">Today</span>}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
          {selectedDate !== todayStr && (
            <button
              type="button"
              className="rojmed-today-jump-btn"
              onClick={() => onDateChange(todayStr)}
            >
              Today
            </button>
          )}
          <button
            type="button"
            className="rojmed-date-arrow-btn"
            onClick={() => onDateChange(shiftDate(selectedDate, 1))}
          >
            Next ▶
          </button>
        </div>
      </div>

      {/* KPI Strip (Exact Normal Rojmed Style, Separate UPI Silak) */}
      <div className="rojmed-kpi-strip">
        <div className="rojmed-kpi-card kpi-opening">
          <div className="rojmed-kpi-top">
            <span className="rojmed-kpi-lbl">UPI ઓપનિંગ સિલક</span>
          </div>
          <span className="rojmed-kpi-val">{formatRupee(sheet.opening_silak)}</span>
        </div>

        <div className="rojmed-kpi-card kpi-aavak">
          <span className="rojmed-kpi-lbl">+ UPI આવક (In)</span>
          <span className="rojmed-kpi-val text-aavak">{formatRupee(sheet.total_aavak_entries)}</span>
        </div>

        <div className="rojmed-kpi-card kpi-javak">
          <span className="rojmed-kpi-lbl">− UPI જાવક (Out)</span>
          <span className="rojmed-kpi-val text-javak">{formatRupee(sheet.total_javak)}</span>
        </div>

        <div className="rojmed-kpi-card kpi-closing">
          <span className="rojmed-kpi-lbl">UPI ક્લોઝિંગ સિલક</span>
          <span className="rojmed-kpi-val">{formatRupee(sheet.closing_silak)}</span>
        </div>
      </div>

      {/* Account-wise UPI Money Held ("કયા ખાતામાં કેટલા પૈસા પડ્યા છે") */}
      {Array.isArray(sheet.account_balances) && sheet.account_balances.length > 0 && (
        <div
          style={{
            marginBottom: '0.85rem',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '0.65rem 0.85rem',
          }}
        >
          <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#475569', marginBottom: '0.45rem' }}>
            💳 કયા ખાતામાં કેટલા UPI પડ્યા છે (Khata-wise UPI Balance):
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
            {sheet.account_balances.map((b) => (
              <span
                key={`${b.type}:${b.id}`}
                style={{
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '999px',
                  background: b.balance > 0 ? '#eff6ff' : '#fef2f2',
                  color: b.balance > 0 ? '#1d4ed8' : '#b91c1c',
                  border: `1px solid ${b.balance > 0 ? '#bfdbfe' : '#fecaca'}`,
                }}
              >
                {b.label}: <strong>{formatRupee(b.balance)}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons Row (Exact Normal Rojmed Bar + WhatsApp & PDF) */}
      {(canCreate || canPrint) && (
        <div className="khata-action-bar" style={{ marginBottom: '0.85rem' }}>
          {canCreate && (
            <>
              <button
                type="button"
                className="btn btn-add-entry-toggle btn-vahi-action-jama"
                onClick={() => openEntryModal('aavak')}
              >
                <span>＋ UPI આવક (Aavak)</span>
              </button>
              <button
                type="button"
                className="btn btn-add-entry-toggle btn-vahi-action-udhar"
                onClick={() => openEntryModal('javak')}
              >
                <span>＋ UPI જાવક (Javak)</span>
              </button>
            </>
          )}

          {canPrint && (
            <>
              <button
                type="button"
                className="btn btn-whatsapp-share"
                style={{ background: '#4f46e5', borderColor: '#4338ca' }}
                onClick={handleSharePdf}
                disabled={isGeneratingPdf}
                title="Share UPI Rojmed PDF"
              >
                <span>{isGeneratingPdf ? 'Wait...' : '📄 Share PDF'}</span>
              </button>
              <button
                type="button"
                className="btn btn-download-pdf-icon"
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                title="Download UPI Rojmed PDF"
              >
                <span>⬇️ PDF</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Mobile Tab Switch (Exact Normal Rojmed Classes) */}
      <div className="vahi-mobile-tabs">
        <button
          type="button"
          className={`vahi-mob-tab ${mobileTab === 'both' ? 'active' : ''}`}
          onClick={() => setMobileTab('both')}
        >
          બંને (Both)
        </button>
        <button
          type="button"
          className={`vahi-mob-tab tab-mob-jama ${mobileTab === 'aavak' ? 'active' : ''}`}
          onClick={() => setMobileTab('aavak')}
        >
          💰 આવક ({aavakList.length})
        </button>
        <button
          type="button"
          className={`vahi-mob-tab tab-mob-udhar ${mobileTab === 'javak' ? 'active' : ''}`}
          onClick={() => setMobileTab('javak')}
        >
          💸 જાવક ({javakList.length})
        </button>
      </div>

      {/* Exact Normal Rojmed Diary Sheet */}
      <div className="khata-vahi-sheet-container">
        <div className="khata-vahi-header-strip">
          <div className="vahi-header-left">
            <span className="vahi-worker-title">💳 UPI રોજમેળ (FAIZAN BODY WORKS)</span>
            <span className="vahi-ac-subtitle">
              Date: <strong>{selectedDate}</strong>
            </span>
          </div>
          <div className="vahi-page-stamp">
            <span className="vahi-page-stamp-lbl">UPI સિલક</span>
            <span className="vahi-page-stamp-num" style={{ fontSize: '0.88rem' }}>
              {formatRupee(sheet.closing_silak)}
            </span>
          </div>
        </div>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
            ⏳ UPI રોજમેળ લોડ થઈ રહ્યું છે...
          </div>
        ) : (
          <>
            <div className="khata-vahi-grid">
              {/* LEFT COLUMN: આવક (UPI Aavak) */}
              <div className={`khata-vahi-col col-jama ${mobileTab === 'javak' ? 'mobile-hidden' : ''}`}>
                <div className="vahi-col-top">
                  <div className="vahi-col-title-group">
                    <span className="vahi-col-heading">આવક (UPI Aavak / In)</span>
                    <span className="vahi-col-count-badge">{aavakList.length} entries</span>
                  </div>
                  {canCreate && (
                    <button
                      type="button"
                      className="btn-vahi-add-entry"
                      onClick={() => openEntryModal('aavak')}
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
                      <tr className="vahi-bf-row">
                        <td style={{ textAlign: 'center' }}>
                          <span className="vahi-bf-badge">સિલક</span>
                        </td>
                        <td>
                          <div className="vahi-bf-desc">
                            <span className="vahi-bf-main-text">UPI સિલક (Opening Balance)</span>
                            <span className="vahi-bf-sub-text">Auto Carried Forward from Previous Day</span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }} className="vahi-bf-amount">
                          {formatRupee(sheet.opening_silak)}
                        </td>
                        {(canEdit || canDelete) && <td></td>}
                      </tr>

                      {aavakList.length === 0 ? (
                        <tr>
                          <td colSpan={canEdit || canDelete ? 4 : 3} className="vahi-empty-column-box">
                            આજે કોઈ UPI આવક નથી
                          </td>
                        </tr>
                      ) : (
                        aavakList.map((row, idx) => (
                          <tr key={`a-${row.id}`}>
                            <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 700 }}>{idx + 1}</td>
                            <td>
                              <div className="vahi-particulars-cell">
                                <span className="vahi-part-text">
                                  {row.from_type !== 'general' ? row.from_label : row.particulars}
                                </span>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    width: 'fit-content',
                                    fontSize: '0.64rem',
                                    fontWeight: 800,
                                    padding: '1px 6px',
                                    borderRadius: '8px',
                                    background: '#dcfce7',
                                    color: '#166534',
                                    border: '1px solid #bbf7d0',
                                  }}
                                >
                                  From: {row.from_label} ➔ To: {row.to_label}
                                </span>
                                {(row.particulars || row.notes) && (
                                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                    {row.particulars}{row.notes ? ` • ${row.notes}` : ''}
                                  </span>
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
                                    onClick={() => handleDeleteEntry(row)}
                                    title="Delete Entry"
                                  >
                                    🗑️
                                  </button>
                                )}
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
                    <span>કુલ UPI આવક (સિલક સહિત):</span>
                    <span className="vahi-total-jama-val">{formatRupee(sheet.total_aavak_with_opening)}</span>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: જાવક (UPI Javak) */}
              <div className={`khata-vahi-col col-udhar ${mobileTab === 'aavak' ? 'mobile-hidden' : ''}`}>
                <div className="vahi-col-top">
                  <div className="vahi-col-title-group">
                    <span className="vahi-col-heading">જાવક (UPI Javak / Out)</span>
                    <span className="vahi-col-count-badge">{javakList.length} entries</span>
                  </div>
                  {canCreate && (
                    <button
                      type="button"
                      className="btn-vahi-add-entry udhar"
                      onClick={() => openEntryModal('javak')}
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
                      {javakList.length === 0 ? (
                        <tr>
                          <td colSpan={canEdit || canDelete ? 4 : 3} className="vahi-empty-column-box">
                            આજે કોઈ UPI જાવક નથી
                          </td>
                        </tr>
                      ) : (
                        javakList.map((row, idx) => (
                          <tr key={`j-${row.id}`}>
                            <td style={{ textAlign: 'center', color: '#64748b', fontWeight: 700 }}>{idx + 1}</td>
                            <td>
                              <div className="vahi-particulars-cell">
                                <span className="vahi-part-text">
                                  {row.to_type !== 'general' ? row.to_label : row.particulars}
                                </span>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    width: 'fit-content',
                                    fontSize: '0.64rem',
                                    fontWeight: 800,
                                    padding: '1px 6px',
                                    borderRadius: '8px',
                                    background: row.to_mode === 'balance' ? '#eff6ff' : '#fef3c7',
                                    color: row.to_mode === 'balance' ? '#1d4ed8' : '#92400e',
                                    border: `1px solid ${row.to_mode === 'balance' ? '#bfdbfe' : '#fde68a'}`,
                                  }}
                                >
                                  From: {row.from_label} ➔ To: {row.to_label}
                                  {row.to_mode === 'balance' ? ' (UPI Balance)' : ''}
                                </span>
                                {(row.particulars || row.notes) && (
                                  <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                                    {row.particulars}{row.notes ? ` • ${row.notes}` : ''}
                                  </span>
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
                                    onClick={() => handleDeleteEntry(row)}
                                    title="Delete Entry"
                                  >
                                    🗑️
                                  </button>
                                )}
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
                    <span>કુલ UPI જાવક (Total Javak):</span>
                    <span className="vahi-total-udhar-val">{formatRupee(sheet.total_javak)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Diary Summary Strip */}
            <div className="rojmed-bottom-summary-box">
              <div className="rojmed-bottom-compare-row">
                <div className="rojmed-bottom-col">
                  <span className="rojmed-bottom-lbl">UPI આવક (Total Aavak)</span>
                  <span className="rojmed-bottom-amt text-aavak">{formatRupee(sheet.total_aavak_with_opening)}</span>
                </div>
                <div className="rojmed-bottom-divider">−</div>
                <div className="rojmed-bottom-col">
                  <span className="rojmed-bottom-lbl">UPI જાવક (Total Javak)</span>
                  <span className="rojmed-bottom-amt text-javak">{formatRupee(sheet.total_javak)}</span>
                </div>
              </div>

              <div className="rojmed-closing-banner">
                <span className="rojmed-closing-title">UPI સિલક (Closing Balance) =</span>
                <span className="rojmed-closing-value">{formatRupee(sheet.closing_silak)}</span>
              </div>
            </div>
          </>
        )}
      </div>
        </>
      )}

      {/* Add / Edit UPI Entry Modal (Exact Normal Rojmed Bottom Sheet) */}
      {showEntryModal &&
        createPortal(
          <div className="modal-backdrop" style={{ zIndex: 10000 }} onClick={() => !savingEntry && setShowEntryModal(false)}>
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
                  {editingEntry
                    ? '✏️ UPI એન્ટ્રી સુધારો (Edit Entry)'
                    : entryType === 'aavak'
                      ? '💳 નવી UPI આવક (New Entry)'
                      : '💸 નવી UPI જાવક (New Entry)'}
                </h3>
                <button
                  type="button"
                  className="sheet-close-btn"
                  onClick={() => {
                    if (!savingEntry) {
                      setShowEntryModal(false);
                      setEditingEntry(null);
                    }
                  }}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveEntry} className="khata-entry-form">
                <div className="entry-type-selector" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '0.75rem' }}>
                  <button
                    type="button"
                    className={`entry-type-tab tab-salary ${entryType === 'aavak' ? 'active' : ''}`}
                    onClick={() => setEntryType('aavak')}
                  >
                    💰 આવક (Aavak - આવ્યા)
                  </button>
                  <button
                    type="button"
                    className={`entry-type-tab tab-upad ${entryType === 'javak' ? 'active' : ''}`}
                    onClick={() => setEntryType('javak')}
                  >
                    💸 જાવક (Javak - ગયા)
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">રકમ / Amount (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      className="form-input"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">તારીખ / Date *</label>
                    <input
                      type="date"
                      className="form-input"
                      value={entryDate}
                      onChange={(e) => setEntryDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* FROM */}
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '0.7rem' }}>
                  <label className="form-label" style={{ color: '#166534', fontWeight: 800, fontSize: '0.8rem' }}>
                    1. કોની પાસેથી આવ્યા / કયા ખાતામાંથી (From) *
                  </label>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.45rem' }}>
                    {KHATA_TYPES.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => {
                          setFromType(t.key);
                          setFromId('');
                        }}
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '4px 8px',
                          borderRadius: '999px',
                          border: `1px solid ${fromType === t.key ? '#16a34a' : '#cbd5e1'}`,
                          background: fromType === t.key ? '#16a34a' : '#ffffff',
                          color: fromType === t.key ? '#ffffff' : '#334155',
                          cursor: 'pointer',
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  {fromType !== 'general' && (
                    <select
                      className="form-input"
                      value={fromId}
                      onChange={(e) => setFromId(e.target.value)}
                      required
                    >
                      <option value="">-- Select Account --</option>
                      {getOptionListForType(fromType).map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* TO */}
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '0.7rem' }}>
                  <label className="form-label" style={{ color: '#1e40af', fontWeight: 800, fontSize: '0.8rem' }}>
                    2. કોના ખાતામાં પડ્યા / કોને આપ્યા (To) *
                  </label>
                  <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.45rem' }}>
                    {KHATA_TYPES.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => {
                          setToType(t.key);
                          setToId('');
                        }}
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '4px 8px',
                          borderRadius: '999px',
                          border: `1px solid ${toType === t.key ? '#2563eb' : '#cbd5e1'}`,
                          background: toType === t.key ? '#2563eb' : '#ffffff',
                          color: toType === t.key ? '#ffffff' : '#334155',
                          cursor: 'pointer',
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  {toType !== 'general' && (
                    <>
                      <select
                        className="form-input"
                        value={toId}
                        onChange={(e) => setToId(e.target.value)}
                        required
                      >
                        <option value="">-- Select Account --</option>
                        {getOptionListForType(toType).map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.label}
                          </option>
                        ))}
                      </select>

                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => setToMode('khata')}
                          style={{
                            flex: 1,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '6px 8px',
                            borderRadius: '8px',
                            border: `1.5px solid ${toMode === 'khata' ? '#d97706' : '#cbd5e1'}`,
                            background: toMode === 'khata' ? '#fef3c7' : '#ffffff',
                            color: toMode === 'khata' ? '#92400e' : '#475569',
                            cursor: 'pointer',
                          }}
                        >
                          📒 ખાતામાં પાડો (Add to Khata)
                        </button>
                        <button
                          type="button"
                          onClick={() => setToMode('balance')}
                          style={{
                            flex: 1,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '6px 8px',
                            borderRadius: '8px',
                            border: `1.5px solid ${toMode === 'balance' ? '#2563eb' : '#cbd5e1'}`,
                            background: toMode === 'balance' ? '#dbeafe' : '#ffffff',
                            color: toMode === 'balance' ? '#1e40af' : '#475569',
                            cursor: 'pointer',
                          }}
                        >
                          💳 ખાલી UPI Balance રાખ્યા (No Khata)
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">વિગત / Particulars (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Auto-filled if blank"
                    value={particulars}
                    onChange={(e) => setParticulars(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">નોંધ / Notes (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="UTR / Reference note..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="entry-form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowEntryModal(false);
                      setEditingEntry(null);
                    }}
                    disabled={savingEntry}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`btn ${entryType === 'aavak' ? 'btn-save-salary' : 'btn-save-upad'}`}
                    disabled={savingEntry}
                  >
                    {savingEntry ? 'Saving...' : editingEntry ? 'Update UPI Entry' : 'Save UPI Entry'}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* Off-Screen 720px Printable A4 Sheet for UPI Rojmed PDF */}
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
        <div id="printableUpiRojmedSheet" className="khata-pdf-vahi-paper">
          <div className="khata-pdf-notebook-header">
            <div>
              <div className="pdf-notebook-title">FAIZAN BODY WORKS — 💳 UPI રોજમેળ (UPI ROJMED)</div>
              <div className="pdf-notebook-meta">
                Date: <strong>{selectedDate}</strong>
              </div>
            </div>
            <div className="pdf-page-stamp-box">
              <div style={{ fontSize: '9px' }}>CLOSING UPI સિલક</div>
              <div style={{ fontSize: '14px' }}>{formatRupee(sheet.closing_silak)}</div>
            </div>
          </div>

          <div className="khata-pdf-two-col-grid">
            <div className="pdf-vahi-col-jama">
              <div className="pdf-col-hdr">
                <span>UPI આવક (Aavak)</span>
                <span>{aavakList.length}</span>
              </div>
              <table className="pdf-vahi-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>વિગત (From ➔ To)</th>
                    <th style={{ textAlign: 'right' }}>રકમ (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>0</td>
                    <td><strong>ઓપનિંગ UPI સિલક</strong></td>
                    <td style={{ textAlign: 'right' }}><strong>{formatRupee(sheet.opening_silak)}</strong></td>
                  </tr>
                  {aavakList.map((r, i) => (
                    <tr key={`pa-${r.id}`}>
                      <td>{i + 1}</td>
                      <td>
                        <div><strong>{r.from_label}</strong> ➔ {r.to_label}</div>
                        {r.particulars && <div style={{ fontSize: '9px', color: '#475569' }}>{r.particulars}</div>}
                      </td>
                      <td style={{ textAlign: 'right' }}>{formatRupee(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}><strong>કુલ UPI આવક (સિલક સહિત)</strong></td>
                    <td style={{ textAlign: 'right' }}><strong>{formatRupee(sheet.total_aavak_with_opening)}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="pdf-vahi-col-udhar">
              <div className="pdf-col-hdr">
                <span>UPI જાવક (Javak)</span>
                <span>{javakList.length}</span>
              </div>
              <table className="pdf-vahi-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>વિગત (From ➔ To)</th>
                    <th style={{ textAlign: 'right' }}>રકમ (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {javakList.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', color: '#64748b' }}>કોઈ જાવક નથી</td>
                    </tr>
                  ) : (
                    javakList.map((r, i) => (
                      <tr key={`pj-${r.id}`}>
                        <td>{i + 1}</td>
                        <td>
                          <div>{r.from_label} ➔ <strong>{r.to_label}</strong></div>
                          {r.particulars && <div style={{ fontSize: '9px', color: '#475569' }}>{r.particulars}</div>}
                        </td>
                        <td style={{ textAlign: 'right' }}>{formatRupee(r.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2}><strong>કુલ UPI જાવક</strong></td>
                    <td style={{ textAlign: 'right' }}><strong>{formatRupee(sheet.total_javak)}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div style={{ marginTop: '12px', padding: '10px 14px', border: '1.5px solid #0f172a', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
            <span>UPI આવક: {formatRupee(sheet.total_aavak_with_opening)} − UPI જાવક: {formatRupee(sheet.total_javak)}</span>
            <span>ક્લોઝિંગ UPI સિલક = {formatRupee(sheet.closing_silak)}</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default UpiRojmedPanel;
