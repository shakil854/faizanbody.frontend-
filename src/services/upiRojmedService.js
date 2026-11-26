import axiosInstance from '../api/axiosInstance';
import { ENDPOINTS } from '../api/endpoints';
import { workerService } from './workerService';
import { truckAccountService } from './truckAccountService';
import { vyapariService } from './vyapariService';

function syncAccountCaches(type, id) {
  if (type === 'worker') {
    if (id) workerService.invalidateWorkerTransactions(id);
    else workerService.invalidateWorkerTransactions();
    workerService.getWorkers({}, { forceRefresh: true }).catch(() => {});
  } else if (type === 'truck_account') {
    truckAccountService.getAccounts({}, { forceRefresh: true }).catch(() => {});
  } else if (type === 'vyapari_account') {
    vyapariService.getAccounts({}, { forceRefresh: true }).catch(() => {});
  }
}

export const upiRojmedService = {
  async getDailySheet(date) {
    const response = await axiosInstance.get(ENDPOINTS.UPI_ROJMED_DAILY, {
      params: { date },
    });
    return response.data?.data;
  },

  async getOptions() {
    const response = await axiosInstance.get(ENDPOINTS.UPI_ROJMED_OPTIONS);
    return response.data?.data || {
      upi_accounts: [],
      workers: [],
      truck_accounts: [],
      vyapari_accounts: [],
    };
  },

  async createUpiAccount(payload) {
    const response = await axiosInstance.post(ENDPOINTS.UPI_ROJMED_ACCOUNTS, payload);
    return response.data?.data;
  },

  async updateUpiAccount(id, payload) {
    const response = await axiosInstance.put(ENDPOINTS.UPI_ROJMED_ACCOUNT_DETAIL(id), payload);
    return response.data?.data;
  },

  async deleteUpiAccount(id) {
    const response = await axiosInstance.delete(ENDPOINTS.UPI_ROJMED_ACCOUNT_DETAIL(id));
    return response.data?.data;
  },

  async createEntry(payload) {
    const response = await axiosInstance.post(ENDPOINTS.UPI_ROJMED_ENTRIES, payload);
    if (payload.from_type) syncAccountCaches(payload.from_type, payload.from_id);
    if (payload.to_type) syncAccountCaches(payload.to_type, payload.to_id);
    return response.data?.data;
  },

  async updateEntry(id, payload, prevEntry = null) {
    const response = await axiosInstance.put(ENDPOINTS.UPI_ROJMED_ENTRY_DETAIL(id), payload);
    if (payload.from_type) syncAccountCaches(payload.from_type, payload.from_id);
    if (payload.to_type) syncAccountCaches(payload.to_type, payload.to_id);
    if (prevEntry?.from_type) syncAccountCaches(prevEntry.from_type, prevEntry.from_id);
    if (prevEntry?.to_type) syncAccountCaches(prevEntry.to_type, prevEntry.to_id);
    return response.data?.data;
  },

  async deleteEntry(id, entry = null) {
    const response = await axiosInstance.delete(ENDPOINTS.UPI_ROJMED_ENTRY_DETAIL(id));
    if (entry?.from_type) syncAccountCaches(entry.from_type, entry.from_id);
    if (entry?.to_type) syncAccountCaches(entry.to_type, entry.to_id);
    return response.data?.data;
  },
};

export default upiRojmedService;
