import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import adminApi from "../api";

const emptyAddress = {
  street: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

const AdminUserEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: emptyAddress });
  const [stats, setStats] = useState({ orders_count: 0, total_spent: 0 });
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("personal");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        setLoading(true);
        const response = await adminApi.users.get(id);
        const payload = response.user;
        setUser(payload);
        setForm({
          name: payload.name || "",
          email: payload.email || "",
          phone: payload.phone || "",
          address: {
            ...emptyAddress,
            ...(payload.address || {}),
          },
        });
        setIsDirty(false);
        setStats(response.stats || { orders_count: 0, total_spent: 0 });
      } catch (err) {
        console.error("Failed to load user", err);
        setError(err?.response?.data?.error || "User not found");
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [id]);

  useEffect(() => {
    const handler = (event) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  useEffect(() => {
    if (activeTab !== "orders" || !user) {
      return;
    }
    const loadOrders = async () => {
      try {
        const response = await adminApi.orders.list({
          user_id: user._id || user.id || id
        });
        setOrders(response.items || []);
      } catch (err) {
        console.error("Failed to load user orders", err);
      }
    };
    loadOrders();
  }, [activeTab, user]);

  const handleFormChange = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      setIsDirty(true);
      return next;
    });
  };

  const handleAddressChange = (field, value) => {
    setForm((prev) => {
      const nextAddress = { ...prev.address, [field]: value };
      setIsDirty(true);
      return { ...prev, address: nextAddress };
    });
  };

  const handleSave = async (options = { closeAfter: false }) => {
    try {
      setSaving(true);
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
      };
      const response = await adminApi.users.update(id, payload);
      setUser(response.user);
      setIsDirty(false);
      if (options.closeAfter) {
        navigate("/admin/users");
      }
    } catch (err) {
      console.error("Failed to save user", err);
      alert(err?.response?.data?.error || "Unable to save user information");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleBan = async () => {
    try {
      await adminApi.users.setBan(id, !user.is_banned);
      const refreshed = await adminApi.users.get(id);
      setUser(refreshed.user);
      setStats(refreshed.stats || stats);
    } catch (err) {
      console.error("Failed to toggle ban", err);
      alert(err?.response?.data?.error || "Unable to update status");
    }
  };

  const handleRoleChange = async (role) => {
    if (role === user.role) {
      return;
    }
    if (
      user.role === "admin" &&
      role !== "admin" &&
      !window.confirm("Are you sure you want to demote this administrator account?")
    ) {
      return;
    }
    try {
      await adminApi.users.setRole(id, role);
      const refreshed = await adminApi.users.get(id);
      setUser(refreshed.user);
      setStats(refreshed.stats || stats);
    } catch (err) {
      console.error("Failed to update role", err);
      alert(err?.response?.data?.error || "Unable to update role");
    }
  };

  const handleResetPassword = async () => {
    if (!window.confirm("Generate a temporary password for this user?")) {
      return;
    }
    try {
      const response = await adminApi.users.resetPassword(id);
      alert(`Temporary password: ${response.tempPassword}`);
    } catch (err) {
      console.error("Failed to reset password", err);
      alert(err?.response?.data?.error || "Unable to create a temporary password");
    }
  };

  const orderTotal = useMemo(
    () => orders.reduce((sum, order) => sum + (order.total || 0), 0),
    [orders]
  );

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="alert alert-danger m-4">
        {error || "User not found"}
        <button className="btn btn-link" onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card shadow-sm border-0">
            <div className="card-body">
              <div className="d-flex align-items-center mb-3">
                <div className="avatar rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style={{ width: 64, height: 64, fontSize: 24 }}>
                  {user.name?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="ms-3">
                  <h5 className="mb-1">{user.name || "(Not updated)"}</h5>
                  <p className="text-muted mb-0">{user.email}</p>
                  <span className={`badge ${user.role === "admin" ? "bg-danger" : "bg-primary"} mt-2`}>
                    {user.role}
                  </span>
                </div>
              </div>
              <div className="d-flex justify-content-between mb-3">
                <div>
                  <div className="text-muted">Orders</div>
                  <div className="h5 mb-0">{stats.orders_count}</div>
                </div>
                <div className="text-end">
                  <div className="text-muted">Total Spent</div>
                  <div className="h5 mb-0">${stats.total_spent?.toFixed(2)}</div>
                </div>
              </div>
              <button
                className={`btn w-100 ${user.is_banned ? "btn-outline-success" : "btn-outline-danger"}`}
                onClick={handleToggleBan}
              >
                <i className={`fas ${user.is_banned ? "fa-unlock" : "fa-ban"} me-2`} />
                {user.is_banned ? "Unban" : "Ban Account"}
              </button>
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white">
              <ul className="nav nav-tabs card-header-tabs">
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${activeTab === "personal" ? "active" : ""}`}
                    onClick={() => setActiveTab("personal")}
                  >
                    Personal Information
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${activeTab === "security" ? "active" : ""}`}
                    onClick={() => setActiveTab("security")}
                  >
                    Security & Permissions
                  </button>
                </li>
                <li className="nav-item">
                  <button
                    type="button"
                    className={`nav-link ${activeTab === "orders" ? "active" : ""}`}
                    onClick={() => setActiveTab("orders")}
                  >
                    Orders
                  </button>
                </li>
              </ul>
            </div>
            <div className="card-body">
              {activeTab === "personal" && (
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.name}
                      onChange={(e) => handleFormChange("name", e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={form.email}
                      onChange={(e) => handleFormChange("email", e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.phone}
                      onChange={(e) => handleFormChange("phone", e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Street</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.address.street}
                      onChange={(e) => handleAddressChange("street", e.target.value)}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.address.city}
                      onChange={(e) => handleAddressChange("city", e.target.value)}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">State/Province</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.address.state}
                      onChange={(e) => handleAddressChange("state", e.target.value)}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Postal Code</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.address.postalCode}
                      onChange={(e) => handleAddressChange("postalCode", e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Country</label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.address.country}
                      onChange={(e) => handleAddressChange("country", e.target.value)}
                    />
                  </div>
                </div>
              )}
              {activeTab === "security" && (
                <div className="d-flex flex-column gap-4">
                  <div>
                    <label className="form-label">Role</label>
                    <select
                      className="form-select w-auto"
                      value={user.role}
                      onChange={(e) => handleRoleChange(e.target.value)}
                    >
                      <option value="customer">Customer</option>
                      <option value="admin">Admin</option>
                    </select>
                    <div className="form-text text-warning mt-2">
                      Cannot demote the last administrator or demote yourself.
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Reset Password</label>
                    <p className="text-muted">Generate a temporary password to send to the user.</p>
                    <button className="btn btn-outline-primary" onClick={handleResetPassword}>
                      <i className="fas fa-key me-2" /> Generate Temporary Password
                    </button>
                  </div>
                </div>
              )}
              {activeTab === "orders" && (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">Order History</h5>
                    <span className="badge bg-primary">
                      Total spent: ${orderTotal.toFixed(2)}
                    </span>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Created At</th>
                          <th>Status</th>
                          <th className="text-end">Total Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {orders.length === 0 ? (
                          <tr>
                              <td colSpan="4" className="text-center text-muted py-4">
                                No orders yet.
                            </td>
                          </tr>
                        ) : (
                          orders.map((order) => (
                            <tr key={order._id}>
                              <td>{order.orderId || order._id}</td>
                              <td>{order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}</td>
                              <td>
                                <span className={`badge bg-${order.status === "delivered" ? "success" : order.status === "cancelled" ? "danger" : "warning"}`}>
                                  {order.status}
                                </span>
                              </td>
                              <td className="text-end">${(order.total || 0).toFixed(2)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card shadow-sm border-0 mt-4 sticky-bottom" style={{ zIndex: 9 }}>
            <div className="card-body d-flex justify-content-between align-items-center">
              <div className="text-muted">
                {isDirty ? "Unsaved changes" : "All changes saved"}
              </div>
              <div className="btn-group">
                <button className="btn btn-outline-secondary" onClick={() => handleSave({ closeAfter: false })} disabled={saving}>
                  <i className="fas fa-save me-1" /> Save
                </button>
                <button className="btn btn-primary" onClick={() => handleSave({ closeAfter: true })} disabled={saving}>
                  <i className="fas fa-check me-1" /> Save & Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUserEditor;
