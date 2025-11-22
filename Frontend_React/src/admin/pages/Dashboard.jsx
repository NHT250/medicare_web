import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import adminApi from "../api";

const initialSummary = {
  total_revenue: 0,
  total_orders: 0,
  total_users: 0,
  active_products: 0,
};

const statusVariants = {
  pending: "bg-warning text-dark",
  confirmed: "bg-info text-dark",
  delivered: "bg-success",
  cancelled: "bg-secondary",
};

const formatCurrency = (value) => {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatNumber = (value) => Number(value || 0).toLocaleString();

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

const StatCard = ({ icon, label, value, description, accent }) => (
  <div className="col-md-6 col-xl-3">
    <div className="card shadow-sm border-0 h-100">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <p className="text-uppercase text-muted small mb-1">{label}</p>
            <h3 className={`fw-bold mb-0 ${accent || ""}`}>{value}</h3>
          </div>
          <span className="fs-2" aria-hidden="true">
            {icon}
          </span>
        </div>
        {description && (
          <p className="text-muted small mb-0 mt-3">{description}</p>
        )}
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const [summary, setSummary] = useState(initialSummary);
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const [summaryData, ordersData, usersData] = await Promise.all([
          adminApi.dashboard.summary(),
          adminApi.dashboard.recentOrders(),
          adminApi.dashboard.recentUsers(),
        ]);

        setSummary({
          total_revenue: Number(summaryData?.total_revenue ?? 0),
          total_orders: Number(summaryData?.total_orders ?? 0),
          total_users: Number(summaryData?.total_users ?? 0),
          active_products: Number(summaryData?.active_products ?? 0),
        });

        const normalizedOrders = Array.isArray(ordersData)
          ? ordersData
          : Array.isArray(ordersData?.orders)
          ? ordersData.orders
          : [];
        setRecentOrders(normalizedOrders);

        const normalizedUsers = Array.isArray(usersData)
          ? usersData
          : Array.isArray(usersData?.users)
          ? usersData.users
          : [];
        setRecentUsers(normalizedUsers);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
        setError(
          err?.response?.data?.error ||
            "Unable to load dashboard data. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const statCards = useMemo(
    () => [
      {
        icon: "💰",
        label: "Total Revenue",
        value: formatCurrency(summary.total_revenue),
        description: "Confirmed and delivered orders",
        accent: "text-success",
      },
      {
        icon: "🧾",
        label: "Total Orders",
        value: formatNumber(summary.total_orders),
      },
      {
        icon: "👥",
        label: "Total Users",
        value: formatNumber(summary.total_users),
      },
      {
        icon: "💊",
        label: "Active Products",
        value: formatNumber(summary.active_products),
      },
    ],
    [summary]
  );

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" aria-hidden="true" />
        <p className="text-muted mt-3 mb-0">Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid px-0">
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-md-between mb-4 gap-3">
        <div>
          <h2 className="h3 mb-1">Dashboard Overview</h2>
          <p className="text-muted mb-0">
            Monitor business performance and recent activity.
          </p>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="row g-3 mb-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      <div className="row g-4">
        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Recent Orders</h5>
              <Link to="/admin/orders" className="btn btn-sm btn-outline-primary">
                View All
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <div className="p-4 text-center text-muted">
                No recent orders.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover table-nowrap mb-0">
                  <thead className="table-light">
                    <tr>
                      <th scope="col">Order</th>
                      <th scope="col">Customer</th>
                      <th scope="col" className="text-end">
                        Total
                      </th>
                      <th scope="col">Status</th>
                      <th scope="col">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => {
                      const statusKey = (order.status || "").toLowerCase();
                      const badgeClass = statusVariants[statusKey] || "bg-secondary";
                      return (
                        <tr key={order.id || order.order_id}>
                          <td>{order.order_id || order.id}</td>
                          <td>{order.customer_name}</td>
                          <td className="text-end fw-semibold text-success">
                            {formatCurrency(order.total)}
                          </td>
                          <td>
                            <span className={`badge text-uppercase ${badgeClass}`}>
                              {order.status}
                            </span>
                          </td>
                          <td>{formatDateTime(order.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Recent Users</h5>
              <Link to="/admin/users" className="btn btn-sm btn-outline-primary">
                View All
              </Link>
            </div>
            {recentUsers.length === 0 ? (
              <div className="p-4 text-center text-muted">
                No new users yet.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover table-nowrap mb-0">
                  <thead className="table-light">
                    <tr>
                      <th scope="col">Name</th>
                      <th scope="col">Email</th>
                      <th scope="col">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentUsers.map((user) => (
                      <tr key={user.id}>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>{formatDateTime(user.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
