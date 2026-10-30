import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { orderService } from '../../services/orderService';
import { calculateOrderProgress } from './orderConstants';
import { OrderCard } from './OrderCard';
import { OrderFormModal } from './OrderFormModal';
import { OrderJobSheetModal } from './OrderJobSheetModal';
import { OrderDeleteModal } from './OrderDeleteModal';
import { OrderPhotosModal } from './OrderPhotosModal';
import { OrderBadgeSettingsModal } from './OrderBadgeSettingsModal';
import { OrderDropdownOptionsModal } from './OrderDropdownOptionsModal';
import { OrderFab } from './OrderFab';
import { Snackbar } from '../workers/Snackbar';
import { useAuth } from '../../context/AuthContext';
import { getOrderBadgeSettings, getOrderBadgeColor } from '../../utils/orderBadgeSettings';

export function OrdersPage({ onBackToHome }) {
  const { isAdmin, hasPermission } = useAuth();

  // Instant SWR cache initialization
  const [orders, setOrders] = useState(() => orderService.getCachedOrders());
  const [loading, setLoading] = useState(() => orderService.getCachedOrders().length === 0);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState('view');
  const [editingOrder, setEditingOrder] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [deletingOrder, setDeletingOrder] = useState(null);
  const [photoModalOrder, setPhotoModalOrder] = useState(null);
  const [isBadgeSettingsOpen, setIsBadgeSettingsOpen] = useState(false);
  const [isDropdownOptionsOpen, setIsDropdownOptionsOpen] = useState(false);
  const [badgeSettings, setBadgeSettings] = useState(() => getOrderBadgeSettings());
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    orderService.getBadgeSettings().then((s) => {
      if (s) setBadgeSettings(s);
    }).catch(() => {});
    orderService.getDropdownOptions().catch(() => {});

    const handleSettingsUpdate = (e) => {
      if (e?.detail) {
        setBadgeSettings(e.detail);
      } else {
        setBadgeSettings(getOrderBadgeSettings());
      }
    };
    window.addEventListener('orderBadgeSettingsChanged', handleSettingsUpdate);
    return () => window.removeEventListener('orderBadgeSettingsChanged', handleSettingsUpdate);
  }, []);

  // Global Toast
  const [snackbar, setSnackbar] = useState({ message: '', type: 'info' });

  const showSnackbar = useCallback((message, type = 'info') => {
    setSnackbar({ message, type });
  }, []);

  // Fetch orders with SWR
  const fetchOrders = useCallback(
    async ({ force = false } = {}) => {
      if (orderService.getCachedOrders().length === 0) {
        setLoading(true);
      }
      try {
        const res = await orderService.getOrders({}, { forceRefresh: force });
        if (res && res.data) {
          setOrders(res.data);
        }
      } catch (err) {
        console.error('Error fetching orders:', err);
        showSnackbar('Failed to load work orders from server', 'error');
      } finally {
        setLoading(false);
      }
    },
    [showSnackbar]
  );

  // Subscribe to real-time SWR cache updates
  useEffect(() => {
    const unsubscribe = orderService.subscribe((updatedList) => {
      setOrders(updatedList);
      setLoading(false);
    });
    fetchOrders();
    return () => unsubscribe();
  }, [fetchOrders]);

  // Save order (Create or Update)
  const handleSaveOrder = async (formData) => {
    try {
      if (editingOrder) {
        await orderService.updateOrder(editingOrder.id, formData);
        showSnackbar(`Work order "${formData.order_no || formData.truck_chassis_no}" updated successfully!`, 'success');
      } else {
        await orderService.createOrder(formData);
        showSnackbar(`New work order "${formData.truck_chassis_no}" created successfully!`, 'success');
      }
      setIsFormOpen(false);
      setEditingOrder(null);
      fetchOrders({ force: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Error saving work order';
      showSnackbar(msg, 'error');
      throw err;
    }
  };

  // Toggle task done
  const handleToggleTask = async (section, itemKey, done, targetOrderId = null) => {
    const orderId = targetOrderId || editingOrder?.id || viewingOrder?.id;
    if (!orderId) return;
    try {
      const res = await orderService.toggleTaskDone(orderId, {
        section,
        itemKey,
        done,
      });
      if (res && res.data) {
        const updated = res.data;
        if (viewingOrder?.id === orderId) {
          setViewingOrder(updated);
        }
        if (editingOrder?.id === orderId) {
          setEditingOrder(updated);
        }
        setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
      }
      showSnackbar(done ? '✓ Task marked complete' : 'Task unmarked', 'info');
    } catch (err) {
      console.error('Error toggling task:', err);
      showSnackbar('Failed to update task', 'error');
    }
  };

  // Delete Order
  const handleDeleteConfirm = async (id) => {
    try {
      setIsDeleting(true);
      await orderService.deleteOrder(id);
      showSnackbar('Work order deleted successfully', 'success');
      setDeletingOrder(null);
      fetchOrders({ force: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Error deleting order';
      showSnackbar(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'incoming' | 'in_progress' | 'completed'

  const isOrderCompleted = useCallback((order) => {
    const { total, done } = calculateOrderProgress(order);
    return order.status === 'Completed' || (total > 0 && done === total);
  }, []);

  const totalOrdersCount = orders.length;
  const incomingOrdersCount = useMemo(
    () => orders.filter((o) => o.status === 'Incoming').length,
    [orders]
  );
  const completedOrdersCount = useMemo(
    () => orders.filter((o) => isOrderCompleted(o)).length,
    [orders, isOrderCompleted]
  );
  const inProgressOrdersCount = useMemo(
    () => orders.filter((o) => !isOrderCompleted(o) && o.status !== 'Incoming' && o.status !== 'Cancelled').length,
    [orders, isOrderCompleted]
  );

  const inProgressBadgeColor = getOrderBadgeColor(inProgressOrdersCount, badgeSettings);
  const incomingBadgeColor = getOrderBadgeColor(incomingOrdersCount, badgeSettings);

  // Filtered & Searched Orders
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (statusFilter === 'incoming') {
      result = result.filter((o) => o.status === 'Incoming');
    } else if (statusFilter === 'in_progress') {
      result = result.filter((o) => !isOrderCompleted(o) && o.status !== 'Incoming' && o.status !== 'Cancelled');
    } else if (statusFilter === 'completed') {
      result = result.filter((o) => isOrderCompleted(o));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.truck_chassis_no?.toLowerCase().includes(q) ||
          o.owner_name?.toLowerCase().includes(q) ||
          o.mobile_number?.includes(q) ||
          o.order_no?.toLowerCase().includes(q) ||
          o.condition_text?.toLowerCase().includes(q) ||
          o.shade_no?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [orders, statusFilter, searchQuery, isOrderCompleted]);

  return (
    <div className="workers-page-shell">
      {/* Main Content Area Matching Workers Page Exactly */}
      <main className="android-body">
        {/* Only the Search Box (Home header removed as requested) */}
        <div className="search-pill-container luxury-search-wrap">
          <div className="search-pill-box">
            <span className="search-pill-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </span>
            <input
              type="text"
              className="search-pill-input"
              placeholder="Search by truck no, owner, or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search work orders"
            />
            {searchQuery && (
              <button
                type="button"
                className="search-pill-clear"
                onClick={() => setSearchQuery('')}
                title="Clear search"
                aria-label="Clear search"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Compact Status Counter & Filter Strip */}
        <div className="orders-top-counter-strip">
          <button
            type="button"
            className={`orders-counter-chip ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
            title="All work orders"
          >
            <span className="counter-chip-dot dot-all"></span>
            <span className="counter-chip-label">Total</span>
            <span className="counter-chip-badge">{totalOrdersCount}</span>
          </button>

          <button
            type="button"
            className={`orders-counter-chip chip-incoming ${statusFilter === 'incoming' ? 'active' : ''} chip-alert-${incomingBadgeColor}`}
            onClick={() => setStatusFilter(statusFilter === 'incoming' ? 'all' : 'incoming')}
            title={`Incoming orders: ${incomingOrdersCount} (${incomingBadgeColor.toUpperCase()})`}
          >
            <span className={`counter-chip-dot dot-${incomingBadgeColor}`}></span>
            <span className="counter-chip-label">Incoming</span>
            <span className={`counter-chip-badge badge-incoming badge-alert-${incomingBadgeColor}`}>
              {incomingOrdersCount}
            </span>
          </button>

          <button
            type="button"
            className={`orders-counter-chip chip-process ${statusFilter === 'in_progress' ? 'active' : ''} chip-alert-${inProgressBadgeColor}`}
            onClick={() => setStatusFilter(statusFilter === 'in_progress' ? 'all' : 'in_progress')}
            title={`In-Process orders: ${inProgressOrdersCount} (${inProgressBadgeColor.toUpperCase()})`}
          >
            <span className={`counter-chip-dot dot-${inProgressBadgeColor}`}></span>
            <span className="counter-chip-label">In Process</span>
            <span className={`counter-chip-badge badge-process badge-alert-${inProgressBadgeColor}`}>
              {inProgressOrdersCount}
            </span>
          </button>

          <button
            type="button"
            className={`orders-counter-chip chip-completed ${statusFilter === 'completed' ? 'active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
            title="Filter by completed work orders"
          >
            <span className="counter-chip-dot dot-completed"></span>
            <span className="counter-chip-label">Completed</span>
            <span className="counter-chip-badge badge-completed">{completedOrdersCount}</span>
          </button>

          <button
            type="button"
            className={`orders-counter-chip chip-badge-color chip-badge-${inProgressBadgeColor}`}
            onClick={() => setIsBadgeSettingsOpen(true)}
            title="Order Alert Color Settings (Red, Green, Blue)"
            aria-label="Order Badge Color Settings"
          >
            <span className={`counter-chip-dot dot-${inProgressBadgeColor}`}></span>
            <span className="counter-chip-label">
              Alert: {inProgressBadgeColor.toUpperCase()}
            </span>
            <span className="chip-settings-gear">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </span>
          </button>

          <button
            type="button"
            className="orders-counter-chip chip-dropdown-options"
            onClick={() => setIsDropdownOptionsOpen(true)}
            title="ऑर्डर फ़ील्ड्स के ड्रॉपडाउन विकल्प सेटिंग्स (Manage Dropdown Options)"
            aria-label="Order Dropdown Options"
          >
            <span className="chip-settings-gear">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </span>
            <span className="counter-chip-label">
              ड्रॉपडाउन विकल्प (Options)
            </span>
          </button>
        </div>

        {/* Orders List Content */}
        <div className="workers-list-wrapper">
          {loading && orders.length === 0 ? (
            <div className="loading-state-container">
              <div className="splash-pulse-bar"></div>
              <p className="loading-text">Loading work orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="empty-workers-state">
              <div className="empty-luxury-illustration">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="32" cy="32" r="30" fill="#f0f7ff" stroke="#e0e7ff" strokeWidth="1.5" />
                  <rect x="20" y="16" width="24" height="32" rx="4" fill="#dbeafe" stroke="#2563eb" strokeWidth="2" />
                  <line x1="26" y1="24" x2="38" y2="24" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
                  <line x1="26" y1="30" x2="38" y2="30" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
                  <line x1="26" y1="36" x2="34" y2="36" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="45" cy="45" r="7" fill="#2563eb" />
                  <path d="M45 42v6M42 45h6" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h3>No Work Orders Found</h3>
              <p>
                {searchQuery
                  ? `No records match "${searchQuery}". Try clearing search or check spelling.`
                  : 'Start creating work orders to track truck body building, cabin, and body progress.'}
              </p>
              {hasPermission('orders:create') && (
                <button
                  type="button"
                  className="btn btn-primary btn-empty-cta"
                  onClick={() => {
                    setSearchQuery('');
                    setEditingOrder(null);
                    setIsFormOpen(true);
                  }}
                >
                  + Create First Work Order
                </button>
              )}
            </div>
          ) : (
            <div className="workers-grid">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onOpen={(ord, mode = 'view') => {
                    setEditingOrder(ord);
                    setFormMode(mode);
                    setIsFormOpen(true);
                  }}
                  onViewJobSheet={(ord) => setViewingOrder(ord)}
                  onDelete={(ord) => setDeletingOrder(ord)}
                  onViewPhotos={(ord) => setPhotoModalOrder(ord)}
                  onOrderUpdated={(updatedOrd) => {
                    setOrders((prev) => prev.map((o) => (o.id === updatedOrd.id ? updatedOrd : o)));
                    if (photoModalOrder?.id === updatedOrd.id) {
                      setPhotoModalOrder(updatedOrd);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Floating Action Button (FAB) for adding new work order */}
      {hasPermission('orders:create') && (
        <OrderFab
          onAddNew={() => {
            setEditingOrder(null);
            setFormMode('edit');
            setIsFormOpen(true);
          }}
        />
      )}

      {/* Modals */}
      <OrderFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingOrder(null);
        }}
        initialData={editingOrder}
        mode={formMode}
        onSave={handleSaveOrder}
        onToggleTask={handleToggleTask}
        onViewJobSheet={(ord) => setViewingOrder(ord)}
      />

      <OrderJobSheetModal
        isOpen={!!viewingOrder}
        onClose={() => setViewingOrder(null)}
        order={viewingOrder}
        onToggleTask={handleToggleTask}
        isAdmin={isAdmin}
        onEdit={(ord) => {
          setViewingOrder(null);
          setEditingOrder(ord);
          setFormMode('edit');
          setIsFormOpen(true);
        }}
        onDelete={(ord) => {
          setViewingOrder(null);
          setDeletingOrder(ord);
        }}
      />

      <OrderDeleteModal
        isOpen={!!deletingOrder}
        onClose={() => setDeletingOrder(null)}
        onConfirm={handleDeleteConfirm}
        order={deletingOrder}
        isDeleting={isDeleting}
      />

      {/* Cloudflare R2 Photos Modal */}
      <OrderPhotosModal
        isOpen={!!photoModalOrder}
        onClose={() => setPhotoModalOrder(null)}
        order={photoModalOrder}
        onOrderUpdated={(updatedOrd) => {
          setOrders((prev) => prev.map((o) => (o.id === updatedOrd.id ? updatedOrd : o)));
          setPhotoModalOrder(updatedOrd);
          showSnackbar('Work photos updated successfully', 'success');
        }}
      />

      {/* Order Badge Alert Settings Modal (Red, Green, Blue) */}
      <OrderBadgeSettingsModal
        isOpen={isBadgeSettingsOpen}
        onClose={() => setIsBadgeSettingsOpen(false)}
        inProgressCount={inProgressOrdersCount}
        incomingCount={incomingOrdersCount}
        totalCount={totalOrdersCount}
        onSaved={() => showSnackbar('✓ Order alert badge settings updated!', 'success')}
      />

      {/* Order Dropdown Options Modal (Add/Edit/Delete Dropdown items) */}
      <OrderDropdownOptionsModal
        isOpen={isDropdownOptionsOpen}
        onClose={() => setIsDropdownOptionsOpen(false)}
        onSaved={() => showSnackbar('✓ ड्रॉपडाउन विकल्प अपडेट हो गए!', 'success')}
      />

      {/* Global Snackbar Toast */}
      <Snackbar
        message={snackbar.message}
        type={snackbar.type}
        onClose={() => setSnackbar({ message: '', type: 'info' })}
      />
    </div>
  );
}

export default OrdersPage;
