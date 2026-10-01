import axiosInstance from '../api/axiosInstance';
import { ENDPOINTS } from '../api/endpoints';

export const workerService = {
  /**
   * Fetch all workers with optional search and status filter
   */
  async getWorkers(params = {}) {
    const response = await axiosInstance.get(ENDPOINTS.WORKERS, { params });
    return response.data;
  },

  /**
   * Fetch single worker by ID
   */
  async getWorkerById(id) {
    const response = await axiosInstance.get(`${ENDPOINTS.WORKERS}/${id}`);
    return response.data;
  },

  /**
   * Create new worker (name, coming_date, going_date)
   */
  async createWorker(workerData) {
    const response = await axiosInstance.post(ENDPOINTS.WORKERS, workerData);
    return response.data;
  },

  /**
   * Update existing worker
   */
  async updateWorker(id, workerData) {
    const response = await axiosInstance.put(`${ENDPOINTS.WORKERS}/${id}`, workerData);
    return response.data;
  },

  /**
   * Delete worker
   */
  async deleteWorker(id) {
    const response = await axiosInstance.delete(`${ENDPOINTS.WORKERS}/${id}`);
    return response.data;
  },
};
