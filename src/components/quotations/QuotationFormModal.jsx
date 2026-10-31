import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { quotationService } from '../../services/quotationService';

// Storage key so configured items and rates persist across all future quotations
const DEFAULT_ITEMS_STORAGE_KEY = 'faizanbody_quotation_default_items';

// Helper to create a clean blank item (no hardcoded names)
const createBlankItem = (id = String(Date.now())) => ({
  id,
  catalog_id: null,
  name: '',
  has_options: false,
  options: [
    { id: '1', name: '', rate: '' },
    { id: '2', name: '', rate: '' },
  ],
  selected_option_index: 0,
  rate: '',
  qty: '10',
  amount: 0,
});

// Helper to normalize any item format from database, localStorage, or initialData
const normalizeItem = (raw, fallbackId = String(Date.now())) => {
  let options = [];

  if (Array.isArray(raw.variants) && raw.variants.length > 0) {
    options = raw.variants.map((v, i) => ({
      id: String(i + 1),
      name: v.name !== undefined ? String(v.name) : '',
      rate: v.rate !== undefined ? String(v.rate) : '',
    }));
  } else if (Array.isArray(raw.options) && raw.options.length > 0) {
    options = raw.options.map((opt, i) => ({
      id: opt.id || String(i + 1),
      name: opt.name !== undefined ? String(opt.name) : '',
      rate: opt.rate !== undefined ? String(opt.rate) : '',
    }));
  } else if (raw.has_two_options || raw.opt1_name || raw.opt2_name) {
    options = [
      { id: '1', name: String(raw.opt1_name || ''), rate: String(raw.opt1_rate ?? '') },
      { id: '2', name: String(raw.opt2_name || ''), rate: String(raw.opt2_rate ?? '') },
    ];
  }

  const hasOptions = options.length > 0;
  let selIdx = 0;
  if (typeof raw.selected_option_index === 'number' && raw.selected_option_index >= 0 && raw.selected_option_index < options.length) {
    selIdx = raw.selected_option_index;
  } else if (raw.selected_option === '2' && options.length >= 2) {
    selIdx = 1;
  } else if (raw.variant_name && options.length > 0) {
    const foundIdx = options.findIndex((opt) => opt.name === raw.variant_name);
    if (foundIdx !== -1) selIdx = foundIdx;
  }

  const activeRate = hasOptions
    ? String(options[selIdx]?.rate || '')
    : String(raw.rate !== undefined && raw.rate !== null ? raw.rate : '');

  const q = parseFloat(raw.qty) || 10;
  const r = parseFloat(activeRate) || 0;
  const amount = Math.round(r * q * 100) / 100;

  return {
    id: String(raw.id || fallbackId),
    catalog_id: raw.catalog_id || (raw.id && !isNaN(raw.id) ? raw.id : null),
    name: raw.name || '',
    has_options: hasOptions,
    options: hasOptions ? options : [
      { id: '1', name: '', rate: activeRate },
      { id: '2', name: '', rate: '' },
    ],
    selected_option_index: selIdx,
    rate: activeRate,
    qty: String(raw.qty !== undefined ? raw.qty : '10'),
    amount,
  };
};

