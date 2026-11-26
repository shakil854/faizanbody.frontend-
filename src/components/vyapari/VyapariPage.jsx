import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { vyapariService } from '../../services/vyapariService';
import { VyapariCard } from './VyapariCard';
import { VyapariFormModal } from './VyapariFormModal';
import { AccountReminderModal, getReminderStatus } from '../common/AccountReminderModal';
import { Snackbar } from '../workers/Snackbar';
import { useAuth } from '../../context/AuthContext';

/**
 * Main Vyapari Account Page (વેપારી ખાતાવહી)
 * Dedicated ledger accounts for merchants, traders, and suppliers.
 * Matches Truck Account functionality 100%, with Admin-only KPI summary + Eye Hide/Show toggle.
 */
export function VyapariPage({ onBackToHome, onNavigate }) {
  const { hasPermission, isAdmin } = useAuth();
  const canCreate = hasPermission('vyapari:create');
  const canEdit = hasPermission('vyapari:edit');
  const canDelete = hasPermission('vyapari:delete');
  const canKhata = hasPermission('vyapari:khata');
  const canPrint = hasPermission('vyapari:print');

  const [showStatsValues, setShowStatsValues] = useState(() => {
    const saved = localStorage.getItem('faizanbody_vyapari_stats_visible');
    return saved !== null ? saved === 'true' : true;
  });

  const [accounts, setAccounts] = useState(() => vyapariService.getCachedAccounts());
  const [loading, setLoading] = useState(() => vyapariService.getCachedAccounts().length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'due' | 'settled'

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [deletingAccount, setDeletingAccount] = useState(null);
  const [reminderAccount, setReminderAccount] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [snackbar, setSnackbar] = useState({ message: '', type: 'info' });

  const showSnackbar = useCallback((message, type = 'info') => {
    setSnackbar({ message, type });
  }, []);

  const fetchAccounts = useCallback(async ({ force = false } = {}) => {
    try {
      const res = await vyapariService.getAccounts({}, { forceRefresh: force });
      if (res && res.data) {
        setAccounts(res.data);
      }
    } catch (err) {
      console.error('Error fetching vyapari accounts:', err);
      showSnackbar('Failed to load vyapari accounts from server', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    const unsubscribe = vyapariService.subscribe((list) => {
      setAccounts(list);
      setLoading(false);
    });
    fetchAccounts();
    return () => unsubscribe();
  }, [fetchAccounts]);

  const stats = useMemo(() => {
    const list = accounts || [];
    const totalAccs = list.length;
    const totalUdhar = list.reduce((sum, a) => sum + (Number(a.total_udhar) || 0), 0);
    const totalJama = list.reduce((sum, a) => sum + (Number(a.total_jama) || 0), 0);
    const totalDue = list.filter((a) => a.balance > 0).reduce((sum, a) => sum + a.balance, 0);
    const dueCount = list.filter((a) => a.balance > 0).length;
    const reminderCount = list.filter((a) => Boolean(a.reminder_date)).length;
    const dueReminderAccounts = list.filter((a) => getReminderStatus(a.reminder_date).isDueOrOverdue);
    return {
      totalAccs,
      totalUdhar,
      totalJama,
      totalDue,
      dueCount,
      reminderCount,
      dueReminderAccounts,
    };
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    let list = accounts || [];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (a) =>
          (a.party_name && a.party_name.toLowerCase().includes(q)) ||
          (a.firm_name && a.firm_name.toLowerCase().includes(q)) ||
          (a.phone && a.phone.includes(q)) ||
          (a.address && a.address.toLowerCase().includes(q)) ||
          (a.page_no && String(a.page_no).includes(q))
      );
    }

    if (statusFilter === 'due') {
      list = list.filter((a) => (Number(a.balance) || 0) > 0);
    } else if (statusFilter === 'settled') {
      list = list.filter((a) => (Number(a.balance) || 0) <= 0);
    } else if (statusFilter === 'reminders') {
      list = list.filter((a) => Boolean(a.reminder_date));
    }

    return [...list].sort((a, b) => {
      if (statusFilter === 'reminders') {
        return String(a.reminder_date || '').localeCompare(String(b.reminder_date || ''));
      }
      if (a.page_no && b.page_no) return a.page_no - b.page_no;
      if (a.page_no && !b.page_no) return -1;
      if (!a.page_no && b.page_no) return 1;
      return b.id - a.id;
    });
  }, [accounts, searchQuery, statusFilter]);

  const handleSaveAccount = async (formData) => {
    try {
      if (editingAccount) {
        await vyapariService.updateAccount(editingAccount.id, formData);
        showSnackbar(`Vyapari account "${formData.party_name}" updated!`, 'success');
      } else {
        await vyapariService.createAccount(formData);
        showSnackbar(`New vyapari account "${formData.party_name}" created!`, 'success');
      }
      setIsFormOpen(false);
      setEditingAccount(null);
      fetchAccounts({ force: true });
    } catch (err) {
      showSnackbar(err.message || 'Error saving vyapari account', 'error');
      throw err;
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingAccount) return;
    try {
      setIsDeleting(true);
      await vyapariService.deleteAccount(deletingAccount.id);
      showSnackbar(`Vyapari account "${deletingAccount.party_name}" deleted`, 'success');
      setDeletingAccount(null);
      fetchAccounts({ force: true });
    } catch (err) {
      showSnackbar(err.message || 'Failed to delete account', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="workers-page-shell">
      <div className="orders-header-bar" style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '0.85rem 1rem' }}>
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
            <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span>🏪</span>
              <span>Vyapari Account</span>
            </h2>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
              Merchant / Supplier Khata (વેપારી ખાતાવહી)
            </p>
          </div>
        </div>

        {canCreate && (
          <button
            type="button"
            className="btn btn-primary"
            style={{
              padding: '0.45rem 0.95rem',
              fontSize: '0.82rem',
              fontWeight: 800,
              borderRadius: '20px',
              backgroundColor: '#0d9488',
              borderColor: '#0d9488',
            }}
            onClick={() => {
              setEditingAccount(null);
              setIsFormOpen(true);
            }}
          >
            ＋ New Vyapari
          </button>
        )}
      </div>

      <main className="android-body" style={{ padding: '0.85rem 1rem 5rem' }}>
        {/* KPI Ribbon (Strictly Admin Only with Seen/Hide Eye Icon Toggle) */}
        {isAdmin && (
          <div style={{ marginBottom: showStatsValues ? '0.85rem' : '0.45rem' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                marginBottom: showStatsValues ? '0.4rem' : '0',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowStatsValues((prev) => {
                    const next = !prev;
                    localStorage.setItem('faizanbody_vyapari_stats_visible', String(next));
                    return next;
                  });
                }}
                style={{
                  background: showStatsValues ? '#f8fafc' : '#eff6ff',
                  border: '1px solid',
                  borderColor: showStatsValues ? '#cbd5e1' : '#93c5fd',
                  color: showStatsValues ? '#475569' : '#1d4ed8',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
                title={showStatsValues ? 'Hide Summary' : 'Show Summary'}
                aria-label={showStatsValues ? 'Hide Summary' : 'Show Summary'}
              >
                {showStatsValues ? <Eye size={16} strokeWidth={2.2} /> : <EyeOff size={16} strokeWidth={2.2} />}
              </button>
            </div>

            {showStatsValues && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '0.65rem',
                }}
              >
                <div style={{ background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', display: 'block' }}>TOTAL VYAPARI</span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>{stats.totalAccs}</span>
                </div>

                <div style={{ background: '#fff7ed', padding: '0.65rem 0.85rem', borderRadius: '12px', border: '1px solid #fed7aa' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#c2410c', display: 'block' }}>TOTAL BILL (ઉધાર)</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#9a3412' }}>₹{stats.totalUdhar.toLocaleString('en-IN')}</span>
                </div>

                <div style={{ background: '#f0fdf4', padding: '0.65rem 0.85rem', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#15803d', display: 'block' }}>RECEIVED (જમા)</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#166534' }}>₹{stats.totalJama.toLocaleString('en-IN')}</span>
                </div>

                <div style={{ background: '#fef2f2', padding: '0.65rem 0.85rem', borderRadius: '12px', border: '1px solid #fecaca' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#b91c1c', display: 'block' }}>PENDING DUE (બાકી)</span>
                  <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#991b1b' }}>₹{stats.totalDue.toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Search Box */}
        <div style={{ marginBottom: '0.75rem' }}>
          <div className="search-input-wrapper">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="search-input-field"
              placeholder="Search by vyapari name, firm, phone, or page no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="btn-search-clear"
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Due Reminder Alert Banner (Today or Overdue) */}
        {stats.dueReminderAccounts.length > 0 && (
          <div
            onClick={() => setStatusFilter('reminders')}
            style={{
              marginBottom: '0.75rem',
              padding: '0.65rem 0.9rem',
              borderRadius: '12px',
              background: '#fef3c7',
              border: '1.5px solid #f59e0b',
              color: '#92400e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: 700,
            }}
          >
            <span>
              🔔 Payment Reminders Due ({stats.dueReminderAccounts.length}):{' '}
              {stats.dueReminderAccounts.slice(0, 2).map((a) => a.party_name).join(', ')}
              {stats.dueReminderAccounts.length > 2 ? ` +${stats.dueReminderAccounts.length - 2} more` : ''}
            </span>
            <span style={{ fontSize: '0.75rem', textDecoration: 'underline', whiteSpace: 'nowrap' }}>
              View →
            </span>
          </div>
        )}

        {/* Filter Chips */}
        <div className="khata-period-chips-row" style={{ marginBottom: '0.85rem' }}>
          <button
            type="button"
            className={`khata-period-chip ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            📋 All Vyaparis ({accounts.length})
          </button>
          {canKhata && (
            <>
              <button
                type="button"
                className={`khata-period-chip ${statusFilter === 'due' ? 'active' : ''}`}
                onClick={() => setStatusFilter('due')}
              >
                🔴 Pending Due ({stats.dueCount})
              </button>
              <button
                type="button"
                className={`khata-period-chip ${statusFilter === 'settled' ? 'active' : ''}`}
                onClick={() => setStatusFilter('settled')}
              >
                🟢 Settled (સરભર)
              </button>
              <button
                type="button"
                className={`khata-period-chip ${statusFilter === 'reminders' ? 'active' : ''}`}
                onClick={() => setStatusFilter('reminders')}
              >
                🔔 Reminders ({stats.reminderCount})
              </button>
            </>
          )}
        </div>

        {/* Accounts List */}
        <div className="workers-list-wrapper">
          {loading && accounts.length === 0 ? (
            <div className="workers-skeleton-grid">
              {[1, 2, 3].map((n) => (
                <div key={n} className="worker-card-skeleton">
                  <div className="skeleton-avatar"></div>
                  <div className="skeleton-lines">
                    <div className="skeleton-line line-title"></div>
                    <div className="skeleton-line line-sub"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="empty-state-box">
              <div className="empty-state-icon">🏪</div>
              <h3 className="empty-state-title">
                {searchQuery ? 'No matching vyapari accounts found' : 'No vyapari accounts created yet'}
              </h3>
              <p className="empty-state-sub">
                {searchQuery
                  ? 'Try adjusting your search query or clear the filters.'
                  : 'Create a dedicated Vyapari Ledger Account to manage Jama & Udhar like a physical Five Star notebook.'}
              </p>
              {!searchQuery && canCreate && (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ marginTop: '0.75rem', backgroundColor: '#0d9488', borderColor: '#0d9488' }}
                  onClick={() => {
                    setEditingAccount(null);
                    setIsFormOpen(true);
                  }}
                >
                  ＋ Add First Vyapari Account
                </button>
              )}
            </div>
          ) : (
            <div className="workers-grid">
              {filteredAccounts.map((acc) => (
                <VyapariCard
                  key={acc.id}
                  account={acc}
                  onEdit={(item) => {
                    setEditingAccount(item);
                    setIsFormOpen(true);
                  }}
                  onDelete={(item) => setDeletingAccount(item)}
                  onReminder={(item) => setReminderAccount(item)}
                  onAccountChanged={() => fetchAccounts({ force: true })}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  canManageKhata={canKhata}
                  canPrint={canPrint}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <VyapariFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingAccount(null);
        }}
        onSave={handleSaveAccount}
        initialData={editingAccount}
      />

      {deletingAccount && (
        <div className="modal-backdrop" onClick={() => setDeletingAccount(null)}>
          <div
            className="modal-card confirm-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            style={{ maxWidth: '400px' }}
          >
            <div className="confirm-icon-circle danger">🗑️</div>
            <h3 className="confirm-title">Delete Vyapari Account?</h3>
            <p className="confirm-desc">
              Are you sure you want to delete <strong>{deletingAccount.party_name}</strong> and all its Jama/Udhar entries? This cannot be undone.
            </p>
            <div className="confirm-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeletingAccount(null)}
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
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AccountReminderModal
        isOpen={Boolean(reminderAccount)}
        onClose={() => setReminderAccount(null)}
        account={reminderAccount}
        accentColor="#0d9488"
        onSave={async (id, payload) => {
          await vyapariService.setReminder(id, payload);
          showSnackbar(payload.reminder_date ? '🔔 Reminder saved!' : 'Reminder cleared', 'success');
          fetchAccounts({ force: true });
        }}
      />

      <Snackbar
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar({ message: '', type: 'info' })}
      />
    </div>
  );
}

export default VyapariPage;
