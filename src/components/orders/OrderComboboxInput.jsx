import React, { useState, useRef, useEffect } from 'react';
import {
  getFieldOptions,
  addFieldOption,
  editFieldOption,
  deleteFieldOption,
  getStoredDropdownOptions,
} from '../../utils/orderDropdownSettings';
import { orderService } from '../../services/orderService';

/**
 * OrderComboboxInput
 * Allows selecting from a bilingual dropdown WITHOUT opening on-screen mobile keyboard,
 * while still allowing freeform typing when the user explicitly wants to type.
 * Also supports dynamic ADD, EDIT, and DELETE of dropdown options with backend persistence.
 */
export function OrderComboboxInput({
  value = '',
  onChange,
  options = [],
  placeholder = 'यहाँ विवरण लिखें या चुनें...',
  readOnly = false,
  id,
  className = '',
  fieldKey = '',
  fieldLabel = '',
  allowManageOptions = true,
}) {
  // Resolve options using stored custom options if fieldKey is present
  const [localOptions, setLocalOptions] = useState(() => {
    if (fieldKey) {
      return getFieldOptions(fieldKey, options);
    }
    return Array.isArray(options) ? options : [];
  });

  // Listen for dropdown options update events
  useEffect(() => {
    if (fieldKey) {
      const updated = getFieldOptions(fieldKey, options);
      setLocalOptions(updated);
    } else {
      setLocalOptions(Array.isArray(options) ? options : []);
    }
  }, [fieldKey, options]);

  useEffect(() => {
    function handleOptionsChanged() {
      if (fieldKey) {
        setLocalOptions(getFieldOptions(fieldKey, options));
      }
    }
    window.addEventListener('orderDropdownOptionsChanged', handleOptionsChanged);
    return () => window.removeEventListener('orderDropdownOptionsChanged', handleOptionsChanged);
  }, [fieldKey, options]);

  const safeOptions = Array.isArray(localOptions) ? localOptions : [];
  const hasOptions = safeOptions.length > 0 || (allowManageOptions && !readOnly && !!fieldKey);

  // If value is set and not in safeOptions, start in custom typing mode
  const isCustomInitial = safeOptions.length > 0 && value && !safeOptions.includes(value);
  const [isCustomTyping, setIsCustomTyping] = useState(isCustomInitial);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Management states
  const [isManaging, setIsManaging] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editingText, setEditingText] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newOptionText, setNewOptionText] = useState('');

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const newOptionInputRef = useRef(null);
  const editOptionInputRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsManaging(false);
        setIsAddingNew(false);
        setEditingIndex(-1);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectOption = (opt) => {
    if (isManaging) return;
    if (onChange) {
      onChange(opt);
    }
    setIsOpen(false);
    setIsCustomTyping(false);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleStartCustomTyping = (e) => {
    if (e) e.stopPropagation();
    setIsCustomTyping(true);
    setIsOpen(false);
    setIsManaging(false);
    setIsAddingNew(false);
    setEditingIndex(-1);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 60);
  };

  const handleSwitchToSelectMode = (e) => {
    if (e) e.stopPropagation();
    setIsCustomTyping(false);
    setIsOpen(true);
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleFieldClick = () => {
    if (readOnly) return;
    if (hasOptions && !isCustomTyping) {
      setIsOpen((prev) => !prev);
    }
  };

  const handleKeyDown = (e) => {
    if (readOnly || !hasOptions || safeOptions.length === 0 || isManaging) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(0);
      } else {
        setHighlightedIndex((prev) => (prev < safeOptions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightedIndex(safeOptions.length - 1);
      } else {
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : safeOptions.length - 1));
      }
    } else if (e.key === 'Enter') {
      if (isOpen && highlightedIndex >= 0 && highlightedIndex < safeOptions.length) {
        e.preventDefault();
        handleSelectOption(safeOptions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setIsManaging(false);
      setIsAddingNew(false);
      setEditingIndex(-1);
    }
  };

  // Add new option handler
  const handleAddNewOption = (e) => {
    if (e) e.stopPropagation();
    const trimmed = (newOptionText || '').trim();
    if (!trimmed) return;

    if (fieldKey) {
      const updated = addFieldOption(fieldKey, trimmed);
      setLocalOptions(updated);
      orderService.updateDropdownOptions(getStoredDropdownOptions());
    } else {
      setLocalOptions((prev) => [...prev, trimmed]);
    }

    if (onChange) {
      onChange(trimmed);
    }

    setNewOptionText('');
    setIsAddingNew(false);
    setIsOpen(false);
    setIsCustomTyping(false);
  };

  // Save edited option handler
  const handleSaveOptionEdit = (oldOpt, e) => {
    if (e) e.stopPropagation();
    const trimmed = (editingText || '').trim();
    if (!trimmed || trimmed === oldOpt) {
      setEditingIndex(-1);
      return;
    }

    if (fieldKey) {
      const updated = editFieldOption(fieldKey, oldOpt, trimmed);
      setLocalOptions(updated);
      orderService.updateDropdownOptions(getStoredDropdownOptions());
    }

    if (value === oldOpt && onChange) {
      onChange(trimmed);
    }

    setEditingIndex(-1);
  };

  // Delete option handler
  const handleDeleteOption = (optToDelete, e) => {
    if (e) e.stopPropagation();
    const confirmed = window.confirm(`क्या आप विकल्प "${optToDelete}" हटाना चाहते हैं?\n(Delete this option from list?)`);
    if (!confirmed) return;

    if (fieldKey) {
      const updated = deleteFieldOption(fieldKey, optToDelete);
      setLocalOptions(updated);
      orderService.updateDropdownOptions(getStoredDropdownOptions());
    }

    if (value === optToDelete && onChange) {
      onChange('');
    }
  };

  const isInputReadOnly = readOnly || (hasOptions && !isCustomTyping);

  return (
    <div
      ref={containerRef}
      className={`order-combobox-wrapper ${isOpen ? 'is-open' : ''} ${className}`}
    >
      <div
        className={`order-combobox-field ${hasOptions && !isCustomTyping ? 'clickable-select-field' : ''}`}
        onClick={handleFieldClick}
      >
        <input
          ref={inputRef}
          type="text"
          className={`modern-input-ctrl line-input order-combobox-input ${
            hasOptions && !isCustomTyping ? 'cursor-pointer-input' : ''
          }`}
          placeholder={hasOptions && !isCustomTyping ? 'चुनें या लिखें... / Select...' : placeholder}
          value={value || ''}
          onChange={(e) => onChange && onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          readOnly={isInputReadOnly}
          inputMode={isInputReadOnly ? 'none' : 'text'}
          autoComplete="off"
        />

        {!readOnly && (
          <div className="order-combobox-actions">
            {/* Clear Button */}
            {value && (
              <button
                type="button"
                className="btn-combobox-clear"
                title="हटाएं / Clear"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onChange) onChange('');
                  if (isCustomTyping && inputRef.current) {
                    inputRef.current.focus();
                  }
                }}
              >
                ✕
              </button>
            )}

            {/* If has options: Switch to Typing (Pencil) or Switch to Select */}
            {hasOptions && (
              <>
                {!isCustomTyping ? (
                  <button
                    type="button"
                    className="btn-combobox-pencil"
                    title="खुद लिखें / Type custom text"
                    onClick={handleStartCustomTyping}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      <path d="m15 5 4 4" />
                    </svg>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-combobox-list"
                    title="विकल्पों से चुनें / Choose from options"
                    onClick={handleSwitchToSelectMode}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" />
                      <line x1="3" y1="12" x2="3.01" y2="12" />
                      <line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                  </button>
                )}

                {/* Dropdown Toggle Chevron */}
                <button
                  type="button"
                  className={`btn-combobox-toggle ${isOpen ? 'active' : ''}`}
                  title="विकल्प सूची / Options list"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen((prev) => !prev);
                  }}
                  tabIndex={-1}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Floating Dropdown List */}
      {!readOnly && isOpen && hasOptions && (
        <div className="order-combobox-menu animate-fade-in" role="listbox" onClick={(e) => e.stopPropagation()}>
          <div className="combobox-menu-header">
            <span className="combobox-menu-header-title">
              {isManaging ? 'विकल्प बदलें या हटाएं (Edit Options)' : 'विकल्प चुनें (Choose Option)'}
            </span>

            <div className="combobox-header-actions">
              {allowManageOptions && safeOptions.length > 0 && (
                <button
                  type="button"
                  className={`btn-combobox-mode-toggle ${isManaging ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsManaging((prev) => !prev);
                    setIsAddingNew(false);
                    setEditingIndex(-1);
                  }}
                  title={isManaging ? 'सामान्य मोड (Exit edit mode)' : 'विकल्प जोड़ें / बदलें / हटाएं'}
                >
                  {isManaging ? '✓ पूर्ण' : '✏️ बदलें'}
                </button>
              )}
              {!isManaging && <span className="combobox-hint">टच करें</span>}
            </div>
          </div>

          <div className="combobox-options-scroll">
            {safeOptions.length === 0 && (
              <div className="combobox-empty-notice">
                <span>कोई पूर्व-निर्धारित विकल्प नहीं है (No preset options)</span>
              </div>
            )}

            {safeOptions.map((opt, idx) => {
              const isSelected = value === opt;
              const isHighlighted = highlightedIndex === idx;
              const isEditingThis = editingIndex === idx;

              if (isManaging && isEditingThis) {
                return (
                  <div key={idx} className="combobox-option-row combobox-editing-row">
                    <input
                      ref={editOptionInputRef}
                      type="text"
                      className="combobox-inline-edit-input"
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSaveOptionEdit(opt, e);
                        } else if (e.key === 'Escape') {
                          setEditingIndex(-1);
                        }
                      }}
                      autoFocus
                    />
                    <div className="combobox-inline-edit-actions">
                      <button
                        type="button"
                        className="btn-combobox-mini-save"
                        onClick={(e) => handleSaveOptionEdit(opt, e)}
                        title="सहेजें (Save)"
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        className="btn-combobox-mini-cancel"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingIndex(-1);
                        }}
                        title="रद्द करें (Cancel)"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              }

              if (isManaging) {
                return (
                  <div key={idx} className="combobox-option-row combobox-manage-row">
                    <span className="option-bilingual-text">{opt}</span>
                    <div className="combobox-manage-actions">
                      <button
                        type="button"
                        className="btn-option-action btn-option-edit"
                        title="बदलें / Rename"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingIndex(idx);
                          setEditingText(opt);
                          setTimeout(() => {
                            if (editOptionInputRef.current) editOptionInputRef.current.focus();
                          }, 50);
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          <path d="m15 5 4 4" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="btn-option-action btn-option-delete"
                        title="हटाएं / Delete"
                        onClick={(e) => handleDeleteOption(opt, e)}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={idx}
                  className={`combobox-option-row ${isSelected ? 'is-selected' : ''} ${
                    isHighlighted ? 'is-highlighted' : ''
                  }`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectOption(opt);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                >
                  <span className="option-bilingual-text">{opt}</span>
                  {isSelected && <span className="option-check-icon">✓</span>}
                </div>
              );
            })}

            {/* Inline Add Option Section */}
            {allowManageOptions && (
              <div className="combobox-add-container">
                {!isAddingNew ? (
                  <button
                    type="button"
                    className="combobox-add-trigger-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAddingNew(true);
                      setNewOptionText('');
                      setTimeout(() => {
                        if (newOptionInputRef.current) newOptionInputRef.current.focus();
                      }, 50);
                    }}
                  >
                    <span className="add-plus-symbol">＋</span>
                    <span>नया विकल्प जोड़ें... (Add New Option)</span>
                  </button>
                ) : (
                  <div className="combobox-add-input-row" onClick={(e) => e.stopPropagation()}>
                    <input
                      ref={newOptionInputRef}
                      type="text"
                      className="combobox-new-input"
                      placeholder="नया विकल्प लिखें... (e.g. BS6 New)"
                      value={newOptionText}
                      onChange={(e) => setNewOptionText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddNewOption(e);
                        } else if (e.key === 'Escape') {
                          setIsAddingNew(false);
                        }
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn-combobox-add-confirm"
                      onClick={handleAddNewOption}
                      disabled={!newOptionText.trim()}
                      title="जोड़ें (Add)"
                    >
                      जोड़ें
                    </button>
                    <button
                      type="button"
                      className="btn-combobox-add-cancel"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsAddingNew(false);
                      }}
                      title="रद्द करें (Cancel)"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Action Row: Type Custom Text */}
            {!isManaging && (
              <div
                className="combobox-option-row combobox-custom-action-row"
                onClick={handleStartCustomTyping}
              >
                <span className="option-bilingual-text custom-action-text">
                  ✍️ अन्य लिखें... (Type Custom Text)
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
