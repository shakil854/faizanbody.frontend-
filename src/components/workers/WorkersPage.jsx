import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { workerService } from '../../services/workerService';
import { WorkerSearchBar } from './WorkerSearchBar';
import { WorkerCard } from './WorkerCard';
import { WorkerFormModal } from './WorkerFormModal';
import { WorkerDeleteModal } from './WorkerDeleteModal';
import { WorkerFab } from './WorkerFab';
import { Snackbar } from './Snackbar';
import { BottomNav } from '../common/BottomNav';
import { isLeavingSoon, getDaysUntil } from '../../utils/dateAlerts';

export function WorkersPage({ onBackToHome, onAlertCountChange }) {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null);
  const [deletingWorker, setDeletingWorker] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notification state
  const [snackbar, setSnackbar] = useState({ message: '', type: 'info' });

  const showSnackbar = (message, type = 'info') => {
    setSnackbar({ message, type });
  };

  const fetchWorkers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await workerService.getWorkers();
      if (response && response.data) {
        setWorkers(response.data);
      }
    } catch (err) {
      console.error('Error fetching workers:', err);
      showSnackbar('Failed to load workers from server', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  // Count workers leaving within 5 days
  const leavingSoonCount = useMemo(() => {
    return workers.filter((w) => isLeavingSoon(w.going_date)).length;
  }, [workers]);

  // Sync alert count with parent if provided
  useEffect(() => {
    if (onAlertCountChange) {
      onAlertCountChange(leavingSoonCount);
    }
  }, [leavingSoonCount, onAlertCountChange]);

  // Handle Save (Create or Update)
  const handleSaveWorker = async (formData) => {
    try {
      if (editingWorker) {
        const response = await workerService.updateWorker(editingWorker.id, formData);
        showSnackbar(`Worker "${formData.name}" updated successfully!`, 'success');
        setWorkers((prev) =>
          prev.map((w) => (w.id === editingWorker.id ? response.data : w))
        );
      } else {
        const response = await workerService.createWorker(formData);
        showSnackbar(`Worker "${formData.name}" added successfully!`, 'success');
        setWorkers((prev) => [response.data, ...prev]);
      }
      setIsFormOpen(false);
      setEditingWorker(null);
    } catch (err) {
      const msg = err.response?.data?.message || 'Error saving worker';
      showSnackbar(msg, 'error');
      throw err;
    }
  };

  // Handle Delete
  const handleConfirmDelete = async (workerId) => {
    try {
      setIsDeleting(true);
      await workerService.deleteWorker(workerId);
      setWorkers((prev) => prev.filter((w) => w.id !== workerId));
      showSnackbar('Worker removed from list', 'success');
      setDeletingWorker(null);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete worker';
      showSnackbar(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter and SORT workers:
  // Workers leaving within 5 days AUTOMATICALLY appear at the top!
  const sortedWorkers = useMemo(() => {
    let list = workers;
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      list = list.filter((w) => w.name?.toLowerCase().includes(query));
    }

    return [...list].sort((a, b) => {
      const aAlert = isLeavingSoon(a.going_date);
      const bAlert = isLeavingSoon(b.going_date);

      // 1. Leaving soon workers come first
      if (aAlert && !bAlert) return -1;
      if (!aAlert && bAlert) return 1;

      // 2. If both leaving soon, sort by earliest date (fewest days left first)
      if (aAlert && bAlert) {
        const diffA = getDaysUntil(a.going_date) ?? 999;
        const diffB = getDaysUntil(b.going_date) ?? 999;
        return diffA - diffB;
      }

      return 0;
    });
  }, [workers, searchQuery]);

  return (
    <div className="workers-page-shell">
      {/* Main Content Area */}
      <main className="android-body">
        {/* Only the Search Box */}
        <WorkerSearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Urgent Leaving Soon Red Alert Banner */}
        {leavingSoonCount > 0 && !searchQuery && (
          <div className="workers-leaving-alert-banner">
            <div className="alert-banner-left">
              <span className="alert-banner-icon-ring">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </span>
              <div className="alert-banner-text">
                <h4 className="alert-banner-title">
                  {leavingSoonCount} Worker{leavingSoonCount > 1 ? 's' : ''} Leaving Within 5 Days
                </h4>
                <p className="alert-banner-subtitle">
                  Urgent records prioritized at the top.
                </p>
              </div>
            </div>
            <span className="alert-count-pill">
              {leavingSoonCount} Alert{leavingSoonCount > 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Workers List Section */}
        <div className="workers-list-wrapper">
          {loading ? (
            /* Skeleton Loading State */
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
          ) : sortedWorkers.length === 0 ? (
            /* Empty State */
            <div className="empty-workers-state">
              <div className="empty-luxury-illustration">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="32" cy="32" r="30" fill="#f0f7ff" stroke="#e0e7ff" strokeWidth="1.5" />
                  <circle cx="32" cy="24" r="8" fill="#dbeafe" stroke="#2563eb" strokeWidth="2" />
                  <path d="M18 46c0-7.7 6.3-14 14-14s14 6.3 14 14" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="45" cy="45" r="7" fill="#2563eb" />
                  <path d="M45 42v6M42 45h6" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h3>No Workers Found</h3>
              <p>
                {searchQuery
                  ? `No worker matches "${searchQuery}". Try clearing search or check spelling.`
                  : 'Start adding workers to keep track of coming and going dates.'}
              </p>
              <button
                type="button"
                className="btn btn-primary btn-empty-cta"
                onClick={() => {
                  setSearchQuery('');
                  setEditingWorker(null);
                  setIsFormOpen(true);
                }}
              >
                + Add First Worker
              </button>
            </div>
          ) : (
            /* Worker Cards List */
            <div className="workers-grid">
              {sortedWorkers.map((worker) => (
                <WorkerCard
                  key={worker.id}
                  worker={worker}
                  onEdit={(w) => {
                    setEditingWorker(w);
                    setIsFormOpen(true);
                  }}
                  onDelete={(w) => {
                    setDeletingWorker(w);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* 3. Android Floating Action Button (FAB) */}
      <WorkerFab
        onAddNew={() => {
          setEditingWorker(null);
          setIsFormOpen(true);
        }}
      />

      {/* 4. Bottom App Navigation Bar with Red Alert count */}
      <BottomNav
        activeTab="workers"
        onTabChange={(tab) => {
          if (tab === 'home') onBackToHome();
        }}
        workerCount={workers.length}
        alertCount={leavingSoonCount}
      />

      {/* 5. Add / Edit Modal (Android Bottom Sheet) */}
      <WorkerFormModal
        isOpen={isFormOpen}
        initialData={editingWorker}
        onClose={() => {
          setIsFormOpen(false);
          setEditingWorker(null);
        }}
        onSave={handleSaveWorker}
      />

      {/* 6. Delete Confirmation Modal */}
      <WorkerDeleteModal
        isOpen={!!deletingWorker}
        worker={deletingWorker}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingWorker(null)}
      />

      {/* 7. Android Snackbar Toast */}
      <Snackbar
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar({ message: '', type: 'info' })}
      />
    </div>
  );
}

export default WorkersPage;
