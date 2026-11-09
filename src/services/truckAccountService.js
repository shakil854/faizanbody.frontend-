import axiosInstance from '../api/axiosInstance';
import { ENDPOINTS } from '../api/endpoints';

const STORAGE_KEY_ACCOUNTS = 'faizanbody_truck_accounts';
const STORAGE_KEY_ENTRIES = 'faizanbody_truck_entries';

let cachedAccounts = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60000;
const listeners = new Set();

function getLocalAccounts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalAccounts(list) {
  try {
    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(list || []));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}

function getLocalEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_ENTRIES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalEntries(list) {
  try {
    localStorage.setItem(STORAGE_KEY_ENTRIES, JSON.stringify(list || []));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }
}

function notifyListeners() {
  if (cachedAccounts) {
    listeners.forEach((cb) => {
      try {
        cb(cachedAccounts);
      } catch (e) {
        console.error('Truck account listener callback error:', e);
      }
    });
  }
}

export const truckAccountService = {
  subscribe(callback) {
    listeners.add(callback);
    if (cachedAccounts) {
      callback(cachedAccounts);
    }
    return () => listeners.delete(callback);
  },

  getCachedAccounts() {
    if (cachedAccounts) return cachedAccounts;
    const local = getLocalAccounts();
    cachedAccounts = local;
    return local;
  },

  async getAccounts(params = {}, { forceRefresh = false } = {}) {
    const now = Date.now();
    const isDefault = !params.search;

    if (isDefault && cachedAccounts && !forceRefresh && now - lastFetchTime < CACHE_TTL_MS) {
      return { success: true, data: cachedAccounts, fromCache: true };
    }

    try {
      const response = await axiosInstance.get(ENDPOINTS.TRUCK_ACCOUNTS, { params });
      const data = response.data?.data;
      if (Array.isArray(data)) {
        cachedAccounts = data;
        lastFetchTime = Date.now();
        saveLocalAccounts(data);
        notifyListeners();
        return { success: true, data };
      }
    } catch (err) {
      console.warn('⚠️ [TruckAccountService API Offline Fallback]:', err.message);
    }

    // Fallback to local accounts
    let list = getLocalAccounts();
    const allEntries = getLocalEntries();

    list = list.map((a) => {
      const entries = allEntries.filter((e) => e.account_id === a.id);
      const totalJama = entries.filter((e) => e.type === 'jama').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const totalUdhar = entries.filter((e) => e.type === 'udhar').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const balance = totalUdhar - totalJama;
      return {
        ...a,
        total_jama: totalJama,
        total_udhar: totalUdhar,
        balance,
        status: balance > 0 ? 'due' : balance < 0 ? 'advance' : 'settled',
        total_entries: entries.length,
      };
    });

    if (params.search && params.search.trim()) {
      const q = params.search.trim().toLowerCase();
      list = list.filter(
        (a) =>
          (a.party_name && a.party_name.toLowerCase().includes(q)) ||
          (a.truck_no && a.truck_no.toLowerCase().includes(q)) ||
          (a.phone && a.phone.includes(q)) ||
          (a.page_no && String(a.page_no).includes(q))
      );
    }

    cachedAccounts = list;
    return { success: true, data: list, fromCache: true };
  },

  async getAccountById(id) {
    const numId = Number(id);
    try {
      const response = await axiosInstance.get(ENDPOINTS.TRUCK_ACCOUNT_DETAIL(id));
      const data = response.data?.data;
      if (data) {
        return { success: true, data };
      }
    } catch (err) {
      console.warn('⚠️ [TruckAccountService getAccountById fallback]:', err.message);
    }

    // Local fallback
    const accounts = getLocalAccounts();
    const found = accounts.find((a) => a.id === numId);
    if (!found) {
      return { success: false, message: 'Account not found' };
    }

    const allEntries = getLocalEntries();
    const entries = allEntries
      .filter((e) => e.account_id === numId)
      .sort((a, b) => (String(a.date) > String(b.date) ? 1 : -1));

    const totalJama = entries.filter((e) => e.type === 'jama').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalUdhar = entries.filter((e) => e.type === 'udhar').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const balance = totalUdhar - totalJama;

    const data = {
      ...found,
      entries,
      summary: {
        total_jama: totalJama,
        total_udhar: totalUdhar,
        balance,
        status: balance > 0 ? 'due' : balance < 0 ? 'advance' : 'settled',
      },
    };

    return { success: true, data };
  },

  async createAccount(formData) {
    try {
      const response = await axiosInstance.post(ENDPOINTS.TRUCK_ACCOUNTS, formData);
      const newAcc = response.data?.data;
      if (newAcc) {
        const local = getLocalAccounts();
        const updated = [newAcc, ...local.filter((a) => a.id !== newAcc.id)];
        saveLocalAccounts(updated);
        cachedAccounts = updated;
        notifyListeners();
        return { success: true, data: newAcc };
      }
    } catch (err) {
      console.warn('⚠️ [TruckAccountService createAccount fallback]:', err.message);
    }

    // Local fallback
    const local = getLocalAccounts();
    const maxId = local.reduce((max, a) => Math.max(max, Number(a.id) || 0), 0);
    const newAcc = {
      id: maxId + 1,
      party_name: formData.party_name ? formData.party_name.trim() : '',
      truck_no: formData.truck_no ? formData.truck_no.trim() : '',
      phone: formData.phone ? formData.phone.trim() : '',
      address: formData.address ? formData.address.trim() : '',
      page_no: formData.page_no ? Number(formData.page_no) : null,
      notes: formData.notes ? formData.notes.trim() : '',
      created_at: new Date().toISOString(),
      total_jama: 0,
      total_udhar: 0,
      balance: 0,
      status: 'settled',
      total_entries: 0,
    };

    const updated = [newAcc, ...local];
    saveLocalAccounts(updated);
    cachedAccounts = updated;
    notifyListeners();
    return { success: true, data: newAcc };
  },

  async updateAccount(id, formData) {
    const numId = Number(id);
    try {
      const response = await axiosInstance.put(ENDPOINTS.TRUCK_ACCOUNT_DETAIL(id), formData);
      const updated = response.data?.data;
      if (updated) {
        const local = getLocalAccounts();
        const list = local.map((a) => (a.id === numId ? { ...a, ...updated } : a));
        saveLocalAccounts(list);
        cachedAccounts = list;
        notifyListeners();
        return { success: true, data: updated };
      }
    } catch (err) {
      console.warn('⚠️ [TruckAccountService updateAccount fallback]:', err.message);
    }

    // Local fallback
    const local = getLocalAccounts();
    const list = local.map((a) => {
      if (a.id === numId) {
        return {
          ...a,
          party_name: formData.party_name ? formData.party_name.trim() : a.party_name,
          truck_no: formData.truck_no !== undefined ? formData.truck_no : a.truck_no,
          phone: formData.phone !== undefined ? formData.phone : a.phone,
          address: formData.address !== undefined ? formData.address : a.address,
          page_no: formData.page_no !== undefined ? (formData.page_no ? Number(formData.page_no) : null) : a.page_no,
          notes: formData.notes !== undefined ? formData.notes : a.notes,
        };
      }
      return a;
    });

    saveLocalAccounts(list);
    cachedAccounts = list;
    notifyListeners();
    const updated = list.find((a) => a.id === numId);
    return { success: true, data: updated };
  },

  async deleteAccount(id) {
    const numId = Number(id);
    try {
      await axiosInstance.delete(ENDPOINTS.TRUCK_ACCOUNT_DETAIL(id));
    } catch (err) {
      console.warn('⚠️ [TruckAccountService deleteAccount fallback]:', err.message);
    }

    const localAccounts = getLocalAccounts().filter((a) => a.id !== numId);
    saveLocalAccounts(localAccounts);

    const localEntries = getLocalEntries().filter((e) => e.account_id !== numId);
    saveLocalEntries(localEntries);

    cachedAccounts = localAccounts;
    notifyListeners();
    return { success: true, id: numId };
  },

  async addEntry(accountId, entryData) {
    const numAccId = Number(accountId);
    try {
      const response = await axiosInstance.post(ENDPOINTS.TRUCK_ACCOUNT_ENTRIES(accountId), entryData);
      const data = response.data?.data;
      if (data) {
        // Also sync local
        this._syncLocalAddEntry(numAccId, data.entry || entryData);
        return { success: true, data };
      }
    } catch (err) {
      console.warn('⚠️ [TruckAccountService addEntry fallback]:', err.message);
    }

    // Local fallback
    const allEntries = getLocalEntries();
    const maxId = allEntries.reduce((max, e) => Math.max(max, Number(e.id) || 0), 0);
    const newEntry = {
      id: maxId + 1,
      account_id: numAccId,
      type: entryData.type === 'udhar' ? 'udhar' : 'jama',
      amount: Number(entryData.amount) || 0,
      date: entryData.date || new Date().toISOString().split('T')[0],
      particulars: entryData.particulars ? entryData.particulars.trim() : (entryData.type === 'udhar' ? 'ગાડી ની કિંમત' : 'રોકડા જમા'),
      payment_mode: entryData.payment_mode || 'Cash',
      created_at: new Date().toISOString(),
    };

    allEntries.push(newEntry);
    saveLocalEntries(allEntries);

    this._recalcAndNotifyAccount(numAccId);
    return { success: true, data: { entry: newEntry } };
  },

  async updateEntry(accountId, entryId, entryData) {
    const numAccId = Number(accountId);
    const numEntryId = Number(entryId);
    try {
      const response = await axiosInstance.put(
        ENDPOINTS.TRUCK_ACCOUNT_ENTRY_DELETE(accountId, entryId),
        entryData
      );
      const data = response.data?.data;
      if (data) {
        this._syncLocalUpdateEntry(numAccId, numEntryId, data.entry || entryData);
        return { success: true, data };
      }
    } catch (err) {
      console.warn('⚠️ [TruckAccountService updateEntry fallback]:', err.message);
    }

    // Local fallback
    const allEntries = getLocalEntries();
    const idx = allEntries.findIndex((e) => e.id === numEntryId && e.account_id === numAccId);
    if (idx !== -1) {
      allEntries[idx] = {
        ...allEntries[idx],
        type: entryData.type === 'udhar' ? 'udhar' : 'jama',
        amount: Number(entryData.amount) || 0,
        date: entryData.date || allEntries[idx].date,
        particulars: entryData.particulars ? entryData.particulars.trim() : allEntries[idx].particulars,
        payment_mode: entryData.payment_mode || allEntries[idx].payment_mode,
      };
      saveLocalEntries(allEntries);
      this._recalcAndNotifyAccount(numAccId);
      return { success: true, data: { entry: allEntries[idx] } };
    }
    return { success: false, message: 'Entry not found' };
  },

  async deleteEntry(accountId, entryId) {
    const numAccId = Number(accountId);
    const numEntryId = Number(entryId);
    try {
      await axiosInstance.delete(ENDPOINTS.TRUCK_ACCOUNT_ENTRY_DELETE(accountId, entryId));
    } catch (err) {
      console.warn('⚠️ [TruckAccountService deleteEntry fallback]:', err.message);
    }

    const allEntries = getLocalEntries().filter((e) => !(e.id === numEntryId && e.account_id === numAccId));
    saveLocalEntries(allEntries);

    this._recalcAndNotifyAccount(numAccId);
    return { success: true, entryId: numEntryId };
  },

  _syncLocalAddEntry(accountId, entry) {
    const all = getLocalEntries();
    if (!all.some((e) => e.id === entry.id)) {
      all.push({ ...entry, account_id: accountId });
      saveLocalEntries(all);
    }
    this._recalcAndNotifyAccount(accountId);
  },

  _syncLocalUpdateEntry(accountId, entryId, entry) {
    const all = getLocalEntries();
    const idx = all.findIndex((e) => e.id === entryId);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...entry, account_id: accountId };
      saveLocalEntries(all);
    }
    this._recalcAndNotifyAccount(accountId);
  },

  _recalcAndNotifyAccount(accountId) {
    const allEntries = getLocalEntries();
    const entries = allEntries.filter((e) => e.account_id === accountId);
    const totalJama = entries.filter((e) => e.type === 'jama').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalUdhar = entries.filter((e) => e.type === 'udhar').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const balance = totalUdhar - totalJama;

    const localAccounts = getLocalAccounts().map((a) => {
      if (a.id === accountId) {
        return {
          ...a,
          total_jama: totalJama,
          total_udhar: totalUdhar,
          balance,
          status: balance > 0 ? 'due' : balance < 0 ? 'advance' : 'settled',
          total_entries: entries.length,
        };
      }
      return a;
    });

    saveLocalAccounts(localAccounts);
    cachedAccounts = localAccounts;
    notifyListeners();
  },
};

export default truckAccountService;

