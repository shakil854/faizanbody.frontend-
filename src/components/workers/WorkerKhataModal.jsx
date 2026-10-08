import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { workerService } from '../../services/workerService';

export function WorkerKhataModal({ isOpen, onClose, worker, canManage = true }) {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({
    total_salary: 0,
    total_upad: 0,
    total_paid: 0,
    balance: 0,
  });

  // Add Entry Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [entryType, setEntryType] = useState('upad'); // 'upad', 'payment', 'salary'
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

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
    }
  }, [isOpen, worker?.id, fetchKhata]);

  // Filtered transactions (HOOK MUST BE BEFORE ANY EARLY RETURN)
  const filteredTransactions = useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    if (filterType === 'all') return transactions;
    return transactions.filter((t) => t && t.type === filterType);
  }, [transactions, filterType]);

  // Guaranteed safe summary numbers (HOOK MUST BE BEFORE ANY EARLY RETURN)
  const safeSummary = useMemo(() => ({
    total_salary: Number(summary?.total_salary) || 0,
    total_upad: Number(summary?.total_upad) || 0,
    total_paid: Number(summary?.total_paid) || 0,
    balance: Number(summary?.balance) || 0,
  }), [summary]);

  const balanceColorClass = safeSummary.balance > 0
    ? 'balance-due-pay'
    : safeSummary.balance < 0
    ? 'balance-advance-due'
    : 'balance-settled';

  // Return early ONLY AFTER all hooks have executed
  if (!isOpen || !worker) return null;

  // Handle Save New Entry
  const handleSaveEntry = async (e) => {
    e.preventDefault();
    setFormError('');

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setFormError('कृपया सही राशि (रुपये) दर्ज करें');
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
      const msg = err.response?.data?.message || err.message || 'एंट्री सेव करने में समस्या आई';
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

  // Share formatted Hisab Slip on WhatsApp
  const handleShareWhatsApp = () => {
    const cleanPhone = worker.mobile ? String(worker.mobile).replace(/[^0-9]/g, '') : '';
    const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const todayDate = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    let balanceStatus = 'हिसाब बराबर';
    if (safeSummary.balance > 0) {
      balanceStatus = `देना बनता है (Due to Pay: ₹${safeSummary.balance.toLocaleString('en-IN')})`;
    } else if (safeSummary.balance < 0) {
      balanceStatus = `उपाड़ बाकी है (Advance Due: ₹${Math.abs(safeSummary.balance).toLocaleString('en-IN')})`;
    }

    const message = 
`*🚚 फैज़ान बॉडी वर्क्स - हिसाब पर्ची*
👤 *कारीगर/वर्कर:* ${worker.name || ''}
📅 *दिनांक:* ${todayDate}
----------------------------------
💰 *कुल बनता है (मजदूरी/पगार):* ₹${safeSummary.total_salary.toLocaleString('en-IN')}
⚡ *कुल उपाड़ (एडवांस लिया):* ₹${safeSummary.total_upad.toLocaleString('en-IN')}
💳 *कुल पेमेंट दिया:* ₹${safeSummary.total_paid.toLocaleString('en-IN')}
----------------------------------
⚖️ *बाकी हिसाब:* ₹${Math.abs(safeSummary.balance).toLocaleString('en-IN')}
👉 *स्थिति:* *${balanceStatus}*
----------------------------------
_धन्यवाद! फैज़ान बॉडी वर्क्स_`;

    const encodedMsg = encodeURIComponent(message);
    const waNativeUrl = waPhone
      ? `whatsapp://send?phone=${waPhone}&text=${encodedMsg}`
      : `whatsapp://send?text=${encodedMsg}`;
    const waWebUrl = waPhone
      ? `https://wa.me/${waPhone}?text=${encodedMsg}`
      : `https://api.whatsapp.com/send?text=${encodedMsg}`;

    try {
      window.location.href = waNativeUrl;
      setTimeout(() => {
        if (!document.hidden) {
          window.open(waWebUrl, '_blank');
        }
      }, 500);
    } catch {
      window.open(waWebUrl, '_blank');
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
                <h3 className="sheet-title">{worker.name} का खाता</h3>
                <p className="sheet-subtitle">
                  {worker.mobile ? `मो: ${worker.mobile} • ` : ''}खाता हिसाब बही
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

          {/* 4 Summary KPIs Grid */}
          <div className="khata-kpi-grid">
            {/* Card 1: Total Salary / Earned */}
            <div className="khata-kpi-card card-salary">
              <span className="kpi-label">कुल पेमेंट बनता है</span>
              <span className="kpi-amount">₹{safeSummary.total_salary.toLocaleString('en-IN')}</span>
              <span className="kpi-tag">काम का कुल हिसाब</span>
            </div>

            {/* Card 2: Total Upaad (Advance) */}
            <div className="khata-kpi-card card-upad">
              <span className="kpi-label">उपाड़ लिया</span>
              <span className="kpi-amount">₹{safeSummary.total_upad.toLocaleString('en-IN')}</span>
              <span className="kpi-tag">एडवांस / खर्चा</span>
            </div>

            {/* Card 3: Total Paid */}
            <div className="khata-kpi-card card-payment">
              <span className="kpi-label">पेमेंट दिया</span>
              <span className="kpi-amount">₹{safeSummary.total_paid.toLocaleString('en-IN')}</span>
              <span className="kpi-tag">चुकाया हुआ पेमेंट</span>
            </div>

            {/* Card 4: Net Balance */}
            <div className={`khata-kpi-card card-balance ${balanceColorClass}`}>
              <span className="kpi-label">बाकी हिसाब</span>
              <span className="kpi-amount">₹{Math.abs(safeSummary.balance).toLocaleString('en-IN')}</span>
              <span className="kpi-tag">
                {safeSummary.balance > 0 ? 'देना बनता है' : safeSummary.balance < 0 ? 'उपाड़ ज्यादा है' : 'हिसाब बराबर'}
              </span>
            </div>
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
                    फॉर्म बंद करें
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    + नई एंट्री जोड़ें
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              className="btn btn-whatsapp-share"
              onClick={handleShareWhatsApp}
              title="Share Hisab summary on WhatsApp"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              WhatsApp पर भेजें
            </button>
          </div>

          {/* Expandable Add Entry Form */}
          {showAddForm && (
            <div className="khata-add-entry-box">
              <h4 className="entry-box-title">नया लेन-देन दर्ज करें</h4>

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
                    💰 कुल पेमेंट (Total Banta)
                  </button>
                  <button
                    type="button"
                    className={`entry-type-tab tab-upad ${entryType === 'upad' ? 'active' : ''}`}
                    onClick={() => setEntryType('upad')}
                  >
                    ⚡ उपाड़ (Upad)
                  </button>
                  <button
                    type="button"
                    className={`entry-type-tab tab-payment ${entryType === 'payment' ? 'active' : ''}`}
                    onClick={() => setEntryType('payment')}
                  >
                    💳 पेमेंट दिया (Payment Diya)
                  </button>
                </div>

                {/* Amount & Date Grid */}
                <div className="entry-inputs-grid">
                  <div className="form-group">
                    <label className="form-label">राशि (रुपये ₹) *</label>
                    <div className="input-with-icon">
                      <span className="field-icon rupee-icon">₹</span>
                      <input
                        type="number"
                        className="form-input amount-input"
                        placeholder="e.g. 1500"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        autoFocus
                        required
                        min="1"
                        step="any"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">तारीख *</label>
                    <input
                      type="date"
                      className="form-input date-input"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Notes & Mode Grid */}
                <div className="entry-inputs-grid">
                  <div className="form-group">
                    <label className="form-label">विवरण / नोट (वैकल्पिक)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. राशन खर्चा / बॉडी काम पगार / कैश दिया"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">माध्यम</label>
                    <select
                      className="form-input select-mode"
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                    >
                      <option value="Cash">रोकड़ा (Cash)</option>
                      <option value="Online/UPI">Online / PhonePe / GPay</option>
                      <option value="Bank">बैंक ट्रांसफर (NEFT/RTGS)</option>
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
                    रद्द करें
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'सेव हो रहा है...' : 'एंट्री सेव करें'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* History Filters & Section Title */}
          <div className="khata-history-header">
            <h4 className="history-title">लेन-देन इतिहास ({filteredTransactions.length})</h4>

            <div className="khata-filter-chips">
              <button
                type="button"
                className={`filter-chip ${filterType === 'all' ? 'active' : ''}`}
                onClick={() => setFilterType('all')}
              >
                सभी
              </button>
              <button
                type="button"
                className={`filter-chip chip-salary ${filterType === 'salary' ? 'active' : ''}`}
                onClick={() => setFilterType('salary')}
              >
                कुल पेमेंट
              </button>
              <button
                type="button"
                className={`filter-chip chip-upad ${filterType === 'upad' ? 'active' : ''}`}
                onClick={() => setFilterType('upad')}
              >
                उपाड़
              </button>
              <button
                type="button"
                className={`filter-chip chip-payment ${filterType === 'payment' ? 'active' : ''}`}
                onClick={() => setFilterType('payment')}
              >
                पेमेंट दिया
              </button>
            </div>
          </div>

          {/* Transaction History List */}
          <div className="khata-history-list">
            {loading ? (
              <div className="khata-loading-spinner">
                <span className="spinner-dots">हिसाब लोड हो रहा है...</span>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="empty-workers-state khata-empty-state">
                <div className="empty-luxury-illustration">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <line x1="2" y1="10" x2="22" y2="10" />
                  </svg>
                </div>
                <h3>कोई लेन-देन नहीं मिला</h3>
                <p>
                  {filterType !== 'all'
                    ? `इस फ़िल्टर में कोई एंट्री नहीं है।`
                    : 'इस वर्कर का अभी कोई उपाड़ या पेमेंट रिकॉर्ड नहीं है। नया हिसाब जोड़ने के लिए ऊपर बटन दबाएँ।'}
                </p>
                {canManage && filterType === 'all' && (
                  <button
                    type="button"
                    className="btn btn-primary btn-empty-cta"
                    onClick={() => setShowAddForm(true)}
                  >
                    + पहली एंट्री जोड़ें
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
                            {isSalary ? '💰 कुल पेमेंट बनता' : isUpad ? '⚡ उपाड़ (Upad)' : '💳 पेमेंट दिया (Payment Diya)'}
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
                          title="एंट्री डिलीट करें"
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
            <h3 className="dialog-title">एंट्री डिलीट करें?</h3>
            <p className="dialog-message">
              क्या आप वाकई ₹{(Number(deletingTx?.amount) || 0).toLocaleString('en-IN')} की यह लेन-देन एंट्री डिलीट करना चाहते हैं? हिसाब में यह राशि दोबारा एडजस्ट हो जाएगी।
            </p>
            <div className="dialog-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeletingTx(null)}
                disabled={isDeleting}
              >
                रद्द करें
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'हटाया जा रहा है...' : 'हाँ, डिलीट करें'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default WorkerKhataModal;
