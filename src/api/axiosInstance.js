import axios from 'axios';
import { API_BASE_URL, APP_CONFIG } from '../config/api.config';

/**
 * ====================================================================
 * 🌐 CENTRALIZED AXIOS INSTANCE
 * ====================================================================
 * Ye single instance poore project me use hoga.
 * Aapko alag-alag fetch ya axios direct call karne ki zaroorat nahi hai.
 * Kisi bhi page ya component me is instance ko import karein ya service layer use karein.
 * 
 * 🔴 LIVE API BADALNE KE LIYE:
 * Sirf `.env` me `VITE_API_BASE_URL` change karein, 
 * poore project me automatic nayi API hit hone lagegi!
 */

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: APP_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ====================================================================
// 📤 REQUEST INTERCEPTOR
// Har API request jaane se pehle yaha se hokar guzregi
// ====================================================================
axiosInstance.interceptors.request.use(
  (config) => {
    // Agar authentication token ho to header me attach kar do
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Development logging
    if (import.meta.env.DEV) {
      console.log(`📡 [API Request] ${config.method?.toUpperCase()} -> ${config.baseURL}${config.url}`);
    }

    return config;
  },
  (error) => {
    console.error('❌ [Request Error]:', error);
    return Promise.reject(error);
  }
);

// ====================================================================
// 📥 RESPONSE INTERCEPTOR
// Server se response aane par yaha standard handling hogi
// ====================================================================
axiosInstance.interceptors.response.use(
  (response) => {
    // Development logging
    if (import.meta.env.DEV) {
      console.log(`✅ [API Response] ${response.status} from ${response.config.url}`, response.data);
    }
    return response;
  },
  (error) => {
    // Centralized error responses
    if (error.response) {
      const { status, data } = error.response;
      console.error(`🚨 [API Error ${status}]:`, data?.message || error.message);

      switch (status) {
        case 401:
          // Unauthorized: Token expire ya invalid
          console.warn('Session expired or unauthorized. Redirecting to login...');
          // localStorage.removeItem('token');
          // window.location.href = '/login';
          break;
        case 403:
          // Forbidden
          console.warn('Access forbidden: You do not have permission for this resource.');
          break;
        case 404:
          // Not Found
          console.warn('Requested resource not found.');
          break;
        case 500:
          // Internal Server Error
          console.error('Internal server error occurred on backend.');
          break;
        default:
          break;
      }
    } else if (error.request) {
      // Server down ya network issue
      console.error('🌐 [Network Error]: Backend server tak pahunch nahi sake. Make sure backend is running.');
    } else {
      console.error('⚙️ [Setup Error]:', error.message);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
