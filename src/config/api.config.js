/**
 * Centralized API Configuration
 * 
 * NOTE: Live API server URL (HTTPS): https://faizanbody.duckdns.org/api/v1
 * Configuration is managed via .env (VITE_API_BASE_URL) or DEFAULT_API_URL fallback.
 */

const DEFAULT_API_URL = 'https://faizanbody.duckdns.org/api/v1';

const rawUrl = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_URL).trim();

// Ensure base URL properly includes /api/v1 prefix
export const API_BASE_URL = rawUrl.endsWith('/api/v1')
  ? rawUrl
  : `${rawUrl.replace(/\/+$/, '')}/api/v1`;

export const APP_CONFIG = {
  appName: import.meta.env.VITE_APP_NAME || 'FaizanBody App',
  apiBaseUrl: API_BASE_URL,
  timeout: 15000, // 15 seconds
};
