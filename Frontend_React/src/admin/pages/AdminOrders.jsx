import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import adminApi from "../api";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "Pending", label: "Pending" },
  { value: "Confirmed", label: "Confirmed" },
  { value: "Delivered", label: "Delivered" },
  { value: "Cancelled", label: "Cancelled" },
];

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

const AdminOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const searchRef = useRef("");

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / Math.max(limit, 1))),
    [limit, total]
  );

  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(page * limit, total);

  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  const fetchOrders = useCallback(
    async (targetPage = 1, options = {}) => {
      try {
        setLoading(true);
        setError(null);
        const params = {
          page: targetPage,
          limit: options.limit ?? limit,
          sort: "-created_at",
        };
        const query = (options.search ?? searchRef.current).trim();
        if (query) {
          params.q = query;
        }
        if (statusFilter !== "all") {
          params.status = statusFilter;
        }

        const response = await adminApi.orders.list(params);
        setOrders(response.items || []);
        setTotal(response.total || 0);
        setPage(response.page || targetPage);
        if (response.limit) {
          setLimit(response.limit);
        } else if (options.limit) {
          setLimit(options.limit);
        }
      } catch (err) {
        console.error("Failed to load orders", err);
        setError(
          err?.response?.data?.error ||
            "Unable to load orders. Please try again."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [limit, statusFilter]
  );

  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    fetchOrders(1, { search: search.trim() });
  };

  const handleStatusChange = (event) => {
    setStatusFilter(event.target.value);
  };

  const handleLimitChange = (event) => {
    const newLimit = Number(event.target.value) || 10;
    setLimit(newLimit);
  };

  const handlePageChange = (newPage) => {
    if (newPage === page || newPage < 1 || newPage > totalPages) {
      return;
    }
    fetchOrders(newPage);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders(page);
  };

  const tableRows = useMemo(
    () =>
      orders.map((order) => {
        const status = order.status || "Pending";
        const badgeClass = STATUS_BADGE[status] || "bg-secondary";
        const createdAt = formatDateTime(order.created_at || order.createdAt);
        const orderNumber = order.order_number || order.orderId || order.id;

        return (
          <tr key={order.id}>
            <td className="fw-semibold">{orderNumber}</td>
            <td>
              <div className="d-flex flex-column">
                <span>{order.customer_name || "Unknown"}</span>
                <small className="text-muted">{order.email || "-"}</small>
              </div>
            </td>
            <td className="fw-semibold text-success">{formatCurrency(order.total)}</td>
            <td>{order.payment_method || "-"}</td>
            <td>
              <span className={`badge ${badgeClass}`}>{status}</span>
            </td>
            <td>{createdAt}</td>
            <td className="text-end">
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={() => navigate(`/admin/orders/${order.id}`)}
              >
                <i className="fas fa-eye me-1" /> View / Edit
              </button>
            </td>
          </tr>
        );
      }),
    [navigate, orders]
  );

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="h4 mb-1">Orders</h2>
          <p className="text-muted mb-0">
            Manage orders, update statuses, and track internal notes.
          </p>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={handleRefresh}
            disabled={loading || refreshing}
          >
            <i className={`fas fa-sync-alt me-2 ${refreshing ? "fa-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <form className="row g-3 align-items-end" onSubmit={handleSearchSubmit}>
            <div className="col-md-4">
              <label className="form-label">Search</label>
              <input
                type="text"
                className="form-control"
                placeholder="Order ID, customer name or email"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={statusFilter}
                onChange={handleStatusChange}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Rows per page</label>
              <select
                className="form-select"
                value={limit}
                onChange={handleLimitChange}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button
                type="submit"
                className="btn btn-primary w-100"
                disabled={loading}
              >
                <i className="fas fa-search me-2" /> Search
              </button>
            </div>
          </form>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {loading ? (
            <div className="py-5 text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-5 text-center text-muted">
              <i className="fas fa-box-open fa-2x mb-3" />
              <p className="mb-0">No matching orders.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th scope="col">Order</th>
                    <th scope="col">Customer</th>
                    <th scope="col">Total</th>
                    <th scope="col">Payment</th>
                    <th scope="col">Status</th>
                    <th scope="col">Created</th>
                    <th scope="col" className="text-end">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>{tableRows}</tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 mt-3">
        <div className="text-muted">
          Showing {rangeStart} - {rangeEnd} of {total} orders
        </div>
        <nav>
          <ul className="pagination mb-0">
            <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
              <button
                type="button"
                className="page-link"
                onClick={() => handlePageChange(page - 1)}
              >
                Previous
              </button>
            </li>
            {Array.from({ length: totalPages }, (_, index) => index + 1).map(
              (pageNumber) => (
                <li
                  key={pageNumber}
                  className={`page-item ${pageNumber === page ? "active" : ""}`}
                >
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => handlePageChange(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                </li>
              )
            )}
            <li
              className={`page-item ${page >= totalPages ? "disabled" : ""}`}
            >
              <button
                type="button"
                className="page-link"
                onClick={() => handlePageChange(page + 1)}
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default AdminOrders;

