import React, { useState } from 'react';

/**
 * Manage Categories Modal
 * Allows adding new categories (strictly only Category Name as requested)
 * and managing existing categories right from the Stock page.
 */
export function StockCategoryModal({
  isOpen,
  onClose,
  categories,
  onAddCategory,
  onDeleteCategory,
  isSubmitting,
}) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [error, setError] = useState('');

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
            <p className="stock-header-subtitle">Add and organize material categories</p>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto' }}>
                {categories.map((cat) => (
                  <div
                    key={cat.id || cat.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    <div>
                      <span style={{ fontWeight: 600, color: '#1e293b' }}>{cat.name}</span>
                      <span
                        style={{
                          marginLeft: '0.6rem',
                          fontSize: '0.75rem',
                          background: '#e2e8f0',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '12px',
                          color: '#475569',
                        }}
                      >
                        {cat.item_count || 0} items
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteCategory(cat)}
                      disabled={isSubmitting}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.85rem',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="Delete category"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      Delete
                    </button>
                  </div>
                ))}
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
