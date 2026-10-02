/**
 * Centralized API Endpoints
 * All endpoint paths are defined here to avoid hardcoded strings across components.
 */
export const ENDPOINTS = {
  HEALTH: '/health',
  WELCOME: '/welcome',
  ITEMS: '/items',
  WORKERS: '/workers',
  ORDERS: '/orders',
  AUTH: {
    LOGIN: '/auth/login',
    ME: '/auth/me',
    FORGOT_PASSWORD: '/auth/forgot-password',
    VERIFY_OTP: '/auth/verify-otp',
    RESET_PASSWORD: '/auth/reset-password',
    CHANGE_PASSWORD: '/auth/change-password',
    SEND_CHANGE_PASSWORD_OTP: '/auth/send-change-password-otp',
  },
};
