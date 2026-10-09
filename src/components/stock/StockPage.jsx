import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { stockService } from '../../services/stockService';
import { StockCard } from './StockCard';
import { StockItemModal } from './StockItemModal';
import { StockQuickAdjustModal } from './StockQuickAdjustModal';
import { StockCategoryModal } from './StockCategoryModal';
import { StockHistoryModal } from './StockHistoryModal';
import { StockDeleteModal } from './StockDeleteModal';
import { StockFab } from './StockFab';
import { Snackbar } from '../workers/Snackbar';
import { useAuth } from '../../context/AuthContext';

export function StockPage({ onBackToHome }) {
  const { isAdmin } = useAuth();

  // State
  const [items, setItems] = useState(() => stockService.getCachedItems());
  const [categories, setCategories] = useState(() => stockService.getCachedCategories());
  const [loading, setLoading] = useState(() => stockService.getCachedItems().length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all', 'low_stock', or category_name

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState(null);
  const [adjustType, setAdjustType] = useState('IN');

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);

  const [deletingItem, setDeletingItem] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Snackbar notifications
  const [snackbar, setSnackbar] = useState({ message: '', type: 'info' });
  const showSnackbar = useCallback((message, type = 'info') => {
    setSnackbar({ message, type });
  }, []);

  // Fetch items and categories
  const fetchData = useCallback(
    async ({ force = false } = {}) => {
      try {
        if (stockService.getCachedItems().length === 0) {
          setLoading(true);
        }
        const [itemsRes, catsRes] = await Promise.all([
          stockService.getItems({}, { forceRefresh: force }),
          stockService.getCategories({ forceRefresh: force }),
        ]);

        if (itemsRes && itemsRes.data) setItems(itemsRes.data);
        if (catsRes && catsRes.data) setCategories(catsRes.data);
      } catch (err) {
        console.error('Error fetching stock data:', err);
        showSnackbar('Failed to load stock data from server', 'error');
      } finally {
        setLoading(false);
      }
    },
    [showSnackbar]
  );

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubItems = stockService.subscribeItems((updated) => {
      setItems(updated);
      setLoading(false);
    });
    const unsubCats = stockService.subscribeCategories((updated) => {
      setCategories(updated);
    });

    fetchData();

    return () => {
      unsubItems();
      unsubCats();
    };
  }, [fetchData]);

  // Save Item (Create or Update)
  const handleSaveItem = async (formData) => {
    try {
      if (editingItem) {
        await stockService.updateItem(editingItem.id, formData);
        showSnackbar(`Stock item "${formData.name}" updated successfully!`, 'success');
      } else {
        await stockService.createItem(formData);
        showSnackbar(`New stock item "${formData.name}" added successfully!`, 'success');
      }
      setIsItemModalOpen(false);
      setEditingItem(null);
      fetchData({ force: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Error saving stock item';
      showSnackbar(msg, 'error');
      throw err;
    }
  };

  // Adjust stock (IN / OUT)
  const handleAdjustStock = async (itemId, adjustPayload) => {
    try {
      await stockService.adjustStock(itemId, adjustPayload);
      const actionText = adjustPayload.type === 'IN' ? 'Stock Added (+)' : 'Stock Deducted (-)';
      showSnackbar(`${actionText} successfully!`, 'success');
      setIsAdjustModalOpen(false);
      setAdjustingItem(null);
      fetchData({ force: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Error adjusting stock';
      showSnackbar(msg, 'error');
      throw err;
    }
  };

  // Add Category
  const handleAddCategory = async (name) => {
    try {
      await stockService.createCategory(name);
      showSnackbar(`Category "${name}" created successfully!`, 'success');
      fetchData({ force: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Error creating category';
      showSnackbar(msg, 'error');
      throw err;
    }
  };

  // Delete Category
  const handleDeleteCategoryConfirm = async (catId) => {
    try {
      setIsDeleting(true);
      await stockService.deleteCategory(catId);
      showSnackbar('Category deleted successfully', 'success');
      setDeletingCategory(null);
      fetchData({ force: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Error deleting category';
      showSnackbar(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete Stock Item
  const handleDeleteItemConfirm = async (id) => {
    try {
      setIsDeleting(true);
      await stockService.deleteItem(id);
      showSnackbar('Stock item deleted successfully', 'success');
      setDeletingItem(null);
      fetchData({ force: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Error deleting stock item';
      showSnackbar(msg, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered Items
  const filteredItems = useMemo(() => {
    let result = [...items];

    if (selectedCategory === 'low_stock') {
      result = result.filter((i) => Number(i.quantity) <= Number(i.min_alert_quantity));
    } else if (selectedCategory !== 'all') {
      result = result.filter((i) => i.category_name === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (i) =>
          i.name?.toLowerCase().includes(q) ||
          i.category_name?.toLowerCase().includes(q) ||
          i.location?.toLowerCase().includes(q) ||
          i.notes?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [items, selectedCategory, searchQuery]);

  // Metrics
  const lowStockCount = items.filter((i) => Number(i.quantity) <= Number(i.min_alert_quantity)).length;
  const totalItemsCount = items.length;

  return (
    <div className="workers-page-shell">
      <main className="android-body">
        {/* Search Bar */}
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
              placeholder="Search materials, steel, paint, hardware, rack..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search stock materials"
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

        {/* Action Header Row with Manage Categories & Audit Log */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.85rem',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Stock & Materials
            </h3>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#2563eb',
                background: '#eff6ff',
                padding: '2px 8px',
                borderRadius: '12px',
                border: '1px solid #bfdbfe',
              }}
            >
              {totalItemsCount} Total
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {/* View Full Movement History */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setHistoryItem(null);
                setIsHistoryModalOpen(true);
              }}
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 14 14" />
              </svg>
              Audit Log
            </button>

            {/* Manage Categories Modal Trigger */}
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsCategoryModalOpen(true)}
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
              Categories ({categories.length})
            </button>
          </div>
        </div>

        {/* Category Filter Tabs Bar (with inline + Category button as requested) */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            overflowX: 'auto',
            paddingBottom: '0.75rem',
            marginBottom: '0.85rem',
            scrollbarWidth: 'none',
          }}
        >
          {/* All Tab */}
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            style={{
              whiteSpace: 'nowrap',
              padding: '0.4rem 0.85rem',
              borderRadius: '20px',
              border: selectedCategory === 'all' ? '1px solid #2563eb' : '1px solid #e2e8f0',
              background: selectedCategory === 'all' ? '#2563eb' : '#ffffff',
              color: selectedCategory === 'all' ? '#ffffff' : '#475569',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            }}
          >
            All Items ({totalItemsCount})
          </button>

          {/* Low Stock Filter Tab */}
          <button
            type="button"
            onClick={() => setSelectedCategory('low_stock')}
            style={{
              whiteSpace: 'nowrap',
              padding: '0.4rem 0.85rem',
              borderRadius: '20px',
              border: selectedCategory === 'low_stock' ? '1px solid #dc2626' : '1px solid #fecaca',
              background: selectedCategory === 'low_stock' ? '#dc2626' : '#fef2f2',
              color: selectedCategory === 'low_stock' ? '#ffffff' : '#991b1b',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            ⚠️ Low Stock ({lowStockCount})
          </button>

          {/* Dynamic Categories */}
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.name;
            const catItemCount = items.filter((i) => i.category_name === cat.name).length;
            return (
              <button
                key={cat.id || cat.name}
                type="button"
                onClick={() => setSelectedCategory(cat.name)}
                style={{
                  whiteSpace: 'nowrap',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '20px',
                  border: isSelected ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  background: isSelected ? '#2563eb' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#475569',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                {cat.name} ({catItemCount})
              </button>
            );
          })}

          {/* Inline "+ Category" button right in the category tabs row */}
          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            style={{
              whiteSpace: 'nowrap',
              padding: '0.4rem 0.85rem',
              borderRadius: '20px',
              border: '1px dashed #2563eb',
              background: '#eff6ff',
              color: '#2563eb',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
            }}
            title="Add category directly here"
          >
            + Add Category
          </button>
        </div>

        {/* Stock Items Grid */}
        <div className="workers-list-wrapper">
          {loading && items.length === 0 ? (
            <div className="loading-state-container">
              <div className="splash-pulse-bar"></div>
              <p className="loading-text">Loading stock materials...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            /* Unified Empty State strictly adhering to guideline */
            <div className="empty-workers-state">
              <div className="empty-luxury-illustration">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="32" cy="32" r="30" fill="#f0f7ff" stroke="#e0e7ff" strokeWidth="1.5" />
                  <rect x="18" y="20" width="28" height="26" rx="3" fill="#dbeafe" stroke="#2563eb" strokeWidth="2" />
                  <path d="M18 28l14 8 14-8" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
                  <line x1="32" y1="36" x2="32" y2="46" stroke="#2563eb" strokeWidth="2" />
                  <circle cx="45" cy="45" r="7" fill="#2563eb" />
                  <path d="M45 42v6M42 45h6" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h3>No Stock Materials Found</h3>
              <p>
                {searchQuery
                  ? `No items match "${searchQuery}". Try adjusting your search or category.`
                  : selectedCategory !== 'all'
                  ? `No items found in category "${selectedCategory}".`
                  : 'Start maintaining truck body fabrication stock by adding your first material.'}
              </p>
              {isAdmin && (
                <button
                  type="button"
                  className="btn btn-primary btn-empty-cta"
                  onClick={() => {
                    setEditingItem(null);
                    setIsItemModalOpen(true);
                  }}
                >
                  + Add First Stock Item
                </button>
              )}
            </div>
          ) : (
            <div className="workers-grid">
              {filteredItems.map((item) => (
                <StockCard
                  key={item.id}
                  item={item}
                  isAdmin={isAdmin}
                  onEdit={(it) => {
                    setEditingItem(it);
                    setIsItemModalOpen(true);
                  }}
                  onDelete={(it) => setDeletingItem(it)}
                  onAdjust={(it, type) => {
                    setAdjustingItem(it);
                    setAdjustType(type);
                    setIsAdjustModalOpen(true);
                  }}
                  onViewHistory={(it) => {
                    setHistoryItem(it);
                    setIsHistoryModalOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Floating Action Button for adding Stock Item */}
      {isAdmin && (
        <StockFab
          onAddNew={() => {
            setEditingItem(null);
            setIsItemModalOpen(true);
          }}
        />
      )}

      {/* Item Modal (Create / Edit) */}
      <StockItemModal
        isOpen={isItemModalOpen}
        initialData={editingItem}
        categories={categories}
        onClose={() => {
          setIsItemModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
        onAddCategory={handleAddCategory}
      />

      {/* Quick Adjust Modal (Stock IN / OUT) */}
      <StockQuickAdjustModal
        isOpen={isAdjustModalOpen}
        item={adjustingItem}
        initialType={adjustType}
        onClose={() => {
          setIsAdjustModalOpen(false);
          setAdjustingItem(null);
        }}
        onAdjust={handleAdjustStock}
      />

      {/* Categories Management Modal */}
      <StockCategoryModal
        isOpen={isCategoryModalOpen}
        categories={categories}
        onClose={() => setIsCategoryModalOpen(false)}
        onAddCategory={handleAddCategory}
        onDeleteCategory={(cat) => setDeletingCategory(cat)}
      />

      {/* Movement History Modal */}
      <StockHistoryModal
        isOpen={isHistoryModalOpen}
        item={historyItem}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setHistoryItem(null);
        }}
      />

      {/* Item Delete Modal (Strict Unified Android Dialog) */}
      <StockDeleteModal
        isOpen={!!deletingItem}
        item={deletingItem}
        type="item"
        isDeleting={isDeleting}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDeleteItemConfirm}
      />

      {/* Category Delete Modal (Strict Unified Android Dialog) */}
      <StockDeleteModal
        isOpen={!!deletingCategory}
        item={deletingCategory}
        type="category"
        isDeleting={isDeleting}
        onClose={() => setDeletingCategory(null)}
        onConfirm={handleDeleteCategoryConfirm}
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

export default StockPage;
