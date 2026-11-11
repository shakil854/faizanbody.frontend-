import axiosInstance from '../api/axiosInstance';
import { ENDPOINTS } from '../api/endpoints';
import { workerService } from './workerService';
import { truckAccountService } from './truckAccountService';

let cachedTodaySheet = null;
const todayListeners = new Set();

export function getTodayLocalDate() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function notifyTodayListeners() {
  if (cachedTodaySheet) {
    todayListeners.forEach((cb) => {
      try {
        cb(cachedTodaySheet);
      } catch (err) {
        console.error('Rojmed listener error:', err);
      }
    });
  }
}

function syncLinkedCaches(sourceType, sourceId) {
  if (sourceType === 'worker') {
    if (sourceId) workerService.invalidateWorkerTransactions(sourceId);
    else workerService.invalidateWorkerTransactions();
    workerService.getWorkers({}, { forceRefresh: true }).catch(() => {});
  } else if (sourceType === 'truck_account') {
    truckAccountService.getAccounts({}, { forceRefresh: true }).catch(() => {});
  }
}

export const rojmedService = {
  subscribeToday(callback) {
    todayListeners.add(callback);
    if (cachedTodaySheet) {
      callback(cachedTodaySheet);
    }
    return () => todayListeners.delete(callback);
  },

  getCachedTodaySheet() {
    return cachedTodaySheet;
  },

  async getDailySheet(date = getTodayLocalDate()) {
    const targetDate = date || getTodayLocalDate();
    const response = await axiosInstance.get(ENDPOINTS.ROJMED_DAILY, {
      params: { date: targetDate },
    });
    const sheet = response.data?.data;
    if (sheet && targetDate === getTodayLocalDate()) {
      cachedTodaySheet = sheet;
      notifyTodayListeners();
    }
    return sheet;
  },

  async getPeriodSummary(params = {}) {
    const response = await axiosInstance.get(ENDPOINTS.ROJMED_SUMMARY, { params });
    return response.data?.data;
  },

  async getAccountOptions() {
    const response = await axiosInstance.get(ENDPOINTS.ROJMED_ACCOUNT_OPTIONS);
    return response.data?.data || { workers: [], truck_accounts: [] };
  },

  async setDailyOpening({ date, opening_balance, notes = '', clear = false }) {
    const response = await axiosInstance.put(ENDPOINTS.ROJMED_OPENING, {
      date,
      opening_balance,
      notes,
      clear,
    });
    const sheet = response.data?.data;
    if (sheet && sheet.date === getTodayLocalDate()) {
      cachedTodaySheet = sheet;
      notifyTodayListeners();
    }
    return sheet;
  },

  async createEntry(payload) {
    const response = await axiosInstance.post(ENDPOINTS.ROJMED_ENTRIES, payload);
    const data = response.data?.data;
    if (data?.sheet && data.sheet.date === getTodayLocalDate()) {
      cachedTodaySheet = data.sheet;
      notifyTodayListeners();
    }
    if (payload.source_type && payload.source_type !== 'general') {
      syncLinkedCaches(payload.source_type, payload.source_id);
    }
    return data;
  },

  async updateEntry(id, payload, prevEntry = null) {
    const response = await axiosInstance.put(ENDPOINTS.ROJMED_ENTRY_DETAIL(id), payload);
    const data = response.data?.data;
    if (data?.sheet && data.sheet.date === getTodayLocalDate()) {
      cachedTodaySheet = data.sheet;
      notifyTodayListeners();
    }
    if (payload.source_type && payload.source_type !== 'general') {
      syncLinkedCaches(payload.source_type, payload.source_id);
    }
    if (prevEntry?.source_type && prevEntry.source_type !== 'general') {
      syncLinkedCaches(prevEntry.source_type, prevEntry.source_id);
    }
    return data;
  },

  async deleteEntry(id, existingEntry = null) {
    const response = await axiosInstance.delete(ENDPOINTS.ROJMED_ENTRY_DETAIL(id));
    const data = response.data?.data;
    if (data?.sheet && data.sheet.date === getTodayLocalDate()) {
      cachedTodaySheet = data.sheet;
      notifyTodayListeners();
    }
    if (existingEntry?.source_type && existingEntry.source_type !== 'general') {
      syncLinkedCaches(existingEntry.source_type, existingEntry.source_id);
    }
    return data;
  },
};

export default rojmedService;

