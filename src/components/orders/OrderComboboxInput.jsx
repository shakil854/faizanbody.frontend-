import React, { useState, useRef, useEffect } from 'react';

/**
 * OrderComboboxInput
 * Allows typing freeform text OR selecting from a bilingual dropdown list of options.
 * Matches Faizan Body physical job card specifications.
 */
export function OrderComboboxInput({
  value = '',
  onChange,
  options = [],
  placeholder = 'यहाँ विवरण लिखें या चुनें...',
  readOnly = false,
  id,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const safeOptions = Array.isArray(options) ? options : [];
  const datalistId = id ? `datalist-${id}` : undefined;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
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
    if (onChange) {
      onChange(opt);
    }
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (readOnly || safeOptions.length === 0) return;

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
    }
  };

  return (
    <div
      ref={containerRef}
      className={`order-combobox-wrapper ${isOpen ? 'is-open' : ''} ${className}`}
    >
      <div className="order-combobox-field">
        <input
          ref={inputRef}
          type="text"
          className="modern-input-ctrl line-input order-combobox-input"
          placeholder={placeholder}
          value={value || ''}
          onChange={(e) => onChange && onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          list={datalistId}
          autoComplete="off"
        />

        {datalistId && safeOptions.length > 0 && (
          <datalist id={datalistId}>
            {safeOptions.map((opt, i) => (
              <option key={i} value={opt} />
            ))}
          </datalist>
        )}

        {!readOnly && (
          <div className="order-combobox-actions">
            {value && (
              <button
                type="button"
                className="btn-combobox-clear"
                title="हटाएं / Clear"
                onClick={() => {
                  if (onChange) onChange('');
                  if (inputRef.current) inputRef.current.focus();
                }}
              >
                ✕
              </button>
            )}

            {safeOptions.length > 0 && (
              <button
                type="button"
                className={`btn-combobox-toggle ${isOpen ? 'active' : ''}`}
                title="विकल्प चुनें / Choose options"
                onClick={() => setIsOpen((prev) => !prev)}
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
            )}
          </div>
        )}
      </div>

      {/* Floating Dropdown List */}
      {!readOnly && isOpen && safeOptions.length > 0 && (
        <div className="order-combobox-menu animate-fade-in" role="listbox">
          <div className="combobox-menu-header">
            <span>सुझाए गए विकल्प (Suggested Options)</span>
            <span className="combobox-hint">क्लिक करें या लिखें</span>
          </div>

          <div className="combobox-options-scroll">
            {safeOptions.map((opt, idx) => {
              const isSelected = value === opt;
              const isHighlighted = highlightedIndex === idx;

              return (
                <div
                  key={idx}
                  className={`combobox-option-row ${isSelected ? 'is-selected' : ''} ${
                    isHighlighted ? 'is-highlighted' : ''
                  }`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectOption(opt)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                >
                  <span className="option-bilingual-text">{opt}</span>
                  {isSelected && <span className="option-check-icon">✓</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
