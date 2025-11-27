import React, { useState } from "react";
import axios from "axios";
import ReCAPTCHA from "react-google-recaptcha";
import { useNavigate } from "react-router-dom";
import config from "../config";
import "../styles/Auth.css";

const Register = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });
  const [recaptchaToken, setRecaptchaToken] = useState(null);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/\s/g, ""));
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

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

    if (!validateEmail(registerForm.email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (!validatePhone(registerForm.phone)) {
      setError("Please enter a valid phone number");
      return;
    }

    if (!validatePassword(registerForm.password)) {
      setError(
        "Password must be at least 8 characters with uppercase, lowercase, and number"
      );
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!registerForm.agreeTerms) {
      setError("Please agree to the Terms & Conditions");
      return;
    }

    if (!recaptchaToken) {
      setError('Vui lòng xác nhận "I\'m not a robot".');
      return;
    }

    const payload = {
      ...registerForm,
      recaptcha_token: recaptchaToken,
    };

    setLoading(true);

    try {
      await axios.post(`${config.API_URL}/api/auth/register`, payload);
      // Show Vietnamese success message and navigate to login after short delay
      setSuccess("Đăng ký thành công, vui lòng đăng nhập!");
      setError("");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      console.error("Register error:", err);
      // Prefer backend message fields (error or message), fallback to generic text
      const serverMsg = err.response?.data?.error || err.response?.data?.message;
      setError(serverMsg || err.message || "Đã xảy ra lỗi, vui lòng thử lại.");
      setSuccess("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <header className="auth-header">
        <div className="header-content">
          <div className="logo" onClick={() => navigate("/")}>
            <div className="logo-icon">
              <span>Me</span>
            </div>
            <h1>Medicare</h1>
          </div>
          <div className="header-actions">
            <button className="back-to-home" onClick={() => navigate("/login")}>
              <i className="fas fa-sign-in-alt"></i> Login
            </button>
          </div>
        </div>
      </header>

      <main className="auth-main">
        <div className="auth-container">
          <div className="form-column">
            <div className="form-container">
              <div className="tabs single-tab">
                <button className="tab active">Register</button>
              </div>

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

              <div className="form-section">
                <h2 className="welcome-title">Create Account!</h2>
                <p className="welcome-subtitle">
                  Join Medicare to explore exclusive offers and services.
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
                      <span className="checkmark"></span>I agree to the {" "}
                      <a href="#">Terms & Conditions</a>
                    </label>
                  </div>

                  <div className="d-flex justify-content-center mb-3">
                    <ReCAPTCHA
                      sitekey={config.RECAPTCHA_SITE_KEY}
                      onChange={(token) => {
                        setRecaptchaToken(token);
                        setError("");
                      }}
                    />
                  </div>

                  {error && (
                    <p className="text-danger text-center small mb-2">{error}</p>
                  )}

                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? "Processing..." : "Register"}
                  </button>
                </form>

                <p className="switch-form">
                  Already have an account?{" "}
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate("/login");
                    }}
                  >
                    Login here
                  </a>
                </p>
              </div>
            </div>
          </div>

          <div className="promo-column">
              <div className="promo-container">
                <div className="promo-image">
                  <div className="image-placeholder">
                    <i className="fas fa-envelope"></i>
                    <span>WELCOME</span>
                  </div>
                </div>

                <h3 className="promo-title">Secure Account Creation</h3>
                <p className="promo-description">
                  Create your Medicare account quickly and start exploring deals
                  right away with built-in security safeguards.
                </p>

              <div className="features">
                  <div className="feature">
                    <div className="feature-icon">
                      <i className="fas fa-shield-alt"></i>
                    </div>
                    <span>Protected Data</span>
                  </div>
                  <div className="feature">
                    <div className="feature-icon">
                      <i className="fas fa-clock"></i>
                    </div>
                    <span>Quick Sign Up</span>
                  </div>
                  <div className="feature">
                    <div className="feature-icon">
                      <i className="fas fa-sync-alt"></i>
                    </div>
                    <span>Easy Updates</span>
                  </div>
              </div>
            </div>
          </div>
        </div>
      </main>

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

export default Register;
