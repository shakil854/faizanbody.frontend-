import React, { useState } from 'react';

/**
 * Manage Categories Modal
 * Allows adding new categories, editing existing categories, and deleting categories.
 */
export function StockCategoryModal({
  isOpen,
  onClose,
  categories,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  isSubmitting,
}) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [error, setError] = useState('');

  // Inline editing state
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      setError('Please enter category name');
      return;
    }

    try {
      setError('');
      await onAddCategory(trimmed);
      setNewCategoryName('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error adding category');
    }
  };

  const handleStartEdit = (cat) => {
    setEditingId(cat.id || cat.name);
    setEditName(cat.name);
    setEditError('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditError('');
  };

  const handleSaveEdit = async (cat) => {
    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError('Category name cannot be empty');
      return;
    }
    if (trimmed.toLowerCase() === cat.name.toLowerCase()) {
      handleCancelEdit();
      return;
    }

    try {
      setUpdatingId(cat.id || cat.name);
      setEditError('');
      if (onUpdateCategory) {
        await onUpdateCategory(cat.id, trimmed);
      }
      handleCancelEdit();
    } catch (err) {
      setEditError(err.response?.data?.message || err.message || 'Error updating category');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="stock-modal-overlay" onClick={onClose}>
      <div
        className="stock-modal-card modal-sm"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="stock-modal-header">
          <div className="stock-header-title-box">
            <span className="stock-header-badge">Categories</span>
            <h2 className="stock-header-title">Manage Categories</h2>
            <p className="stock-header-subtitle">Add, edit, and organize material categories</p>
          </div>
          <button
            type="button"
            className="stock-close-circle-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="stock-modal-body">
          {/* Add Category Form */}
          <form onSubmit={handleSubmit} style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
              New Category Name:
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. MS Angles, Paint, Hardware, Timber"
                value={newCategoryName}
                onChange={(e) => {
                  setNewCategoryName(e.target.value);
                  if (error) setError('');
                }}
                disabled={isSubmitting}
                autoFocus
                style={{ flex: 1 }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || !newCategoryName.trim()}
                style={{ whiteSpace: 'nowrap' }}
              >
                {isSubmitting ? 'Adding...' : '+ Add'}
              </button>
            </div>
            {error && (
              <p style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '0.4rem', marginInline: '0.2rem' }}>
                {error}
              </p>
            )}
          </form>

          {/* Existing Categories List */}
          <div>
            <h4 style={{ fontSize: '0.88rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', fontWeight: 700 }}>
              Existing Categories ({categories.length})
            </h4>

            {categories.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1', color: '#64748b', fontSize: '0.9rem' }}>
                No categories created yet. Type a category name above to create your first one.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '2px' }}>
                {categories.map((cat) => {
                  const isEditingThis = editingId === (cat.id || cat.name);
                  const isUpdatingThis = updatingId === (cat.id || cat.name);

                  return (
                    <div
                      key={cat.id || cat.name}
                      style={{
                        padding: '0.65rem 0.85rem',
                        background: isEditingThis ? '#f0f9ff' : '#f8fafc',
                        borderRadius: '8px',
                        border: isEditingThis ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isEditingThis ? (
                        /* Inline Edit Form */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => {
                                setEditName(e.target.value);
                                if (editError) setEditError('');
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSaveEdit(cat);
                                }
                                if (e.key === 'Escape') {
                                  e.preventDefault();
                                  handleCancelEdit();
                                }
                              }}
                              autoFocus
                              disabled={isUpdatingThis}
                              placeholder="Category name"
                              style={{
                                flex: 1,
                                padding: '0.45rem 0.65rem',
                                fontSize: '0.86rem',
                                fontWeight: 600,
                                background: '#ffffff',
                                borderRadius: '6px',
                                border: '1.5px solid #2563eb',
                                outline: 'none',
                                color: '#0f172a',
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(cat)}
                              disabled={isUpdatingThis || !editName.trim()}
                              style={{
                                background: '#2563eb',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '0.45rem 0.75rem',
                                fontSize: '0.82rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {isUpdatingThis ? 'Saving...' : '✓ Save'}
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              disabled={isUpdatingThis}
                              style={{
                                background: '#ffffff',
                                color: '#64748b',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                padding: '0.45rem 0.65rem',
                                fontSize: '0.82rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                          {editError && (
                            <span style={{ color: '#ef4444', fontSize: '0.78rem', fontWeight: 600 }}>
                              {editError}
                            </span>
                          )}
                        </div>
                      ) : (
                        /* Standard View Row */
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', minWidth: 0, flex: 1 }}>
                            <span style={{ fontWeight: 600, color: '#1e293b', wordBreak: 'break-word', fontSize: '0.88rem' }}>
                              {cat.name}
                            </span>
                            <span
                              style={{
                                marginLeft: '0.5rem',
                                fontSize: '0.72rem',
                                background: '#e2e8f0',
                                padding: '0.15rem 0.45rem',
                                borderRadius: '12px',
                                color: '#475569',
                                whiteSpace: 'nowrap',
                                fontWeight: 600,
                                flexShrink: 0,
                              }}
                            >
                              {cat.item_count || 0} items
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleStartEdit(cat)}
                              disabled={isSubmitting || updatingId !== null}
                              style={{
                                background: '#eff6ff',
                                border: '1px solid #bfdbfe',
                                color: '#2563eb',
                                cursor: 'pointer',
                                padding: '0.3rem 0.6rem',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title="Edit category name"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                              Edit
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => onDeleteCategory(cat)}
                              disabled={isSubmitting || updatingId !== null}
                              style={{
                                background: '#fef2f2',
                                border: '1px solid #fecaca',
                                color: '#ef4444',
                                cursor: 'pointer',
                                padding: '0.3rem 0.6rem',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title="Delete category"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="stock-modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default StockCategoryModal;
