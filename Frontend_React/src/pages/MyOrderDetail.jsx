import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { cancelMyOrder, getMyOrder } from '../services/ordersAPI';

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
});

const formatMoney = (value) => {
  const amount = Number(value || 0);
  if (Number.isNaN(amount)) {
    return '$0.00';
  }
  return moneyFormatter.format(amount);
};

const STATUS_MAP = {
  Pending: 'pending',
  Confirmed: 'processing',
  Delivered: 'delivered',
  Cancelled: 'cancelled'
};

const STATUS_LABELS = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled'
};

const normaliseStatusKey = (status) => {
  if (!status) {
    return 'pending';
  }
  const raw = status.toString().trim();
  if (!raw) {
    return 'pending';
  }
  if (STATUS_MAP[raw]) {
    return STATUS_MAP[raw];
  }
  const canonical = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  if (STATUS_MAP[canonical]) {
    return STATUS_MAP[canonical];
  }
  return raw.toLowerCase();
};

const statusClass = (status) => {
  const map = {
    pending: 'bg-warning text-dark',
    processing: 'bg-primary',
    shipped: 'bg-primary',
    delivered: 'bg-success',
    cancelled: 'bg-danger'
  };

  const key = normaliseStatusKey(status);
  return `badge ${map[key] || 'bg-secondary'}`;
};

const formatDateTime = (value) => {
  if (!value) return '—';
  try {
    const date = new Date(value);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return value;
  }
};

const MyOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const title = useMemo(() => {
    if (!order) return '';
    const displayId = order.order_id || order.id || id;
    return `Order #${displayId}`;
  }, [order, id]);

  useEffect(() => {
    const loadOrder = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await getMyOrder(id);
        setOrder(data);
      } catch (err) {
        console.error('Failed to load order detail', err);
        const status = err?.response?.status;
        if (status === 404) {
          setError('Order not found.');
        } else if (status === 403) {
          setError('You do not have permission to view this order.');
        } else {
          setError('Failed to load order details. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [id]);

  const handleCancelOrder = async () => {
    if (!order) return;
    const confirmed = window.confirm('Are you sure you want to cancel this order?');
    if (!confirmed) return;

    try {
      setActionLoading(true);
      const data = await cancelMyOrder(id);
      setOrder(data);
      window.alert('Order has been cancelled successfully.');
      navigate('/orders');
    } catch (err) {
      console.error('Failed to cancel order', err);
      const status = err?.response?.status;
      const message =
        status === 400
          ? err?.response?.data?.error || 'This order cannot be cancelled.'
          : 'Unable to cancel the order right now.';
      window.alert(message);
    } finally {
      setActionLoading(false);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3 text-muted">Loading order details...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-5">
          <h4 className="text-danger mb-3">{error}</h4>
          <button className="btn btn-primary" onClick={() => navigate('/orders')}>
            Back to Orders
          </button>
        </div>
      );
    }

    if (!order) {
      return null;
    }

    const updatedLabel = order.updated_at ? `Updated ${formatDateTime(order.updated_at)}` : null;
    const items = Array.isArray(order.items) ? order.items : [];
    const shipping = order.shipping || {};
    const payment = order.payment || {};

    return (
      <div className="my-4">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
          <div>
            <h3 className="mb-1">{title}</h3>
            <div className="text-muted">
              Placed on {formatDateTime(order.created_at)}{' '}
              {updatedLabel && <span className="ms-2">({updatedLabel})</span>}
            </div>
          </div>
          <span className={statusClass(order.status)}>
            {STATUS_LABELS[normaliseStatusKey(order.status)] || order.status || 'Pending'}
          </span>
        </div>

        <div className="mt-4">
          <button className="btn btn-outline-secondary me-2" onClick={() => navigate('/orders')}>
            <i className="fas fa-arrow-left me-2"></i>
            Back to Orders
          </button>
          {normaliseStatusKey(order.status) === 'pending' && (
            <button
              className="btn btn-danger"
              onClick={handleCancelOrder}
              disabled={actionLoading}
            >
              {actionLoading ? 'Cancelling...' : 'Cancel Order'}
            </button>
          )}
        </div>

        <div className="card mt-4">
          <div className="card-header">
            <strong>Order Items</strong>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table mb-0">
                <thead className="table-light">
                  <tr>
                    <th scope="col">Product</th>
                    <th scope="col" className="text-center">
                      Qty
                    </th>
                    <th scope="col" className="text-end">
                      Unit Price
                    </th>
                    <th scope="col" className="text-end">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td colSpan="4" className="text-center text-muted py-4">
                        No items found for this order.
                      </td>
                    </tr>
                  )}
                  {items.map((item, index) => (
                    <tr key={`${item.product_id || index}-${index}`}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="rounded"
                              style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                            />
                          ) : (
                            <div
                              className="bg-light d-flex align-items-center justify-content-center rounded"
                              style={{ width: '60px', height: '60px' }}
                            >
                              <i className="fas fa-box text-muted"></i>
                            </div>
                          )}
                          <div>
                            <div className="fw-semibold">{item.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-center">{item.quantity}</td>
                      <td className="text-end">{formatMoney(item.price)}</td>
                      <td className="text-end">{formatMoney(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="row mt-4 g-4">
          <div className="col-lg-4">
            <div className="card h-100">
              <div className="card-header">
                <strong>Shipping Information</strong>
              </div>
              <div className="card-body">
                <p className="mb-1 fw-semibold">{shipping.full_name || '—'}</p>
                <p className="mb-1 text-muted">{shipping.phone || '—'}</p>
                <p className="mb-1 text-muted">
                  {[shipping.address, shipping.city, shipping.state]
                    .filter(Boolean)
                    .join(', ') || '—'}
                </p>
                <p className="mb-1 text-muted">
                  {[shipping.zip, shipping.country].filter(Boolean).join(' ') || '—'}
                </p>
                {shipping.note && (
                  <p className="mt-3">
                    <strong>Note:</strong> {shipping.note}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card h-100">
              <div className="card-header">
                <strong>Payment</strong>
              </div>
              <div className="card-body">
                <p className="mb-2">
                  <span className="text-muted d-block">Method</span>
                  <span className="fw-semibold">{payment.method || '—'}</span>
                </p>
                <p className="mb-0">
                  <span className="text-muted d-block">Status</span>
                  <span className="fw-semibold">{payment.status || '—'}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="col-lg-4">
            <div className="card h-100">
              <div className="card-header">
                <strong>Order Summary</strong>
              </div>
              <div className="card-body">
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Subtotal</span>
                  <span>{formatMoney(order.subtotal)}</span>
                </div>
                <div className="d-flex justify-content-between mb-2">
                  <span className="text-muted">Shipping</span>
                  <span>{formatMoney(order.shipping_fee)}</span>
                </div>
                <hr />
                <div className="d-flex justify-content-between">
                  <span className="fw-semibold">Total</span>
                  <span className="fw-bold text-success">{formatMoney(order.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="order-detail-page">
      <Navbar />
      <div className="container my-5">{renderContent()}</div>
      <Footer />
    </div>
  );
};

export default MyOrderDetail;
