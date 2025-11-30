// Auth Page - Login & Register
// npm install react-google-recaptcha
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ReCAPTCHA from "react-google-recaptcha";
import config from "../config";
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
  
  // reCAPTCHA token for login
  const [loginRecaptchaToken, setLoginRecaptchaToken] = useState(null);
  
  // Register form state
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
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
      setError("Vui lòng đi�n đầy đủ thông tin");
      return;
    }

    // Validate email format
    if (!validateEmail(loginForm.email)) {
      setError("Vui lòng nhập địa chỉ email hợp lệ");
      return;
    }

    // Validate reCAPTCHA
    if (!loginRecaptchaToken) {
      setError('Vui lòng xác nhận "I\'m not a robot".');
      return;
    }

    // Validate reCAPTCHA
    if (!loginRecaptchaToken) {
      setError('Vui lòng xác nhận "I\'m not a robot".');
      return;
    }

    setLoading(true);

    try {
      console.log("� Login attempt with:", { email: loginForm.email });
      const result = await login({
        ...loginForm,
        recaptcha_token: loginRecaptchaToken,
      });

      console.log("✅ Login result:", result);

      if (result.success) {
        console.log("✅ Login successful, redirecting...");
        alert("�ăng nhập thành công! �ang chuyển hướng...");
        const destination =
          result.data.role === "admin"
            ? "/admin"
            : location.state?.from || "/";
        navigate(destination);
      } else {
        console.error("� Login failed:", result.error);
        setError(result.error);
      }
    } catch (err) {
      console.error("Login error details:", err);
      if (err.code === "ECONNABORTED" || err.message === "Timeout") {
        setError("Kết nối hết th�i gian ch�. Backend có đang chạy tại http://localhost:5000 không?");
      } else if (err.response?.status === 401) {
        setError("Email hoặc mật khẩu không đúng");
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.error || "Thông tin đăng nhập không hợp lệ");
      } else if (!err.response) {
        setError("Không thể kết nối đến server. Vui lòng kiểm tra kết nối internet hoặc trạng thái backend.");
      } else {
        setError(err.response?.data?.error || "�ã xảy ra lỗi. Vui lòng thử lại.");
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
      setError("Vui lòng đi�n đầy đủ thông tin");
      return;
    }

    // Validate email
    if (!validateEmail(registerForm.email)) {
      setError("Vui lòng nhập địa chỉ email hợp lệ");
      return;
    }

    // Validate phone
    if (!validatePhone(registerForm.phone)) {
      setError("Vui lòng nhập số điện thoại hợp lệ");
      return;
    }

    // Validate password
    if (!validatePassword(registerForm.password)) {
      setError(
        "Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thư�ng và số"
      );
      return;
    }

    // Check password match
    if (registerForm.password !== registerForm.confirmPassword) {
      setError("Mật khẩu không khớp");
      return;
    }

    // Check terms agreement
    if (!registerForm.agreeTerms) {
      setError("Vui lòng đồng ý với �i�u khoản & �i�u kiện");
      return;
    }

    setLoading(true);

    try {
      const result = await register({
        ...registerForm,
      });

      if (result.success) {
        alert("�ăng ký thành công! Vui lòng đăng nhập.");
        navigate("/login");
        setRegisterForm({
          name: "",
          email: "",
          phone: "",
          password: "",
          confirmPassword: "",
          agreeTerms: false,
        });
        setSuccess("Registration successful! You can now sign in.");
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error("Register error details:", err);
      if (err.code === "ECONNABORTED" || err.message === "Timeout") {
        setError("Kết nối hết th�i gian ch�. Backend có đang chạy tại http://localhost:5000 không?");
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.error || "Email đã tồn tại hoặc dữ liệu không hợp lệ");
      } else if (!err.response) {
        setError("Không thể kết nối đến server. Vui lòng kiểm tra kết nối internet hoặc trạng thái backend.");
      } else {
        setError(err.response?.data?.error || "�ã xảy ra lỗi. Vui lòng thử lại.");
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
              <i className="fas fa-home"></i> V� Trang Chủ
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
                    setLoginRecaptchaToken(null); // Reset captcha when switching tabs
                  }}
                >
                  �ăng Nhập
                </button>
                <button
                  className={`tab ${activeTab === "register" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("register");
                    setError("");
                    setSuccess("");
                  }}
                >
                  �ăng Ký
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
                  <h2 className="welcome-title">Chào Mừng Trở Lại!</h2>
                  <p className="welcome-subtitle">
                    �ăng nhập vào tài khoản Medicare của bạn
                  </p>

                  <form className="auth-form" onSubmit={handleLoginSubmit}>
                    <div className="form-group">
                      <label htmlFor="loginEmail">�ịa Chỉ Email</label>
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
                          placeholder="Nhập email của bạn"
                          required
                        />
                        <i className="fas fa-envelope input-icon"></i>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="loginPassword">Mật Khẩu</label>
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
                          placeholder="Nhập mật khẩu của bạn"
                          required
                        />
                        <i className="fas fa-lock input-icon"></i>
                      </div>
                    </div>

                    <div className="form-options">
                      <label className="checkbox-container">
                        <input type="checkbox" name="remember" />
                        <span className="checkmark"></span>
                        Ghi nhớ đăng nhập
                      </label>
                      <a href="#" className="forgot-password">
                        Quên mật khẩu?
                      </a>
                    </div>

                    {/* reCAPTCHA for Login */}
                    <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                      <ReCAPTCHA
                        sitekey={config.RECAPTCHA_SITE_KEY}
                        onChange={(token) => {
                          setLoginRecaptchaToken(token);
                          setError(""); // Clear error when captcha is verified
                        }}
                        onExpired={() => {
                          setLoginRecaptchaToken(null);
                        }}
                        onError={() => {
                          setLoginRecaptchaToken(null);
                          setError("Lỗi xác thực Captcha. Vui lòng thử lại.");
                        }}
                      />
                    </div>

                    {error && (
                      <p className="text-danger text-center small mb-2">{error}</p>
                    )}

                    <button
                      type="submit"
                      className="submit-btn"
                      disabled={loading}
                    >
                      {loading ? "�ang đăng nhập..." : "�ăng Nhập"}
                    </button>
                  </form>

                  <p className="switch-form">
                    Chưa có tài khoản?{" "}
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        navigate("/register");
                      }}
                    >
                      �ăng ký tại đây
                    </a>
                  </p>
                </div>
              )}

              {/* Register Form */}
              {activeTab === "register" && (
                <div className="form-section">
                  <h2 className="welcome-title">Tạo Tài Khoản!</h2>
                  <p className="welcome-subtitle">
                    Tham gia Medicare để chăm sóc sức kh�e tốt hơn
                  </p>

                  <form className="auth-form" onSubmit={handleRegisterSubmit}>
                    <div className="form-group">
                      <label htmlFor="registerName">H� và Tên</label>
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
                          placeholder="Nhập h� và tên của bạn"
                          required
                        />
                        <i className="fas fa-user input-icon"></i>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="registerEmail">�ịa Chỉ Email</label>
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
                          placeholder="Nhập email của bạn"
                          required
                        />
                        <i className="fas fa-envelope input-icon"></i>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="registerPhone">Số �iện Thoại</label>
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
                          placeholder="Nhập số điện thoại của bạn"
                          required
                        />
                        <i className="fas fa-phone input-icon"></i>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="registerPassword">Mật Khẩu</label>
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
                          placeholder="Nhập mật khẩu của bạn"
                          required
                        />
                        <i className="fas fa-lock input-icon"></i>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="confirmPassword">Xác Nhận Mật Khẩu</label>
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
                          placeholder="Xác nhận mật khẩu của bạn"
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
                        <span className="checkmark"></span>Tôi đồng ý với{" "}
                        <a href="#">�i�u khoản & �i�u kiện</a>
                      </label>
                    </div>


                    {error && (
                      <p className="text-danger text-center small mb-2">{error}</p>
                    )}

                    <button
                      type="submit"
                      className="submit-btn"
                      disabled={loading}
                    >
                      {loading ? "�ang tạo tài khoản..." : "�ăng Ký"}
                    </button>
                  </form>

                  <p className="switch-form">
                    �ã có tài khoản?{" "}
                    <a href="#" onClick={() => setActiveTab("login")}>
                      �ăng nhập tại đây
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

              <h3 className="promo-title">Sức Kh�e Của Bạn, Ưu Tiên Của Chúng Tôi</h3>
              <p className="promo-description">
                Tham gia cùng hàng nghìn khách hàng hài lòng tin tưởng Medicare cho
                nhu cầu dược phẩm của h�. Giao hàng nhanh, thuốc chất lượng,
                và chăm sóc chuyên nghiệp.
              </p>

              <div className="features">
                <div className="feature">
                  <div className="feature-icon">
                    <i className="fas fa-truck"></i>
                  </div>
                  <span>Giao Hàng Nhanh</span>
                </div>
                <div className="feature">
                  <div className="feature-icon">
                    <i className="fas fa-check-circle"></i>
                  </div>
                  <span>Chất Lượng �ược Chứng Nhận</span>
                </div>
                <div className="feature">
                  <div className="feature-icon">
                    <i className="fas fa-headset"></i>
                  </div>
                  <span>Hỗ Trợ 24/7</span>
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
            <p>&copy; 2025 Medicare. Bảo lưu m�i quy�n.</p>
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