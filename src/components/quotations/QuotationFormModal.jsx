import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { quotationService } from '../../services/quotationService';

// Storage keys so configured items and rates persist across all future quotations
const DEFAULT_ITEMS_STORAGE_KEY = 'faizanbody_quotation_default_items';
const DEFAULT_BODY_CALC_STORAGE_KEY = 'faizanbody_quotation_default_body_calc';

// Helper to load persistent body defaults (rates and weights)
const loadSavedBodyDefaults = () => {
  try {
    const raw = localStorage.getItem(DEFAULT_BODY_CALC_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { }
  return null;
};

// Helper to convert options from array, object, or fallback defaults
const normalizeBodyOptionsList = (rawOpts, defaultList = []) => {
  if (Array.isArray(rawOpts) && rawOpts.length > 0) {
    return rawOpts.map((opt, i) => ({
      id: opt.id || String(Date.now() + i),
      name: opt.name !== undefined ? String(opt.name) : (defaultList[i]?.name || `Option ${i + 1}`),
      weight_per_sqft: opt.weight_per_sqft !== undefined && opt.weight_per_sqft !== null ? String(opt.weight_per_sqft) : '',
      rate: opt.rate !== undefined && opt.rate !== null ? String(opt.rate) : '',
    }));
  }
  if (rawOpts && typeof rawOpts === 'object') {
    const keys = Object.keys(rawOpts);
    if (keys.length > 0) {
      return keys.map((k, i) => ({
        id: String(i + 1),
        name: rawOpts[k]?.name || (k === '4mm' ? '4 mm' : k === '5mm' ? '5 mm' : k === '12g' ? '12 ગેજ' : k === '14g' ? '14 ગેજ' : k),
        weight_per_sqft: rawOpts[k]?.weight_per_sqft !== undefined && rawOpts[k]?.weight_per_sqft !== null ? String(rawOpts[k].weight_per_sqft) : '',
        rate: rawOpts[k]?.rate !== undefined && rawOpts[k]?.rate !== null ? String(rawOpts[k].rate) : '',
      }));
    }
  }
  return defaultList.map((d, i) => ({
    id: String(i + 1),
    name: d.name,
    weight_per_sqft: d.weight_per_sqft !== undefined ? String(d.weight_per_sqft) : '',
    rate: d.rate !== undefined ? String(d.rate) : '',
  }));
};

const DEFAULT_TALIYU_OPTIONS = [
  { id: '1', name: '4 mm', weight_per_sqft: '', rate: '' },
  { id: '2', name: '5 mm', weight_per_sqft: '', rate: '' },
];

const DEFAULT_SIDE_OPTIONS = [
  { id: '1', name: '12 ગેજ', weight_per_sqft: '', rate: '' },
  { id: '2', name: '14 ગેજ', weight_per_sqft: '', rate: '' },
];

// Helper to create initial blank/default body calculation structure
const createInitialBodyCalc = (savedDefaults = null) => {
  const d = savedDefaults || {};
  const taliyuOpts = normalizeBodyOptionsList(d.taliyu?.options, DEFAULT_TALIYU_OPTIONS);
  const sideOpts = normalizeBodyOptionsList(d.side?.options, DEFAULT_SIDE_OPTIONS);

  return {
    taliyu: {
      selected_option_index: typeof d.taliyu?.selected_option_index === 'number' ? d.taliyu.selected_option_index : 0,
      options: taliyuOpts,
      length: '',
      width: '',
    },
    side: {
      selected_option_index: typeof d.side?.selected_option_index === 'number' ? d.side.selected_option_index : 0,
      options: sideOpts,
      length: '',
      height: '',
    },
    dhoka: {
      qty: '',
      weight_per_piece: d.dhoka?.weight_per_piece ?? '',
      rate: d.dhoka?.rate ?? '',
    },
    thambhla: {
      qty: '',
      height: '',
      weight_per_foot: d.thambhla?.weight_per_foot ?? '',
      rate: d.thambhla?.rate ?? '',
    },
    purchuran: {
      weight: '',
      rate: d.purchuran?.rate ?? '',
    },
    machado: {
      enabled: Boolean(d.machado?.enabled ?? false),
      amount: d.machado?.amount ?? '',
    },
  };
};

const normalizeBodyCalcFromData = (raw) => {
  if (!raw) return createInitialBodyCalc(loadSavedBodyDefaults());
  const defaults = loadSavedBodyDefaults() || {};

  const taliyuOpts = normalizeBodyOptionsList(
    raw.taliyu?.options || defaults.taliyu?.options,
    DEFAULT_TALIYU_OPTIONS
  );
  const sideOpts = normalizeBodyOptionsList(
    raw.side?.options || defaults.side?.options,
    DEFAULT_SIDE_OPTIONS
  );

  let selTaliyuIdx = 0;
  if (typeof raw.taliyu?.selected_option_index === 'number' && raw.taliyu.selected_option_index >= 0 && raw.taliyu.selected_option_index < taliyuOpts.length) {
    selTaliyuIdx = raw.taliyu.selected_option_index;
  } else if (raw.taliyu?.selected_option === '5mm' && taliyuOpts.length >= 2) {
    selTaliyuIdx = 1;
  }

  let selSideIdx = 0;
  if (typeof raw.side?.selected_option_index === 'number' && raw.side.selected_option_index >= 0 && raw.side.selected_option_index < sideOpts.length) {
    selSideIdx = raw.side.selected_option_index;
  } else if (raw.side?.selected_option === '14g' && sideOpts.length >= 2) {
    selSideIdx = 1;
  }

  return {
    taliyu: {
      selected_option_index: selTaliyuIdx,
      options: taliyuOpts,
      length: raw.taliyu?.length !== undefined && raw.taliyu?.length !== null ? String(raw.taliyu.length) : '',
      width: raw.taliyu?.width !== undefined && raw.taliyu?.width !== null ? String(raw.taliyu.width) : '',
    },
    side: {
      selected_option_index: selSideIdx,
      options: sideOpts,
      length: raw.side?.length !== undefined && raw.side?.length !== null ? String(raw.side.length) : '',
      height: raw.side?.height !== undefined && raw.side?.height !== null ? String(raw.side.height) : '',
    },
    dhoka: {
      qty: raw.dhoka?.qty !== undefined && raw.dhoka?.qty !== null ? String(raw.dhoka.qty) : '',
      weight_per_piece: String(raw.dhoka?.weight_per_piece ?? defaults.dhoka?.weight_per_piece ?? ''),
      rate: String(raw.dhoka?.rate ?? defaults.dhoka?.rate ?? ''),
    },
    thambhla: {
      qty: raw.thambhla?.qty !== undefined && raw.thambhla?.qty !== null ? String(raw.thambhla.qty) : '',
      height: raw.thambhla?.height !== undefined && raw.thambhla?.height !== null ? String(raw.thambhla.height) : '',
      weight_per_foot: String(raw.thambhla?.weight_per_foot ?? defaults.thambhla?.weight_per_foot ?? ''),
      rate: String(raw.thambhla?.rate ?? defaults.thambhla?.rate ?? ''),
    },
    purchuran: {
      weight: raw.purchuran?.weight !== undefined && raw.purchuran?.weight !== null
        ? String(raw.purchuran.weight)
        : (raw.purchuran?.qty !== undefined && raw.purchuran?.qty !== null ? String(raw.purchuran.qty) : ''),
      rate: String(raw.purchuran?.rate ?? defaults.purchuran?.rate ?? ''),
    },
    machado: {
      enabled: Boolean(raw.machado?.enabled ?? defaults.machado?.enabled ?? false),
      amount: raw.machado?.amount !== undefined && raw.machado?.amount !== null
        ? String(raw.machado.amount)
        : String(defaults.machado?.amount ?? ''),
    },
  };
};

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
  qty: '',
  amount: 0,
});

