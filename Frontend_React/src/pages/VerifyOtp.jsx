import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";
import "../styles/Auth.css";

const VerifyOtp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = location.state?.email || localStorage.getItem("pending_email") || "";

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    if (email) {
      localStorage.setItem("pending_email", email);
    }
  }, [email]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");
    setResendMessage("");

    if (!email || !otp || otp.length !== 6) {
      setError("Please enter the 6-digit OTP sent to your email.");
      return;
    }

    setLoading(true);
    try {
      const result = await authAPI.verifyOtp({ email, otp });
      if (result.message && result.message.toLowerCase().includes("verified")) {
        alert("Email verified! You can now log in.");
        localStorage.removeItem("pending_email");
        navigate("/login");
      } else {
        setError(result.error || "Verification failed.");
      }
    } catch (err) {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setResendMessage("");
    if (!email) {
      setError("Please enter your email to resend the OTP.");
      return;
    }

    try {
      const result = await authAPI.resendOtp({ email });
      if (result.message) {
        setResendMessage("OTP resent to your email. Please check your inbox.");
      } else {
        setError(result.error || "Unable to resend OTP.");
      }
    } catch (err) {
      setError("Unable to resend OTP. Please try again.");
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
              <i className="fas fa-sign-in-alt"></i> Back to Login
            </button>
          </div>
        </div>
      </header>

      <main className="auth-main">
        <div className="auth-container">
          <div className="form-column">
            <div className="form-container">
              <div className="tabs single-tab">
                <button className="tab active">Verify OTP</button>
              </div>

              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}

              {resendMessage && (
                <div className="alert alert-success" role="alert">
                  {resendMessage}
                </div>
              )}

              <div className="form-section">
                <h2 className="welcome-title">Email Verification</h2>
                <p className="welcome-subtitle">
                  Enter the 6-digit OTP sent to your email within 2 minutes.
                </p>

                <form className="auth-form" onSubmit={handleVerify}>
                  <div className="form-group">
                    <label htmlFor="verifyEmail">Email</label>
                    <div className="input-container">
                      <input
                        type="email"
                        id="verifyEmail"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                      />
                      <i className="fas fa-envelope input-icon"></i>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="otp">OTP</label>
                    <div className="input-container">
                      <input
                        type="text"
                        id="otp"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="Enter 6-digit OTP"
                        maxLength={6}
                        required
                      />
                      <i className="fas fa-key input-icon"></i>
                    </div>
                  </div>

                  <div className="form-options">
                    <button
                      type="button"
                      className="link-button"
                      onClick={handleResend}
                      disabled={!email}
                    >
                      Resend OTP
                    </button>
                  </div>

                  <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? "Verifying..." : "Verify"}
                  </button>
                </form>
              </div>
            </div>
          </div>

          <div className="promo-column">
            <div className="promo-container">
              <div className="promo-image">
                <div className="image-placeholder">
                  <i className="fas fa-key"></i>
                  <span>OTP</span>
                </div>
              </div>

              <h3 className="promo-title">Check Your Inbox</h3>
              <p className="promo-description">
                We sent you a one-time password via email. It expires quickly to
                keep your account secure. Need a new code? Use the Resend OTP
                button.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VerifyOtp;
