import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { orderService } from '../../services/orderService';
import { OrderCard } from './OrderCard';
import { OrderFormModal } from './OrderFormModal';
import { OrderJobSheetModal } from './OrderJobSheetModal';
import { OrderDeleteModal } from './OrderDeleteModal';
import { OrderPhotosModal } from './OrderPhotosModal';
import { OrderFab } from './OrderFab';
import { Snackbar } from '../workers/Snackbar';
import { useAuth } from '../../context/AuthContext';

export function OrdersPage({ onBackToHome }) {
  const { isAdmin } = useAuth();

  // Instant SWR cache initialization
  const [orders, setOrders] = useState(() => orderService.getCachedOrders());
  const [loading, setLoading] = useState(() => orderService.getCachedOrders().length === 0);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [viewingOrder, setViewingOrder] = useState(null);
  const [deletingOrder, setDeletingOrder] = useState(null);
  const [photoModalOrder, setPhotoModalOrder] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
  }, [orders, searchQuery]);

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
              {isAdmin && (
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
                  onOpen={(ord) => {
                    setEditingOrder(ord);
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
