import axiosInstance from '../api/axiosInstance';
import { ENDPOINTS } from '../api/endpoints';

let cachedQuotations = null;
let cachedCatalogItems = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60000;
const listeners = new Set();
const catalogListeners = new Set();

function notifyListeners() {
  if (cachedQuotations) {
    listeners.forEach((callback) => {
      try {
        callback(cachedQuotations);
      } catch (e) {
        console.error('Quotation listener error:', e);
      }
    });
  }
}

function notifyCatalogListeners() {
  if (cachedCatalogItems) {
    catalogListeners.forEach((callback) => {
      try {
        callback(cachedCatalogItems);
      } catch (e) {
        console.error('Catalog listener error:', e);
      }
    });
  }
}

export const quotationService = {
  subscribe(callback) {
    listeners.add(callback);
    if (cachedQuotations) {
      callback(cachedQuotations);
    }
    return () => listeners.delete(callback);
  },

  subscribeCatalog(callback) {
    catalogListeners.add(callback);
    if (cachedCatalogItems) {
      callback(cachedCatalogItems);
    }
    return () => catalogListeners.delete(callback);
  },

  getCachedQuotations() {
    return cachedQuotations || [];
  },

  getCachedCatalogItems() {
    return cachedCatalogItems || [];
  },

  async getQuotations(params = {}, { forceRefresh = false } = {}) {
    const isDefaultFetch = !params.search && (!params.status || params.status === 'all');
    const now = Date.now();

    if (isDefaultFetch && cachedQuotations && !forceRefresh && now - lastFetchTime < CACHE_TTL_MS) {
      return { success: true, data: cachedQuotations, fromCache: true };
    }

    try {
      const response = await axiosInstance.get(ENDPOINTS.QUOTATIONS, { params });
      const data = response.data;

      if (isDefaultFetch && data && Array.isArray(data.data)) {
        cachedQuotations = data.data;
        lastFetchTime = Date.now();
        notifyListeners();
      }

      return data;
    } catch (err) {
      if (cachedQuotations) {
        return { success: true, data: cachedQuotations, fromCache: true };
      }
      throw err;
    }
  },

  async getQuotationById(id) {
    const numId = Number(id);
    if (cachedQuotations) {
      const found = cachedQuotations.find((q) => q.id === numId);
      if (found) return { success: true, data: found };
    }
    const response = await axiosInstance.get(ENDPOINTS.QUOTATION_DETAIL(id));
    return response.data;
  },

  async createQuotation(data) {
    const response = await axiosInstance.post(ENDPOINTS.QUOTATIONS, data);
    const newQuote = response.data?.data;

    if (newQuote) {
      cachedQuotations = cachedQuotations ? [newQuote, ...cachedQuotations] : [newQuote];
      notifyListeners();
    }

    return response.data;
  },

  async updateQuotation(id, data) {
    const response = await axiosInstance.put(ENDPOINTS.QUOTATION_DETAIL(id), data);
    const updated = response.data?.data;

    if (updated && cachedQuotations) {
      cachedQuotations = cachedQuotations.map((q) => (q.id === Number(id) ? updated : q));
      notifyListeners();
    }

    return response.data;
  },

  async deleteQuotation(id) {
    const response = await axiosInstance.delete(ENDPOINTS.QUOTATION_DETAIL(id));
    const numId = Number(id);

    if (cachedQuotations) {
      cachedQuotations = cachedQuotations.filter((q) => q.id !== numId);
      notifyListeners();
    }

    return response.data;
  },

  // =========================================================================
  // Catalog Items
  // =========================================================================

  async getCatalogItems({ forceRefresh = false } = {}) {
    if (cachedCatalogItems && !forceRefresh) {
      return { success: true, data: cachedCatalogItems, fromCache: true };
    }
    try {
      const response = await axiosInstance.get(ENDPOINTS.QUOTATION_CATALOG_ITEMS);
      const data = response.data;
      if (data && Array.isArray(data.data)) {
        cachedCatalogItems = data.data;
        notifyCatalogListeners();
      }
      return data;
    } catch (err) {
      if (cachedCatalogItems) {
        return { success: true, data: cachedCatalogItems, fromCache: true };
      }
      throw err;
    }
  },

  async saveCatalogItem(itemData) {
    const response = await axiosInstance.post(ENDPOINTS.QUOTATION_CATALOG_ITEMS, itemData);
    const saved = response.data?.data;
    if (saved) {
      if (!cachedCatalogItems) cachedCatalogItems = [];
      const idx = cachedCatalogItems.findIndex((it) => it.id === saved.id || it.name.toLowerCase() === saved.name.toLowerCase());
      if (idx !== -1) {
        cachedCatalogItems[idx] = saved;
      } else {
        cachedCatalogItems.push(saved);
      }
      cachedCatalogItems.sort((a, b) => a.name.localeCompare(b.name));
      notifyCatalogListeners();
    }
    return response.data;
  },

  async deleteCatalogItem(id) {
    const response = await axiosInstance.delete(ENDPOINTS.QUOTATION_CATALOG_ITEM_DELETE(id));
    const numId = Number(id);
    if (cachedCatalogItems) {
      cachedCatalogItems = cachedCatalogItems.filter((it) => it.id !== numId);
      notifyCatalogListeners();
    }
    return response.data;
  },
};

export default quotationService;

