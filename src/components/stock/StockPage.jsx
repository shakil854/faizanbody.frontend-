import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { stockService } from '../../services/stockService';
import { StockCard } from './StockCard';
import { StockCategoryCard } from './StockCategoryCard';
import { StockCategoryItemsModal } from './StockCategoryItemsModal';
import { StockItemModal } from './StockItemModal';
import { StockQuickAdjustModal } from './StockQuickAdjustModal';
import { StockCategoryModal } from './StockCategoryModal';
import { StockHistoryModal } from './StockHistoryModal';
import { StockDeleteModal } from './StockDeleteModal';
import { StockOrderModal } from './StockOrderModal';
import { StockFab } from './StockFab';
import { Snackbar } from '../workers/Snackbar';
import { useAuth } from '../../context/AuthContext';

export function StockPage({ onBackToHome }) {
  const { isAdmin, hasPermission } = useAuth();
  const canCreate = hasPermission('stock:create');
  const canEdit = hasPermission('stock:edit');
  const canDelete = hasPermission('stock:delete');
  const canAdjust = hasPermission('stock:adjust');
  const canCategory = hasPermission('stock:category');
  const canTransactions = hasPermission('stock:transactions');
  const canOrder = hasPermission('stock:order');

  // State
  const [items, setItems] = useState(() => stockService.getCachedItems());
  const [categories, setCategories] = useState(() => stockService.getCachedCategories());
  const [loading, setLoading] = useState(() => stockService.getCachedItems().length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all', 'low_stock', or category_name
  const [viewMode, setViewMode] = useState('categories'); // 'categories' (default) | 'items'

  // Modals
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [defaultCategoryForNewItem, setDefaultCategoryForNewItem] = useState('');

  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState(null);
  const [adjustType, setAdjustType] = useState('IN');

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyItem, setHistoryItem] = useState(null);

  // Category Items Modal
  const [activeCategoryModal, setActiveCategoryModal] = useState(null); // { name }

  // Purchase Order (Single Item or Category Bulk)
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderingItem, setOrderingItem] = useState(null);
  const [bulkOrderData, setBulkOrderData] = useState(null); // { categoryName, items }

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
      setDefaultCategoryForNewItem('');
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
      if (deletingCategory && selectedCategory === deletingCategory.name) {
        setSelectedCategory('all');
      }
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

  // Filtered Flat Items (for "All Items" view)
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

  // Grouped Categories (for "Categories" main view)
  const categoryGroups = useMemo(() => {
    // 1. Map known categories from backend
    const groups = categories.map((cat) => {
      const catItems = items.filter(
        (i) => i.category_name?.toLowerCase().trim() === cat.name?.toLowerCase().trim()
      );
      return {
        id: cat.id || cat.name,
        name: cat.name,
        items: catItems,
      };
    });

    // 2. Map any items that have no category or uncategorized
    const knownNames = new Set(categories.map((c) => c.name.toLowerCase().trim()));
    const uncategorizedItems = items.filter(
      (i) => !i.category_name || !knownNames.has(i.category_name.toLowerCase().trim())
    );

    if (uncategorizedItems.length > 0) {
      groups.push({
        id: '__uncategorized__',
        name: 'General / Other',
        items: uncategorizedItems,
      });
    }

    let filtered = groups;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered
        .map((group) => {
          const matchCatName = group.name.toLowerCase().includes(q);
          const matchedItems = group.items.filter(
            (it) =>
              it.name?.toLowerCase().includes(q) ||
              it.location?.toLowerCase().includes(q) ||
              it.notes?.toLowerCase().includes(q)
          );
          if (matchCatName) return group;
          if (matchedItems.length > 0) return { ...group, items: matchedItems };
          return null;
        })
        .filter(Boolean);
    }

    // Category filter tab
    if (selectedCategory === 'low_stock') {
      filtered = filtered
        .map((group) => {
          const lowItems = group.items.filter(
            (it) => Number(it.quantity) <= Number(it.min_alert_quantity)
          );
          return lowItems.length > 0 ? { ...group, items: lowItems } : null;
        })
        .filter(Boolean);
    } else if (selectedCategory !== 'all') {
      filtered = filtered.filter(
        (g) => g.name.toLowerCase().trim() === selectedCategory.toLowerCase().trim()
      );
    }

    return filtered;
  }, [categories, items, searchQuery, selectedCategory]);

  // Live items for the currently open Category Items Modal
  const activeModalItems = useMemo(() => {
    if (!activeCategoryModal) return [];
    if (activeCategoryModal.name === 'General / Other') {
      const knownNames = new Set(categories.map((c) => c.name.toLowerCase().trim()));
      return items.filter(
        (i) => !i.category_name || !knownNames.has(i.category_name.toLowerCase().trim())
      );
    }
    return items.filter(
      (i) => i.category_name?.toLowerCase().trim() === activeCategoryModal.name?.toLowerCase().trim()
    );
  }, [activeCategoryModal, items, categories]);

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

        {/* Action Header Row with View Mode Switch, Manage Categories & Audit Log */}
        <div className="stock-actions-bar">
          <div className="stock-actions-left">
            <h3 className="stock-actions-title">
              Stock & Materials
            </h3>

            {/* View Mode Switch: Category Cards (Main) vs All Items (List) */}
            <div className="stock-view-mode-toggle">
              <button
                type="button"
                className={`view-mode-btn ${viewMode === 'categories' ? 'active' : ''}`}
                onClick={() => setViewMode('categories')}
                title="Categorized View (Category Cards)"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <span>Categories ({categories.length})</span>
              </button>

              <button
                type="button"
                className={`view-mode-btn ${viewMode === 'items' ? 'active' : ''}`}
                onClick={() => setViewMode('items')}
                title="All Items Flat List"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                <span>All Items ({totalItemsCount})</span>
              </button>
            </div>
          </div>

          <div className="stock-actions-right">
            {/* View Full Movement History */}
            {canTransactions && (
              <button
                type="button"
                className="btn btn-secondary stock-action-btn-compact"
                onClick={() => {
                  setHistoryItem(null);
                  setIsHistoryModalOpen(true);
                }}
                title="Audit Log / Movement History"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 14 14" />
                </svg>
                <span>Audit Log</span>
              </button>
            )}

            {/* Manage Categories Modal Trigger */}
            {canCategory && (
              <button
                type="button"
                className="btn btn-secondary stock-action-btn-compact"
                onClick={() => setIsCategoryModalOpen(true)}
                title="Manage Categories"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                  <line x1="7" y1="7" x2="7.01" y2="7" />
                </svg>
                <span>Categories ({categories.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Smart Category & Status Filter Bar */}
        <div className="stock-filter-bar">
          {/* Status Quick Filters */}
          <div className="stock-filter-left">
            <button
              type="button"
              className={`stock-filter-tab ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              {viewMode === 'categories' ? `All Categories (${categories.length})` : `All Items (${totalItemsCount})`}
            </button>

            <button
              type="button"
              className={`stock-filter-tab low-stock ${selectedCategory === 'low_stock' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('low_stock')}
            >
              ⚠️ Low Stock ({lowStockCount})
            </button>
          </div>

          {/* Category Dropdown Picker & Inline Add */}
          <div className="stock-filter-right">
            <div className="stock-category-dropdown-wrap">
              <span className="stock-category-dropdown-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <select
                value={selectedCategory === 'all' || selectedCategory === 'low_stock' ? '' : selectedCategory}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '__add__') {
                    setIsCategoryModalOpen(true);
                  } else if (val === '') {
                    setSelectedCategory('all');
                  } else {
                    setSelectedCategory(val);
                  }
                }}
                className={`stock-category-select ${selectedCategory !== 'all' && selectedCategory !== 'low_stock' ? 'has-selection' : ''}`}
                aria-label="Filter by category"
              >
                <option value="">
                  {categories.length === 0 ? 'No Categories' : `Filter by Category (${categories.length}) ▾`}
                </option>
                {categories.map((cat) => {
                  const catItemCount = items.filter((i) => i.category_name === cat.name).length;
                  return (
                    <option key={cat.id || cat.name} value={cat.name}>
                      {cat.name} ({catItemCount})
                    </option>
                  );
                })}
                {canCategory && <option value="__add__">+ Add / Manage Categories...</option>}
              </select>
              <svg className="stock-chevron-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>

            {canCategory && (
              <button
                type="button"
                className="stock-inline-add-cat-btn"
                onClick={() => setIsCategoryModalOpen(true)}
                title="Add new category"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Category
              </button>
            )}
          </div>
        </div>

        {/* Active Category Filter Tag with 1-Click Clear */}
        {selectedCategory !== 'all' && selectedCategory !== 'low_stock' && (
          <div className="stock-active-filter-banner">
            <span className="stock-active-filter-label">
              Category Filter: <strong>{selectedCategory}</strong>
            </span>
            <button
              type="button"
              className="stock-active-filter-clear-btn"
              onClick={() => setSelectedCategory('all')}
              title="Clear category filter"
            >
              ✕ Clear Filter
            </button>
          </div>
        )}

        {/* ========================================================
            STOCK CONTENT: CATEGORIES GRID (DEFAULT) OR ITEMS GRID
            ======================================================== */}
        <div className="workers-list-wrapper">
          {loading && items.length === 0 ? (
            <div className="loading-state-container">
              <div className="splash-pulse-bar"></div>
              <p className="loading-text">Loading stock materials...</p>
            </div>
          ) : viewMode === 'categories' ? (
            /* ========================================================
                1. CATEGORY CARDS GRID (PRIMARY / DEFAULT VIEW)
                Touching card opens all its items in a modal!
                ======================================================== */
            categoryGroups.length === 0 ? (
              <div className="empty-workers-state">
                <div className="empty-luxury-illustration">
                  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="32" cy="32" r="30" fill="#f0f7ff" stroke="#e0e7ff" strokeWidth="1.5" />
                    <rect x="18" y="20" width="28" height="26" rx="3" fill="#dbeafe" stroke="#2563eb" strokeWidth="2" />
                    <path d="M18 28l14 8 14-8" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" />
                    <line x1="32" y1="36" x2="32" y2="46" stroke="#2563eb" strokeWidth="2" />
                  </svg>
                </div>
                <h3>No Categories Found</h3>
                <p>
                  {searchQuery
                    ? `No categories or items match "${searchQuery}".`
                    : selectedCategory === 'low_stock'
                    ? 'Great news! No categories currently have low stock.'
                    : 'Start by creating categories or adding stock materials.'}
                </p>
                {canCategory && (
                  <button
                    type="button"
                    className="btn btn-primary btn-empty-cta"
                    onClick={() => setIsCategoryModalOpen(true)}
                  >
                    + Add First Category
                  </button>
                )}
              </div>
            ) : (
              <div className="stock-category-cards-grid">
                {categoryGroups.map((group) => (
                  <StockCategoryCard
                    key={group.id}
                    category={{ id: group.id, name: group.name }}
                    items={group.items}
                    canOrder={canOrder}
                    onClick={(cat) => {
                      setActiveCategoryModal({ name: cat.name });
                    }}
                    onOrderCategory={(catName, catItems) => {
                      setBulkOrderData({ categoryName: catName, items: catItems });
                      setOrderingItem(null);
                      setIsOrderModalOpen(true);
                    }}
                  />
                ))}
              </div>
            )
          ) : (
            /* ========================================================
                2. ALL ITEMS FLAT GRID (LIST VIEW)
                ======================================================== */
            filteredItems.length === 0 ? (
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
                    ? `No items match "${searchQuery}". Try adjusting your search.`
                    : selectedCategory !== 'all'
                    ? `No items found in category "${selectedCategory}".`
                    : 'Start maintaining truck body fabrication stock by adding your first material.'}
                </p>
                {canCreate && (
                  <button
                    type="button"
                    className="btn btn-primary btn-empty-cta"
                    onClick={() => {
                      setEditingItem(null);
                      setDefaultCategoryForNewItem('');
                      setIsItemModalOpen(true);
                    }}
                  >
                    + Add First Stock Item
                  </button>
                )}
              </div>
            ) : (
              <div className="stock-cards-grid">
                {filteredItems.map((item) => (
                  <StockCard
                    key={item.id}
                    item={item}
                    isAdmin={isAdmin}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    canAdjust={canAdjust}
                    canTransactions={canTransactions}
                    canOrder={canOrder}
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
                    onOrder={(it) => {
                      setOrderingItem(it);
                      setBulkOrderData(null);
                      setIsOrderModalOpen(true);
                    }}
                  />
                ))}
              </div>
            )
          )}
        </div>
      </main>

      {/* Floating Action Button for adding Stock Item */}
      {canCreate && (
        <StockFab
          onAddNew={() => {
            setEditingItem(null);
            setDefaultCategoryForNewItem('');
            setIsItemModalOpen(true);
          }}
        />
      )}

      {/* Category Items Modal (Opens on touching Category Card) */}
      <StockCategoryItemsModal
        isOpen={Boolean(activeCategoryModal)}
        categoryName={activeCategoryModal?.name || ''}
        items={activeModalItems}
        isAdmin={isAdmin}
        canCreate={canCreate}
        canEdit={canEdit}
        canDelete={canDelete}
        canAdjust={canAdjust}
        canTransactions={canTransactions}
        canOrder={canOrder}
        onClose={() => setActiveCategoryModal(null)}
        onOrderCategory={(catName, catItems) => {
          setBulkOrderData({ categoryName: catName, items: catItems });
          setOrderingItem(null);
          setIsOrderModalOpen(true);
        }}
        onEditItem={(it) => {
          setEditingItem(it);
          setIsItemModalOpen(true);
        }}
        onDeleteItem={(it) => setDeletingItem(it)}
        onAdjustItem={(it, type) => {
          setAdjustingItem(it);
          setAdjustType(type);
          setIsAdjustModalOpen(true);
        }}
        onViewHistory={(it) => {
          setHistoryItem(it);
          setIsHistoryModalOpen(true);
        }}
        onOrderItem={(it) => {
          setOrderingItem(it);
          setBulkOrderData(null);
          setIsOrderModalOpen(true);
        }}
        onAddNewItem={(catName) => {
          setEditingItem(null);
          setDefaultCategoryForNewItem(catName);
          setIsItemModalOpen(true);
        }}
      />

      {/* Item Modal (Create / Edit) */}
      <StockItemModal
        isOpen={isItemModalOpen}
        initialData={editingItem}
        categories={categories}
        defaultCategory={defaultCategoryForNewItem}
        onClose={() => {
          setIsItemModalOpen(false);
          setEditingItem(null);
          setDefaultCategoryForNewItem('');
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

      {/* Material WhatsApp Purchase Order Modal (Supports both Single Item & Category Bulk Order) */}
      <StockOrderModal
        isOpen={isOrderModalOpen}
        item={orderingItem}
        items={bulkOrderData?.items || null}
        categoryName={bulkOrderData?.categoryName || ''}
        onClose={() => {
          setIsOrderModalOpen(false);
          setOrderingItem(null);
          setBulkOrderData(null);
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

export default StockPage;
