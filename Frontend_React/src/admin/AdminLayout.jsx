import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";

const AdminLayout = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="d-flex" style={{ minHeight: "100vh" }}>
      <aside className="bg-dark text-white p-4" style={{ minWidth: "240px" }}>
        <div className="mb-4">
          <h2 className="h4 mb-0">Quản trị Medicare</h2>
          <p className="text-muted small mb-0">Xin chào, {user?.name || user?.email}</p>
        </div>
        <nav className="nav flex-column gap-2">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `nav-link text-white ${isActive ? "fw-bold text-warning" : ""}`
            }
          >
            <i className="fas fa-chart-line me-2" /> Bảng điều khiển
          </NavLink>
          <NavLink
            to="/admin/products"
            className={({ isActive }) =>
              `nav-link text-white ${isActive ? "fw-bold text-warning" : ""}`
            }
          >
            <i className="fas fa-pills me-2" /> Sản phẩm
          </NavLink>
          <NavLink
            to="/admin/orders"
            className={({ isActive }) =>
              `nav-link text-white ${isActive ? "fw-bold text-warning" : ""}`
            }
          >
            <i className="fas fa-shopping-bag me-2" /> Đơn hàng
          </NavLink>
          <NavLink
            to="/admin/users"
            className={({ isActive }) =>
              `nav-link text-white ${isActive ? "fw-bold text-warning" : ""}`
            }
          >
            <i className="fas fa-users me-2" /> Người dùng
          </NavLink>
        </nav>
      </aside>
      <main className="flex-grow-1 bg-light">
        <header className="bg-white shadow-sm p-4 d-flex justify-content-between align-items-center">
          <div>
            <h1 className="h4 mb-0">Bảng quản trị</h1>
            <p className="text-muted mb-0">Quản lý sản phẩm và người dùng</p>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button className="btn btn-outline-secondary" onClick={() => navigate("/")}>
              <i className="fas fa-store me-2" /> Về trang bán hàng
            </button>
            <button type="button" className="btn btn-primary" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt me-2" /> Đăng xuất
            </button>
          </div>
        </header>
        <section className="p-4">
          <Outlet />
        </section>
      </main>
    </div>
  );
};

export default AdminLayout;
