import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { truckAccountService } from '../../services/truckAccountService';
import { TruckAccountCard } from './TruckAccountCard';
import { TruckAccountFormModal } from './TruckAccountFormModal';
import { Snackbar } from '../workers/Snackbar';
import { useAuth } from '../../context/AuthContext';

/**
 * Main Truck Account Page (ગાડી વાળા નું ખાતાવહી)
 * Dedicated ledger accounts for vehicle customers.
 * Each account represents one vehicle ledger page without monthly pagination.
 * STRICT RULE: No Account No.!
 */
export function TruckAccountPage({ onBackToHome, onNavigate }) {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('truck_accounts:create');
  const canEdit = hasPermission('truck_accounts:edit');
  const canDelete = hasPermission('truck_accounts:delete');
  const canKhata = hasPermission('truck_accounts:khata');
  const canPrint = hasPermission('truck_accounts:print');

  const [accounts, setAccounts] = useState(() => truckAccountService.getCachedAccounts());
  const [loading, setLoading] = useState(() => truckAccountService.getCachedAccounts().length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'due' | 'settled'

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [deletingAccount, setDeletingAccount] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Snackbar
  const [snackbar, setSnackbar] = useState({ message: '', type: 'info' });

  const showSnackbar = useCallback((message, type = 'info') => {
    setSnackbar({ message, type });
  }, []);

  const fetchAccounts = useCallback(async ({ force = false } = {}) => {
    try {
      const res = await truckAccountService.getAccounts({}, { forceRefresh: force });
      if (res && res.data) {
        setAccounts(res.data);
      }
    } catch (err) {
      console.error('Error fetching truck accounts:', err);
      showSnackbar('Failed to load truck accounts from server', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    const unsubscribe = truckAccountService.subscribe((list) => {
      setAccounts(list);
      setLoading(false);
    });
    fetchAccounts();
    return () => unsubscribe();
  }, [fetchAccounts]);

  // Overall Statistics
  const stats = useMemo(() => {
    const list = accounts || [];
    const totalAccs = list.length;
    const totalUdhar = list.reduce((sum, a) => sum + (Number(a.total_udhar) || 0), 0);
    const totalJama = list.reduce((sum, a) => sum + (Number(a.total_jama) || 0), 0);
    const totalDue = list.filter((a) => a.balance > 0).reduce((sum, a) => sum + a.balance, 0);
    const dueCount = list.filter((a) => a.balance > 0).length;
    return {
      totalAccs,
      totalUdhar,
      totalJama,
      totalDue,
      dueCount,
    };
  }, [accounts]);

  // Filtered & Sorted accounts
  const filteredAccounts = useMemo(() => {
    let list = accounts || [];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (a) =>
          (a.party_name && a.party_name.toLowerCase().includes(q)) ||
          (a.truck_no && a.truck_no.toLowerCase().includes(q)) ||
          (a.phone && a.phone.includes(q)) ||
          (a.address && a.address.toLowerCase().includes(q)) ||
          (a.page_no && String(a.page_no).includes(q))
      );
    }

    if (statusFilter === 'due') {
      list = list.filter((a) => (Number(a.balance) || 0) > 0);
    } else if (statusFilter === 'settled') {
      list = list.filter((a) => (Number(a.balance) || 0) <= 0);
    }

    return [...list].sort((a, b) => {
      // Sort by Page No if available, else by id
      if (a.page_no && b.page_no) return a.page_no - b.page_no;
      if (a.page_no && !b.page_no) return -1;
      if (!a.page_no && b.page_no) return 1;
      return b.id - a.id;
    });
  }, [accounts, searchQuery, statusFilter]);

  const handleSaveAccount = async (formData) => {
    try {
      if (editingAccount) {
        await truckAccountService.updateAccount(editingAccount.id, formData);
        showSnackbar(`Truck account "${formData.party_name}" updated!`, 'success');
      } else {
        await truckAccountService.createAccount(formData);
        showSnackbar(`New truck account "${formData.party_name}" created!`, 'success');
      }
      setIsFormOpen(false);
      setEditingAccount(null);
      fetchAccounts({ force: true });
    } catch (err) {
      showSnackbar(err.message || 'Error saving truck account', 'error');
      throw err;
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingAccount) return;
    try {
      setIsDeleting(true);
      await truckAccountService.deleteAccount(deletingAccount.id);
      showSnackbar(`Truck account "${deletingAccount.party_name}" deleted`, 'success');
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
      {/* Top Header Bar */}
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
              <span>🚛</span>
              <span>Truck Account</span>
            </h2>
            <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
              Vehicle Customer Khata (ગાડી વાળા નું ખાતાવહી)
            </p>
          </div>
        </div>

        {canCreate && (
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '0.45rem 0.95rem', fontSize: '0.82rem', fontWeight: 800, borderRadius: '20px' }}
            onClick={() => {
              setEditingAccount(null);
              setIsFormOpen(true);
            }}
          >
            ＋ New Account
          </button>
        )}
      </div>

      <main className="android-body" style={{ padding: '0.85rem 1rem 5rem' }}>
        {/* KPI Ribbon */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '0.65rem',
            marginBottom: '0.85rem',
          }}
        >
          <div style={{ background: '#ffffff', padding: '0.65rem 0.85rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', display: 'block' }}>TOTAL TRUCKS</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>{stats.totalAccs}</span>
          </div>

          {canKhata && (
            <>
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
            </>
          )}
        </div>

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
              placeholder="Search by party name, truck no., phone, or page no..."
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

        {/* Filter Chips (All, Pending Due, Settled) */}
        <div className="khata-period-chips-row" style={{ marginBottom: '0.85rem' }}>
          <button
            type="button"
            className={`khata-period-chip ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            📋 All Accounts ({accounts.length})
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
            <div className="empty-workers-state">
              <div className="empty-luxury-illustration">
                <span style={{ fontSize: '3rem' }}>🚛</span>
              </div>
              <h3>No Truck Accounts Found</h3>
              <p>
                {searchQuery
                  ? `No account matches "${searchQuery}". Try clearing search.`
                  : 'Start adding vehicle customer accounts to manage physical Five Star ledger pages.'}
              </p>
              {canCreate && (
                <button
                  type="button"
                  className="btn btn-primary btn-empty-cta"
                  onClick={() => {
                    setSearchQuery('');
                    setEditingAccount(null);
                    setIsFormOpen(true);
                  }}
                >
                  ＋ Add First Truck Account
                </button>
              )}
            </div>
          ) : (
            <div className="workers-grid">
              {filteredAccounts.map((acc) => (
                <TruckAccountCard
                  key={acc.id}
                  account={acc}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  canManageKhata={canKhata}
                  canPrint={canPrint}
                  onEdit={(item) => {
                    setEditingAccount(item);
                    setIsFormOpen(true);
                  }}
                  onDelete={(item) => setDeletingAccount(item)}
                  onAccountChanged={() => fetchAccounts({ force: true })}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Floating Action Button */}
      {canCreate && (
        <button
          type="button"
          className="worker-fab-btn"
          title="Add New Truck Account"
          onClick={() => {
            setEditingAccount(null);
            setIsFormOpen(true);
          }}
          style={{
            position: 'fixed',
            bottom: '5.5rem',
            right: '1.25rem',
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #0284c7, #0369a1)',
            color: '#ffffff',
            border: 'none',
            boxShadow: '0 4px 14px rgba(2, 132, 199, 0.45)',
            fontSize: '1.6rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 90,
          }}
        >
          ＋
        </button>
      )}

      {/* Form Modal (Create or Edit) */}
      <TruckAccountFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingAccount(null);
        }}
        onSave={handleSaveAccount}
        initialData={editingAccount}
      />

      {/* Delete Confirmation Modal */}
      {deletingAccount && (
        <div className="modal-backdrop-luxury animate-fade-in" style={{ zIndex: 1100 }}>
          <div className="modal-luxury-card animate-scale-up" style={{ maxWidth: '420px', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.5rem', color: '#0f172a' }}>Delete Truck Account?</h3>
            <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 1.25rem' }}>
              Are you sure you want to delete <strong>"{deletingAccount.party_name}"</strong> and all its Khata entries?
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
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
                {isDeleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snackbar Toast */}
      <Snackbar
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar({ message: '', type: 'info' })}
      />
    </div>
  );
}

export default TruckAccountPage;

