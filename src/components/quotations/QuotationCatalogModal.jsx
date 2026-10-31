import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { quotationService } from '../../services/quotationService';

export function QuotationCatalogModal({ isOpen, onClose, onNotify }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Editing or adding new item
  const [editingItem, setEditingItem] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form fields
  const [itemName, setItemName] = useState('');
  const [itemRate, setItemRate] = useState('');
  const [itemUnit, setItemUnit] = useState('Unit');
  const [variants, setVariants] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    quotationService
      .getCatalogItems({ forceRefresh: true })
      .then((res) => {
        if (res?.data) setItems(res.data);
      })
      .catch((err) => {
        console.error('Failed to load catalog:', err);
      })
      .finally(() => setLoading(false));

    const unsub = quotationService.subscribeCatalog((updatedList) => {
      setItems(updatedList);
    });
    return () => unsub();
  }, [isOpen]);

  const handleStartAdd = () => {
    setEditingItem(null);
    setItemName('');
    setItemRate('');
    setItemUnit('Unit');
    setVariants([]);
    setIsEditing(true);
  };

  const handleStartEdit = (it) => {
    setEditingItem(it);
    setItemName(it.name || '');
    setItemRate(it.rate || '');
    setItemUnit(it.unit || 'Unit');
    setVariants(Array.isArray(it.variants) ? it.variants.map((v) => ({ ...v })) : []);
    setIsEditing(true);
  };

  const handleAddVariant = () => {
    setVariants([...variants, { name: '', rate: '' }]);
  };

  const handleUpdateVariant = (index, field, value) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const handleRemoveVariant = (index) => {
    setVariants(variants.filter((_, idx) => idx !== index));
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();
    if (!itemName.trim()) {
      alert('Item name is required (वस्तु का नाम आवश्यक है)');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        id: editingItem?.id,
        name: itemName.trim(),
        rate: Number(itemRate) || 0,
        unit: itemUnit.trim() || 'Unit',
        variants: variants
          .filter((v) => v.name && v.name.trim())
          .map((v) => ({
            name: v.name.trim(),
            rate: Number(v.rate) || 0,
          })),
      };

      await quotationService.saveCatalogItem(payload);
      if (onNotify) {
        onNotify(`Item "${payload.name}" saved to catalog successfully!`, 'success');
      }
      setIsEditing(false);
      setEditingItem(null);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (it) => {
    if (!window.confirm(`Delete "${it.name}" from catalog?`)) return;
    try {
      await quotationService.deleteCatalogItem(it.id);
      if (onNotify) {
        onNotify(`Item "${it.name}" deleted from catalog`, 'info');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete item');
    }
  };

  const filteredItems = items.filter((it) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      it.name?.toLowerCase().includes(q) ||
      it.unit?.toLowerCase().includes(q) ||
      (Array.isArray(it.variants) && it.variants.some((v) => v.name?.toLowerCase().includes(q)))
    );
  });

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop-luxury luxury-glass-backdrop" onClick={onClose}>
      <div
        className="modern-order-modal-card"
        style={{ maxWidth: '820px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modern-modal-header">
          <div className="modern-header-left">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '1.4rem' }}>📦</span>
              <div>
                <h3 className="modern-modal-title" style={{ margin: 0 }}>
                  Saved Items & Rates Master (रेट सेविंग)
                </h3>
                <p style={{ margin: 0, fontSize: '0.74rem', color: '#93c5fd', fontWeight: 600 }}>
                  वस्तु और रेट एक बार डालें — कोटेशन बनाते समय अपने आप रेट आ जाएगा
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn-modern-close"
            onClick={onClose}
            title="Close modal"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="modern-modal-body-scroll" style={{ padding: '1.25rem' }}>
          {isEditing ? (
            /* Item Add / Edit Form */
            <form onSubmit={handleSaveItem} className="modern-modal-form-shell">
              <div className="modern-section-card basic-info-card" style={{ marginBottom: '1rem' }}>
                <div className="modern-card-header-line">
                  <div className="card-title-group">
                    <span
                      className="card-num-badge"
                      style={{
                        background: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #dbeafe',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      ✏️
                    </span>
                    <h4 className="card-heading-title">
                      {editingItem ? `Edit Item: ${editingItem.name}` : 'Add New Item & Rate (नई वस्तु जोड़ें)'}
                    </h4>
                  </div>
                </div>

                <div className="modern-inputs-grid-3col">
                  {/* Name */}
                  <div className="modern-form-field">
                    <label className="field-lbl required">Item Name (वस्तु का नाम) *</label>
                    <input
                      type="text"
                      className="modern-input-ctrl font-semibold"
                      placeholder="e.g. Sheet Metal, Angle 40x5, Pipe..."
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  {/* Rate */}
                  <div className="modern-form-field">
                    <label className="field-lbl required">Default Rate (रेट ₹) *</label>
                    <div className="input-with-icon">
                      <span style={{ color: '#2563eb', fontWeight: 800, paddingLeft: '0.65rem' }}>₹</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        className="modern-input-ctrl font-mono"
                        style={{ fontWeight: 700 }}
                        placeholder="e.g. 30"
                        value={itemRate}
                        onChange={(e) => setItemRate(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Unit */}
                  <div className="modern-form-field">
                    <label className="field-lbl">Unit (इकाई)</label>
                    <input
                      type="text"
                      className="modern-input-ctrl"
                      placeholder="Unit, kg, piece, ft, mm..."
                      value={itemUnit}
                      onChange={(e) => setItemUnit(e.target.value)}
                    />
                  </div>
                </div>

                {/* Multiple Variants / 2 Rates Section */}
                <div style={{ marginTop: '1.25rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <h5 style={{ margin: '0 0 0.2rem', fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>
                        Options / Variants (एक में 2 वस्तु या अलग-अलग रेट)
                      </h5>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                        जैसे: 4mm का 30 और 5mm का 40 — कोटेशन में जो चुनेंगे उसका रेट लगेगा
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn-add-table-row"
                      onClick={handleAddVariant}
                      style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}
                    >
                      ＋ Add Variant (ऑप्शन जोड़ें)
                    </button>
                  </div>

                  {variants.length === 0 ? (
                    <div className="variants-empty-hint" style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '10px', padding: '1rem', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
                      Single rate item. If this item has 2 or more sizes / thickness with different rates (e.g. 4mm @ ₹30, 5mm @ ₹40), click "＋ Add Variant" above.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {variants.map((v, vIdx) => (
                        <div
                          key={vIdx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.65rem',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            padding: '0.6rem 0.8rem',
                          }}
                        >
                          <input
                            type="text"
                            className="modern-input-ctrl"
                            style={{ flex: 1.5, background: '#ffffff' }}
                            placeholder="Variant / Size (e.g. 4mm, 5mm, 14 gauge...)"
                            value={v.name}
                            onChange={(e) => handleUpdateVariant(vIdx, 'name', e.target.value)}
                            required
                          />
                          <div className="input-with-icon" style={{ flex: 1 }}>
                            <span style={{ color: '#2563eb', fontWeight: 800, paddingLeft: '0.65rem' }}>₹</span>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              className="modern-input-ctrl font-mono"
                              style={{ background: '#ffffff', fontWeight: 700 }}
                              placeholder="Rate"
                              value={v.rate}
                              onChange={(e) => handleUpdateVariant(vIdx, 'rate', e.target.value)}
                              required
                            />
                          </div>
                          <button
                            type="button"
                            className="btn-table-remove-row"
                            onClick={() => handleRemoveVariant(vIdx)}
                            title="Remove option"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Form Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                  <button
                    type="button"
                    className="btn btn-secondary-luxury btn-cancel"
                    onClick={() => {
                      setIsEditing(false);
                      setEditingItem(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-modern-save-submit"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : '✓ Save Item & Rate (सेव करें)'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* Items Catalog List */
            <>
              {/* Search & Add Bar */}
              <div className="catalog-toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div className="catalog-search-wrap" style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
                  <input
                    type="text"
                    className="modern-input-ctrl"
                    style={{ paddingLeft: '2.4rem', borderRadius: '12px', background: '#ffffff' }}
                    placeholder="Search saved items & materials..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                    🔍
                  </span>
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="btn-modern-save-submit"
                  style={{ padding: '0.6rem 1.1rem', fontSize: '0.88rem' }}
                  onClick={handleStartAdd}
                >
                  ＋ Add New Item (नई वस्तु)
                </button>
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                  <span>Loading items catalog...</span>
                </div>
              ) : items.length === 0 ? (
                <div className="empty-workers-state" style={{ padding: '2rem 1rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📦</div>
                  <h4 style={{ margin: '0 0 0.5rem', fontWeight: 800 }}>No Saved Items Yet</h4>
                  <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 1rem' }}>
                    Add items and standard rates here once, and they will auto-fill whenever you make a quotation!
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-empty-cta"
                    onClick={handleStartAdd}
                  >
                    ＋ Add First Item Now (पहली वस्तु जोड़ें)
                  </button>
                </div>
              ) : filteredItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', background: '#f8fafc', borderRadius: '12px' }}>
                  <span>No items match "{search}"</span>
                </div>
              ) : (
                <div className="catalog-items-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
                  {filteredItems.map((it) => (
                    <div
                      key={it.id}
                      className="catalog-item-card"
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '14px',
                        padding: '1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        boxShadow: '0 2px 6px rgba(15, 23, 42, 0.04)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem' }}>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>{it.name}</h4>
                          <span
                            className="font-mono"
                            style={{
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              fontWeight: 800,
                              fontSize: '0.9rem',
                              padding: '0.2rem 0.55rem',
                              borderRadius: '8px',
                              border: '1px solid #bfdbfe',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            ₹{it.rate}
                          </span>
                        </div>

                        {it.unit && it.unit !== 'Unit' && (
                          <span style={{ fontSize: '0.72rem', color: '#64748b', background: '#f1f5f9', padding: '0.15rem 0.45rem', borderRadius: '4px' }}>
                            Per {it.unit}
                          </span>
                        )}

                        {/* Variants pill display */}
                        {Array.isArray(it.variants) && it.variants.length > 0 && (
                          <div style={{ marginTop: '0.6rem' }}>
                            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                              Variants / Options:
                            </span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                              {it.variants.map((v, idx) => (
                                <span
                                  key={idx}
                                  style={{
                                    fontSize: '0.72rem',
                                    background: '#f8fafc',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '6px',
                                    padding: '0.15rem 0.45rem',
                                    color: '#334155',
                                    fontWeight: 600,
                                  }}
                                >
                                  {v.name}: <strong style={{ color: '#1d4ed8' }}>₹{v.rate}</strong>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.65rem' }}>
                        <button
                          type="button"
                          className="btn btn-secondary-luxury"
                          style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                          onClick={() => handleStartEdit(it)}
                          title="Edit Item"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          style={{
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            borderRadius: '8px',
                            padding: '0.35rem 0.65rem',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                          onClick={() => handleDeleteItem(it)}
                          title="Delete Item"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default QuotationCatalogModal;
