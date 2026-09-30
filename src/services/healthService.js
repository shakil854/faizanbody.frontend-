import axiosInstance from '../api/axiosInstance';
import { ENDPOINTS } from '../api/endpoints';

export const healthService = {
  /**
   * Check backend health and uptime
   */
  async checkHealth() {
    const response = await axiosInstance.get(ENDPOINTS.HEALTH);
    return response.data;
  },
};
