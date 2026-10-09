import React, { useState, useEffect } from 'react';

const COMMON_UNITS = [
  'Pcs',
  'Kg',
  'Ton',
  'Feet',
  'Meter',
  'Sheet',
  'Bundle',
  'Liter',
  'Box',
  'Pair',
  'Set',
];

/**
 * Add / Edit Stock Item Modal
 * Includes inline Category creation so users can add new categories instantly without leaving the modal.
 */
export function StockItemModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  categories,
  onAddCategory,
  isSubmitting,
}) {
  const [formData, setFormData] = useState({
    name: '',
    category_name: '',
    unit: 'Pcs',
    quantity: '',
    min_alert_quantity: '5',
    unit_price: '',
    location: '',
    notes: '',
  });

  const [isAddingInlineCat, setIsAddingInlineCat] = useState(false);
  const [inlineCatName, setInlineCatName] = useState('');
  const [inlineCatLoading, setInlineCatLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        category_name: initialData.category_name || '',
        unit: initialData.unit || 'Pcs',
        quantity: initialData.quantity !== undefined ? String(initialData.quantity) : '',
        min_alert_quantity: initialData.min_alert_quantity !== undefined ? String(initialData.min_alert_quantity) : '5',
        unit_price: initialData.unit_price !== null && initialData.unit_price !== undefined ? String(initialData.unit_price) : '',
        location: initialData.location || '',
        notes: initialData.notes || '',
      });
    } else {
      setFormData({
        name: '',
        category_name: categories.length > 0 ? categories[0].name : '',
        unit: 'Pcs',
        quantity: '',
        min_alert_quantity: '5',
        unit_price: '',
        location: '',
        notes: '',
      });
    }
    setIsAddingInlineCat(false);
    setInlineCatName('');
    setErrors({});
  }, [initialData, isOpen, categories]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleInlineAddCategory = async (e) => {
    e.preventDefault();
    const trimmed = inlineCatName.trim();
    if (!trimmed) return;

    try {
      setInlineCatLoading(true);
      await onAddCategory(trimmed);
      setFormData((prev) => ({ ...prev, category_name: trimmed }));
      setIsAddingInlineCat(false);
      setInlineCatName('');
    } catch (err) {
      setErrors((prev) => ({
        ...prev,
        category: err.response?.data?.message || err.message || 'Error creating category',
      }));
    } finally {
      setInlineCatLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};

    if (!formData.name.trim()) {
      errs.name = 'Item name is required (आइटम का नाम आवश्यक है)';
    }

    if (!formData.category_name.trim()) {
      errs.category_name = 'Please select or add a category (कैटेगरी चुनें)';
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    try {
      await onSave({
        ...formData,
        quantity: formData.quantity === '' ? 0 : parseFloat(formData.quantity) || 0,
        min_alert_quantity: formData.min_alert_quantity === '' ? 0 : parseFloat(formData.min_alert_quantity) || 0,
        unit_price: formData.unit_price === '' ? null : parseFloat(formData.unit_price) || null,
      });
    } catch (err) {
      // error handled by parent snackbar
    }
  };

  const isEditing = Boolean(initialData && initialData.id);

  return (
    <div className="stock-modal-overlay" onClick={onClose}>
      <div
        className="stock-modal-card modal-lg"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="stock-modal-header">
          <div className="stock-header-title-box">
            <span className="stock-header-badge">
              {isEditing ? 'Edit Item' : 'New Stock Item'}
            </span>
            <h2 className="stock-header-title">
              {isEditing ? 'Update Stock Item' : 'Add Stock Item (स्टॉक आइटम)'}
            </h2>
            <p className="stock-header-subtitle">
              Truck body fabrication material inventory entry
            </p>
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

        {/* Form Shell */}
        <form onSubmit={handleSubmit} className="stock-modal-form-shell">
          <div className="stock-modal-body">
            {/* Item Name */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                Item Name (आइटम का नाम) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="text"
                name="name"
                className={`form-input ${errors.name ? 'input-error' : ''}`}
                placeholder="e.g. MS Channel 75x40 mm, Angle 50x5, Primer Red Oxide"
                value={formData.name}
                onChange={handleChange}
                disabled={isSubmitting}
                autoFocus
              />
              {errors.name && <p className="field-error-text" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>{errors.name}</p>}
            </div>

            {/* Category with Inline Add Button */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label className="form-label" style={{ fontWeight: 600, margin: 0 }}>
                  Category (कैटेगरी) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                {!isAddingInlineCat && (
                  <button
                    type="button"
                    onClick={() => setIsAddingInlineCat(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    + New Category
                  </button>
                )}
              </div>

              {isAddingInlineCat ? (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter category name..."
                    value={inlineCatName}
                    onChange={(e) => setInlineCatName(e.target.value)}
                    disabled={inlineCatLoading}
                    autoFocus
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleInlineAddCategory}
                    disabled={inlineCatLoading || !inlineCatName.trim()}
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                  >
                    {inlineCatLoading ? '...' : 'Add'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setIsAddingInlineCat(false);
                      setInlineCatName('');
                    }}
                    disabled={inlineCatLoading}
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <select
                  name="category_name"
                  className={`form-input ${errors.category_name ? 'input-error' : ''}`}
                  value={formData.category_name}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  <option value="">-- Select Category --</option>
                  {categories.map((c) => (
                    <option key={c.id || c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
              {errors.category_name && (
                <p className="field-error-text" style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  {errors.category_name}
                </p>
              )}
            </div>

            {/* Unit & Current Quantity Row */}
            <div className="stock-two-col-grid" style={{ marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Unit of Measure (यूनिट)
                </label>
                <select
                  name="unit"
                  className="form-input"
                  value={formData.unit}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  {COMMON_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>
                  {isEditing ? 'Current Stock (स्टॉक मात्रा)' : 'Opening Stock (शुरुआती स्टॉक)'}
                </label>
                <input
                  type="number"
                  step="any"
                  name="quantity"
                  className="form-input"
                  placeholder="0"
                  value={formData.quantity}
                  onChange={handleChange}
                  disabled={isSubmitting || isEditing}
                />
                {isEditing && (
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Use "+ In / - Out" buttons on card for adjustments
                  </span>
                )}
              </div>
            </div>

            {/* Min Alert Level & Unit Price */}
            <div className="stock-two-col-grid" style={{ marginBottom: '1rem' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Min Alert Level (कम स्टॉक चेतावनी)
                </label>
                <input
                  type="number"
                  step="any"
                  name="min_alert_quantity"
                  className="form-input"
                  placeholder="e.g. 5"
                  value={formData.min_alert_quantity}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Alerts when stock drops to or below this
                </span>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Unit Price ₹ (कीमत प्रति यूनिट - ऐच्छिक)
                </label>
                <input
                  type="number"
                  step="any"
                  name="unit_price"
                  className="form-input"
                  placeholder="e.g. 65 / kg"
                  value={formData.unit_price}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Location / Rack */}
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ fontWeight: 600 }}>
                Rack / Location (रैक या गोदाम की जगह)
              </label>
              <input
                type="text"
                name="location"
                className="form-input"
                placeholder="e.g. Rack A-2, Steel Yard, Paint Room"
                value={formData.location}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>

            {/* Notes / Specs */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: 600 }}>
                Notes / Specs (विवरण / ब्रांड / साइज)
              </label>
              <textarea
                name="notes"
                className="form-input"
                rows={2}
                placeholder="e.g. Tata Steel grade, 20ft length, heavy gauge"
                value={formData.notes}
                onChange={handleChange}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Footer */}
          <div className="stock-modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Item' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default StockItemModal;
