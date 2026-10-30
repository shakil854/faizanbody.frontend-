import React, { useState, useEffect } from 'react';
import { ORDER_SECTIONS } from './orderConstants';
import {
  getAllDropdownOptions,
  saveDropdownOptions,
  getDefaultDropdownOptions,
  resetFieldOptions,
  resetAllFieldOptions,
} from '../../utils/orderDropdownSettings';
import { orderService } from '../../services/orderService';

/**
 * OrderDropdownOptionsModal
 * Central management dialog to add, edit, delete, and re-order
 * options for all order specification dropdown fields.
 */
export function OrderDropdownOptionsModal({ isOpen, onClose, onSaved }) {
  const [optionsMap, setOptionsMap] = useState({});
  const [activeSectionKey, setActiveSectionKey] = useState('cabin_work');
  const [activeFieldKey, setActiveFieldKey] = useState('moro');
  const [newOptionText, setNewOptionText] = useState('');
  const [editingOption, setEditingOption] = useState(null); // { oldText, newText }
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Flatten all fields with section metadata
  const sectionsList = ORDER_SECTIONS.map((sec) => {
    const fields = [];
    if (Array.isArray(sec.items)) {
      sec.items.forEach((item) => {
        fields.push({
          key: item.key,
          label: item.label,
          labelEnglish: item.labelEnglish || item.subLabel || '',
        });
        if (item.extraKey) {
          fields.push({
            key: item.extraKey,
            label: item.extraLabel,
            labelEnglish: item.extraLabelEnglish || '',
          });
        }
      });
    }
    return {
      key: sec.key,
      titleHindi: sec.titleHindi,
      titleEnglish: sec.titleEnglish,
      fields,
    };
  });

  useEffect(() => {
    if (isOpen) {
      const merged = getAllDropdownOptions();
      setOptionsMap(merged);
      setStatusMessage('');
      setNewOptionText('');
      setEditingOption(null);

      // Also sync latest from backend
      orderService.getDropdownOptions().then(() => {
        setOptionsMap(getAllDropdownOptions());
      }).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentSection = sectionsList.find((s) => s.key === activeSectionKey) || sectionsList[0];
  const currentField = currentSection?.fields.find((f) => f.key === activeFieldKey) || currentSection?.fields[0];
  const activeKey = currentField?.key || activeFieldKey;
  const currentOptions = Array.isArray(optionsMap[activeKey]) ? optionsMap[activeKey] : [];

  const handleSelectSection = (secKey) => {
    setActiveSectionKey(secKey);
    const sec = sectionsList.find((s) => s.key === secKey);
    if (sec && sec.fields.length > 0) {
      setActiveFieldKey(sec.fields[0].key);
    }
    setNewOptionText('');
    setEditingOption(null);
  };

  const handleSelectField = (fieldKey) => {
    setActiveFieldKey(fieldKey);
    setNewOptionText('');
    setEditingOption(null);
  };

  // Add new option to current field
  const handleAddOption = (e) => {
    e.preventDefault();
    const trimmed = (newOptionText || '').trim();
    if (!trimmed) return;

    if (currentOptions.includes(trimmed)) {
      alert(`विकल्प "${trimmed}" पहले से मौजूद है! (Option already exists)`);
      return;
    }

    const updated = [...currentOptions, trimmed];
    const newMap = { ...optionsMap, [activeKey]: updated };
    setOptionsMap(newMap);
    saveDropdownOptions(newMap);
    setNewOptionText('');
    setStatusMessage(`✓ जोड़ा गया: ${trimmed}`);
    setTimeout(() => setStatusMessage(''), 2500);
  };

  // Save edited option
  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingOption) return;
    const { oldText, newText } = editingOption;
    const trimmed = (newText || '').trim();

    if (!trimmed || trimmed === oldText) {
      setEditingOption(null);
      return;
    }

    const updated = currentOptions.map((opt) => (opt === oldText ? trimmed : opt));
    const newMap = { ...optionsMap, [activeKey]: updated };
    setOptionsMap(newMap);
    saveDropdownOptions(newMap);
    setEditingOption(null);
    setStatusMessage(`✓ बदला गया: ${trimmed}`);
    setTimeout(() => setStatusMessage(''), 2500);
  };

  // Delete option
  const handleDeleteOption = (optToDelete) => {
    if (!window.confirm(`क्या आप विकल्प "${optToDelete}" हटाना चाहते हैं?`)) return;

    const updated = currentOptions.filter((opt) => opt !== optToDelete);
    const newMap = { ...optionsMap, [activeKey]: updated };
    setOptionsMap(newMap);
    saveDropdownOptions(newMap);
    setStatusMessage(`✓ हटाया गया: ${optToDelete}`);
    setTimeout(() => setStatusMessage(''), 2500);
  };

  // Reset this field to defaults
  const handleResetCurrentField = () => {
    if (!window.confirm(`क्या आप "${currentField?.label}" के सभी विकल्प डिफ़ॉल्ट पर रीसेट करना चाहते हैं?`)) {
      return;
    }
    const defaultList = resetFieldOptions(activeKey);
    setOptionsMap((prev) => ({ ...prev, [activeKey]: defaultList }));
    setStatusMessage('✓ डिफ़ॉल्ट विकल्प रीसेट किए गए');
    setTimeout(() => setStatusMessage(''), 2500);
  };

  // Reset all fields to defaults
  const handleResetAll = () => {
    if (!window.confirm('क्या आप सभी फ़ील्ड्स के विकल्प डिफ़ॉल्ट पर रीसेट करना चाहते हैं?')) {
      return;
    }
    const allDefaults = resetAllFieldOptions();
    setOptionsMap(allDefaults);
    setStatusMessage('✓ सभी फ़ील्ड्स डिफ़ॉल्ट पर रीसेट किए गए');
    setTimeout(() => setStatusMessage(''), 2500);
  };

  // Save everything to backend
  const handleSaveToBackend = async () => {
    try {
      setIsSaving(true);
      await orderService.updateDropdownOptions(optionsMap);
      if (onSaved) onSaved(optionsMap);
      setStatusMessage('✓ सर्वर पर सफलतापूर्वक सेव हो गया!');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error('Error syncing to server:', err);
      // Still preserved locally
      saveDropdownOptions(optionsMap);
      if (onSaved) onSaved(optionsMap);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop order-badge-modal-backdrop" onClick={onClose}>
      <div
        className="android-dialog luxury-dialog order-dropdown-settings-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="dropdown-modal-header">
          <div className="dropdown-modal-title-group">
            <div className="dialog-icon-wrapper order-settings-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </div>
            <div>
              <h3 className="dialog-title" style={{ margin: 0, textAlign: 'left' }}>
                ड्रॉपडाउन विकल्प सेटिंग्स <span className="eng-sub">(Dropdown Options Manager)</span>
              </h3>
              <p className="dialog-message" style={{ margin: '4px 0 0', textAlign: 'left', fontSize: '0.8rem' }}>
                ऑर्डर फॉर्म के विकल्पों को जोड़ें, एडिट करें या हटाएं:
              </p>
            </div>
          </div>
          <button type="button" className="btn-modal-close-round" onClick={onClose} title="बंद करें (Close)">
            ✕
          </button>
        </div>

        {/* Section Tabs */}
        <div className="dropdown-section-tabs-bar">
          {sectionsList.map((sec) => (
            <button
              key={sec.key}
              type="button"
              className={`dropdown-sec-tab ${activeSectionKey === sec.key ? 'active' : ''}`}
              onClick={() => handleSelectSection(sec.key)}
            >
              <span>{sec.titleHindi}</span>
              <span className="tab-en-badge">{sec.titleEnglish}</span>
            </button>
          ))}
        </div>

        {/* Main Body: 2 Columns (Field List on left, Options on right) */}
        <div className="dropdown-manager-body-grid">
          {/* Left Column: Fields in selected section */}
          <div className="dropdown-fields-sidebar">
            <div className="sidebar-subhead">फ़ील्ड चुनें (Select Field):</div>
            <div className="fields-scroll-list">
              {currentSection?.fields.map((fld) => {
                const count = Array.isArray(optionsMap[fld.key]) ? optionsMap[fld.key].length : 0;
                const isSelected = activeKey === fld.key;

                return (
                  <button
                    key={fld.key}
                    type="button"
                    className={`field-select-item ${isSelected ? 'is-active' : ''}`}
                    onClick={() => handleSelectField(fld.key)}
                  >
                    <div className="field-select-names">
                      <span className="field-select-hi">{fld.label}</span>
                      {fld.labelEnglish && <span className="field-select-en">({fld.labelEnglish})</span>}
                    </div>
                    <span className={`field-options-count-badge ${count > 0 ? 'has-items' : 'empty'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Manage options for selected field */}
          <div className="dropdown-options-editor-pane">
            <div className="editor-pane-header">
              <div>
                <h4 className="editor-field-title">
                  {currentField?.label}
                  {currentField?.labelEnglish && (
                    <span className="editor-field-subtitle"> ({currentField.labelEnglish})</span>
                  )}
                </h4>
                <span className="editor-field-summary">
                  कुल {currentOptions.length} विकल्प उपलब्ध हैं
                </span>
              </div>

              {currentOptions.length > 0 && (
                <button
                  type="button"
                  className="btn-field-reset-default"
                  onClick={handleResetCurrentField}
                  title="डिफ़ॉल्ट पर रीसेट करें"
                >
                  ↺ डिफ़ॉल्ट रीसेट
                </button>
              )}
            </div>

            {/* Notification banner */}
            {statusMessage && (
              <div className="dropdown-status-toast animate-fade-in">
                {statusMessage}
              </div>
            )}

            {/* Add New Option Form */}
            <form className="add-option-inline-form" onSubmit={handleAddOption}>
              <div className="add-input-with-button">
                <input
                  type="text"
                  className="modern-input-ctrl new-option-input-box"
                  placeholder={`नया विकल्प लिखें (e.g. BS6 New) ...`}
                  value={newOptionText}
                  onChange={(e) => setNewOptionText(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn-add-option-submit"
                  disabled={!newOptionText.trim()}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>जोड़ें (Add)</span>
                </button>
              </div>
            </form>

            {/* Options List */}
            <div className="editor-options-list-container">
              {currentOptions.length === 0 ? (
                <div className="empty-options-placeholder">
                  <span className="empty-icon">📋</span>
                  <p>इस फ़ील्ड में कोई विकल्प नहीं है। ऊपर से नया विकल्प जोड़ें।</p>
                </div>
              ) : (
                <div className="options-items-stack">
                  {currentOptions.map((opt, idx) => {
                    const isEditing = editingOption && editingOption.oldText === opt;

                    if (isEditing) {
                      return (
                        <div key={idx} className="option-item-card is-editing-card">
                          <input
                            type="text"
                            className="modern-input-ctrl inline-edit-box"
                            value={editingOption.newText}
                            onChange={(e) =>
                              setEditingOption((prev) => ({ ...prev, newText: e.target.value }))
                            }
                            autoFocus
                          />
                          <div className="inline-edit-btn-group">
                            <button
                              type="button"
                              className="btn-inline-save"
                              onClick={handleSaveEdit}
                              title="सहेजें"
                            >
                              ✓
                            </button>
                            <button
                              type="button"
                              className="btn-inline-cancel"
                              onClick={() => setEditingOption(null)}
                              title="रद्द करें"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={idx} className="option-item-card">
                        <div className="option-text-group">
                          <span className="option-index-badge">{idx + 1}</span>
                          <span className="option-label-text">{opt}</span>
                        </div>
                        <div className="option-card-actions">
                          <button
                            type="button"
                            className="btn-option-card-action btn-card-edit"
                            title="एडिट करें"
                            onClick={() => setEditingOption({ oldText: opt, newText: opt })}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                              <path d="m15 5 4 4" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="btn-option-card-action btn-card-delete"
                            title="हटाएं"
                            onClick={() => handleDeleteOption(opt)}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="dialog-actions-row dropdown-modal-footer">
          <button
            type="button"
            className="btn-reset-all-link"
            onClick={handleResetAll}
          >
            सभी फ़ील्ड्स रीसेट करें
          </button>

          <div className="footer-right-buttons">
            <button
              type="button"
              className="android-btn btn-ghost"
              onClick={onClose}
              disabled={isSaving}
            >
              बंद करें (Close)
            </button>
            <button
              type="button"
              className="android-btn btn-primary-gradient"
              onClick={handleSaveToBackend}
              disabled={isSaving}
            >
              {isSaving ? 'सहेज रहे हैं...' : '✓ सर्वर पर सहेजें (Save All)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderDropdownOptionsModal;

