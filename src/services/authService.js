import axiosInstance from '../api/axiosInstance';
import { ENDPOINTS } from '../api/endpoints';

const TOKEN_KEY = 'faizanbody_auth_token';
const USER_KEY = 'faizanbody_auth_user';

export const authService = {
  /**
   * Login with Email OR Mobile and password
   */
  async login(identifier, password) {
    const res = await axiosInstance.post(ENDPOINTS.AUTH.LOGIN, {
      identifier: identifier?.trim(),
      password,
    });

    const payload = res.data?.data;
    if (payload?.token) {
      localStorage.setItem(TOKEN_KEY, payload.token);
      localStorage.setItem('token', payload.token); // for axiosInstance interceptor compatibility
      localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
    }
    return payload;
  },

  /**
   * Log out and clear saved session
   */
  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('token');
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem('token');
  },

  /**
   * Get cached user from localStorage
   */
  getCachedUser() {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  /**
   * Get token from localStorage
   */
  getToken() {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem('token');
  },

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated() {
    return !!this.getToken();
  },

  /**
   * Fetch latest profile from backend
   */
  async getMe() {
    const res = await axiosInstance.get(ENDPOINTS.AUTH.ME);
    const user = res.data?.data;
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    return user;
  },

  /**
   * Request OTP for Forgot Password (accepts email or mobile)
   */
  async forgotPassword(identifier) {
    const res = await axiosInstance.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, {
      identifier: identifier?.trim(),
    });
    return res.data;
  },

  /**
   * Verify entered OTP
   */
  async verifyOtp(identifier, otp) {
    const res = await axiosInstance.post(ENDPOINTS.AUTH.VERIFY_OTP, {
      identifier: identifier?.trim(),
      otp: otp?.trim(),
    });
    return res.data;
  },

  /**
   * Reset Password with OTP
   */
  async resetPassword({ identifier, otp, newPassword }) {
    const res = await axiosInstance.post(ENDPOINTS.AUTH.RESET_PASSWORD, {
      identifier: identifier?.trim(),
      otp: otp?.trim(),
      newPassword,
    });
    return res.data;
  },

  /**
   * Change Password (for logged-in user via Old / Current Password)
   */
  async changePassword({ currentPassword, newPassword }) {
    const res = await axiosInstance.post(ENDPOINTS.AUTH.CHANGE_PASSWORD, {
      currentPassword,
      newPassword,
    });
    return res.data;
  },
};

export default authService;
