// Orders Page Component - Order History
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { ordersAPI, cartAPI } from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import '../styles/Orders.css';

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

const TIMELINE_COMPLETION = {
  pending: ['pending'],
  processing: ['pending', 'processing'],
  shipped: ['pending', 'processing', 'shipped'],
  delivered: ['pending', 'processing', 'shipped', 'delivered'],
  cancelled: ['pending']
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

const Orders = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, logout } = useAuth();
  const { replaceCart } = useCart();
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [reorderLoadingId, setReorderLoadingId] = useState(null);
  const [invoiceLoadingId, setInvoiceLoadingId] = useState(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      alert('Please login to view orders');
      navigate('/login');
      return;
    }

    loadOrders();
  }, [authLoading, isAuthenticated, navigate]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await ordersAPI.getOrders();
      if (data.orders) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      if (error.response?.status === 401) {
        alert('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
        logout();
        navigate('/login');
        return;
      }
      alert('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const toggleOrderDetails = (orderId) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const handleReorder = async (orderId) => {
    try {
      setReorderLoadingId(orderId);
      const res = await ordersAPI.reorder(orderId);
      if (res?.success) {
        // Sync cart from backend
        try {
          const cartRes = await cartAPI.getCart();
          if (cartRes?.items) {
            replaceCart(cartRes.items);
          }
        } catch (syncErr) {
          console.warn('Failed to sync cart after reorder:', syncErr);
        }
        alert(res.message || 'Added items to your cart.');
      } else {
        alert(res?.message || 'Could not reorder items.');
      }
      navigate('/cart');
    } catch (error) {
      console.error('Reorder error:', error);
      alert('Could not reorder items right now.');
    } finally {
      setReorderLoadingId(null);
    }
  };

  const handleDownloadInvoice = async (orderId) => {
    try {
      setInvoiceLoadingId(orderId);
      const response = await ordersAPI.downloadInvoice(orderId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Invoice download error:', error);
      alert('Cannot download invoice right now.');
    } finally {
      setInvoiceLoadingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const statusKey = normaliseStatusKey(status);
    const statusClasses = {
      pending: 'bg-warning',
      processing: 'bg-info',
      shipped: 'bg-primary',
      delivered: 'bg-success',
      cancelled: 'bg-danger'
    };

    return (
      <span className={`badge ${statusClasses[statusKey] || 'bg-secondary'}`}>
        {(STATUS_LABELS[statusKey] || status || 'Pending').toUpperCase()}
      </span>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="orders-page">
        <Navbar />
        <div className="container my-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-3">Loading your orders...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="orders-page">
      <Navbar />

      <div className="container my-5">
        <div className="page-header mb-4">
          <h2>
            <i className="fas fa-shopping-bag me-2"></i>
            My Orders
          </h2>
          <p className="text-muted">View and track your order history</p>
        </div>

        {orders.length === 0 ? (
          <div className="empty-orders text-center py-5">
            <i className="fas fa-shopping-bag fa-3x text-muted mb-3"></i>
            <h4 className="text-muted">No orders yet</h4>
            <p className="text-muted">Start shopping to create your first order</p>
            <button className="btn btn-primary mt-3" onClick={() => navigate('/products')}>
              Browse Products
            </button>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => {
              const statusKey = normaliseStatusKey(order.status);
              const completedSteps = new Set(
                TIMELINE_COMPLETION[statusKey] || TIMELINE_COMPLETION.pending
              );
              const subtotal = Number(order.subtotal ?? 0);
              const shippingFee = Number(order.shippingFee ?? order.shipping_fee ?? 0);
              const tax = Number(order.tax ?? 0);
              const total = Number(order.total ?? subtotal + shippingFee + tax);
              const shippingInfo = order.shipping || {};
              const paymentInfo = order.payment || {};
              const items = Array.isArray(order.items) ? order.items : [];

              return (
                <div key={order._id} className="order-card card mb-3">
                {/* Order Header */}
                <div className="card-header">
                  <div className="row align-items-center">
                    <div className="col-md-3">
                      <div className="order-info">
                        <small className="text-muted d-block">Order ID</small>
                        <strong>{order.orderId}</strong>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="order-info">
                        <small className="text-muted d-block">Date</small>
                        <span>{formatDate(order.createdAt)}</span>
                      </div>
                    </div>
                    <div className="col-md-2">
                      <div className="order-info">
                        <small className="text-muted d-block">Status</small>
                        {getStatusBadge(order.status)}
                      </div>
                    </div>
                    <div className="col-md-2">
                      <div className="order-info">
                        <small className="text-muted d-block">Total</small>
                        <strong className="text-success">${total.toFixed(2)}</strong>
                      </div>
                    </div>
                    <div className="col-md-2 text-end">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => toggleOrderDetails(order._id)}
                      >
                        {expandedOrder === order._id ? (
                          <>
                            <i className="fas fa-chevron-up me-1"></i> Hide
                          </>
                        ) : (
                          <>
                            <i className="fas fa-chevron-down me-1"></i> Details
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Order Details (Expandable) */}
                {expandedOrder === order._id && (
                  <div className="card-body">
                    {/* Order Items */}
                    <h6 className="mb-3">Order Items:</h6>
                    <div className="table-responsive">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Price</th>
                            <th>Quantity</th>
                            <th>Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, index) => (
                            <tr key={index}>
                              <td>{item.name}</td>
                              <td>${Number(item.price ?? 0).toFixed(2)}</td>
                              <td>{item.quantity}</td>
                              <td>${Number(item.subtotal ?? 0).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="row mt-4">
                      {/* Shipping Information */}
                      <div className="col-md-6">
                        <h6 className="mb-3">
                          <i className="fas fa-shipping-fast me-2"></i>
                          Shipping Information
                        </h6>
                        <div className="shipping-info">
                          <p className="mb-1">
                            <strong>{shippingInfo.fullName || shippingInfo.full_name || '—'}</strong>
                          </p>
                          <p className="mb-1">{shippingInfo.email || '—'}</p>
                          <p className="mb-1">{shippingInfo.phone || '—'}</p>
                          <p className="mb-1">{shippingInfo.address || '—'}</p>
                          <p className="mb-0">
                            {[shippingInfo.city, shippingInfo.state].filter(Boolean).join(', ') || '—'}{' '}
                            {shippingInfo.zipCode || shippingInfo.zip || ''}
                          </p>
                        </div>
                      </div>

                      {/* Order Summary */}
                      <div className="col-md-6">
                        <h6 className="mb-3">
                          <i className="fas fa-receipt me-2"></i>
                          Order Summary
                        </h6>
                        <div className="order-summary">
                          <div className="d-flex justify-content-between mb-2">
                            <span>Subtotal:</span>
                            <span>${subtotal.toFixed(2)}</span>
                          </div>
                          <div className="d-flex justify-content-between mb-2">
                            <span>Shipping:</span>
                            <span>${shippingFee.toFixed(2)}</span>
                          </div>
                          <div className="d-flex justify-content-between mb-2">
                            <span>Tax:</span>
                            <span>${tax.toFixed(2)}</span>
                          </div>
                          <hr />
                          <div className="d-flex justify-content-between">
                            <strong>Total:</strong>
                            <strong className="text-success">${total.toFixed(2)}</strong>
                          </div>
                        </div>

                        {/* Payment Info */}
                        <div className="payment-info mt-3">
                          <small className="text-muted">
                            <i className="fas fa-credit-card me-1"></i>
                            Payment Method:{' '}
                            {paymentInfo.method === 'card'
                              ? 'Credit/Debit Card'
                              : paymentInfo.method || 'Cash on Delivery'}
                          </small>
                        </div>
                      </div>
                    </div>

                    {/* Order Tracking */}
                    <div className="order-tracking mt-4">
                      <h6 className="mb-3">
                        <i className="fas fa-truck me-2"></i>
                        Order Tracking
                      </h6>
                      <div className="tracking-timeline">
                        <div className={`tracking-step ${completedSteps.has('pending') ? 'completed' : ''}`}>
                          <div className="tracking-icon">
                            <i className="fas fa-check"></i>
                          </div>
                          <div className="tracking-label">Order Placed</div>
                        </div>
                        <div className={`tracking-step ${completedSteps.has('processing') ? 'completed' : ''}`}>
                          <div className="tracking-icon">
                            <i className="fas fa-cog"></i>
                          </div>
                          <div className="tracking-label">Processing</div>
                        </div>
                        <div className={`tracking-step ${completedSteps.has('shipped') ? 'completed' : ''}`}>
                          <div className="tracking-icon">
                            <i className="fas fa-truck"></i>
                          </div>
                          <div className="tracking-label">Shipped</div>
                        </div>
                        <div className={`tracking-step ${completedSteps.has('delivered') ? 'completed' : ''}`}>
                          <div className="tracking-icon">
                            <i className="fas fa-home"></i>
                          </div>
                          <div className="tracking-label">Delivered</div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="order-actions mt-4">
                      <button
                        className="btn btn-outline-primary me-2"
                        onClick={() => handleReorder(order._id || order.orderId)}
                        disabled={reorderLoadingId === (order._id || order.orderId)}
                      >
                        <i className="fas fa-redo me-1"></i>
                        {reorderLoadingId === (order._id || order.orderId) ? 'Processing...' : 'Order Again'}
                      </button>
                      <button
                        className="btn btn-outline-secondary"
                        onClick={() => handleDownloadInvoice(order._id || order.orderId)}
                        disabled={invoiceLoadingId === (order._id || order.orderId)}
                      >
                        <i className="fas fa-download me-1"></i>
                        {invoiceLoadingId === (order._id || order.orderId) ? 'Downloading...' : 'Download Invoice'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Orders;

