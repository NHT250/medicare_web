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
      setError(err?.response?.data?.error || "Không thể tải danh sách người dùng");
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
      if (!window.confirm("Bạn chắc chắn muốn khóa tài khoản quản trị này?")) {
        return;
      }
    }
    try {
      await adminApi.users.setBan(user._id, !user.is_banned);
      fetchUsers(pagination.page);
    } catch (err) {
      console.error("Failed to update ban state", err);
      alert(err?.response?.data?.error || "Không thể cập nhật trạng thái");
    }
  };

  const tableRows = useMemo(
    () =>
      users.map((user) => (
        <tr key={user._id}>
          <td>
            <div className="fw-semibold">{user.name || "Chưa cập nhật"}</div>
            <small className="text-muted">{user.email}</small>
          </td>
          <td>
            <span className={`badge ${user.role === "admin" ? "bg-danger" : "bg-primary"}`}>
              {user.role === "admin" ? "Quản trị viên" : "Khách hàng"}
            </span>
          </td>
          <td>
            <span className={`badge ${user.is_banned ? "bg-danger" : "bg-success"}`}>
              {user.is_banned ? "Đã chặn" : "Hoạt động"}
            </span>
          </td>
          <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}</td>
          <td className="text-end">
            <button
              className="btn btn-sm btn-outline-primary me-2"
              onClick={() => navigate(`/admin/users/${user._id}`)}
            >
              <i className="fas fa-user-edit me-1" /> Quản lý
            </button>
            <button
              className={`btn btn-sm ${user.is_banned ? "btn-outline-success" : "btn-outline-danger"}`}
              onClick={() => handleToggleBan(user)}
            >
              <i className={`fas ${user.is_banned ? "fa-unlock" : "fa-ban"} me-1`} />
              {user.is_banned ? "Bỏ chặn" : "Chặn"}
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
          <h2 className="h4 mb-1">Người dùng</h2>
          <p className="text-muted mb-0">Theo dõi vai trò, trạng thái và lịch sử đơn hàng.</p>
        </div>
      </div>

      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <form className="row g-3 align-items-end" onSubmit={handleSearchSubmit}>
            <div className="col-md-4">
              <label className="form-label">Tìm kiếm</label>
              <input
                type="text"
                className="form-control"
                placeholder="Tên, email hoặc số điện thoại"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <label className="form-label">Vai trò</label>
              <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="all">Tất cả</option>
                <option value="customer">Khách hàng</option>
                <option value="admin">Quản trị viên</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Trạng thái</label>
              <select className="form-select" value={banned} onChange={(e) => setBanned(e.target.value)}>
                <option value="all">Tất cả</option>
                <option value="active">Hoạt động</option>
                <option value="banned">Đã chặn</option>
              </select>
            </div>
            <div className="col-12">
              <button type="submit" className="btn btn-outline-primary me-2">
                <i className="fas fa-search me-1" /> Tìm kiếm
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
                Đặt lại
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
                  <th>Người dùng</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Ngày tạo</th>
                  <th className="text-end">Thao tác</th>
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
                      Không có người dùng phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card-footer d-flex justify-content-between align-items-center">
          <small className="text-muted">
            Tổng {pagination.total} người dùng — Trang {pagination.page}/{pagination.pages}
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