export function QuotationFormModal({
  isOpen,
  onClose,
  initialData = null,
  onSave,
  onOpenPrint,
}) {
  const isEditMode = Boolean(initialData && initialData.id);
  const scrollRef = useRef(null);

  // Form Header Fields (Party Name, Date, Mobile, Chassis)
  const [quotationNo, setQuotationNo] = useState('');
  const [quotationDate, setQuotationDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [truckChassisNo, setTruckChassisNo] = useState('');
  const [status, setStatus] = useState('Draft');
  const [notes, setNotes] = useState('');

  // Items rows - starts with 1 clean row
  const [items, setItems] = useState(() => [createBlankItem('1')]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Extra and Discount percentage
  const [extraPercent, setExtraPercent] = useState('0');
  const [discountPercent, setDiscountPercent] = useState('0');

  const [isSaving, setIsSaving] = useState(false);
  const [templateSavedToast, setTemplateSavedToast] = useState(false);

  // Helper to load persistent template items from localStorage
  const loadSavedTemplateItems = () => {
    try {
      const raw = localStorage.getItem(DEFAULT_ITEMS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((it, idx) => normalizeItem(it, String(Date.now() + idx)));
        }
      }
    } catch {}
    return null;
  };

  // Populate initialData for edit, or load saved items from database/localStorage for new quotation
  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setQuotationNo(initialData.quotation_no || '');
      setQuotationDate(initialData.quotation_date || new Date().toISOString().split('T')[0]);
      setCustomerName(initialData.customer_name || '');
      setMobileNumber(initialData.mobile_number || '');
      setTruckChassisNo(initialData.truck_chassis_no || '');
      setStatus(initialData.status || 'Draft');
      setNotes(initialData.notes || '');
      setExtraPercent(String(initialData.extra_percent ?? '0'));
      setDiscountPercent(String(initialData.discount_percent ?? '0'));

      if (Array.isArray(initialData.items) && initialData.items.length > 0) {
        setItems(initialData.items.map((it, idx) => normalizeItem(it, String(idx + 1))));
      } else {
        setItems([createBlankItem('1')]);
      }
    } else {
      // New Quotation Defaults
      const today = new Date().toISOString().split('T')[0];
      setQuotationDate(today);
      setCustomerName('');
      setMobileNumber('');
      setTruckChassisNo('');
      setStatus('Draft');
      setNotes('');
      setExtraPercent('0');
      setDiscountPercent('0');

      // Generate default quotation no
      const year = new Date().getFullYear();
      const existing = quotationService.getCachedQuotations();
      const nextNum = existing.length + 1;
      setQuotationNo(`QT-${year}-${String(nextNum).padStart(3, '0')}`);

      // 1. Fetch saved items from Database Catalog FIRST
      setLoadingItems(true);
      quotationService
        .getCatalogItems({ forceRefresh: true })
        .then((res) => {
          const dbList = res?.data;
          if (Array.isArray(dbList) && dbList.length > 0) {
            const mapped = dbList.map((cat, idx) => normalizeItem(cat, String(cat.id || Date.now() + idx)));
            setItems(mapped);
            return;
          }

          // If database catalog was empty, check localStorage
          const localItems = loadSavedTemplateItems();
          if (localItems && localItems.length > 0) {
            setItems(localItems);
          } else {
            setItems([createBlankItem('1')]);
          }
        })
        .catch(() => {
          const localItems = loadSavedTemplateItems();
          if (localItems && localItems.length > 0) {
            setItems(localItems);
          } else {
            setItems([createBlankItem('1')]);
          }
        })
        .finally(() => setLoadingItems(false));
    }
  }, [isOpen, initialData]);

  // =========================================================================
  // Item Row Handlers
  // =========================================================================

  // Change generic field (name, qty, rate, etc.)
  const handleRowChange = (index, field, value) => {
    const updated = [...items];
    const row = { ...updated[index], [field]: value };

    // If changing rate directly
    if (field === 'rate') {
      row.rate = value;
      if (row.has_options && row.options?.[row.selected_option_index]) {
        const opts = [...row.options];
        opts[row.selected_option_index] = {
          ...opts[row.selected_option_index],
          rate: value,
        };
        row.options = opts;
      }
    }

    // Recalculate Amount = Rate * Qty
    const r = parseFloat(row.rate) || 0;
    const q = parseFloat(row.qty) || 0;
    row.amount = Math.round(r * q * 100) / 100;

    updated[index] = row;
    setItems(updated);
  };

  // Select an option line (by click or radio button)
  const handleSelectOption = (itemIndex, optIndex) => {
    const updated = [...items];
    const row = { ...updated[itemIndex] };
    row.selected_option_index = optIndex;

    const chosen = row.options?.[optIndex];
    row.rate = String(chosen?.rate || '');

    const r = parseFloat(row.rate) || 0;
    const q = parseFloat(row.qty) || 0;
    row.amount = Math.round(r * q * 100) / 100;

    updated[itemIndex] = row;
    setItems(updated);
  };

  // Update text or rate of a specific option
  const handleUpdateOption = (itemIndex, optIndex, field, value) => {
    const updated = [...items];
    const row = { ...updated[itemIndex] };
    const opts = Array.isArray(row.options) ? [...row.options] : [];
    opts[optIndex] = { ...opts[optIndex], [field]: value };
    row.options = opts;

    if (field === 'rate' && row.selected_option_index === optIndex) {
      row.rate = value;
    }

    const r = parseFloat(row.rate) || 0;
    const q = parseFloat(row.qty) || 0;
    row.amount = Math.round(r * q * 100) / 100;

    updated[itemIndex] = row;
    setItems(updated);
  };

  // Add another option to this item (3rd, 4th, 5th, etc.)
  const handleAddOption = (itemIndex) => {
    const updated = [...items];
    const row = { ...updated[itemIndex] };
    const opts = Array.isArray(row.options) ? [...row.options] : [];
    opts.push({
      id: String(Date.now()),
      name: '',
      rate: '',
    });
    row.options = opts;
    row.has_options = true;

    updated[itemIndex] = row;
    setItems(updated);
  };

  // Remove an option from this item
  const handleRemoveOption = (itemIndex, optIndex) => {
    const updated = [...items];
    const row = { ...updated[itemIndex] };
    let opts = Array.isArray(row.options) ? [...row.options] : [];
    opts = opts.filter((_, idx) => idx !== optIndex);

    if (opts.length === 0) {
      row.has_options = false;
      row.options = [
        { id: '1', name: '', rate: row.rate || '' },
        { id: '2', name: '', rate: '' },
      ];
      row.selected_option_index = 0;
    } else {
      row.options = opts;
      if (row.selected_option_index >= opts.length) {
        row.selected_option_index = Math.max(0, opts.length - 1);
      }
      row.rate = String(row.options[row.selected_option_index]?.rate || '');
    }

    const r = parseFloat(row.rate) || 0;
    const q = parseFloat(row.qty) || 0;
    row.amount = Math.round(r * q * 100) / 100;

    updated[itemIndex] = row;
    setItems(updated);
  };

  // Toggle between single rate and multi-options mode
  const handleToggleOptions = (itemIndex) => {
    const updated = [...items];
    const row = { ...updated[itemIndex] };
    const willEnable = !row.has_options;
    row.has_options = willEnable;

    if (willEnable) {
      if (!Array.isArray(row.options) || row.options.length < 2) {
        row.options = [
          { id: '1', name: '', rate: row.rate || '' },
          { id: '2', name: '', rate: '' },
        ];
      }
      row.selected_option_index = 0;
      row.rate = String(row.options[0]?.rate || row.rate || '');
    }

    const r = parseFloat(row.rate) || 0;
    const q = parseFloat(row.qty) || 0;
    row.amount = Math.round(r * q * 100) / 100;

    updated[itemIndex] = row;
    setItems(updated);
  };

  // Add new item row
  const handleAddRow = () => {
    setItems([...items, createBlankItem(String(Date.now()))]);
  };

  // Remove row (matching other modules with confirm & trash icon)
  const handleRemoveRow = async (index) => {
    const row = items[index];
    const itemName = row?.name ? `"${row.name}"` : 'this item';
    const confirmDelete = window.confirm(`Are you sure you want to delete ${itemName}? (क्या आप इस वस्तु को हटाना चाहते हैं?)`);
    if (!confirmDelete) return;

    if (items.length <= 1) {
      setItems([createBlankItem('1')]);
      return;
    }

    if (row?.catalog_id) {
      quotationService.deleteCatalogItem(row.catalog_id).catch(() => {});
    }

    const updated = items.filter((_, idx) => idx !== index);
    setItems(updated);

    try {
      localStorage.setItem(DEFAULT_ITEMS_STORAGE_KEY, JSON.stringify(updated.filter((it) => it.name && it.name.trim())));
    } catch {}
  };

  // Explicit button: Save current items as permanent default template in database & localStorage
  const handleSaveItemsAsDefault = async () => {
    const valid = items.filter((it) => it.name && it.name.trim());
    if (valid.length === 0) {
      alert('Please enter at least one item name before saving as default.');
      return;
    }

    try {
      localStorage.setItem(DEFAULT_ITEMS_STORAGE_KEY, JSON.stringify(valid));

      for (const it of valid) {
        const variantsList = it.has_options && Array.isArray(it.options)
          ? it.options.map((opt) => ({
              name: (opt.name || '').trim(),
              rate: parseFloat(opt.rate) || 0,
            }))
          : [];

        await quotationService.saveCatalogItem({
          id: it.catalog_id || undefined,
          name: it.name.trim(),
          rate: parseFloat(it.rate) || 0,
          unit: 'Unit',
          variants: variantsList,
        }).catch(() => {});
      }

      setTemplateSavedToast(true);
      setTimeout(() => setTemplateSavedToast(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Items saved locally!');
    }
  };

  // =========================================================================
  // Keyboard Navigation: Enter & Arrow Keys (↑ Upar, ↓ Niche, ← → Side)
  // =========================================================================
  const handleKeyDown = (e) => {
    const target = e.target;
    if (!target || !['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;

    const key = e.key;
    if (!['Enter', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(key)) return;

    const navRowAttr = target.getAttribute('data-nav-row');
    const navCol = target.getAttribute('data-nav-col');
    const navGroup = target.getAttribute('data-nav-group');
    const navName = target.getAttribute('data-nav-name');

    // Helper to safely focus an element and select text
    const focusInput = (selector) => {
      const el = document.querySelector(selector) || scrollRef.current?.querySelector(selector);
      if (el) {
        el.focus();
        if (typeof el.select === 'function' && el.tagName === 'INPUT') {
          try {
            el.select();
          } catch {}
        }
        return true;
      }
      return false;
    };

    // Helper to check cursor position
    const isAtStart = () => {
      try {
        if (target.type === 'number') return true;
        return target.selectionStart === 0 && target.selectionEnd === 0;
      } catch {
        return true;
      }
    };

    const isAtEnd = () => {
      try {
        if (target.type === 'number') return true;
        return target.selectionStart === target.value.length && target.selectionEnd === target.value.length;
      } catch {
        return true;
      }
    };

    // -----------------------------------------------------------------------
    // A. HEADER FIELDS NAVIGATION (Customer, Date, Mobile, Chassis)
    // -----------------------------------------------------------------------
    if (navGroup === 'header') {
      if (key === 'Enter' || (key === 'ArrowRight' && isAtEnd())) {
        e.preventDefault();
        if (navName === 'customer') focusInput('[data-nav-name="date"]');
        else if (navName === 'date') focusInput('[data-nav-name="mobile"]');
        else if (navName === 'mobile') focusInput('[data-nav-name="chassis"]');
        else if (navName === 'chassis') focusInput('[data-nav-row="0"][data-nav-col="name"]');
        return;
      }

      if (key === 'ArrowLeft' && isAtStart()) {
        e.preventDefault();
        if (navName === 'date') focusInput('[data-nav-name="customer"]');
        else if (navName === 'mobile') focusInput('[data-nav-name="date"]');
        else if (navName === 'chassis') focusInput('[data-nav-name="mobile"]');
        return;
      }

      if (key === 'ArrowDown') {
        e.preventDefault();
        if (navName === 'customer') focusInput('[data-nav-name="mobile"]');
        else if (navName === 'date') focusInput('[data-nav-name="chassis"]');
        else focusInput('[data-nav-row="0"][data-nav-col="name"]');
        return;
      }

      if (key === 'ArrowUp') {
        e.preventDefault();
        if (navName === 'mobile') focusInput('[data-nav-name="customer"]');
        else if (navName === 'chassis') focusInput('[data-nav-name="date"]');
        return;
      }
      return;
    }

    // -----------------------------------------------------------------------
    // B. SAVE BUTTON NAVIGATION
    // -----------------------------------------------------------------------
    if (navName === 'save-btn') {
      if (key === 'ArrowUp') {
        e.preventDefault();
        focusInput('[data-nav-name="discount"]');
        return;
      }
      // On Enter key, native button submission saves the quotation!
      return;
    }

    // -----------------------------------------------------------------------
    // C. SUMMARY FIELDS NAVIGATION (Extra %, Discount % -> Save Button)
    // -----------------------------------------------------------------------
    if (navGroup === 'summary') {
      if (key === 'Enter' || (key === 'ArrowRight' && isAtEnd()) || key === 'ArrowDown') {
        e.preventDefault();
        if (navName === 'extra') {
          focusInput('[data-nav-name="discount"]');
        } else if (navName === 'discount') {
          focusInput('[data-nav-name="save-btn"]');
        }
        return;
      }
      if ((key === 'ArrowLeft' && isAtStart()) || key === 'ArrowUp') {
        e.preventDefault();
        if (navName === 'discount') {
          focusInput('[data-nav-name="extra"]');
        } else if (navName === 'extra') {
          const lastIdx = items.length - 1;
          focusInput(`[data-nav-row="${lastIdx}"][data-nav-col="qty"]`);
        }
        return;
      }
      return;
    }

    // -----------------------------------------------------------------------
    // D. LEDGER TABLE ROWS NAVIGATION (Navigates existing items only - no auto add)
    // -----------------------------------------------------------------------
    if (navRowAttr !== null && navRowAttr !== undefined) {
      const rowIdx = parseInt(navRowAttr, 10);
      const row = items[rowIdx];
      if (!row) return;

      // 1. ENTER KEY: Forward step-by-step
      if (key === 'Enter') {
        e.preventDefault();
        if (navCol === 'name') {
          if (row.has_options) {
            const sel = row.selected_option_index || 0;
            if (!focusInput(`[data-nav-row="${rowIdx}"][data-nav-col="opt_rate"][data-nav-opt="${sel}"]`)) {
              focusInput(`[data-nav-row="${rowIdx}"][data-nav-col="opt_rate"]`);
            }
          } else {
            focusInput(`[data-nav-row="${rowIdx}"][data-nav-col="rate"]`);
          }
        } else if (navCol === 'rate' || navCol === 'opt_rate' || navCol === 'opt_name') {
          focusInput(`[data-nav-row="${rowIdx}"][data-nav-col="qty"]`);
        } else if (navCol === 'qty') {
          if (rowIdx < items.length - 1) {
            // Next existing row
            focusInput(`[data-nav-row="${rowIdx + 1}"][data-nav-col="name"]`);
          } else {
            // Last row reached -> Move down to Extra % (no auto-add)
            focusInput('[data-nav-name="extra"]');
          }
        }
        return;
      }

      // 2. ARROW DOWN (↓): Move to same column in row below, or move down to Extra %
      if (key === 'ArrowDown') {
        e.preventDefault();
        if (rowIdx < items.length - 1) {
          let focused = false;
          if (navCol === 'opt_rate' || navCol === 'opt_name') {
            focused = focusInput(`[data-nav-row="${rowIdx + 1}"][data-nav-col="${navCol}"]`);
            if (!focused) focused = focusInput(`[data-nav-row="${rowIdx + 1}"][data-nav-col="rate"]`);
          } else if (navCol === 'rate') {
            focused = focusInput(`[data-nav-row="${rowIdx + 1}"][data-nav-col="rate"]`);
            if (!focused) focused = focusInput(`[data-nav-row="${rowIdx + 1}"][data-nav-col="opt_rate"]`);
          } else {
            focused = focusInput(`[data-nav-row="${rowIdx + 1}"][data-nav-col="${navCol}"]`);
          }
        } else {
          // Last row reached -> Move down to Extra % (no auto-add)
          focusInput('[data-nav-name="extra"]');
        }
        return;
      }

      // 3. ARROW UP (↑): Move to same column in row above
      if (key === 'ArrowUp') {
        e.preventDefault();
        if (rowIdx > 0) {
          let focused = false;
          if (navCol === 'opt_rate' || navCol === 'opt_name') {
            focused = focusInput(`[data-nav-row="${rowIdx - 1}"][data-nav-col="${navCol}"]`);
            if (!focused) focused = focusInput(`[data-nav-row="${rowIdx - 1}"][data-nav-col="rate"]`);
          } else if (navCol === 'rate') {
            focused = focusInput(`[data-nav-row="${rowIdx - 1}"][data-nav-col="rate"]`);
            if (!focused) focused = focusInput(`[data-nav-row="${rowIdx - 1}"][data-nav-col="opt_rate"]`);
          } else {
            focused = focusInput(`[data-nav-row="${rowIdx - 1}"][data-nav-col="${navCol}"]`);
          }
        } else {
          // At Row 0: move up to Header
          if (navCol === 'name') focusInput('[data-nav-name="customer"]');
          else if (navCol === 'qty') focusInput('[data-nav-name="chassis"]');
          else focusInput('[data-nav-name="date"]');
        }
        return;
      }

      // 4. ARROW RIGHT (→): Move to next column
      if (key === 'ArrowRight' && isAtEnd()) {
        if (navCol === 'name') {
          e.preventDefault();
          if (row.has_options) {
            const sel = row.selected_option_index || 0;
            if (!focusInput(`[data-nav-row="${rowIdx}"][data-nav-col="opt_rate"][data-nav-opt="${sel}"]`)) {
              focusInput(`[data-nav-row="${rowIdx}"][data-nav-col="opt_name"]`);
            }
          } else {
            focusInput(`[data-nav-row="${rowIdx}"][data-nav-col="rate"]`);
          }
        } else if (navCol === 'opt_name') {
          e.preventDefault();
          const optIdx = target.getAttribute('data-nav-opt');
          focusInput(`[data-nav-row="${rowIdx}"][data-nav-col="opt_rate"][data-nav-opt="${optIdx}"]`);
        } else if (navCol === 'opt_rate' || navCol === 'rate') {
          e.preventDefault();
          focusInput(`[data-nav-row="${rowIdx}"][data-nav-col="qty"]`);
        } else if (navCol === 'qty') {
          if (rowIdx < items.length - 1) {
            e.preventDefault();
            focusInput(`[data-nav-row="${rowIdx + 1}"][data-nav-col="name"]`);
          }
        }
        return;
      }

      // 5. ARROW LEFT (←): Move to previous column
      if (key === 'ArrowLeft' && isAtStart()) {
        if (navCol === 'qty') {
          e.preventDefault();
          if (row.has_options) {
            const sel = row.selected_option_index || 0;
            if (!focusInput(`[data-nav-row="${rowIdx}"][data-nav-col="opt_rate"][data-nav-opt="${sel}"]`)) {
              focusInput(`[data-nav-row="${rowIdx}"][data-nav-col="opt_rate"]`);
            }
          } else {
            focusInput(`[data-nav-row="${rowIdx}"][data-nav-col="rate"]`);
          }
        } else if (navCol === 'opt_rate') {
          e.preventDefault();
          const optIdx = target.getAttribute('data-nav-opt');
          focusInput(`[data-nav-row="${rowIdx}"][data-nav-col="opt_name"][data-nav-opt="${optIdx}"]`);
        } else if (navCol === 'opt_name' || navCol === 'rate') {
          e.preventDefault();
          focusInput(`[data-nav-row="${rowIdx}"][data-nav-col="name"]`);
        } else if (navCol === 'name') {
          if (rowIdx > 0) {
            e.preventDefault();
            focusInput(`[data-nav-row="${rowIdx - 1}"][data-nav-col="qty"]`);
          } else {
            e.preventDefault();
            focusInput('[data-nav-name="customer"]');
          }
        }
        return;
      }
    }
  };

  // =========================================================================
  // Live Calculations (Matching handwritten photo: Total - 1100, Discount %, Final price)
  // =========================================================================

  const calculations = useMemo(() => {
    let subtotal = 0;
    items.forEach((it) => {
      const r = parseFloat(it.rate) || 0;
      const q = parseFloat(it.qty) || 0;
      subtotal += r * q;
    });
    subtotal = Math.round(subtotal * 100) / 100;

    const extP = Math.max(0, parseFloat(extraPercent) || 0);
    const extraAmt = Math.round(((subtotal * extP) / 100) * 100) / 100;

    const discP = Math.max(0, parseFloat(discountPercent) || 0);
    const discAmt = Math.round(((subtotal * discP) / 100) * 100) / 100;

    const finalPrice = Math.max(0, Math.round((subtotal + extraAmt - discAmt) * 100) / 100);

    return {
      subtotal,
      extraAmt,
      discAmt,
      finalPrice,
    };
  }, [items, extraPercent, discountPercent]);

  // =========================================================================
  // Submit Quotation
  // =========================================================================

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert('Please enter Customer / Party Name (ग्राहक का नाम लिखें)');
      return;
    }

    const validItems = items.filter((it) => it.name && it.name.trim());
    if (validItems.length === 0) {
      alert('Please add at least one item (कम से कम एक वस्तु का नाम लिखें)');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        quotation_no: quotationNo.trim(),
        quotation_date: quotationDate,
        customer_name: customerName.trim(),
        mobile_number: mobileNumber.trim(),
        truck_chassis_no: truckChassisNo.trim().toUpperCase(),
        items: validItems.map((it) => {
          const hasOpt = Boolean(it.has_options && Array.isArray(it.options) && it.options.length > 0);
          const selIdx = (typeof it.selected_option_index === 'number' && it.selected_option_index >= 0 && it.selected_option_index < (it.options?.length || 0))
            ? it.selected_option_index
            : 0;
          const chosenOpt = hasOpt ? it.options[selIdx] : null;
          const chosenVariant = chosenOpt?.name ? chosenOpt.name.trim() : '';
          const rateVal = parseFloat(it.rate) || 0;
          const qtyVal = parseFloat(it.qty) || 0;

          const variantsList = hasOpt
            ? it.options.map((opt) => ({
                name: (opt.name || '').trim(),
                rate: parseFloat(opt.rate) || 0,
              }))
            : [];

          return {
            name: it.name.trim(),
            has_options: hasOpt,
            options: hasOpt ? it.options : [],
            selected_option_index: selIdx,
            variant_name: chosenVariant,
            rate: rateVal,
            qty: qtyVal,
            amount: Math.round(rateVal * qtyVal * 100) / 100,
            variants: variantsList,
            // Backwards compatibility fields:
            has_two_options: hasOpt && it.options.length === 2,
            opt1_name: it.options?.[0]?.name || '',
            opt1_rate: parseFloat(it.options?.[0]?.rate) || 0,
            opt2_name: it.options?.[1]?.name || '',
            opt2_rate: parseFloat(it.options?.[1]?.rate) || 0,
            selected_option: String(selIdx + 1),
          };
        }),
        subtotal: calculations.subtotal,
        extra_percent: parseFloat(extraPercent) || 0,
        extra_amount: calculations.extraAmt,
        discount_percent: parseFloat(discountPercent) || 0,
        discount_amount: calculations.discAmt,
        final_price: calculations.finalPrice,
        notes: notes.trim(),
        status,
      };

      // Auto-save all items to Database Catalog & localStorage so they stay permanently!
      try {
        localStorage.setItem(DEFAULT_ITEMS_STORAGE_KEY, JSON.stringify(validItems));
        for (const it of validItems) {
          const variantsList = it.has_options && Array.isArray(it.options)
            ? it.options.map((opt) => ({
                name: (opt.name || '').trim(),
                rate: parseFloat(opt.rate) || 0,
              }))
            : [];

          quotationService.saveCatalogItem({
            id: it.catalog_id || undefined,
            name: it.name.trim(),
            rate: parseFloat(it.rate) || 0,
            unit: 'Unit',
            variants: variantsList,
          }).catch(() => {});
        }
      } catch {}

      await onSave(payload, initialData?.id);
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to save quotation');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop-luxury luxury-glass-backdrop" onClick={onClose}>
      <div
        className="modern-order-modal-card"
        style={{ maxWidth: '860px', maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================
            MODAL HEADER: MATCHING USER DRAWING "QUACATION"
            ======================================================== */}
        <div className="modern-modal-header" style={{ padding: '0.85rem 1.25rem' }}>
          <div className="modern-header-left">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '1.5rem' }}>📋</span>
              <div>
                <h3 className="modern-modal-title" style={{ margin: 0, fontSize: '1.15rem' }}>
                  {isEditMode ? `Edit Quotation #${quotationNo}` : 'Quotation (कोटेशन)'}
                </h3>
                <p style={{ margin: 0, fontSize: '0.74rem', color: '#93c5fd', fontWeight: 600 }}>
                  Faizan Body &bull; Name, Rate, Qty & Amount (नोटपैड अनुसार)
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

        {/* ========================================================
            MODAL BODY: FORM SHELL WITH KEYBOARD NAVIGATION
            ======================================================== */}
        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="modern-modal-form-shell">
          <div className="modern-modal-body-scroll" ref={scrollRef} style={{ padding: '1rem' }}>
            {/* Top Customer Info Bar (Customer Name & Date prominent at top like in paper) */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                marginBottom: '1rem',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '0.75rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              {/* Customer / Party Name */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '0.2rem' }}>
                  Customer / Party Name (ग्राहक का नाम) *
                </label>
                <input
                  type="text"
                  className="paper-input font-bold"
                  style={{ width: '100%', fontSize: '0.92rem' }}
                  placeholder="e.g. Hanif bhai pipadiya"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  data-nav-group="header"
                  data-nav-name="customer"
                  required
                  autoFocus
                />
              </div>

              {/* Date */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '0.2rem' }}>
                  Date (तारीख) *
                </label>
                <input
                  type="date"
                  className="paper-input font-mono"
                  style={{ width: '100%' }}
                  value={quotationDate}
                  onChange={(e) => setQuotationDate(e.target.value)}
                  data-nav-group="header"
                  data-nav-name="date"
                  required
                />
              </div>

              {/* Mobile */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '0.2rem' }}>
                  Mobile (मोबाइल नंबर - ऐच्छिक)
                </label>
                <input
                  type="tel"
                  className="paper-input"
                  style={{ width: '100%' }}
                  placeholder="e.g. 9876543210"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  data-nav-group="header"
                  data-nav-name="mobile"
                />
              </div>

              {/* Truck / Chassis No */}
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'block', marginBottom: '0.2rem' }}>
                  Truck / Chassis No (ट्रक नं)
                </label>
                <input
                  type="text"
                  className="paper-input font-mono"
                  style={{ width: '100%' }}
                  placeholder="e.g. GJ-01-AB-1234"
                  value={truckChassisNo}
                  onChange={(e) => setTruckChassisNo(e.target.value.toUpperCase())}
                  data-nav-group="header"
                  data-nav-name="chassis"
                />
              </div>
            </div>

            {/* ========================================================
                ITEMS & RATES CARD: NOTEPAD TABLE WITH ADD / EDIT
                ======================================================== */}
            <div
              className="modern-section-card drawing-table-card"
              style={{
                flexShrink: 0,
                padding: '0.85rem 1rem',
                marginBottom: '1rem',
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '14px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              {/* Card Header matching user screenshot */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                  borderBottom: '1px solid #f1f5f9',
                  paddingBottom: '0.6rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.3rem' }}>📦</span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0f172a' }}>
                      Items & Rates (वस्तु, रेट, मात्रा व रकम)
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>
                      वस्तु जोड़ें, रेट व 2 ऑप्शन बदलें — हर नए कोटेशन में सेव रहेंगी
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddRow}
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.45rem 0.95rem',
                    borderRadius: '8px',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <span>＋</span>
                  <span>Add Item (वस्तु जोड़ें)</span>
                </button>
              </div>

              {/* Clean Ledger Table Format - One Below Another */}
              <div className="quotation-ledger-table-wrap">
                <table className="quotation-ledger-table">
                  <thead>
                    <tr>
                      <th className="col-th-name">Name (वस्तु)</th>
                      <th className="col-th-rate">Rate (रेट ₹)</th>
                      <th className="col-th-qty">Qty (मात्रा)</th>
                      <th className="col-th-amount">Amount (रकम ₹)</th>
                      <th className="col-th-del"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingItems && items.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '1.25rem', color: '#64748b' }}>
                          ⏳ Loading saved items from database...
                        </td>
                      </tr>
                    )}
                    {items.map((row, idx) => (
                      <tr key={row.id || idx} className="quotation-ledger-tr">
                        {/* 1. Name */}
                        <td className="col-td-name">
                          <input
                            type="text"
                            className="ledger-input ledger-name-input font-bold"
                            placeholder="Item name..."
                            value={row.name}
                            onChange={(e) => handleRowChange(idx, 'name', e.target.value)}
                            data-nav-row={idx}
                            data-nav-col="name"
                            required
                          />
                        </td>

                        {/* 2. Rate (Single or Bracket with multiple custom options) */}
                        <td className="col-td-rate">
                          {row.has_options ? (
                            <div className="ledger-brace-wrap">
                              {/* Literal Curly Brace Symbol dynamically fitting options count */}
                              <div className="ledger-brace-svg" title="Options / Rates Bracket">
                                <svg
                                  viewBox="0 0 10 100"
                                  preserveAspectRatio="none"
                                  style={{
                                    width: '8px',
                                    height: `${Math.max(48, (row.options?.length || 2) * 32)}px`,
                                    minHeight: '44px',
                                  }}
                                >
                                  <path
                                    d="M 9,2 C 4,2 1,12 1,35 C 1,46 0,50 0,50 C 0,50 1,54 1,65 C 1,88 4,98 9,98"
                                    stroke="#2563eb"
                                    strokeWidth="2.4"
                                    strokeLinecap="round"
                                    fill="none"
                                    vectorEffect="non-scaling-stroke"
                                  />
                                </svg>
                              </div>

                              {/* Options Stack */}
                              <div className="ledger-options-stack">
                                {(row.options || []).map((opt, optIdx) => (
                                  <div
                                    key={opt.id || optIdx}
                                    className={`ledger-opt-line ${row.selected_option_index === optIdx ? 'opt-active' : ''}`}
                                    onClick={() => handleSelectOption(idx, optIdx)}
                                    title="Click to select this option"
                                  >
                                    <input
                                      type="radio"
                                      name={`ledger-opt-${row.id || idx}`}
                                      checked={row.selected_option_index === optIdx}
                                      onChange={() => handleSelectOption(idx, optIdx)}
                                      className="ledger-radio"
                                    />
                                    <input
                                      type="text"
                                      className="ledger-opt-size-input font-bold"
                                      value={opt.name}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => handleUpdateOption(idx, optIdx, 'name', e.target.value)}
                                      data-nav-row={idx}
                                      data-nav-col="opt_name"
                                      data-nav-opt={optIdx}
                                      placeholder="Option"
                                    />
                                    <span className="ledger-currency">₹</span>
                                    <input
                                      type="number"
                                      step="any"
                                      className="ledger-opt-rate-input font-mono"
                                      value={opt.rate}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => handleUpdateOption(idx, optIdx, 'rate', e.target.value)}
                                      data-nav-row={idx}
                                      data-nav-col="opt_rate"
                                      data-nav-opt={optIdx}
                                      placeholder="0"
                                    />
                                    {row.options && row.options.length > 1 && (
                                      <button
                                        type="button"
                                        className="btn-opt-del"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleRemoveOption(idx, optIdx);
                                        }}
                                        title="Remove option"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                ))}

                                {/* Actions row inside options cell: + Option & 1 Rate */}
                                <div className="ledger-options-cell-actions">
                                  <button
                                    type="button"
                                    className="btn-ledger-add-sub-opt"
                                    onClick={() => handleAddOption(idx)}
                                    title="Add another option (3rd, 4th, etc.)"
                                  >
                                    ＋ Option
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-ledger-toggle-mode"
                                    onClick={() => handleToggleOptions(idx)}
                                    title="Revert to single rate"
                                  >
                                    1 Rate
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="ledger-single-rate-wrap">
                              <span className="ledger-currency">₹</span>
                              <input
                                type="number"
                                step="any"
                                className="ledger-input ledger-rate-input font-mono"
                                placeholder="0"
                                value={row.rate}
                                onChange={(e) => handleRowChange(idx, 'rate', e.target.value)}
                                data-nav-row={idx}
                                data-nav-col="rate"
                                required
                              />
                              <button
                                type="button"
                                className="btn-ledger-add-option"
                                onClick={() => handleToggleOptions(idx)}
                                title="Add multiple rate options (2, 3 or more rates)"
                              >
                                + Options
                              </button>
                            </div>
                          )}
                        </td>

                        {/* 3. Qty */}
                        <td className="col-td-qty">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            className="ledger-input ledger-qty-input font-mono font-bold"
                            placeholder="10"
                            value={row.qty}
                            onChange={(e) => handleRowChange(idx, 'qty', e.target.value)}
                            data-nav-row={idx}
                            data-nav-col="qty"
                            required
                          />
                        </td>

                        {/* 4. Amount = Rate * Qty */}
                        <td className="col-td-amount font-mono">
                          ₹{(Number(row.amount) || ((parseFloat(row.rate) || 0) * (parseFloat(row.qty) || 0))).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </td>

                        {/* 5. Delete Action (Standard Trash Can Icon like Orders) */}
                        <td className="col-td-del">
                          <button
                            type="button"
                            className="btn-ledger-trash"
                            onClick={() => handleRemoveRow(idx)}
                            title={`Delete ${row.name || 'item'}`}
                            aria-label="Delete item"
                          >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <line x1="10" y1="11" x2="10" y2="17" />
                              <line x1="14" y1="11" x2="14" y2="17" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Table Action Bar */}
                <div className="ledger-table-actions-strip">
                  <button
                    type="button"
                    className="btn-ledger-add-row"
                    onClick={handleAddRow}
                  >
                    <span>＋</span>
                    <span>Add Item (वस्तु जोड़ें)</span>
                  </button>

                  <button
                    type="button"
                    className="btn-ledger-save-default"
                    onClick={handleSaveItemsAsDefault}
                    title="Save current item rows as permanent template in database for all future quotes"
                  >
                    <span>{templateSavedToast ? '✓' : '💾'}</span>
                    <span>{templateSavedToast ? 'Saved to Database!' : 'Save Items as Default (डिफॉल्ट सेव रखें)'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ========================================================
                THE EXACT SUMMARY FROM THE USER'S NOTEPAD
                Quotation - 1100
                Discount %: [   ]
                Final price: [   ]
                ======================================================== */}
            <div className="drawing-summary-card">
              {/* Quotation Total */}
              <div className="drawing-summary-line total-line">
                <span className="summary-lbl" style={{ fontWeight: 800 }}>
                  Quotation Total (कुल जोड़):
                </span>
                <span className="summary-val font-mono">
                  ₹{calculations.subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Extra % (+) */}
              <div className="drawing-summary-line extra-line">
                <div className="discount-input-group">
                  <span className="summary-lbl" style={{ fontWeight: 700, color: '#2563eb' }}>
                    + Extra % (मार्जिन / अतिरिक्त % जोड़):
                  </span>
                  <div className="discount-box-wrap">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      className="paper-input extra-percent-box font-mono font-bold"
                      value={extraPercent}
                      onChange={(e) => setExtraPercent(e.target.value)}
                      data-nav-group="summary"
                      data-nav-name="extra"
                      placeholder="0"
                    />
                    <span className="percent-char" style={{ color: '#2563eb' }}>%</span>
                  </div>
                </div>
                <span className="font-mono" style={{ fontWeight: 800, color: '#2563eb' }}>
                  + ₹{calculations.extraAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Discount % */}
              <div className="drawing-summary-line discount-line">
                <div className="discount-input-group">
                  <span className="summary-lbl text-red">Discount % (छूट):</span>
                  <div className="discount-box-wrap">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      className="paper-input discount-percent-box font-mono font-bold"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(e.target.value)}
                      data-nav-group="summary"
                      data-nav-name="discount"
                      placeholder="0"
                    />
                    <span className="percent-char">%</span>
                  </div>
                </div>
                <span className="discount-amount-val font-mono text-red">
                  - ₹{calculations.discAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="drawing-divider"></div>

              {/* Final Price (Large highlighted box matching paper) */}
              <div className="drawing-summary-line final-price-line">
                <span className="final-price-lbl">Final price (अंतिम कीमत):</span>
                <div className="final-price-box font-mono">
                  ₹{calculations.finalPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================
              STICKY BOTTOM ACTION BAR (Save / Print / Cancel)
              ======================================================== */}
          <div className="modern-modal-sticky-footer no-print" style={{ padding: '0.85rem 1.25rem' }}>
            <div className="footer-left">
              <button
                type="button"
                className="btn btn-secondary-luxury btn-cancel"
                onClick={onClose}
                disabled={isSaving}
              >
                Cancel
              </button>

              {isEditMode && onOpenPrint && (
                <button
                  type="button"
                  className="btn btn-secondary-luxury"
                  style={{ background: '#eff6ff', color: '#1d4ed8', borderColor: '#bfdbfe', fontWeight: 700 }}
                  onClick={() => onOpenPrint(initialData)}
                  disabled={isSaving}
                  title="Print Quotation Slip / WhatsApp PDF"
                >
                  <span>🖨️ Print / PDF</span>
                </button>
              )}
            </div>

            <div className="footer-right">
              <button
                type="submit"
                className="btn-modern-save-submit"
                data-nav-name="save-btn"
                disabled={isSaving}
              >
                {isSaving
                  ? 'Saving...'
                  : isEditMode
                  ? '✓ Update Quotation'
                  : '✓ Save Quotation (कोटेशन सेव करें)'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default QuotationFormModal;
