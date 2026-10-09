import axiosInstance from '../api/axiosInstance';
import { ENDPOINTS } from '../api/endpoints';

let cachedItems = null;
let cachedCategories = null;
let lastItemsFetch = 0;
let lastCategoriesFetch = 0;
const CACHE_TTL_MS = 60000;

const itemListeners = new Set();
const categoryListeners = new Set();

function notifyItemListeners() {
  if (cachedItems) {
    itemListeners.forEach((callback) => {
      try {
        callback(cachedItems);
      } catch (e) {
        console.error('Stock item listener error:', e);
      }
    });
  }
}

function notifyCategoryListeners() {
  if (cachedCategories) {
    categoryListeners.forEach((callback) => {
      try {
        callback(cachedCategories);
      } catch (e) {
        console.error('Stock category listener error:', e);
      }
    });
  }
}

export const stockService = {
  /* ====================================================================
   * 🔔 Reactive Subscriptions
   * ==================================================================== */
  subscribeItems(callback) {
    itemListeners.add(callback);
    if (cachedItems) {
      callback(cachedItems);
    }
    return () => itemListeners.delete(callback);
  },

  subscribeCategories(callback) {
    categoryListeners.add(callback);
    if (cachedCategories) {
      callback(cachedCategories);
    }
    return () => categoryListeners.delete(callback);
  },

  /* ====================================================================
   * 🏷️ Categories
   * ==================================================================== */
  async getCategories({ forceRefresh = false } = {}) {
    const now = Date.now();
    if (cachedCategories && !forceRefresh && now - lastCategoriesFetch < CACHE_TTL_MS) {
      return { success: true, data: cachedCategories, fromCache: true };
    }

    try {
      const response = await axiosInstance.get(ENDPOINTS.STOCK_CATEGORIES);
      const data = response.data;
      if (data && Array.isArray(data.data)) {
        cachedCategories = data.data;
        lastCategoriesFetch = Date.now();
        notifyCategoryListeners();
      }
      return data;
    } catch (err) {
      if (cachedCategories) {
        return { success: true, data: cachedCategories, fromCache: true };
      }
      throw err;
    }
  },

  getCachedCategories() {
    return cachedCategories || [];
  },

  async createCategory(name) {
    const response = await axiosInstance.post(ENDPOINTS.STOCK_CATEGORIES, { name });
    const data = response.data;
    if (data && data.data) {
      if (!cachedCategories) cachedCategories = [];
      const exists = cachedCategories.some(
        (c) => c.name.toLowerCase() === data.data.name.toLowerCase()
      );
      if (!exists) {
        cachedCategories = [...cachedCategories, { ...data.data, item_count: 0 }].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        notifyCategoryListeners();
      }
    }
    return data;
  },

  async deleteCategory(id) {
    const response = await axiosInstance.delete(ENDPOINTS.STOCK_CATEGORY_DELETE(id));
    if (cachedCategories) {
      cachedCategories = cachedCategories.filter((c) => c.id !== id);
      notifyCategoryListeners();
    }
    return response.data;
  },

  /* ====================================================================
   * 📦 Stock Items
   * ==================================================================== */
  async getItems(params = {}, { forceRefresh = false } = {}) {
    const isDefaultFetch = !params.search && (!params.category || params.category === 'all') && !params.lowStockOnly;
    const now = Date.now();

    if (isDefaultFetch && cachedItems && !forceRefresh && now - lastItemsFetch < CACHE_TTL_MS) {
      return { success: true, data: cachedItems, fromCache: true };
    }

    try {
      const response = await axiosInstance.get(ENDPOINTS.STOCK_ITEMS, { params });
      const data = response.data;

      if (isDefaultFetch && data && Array.isArray(data.data)) {
        cachedItems = data.data;
        lastItemsFetch = Date.now();
        notifyItemListeners();
      }

      return data;
    } catch (err) {
      if (cachedItems) {
        return { success: true, data: cachedItems, fromCache: true };
      }
      throw err;
    }
  },

  getCachedItems() {
    return cachedItems || [];
  },

  async getItemById(id) {
    const response = await axiosInstance.get(ENDPOINTS.STOCK_ITEM_DETAIL(id));
    return response.data;
  },

  async createItem(itemData) {
    const response = await axiosInstance.post(ENDPOINTS.STOCK_ITEMS, itemData);
    const data = response.data;

    if (data && data.data) {
      if (!cachedItems) cachedItems = [];
      cachedItems = [data.data, ...cachedItems];
      notifyItemListeners();
      // Re-fetch categories silently to update category counts
      this.getCategories({ forceRefresh: true }).catch(() => {});
    }

    return data;
  },

  async updateItem(id, itemData) {
    const response = await axiosInstance.put(ENDPOINTS.STOCK_ITEM_DETAIL(id), itemData);
    const data = response.data;

    if (data && data.data && cachedItems) {
      cachedItems = cachedItems.map((i) => (i.id === id ? data.data : i));
      notifyItemListeners();
      this.getCategories({ forceRefresh: true }).catch(() => {});
    }

    return data;
  },

  async deleteItem(id) {
    const response = await axiosInstance.delete(ENDPOINTS.STOCK_ITEM_DETAIL(id));

    if (cachedItems) {
      cachedItems = cachedItems.filter((i) => i.id !== id);
      notifyItemListeners();
      this.getCategories({ forceRefresh: true }).catch(() => {});
    }

    return response.data;
  },

  /* ====================================================================
   * 🔄 Stock Adjustment (IN / OUT) & History
   * ==================================================================== */
  async adjustStock(id, { type, quantity, date, reference_note }) {
    const response = await axiosInstance.post(ENDPOINTS.STOCK_ITEM_ADJUST(id), {
      type,
      quantity,
      date,
      reference_note,
    });
    const data = response.data;

    if (data && data.data && cachedItems) {
      cachedItems = cachedItems.map((i) => (i.id === id ? data.data : i));
      notifyItemListeners();
    }

    return data;
  },

  async getItemTransactions(id) {
    const response = await axiosInstance.get(ENDPOINTS.STOCK_ITEM_TRANSACTIONS(id));
    return response.data;
  },

  async getAllTransactions(limit = 50) {
    const response = await axiosInstance.get(ENDPOINTS.STOCK_TRANSACTIONS, {
      params: { limit },
    });
    return response.data;
  },

  async getSummary() {
    const response = await axiosInstance.get(ENDPOINTS.STOCK_SUMMARY);
    return response.data;
  },
};

export default stockService;
