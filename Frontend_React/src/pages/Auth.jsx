// Auth Page - Login & Register
// npm install react-google-recaptcha
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../styles/Auth.css";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, isAuthenticated, role, user } = useAuth();



  const [activeTab, setActiveTab] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  // Register form state
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
    recaptcha_token: "",
  });

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated) {
      if ((role || user?.role) === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
  }, [isAuthenticated, navigate, role, user]);

  // Handle login submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate form
    if (!loginForm.email || !loginForm.password) {
      setError("Please fill in all fields");
      return;
    }

    // Validate email format
    if (!validateEmail(loginForm.email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      console.log("🔐 Login attempt with:", { email: loginForm.email });
      const result = await login({
        ...loginForm,
      });

      console.log("✅ Login result:", result);

      if (result.success) {
        console.log("✅ Login successful, redirecting...");
        alert("Login successful! Redirecting...");
        const destination =
          result.data.role === "admin"
            ? "/admin"
            : location.state?.from || "/";
        navigate(destination);
      } else {
        console.error("❌ Login failed:", result.error);
        setError(result.error);
      }
    } catch (err) {
      console.error("Login error details:", err);
      if (err.code === "ECONNABORTED" || err.message === "Timeout") {
        setError("Connection timeout. Is the backend running at http://localhost:5000?");
      } else if (err.response?.status === 401) {
        setError("Invalid email or password");
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.error || "Invalid credentials");
      } else if (!err.response) {
        setError("Cannot connect to server. Check your internet or backend status.");
      } else {
        setError(err.response?.data?.error || "An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle register submit
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate form
    if (
      !registerForm.name ||
      !registerForm.email ||
      !registerForm.phone ||
      !registerForm.password ||
      !registerForm.confirmPassword
    ) {
      setError("Please fill in all fields");
      return;
    }

    // Validate email
    if (!validateEmail(registerForm.email)) {
      setError("Please enter a valid email address");
      return;
    }

    // Validate phone
    if (!validatePhone(registerForm.phone)) {
      setError("Please enter a valid phone number");
      return;
    }

    // Validate password
    if (!validatePassword(registerForm.password)) {
      setError(
        "Password must be at least 8 characters with uppercase, lowercase, and number"
      );
      return;
    }

    // Check password match
    if (registerForm.password !== registerForm.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // Check terms agreement
    if (!registerForm.agreeTerms) {
      setError("Please agree to the Terms & Conditions");
      return;
    }



    setLoading(true);

    try {
      const result = await register({
        ...registerForm,
      });

      if (result.success) {
        alert("Registration successful! Please log in.");
        navigate("/login");
        setRegisterForm({
          name: "",
          email: "",
          phone: "",
          password: "",
          confirmPassword: "",
          agreeTerms: false,
          recaptcha_token: "",
        });
        setSuccess("Registration successful! You can now sign in.");
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error("Register error details:", err);
      if (err.code === "ECONNABORTED" || err.message === "Timeout") {
        setError("Connection timeout. Is the backend running at http://localhost:5000?");
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.error || "Email already exists or invalid data");
      } else if (!err.response) {
        setError("Cannot connect to server. Check your internet or backend status.");
      } else {
        setError(err.response?.data?.error || "An error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Validation functions
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ""));
  };

  return (
    <div className="auth-page">
      {/* Header */}
      <header className="auth-header">
        <div className="header-content">
          <div className="logo" onClick={() => navigate("/")}>
            <div className="logo-icon">
              <span>Me</span>
            </div>
            <h1>Medicare</h1>
          </div>
          <div className="header-actions">
            <button className="back-to-home" onClick={() => navigate("/")}>
              <i className="fas fa-home"></i> Back to Home
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="auth-main">
        <div className="auth-container">
          {/* Left Column - Form */}
          <div className="form-column">
            <div className="form-container">
              {/* Tabs */}
              <div className="tabs">
                <button
                  className={`tab ${activeTab === "login" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("login");
                    setError("");
                    setSuccess("");
                  }}
                >
                  Login
                </button>
                <button
                  className={`tab ${activeTab === "register" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("register");
                    setError("");
                    setSuccess("");
                  }}
                >
                  Register
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}

              {success && (
                <div className="alert alert-success" role="alert">
                  {success}
                </div>
              )}

              {/* Login Form */}
              {activeTab === "login" && (
                <div className="form-section">
                  <h2 className="welcome-title">Welcome Back!</h2>
                  <p className="welcome-subtitle">
                    Sign in to your Medicare account
                  </p>

                  <form className="auth-form" onSubmit={handleLoginSubmit}>
                    <div className="form-group">
                      <label htmlFor="loginEmail">Email Address</label>
                      <div className="input-container">
                        <input
                          type="email"
                          id="loginEmail"
                          value={loginForm.email}
                          onChange={(e) =>
                            setLoginForm({
                              ...loginForm,
                              email: e.target.value,
                            })
                          }
                          placeholder="Enter your email"
                          required
                        />
                        <i className="fas fa-envelope input-icon"></i>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="loginPassword">Password</label>
                      <div className="input-container">
                        <input
                          type="password"
                          id="loginPassword"
                          value={loginForm.password}
                          onChange={(e) =>
                            setLoginForm({
                              ...loginForm,
                              password: e.target.value,
                            })
                          }
                          placeholder="Enter your password"
                          required
                        />
                        <i className="fas fa-lock input-icon"></i>
                      </div>
                    </div>

                    <div className="form-options">
                      <label className="checkbox-container">
                        <input type="checkbox" name="remember" />
                        <span className="checkmark"></span>
                        Remember me
                      </label>
                      <a href="#" className="forgot-password">
                        Forgot password?
                      </a>
                    </div>



                    {error && (
                      <p className="text-danger text-center small mb-2">{error}</p>
                    )}

                    <button
                      type="submit"
                      className="submit-btn"
                      disabled={loading}
                    >
                      {loading ? "Logging in..." : "Login"}
                    </button>
                  </form>

                  <p className="switch-form">
                    Don't have an account?{" "}
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate("/register");
                      }}
                    >
                      Register here
                    </a>
                  </p>
                </div>
              )}

              {/* Register Form */}
              {activeTab === "register" && (
                <div className="form-section">
                  <h2 className="welcome-title">Create Account!</h2>
                  <p className="welcome-subtitle">
                    Join Medicare for better healthcare
                  </p>

                  <form className="auth-form" onSubmit={handleRegisterSubmit}>
                    <div className="form-group">
                      <label htmlFor="registerName">Full Name</label>
                      <div className="input-container">
                        <input
                          type="text"
                          id="registerName"
                          value={registerForm.name}
                          onChange={(e) =>
                            setRegisterForm({
                              ...registerForm,
                              name: e.target.value,
                            })
                          }
                          placeholder="Enter your full name"
                          required
                        />
                        <i className="fas fa-user input-icon"></i>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="registerEmail">Email Address</label>
                      <div className="input-container">
                        <input
                          type="email"
                          id="registerEmail"
                          value={registerForm.email}
                          onChange={(e) =>
                            setRegisterForm({
                              ...registerForm,
                              email: e.target.value,
                            })
                          }
                          placeholder="Enter your email"
                          required
                        />
                        <i className="fas fa-envelope input-icon"></i>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="registerPhone">Phone Number</label>
                      <div className="input-container">
                        <input
                          type="tel"
                          id="registerPhone"
                          value={registerForm.phone}
                          onChange={(e) =>
                            setRegisterForm({
                              ...registerForm,
                              phone: e.target.value,
                            })
                          }
                          placeholder="Enter your phone number"
                          required
                        />
                        <i className="fas fa-phone input-icon"></i>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="registerPassword">Password</label>
                      <div className="input-container">
                        <input
                          type="password"
                          id="registerPassword"
                          value={registerForm.password}
                          onChange={(e) =>
                            setRegisterForm({
                              ...registerForm,
                              password: e.target.value,
                            })
                          }
                          placeholder="Enter your password"
                          required
                        />
                        <i className="fas fa-lock input-icon"></i>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="confirmPassword">Confirm Password</label>
                      <div className="input-container">
                        <input
                          type="password"
                          id="confirmPassword"
                          value={registerForm.confirmPassword}
                          onChange={(e) =>
                            setRegisterForm({
                              ...registerForm,
                              confirmPassword: e.target.value,
                            })
                          }
                          placeholder="Confirm your password"
                          required
                        />
                        <i className="fas fa-lock input-icon"></i>
                      </div>
                    </div>

                    <div className="form-options">
                      <label className="checkbox-container">
                        <input
                          type="checkbox"
                          checked={registerForm.agreeTerms}
                          onChange={(e) =>
                            setRegisterForm({
                              ...registerForm,
                              agreeTerms: e.target.checked,
                            })
                          }
                          required
                        />
                        <span className="checkmark"></span>I agree to the{" "}
                        <a href="#">Terms & Conditions</a>
                      </label>
                    </div>



                    <button
                      type="submit"
                      className="submit-btn"
                      disabled={loading}
                    >
                      {loading ? "Creating account..." : "Register"}
                    </button>
                  </form>

                  <p className="switch-form">
                    Already have an account?{" "}
                    <a href="#" onClick={() => setActiveTab("login")}>
                      Login here
                    </a>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Promo */}
          <div className="promo-column">
            <div className="promo-container">
              <div className="promo-image">
                <div className="image-placeholder">
                  <i className="fas fa-pills"></i>
                  <span>HEALTHCARE</span>
                </div>
              </div>

              <h3 className="promo-title">Your Health, Our Priority</h3>
              <p className="promo-description">
                Join thousands of satisfied customers who trust Medicare for
                their pharmaceutical needs. Fast delivery, quality medicines,
                and professional care.
              </p>

              <div className="features">
                <div className="feature">
                  <div className="feature-icon">
                    <i className="fas fa-truck"></i>
                  </div>
                  <span>Fast Delivery</span>
                </div>
                <div className="feature">
                  <div className="feature-icon">
                    <i className="fas fa-check-circle"></i>
                  </div>
                  <span>Certified Quality</span>
                </div>
                <div className="feature">
                  <div className="feature-icon">
                    <i className="fas fa-headset"></i>
                  </div>
                  <span>24/7 Support</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="auth-footer">
        <div className="footer-content">
          <div className="footer-left">
            <p>&copy; 2025 Medicare. All rights reserved.</p>
          </div>
          <div className="footer-right">
            <div className="social-icons">
              <a href="#" className="social-icon">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="#" className="social-icon">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="#" className="social-icon">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="#" className="social-icon">
                <i className="fab fa-linkedin-in"></i>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Auth;
