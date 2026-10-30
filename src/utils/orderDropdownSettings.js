/**
 * Order Dropdown Options Manager & Storage
 * Manages custom user-defined options for order specification fields
 * with local cache and real-time event broadcasting.
 */
import { ORDER_SECTIONS } from '../components/orders/orderConstants';

const STORAGE_KEY = 'fb_order_dropdown_options';

/**
 * Extract initial baseline options from ORDER_SECTIONS
 */
export function getDefaultDropdownOptions() {
  const defaults = {};

  ORDER_SECTIONS.forEach((section) => {
    if (Array.isArray(section.items)) {
      section.items.forEach((item) => {
        if (item.key) {
          defaults[item.key] = Array.isArray(item.options) ? [...item.options] : [];
        }
        if (item.extraKey) {
          defaults[item.extraKey] = Array.isArray(item.extraOptions) ? [...item.extraOptions] : [];
        }
      });
    }
  });

  return defaults;
}

/**
 * Get stored custom options from localStorage
 */
export function getStoredDropdownOptions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch (err) {
    console.error('Error reading stored dropdown options:', err);
    return {};
  }
}

/**
 * Get merged options for all fields (custom overrides default)
 */
export function getAllDropdownOptions() {
  const defaults = getDefaultDropdownOptions();
  const stored = getStoredDropdownOptions();
  const merged = { ...defaults };

  Object.entries(stored).forEach(([key, options]) => {
    if (Array.isArray(options)) {
      merged[key] = [...options];
    }
  });

  return merged;
}

/**
 * Get options for a specific field key
 */
export function getFieldOptions(fieldKey, fallbackOptions = []) {
  if (!fieldKey) return fallbackOptions;
  const stored = getStoredDropdownOptions();
  if (Array.isArray(stored[fieldKey])) {
    return stored[fieldKey];
  }
  const defaults = getDefaultDropdownOptions();
  if (Array.isArray(defaults[fieldKey])) {
    return defaults[fieldKey];
  }
  return fallbackOptions;
}

/**
 * Save custom options map to localStorage and broadcast event
 */
export function saveDropdownOptions(customOptionsMap, { emitEvent = true } = {}) {
  try {
    const cleanMap = {};
    if (customOptionsMap && typeof customOptionsMap === 'object') {
      Object.entries(customOptionsMap).forEach(([k, list]) => {
        if (Array.isArray(list)) {
          cleanMap[k] = list.map((s) => (typeof s === 'string' ? s.trim() : '')).filter(Boolean);
        }
      });
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanMap));

    if (emitEvent) {
      window.dispatchEvent(
        new CustomEvent('orderDropdownOptionsChanged', {
          detail: cleanMap,
        })
      );
    }

    return cleanMap;
  } catch (err) {
    console.error('Error saving dropdown options:', err);
    return {};
  }
}

/**
 * Add a new option to a specific field
 */
export function addFieldOption(fieldKey, newOptionText) {
  if (!fieldKey || !newOptionText || !newOptionText.trim()) return getFieldOptions(fieldKey);

  const cleanText = newOptionText.trim();
  const currentOptions = getFieldOptions(fieldKey);

  if (currentOptions.includes(cleanText)) {
    return currentOptions; // already exists
  }

  const updatedList = [...currentOptions, cleanText];
  const stored = getStoredDropdownOptions();
  stored[fieldKey] = updatedList;

  saveDropdownOptions(stored);
  return updatedList;
}

/**
 * Edit / Rename an existing option in a specific field
 */
export function editFieldOption(fieldKey, oldOptionText, newOptionText) {
  if (!fieldKey || !oldOptionText || !newOptionText || !newOptionText.trim()) {
    return getFieldOptions(fieldKey);
  }

  const cleanNew = newOptionText.trim();
  const currentOptions = getFieldOptions(fieldKey);
  const updatedList = currentOptions.map((opt) => (opt === oldOptionText ? cleanNew : opt));

  const stored = getStoredDropdownOptions();
  stored[fieldKey] = updatedList;

  saveDropdownOptions(stored);
  return updatedList;
}

/**
 * Delete an option from a specific field
 */
export function deleteFieldOption(fieldKey, optionToDelete) {
  if (!fieldKey || !optionToDelete) return getFieldOptions(fieldKey);

  const currentOptions = getFieldOptions(fieldKey);
  const updatedList = currentOptions.filter((opt) => opt !== optionToDelete);

  const stored = getStoredDropdownOptions();
  stored[fieldKey] = updatedList;

  saveDropdownOptions(stored);
  return updatedList;
}

/**
 * Reset a field's options back to initial factory default
 */
export function resetFieldOptions(fieldKey) {
  if (!fieldKey) return [];
  const stored = getStoredDropdownOptions();
  delete stored[fieldKey];
  saveDropdownOptions(stored);

  const defaults = getDefaultDropdownOptions();
  return defaults[fieldKey] || [];
}

/**
 * Reset all fields back to initial factory defaults
 */
export function resetAllFieldOptions() {
  saveDropdownOptions({});
  return getDefaultDropdownOptions();
}

