/**
 * Granular Permissions Configuration
 * Defines screens, modules, and granular actions accessible in Faizan Body Workshop.
 */
export const APP_MODULES = [
  {
    id: 'orders',
    name: 'Work Orders & Job Sheets',
    description: 'Vehicle fabrication, chassis checkoff, parts checklist & delivery',
    icon: 'orders',
    color: '#2563eb',
    permissions: [
      {
        key: 'orders:view',
        label: 'View Orders',
        description: 'View orders list, statuses, chassis numbers, and open detail sheets',
      },
      {
        key: 'orders:create',
        label: 'Add New Order',
        description: 'Create new fabrication work orders and customer job sheets',
      },
      {
        key: 'orders:edit',
        label: 'Edit Order',
        description: 'Modify truck specs, party info, shade color, rates, and task lists',
      },
      {
        key: 'orders:tasks',
        label: 'Checkoff Tasks',
        description: 'Mark body building and cabin fabrication tasks as done / pending',
      },
      {
        key: 'orders:photos',
        label: 'Upload / Manage Photos',
        description: 'Upload live progress vehicle photos & remove uploaded images',
      },
      {
        key: 'orders:signatures',
        label: 'Digital Signatures',
        description: 'Capture MD & Party Owner touch signatures on job sheets',
      },
      {
        key: 'orders:print',
        label: 'Print & Export Job Sheet',
        description: 'Print physical job cards and export customer delivery receipts',
      },
      {
        key: 'orders:delete',
        label: 'Delete Order',
        description: 'Permanently remove work orders from the database',
      },
    ],
  },
  {
    id: 'stock',
    name: 'Stock & Inventory',
    description: 'Raw materials, channels, angles, paints, hardware & in/out adjustments',
    icon: 'stock',
    color: '#0284c7',
    permissions: [
      {
        key: 'stock:view',
        label: 'View Stock & Summary',
        description: 'View raw material catalog, quantities, low stock alerts, and summary',
      },
      {
        key: 'stock:create',
        label: 'Add Material Item',
        description: 'Register new steel items, hardware, or paints into inventory',
      },
      {
        key: 'stock:edit',
        label: 'Edit Material Details',
        description: 'Modify item name, unit, category, alert thresholds, and rate',
      },
      {
        key: 'stock:adjust',
        label: 'Stock IN / OUT Adjustment',
        description: 'Record incoming material shipments and workshop consumption',
      },
      {
        key: 'stock:transactions',
        label: 'View Audit History',
        description: 'View complete transaction log of material additions & deductions',
      },
      {
        key: 'stock:category',
        label: 'Manage Categories',
        description: 'Add and remove material classification categories',
      },
      {
        key: 'stock:delete',
        label: 'Delete Material Item',
        description: 'Permanently delete material records from stock',
      },
    ],
  },
  {
    id: 'workers',
    name: 'Workers Directory & Khata',
    description: 'Staff profiles, coming/going dates, Aadhar cards and Jama-Udhar ledger',
    icon: 'workers',
    color: '#059669',
    permissions: [
      {
        key: 'workers:view',
        label: 'View Workers Directory',
        description: 'Browse worker list, attendance status, and profile records',
      },
      {
        key: 'workers:create',
        label: 'Add Worker',
        description: 'Register new craftsmen and workshop technicians',
      },
      {
        key: 'workers:edit',
        label: 'Edit Worker Profile',
        description: 'Modify contact numbers, salary/daily wage, and leaving dates',
      },
      {
        key: 'workers:aadhar',
        label: 'Upload Aadhar Photo',
        description: 'Capture or upload government identity proof for workers',
      },
      {
        key: 'workers:khata',
        label: 'Manage Khata Ledger',
        description: 'Record Jama (wage earnings) and Udhar (advances) payouts',
      },
      {
        key: 'workers:delete',
        label: 'Delete Worker',
        description: 'Permanently delete worker records from workshop directory',
      },
    ],
  },
];

/**
 * Returns a flat array of all registered permission keys
 */
export function getAllPermissionKeys() {
  const keys = [];
  APP_MODULES.forEach((mod) => {
    mod.permissions.forEach((p) => {
      keys.push(p.key);
    });
  });
  return keys;
}

/**
 * Returns all permission keys belonging to a specific module
 */
export function getModulePermissionKeys(moduleId) {
  const mod = APP_MODULES.find((m) => m.id === moduleId);
  if (!mod) return [];
  return mod.permissions.map((p) => p.key);
}

/**
 * Calculates how many permissions are enabled per module for a user
 */
export function calculatePermissionCounts(userPermissions = []) {
  const permsSet = new Set(Array.isArray(userPermissions) ? userPermissions : []);
  return APP_MODULES.map((mod) => {
    const total = mod.permissions.length;
    const granted = mod.permissions.filter((p) => permsSet.has(p.key)).length;
    return {
      moduleId: mod.id,
      moduleName: mod.name,
      granted,
      total,
      hasFull: granted === total,
      hasNone: granted === 0,
      hasPartial: granted > 0 && granted < total,
    };
  });
}
