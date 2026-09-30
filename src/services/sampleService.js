import axiosInstance from '../api/axiosInstance';
import { ENDPOINTS } from '../api/endpoints';

export const sampleService = {
  /**
   * Get overview / welcome info
   */
  async getWelcome() {
    const response = await axiosInstance.get(ENDPOINTS.WELCOME);
    return response.data;
  },

  /**
   * Get sample data items
   */
  async getItems() {
    const response = await axiosInstance.get(ENDPOINTS.ITEMS);
    return response.data;
  },
};
