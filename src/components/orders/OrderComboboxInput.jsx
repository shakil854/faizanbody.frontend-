import React, { useState, useRef, useEffect } from 'react';

/**
 * OrderComboboxInput
 * Allows selecting from a bilingual dropdown WITHOUT opening on-screen mobile keyboard,
 * while still allowing freeform typing when the user explicitly wants to type.
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
  const safeOptions = Array.isArray(options) ? options : [];
  const hasOptions = safeOptions.length > 0;

  // If value is set and not in safeOptions, start in custom typing mode
  const isCustomInitial = hasOptions && value && !safeOptions.includes(value);
  const [isCustomTyping, setIsCustomTyping] = useState(isCustomInitial);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const containerRef = useRef(null);
  const inputRef = useRef(null);

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
    setIsCustomTyping(false);
    // Explicitly blur so mobile keyboard NEVER opens on select!
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleStartCustomTyping = (e) => {
    if (e) e.stopPropagation();
    setIsCustomTyping(true);
    setIsOpen(false);
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
    if (readOnly || !hasOptions) return;

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

  // Determine if input should be readOnly:
  // 1. If form is in readOnly (viewMode) -> true
  // 2. If field has options and user is in Select Mode -> true (prevents mobile keyboard!)
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

      {/* Floating Dropdown List (No Keyboard) */}
      {!readOnly && isOpen && hasOptions && (
        <div className="order-combobox-menu animate-fade-in" role="listbox">
          <div className="combobox-menu-header">
            <span>विकल्प चुनें (Choose Option)</span>
            <span className="combobox-hint">टच करें</span>
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

            {/* Action Row: Type Custom Text */}
            <div
              className="combobox-option-row combobox-custom-action-row"
              onClick={handleStartCustomTyping}
            >
              <span className="option-bilingual-text custom-action-text">
                ✍️ अन्य लिखें... (Type Custom Text)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
