import api from "../services/api";

export const getDashboardSummary = async () => {
  const response = await api.get("/api/admin/dashboard/summary");
  return response.data;
};

export const getRecentOrders = async () => {
  const response = await api.get("/api/admin/dashboard/recent-orders");
  return response.data;
};

export const getRecentUsers = async () => {
  const response = await api.get("/api/admin/dashboard/recent-users");
  return response.data;
};

export const getRevenue = async (range = "7d") => {
  const response = await api.get("/api/admin/dashboard/revenue", {
    params: { range },
  });
  return response.data;
};

const dashboard = {
  summary: getDashboardSummary,
  recentOrders: getRecentOrders,
  recentUsers: getRecentUsers,
  revenue: getRevenue,
};

const products = {
  list: async (params = {}) => {
    const response = await api.get("/api/admin/products", { params });
    return response.data;
  },
  get: async (id) => {
    const response = await api.get(`/api/admin/products/${id}`);
    return response.data;
  },
  create: async (payload) => {
    const response = await api.post("/api/admin/products", payload);
    return response.data;
  },
  update: async (id, payload) => {
    const response = await api.patch(`/api/admin/products/${id}`, payload);
    return response.data;
  },
  remove: async (id) => {
    await api.delete(`/api/admin/products/${id}`);
    return { success: true };
  },
};

const users = {
  list: async (params = {}) => {
    const response = await api.get("/api/admin/users", { params });
    return response.data;
  },
  get: async (id) => {
    const response = await api.get(`/api/admin/users/${id}`);
    return response.data;
  },
  update: async (id, payload) => {
    const response = await api.patch(`/api/admin/users/${id}`, payload);
    return response.data;
  },
  setBan: async (id, ban) => {
    const response = await api.patch(`/api/admin/users/${id}/ban`, { ban });
    return response.data;
  },
  setRole: async (id, role) => {
    const response = await api.patch(`/api/admin/users/${id}/role`, { role });
    return response.data;
  },
  resetPassword: async (id) => {
    const response = await api.post(`/api/admin/users/${id}/reset-password`);
    return response.data;
  },
};

export const listOrders = async (params = {}) => {
  const response = await api.get("/api/admin/orders", { params });
  return response.data;
};

export const getOrder = async (id) => {
  const response = await api.get(`/api/admin/orders/${id}`);
  return response.data;
};

export const updateOrderStatus = async (id, status) => {
  const response = await api.patch(`/api/admin/orders/${id}/status`, { status });
  return response.data;
};

export const updateOrder = async (id, payload) => {
  const response = await api.patch(`/api/admin/orders/${id}`, payload);
  return response.data;
};

const orders = {
  list: listOrders,
  get: getOrder,
  updateStatus: updateOrderStatus,
  update: updateOrder,
};

const adminApi = {
  dashboard,
  products,
  users,
  orders,
};

export default adminApi;
