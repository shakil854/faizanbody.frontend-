import axiosInstance from '../api/axiosInstance';
import { ENDPOINTS } from '../api/endpoints';
import { compressImageFile } from '../utils/nativeCamera';

let cachedOrders = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60000;
const listeners = new Set();

function notifyListeners() {
  if (cachedOrders) {
    listeners.forEach((callback) => {
      try {
        callback(cachedOrders);
      } catch (e) {
        console.error('Order listener error:', e);
      }
    });
  }
}

export const orderService = {
  subscribe(callback) {
    listeners.add(callback);
    if (cachedOrders) {
      callback(cachedOrders);
    }
    return () => listeners.delete(callback);
  },

  async getOrders(params = {}, { forceRefresh = false } = {}) {
    const isDefaultFetch = !params.search && (!params.status || params.status === 'all');
    const now = Date.now();

    if (isDefaultFetch && cachedOrders && !forceRefresh && now - lastFetchTime < CACHE_TTL_MS) {
      return { success: true, data: cachedOrders, fromCache: true };
    }

    try {
      const response = await axiosInstance.get(ENDPOINTS.ORDERS, { params });
      const data = response.data;

      if (isDefaultFetch && data && Array.isArray(data.data)) {
        cachedOrders = data.data;
        lastFetchTime = Date.now();
        notifyListeners();
      }

      return data;
    } catch (err) {
      if (cachedOrders) {
        return { success: true, data: cachedOrders, fromCache: true };
      }
      throw err;
    }
  },

  getCachedOrders() {
    return cachedOrders || [];
  },

  async getOrderById(id) {
    const numId = Number(id);
    if (cachedOrders) {
      const found = cachedOrders.find((o) => o.id === numId);
      if (found) return { success: true, data: found };
    }
    const response = await axiosInstance.get(`${ENDPOINTS.ORDERS}/${id}`);
    return response.data;
  },

  async createOrder(orderData) {
    const response = await axiosInstance.post(ENDPOINTS.ORDERS, orderData);
    const newOrder = response.data?.data;

    if (newOrder && cachedOrders) {
      cachedOrders = [newOrder, ...cachedOrders];
      notifyListeners();
    }

    return response.data;
  },

  async updateOrder(id, orderData) {
    const response = await axiosInstance.put(`${ENDPOINTS.ORDERS}/${id}`, orderData);
    const updated = response.data?.data;

    if (updated && cachedOrders) {
      cachedOrders = cachedOrders.map((o) => (o.id === Number(id) ? updated : o));
      notifyListeners();
    }

    return response.data;
  },

  async toggleTaskDone(id, { section, itemKey, done }) {
    // Optimistic update in cache for snappy 0ms UI feedback
    if (cachedOrders) {
      cachedOrders = cachedOrders.map((order) => {
        if (order.id !== Number(id)) return order;
        const copy = JSON.parse(JSON.stringify(order));
        if (section === 'finishing_work') {
          if (!copy.finishing_work) copy.finishing_work = {};
          if (!copy.finishing_work[itemKey]) copy.finishing_work[itemKey] = { value: '', boxes: ['', '', ''], done: false };
          copy.finishing_work[itemKey].done = done;
        } else {
          if (!copy[section]) copy[section] = { boxes: ['', '', ''], items: {} };
          if (!copy[section].items) copy[section].items = {};
          if (!copy[section].items[itemKey]) copy[section].items[itemKey] = { value: '', done: false };
          copy[section].items[itemKey].done = done;
        }
        return copy;
      });
      notifyListeners();
    }

    const response = await axiosInstance.patch(`${ENDPOINTS.ORDERS}/${id}/toggle-task`, {
      section,
      itemKey,
      done,
    });
    const updated = response.data?.data;

    if (updated && cachedOrders) {
      cachedOrders = cachedOrders.map((o) => (o.id === Number(id) ? updated : o));
      notifyListeners();
    }

    return response.data;
  },

  async deleteOrder(id) {
    const response = await axiosInstance.delete(`${ENDPOINTS.ORDERS}/${id}`);
    const numId = Number(id);

    if (cachedOrders) {
      cachedOrders = cachedOrders.filter((o) => o.id !== numId);
      notifyListeners();
    }

    return response.data;
  },

  async uploadPhotos(id, files) {
    let rawList = [];
    if (Array.isArray(files)) {
      rawList = files;
    } else if (files instanceof FileList) {
      rawList = Array.from(files);
    } else if (files) {
      rawList = [files];
    }

    // High-speed client-side image compression: reduces 10MB camera photo to ~80-120KB in milliseconds!
    const compressedList = await Promise.all(
      rawList.map((file) => compressImageFile(file, 1024, 0.70))
    );

    const formData = new FormData();
    compressedList.forEach((file) => formData.append('photos', file));

    const response = await axiosInstance.post(`${ENDPOINTS.ORDERS}/${id}/photos`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 90000, // 90s timeout ensures mobile uploads never prematurely abort
    });

    const updated = response.data?.data;
    if (updated && cachedOrders) {
      cachedOrders = cachedOrders.map((o) => (o.id === Number(id) ? updated : o));
      notifyListeners();
    }

    return response.data;
  },

  async deletePhoto(id, photoId) {
    const response = await axiosInstance.delete(`${ENDPOINTS.ORDERS}/${id}/photos/${encodeURIComponent(photoId)}`);
    const updated = response.data?.data;

    if (updated && cachedOrders) {
      cachedOrders = cachedOrders.map((o) => (o.id === Number(id) ? updated : o));
      notifyListeners();
    }

    return response.data;
  },

  async deleteAllPhotos(id) {
    const response = await axiosInstance.delete(`${ENDPOINTS.ORDERS}/${id}/photos`);
    const updated = response.data?.data;

    if (updated && cachedOrders) {
      cachedOrders = cachedOrders.map((o) => (o.id === Number(id) ? updated : o));
      notifyListeners();
    }

    return response.data;
  },
};

export function getPhotoFullUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1').replace(/\/api\/v1\/?$/, '');
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default orderService;

