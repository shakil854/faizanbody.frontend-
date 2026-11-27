import axiosInstance from '../api/axiosInstance';
import { ENDPOINTS } from '../api/endpoints';

export const deleteRequestService = {
  async createRequest(payload) {
    const res = await axiosInstance.post(ENDPOINTS.DELETE_REQUESTS, payload);
    return res.data;
  },

  async listRequests(params = {}) {
    const res = await axiosInstance.get(ENDPOINTS.DELETE_REQUESTS, { params });
    return res.data?.data || [];
  },

  async getPendingCount() {
    const res = await axiosInstance.get(ENDPOINTS.DELETE_REQUEST_PENDING_COUNT);
    return res.data?.data?.count || 0;
  },

  async getPendingKeys() {
    const res = await axiosInstance.get(ENDPOINTS.DELETE_REQUEST_PENDING_KEYS);
    return res.data?.data || [];
  },

  async approveRequest(id, reviewNote = '') {
    const res = await axiosInstance.post(ENDPOINTS.DELETE_REQUEST_APPROVE(id), { reviewNote });
    return res.data;
  },

  async rejectRequest(id, reviewNote = '') {
    const res = await axiosInstance.post(ENDPOINTS.DELETE_REQUEST_REJECT(id), { reviewNote });
    return res.data;
  },
};

export default deleteRequestService;

