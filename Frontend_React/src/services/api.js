// API Service Layer
import axios from 'axios';
import config from '../config';
import { mockCartResponse, mockCategories, mockOrders, mockProducts } from './mockData';

// Create axios instance
const api = axios.create({
  baseURL: config.API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('medicare_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
// Keep 401 errors for callers to handle so we can show a meaningful message
// instead of abruptly clearing storage and redirecting.
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

// ========== AUTH APIs ==========

export const authAPI = {
  login: async (credentials) => {
    try {
      console.log("🔗 API: POST /api/auth/login", credentials);
      const response = await api.post('/api/auth/login', credentials);
      console.log("✅ API Response received:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ API Error:", error.response?.data || error.message);
      throw error;
    }
  },

  register: async (userData) => {
    try {
      console.log("🔗 API: POST /api/auth/register", userData);
      const response = await api.post('/api/auth/register', userData);
      console.log("✅ API Response received:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ API Error:", error.response?.data || error.message);
      throw error;
    }
  },



  logout: () => {
    localStorage.removeItem('medicare_token');
    localStorage.removeItem('medicare_user');
    localStorage.removeItem('medicare_logged_in');
    localStorage.removeItem('medicare_role');
  }
};

// ========== PRODUCTS APIs ==========

export const productsAPI = {
  getAll: async (params = {}) => {
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        category,
        sort
      } = params;

      const requestParams = {
        page,
        limit
      };

      if (search) {
        requestParams.search = search;
      }

      if (category) {
        requestParams.category = category;
      }

      if (sort) {
        requestParams.sort = sort;
      }

      const response = await api.get('/api/products', { params: requestParams });
      return response.data;
    } catch (error) {
      console.warn('Products API unavailable, using mock products.');

      const filtered = mockProducts.filter((product) => {
        const matchesCategory =
          !params.category || params.category === 'all' || product.category === params.category;
        const matchesSearch =
          !params.search ||
          product.name.toLowerCase().includes(params.search.toLowerCase()) ||
          product.description.toLowerCase().includes(params.search.toLowerCase());
        return matchesCategory && matchesSearch;
      });

      return {
        products: filtered,
        total: filtered.length,
        page: 1
      };
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`/api/products/${id}`);
      return response.data;
    } catch (error) {
      console.warn('Product details API unavailable, using mock product.');
      const product = mockProducts.find((item) => item._id === id) || mockProducts[0];
      return { product };
    }
  },

  searchProducts: async (query) => {
    const response = await api.get('/api/products', {
      params: { search: query }
    });
    return response.data;
  },

  getFeatured: async (limit = 8) => {
    try {
      const response = await api.get('/api/products/featured', { params: { limit } });
      return response.data;
    } catch (error) {
      console.warn('Featured products API unavailable, returning empty list.');
      return { success: false, data: [] };
    }
  }
};

// ========== CATEGORIES APIs ==========

export const categoriesAPI = {
  getAll: async () => {
    try {
      const response = await api.get('/api/categories');
      return response.data;
    } catch (error) {
      console.warn('Categories API unavailable, using mock categories.');
      return { categories: mockCategories };
    }
  },

  getStats: async () => {
    try {
      const response = await api.get('/api/categories/stats');
      return response.data;
    } catch (error) {
      console.warn('Categories stats API unavailable, falling back to zeros.');
      return {
        success: false,
        data: [],
      };
    }
  }
};

// ========== CART APIs ==========

export const cartAPI = {
  getCart: async () => {
    try {
      const response = await api.get('/api/cart');
      return response.data;
    } catch (error) {
      console.warn('Cart API unavailable, using mock cart.');
      return mockCartResponse;
    }
  },

  addToCart: async (productData) => {
    try {
      const response = await api.post('/api/cart', productData);
      return response.data;
    } catch (error) {
      console.warn('Cart API unavailable, mocking add-to-cart.');
      return { success: true, item: productData };
    }
  },

  updateCart: async (cartData) => {
    try {
      const response = await api.put('/api/cart', cartData);
      return response.data;
    } catch (error) {
      console.warn('Cart API unavailable, mocking cart update.');
      return { success: true, items: cartData };
    }
  },

  removeFromCart: async (productId) => {
    try {
      const response = await api.delete(`/api/cart/${productId}`);
      return response.data;
    } catch (error) {
      console.warn('Cart API unavailable, mocking remove-from-cart.');
      return { success: true, productId };
    }
  }
};

