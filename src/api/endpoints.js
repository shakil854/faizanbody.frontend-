/**
 * Centralized API Endpoints
 * All endpoint paths are defined here to avoid hardcoded strings across components.
 */
export const ENDPOINTS = {
  HEALTH: '/health',
  WELCOME: '/welcome',
  ITEMS: '/items',
  WORKERS: '/workers',
  WORKERS_UPLOAD_AADHAR: '/workers/upload-aadhar',
  WORKERS_KHATA_SUMMARY: '/workers/khata/summary',
  WORKER_TRANSACTIONS: (id) => `/workers/${id}/transactions`,
  WORKER_TRANSACTION_DELETE: (workerId, txId) => `/workers/${workerId}/transactions/${txId}`,
  ORDERS: '/orders',
  STOCK_CATEGORIES: '/stock/categories',
  STOCK_CATEGORY_DELETE: (id) => `/stock/categories/${id}`,
  STOCK_ITEMS: '/stock/items',
  STOCK_ITEM_DETAIL: (id) => `/stock/items/${id}`,
  STOCK_ITEM_ADJUST: (id) => `/stock/items/${id}/adjust`,
  STOCK_ITEM_TRANSACTIONS: (id) => `/stock/items/${id}/transactions`,
  STOCK_TRANSACTIONS: '/stock/transactions',
  STOCK_SUMMARY: '/stock/summary',
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
