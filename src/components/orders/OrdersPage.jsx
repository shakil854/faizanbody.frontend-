import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { orderService } from '../../services/orderService';
import { OrderCard } from './OrderCard';
import { OrderFormModal } from './OrderFormModal';
import { OrderJobSheetModal } from './OrderJobSheetModal';
import { OrderDeleteModal } from './OrderDeleteModal';
import { OrderFab } from './OrderFab';
import { Snackbar } from '../workers/Snackbar';
import { useAuth } from '../../context/AuthContext';

export function OrdersPage({ onBackToHome }) {
  const { isAdmin } = useAuth();
  const [orders, setOrders] = useState(() => orderService.getCachedOrders());
  const [loading, setLoading] = useState(() => orderService.getCachedOrders().length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [deletingOrder, setDeletingOrder] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Snackbar notifications
  const [snackbar, setSnackbar] = useState({ message: '', type: 'info' });

  const showSnackbar = useCallback((message, type = 'info') => {
    setSnackbar({ message, type });
  }, []);

  const fetchOrders = useCallback(async ({ force = false } = {}) => {
    if (orderService.getCachedOrders().length === 0) {
      setLoading(true);
    }
    try {
      const response = await orderService.getOrders({}, { forceRefresh: force });
      if (response && response.data) {
        setOrders(response.data);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
      showSnackbar('वर्क आर्डर लोड करने में समस्या आई', 'error');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  // Subscribe to real-time service cache updates
  useEffect(() => {
    const unsubscribe = orderService.subscribe((updatedList) => {
      setOrders(updatedList);
      setLoading(false);

      // Also keep viewingOrder synchronized if modal is currently open
      setViewingOrder((prev) => {
        if (!prev) return null;
        const fresh = updatedList.find((o) => o.id === prev.id);
        return fresh || prev;
      });
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

  // Toggle task done ("side me box he vha pe right karna he vo kam ho jaye tab")
  const handleToggleTask = async (section, itemKey, done) => {
    if (!viewingOrder) return;
    try {
      const res = await orderService.toggleTaskDone(viewingOrder.id, {
        section,
        itemKey,
        done,
      });
      if (res && res.data) {
        setViewingOrder(res.data);
      }
      showSnackbar(done ? 'Task marked complete (✓)' : 'Task unmarked', 'info');
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

  // Filtered & Searched Orders
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (statusFilter !== 'all') {
      result = result.filter((o) => o.status === statusFilter);
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
  }, [orders, statusFilter, searchQuery]);

  // Statistics
  const totalCount = orders.length;
  const inProgressCount = orders.filter((o) => o.status === 'In Progress').length;
  const completedCount = orders.filter((o) => o.status === 'Completed').length;

  return (
    <div className="orders-page-shell android-body">
      {/* Page Header Bar */}
      <div className="workers-header-banner orders-banner">
        <div className="banner-top-row">
          <button type="button" className="btn-back-home" onClick={onBackToHome} aria-label="Back to Home">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Home</span>
          </button>

          <div className="banner-actions-right">
            <button
              type="button"
              className="btn-refresh-workers"
              onClick={() => fetchOrders({ force: true })}
              title="Refresh"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </button>

            <button
              type="button"
              className="btn-primary-luxury btn-add-header-order"
              onClick={() => {
                setEditingOrder(null);
                setIsFormOpen(true);
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>+ New Order</span>
            </button>
          </div>
        </div>

        <div className="banner-title-area">
          <div className="banner-icon-box">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div>
            <h2 className="banner-main-title">Work Orders / Job Cards</h2>
            <p className="banner-sub-title">Truck body fabrication, job sheets & progress tracking</p>
          </div>
        </div>

        {/* Stats Summary Chips */}
        <div className="order-stats-strip">
          <div
            className={`order-stat-chip ${statusFilter === 'all' ? 'active-chip' : ''}`}
            onClick={() => setStatusFilter('all')}
            role="button"
            tabIndex={0}
          >
            <span className="chip-count">{totalCount}</span>
            <span className="chip-label">All Orders</span>
          </div>

          <div
            className={`order-stat-chip chip-progress ${statusFilter === 'In Progress' ? 'active-chip' : ''}`}
            onClick={() => setStatusFilter('In Progress')}
            role="button"
            tabIndex={0}
          >
            <span className="chip-count">{inProgressCount}</span>
            <span className="chip-label">In Progress</span>
          </div>

          <div
            className={`order-stat-chip chip-completed ${statusFilter === 'Completed' ? 'active-chip' : ''}`}
            onClick={() => setStatusFilter('Completed')}
            role="button"
            tabIndex={0}
          >
            <span className="chip-count">{completedCount}</span>
            <span className="chip-label">Completed</span>
          </div>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="search-bar-container luxury-search-bar">
        <div className="search-input-wrapper">
          <svg className="search-icon-svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="search-input-field"
            placeholder="Search Truck No, Owner Name, Mobile or Order No..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
              aria-label="Clear Search"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Orders List Content */}
      <div className="workers-list-wrapper orders-list-wrapper">
        {loading && orders.length === 0 ? (
          <div className="loading-state-container">
            <div className="splash-pulse-bar"></div>
            <p className="loading-text">Loading work orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="empty-state-luxury">
            <div className="empty-icon-wrap">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <h4 className="empty-title">No Work Orders Found</h4>
            <p className="empty-desc">
              {searchQuery
                ? `No records match "${searchQuery}".`
                : 'No work orders created yet. Click below to add a new order.'}
            </p>
            <button
              type="button"
              className="btn btn-primary-luxury"
              onClick={() => {
                setEditingOrder(null);
                setIsFormOpen(true);
              }}
            >
              + Create First Work Order
            </button>
          </div>
        ) : (
          <div className="orders-cards-grid">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onOpen={(ord) => {
                  setEditingOrder(ord);
                  setIsFormOpen(true);
                }}
                onDelete={(ord) => setDeletingOrder(ord)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button (FAB) for adding new work order */}
      <OrderFab
        onAddNew={() => {
          setEditingOrder(null);
          setIsFormOpen(true);
        }}
      />

      {/* Modals */}
      <OrderFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingOrder(null);
        }}
        initialData={editingOrder}
        onSave={handleSaveOrder}
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
