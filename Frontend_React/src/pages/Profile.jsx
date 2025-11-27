// User Profile Page Component
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ordersAPI, usersAPI } from "../services/api";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import "../styles/Profile.css";

const Profile = () => {
  const navigate = useNavigate();
  const {
    user,
    isAuthenticated,
    updateUser,
    logout,
    loading: authLoading,
  } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("info");
  const [formError, setFormError] = useState("");

  // Form state for editing
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "USA",
    },
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      alert("Vui lòng đăng nhập để xem hồ sơ");
      navigate("/login");
      return;
    }

    loadUserData();
    loadOrders();
  }, [authLoading, isAuthenticated, navigate]);

  const loadUserData = () => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        address: user.address || {
          street: "",
          city: "",
          state: "",
          zipCode: "",
          country: "USA",
        },
      });
    }
  };

  const loadOrders = async () => {
    try {
      const data = await ordersAPI.getOrders();
      if (data.orders) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error("Error loading orders:", error);
      if (error.response?.status === 401) {
        alert("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
        logout();
        navigate("/login");
        return;
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "email") {
      setFormError("");
    }
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Call API to update user profile
      const response = await usersAPI.updateProfile(formData);

      if (response.user) {
        // Update local state with response from server
        updateUser(response.user);
        alert("Cập nhật hồ sơ thành công!");
        setIsEditing(false);
        setFormError("");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      if (error.response?.status === 401) {
        alert("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.");
        logout();
        navigate("/login");
        return;
      }
      const apiMessage =
        error.response?.data?.message || error.response?.data?.error;
      if (apiMessage === "Email already exists") {
        setFormError(apiMessage);
      } else {
        alert(apiMessage || "Cập nhật hồ sơ thất bại");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    loadUserData();
    setIsEditing(false);
    setFormError("");
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getMemberSince = () => {
    if (user?.createdAt) {
      return new Date(user.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
    }
    return "Gần đây";
  };

  const getTotalSpent = () => {
    return orders.reduce((sum, order) => sum + order.total, 0).toFixed(2);
  };

  if (!user) {
    return (
      <div className="profile-page">
        <Navbar />
        <div className="container my-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="profile-page">
      <Navbar />

      <div className="container my-5">
        <div className="row">
          {/* Sidebar */}
          <div className="col-lg-4 mb-4">
            <div className="profile-sidebar card">
              <div className="card-body text-center">
                {/* Avatar */}
                <div className="profile-avatar">
                  <div className="avatar-circle">
                    {getInitials(formData.name)}
                  </div>
                  <button className="btn btn-sm btn-outline-primary mt-2">
                    <i className="fas fa-camera me-1"></i>
                    Đổi Ảnh
                  </button>
                </div>

                {/* User Info */}
                <h4 className="mt-3 mb-1">{formData.name || "Người dùng"}</h4>
                <p className="text-muted mb-3">{formData.email}</p>

                {/* Stats */}
                <div className="user-stats">
                  <div className="stat-item">
                    <div className="stat-value">{orders.length}</div>
                    <div className="stat-label">Đơn Hàng</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">${getTotalSpent()}</div>
                    <div className="stat-label">Tổng Chi Tiêu</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-value">
                      <i className="fas fa-star text-warning"></i> Thành Viên
                    </div>
                    <div className="stat-label">Từ {getMemberSince()}</div>
                  </div>
                </div>

                <hr className="my-4" />

                {/* Quick Actions */}
                <div className="quick-actions">
                  <button
                    className="btn btn-outline-primary w-100 mb-2"
                    onClick={() => navigate("/orders")}
                  >
                    <i className="fas fa-shopping-bag me-2"></i>
                    Đơn Hàng Của Tôi
                  </button>
                  <button
                    className="btn btn-outline-secondary w-100"
                    onClick={() => navigate("/products")}
                  >
                    <i className="fas fa-shopping-cart me-2"></i>
                    Tiếp Tục Mua Sắm
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-lg-8">
            <div className="profile-content card">
              <div className="card-header">
                <ul className="nav nav-tabs card-header-tabs">
                  <li className="nav-item">
                    <button
                      className={`nav-link ${
                        activeTab === "info" ? "active" : ""
                      }`}
                      onClick={() => setActiveTab("info")}
                    >
                      <i className="fas fa-user me-2"></i>
                      Thông Tin Cá Nhân
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${
                        activeTab === "security" ? "active" : ""
                      }`}
                      onClick={() => setActiveTab("security")}
                    >
                      <i className="fas fa-lock me-2"></i>
                      Bảo Mật
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${
                        activeTab === "activity" ? "active" : ""
                      }`}
                      onClick={() => setActiveTab("activity")}
                    >
                      <i className="fas fa-history me-2"></i>
                      Hoạt Động
                    </button>
                  </li>
                </ul>
              </div>

              <div className="card-body">
                {/* Personal Info Tab */}
                {activeTab === "info" && (
                  <div className="tab-content">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <h5>Thông Tin Cá Nhân</h5>
                      {!isEditing ? (
                        <button
                          className="btn btn-primary"
                          onClick={() => setIsEditing(true)}
                        >
                          <i className="fas fa-edit me-2"></i>
                          Chỉnh Sửa Hồ Sơ
                        </button>
                      ) : (
                        <div>
                          <button
                            className="btn btn-success me-2"
                            onClick={handleSave}
                            disabled={loading}
                          >
                            <i className="fas fa-check me-2"></i>
                            Lưu Thay Đổi
                          </button>
                          <button
                            className="btn btn-outline-secondary"
                            onClick={handleCancel}
                            disabled={loading}
                          >
                            <i className="fas fa-times me-2"></i>
                            Hủy
                          </button>
                        </div>
                      )}
                    </div>

                    <form>
                      {/* Full Name */}
                      <div className="mb-3">
                        <label className="form-label">Họ và Tên</label>
                        <input
                          type="text"
                          className="form-control"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                        />
                      </div>

                      {/* Email */}
                      <div className="mb-3">
                        <label className="form-label">Địa Chỉ Email</label>
                        <input
                          type="email"
                          className="form-control"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                        />
                        {formError && (
                          <div className="text-danger small mt-1">{formError}</div>
                        )}
                      </div>

                      {/* Phone */}
                      <div className="mb-3">
                        <label className="form-label">Số Điện Thoại</label>
                        <input
                          type="tel"
                          className="form-control"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                        />
                      </div>

                      <hr className="my-4" />
                      <h6 className="mb-3">Thông Tin Địa Chỉ</h6>

                      {/* Street Address */}
                      <div className="mb-3">
                        <label className="form-label">Địa Chỉ Đường</label>
                        <input
                          type="text"
                          className="form-control"
                          name="address.street"
                          value={formData.address.street}
                          onChange={handleInputChange}
                          disabled={!isEditing}
                        />
                      </div>

                      <div className="row">
                        {/* City */}
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Thành Phố</label>
                          <input
                            type="text"
                            className="form-control"
                            name="address.city"
                            value={formData.address.city}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                          />
                        </div>

                        {/* State */}
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Tỉnh/Thành Phố</label>
                          <input
                            type="text"
                            className="form-control"
                            name="address.state"
                            value={formData.address.state}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                          />
                        </div>
                      </div>

                      <div className="row">
                        {/* ZIP Code */}
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Mã Bưu Điện</label>
                          <input
                            type="text"
                            className="form-control"
                            name="address.zipCode"
                            value={formData.address.zipCode}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                          />
                        </div>

                        {/* Country */}
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Quốc Gia</label>
                          <input
                            type="text"
                            className="form-control"
                            name="address.country"
                            value={formData.address.country}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                          />
                        </div>
                      </div>
                    </form>
                  </div>
                )}

                {/* Security Tab */}
                {activeTab === "security" && (
                  <div className="tab-content">
                    <h5 className="mb-4">Cài Đặt Bảo Mật</h5>

                    <div className="security-section mb-4">
                      <h6>Đổi Mật Khẩu</h6>
                      <p className="text-muted">
                        Cập nhật mật khẩu để giữ tài khoản của bạn an toàn
                      </p>
                      <button className="btn btn-outline-primary">
                        <i className="fas fa-key me-2"></i>
                        Đổi Mật Khẩu
                      </button>
                    </div>

                    <hr />

                    <div className="security-section mb-4">
                      <h6>Xác Thực Hai Yếu Tố</h6>
                      <p className="text-muted">
                        Thêm một lớp bảo mật bổ sung cho tài khoản của bạn
                      </p>
                      <button className="btn btn-outline-success">
                        <i className="fas fa-shield-alt me-2"></i>
                        Bật 2FA
                      </button>
                    </div>

                    <hr />

                    <div className="security-section">
                      <h6>Phiên Đăng Nhập Hoạt Động</h6>
                      <p className="text-muted">
                        Quản lý các phiên đăng nhập hoạt động trên các thiết bị
                      </p>
                      <div className="session-item">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <i className="fas fa-desktop me-2"></i>
                            <strong>Thiết Bị Hiện Tại</strong>
                            <br />
                            <small className="text-muted">
                              Windows • Hoạt động lần cuối: Bây giờ
                            </small>
                          </div>
                          <span className="badge bg-success">Đang Hoạt Động</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Activity Tab */}
                {activeTab === "activity" && (
                  <div className="tab-content">
                    <h5 className="mb-4">Hoạt Động Gần Đây</h5>

                    <div className="activity-timeline">
                      {orders.slice(0, 5).map((order, index) => (
                        <div key={order._id} className="activity-item">
                          <div className="activity-icon">
                            <i className="fas fa-shopping-bag"></i>
                          </div>
                          <div className="activity-content">
                            <h6>Đã Đặt Hàng</h6>
                            <p className="text-muted mb-1">
                              Đơn hàng #{order.orderId} - ${order.total.toFixed(2)}
                            </p>
                            <small className="text-muted">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </small>
                          </div>
                        </div>
                      ))}

                      {orders.length === 0 && (
                        <div className="text-center py-5">
                          <i className="fas fa-history fa-3x text-muted mb-3"></i>
                          <p className="text-muted">Không có hoạt động gần đây</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Profile;
