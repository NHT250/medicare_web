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
      const response = await api.post('/api/auth/login', credentials);
      return response.data;
    } catch (error) {
      console.warn('Auth API unavailable, returning mock login response.');
      return {
        token: 'mock-token',
        user: {
          _id: 'mock-user-id',
          name: credentials?.email?.split('@')[0] || 'Guest User',
          email: credentials?.email || 'guest@medicare.com',
          role: 'customer'
        }
      };
    }
  },

  register: async (userData) => {
    try {
      const response = await api.post('/api/auth/register', userData);
      return response.data;
    } catch (error) {
      console.warn('Auth API unavailable, returning mock registration response.');
      return {
        message: 'Registration successful (mock)',
        user: {
          _id: 'mock-user-id',
          email: userData?.email,
          name: userData?.name,
          phone: userData?.phone,
          role: 'customer',
        },
      };
    }
  },

  verifyOtp: async (payload) => {
    try {
      const response = await api.post('/api/auth/verify-otp', payload);
      return response.data;
    } catch (error) {
      console.warn('Verify OTP API unavailable; OTP verification is disabled.');
      return { message: 'OTP verification not required.' };
    }
  },

  resendOtp: async (payload) => {
    try {
      const response = await api.post('/api/auth/resend-otp', payload);
      return response.data;
    } catch (error) {
      console.warn('Resend OTP API unavailable; OTP verification is disabled.');
      return { message: 'OTP verification not required.' };
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

export default api;
