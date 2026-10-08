import axiosInstance from '../api/axiosInstance';
import { ENDPOINTS } from '../api/endpoints';

/**
 * High-Performance Worker Service with In-Memory Caching & SWR (Stale-While-Revalidate)
 * Delivers sub-millisecond data access for thousands of records without blocking spinners.
 */
let cachedWorkers = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60000; // 1 minute fresh cache
const listeners = new Set();

function notifyListeners() {
  if (cachedWorkers) {
    listeners.forEach((callback) => {
      try {
        callback(cachedWorkers);
      } catch (e) {
        console.error('Listener callback error:', e);
      }
    });
  }
}

export const workerService = {
  /**
   * Subscribe to worker data updates across any component
   */
  subscribe(callback) {
    listeners.add(callback);
    if (cachedWorkers) {
      callback(cachedWorkers);
    }
    return () => listeners.delete(callback);
  },

  /**
   * Fetch all workers with instant cache delivery and background revalidation
   */
  async getWorkers(params = {}, { forceRefresh = false } = {}) {
    const isDefaultFetch = !params.search && (!params.status || params.status === 'all');
    const now = Date.now();

    // 1. Instant Cache Hit: Return immediately in 0ms if cache is fresh
    if (isDefaultFetch && cachedWorkers && !forceRefresh && (now - lastFetchTime < CACHE_TTL_MS)) {
      return { success: true, data: cachedWorkers, fromCache: true };
    }

    try {
      const response = await axiosInstance.get(ENDPOINTS.WORKERS, { params });
      const data = response.data;

      if (isDefaultFetch && data && Array.isArray(data.data)) {
        cachedWorkers = data.data;
        lastFetchTime = Date.now();
        notifyListeners();
      }

      return data;
    } catch (err) {
      // 2. Offline / Network Fallback: Return cached data if request fails
      if (cachedWorkers) {
        return { success: true, data: cachedWorkers, fromCache: true };
      }
      throw err;
    }
  },

  /**
   * Synchronously get current cached workers in 0ms without waiting
   */
  getCachedWorkers() {
    return cachedWorkers || [];
  },

  /**
   * Fetch single worker by ID
   */
  async getWorkerById(id) {
    const numId = Number(id);
    if (cachedWorkers) {
      const found = cachedWorkers.find((w) => w.id === numId);
      if (found) return { success: true, data: found };
    }
    const response = await axiosInstance.get(`${ENDPOINTS.WORKERS}/${id}`);
    return response.data;
  },

  /**
   * Create new worker with optimistic cache update
   */
  async createWorker(workerData) {
    const response = await axiosInstance.post(ENDPOINTS.WORKERS, workerData);
    const newWorker = response.data?.data;

    if (newWorker) {
      if (cachedWorkers) {
        const exists = cachedWorkers.some((w) => w.id === newWorker.id);
        if (!exists) {
          cachedWorkers = [newWorker, ...cachedWorkers];
        }
      } else {
        cachedWorkers = [newWorker];
      }
      notifyListeners();
    }

    return response.data;
  },

  /**
   * Update existing worker with immediate cache update
   */
  async updateWorker(id, workerData) {
    const response = await axiosInstance.put(`${ENDPOINTS.WORKERS}/${id}`, workerData);
    const updated = response.data?.data;

    if (updated && cachedWorkers) {
      cachedWorkers = cachedWorkers.map((w) => (w.id === Number(id) ? updated : w));
      notifyListeners();
    }

    return response.data;
  },

  /**
   * Delete worker with immediate cache removal
   */
  async deleteWorker(id) {
    const response = await axiosInstance.delete(`${ENDPOINTS.WORKERS}/${id}`);
    const numId = Number(id);

    if (cachedWorkers) {
      cachedWorkers = cachedWorkers.filter((w) => w.id !== numId);
      notifyListeners();
    }

    return response.data;
  },

  /**
   * Upload Aadhar Card photo (captured via camera or selected from gallery)
   */
  async uploadAadharPhoto(file, workerId = 'common') {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('workerId', String(workerId));

    const response = await axiosInstance.post(ENDPOINTS.WORKERS_UPLOAD_AADHAR, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data?.data;
  },

  /**
   * Get all Khata transactions & summary for a worker
   */
  async getWorkerTransactions(workerId) {
    try {
      const response = await axiosInstance.get(ENDPOINTS.WORKER_TRANSACTIONS(workerId));
      const data = response.data?.data;
      if (data && typeof data === 'object') {
        return {
          transactions: Array.isArray(data.transactions) ? data.transactions : [],
          summary: {
            total_salary: Number(data.summary?.total_salary) || 0,
            total_upad: Number(data.summary?.total_upad) || 0,
            total_paid: Number(data.summary?.total_paid) || 0,
            balance: Number(data.summary?.balance) || 0,
          },
        };
      }
    } catch (err) {
      console.warn('⚠️ [WorkerService Khata API offline fallback]:', err.message);
    }
    return {
      transactions: [],
      summary: { total_salary: 0, total_upad: 0, total_paid: 0, balance: 0 },
    };
  },

  /**
   * Add a new transaction (upad, payment, salary) for a worker
   */
  async addWorkerTransaction(workerId, transactionData) {
    const response = await axiosInstance.post(ENDPOINTS.WORKER_TRANSACTIONS(workerId), transactionData);
    const data = response.data?.data;

    // Update in cachedWorkers immediately so cards refresh instantly
    if (data && data.summary && cachedWorkers) {
      const numId = Number(workerId);
      cachedWorkers = cachedWorkers.map((w) => {
        if (w.id === numId) {
          return {
            ...w,
            khata: data.summary,
          };
        }
        return w;
      });
      notifyListeners();
    }

    return data;
  },

  /**
   * Delete a transaction record
   */
  async deleteWorkerTransaction(workerId, transactionId) {
    const response = await axiosInstance.delete(ENDPOINTS.WORKER_TRANSACTION_DELETE(workerId, transactionId));
    const data = response.data?.data;

    if (data && data.summary && cachedWorkers) {
      const numId = Number(workerId);
      cachedWorkers = cachedWorkers.map((w) => {
        if (w.id === numId) {
          return {
            ...w,
            khata: data.summary,
          };
        }
        return w;
      });
      notifyListeners();
    }

    return response.data;
  },

  /**
   * Get overall workshop-wide Khata summary
   */
  async getWorkshopKhataSummary() {
    const response = await axiosInstance.get(ENDPOINTS.WORKERS_KHATA_SUMMARY);
    return response.data?.data;
  },
};


export function getAadharFullUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1').replace(/\/api\/v1\/?$/, '');
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default workerService;

