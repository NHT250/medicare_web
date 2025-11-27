// Navbar Component
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";

const Navbar = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout, role } = useAuth();
  const { cartCount } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${searchQuery}`);
    }
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      logout();
      setShowUserDropdown(false);
      navigate("/");
    }
  };

  const getInitials = (name) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const toggleUserDropdown = () => {
    setShowUserDropdown(!showUserDropdown);
  };

  const userRole = (user?.role || role || "customer").toLowerCase();

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-white shadow-sm">
      <div
        className="container-fluid d-flex align-items-center justify-content-between"
        style={{ paddingLeft: "3rem", paddingRight: "3rem" }}
      >
        {/* Left: Logo */}
        <div className="navbar-left">
          <a
            className="navbar-brand fw-bold text-primary fs-3"
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate("/");
            }}
          >
            Medicare
          </a>
        </div>

        {/* Center: Search Bar */}
        <div className="navbar-center flex-grow-1 d-none d-lg-flex justify-content-center">
          <form
            onSubmit={handleSearch}
            className="input-group"
            style={{ maxWidth: "500px", width: "100%" }}
          >
            <input
              type="text"
              className="form-control search-input"
              placeholder="Search medicines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="btn btn-primary search-btn" type="submit">
              <i className="fas fa-search"></i>
            </button>
          </form>
        </div>

        {/* Right: Buttons */}
        <div className="navbar-right d-flex align-items-center gap-3">
          {isAuthenticated && user ? (
            <>
              {userRole === "admin" && (
                <button
                  className="btn btn-outline-primary d-none d-lg-inline"
                  onClick={() => navigate("/admin")}
                >
                  <i className="fas fa-tools me-2"></i> Admin Panel
                </button>
              )}
              {/* Cart Icon */}
              <div
                className="cart-icon position-relative"
                onClick={() => navigate("/cart")}
                style={{ cursor: "pointer" }}
                title="Shopping Cart"
              >
                <i className="fas fa-shopping-cart fs-4 text-muted"></i>
                {cartCount > 0 && (
                  <span className="cart-badge position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                    {cartCount}
                  </span>
                )}
              </div>

              {/* User Profile Dropdown */}
              <div className="user-menu-container position-relative" ref={dropdownRef}>
                <div 
                  className="user-avatar-wrapper"
                  onClick={toggleUserDropdown}
                  style={{ cursor: "pointer" }}
                >
                  <div className="user-avatar">
                    {getInitials(user.name)}
                  </div>
                  <div className="user-info d-none d-lg-block">
                    <div className="user-name">{user.name || user.email}</div>
                    <div className="user-role">{userRole === "admin" ? "Admin" : "Customer"}</div>
                  </div>
                  <i className={`fas fa-chevron-${showUserDropdown ? 'up' : 'down'} ms-2 text-muted`}></i>
                </div>

                {/* Dropdown Menu */}
                {showUserDropdown && (
                  <div className="user-dropdown-menu">
                    <div className="dropdown-header">
                      <div className="user-dropdown-avatar">
                        {getInitials(user.name)}
                      </div>
                      <div>
                        <div className="dropdown-user-name">{user.name || 'User'}</div>
                        <div className="dropdown-user-email">{user.email}</div>
                      </div>
                    </div>
                    <div className="dropdown-divider"></div>
                    {userRole === "admin" && (
                      <button
                        className="dropdown-item"
                        onClick={() => {
                          navigate("/admin");
                          setShowUserDropdown(false);
                        }}
                      >
                        <i className="fas fa-tools me-2"></i>
                        Admin Dashboard
                      </button>
                    )}
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        navigate("/profile");
                        setShowUserDropdown(false);
                      }}
                    >
                      <i className="fas fa-user me-2"></i>
                      My Profile
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        navigate("/orders");
                        setShowUserDropdown(false);
                      }}
                    >
                      <i className="fas fa-shopping-bag me-2"></i>
                      My Orders
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        navigate("/cart");
                        setShowUserDropdown(false);
                      }}
                    >
                      <i className="fas fa-shopping-cart me-2"></i>
                      My Cart
                    </button>
                    <div className="dropdown-divider"></div>
                    <button
                      className="dropdown-item text-danger"
                      onClick={handleLogout}
                    >
                      <i className="fas fa-sign-out-alt me-2"></i>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Cart Icon for non-authenticated users */}
              <div
                className="cart-icon position-relative"
                onClick={() => navigate("/cart")}
                style={{ cursor: "pointer" }}
                title="Shopping Cart"
              >
                <i className="fas fa-shopping-cart fs-4 text-muted"></i>
                {cartCount > 0 && (
                  <span className="cart-badge position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                    {cartCount}
                  </span>
                )}
              </div>

              <button
                className="btn btn-outline-secondary"
                onClick={() => navigate("/login")}
              >
                Login
              </button>
              <button
                className="btn btn-primary"
                onClick={() => navigate("/login")}
              >
                Register
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