// Helper to normalize any item format from database, localStorage, or initialData
const normalizeItem = (raw, fallbackId = String(Date.now()), isNew = false) => {
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

  const rawQty = isNew ? '' : (raw.qty !== undefined && raw.qty !== null ? String(raw.qty) : '');
  const q = parseFloat(rawQty) || 0;
  const r = parseFloat(activeRate) || 0;
  const amount = Math.round(r * q * 100) / 100;

  return {
    id: String(raw.id || fallbackId),
    catalog_id: raw.catalog_id || (raw.id && !isNaN(raw.id) ? raw.id : null),
    sort_order: raw.sort_order !== undefined && raw.sort_order !== null ? Number(raw.sort_order) : 0,
    name: raw.name || '',
    has_options: hasOptions,
    options: hasOptions ? options : [
      { id: '1', name: '', rate: activeRate },
      { id: '2', name: '', rate: '' },
    ],
    selected_option_index: selIdx,
    rate: activeRate,
    qty: rawQty,
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

  // Extra and Discount percentage (empty boxes by default)
  const [extraPercent, setExtraPercent] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [templateSavedToast, setTemplateSavedToast] = useState(false);

  // Gaadi Size / Body Calculation State
  const [bodyCalc, setBodyCalc] = useState(() => createInitialBodyCalc(loadSavedBodyDefaults()));
  const [bodySavedToast, setBodySavedToast] = useState(false);

  // Helper to load persistent template items from localStorage
  const loadSavedTemplateItems = () => {
    try {
      const raw = localStorage.getItem(DEFAULT_ITEMS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((it, idx) => normalizeItem(it, String(Date.now() + idx), true));
        }
      }
    } catch { }
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
      setExtraPercent(initialData.extra_percent ? String(initialData.extra_percent) : '');
      setDiscountPercent(initialData.discount_percent ? String(initialData.discount_percent) : '');
      setBodyCalc(normalizeBodyCalcFromData(initialData.body_calc));

      if (Array.isArray(initialData.items) && initialData.items.length > 0) {
        setItems(initialData.items.map((it, idx) => normalizeItem(it, String(idx + 1), false)));
      } else {
        setItems([createBlankItem('1')]);
      }
    } else {
      // New Quotation Defaults (Clean Empty Boxes)
      const today = new Date().toISOString().split('T')[0];
      setQuotationDate(today);
      setCustomerName('');
      setMobileNumber('');
      setTruckChassisNo('');
      setStatus('Draft');
      setNotes('');
      setExtraPercent('');
      setDiscountPercent('');
      setBodyCalc(createInitialBodyCalc(loadSavedBodyDefaults()));

      // Generate default quotation no
      const year = new Date().getFullYear();
      const existing = quotationService.getCachedQuotations();
      const nextNum = existing.length + 1;
      setQuotationNo(`QT-${year}-${String(nextNum).padStart(3, '0')}`);

      // 1. Fetch saved items from Database Catalog FIRST (Qty is empty box for new quote)
      setLoadingItems(true);
      quotationService
        .getCatalogItems({ forceRefresh: true })
        .then((res) => {
          const dbList = res?.data;
          if (Array.isArray(dbList) && dbList.length > 0) {
            const mapped = dbList.map((cat, idx) => normalizeItem(cat, String(cat.id || Date.now() + idx), true));
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

  // Move item row up
  const handleMoveRowUp = (index) => {
    if (index <= 0) return;
    setItems((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
      return updated;
    });
  };

  // Move item row down
  const handleMoveRowDown = (index) => {
    if (index >= items.length - 1) return;
    setItems((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
      return updated;
    });
  };

  // Add new item row at the bottom
  const handleAddRow = () => {
    const newItem = createBlankItem(String(Date.now()));
    setItems((prev) => [...prev, newItem]);
    setTimeout(() => {
      const newIdx = items.length;
      const el = document.querySelector(`[data-nav-row="${newIdx}"][data-nav-col="name"]`);
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 50);
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
      quotationService.deleteCatalogItem(row.catalog_id).catch(() => { });
    }

    const updated = items.filter((_, idx) => idx !== index);
    setItems(updated);

    try {
      localStorage.setItem(DEFAULT_ITEMS_STORAGE_KEY, JSON.stringify(updated.filter((it) => it.name && it.name.trim())));
    } catch { }
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

      const batchPayload = valid.map((it, idx) => {
        const variantsList = it.has_options && Array.isArray(it.options)
          ? it.options.map((opt) => ({
            name: (opt.name || '').trim(),
            rate: parseFloat(opt.rate) || 0,
          }))
          : [];

        return {
          id: it.catalog_id || undefined,
          name: it.name.trim(),
          rate: parseFloat(it.rate) || 0,
          unit: 'Unit',
          variants: variantsList,
          sort_order: idx + 1,
        };
      });

      await quotationService.saveCatalogItemsBatch(batchPayload);

      setTemplateSavedToast(true);
      setTimeout(() => setTemplateSavedToast(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Items saved locally!');
    }
  };

  // =========================================================================
  // Body Calculation Handlers (ગાડી કાંટલે / બોડી કેલ્ક્યુલેશન)
  // =========================================================================
  const handleSelectTaliyuOption = (optIdx) => {
    setBodyCalc((prev) => ({
      ...prev,
      taliyu: { ...prev.taliyu, selected_option_index: optIdx },
    }));
  };

  const handleUpdateTaliyuOption = (optIdx, field, value) => {
    setBodyCalc((prev) => {
      const opts = Array.isArray(prev.taliyu?.options) ? [...prev.taliyu.options] : [];
      opts[optIdx] = { ...opts[optIdx], [field]: value };
      return {
        ...prev,
        taliyu: { ...prev.taliyu, options: opts },
      };
    });
  };

  const handleAddTaliyuOption = () => {
    setBodyCalc((prev) => {
      const opts = Array.isArray(prev.taliyu?.options) ? [...prev.taliyu.options] : [];
      opts.push({
        id: String(Date.now()),
        name: '',
        weight_per_sqft: '',
        rate: '',
      });
      return {
        ...prev,
        taliyu: { ...prev.taliyu, options: opts },
      };
    });
  };

  const handleRemoveTaliyuOption = (optIdx) => {
    setBodyCalc((prev) => {
      let opts = Array.isArray(prev.taliyu?.options) ? [...prev.taliyu.options] : [];
      opts = opts.filter((_, i) => i !== optIdx);
      if (opts.length === 0) {
        opts = [{ id: '1', name: '4 mm', weight_per_sqft: '', rate: '' }];
      }
      let selIdx = prev.taliyu.selected_option_index || 0;
      if (selIdx >= opts.length) selIdx = Math.max(0, opts.length - 1);
      return {
        ...prev,
        taliyu: { ...prev.taliyu, options: opts, selected_option_index: selIdx },
      };
    });
  };

  const handleTaliyuChange = (field, value) => {
    setBodyCalc((prev) => {
      const next = {
        ...prev,
        taliyu: { ...prev.taliyu, [field]: value },
      };
      // Auto-inherit length to Side unless user custom typed side.length
      if (field === 'length' && (prev.side.length === '' || prev.side.length === prev.taliyu.length)) {
        next.side = { ...prev.side, length: value };
      }
      return next;
    });
  };

  const handleSelectSideOption = (optIdx) => {
    setBodyCalc((prev) => ({
      ...prev,
      side: { ...prev.side, selected_option_index: optIdx },
    }));
  };

  const handleUpdateSideOption = (optIdx, field, value) => {
    setBodyCalc((prev) => {
      const opts = Array.isArray(prev.side?.options) ? [...prev.side.options] : [];
      opts[optIdx] = { ...opts[optIdx], [field]: value };
      return {
        ...prev,
        side: { ...prev.side, options: opts },
      };
    });
  };

  const handleAddSideOption = () => {
    setBodyCalc((prev) => {
      const opts = Array.isArray(prev.side?.options) ? [...prev.side.options] : [];
      opts.push({
        id: String(Date.now()),
        name: '',
        weight_per_sqft: '',
        rate: '',
      });
      return {
        ...prev,
        side: { ...prev.side, options: opts },
      };
    });
  };

  const handleRemoveSideOption = (optIdx) => {
    setBodyCalc((prev) => {
      let opts = Array.isArray(prev.side?.options) ? [...prev.side.options] : [];
      opts = opts.filter((_, i) => i !== optIdx);
      if (opts.length === 0) {
        opts = [{ id: '1', name: '12 ગેજ', weight_per_sqft: '', rate: '' }];
      }
      let selIdx = prev.side.selected_option_index || 0;
      if (selIdx >= opts.length) selIdx = Math.max(0, opts.length - 1);
      return {
        ...prev,
        side: { ...prev.side, options: opts, selected_option_index: selIdx },
      };
    });
  };

  const handleSideChange = (field, value) => {
    setBodyCalc((prev) => {
      const next = {
        ...prev,
        side: { ...prev.side, [field]: value },
      };
      // Auto-inherit height to Thambhla unless user custom typed thambhla.height
      if (field === 'height' && (prev.thambhla.height === '' || prev.thambhla.height === prev.side.height)) {
        next.thambhla = { ...prev.thambhla, height: value };
      }
      return next;
    });
  };

  const handleDhokaChange = (field, value) => {
    setBodyCalc((prev) => {
      const next = {
        ...prev,
        dhoka: { ...prev.dhoka, [field]: value },
      };
      // When Dhoka qty changes, auto-calculate Thambhla qty = Dhoka Qty * 2
      if (field === 'qty') {
        const q = parseFloat(value);
        const autoThambhla = !isNaN(q) && q > 0 ? String(q * 2) : '';
        next.thambhla = { ...prev.thambhla, qty: autoThambhla };
      }
      return next;
    });
  };

  const handleThambhlaChange = (field, value) => {
    setBodyCalc((prev) => ({
      ...prev,
      thambhla: { ...prev.thambhla, [field]: value },
    }));
  };

  const handlePurchuranChange = (field, value) => {
    setBodyCalc((prev) => ({
      ...prev,
      purchuran: { ...prev.purchuran, [field]: value },
    }));
  };

  const handleMachadoChange = (field, value) => {
    setBodyCalc((prev) => ({
      ...prev,
      machado: { ...prev.machado, [field]: value },
    }));
  };

  const handleSaveBodyDefaults = () => {
    try {
      const defaults = {
        taliyu: {
          selected_option_index: bodyCalc.taliyu?.selected_option_index || 0,
          options: bodyCalc.taliyu?.options || [],
        },
        side: {
          selected_option_index: bodyCalc.side?.selected_option_index || 0,
          options: bodyCalc.side?.options || [],
        },
        dhoka: {
          weight_per_piece: bodyCalc.dhoka?.weight_per_piece,
          rate: bodyCalc.dhoka?.rate,
        },
        thambhla: {
          weight_per_foot: bodyCalc.thambhla?.weight_per_foot,
          rate: bodyCalc.thambhla?.rate,
        },
        purchuran: {
          rate: bodyCalc.purchuran?.rate,
        },
        machado: {
          amount: bodyCalc.machado?.amount,
        },
      };
      localStorage.setItem(DEFAULT_BODY_CALC_STORAGE_KEY, JSON.stringify(defaults));
      setBodySavedToast(true);
      setTimeout(() => setBodySavedToast(false), 3000);
    } catch { }
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
          } catch { }
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
          const lastRow = items[lastIdx];
          if (lastRow?.has_options) {
            const sel = lastRow.selected_option_index || 0;
            if (!focusInput(`[data-nav-row="${lastIdx}"][data-nav-col="opt_rate"][data-nav-opt="${sel}"]`)) {
              focusInput(`[data-nav-row="${lastIdx}"][data-nav-col="rate"]`);
            }
          } else {
            focusInput(`[data-nav-row="${lastIdx}"][data-nav-col="rate"]`);
          }
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

      // 1. ENTER KEY: Forward step-by-step (Name -> Qty -> Rate -> Next row)
      if (key === 'Enter') {
        e.preventDefault();
        if (navCol === 'name') {
          focusInput(`[data-nav-row="${rowIdx}"][data-nav-col="qty"]`);
        } else if (navCol === 'qty') {
          if (row.has_options) {
            const sel = row.selected_option_index || 0;
            if (!focusInput(`[data-nav-row="${rowIdx}"][data-nav-col="opt_rate"][data-nav-opt="${sel}"]`)) {
              focusInput(`[data-nav-row="${rowIdx}"][data-nav-col="opt_rate"]`);
            }
          } else {
            focusInput(`[data-nav-row="${rowIdx}"][data-nav-col="rate"]`);
          }
        } else if (navCol === 'opt_name') {
          const optIdx = target.getAttribute('data-nav-opt');
          focusInput(`[data-nav-row="${rowIdx}"][data-nav-col="opt_rate"][data-nav-opt="${optIdx}"]`);
        } else if (navCol === 'rate' || navCol === 'opt_rate') {
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
          else if (navCol === 'qty') focusInput('[data-nav-name="date"]');
          else focusInput('[data-nav-name="chassis"]');
        }
        return;
      }

      // 4. ARROW RIGHT (→): Move to next column (Name -> Qty -> Rate -> Next Row Name)
      if (key === 'ArrowRight' && isAtEnd()) {
        if (navCol === 'name') {
          e.preventDefault();
          focusInput(`[data-nav-row="${rowIdx}"][data-nav-col="qty"]`);
        } else if (navCol === 'qty') {
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
          if (rowIdx < items.length - 1) {
            e.preventDefault();
            focusInput(`[data-nav-row="${rowIdx + 1}"][data-nav-col="name"]`);
          }
        }
        return;
      }

      // 5. ARROW LEFT (←): Move to previous column (Rate -> Qty -> Name)
      if (key === 'ArrowLeft' && isAtStart()) {
        if (navCol === 'opt_rate') {
          e.preventDefault();
          const optIdx = target.getAttribute('data-nav-opt');
          if (focusInput(`[data-nav-row="${rowIdx}"][data-nav-col="opt_name"][data-nav-opt="${optIdx}"]`)) {
            return;
          }
          focusInput(`[data-nav-row="${rowIdx}"][data-nav-col="qty"]`);
        } else if (navCol === 'opt_name' || navCol === 'rate') {
          e.preventDefault();
          focusInput(`[data-nav-row="${rowIdx}"][data-nav-col="qty"]`);
        } else if (navCol === 'qty') {
          e.preventDefault();
          focusInput(`[data-nav-row="${rowIdx}"][data-nav-col="name"]`);
        } else if (navCol === 'name') {
          if (rowIdx > 0) {
            e.preventDefault();
            const prevRow = items[rowIdx - 1];
            if (prevRow?.has_options) {
              const sel = prevRow.selected_option_index || 0;
              if (!focusInput(`[data-nav-row="${rowIdx - 1}"][data-nav-col="opt_rate"][data-nav-opt="${sel}"]`)) {
                focusInput(`[data-nav-row="${rowIdx - 1}"][data-nav-col="rate"]`);
              }
            } else {
              focusInput(`[data-nav-row="${rowIdx - 1}"][data-nav-col="rate"]`);
            }
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
  // Live Calculations (Body Work + Additional Items + Extra % + Discount %)
  // =========================================================================

  const calculations = useMemo(() => {
    // 1. Lower ledger items
    let lowerItemsSubtotal = 0;
    items.forEach((it) => {
      const r = parseFloat(it.rate) || 0;
      const q = parseFloat(it.qty) || 0;
      lowerItemsSubtotal += r * q;
    });
    lowerItemsSubtotal = Math.round(lowerItemsSubtotal * 100) / 100;

    // 2. Gaadi Size / Body Work Calculations
    // A. Taliyu (Floor)
    const tLen = parseFloat(bodyCalc.taliyu?.length) || 0;
    const tWidth = parseFloat(bodyCalc.taliyu?.width) || 0;
    const tSqFt = Math.round(tLen * tWidth * 100) / 100;

    const tOpts = Array.isArray(bodyCalc.taliyu?.options) ? bodyCalc.taliyu.options : [];
    const selTaliyuIdx = (typeof bodyCalc.taliyu?.selected_option_index === 'number' && bodyCalc.taliyu.selected_option_index >= 0 && bodyCalc.taliyu.selected_option_index < tOpts.length)
      ? bodyCalc.taliyu.selected_option_index
      : 0;
    const tChosen = tOpts[selTaliyuIdx] || tOpts[0] || {};
    const tWeightPerSqFt = parseFloat(tChosen.weight_per_sqft) || 0;
    const tRate = parseFloat(tChosen.rate) || 0;
    const tWeight = Math.round(tSqFt * tWeightPerSqFt * 100) / 100;
    const tAmount = Math.round(tWeight * tRate * 100) / 100;
    const tSelectedName = tChosen.name || '4 mm';

    // B. Side (Length from Taliyu or custom, Height, SqFt = L * H * 2)
    const sLen = bodyCalc.side?.length !== '' && bodyCalc.side?.length !== undefined
      ? (parseFloat(bodyCalc.side.length) || 0)
      : tLen;
    const sHeight = parseFloat(bodyCalc.side?.height) || 0;
    const sSqFt = Math.round(sLen * sHeight * 2 * 100) / 100;

    const sOpts = Array.isArray(bodyCalc.side?.options) ? bodyCalc.side.options : [];
    const selSideIdx = (typeof bodyCalc.side?.selected_option_index === 'number' && bodyCalc.side.selected_option_index >= 0 && bodyCalc.side.selected_option_index < sOpts.length)
      ? bodyCalc.side.selected_option_index
      : 0;
    const sChosen = sOpts[selSideIdx] || sOpts[0] || {};
    const sWeightPerSqFt = parseFloat(sChosen.weight_per_sqft) || 0;
    const sRate = parseFloat(sChosen.rate) || 0;
    const sWeight = Math.round(sSqFt * sWeightPerSqFt * 100) / 100;
    const sAmount = Math.round(sWeight * sRate * 100) / 100;
    const sSelectedName = sChosen.name || '12 ગેજ';

    // C. Dhoka
    const dQty = parseFloat(bodyCalc.dhoka?.qty) || 0;
    const dWeightPerPc = parseFloat(bodyCalc.dhoka?.weight_per_piece) || 0;
    const dRate = parseFloat(bodyCalc.dhoka?.rate) || 0;
    const dWeight = Math.round(dQty * dWeightPerPc * 100) / 100;
    const dAmount = Math.round(dWeight * dRate * 100) / 100;

    // D. Thambhla (Qty = Dhoka Qty * 2, Height = Side Height)
    const thQty = bodyCalc.thambhla?.qty !== '' && bodyCalc.thambhla?.qty !== undefined
      ? (parseFloat(bodyCalc.thambhla.qty) || 0)
      : (dQty * 2);
    const thHeight = bodyCalc.thambhla?.height !== '' && bodyCalc.thambhla?.height !== undefined
      ? (parseFloat(bodyCalc.thambhla.height) || 0)
      : sHeight;
    const thTotalFeet = Math.round(thQty * thHeight * 100) / 100;
    const thWeightPerFoot = parseFloat(bodyCalc.thambhla?.weight_per_foot) || 0;
    const thRate = parseFloat(bodyCalc.thambhla?.rate) || 0;
    const thWeight = Math.round(thTotalFeet * thWeightPerFoot * 100) / 100;
    const thAmount = Math.round(thWeight * thRate * 100) / 100;

    // E. Purchuran (પરચુરણ)
    const pWeight = parseFloat(bodyCalc.purchuran?.weight ?? bodyCalc.purchuran?.qty) || 0;
    const pRate = parseFloat(bodyCalc.purchuran?.rate) || 0;
    const pAmount = Math.round(pWeight * pRate * 100) / 100;

    // F. Machado (માચડો)
    const mEnabled = Boolean(bodyCalc.machado?.enabled);
    const mAmountInput = parseFloat(bodyCalc.machado?.amount) || 0;
    const mAmount = mEnabled ? Math.round(mAmountInput * 100) / 100 : 0;

    // Body Totals
    const bodyTotalAmount = Math.round((tAmount + sAmount + dAmount + thAmount + pAmount + mAmount) * 100) / 100;
    const bodyTotalWeight = Math.round((tWeight + sWeight + dWeight + thWeight + pWeight) * 100) / 100;

    // Grand Subtotal
    const subtotal = Math.round((bodyTotalAmount + lowerItemsSubtotal) * 100) / 100;

    const extP = Math.max(0, parseFloat(extraPercent) || 0);
    const extraAmt = Math.round(((subtotal * extP) / 100) * 100) / 100;

    const discP = Math.max(0, parseFloat(discountPercent) || 0);
    const discAmt = Math.round(((subtotal * discP) / 100) * 100) / 100;

    const finalPrice = Math.max(0, Math.round((subtotal + extraAmt - discAmt) * 100) / 100);

    return {
      lowerItemsSubtotal,
      bodyCalcDetails: {
        taliyu: { sqft: tSqFt, weight: tWeight, amount: tAmount, rate: tRate, weight_per_sqft: tWeightPerSqFt, selectedName: tSelectedName, selectedIndex: selTaliyuIdx },
        side: { sqft: sSqFt, weight: sWeight, amount: sAmount, rate: sRate, weight_per_sqft: sWeightPerSqFt, effectiveLength: sLen, selectedName: sSelectedName, selectedIndex: selSideIdx },
        dhoka: { weight: dWeight, amount: dAmount, qty: dQty },
        thambhla: { feet: thTotalFeet, weight: thWeight, amount: thAmount, effectiveQty: thQty, effectiveHeight: thHeight },
        purchuran: { weight: pWeight, qty: pWeight, rate: pRate, amount: pAmount },
        machado: { enabled: mEnabled, amount: mAmount, rawAmount: mAmountInput },
      },
      bodyTotalAmount,
      bodyTotalWeight,
      subtotal,
      extraAmt,
      discAmt,
      finalPrice,
    };
  }, [items, bodyCalc, extraPercent, discountPercent]);

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
    const hasBodyData = calculations.bodyTotalAmount > 0 || calculations.bodyCalcDetails.taliyu.sqft > 0;
    if (validItems.length === 0 && !hasBodyData) {
      alert('Please enter vehicle body dimensions or add at least one item (ગાડી ની સાઇઝ અથવા વસ્તુ લખો)');
      return;
    }

    setIsSaving(true);
    try {
      const tOpts = Array.isArray(bodyCalc.taliyu?.options) ? bodyCalc.taliyu.options : [];
      const sOpts = Array.isArray(bodyCalc.side?.options) ? bodyCalc.side.options : [];
      const selTaliyuIdx = calculations.bodyCalcDetails.taliyu.selectedIndex;
      const selSideIdx = calculations.bodyCalcDetails.side.selectedIndex;

      const bodyCalcPayload = {
        taliyu: {
          selected_option_index: selTaliyuIdx,
          selected_label: calculations.bodyCalcDetails.taliyu.selectedName,
          options: tOpts,
          length: parseFloat(bodyCalc.taliyu?.length) || 0,
          width: parseFloat(bodyCalc.taliyu?.width) || 0,
          total_sqft: calculations.bodyCalcDetails.taliyu.sqft,
          weight_per_sqft: calculations.bodyCalcDetails.taliyu.weight_per_sqft,
          total_weight: calculations.bodyCalcDetails.taliyu.weight,
          rate: calculations.bodyCalcDetails.taliyu.rate,
          amount: calculations.bodyCalcDetails.taliyu.amount,
        },
        side: {
          selected_option_index: selSideIdx,
          selected_label: calculations.bodyCalcDetails.side.selectedName,
          options: sOpts,
          length: calculations.bodyCalcDetails.side.effectiveLength,
          height: parseFloat(bodyCalc.side?.height) || 0,
          total_sqft: calculations.bodyCalcDetails.side.sqft,
          weight_per_sqft: calculations.bodyCalcDetails.side.weight_per_sqft,
          total_weight: calculations.bodyCalcDetails.side.weight,
          rate: calculations.bodyCalcDetails.side.rate,
          amount: calculations.bodyCalcDetails.side.amount,
        },
        dhoka: {
          qty: calculations.bodyCalcDetails.dhoka.qty,
          weight_per_piece: parseFloat(bodyCalc.dhoka?.weight_per_piece) || 0,
          total_weight: calculations.bodyCalcDetails.dhoka.weight,
          rate: parseFloat(bodyCalc.dhoka?.rate) || 0,
          amount: calculations.bodyCalcDetails.dhoka.amount,
        },
        thambhla: {
          qty: calculations.bodyCalcDetails.thambhla.effectiveQty,
          height: calculations.bodyCalcDetails.thambhla.effectiveHeight,
          total_feet: calculations.bodyCalcDetails.thambhla.feet,
          weight_per_foot: parseFloat(bodyCalc.thambhla?.weight_per_foot) || 0,
          total_weight: calculations.bodyCalcDetails.thambhla.weight,
          rate: parseFloat(bodyCalc.thambhla?.rate) || 0,
          amount: calculations.bodyCalcDetails.thambhla.amount,
        },
        purchuran: {
          weight: calculations.bodyCalcDetails.purchuran.weight,
          qty: calculations.bodyCalcDetails.purchuran.weight,
          rate: calculations.bodyCalcDetails.purchuran.rate,
          amount: calculations.bodyCalcDetails.purchuran.amount,
        },
        machado: {
          enabled: calculations.bodyCalcDetails.machado.enabled,
          amount: calculations.bodyCalcDetails.machado.amount,
          raw_amount: calculations.bodyCalcDetails.machado.rawAmount,
        },
        total_weight: calculations.bodyTotalWeight,
        total_amount: calculations.bodyTotalAmount,
        has_data: hasBodyData,
      };

      const payload = {
        quotation_no: quotationNo.trim(),
        quotation_date: quotationDate,
        customer_name: customerName.trim(),
        mobile_number: mobileNumber.trim(),
        truck_chassis_no: truckChassisNo.trim().toUpperCase(),
        body_calc: hasBodyData ? bodyCalcPayload : null,
        total_weight: calculations.bodyTotalWeight,
        items: validItems.map((it, idx) => {
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
            id: it.id,
            catalog_id: it.catalog_id || null,
            sort_order: idx + 1,
            name: it.name.trim(),
            has_options: hasOpt,
            options: hasOpt ? it.options : [],
            selected_option_index: selIdx,
            variant_name: chosenVariant,
            qty: qtyVal,
            rate: rateVal,
            amount: Math.round(qtyVal * rateVal * 100) / 100,
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

      // Auto-save default body rates/weights
      try {
        const bodyDefaults = {
          taliyu: {
            selected_option_index: selTaliyuIdx,
            options: tOpts,
          },
          side: {
            selected_option_index: selSideIdx,
            options: sOpts,
          },
          dhoka: {
            weight_per_piece: bodyCalc.dhoka?.weight_per_piece,
            rate: bodyCalc.dhoka?.rate,
          },
          thambhla: {
            weight_per_foot: bodyCalc.thambhla?.weight_per_foot,
            rate: bodyCalc.thambhla?.rate,
          },
          purchuran: {
            rate: bodyCalc.purchuran?.rate,
          },
          machado: {
            amount: bodyCalc.machado?.amount,
          },
        };
        localStorage.setItem(DEFAULT_BODY_CALC_STORAGE_KEY, JSON.stringify(bodyDefaults));
      } catch { }

      // Auto-save all items to Database Catalog & localStorage preserving exact line sequence
      try {
        if (validItems.length > 0) {
          localStorage.setItem(DEFAULT_ITEMS_STORAGE_KEY, JSON.stringify(validItems));
          const batchPayload = validItems.map((it, idx) => {
            const variantsList = it.has_options && Array.isArray(it.options)
              ? it.options.map((opt) => ({
                name: (opt.name || '').trim(),
                rate: parseFloat(opt.rate) || 0,
              }))
              : [];

            return {
              id: it.catalog_id || undefined,
              name: it.name.trim(),
              rate: parseFloat(it.rate) || 0,
              unit: 'Unit',
              variants: variantsList,
              sort_order: idx + 1,
            };
          });

          quotationService.saveCatalogItemsBatch(batchPayload).catch(() => { });
        }
      } catch { }

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
        className="modern-order-modal-card quotation-modal-card"
        style={{ maxWidth: '860px', maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================
            MODAL HEADER: MATCHING USER DRAWING "QUACATION"
            ======================================================== */}
        <div className="modern-modal-header quotation-modal-header">
          <div className="modern-header-left">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '1.5rem' }}>📋</span>
              <div>
                <h3 className="modern-modal-title" style={{ margin: 0, fontSize: '1.15rem' }}>
                  {isEditMode ? `Edit Quotation #${quotationNo}` : 'Quotation (कोटेशन)'}
                </h3>
                <p style={{ margin: 0, fontSize: '0.74rem', color: '#93c5fd', fontWeight: 600 }}>
                  Faizan Body &bull; Name, Qty, Rate & Amount (नोटपैड अनुसार)
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
          <div className="modern-modal-body-scroll quotation-modal-body-scroll" ref={scrollRef}>
            {/* Top Customer Info Bar (Customer Name & Date prominent at top like in paper) */}
            <div className="quotation-header-grid">
              {/* Customer / Party Name */}
              <div className="quotation-header-col-name">
                <label className="quotation-field-label">
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
              <div className="quotation-header-col-date">
                <label className="quotation-field-label">
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
              <div className="quotation-header-col-mobile">
                <label className="quotation-field-label quotation-field-label-muted">
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
              <div className="quotation-header-col-chassis">
                <label className="quotation-field-label quotation-field-label-muted">
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
                GAADI SIZE / BODY CALCULATION CARD (ગાડી કાંટલે / બોડી કેલ્ક્યુલેશન)
                Directly above Items & Rates as requested
                ======================================================== */}
            <div className="body-calc-section-card">
              {/* Header */}
              <div className="body-calc-header">
                <div className="body-calc-title-group">
                  <div className="body-calc-badge-icon">🚛</div>
                  <div>
                    <h4 className="body-calc-main-title">
                      ગાડી કાંટલે / બોડી કેલ્ક્યુલેશન (Body Size & Materials Calculation)
                    </h4>
                    <p className="body-calc-sub-title">
                      તળીયું, સાઈડ, ધોકા અને થાંભલા ની ચોરસ ફૂટ, વજન અને રકમ ની લાઈવ ગણતરી
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button
                    type="button"
                    onClick={handleSaveBodyDefaults}
                    style={{
                      background: bodySavedToast ? '#16a34a' : '#f1f5f9',
                      color: bodySavedToast ? '#ffffff' : '#0f172a',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '0.35rem 0.65rem',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      transition: 'all 0.2s',
                    }}
                    title="આ ભાવ અને વજન ને આવતા બધા નવા કોટેશન માટે ડિફોલ્ટ સેવ રાખો"
                  >
                    <span>{bodySavedToast ? '✓' : '💾'}</span>
                    <span>{bodySavedToast ? 'ભાવ સેવ થઈ ગયા!' : 'Save Default Rates (ભાવ સેવ રાખો)'}</span>
                  </button>
                </div>
              </div>

              {/* 4 Parts Grid */}
              <div className="body-calc-grid">
                {/* ----------------------------------------------------
                    PART 1: તળીયું (Floor)
                    Options: Dynamic (4mm, 5mm, + Add Option)
                    Inputs: Length, Width, Option Name, 1 S.F. Weight, 1 S.F. Rate
                    Sq.Ft. = Length * Width
                    Amount = Sq.Ft. * Rate
                    ---------------------------------------------------- */}
                <div className="body-part-card">
                  <div className="body-part-top">
                    <span className="body-part-label">
                      <span>૧. તળીયું (Floor)</span>
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 700 }}>
                      ચોરસ ફૂટ = લંબાઈ × પહોળાઈ
                    </span>
                  </div>

                  {/* Dimensions Inputs (Length & Width) */}
                  <div className="body-inputs-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                    <div className="body-input-group">
                      <label className="body-input-label">લંબાઈ (ફૂટ)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        className="body-calc-input font-mono"
                        placeholder="e.g. 16"
                        value={bodyCalc.taliyu?.length}
                        onChange={(e) => handleTaliyuChange('length', e.target.value)}
                      />
                    </div>

                    <div className="body-input-group">
                      <label className="body-input-label">પહોળાઈ (ફૂટ)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        className="body-calc-input font-mono"
                        placeholder="e.g. 7.5"
                        value={bodyCalc.taliyu?.width}
                        onChange={(e) => handleTaliyuChange('width', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Dynamic Options List with Rate and Weight */}
                  <div className="body-calc-options-wrap">
                    <div className="body-calc-options-head">
                      <span>ઓપ્શન / જાડાઈ (સિલેક્ટ કરો)</span>
                      <span>૧ S.F. વજન (kg) &bull; ભાવ (₹/kg)</span>
                    </div>

                    {(bodyCalc.taliyu?.options || []).map((opt, optIdx) => (
                      <div
                        key={opt.id || optIdx}
                        className={`body-calc-opt-row ${bodyCalc.taliyu?.selected_option_index === optIdx ? 'opt-active' : ''}`}
                        onClick={() => handleSelectTaliyuOption(optIdx)}
                        title="Click to select this option for calculation"
                      >
                        <input
                          type="radio"
                          name="taliyu-option-radio"
                          checked={bodyCalc.taliyu?.selected_option_index === optIdx}
                          onChange={() => handleSelectTaliyuOption(optIdx)}
                          className="body-calc-opt-radio"
                        />
                        <input
                          type="text"
                          className="body-calc-opt-name"
                          placeholder="e.g. 4 mm"
                          value={opt.name}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleUpdateTaliyuOption(optIdx, 'name', e.target.value)}
                        />
                        <input
                          type="number"
                          step="any"
                          min="0"
                          className="body-calc-opt-num"
                          placeholder="વજન kg"
                          value={opt.weight_per_sqft}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleUpdateTaliyuOption(optIdx, 'weight_per_sqft', e.target.value)}
                          title="૧ ચોરસ ફૂટ નો વજન (kg)"
                        />
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>₹</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          className="body-calc-opt-num"
                          placeholder="ભાવ ₹/kg"
                          value={opt.rate}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleUpdateTaliyuOption(optIdx, 'rate', e.target.value)}
                          title="૧ kg નો ભાવ (₹)"
                        />
                        {bodyCalc.taliyu?.options?.length > 1 && (
                          <button
                            type="button"
                            className="btn-del-body-opt"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveTaliyuOption(optIdx);
                            }}
                            title="Remove option"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      className="btn-add-body-opt"
                      onClick={handleAddTaliyuOption}
                    >
                      ＋ Add Option (નવો ઓપ્શન ઉમેરો)
                    </button>
                  </div>

                  {/* Live Results Bar */}
                  <div className="body-calc-result-box">
                    <div>
                      <span>સિલેક્ટ: <strong>{calculations.bodyCalcDetails.taliyu.selectedName}</strong> &bull; Total S.F.: </span>
                      <strong>{calculations.bodyCalcDetails.taliyu.sqft}</strong>
                      {calculations.bodyCalcDetails.taliyu.weight > 0 && (
                        <span> &bull; વજન: <strong>{calculations.bodyCalcDetails.taliyu.weight} kg</strong></span>
                      )}
                    </div>
                    <div className="body-calc-result-badge-amount">
                      ₹{calculations.bodyCalcDetails.taliyu.amount.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* ----------------------------------------------------
                    PART 2: Side (બાજુ)
                    Options: Dynamic (12 ગેજ, 14 ગેજ, + Add Option)
                    Inputs: Length (auto from Taliyu), Height, Option Name, 1 S.F. Weight, 1 S.F. Rate
                    Sq.Ft. = Length * Height * 2 (2 sides)
                    Amount = Sq.Ft. * Rate
                    ---------------------------------------------------- */}
                <div className="body-part-card">
                  <div className="body-part-top">
                    <span className="body-part-label">
                      <span>૨. Side (બાજુ)</span>
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 700 }}>
                      ચોરસ ફૂટ = લંબાઈ × ઉંચાઈ × 2 (બંને બાજુ)
                    </span>
                  </div>

                  {/* Dimensions Inputs (Length & Height) */}
                  <div className="body-inputs-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                    <div className="body-input-group">
                      <label className="body-input-label">
                        લંબાઈ (ફૂટ) <span className="sub-hint">{bodyCalc.side?.length === '' ? '(તળીયા પરથી)' : ''}</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        className="body-calc-input font-mono"
                        placeholder={bodyCalc.taliyu?.length ? `(${bodyCalc.taliyu.length})` : 'e.g. 16'}
                        value={bodyCalc.side?.length}
                        onChange={(e) => handleSideChange('length', e.target.value)}
                      />
                    </div>

                    <div className="body-input-group">
                      <label className="body-input-label">ઉંચાઈ (ફૂટ)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        className="body-calc-input font-mono"
                        placeholder="e.g. 5"
                        value={bodyCalc.side?.height}
                        onChange={(e) => handleSideChange('height', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Dynamic Options List with Rate and Weight */}
                  <div className="body-calc-options-wrap">
                    <div className="body-calc-options-head">
                      <span>ઓપ્શન / ગેજ (સિલેક્ટ કરો)</span>
                      <span>૧ S.F. વજન (kg) &bull; ભાવ (₹/kg)</span>
                    </div>

                    {(bodyCalc.side?.options || []).map((opt, optIdx) => (
                      <div
                        key={opt.id || optIdx}
                        className={`body-calc-opt-row ${bodyCalc.side?.selected_option_index === optIdx ? 'opt-active' : ''}`}
                        onClick={() => handleSelectSideOption(optIdx)}
                        title="Click to select this option for calculation"
                      >
                        <input
                          type="radio"
                          name="side-option-radio"
                          checked={bodyCalc.side?.selected_option_index === optIdx}
                          onChange={() => handleSelectSideOption(optIdx)}
                          className="body-calc-opt-radio"
                        />
                        <input
                          type="text"
                          className="body-calc-opt-name"
                          placeholder="e.g. 12 ગેજ"
                          value={opt.name}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleUpdateSideOption(optIdx, 'name', e.target.value)}
                        />
                        <input
                          type="number"
                          step="any"
                          min="0"
                          className="body-calc-opt-num"
                          placeholder="વજન kg"
                          value={opt.weight_per_sqft}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleUpdateSideOption(optIdx, 'weight_per_sqft', e.target.value)}
                          title="૧ ચોરસ ફૂટ નો વજન (kg)"
                        />
                        <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#64748b' }}>₹</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          className="body-calc-opt-num"
                          placeholder="ભાવ ₹/kg"
                          value={opt.rate}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleUpdateSideOption(optIdx, 'rate', e.target.value)}
                          title="૧ kg નો ભાવ (₹)"
                        />
                        {bodyCalc.side?.options?.length > 1 && (
                          <button
                            type="button"
                            className="btn-del-body-opt"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveSideOption(optIdx);
                            }}
                            title="Remove option"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}

                    <button
                      type="button"
                      className="btn-add-body-opt"
                      onClick={handleAddSideOption}
                    >
                      ＋ Add Option (નવો ઓપ્શન ઉમેરો)
                    </button>
                  </div>

                  {/* Live Results Bar */}
                  <div className="body-calc-result-box">
                    <div>
                      <span>સિલેક્ટ: <strong>{calculations.bodyCalcDetails.side.selectedName}</strong> &bull; Total S.F. (×2): </span>
                      <strong>{calculations.bodyCalcDetails.side.sqft}</strong>
                      {calculations.bodyCalcDetails.side.weight > 0 && (
                        <span> &bull; વજન: <strong>{calculations.bodyCalcDetails.side.weight} kg</strong></span>
                      )}
                    </div>
                    <div className="body-calc-result-badge-amount">
                      ₹{calculations.bodyCalcDetails.side.amount.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* ----------------------------------------------------
                    PART 3: ધોકા (Cross Members)
                    Inputs: Quantity, Weight per 1 piece, Rate (₹/kg)
                    Total Weight = Qty * Weight per piece
                    Amount = Total Weight * Rate
                    ---------------------------------------------------- */}
                <div className="body-part-card">
                  <div className="body-part-top">
                    <span className="body-part-label">
                      <span>૩. ધોકા (Cross Members)</span>
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                      રકમ = કુલ વજન × ભાવ (₹/kg)
                    </span>
                  </div>

                  {/* Inputs */}
                  <div className="body-inputs-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    <div className="body-input-group">
                      <label className="body-input-label">Quantity (નંગ)</label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        className="body-calc-input font-mono"
                        placeholder="e.g. 14"
                        value={bodyCalc.dhoka?.qty}
                        onChange={(e) => handleDhokaChange('qty', e.target.value)}
                      />
                    </div>

                    <div className="body-input-group">
                      <label className="body-input-label">
                        ૧ નંગ નો વજન <span className="sub-hint">(kg)</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        className="body-calc-input font-mono"
                        placeholder="e.g. 25"
                        value={bodyCalc.dhoka?.weight_per_piece}
                        onChange={(e) => handleDhokaChange('weight_per_piece', e.target.value)}
                      />
                    </div>

                    <div className="body-input-group">
                      <label className="body-input-label">
                        ભાવ <span className="sub-hint">(₹/kg)</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        className="body-calc-input font-mono"
                        placeholder="e.g. 80"
                        value={bodyCalc.dhoka?.rate}
                        onChange={(e) => handleDhokaChange('rate', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Live Results Bar */}
                  <div className="body-calc-result-box">
                    <div>
                      <span>કુલ વજન: </span>
                      <strong>{calculations.bodyCalcDetails.dhoka.weight} kg</strong>
                    </div>
                    <div className="body-calc-result-badge-amount">
                      ₹{calculations.bodyCalcDetails.dhoka.amount.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* ----------------------------------------------------
                    PART 4: થાંભલા (Pillars)
                    Inputs: Qty (auto = Dhoka * 2), Height (auto = Side Height), Weight per 1 ft, Rate (₹/kg)
                    Total Feet = Qty * Height
                    Total Weight = Total Feet * Weight per ft
                    Amount = Total Weight * Rate
                    ---------------------------------------------------- */}
                <div className="body-part-card">
                  <div className="body-part-top">
                    <span className="body-part-label">
                      <span>૪. થાંભલા (Pillars)</span>
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                      રકમ = કુલ વજન × ભાવ (₹/kg)
                    </span>
                  </div>

                  {/* Inputs */}
                  <div className="body-inputs-row">
                    <div className="body-input-group">
                      <label className="body-input-label">
                        નંગ <span className="sub-hint">{bodyCalc.thambhla?.qty === '' ? '(ધોકા × 2)' : ''}</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        className="body-calc-input font-mono"
                        placeholder={bodyCalc.dhoka?.qty ? `(${Number(bodyCalc.dhoka.qty) * 2})` : 'Qty'}
                        value={bodyCalc.thambhla?.qty}
                        onChange={(e) => handleThambhlaChange('qty', e.target.value)}
                      />
                    </div>

                    <div className="body-input-group">
                      <label className="body-input-label">
                        ઉંચાઈ (ફૂટ) <span className="sub-hint">{bodyCalc.thambhla?.height === '' ? '(Side પરથી)' : ''}</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        className="body-calc-input font-mono"
                        placeholder={bodyCalc.side?.height ? `(${bodyCalc.side.height})` : 'Height'}
                        value={bodyCalc.thambhla?.height}
                        onChange={(e) => handleThambhlaChange('height', e.target.value)}
                      />
                    </div>

                    <div className="body-input-group">
                      <label className="body-input-label">
                        ૧ ફૂટ વજન <span className="sub-hint">(kg)</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        className="body-calc-input font-mono"
                        placeholder="e.g. 2.5"
                        value={bodyCalc.thambhla?.weight_per_foot}
                        onChange={(e) => handleThambhlaChange('weight_per_foot', e.target.value)}
                      />
                    </div>

                    <div className="body-input-group">
                      <label className="body-input-label">
                        ભાવ <span className="sub-hint">(₹/kg)</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        className="body-calc-input font-mono"
                        placeholder="e.g. 80"
                        value={bodyCalc.thambhla?.rate}
                        onChange={(e) => handleThambhlaChange('rate', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Live Results Bar */}
                  <div className="body-calc-result-box">
                    <div>
                      <span>કુલ ફૂટ: <strong>{calculations.bodyCalcDetails.thambhla.feet} ft</strong> &bull; વજન: </span>
                      <strong>{calculations.bodyCalcDetails.thambhla.weight} kg</strong>
                    </div>
                    <div className="body-calc-result-badge-amount">
                      ₹{calculations.bodyCalcDetails.thambhla.amount.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* ----------------------------------------------------
                    PART 5: પરચુરણ (Purchuran / Misc)
                    Inputs: Weight (કુલ વજન kg), Rate (ભાવ ₹/kg)
                    Amount = Weight * Rate
                    ---------------------------------------------------- */}
                <div className="body-part-card">
                  <div className="body-part-top">
                    <span className="body-part-label">
                      <span>૫. પરચુરણ (Purchuran)</span>
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>
                      રકમ = કુલ વજન × ભાવ (₹/kg)
                    </span>
                  </div>

                  {/* Inputs */}
                  <div className="body-inputs-row" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                    <div className="body-input-group">
                      <label className="body-input-label">કુલ વજન <span className="sub-hint">(kg)</span></label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        className="body-calc-input font-mono"
                        placeholder="e.g. 25"
                        value={bodyCalc.purchuran?.weight ?? bodyCalc.purchuran?.qty}
                        onChange={(e) => handlePurchuranChange('weight', e.target.value)}
                      />
                    </div>

                    <div className="body-input-group">
                      <label className="body-input-label">ભાવ <span className="sub-hint">(₹/kg)</span></label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        className="body-calc-input font-mono"
                        placeholder="e.g. 80"
                        value={bodyCalc.purchuran?.rate}
                        onChange={(e) => handlePurchuranChange('rate', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Live Results Bar */}
                  <div className="body-calc-result-box">
                    <div>
                      <span>ગણતરી: </span>
                      <strong>
                        {calculations.bodyCalcDetails.purchuran.weight > 0 && calculations.bodyCalcDetails.purchuran.rate > 0
                          ? `${calculations.bodyCalcDetails.purchuran.weight} kg × ₹${calculations.bodyCalcDetails.purchuran.rate}`
                          : 'કુલ વજન (kg) × ભાવ'}
                      </strong>
                    </div>
                    <div className="body-calc-result-badge-amount">
                      ₹{calculations.bodyCalcDetails.purchuran.amount.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* ----------------------------------------------------
                    PART 6: માચડો (Machado / Carrier)
                    Direct Amount (Lump-sum) with Selection Checkbox
                    Only included in total calculation when checked (right)
                    ---------------------------------------------------- */}
                <div className={`body-part-card ${bodyCalc.machado?.enabled ? 'body-part-card-active' : ''}`} style={{ borderColor: bodyCalc.machado?.enabled ? '#2563eb' : undefined }}>
                  <div className="body-part-top">
                    <label className="body-part-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', margin: 0 }}>
                      <input
                        type="checkbox"
                        checked={Boolean(bodyCalc.machado?.enabled)}
                        onChange={(e) => handleMachadoChange('enabled', e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#2563eb' }}
                      />
                      <span style={{ fontWeight: 800 }}>૬. માચડો (Machado)</span>
                    </label>
                    <span style={{ fontSize: '0.72rem', color: bodyCalc.machado?.enabled ? '#16a34a' : '#64748b', fontWeight: 700 }}>
                      {bodyCalc.machado?.enabled ? '✓ સામેલ છે (Included)' : '✗ બાકાત છે (Unchecked)'}
                    </span>
                  </div>

                  {/* Input: Direct Amount */}
                  <div className="body-inputs-row" style={{ gridTemplateColumns: '1fr' }}>
                    <div className="body-input-group">
                      <label className="body-input-label">
                        માચડાની રકમ / ભાવ <span className="sub-hint">(Direct Amount ₹)</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        className="body-calc-input font-mono"
                        placeholder="e.g. 12000 (ડાયરેક્ટ રકમ)"
                        value={bodyCalc.machado?.amount}
                        onChange={(e) => handleMachadoChange('amount', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Live Results Bar */}
                  <div className="body-calc-result-box" style={{ background: bodyCalc.machado?.enabled ? '#eff6ff' : '#f8fafc' }}>
                    <div>
                      <span>સ્ટેટસ: </span>
                      <strong>
                        {bodyCalc.machado?.enabled
                          ? 'કેલ્ક્યુલેશનમાં સામેલ'
                          : 'અનચેક (ગણતરીમાં નથી)'}
                      </strong>
                    </div>
                    <div className="body-calc-result-badge-amount" style={{ color: bodyCalc.machado?.enabled ? '#1d4ed8' : '#94a3b8' }}>
                      ₹{calculations.bodyCalcDetails.machado.amount.toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Summary Banner */}
              <div className="body-summary-banner">
                <div className="body-summary-col">
                  <span className="body-summary-col-label">કુલ બોડી વજન (Est. Total Weight)</span>
                  <span className="body-summary-col-val">{calculations.bodyTotalWeight.toLocaleString('en-IN')} kg</span>
                </div>
                <div className="body-summary-col" style={{ textAlign: 'right' }}>
                  <span className="body-summary-col-label">ગાડી બોડી રકમ (Body Total Amount)</span>
                  <span className="body-summary-col-val amount-accent">₹{calculations.bodyTotalAmount.toLocaleString('en-IN')}</span>
                </div>
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
                      Items & Rates (वस्तु, मात्रा, रेट व रकम)
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
                      <th className="col-th-qty">Qty (मात्रा)</th>
                      <th className="col-th-rate">Rate (रेट ₹)</th>
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

                        {/* 2. Qty (Clean empty box) */}
                        <td className="col-td-qty">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            className="ledger-input ledger-qty-input font-mono font-bold"
                            placeholder=""
                            value={row.qty}
                            onChange={(e) => handleRowChange(idx, 'qty', e.target.value)}
                            data-nav-row={idx}
                            data-nav-col="qty"
                          />
                        </td>

                        {/* 3. Rate (Single or Bracket with multiple custom options) */}
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

                        {/* 4. Amount = Rate * Qty */}
                        <td className="col-td-amount font-mono">
                          ₹{(Number(row.amount) || ((parseFloat(row.rate) || 0) * (parseFloat(row.qty) || 0))).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </td>

                        {/* 5. Reorder & Delete Actions */}
                        <td className="col-td-del" style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <button
                              type="button"
                              onClick={() => handleMoveRowUp(idx)}
                              disabled={idx === 0}
                              style={{
                                border: '1px solid #cbd5e1',
                                background: idx === 0 ? '#f8fafc' : '#ffffff',
                                color: idx === 0 ? '#cbd5e1' : '#334155',
                                borderRadius: '4px',
                                width: '22px',
                                height: '22px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: idx === 0 ? 'not-allowed' : 'pointer',
                                fontSize: '10px',
                                fontWeight: 800,
                                padding: 0,
                                transition: 'all 0.15s ease',
                              }}
                              title="Move line up (ऊपर करें)"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveRowDown(idx)}
                              disabled={idx === items.length - 1}
                              style={{
                                border: '1px solid #cbd5e1',
                                background: idx === items.length - 1 ? '#f8fafc' : '#ffffff',
                                color: idx === items.length - 1 ? '#cbd5e1' : '#334155',
                                borderRadius: '4px',
                                width: '22px',
                                height: '22px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: idx === items.length - 1 ? 'not-allowed' : 'pointer',
                                fontSize: '10px',
                                fontWeight: 800,
                                padding: 0,
                                transition: 'all 0.15s ease',
                              }}
                              title="Move line down (नीचे करें)"
                            >
                              ▼
                            </button>
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
                          </div>
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
              {calculations.bodyTotalAmount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', padding: '0.3rem 0', fontSize: '0.82rem', color: '#475569', borderBottom: '1px dashed #cbd5e1', marginBottom: '0.5rem' }}>
                  <span>🚛 ગાડી બોડી કામ: <strong style={{ color: '#1e293b' }}>₹{calculations.bodyTotalAmount.toLocaleString('en-IN')}</strong> ({calculations.bodyTotalWeight} kg)</span>
                  {calculations.lowerItemsSubtotal > 0 && (
                    <span>📦 અન્ય વસ્તુઓ: <strong style={{ color: '#1e293b' }}>₹{calculations.lowerItemsSubtotal.toLocaleString('en-IN')}</strong></span>
                  )}
                </div>
              )}

              {/* Quotation Total */}
              <div className="drawing-summary-line total-line">
                <span className="summary-lbl" style={{ fontWeight: 800 }}>
                  Quotation Total (કુલ રકમ / Subtotal):
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
                      placeholder=""
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
                      placeholder=""
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
          <div className="modern-modal-sticky-footer quotation-modal-sticky-footer no-print">
            <div className="footer-left">
              <button
                type="button"
                className="btn btn-secondary-luxury btn-cancel"
                onClick={onClose}
                disabled={isSaving}
              >
                Cancel
              </button>
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
