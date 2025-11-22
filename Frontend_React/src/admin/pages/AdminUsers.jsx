import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import adminApi from "../api";

const defaultPagination = { page: 1, pages: 1, total: 0, per_page: 10 };

const AdminUsers = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(defaultPagination);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [banned, setBanned] = useState("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        limit: 10,
        ...(search && { q: search }),
        ...(role !== "all" && { role }),
        ...(banned !== "all" && { banned: banned === "banned" }),
      };
      const response = await adminApi.users.list(params);
      setUsers(response.items || []);
      setPagination({
        page: response.page || page,
        pages: response.pages || 1,
        total: response.total || 0,
        per_page: response.per_page || 10,
      });
    } catch (err) {
      console.error("Failed to load users", err);
      setError(err?.response?.data?.error || "Unable to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, banned]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    fetchUsers(1);
  };

  const handleToggleBan = async (user) => {
    if (user.role === "admin" && !user.is_banned) {
      if (!window.confirm("Are you sure you want to suspend this administrator account?")) {
        return;
      }
    }
    try {
      await adminApi.users.setBan(user._id, !user.is_banned);
      fetchUsers(pagination.page);
    } catch (err) {
      console.error("Failed to update ban state", err);
      alert(err?.response?.data?.error || "Unable to update status");
    }
  };

  const tableRows = useMemo(
    () =>
      users.map((user) => (
        <tr key={user._id}>
          <td>
            <div className="fw-semibold">{user.name || "(Not updated)"}</div>
            <small className="text-muted">{user.email}</small>
          </td>
          <td>
            <span className={`badge ${user.role === "admin" ? "bg-danger" : "bg-primary"}`}>
              {user.role}
            </span>
          </td>
          <td>
            <span className={`badge ${user.is_banned ? "bg-danger" : "bg-success"}`}>
              {user.is_banned ? "Banned" : "Active"}
            </span>
          </td>
          <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}</td>
          <td className="text-end">
            <button
              className="btn btn-sm btn-outline-primary me-2"
              onClick={() => navigate(`/admin/users/${user._id}`)}
            >
              <i className="fas fa-user-edit me-1" /> Manage
            </button>
            <button
              className={`btn btn-sm ${user.is_banned ? "btn-outline-success" : "btn-outline-danger"}`}
              onClick={() => handleToggleBan(user)}
            >
              <i className={`fas ${user.is_banned ? "fa-unlock" : "fa-ban"} me-1`} />
              {user.is_banned ? "Unban" : "Ban"}
            </button>
          </td>
        </tr>
      )),
    [navigate, pagination.page, users]
  );

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="h4 mb-1">Users</h2>
          <p className="text-muted mb-0">Track roles, status, and order history.</p>
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
                placeholder="Name, email, or phone number"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Role</label>
              <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="all">All</option>
                <option value="customer">Customer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Status</label>
              <select className="form-select" value={banned} onChange={(e) => setBanned(e.target.value)}>
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="banned">Banned</option>
              </select>
            </div>
            <div className="col-12">
              <button type="submit" className="btn btn-outline-primary me-2">
                <i className="fas fa-search me-1" /> Search
              </button>
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => {
                  setSearch("");
                  setRole("all");
                  setBanned("all");
                  fetchUsers(1);
                }}
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {error && <div className="alert alert-danger m-3">{error}</div>}
          <div className="table-responsive">
            <table className="table table-hover table-striped mb-0">
              <thead className="table-light">
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="text-center py-5">
                      <div className="spinner-border text-primary" role="status" />
                    </td>
                  </tr>
                ) : tableRows.length > 0 ? (
                  tableRows
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center py-4 text-muted">
                      No matching users.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card-footer d-flex justify-content-between align-items-center">
          <small className="text-muted">
            Total {pagination.total} users — Page {pagination.page}/{pagination.pages}
          </small>
          <div className="btn-group">
            <button
              className="btn btn-outline-secondary"
              disabled={pagination.page <= 1 || loading}
              onClick={() => fetchUsers(pagination.page - 1)}
            >
              <i className="fas fa-chevron-left" />
            </button>
            <button
              className="btn btn-outline-secondary"
              disabled={pagination.page >= pagination.pages || loading}
              onClick={() => fetchUsers(pagination.page + 1)}
            >
              <i className="fas fa-chevron-right" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
