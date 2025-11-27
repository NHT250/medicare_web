import api from './api';

export const getMyOrder = async (id) => {
  const response = await api.get(`/api/orders/${id}`);
  return response.data;
};

export const cancelMyOrder = async (id) => {
  const response = await api.patch(`/api/orders/${id}/status`, {
    status: 'Cancelled'
  });
  return response.data;
};

export default {
  getMyOrder,
  cancelMyOrder
};
