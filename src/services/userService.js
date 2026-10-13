import axiosInstance from '../api/axiosInstance';
import { ENDPOINTS } from '../api/endpoints';

let cachedUsers = [];
const subscribers = new Set();

const notifySubscribers = () => {
  subscribers.forEach((cb) => cb([...cachedUsers]));
};

export const userService = {
  /**
   * Subscribe to reactive local state updates
   */
  subscribeUsers(callback) {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
  },

  /**
   * Get cached users instantly (0ms loading)
   */
  getCachedUsers() {
    return [...cachedUsers];
  },

  /**
   * Fetch all users from API
   */
  async getUsers() {
    const res = await axiosInstance.get(ENDPOINTS.USERS);
    const data = res.data?.data || [];
    cachedUsers = data;
    notifySubscribers();
    return { data };
  },

  /**
   * Get single user details
   */
  async getUserById(id) {
    const res = await axiosInstance.get(ENDPOINTS.USER_DETAIL(id));
    return res.data;
  },

  /**
   * Create a new user with granular permissions
   */
  async createUser(userData) {
    const res = await axiosInstance.post(ENDPOINTS.USERS, userData);
    const newUser = res.data?.data;
    if (newUser) {
      cachedUsers = [newUser, ...cachedUsers];
      notifySubscribers();
    }
    return res.data;
  },

  /**
   * Update existing user details & permissions
   */
  async updateUser(id, userData) {
    const res = await axiosInstance.put(ENDPOINTS.USER_DETAIL(id), userData);
    const updatedUser = res.data?.data;
    if (updatedUser) {
      cachedUsers = cachedUsers.map((u) => (u.id === id ? updatedUser : u));
      notifySubscribers();
    }
    return res.data;
  },

  /**
   * Toggle user active/suspended state
   */
  async toggleUserStatus(id) {
    const res = await axiosInstance.patch(ENDPOINTS.USER_TOGGLE_STATUS(id));
    const updatedUser = res.data?.data;
    if (updatedUser) {
      cachedUsers = cachedUsers.map((u) => (u.id === id ? updatedUser : u));
      notifySubscribers();
    }
    return res.data;
  },

  /**
   * Delete user permanently
   */
  async deleteUser(id) {
    const res = await axiosInstance.delete(ENDPOINTS.USER_DETAIL(id));
    cachedUsers = cachedUsers.filter((u) => u.id !== id);
    notifySubscribers();
    return res.data;
  },
};

export default userService;
