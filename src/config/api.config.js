/**
 * Centralized API Configuration
 * 
 * NOTE: Agar aap live server pe deploy karte ho ya live API use karni ho,
 * to ya to `.env` me `VITE_API_BASE_URL` change kar do,
 * ya phir direct yaha niche LIVE_API_URL me apna live domain daal sakte ho!
 */

const DEFAULT_API_URL = 'http://localhost:5000/api/v1';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_URL;

export const APP_CONFIG = {
  appName: import.meta.env.VITE_APP_NAME || 'FaizanBody App',
  apiBaseUrl: API_BASE_URL,
  timeout: 15000, // 15 seconds
};