// ========== ORDERS APIs ==========

export const ordersAPI = {
  getOrders: async () => {
    try {
      const response = await api.get('/api/orders');
      return response.data;
    } catch (error) {
      console.warn('Orders API unavailable, using mock orders.');
      return { orders: mockOrders };
    }
  },

  createOrder: async (orderData) => {
    try {
      const response = await api.post('/api/orders', orderData);
      return response.data;
    } catch (error) {
      console.warn('Orders API unavailable, mocking order creation.');
      const mockOrder = {
        _id: 'order-mock',
        orderId: 'ORD-MOCK',
        status: 'Pending',
        createdAt: new Date().toISOString(),
        ...orderData,
        total:
          orderData?.items?.reduce(
            (sum, item) => sum + Number(item.subtotal || 0),
            0
          ) || 0
      };
      return { order: mockOrder };
    }
  },

  getOrderById: async (id) => {
    try {
      const response = await api.get(`/api/orders/${id}`);
      return response.data;
    } catch (error) {
      console.warn('Orders API unavailable, using mock order.');
      const order = mockOrders.find((item) => item._id === id) || mockOrders[0];
      return { order };
    }
  },

  reorder: async (orderId) => {
    const response = await api.post(`/api/orders/${orderId}/reorder`);
    return response.data;
  },

  downloadInvoice: async (orderId) => {
    const response = await api.get(`/api/orders/${orderId}/invoice`, {
      responseType: 'blob'
    });
    return response;
  }
};

// ========== PAYMENT APIs ==========

export const paymentAPI = {
  createVnpayPayment: async (payload) => {
    try {
      console.log("🔗 API: POST /api/payment/vnpay/create", payload);
      // Đây là endpoint tạo URL thanh toán VNPAY từ backend
      const response = await api.post('/api/payment/vnpay/create', payload);
      console.log("✅ VNPAY Payment URL received:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ VNPAY API Error:", error.response?.data || error.message);
      throw error;
    }
  },

  createMomoPayment: async (payload) => {
    try {
      console.log("🔗 API: POST /api/payment/momo", payload);
      // Endpoint tạo URL thanh toán MoMo từ backend
      const response = await api.post('/api/payment/momo', payload);
      console.log("✅ MoMo Payment URL received:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ MoMo API Error:", error.response?.data || error.message);
      throw error;
    }
  },

  verifyMomoReturn: async (payload) => {
    try {
      console.log("🔗 API: POST /api/payment/momo/return - Verifying MoMo payment status", payload);
      // NEW: Endpoint để verify MoMo return từ gateway
      // Backend sẽ check database để confirm trạng thái thanh toán
      const response = await api.post('/api/payment/momo/return', payload);
      console.log("✅ MoMo verification response received:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ MoMo verification error:", error.response?.data || error.message);
      // Don't throw - let caller handle gracefully with fallback
      throw error;
    }
  }
};

// ========== USERS APIs ==========

export const usersAPI = {
  getProfile: async () => {
    try {
      const response = await api.get('/api/users/profile');
      return response.data;
    } catch (error) {
      console.warn('Profile API unavailable, using mock profile.');
      return {
        user: {
          _id: 'mock-user-id',
          name: 'Admin Demo',
          email: 'admin@medicare.com',
          phone: '+1 (555) 987-6543',
          address: {
            street: '742 Evergreen Terrace',
            city: 'Springfield',
            state: 'IL',
            zipCode: '62704',
            country: 'USA'
          }
        }
      };
    }
  },

  updateProfile: async (userData) => {
    try {
      const response = await api.put('/api/users/profile', userData);
      return response.data;
    } catch (error) {
      console.warn('Profile update API unavailable, echoing mock profile.');
      return { user: { ...userData, _id: 'mock-user-id' } };
    }
  }
};

<<<<<<< HEAD
// ========== CHAT APIs ==========

export const chatAPI = {
  sendMessage: async (message) => {
    try {
      const response = await api.post('/api/chat', { message });
      return response.data;
    } catch (error) {
      console.error('Chat API Error:', error.response?.data || error.message);
      throw error;
    }
  }
};

=======
>>>>>>> c07e24c066535e759bc3b9d80a057ad1db488ca7
export default api;
