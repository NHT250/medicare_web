import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import adminApi from "../api";

const STATUS_BADGE = {
  Pending: "bg-warning text-dark",
  Confirmed: "bg-primary",
  Delivered: "bg-success",
  Cancelled: "bg-danger",
};

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }
  try {
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch (error) {
    console.warn("Failed to format date", error);
    return value;
  }
};

const formatCurrency = (amount) => {
  const numeric = Number(amount || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(numeric);
};

const AdminOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.orders.get(id);
      setOrder(response);
      setNotes(response.notes || "");
    } catch (err) {
      console.error("Failed to load order", err);
      setError(
        err?.response?.data?.error || "Unable to load order details. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    if (!feedback) {
      return undefined;
    }
    const timeout = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timeout);
  }, [feedback]);

  const handleStatusUpdate = async (nextStatus) => {
    if (!id) {
      return;
    }

    if (nextStatus === "Cancelled") {
      const confirmed = window.confirm(
        "Are you sure you want to cancel this order?"
      );
      if (!confirmed) {
        return;
      }
    }

    try {
      setStatusUpdating(true);
      setFeedback(null);
      const updated = await adminApi.orders.updateStatus(id, nextStatus);
      setOrder(updated);
      setNotes(updated.notes || "");
      setFeedback({ type: "success", message: `Order status updated to ${nextStatus}.` });
    } catch (err) {
      console.error("Failed to update status", err);
      setFeedback({
        type: "danger",
        message:
          err?.response?.data?.error || "Unable to update the order status.",
      });
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!id) {
      return;
    }
    try {
      setSavingNotes(true);
      setFeedback(null);
      const updated = await adminApi.orders.update(id, { notes });
      setOrder(updated);
      setNotes(updated.notes || "");
      setFeedback({ type: "success", message: "Notes saved." });
    } catch (err) {
      console.error("Failed to update order", err);
      setFeedback({
        type: "danger",
        message: err?.response?.data?.error || "Unable to update the order.",
      });
    } finally {
      setSavingNotes(false);
    }
  };

  const currentStatus = order?.status || "Pending";
  const statusBadgeClass = STATUS_BADGE[currentStatus] || "bg-secondary";
  const isCancelled = currentStatus === "Cancelled";
  const isDelivered = currentStatus === "Delivered";
  const showConfirm = currentStatus === "Pending";
  const showDeliver = currentStatus === "Confirmed";
  const showCancel = !isDelivered && !isCancelled;

  const notesChanged = useMemo(
    () => (order?.notes || "") !== notes,
    [notes, order?.notes]
  );

  const activityLog = order?.activity_log || [];

  if (loading) {
    return (
      <div className="container-fluid py-4 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
        <button type="button" className="btn btn-outline-primary" onClick={() => navigate(-1)}>
          <i className="fas fa-arrow-left me-2" /> Back to order list
        </button>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const orderNumber = order.order_number || order.orderId || order.id;
  const createdAt = formatDateTime(order.created_at || order.createdAt);
  const updatedAt = formatDateTime(order.updated_at || order.updatedAt);
  const shipping = order.shipping || {};
  const customer = order.customer || {};
  const payment = order.payment || {};
  const items = order.items || [];
  const shippingLine =
    [shipping.city, shipping.state, shipping.zip, shipping.zip_code, shipping.zipCode]
      .filter(Boolean)
      .slice(0, 3)
      .join(", ") || "-";

  return (
    <div className="container-fluid py-4">
      <button
        type="button"
        className="btn btn-link text-decoration-none ps-0 mb-3"
        onClick={() => navigate(-1)}
      >
        <i className="fas fa-arrow-left me-2" /> Back to orders
      </button>

      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h2 className="h4 mb-1">Order #{orderNumber}</h2>
          <p className="text-muted mb-1">Created: {createdAt}</p>
          <p className="text-muted mb-0">Last update: {updatedAt}</p>
        </div>
        <div className="text-md-end">
          <span className={`badge fs-6 ${statusBadgeClass}`}>{currentStatus}</span>
        </div>
      </div>

      {feedback && (
        <div className={`alert alert-${feedback.type}`} role="alert">
          {feedback.message}
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-body">
              <h5 className="card-title">Customer</h5>
              <div className="row">
                <div className="col-md-6">
                  <p className="mb-1 fw-semibold">{customer.name || shipping.full_name || "Unknown"}</p>
                  <p className="mb-1 text-muted">{customer.email || shipping.email || "-"}</p>
                  <p className="mb-0 text-muted">{customer.phone || shipping.phone || "-"}</p>
                </div>
                <div className="col-md-6">
                  <h6 className="text-muted">Shipping</h6>
                  <p className="mb-1">{shipping.address || "-"}</p>
                  <p className="mb-1">{shippingLine}</p>
                  <p className="mb-1">{shipping.country || "-"}</p>
                  <p className="mb-0 text-muted">{shipping.note || ""}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card shadow-sm border-0 mb-4">
            <div className="card-body">
              <h5 className="card-title">Items</h5>
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead className="table-light">
                    <tr>
                      <th scope="col">Product</th>
                      <th scope="col">Qty</th>
                      <th scope="col">Unit price</th>
                      <th scope="col">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center text-muted">
                          No products in this order.
                        </td>
                      </tr>
                    ) : (
                      items.map((item, index) => (
                        <tr key={`${item.product_id || index}-${item.name || index}`}>
                          <td>{item.name || "Unnamed product"}</td>
                          <td>{item.quantity}</td>
                          <td>{formatCurrency(item.price)}</td>
                          <td className="fw-semibold">{formatCurrency(item.subtotal)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card shadow-sm border-0 mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h5 className="card-title mb-0">Internal notes</h5>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={handleSaveNotes}
                  disabled={!notesChanged || savingNotes}
                >
                  {savingNotes ? (
                    <span>
                      <span className="spinner-border spinner-border-sm me-2" role="status" />
                      Saving...
                    </span>
                  ) : (
                    <span>
                      <i className="fas fa-save me-1" /> Save
                    </span>
                  )}
                </button>
              </div>
              <textarea
                className="form-control"
                rows={4}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Add internal notes for this order"
              />
            </div>
          </div>

          <div className="card shadow-sm border-0">
            <div className="card-body">
              <h5 className="card-title">Activity log</h5>
              {activityLog.length === 0 ? (
                <p className="text-muted mb-0">No activity yet.</p>
              ) : (
                <ul className="list-group list-group-flush">
                  {activityLog.map((entry, index) => (
                    <li key={`${entry.timestamp}-${index}`} className="list-group-item px-0">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="fw-semibold text-capitalize">
                          {entry.type?.replace(/_/g, " ") || "Update"}
                        </span>
                        <small className="text-muted">{formatDateTime(entry.timestamp)}</small>
                      </div>
                      {entry.status && (
                        <div className="mt-1">
                          <span className={`badge ${STATUS_BADGE[entry.status] || "bg-secondary"}`}>
                            {entry.status}
                          </span>
                        </div>
                      )}
                      {entry.message && <p className="mb-1 small">{entry.message}</p>}
                      {entry.actor?.name && (
                        <small className="text-muted">By {entry.actor.name}</small>
                      )}
                      {entry.fields && (
                        <small className="text-muted d-block">
                          Fields: {Array.isArray(entry.fields) ? entry.fields.join(", ") : entry.fields}
                        </small>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-body">
              <h5 className="card-title">Payment</h5>
              <p className="mb-1"><strong>Method:</strong> {payment.method || "-"}</p>
              <p className="mb-3"><strong>Status:</strong> {payment.status || "-"}</p>
              <h6 className="fw-semibold">Order totals</h6>
              <ul className="list-group list-group-flush mb-3">
                <li className="list-group-item d-flex justify-content-between px-0">
                  <span>Subtotal</span>
                  <span>{formatCurrency(order.subtotal)}</span>
                </li>
                <li className="list-group-item d-flex justify-content-between px-0">
                  <span>Shipping fee</span>
                  <span>{formatCurrency(order.shipping_fee)}</span>
                </li>
                <li className="list-group-item d-flex justify-content-between px-0 fw-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(order.total)}</span>
                </li>
              </ul>

              <div className="d-grid gap-2">
                {showConfirm && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleStatusUpdate("Confirmed")}
                    disabled={statusUpdating}
                  >
                    {statusUpdating ? (
                      <span>
                        <span className="spinner-border spinner-border-sm me-2" role="status" />
                        Updating...
                      </span>
                    ) : (
                      <span>
                        <i className="fas fa-check me-2" /> Mark as Confirmed
                      </span>
                    )}
                  </button>
                )}
                {showDeliver && (
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={() => handleStatusUpdate("Delivered")}
                    disabled={statusUpdating}
                  >
                    {statusUpdating ? (
                      <span>
                        <span className="spinner-border spinner-border-sm me-2" role="status" />
                        Updating...
                      </span>
                    ) : (
                      <span>
                        <i className="fas fa-truck me-2" /> Mark as Delivered
                      </span>
                    )}
                  </button>
                )}
                {showCancel && (
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={() => handleStatusUpdate("Cancelled")}
                    disabled={statusUpdating}
                  >
                    {statusUpdating ? (
                      <span>
                        <span className="spinner-border spinner-border-sm me-2" role="status" />
                        Updating...
                      </span>
                    ) : (
                      <span>
                        <i className="fas fa-times me-2" /> Cancel order
                      </span>
                    )}
                  </button>
                )}
                {!showConfirm && !showDeliver && !showCancel && (
                  <p className="text-muted text-center mb-0">
                    No additional status actions available.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOrderDetail;

