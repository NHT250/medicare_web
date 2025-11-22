// Footer Component
import React from "react";
import { useNavigate } from "react-router-dom";

const Footer = () => {
  const Navigate = useNavigate();

  return (
    <footer className="footer bg-dark text-light py-5">
      <div
        className="container-fluid"
        style={{ paddingLeft: "3rem", paddingRight: "3rem" }}
      >
        <div className="row g-4">
          {/* Medicare Column */}
          <div className="col-lg-3 col-md-6">
            <h5 className="text-primary mb-3">Medicare</h5>
            <p className="text-light mb-3">
              Your trusted online pharmacy for all your healthcare needs.
              Quality medicines, expert advice, fast delivery.
            </p>
            <div className="social-icons">
              <a href="#" className="social-icon me-2">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="#" className="social-icon me-2">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="#" className="social-icon me-2">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="#" className="social-icon me-2">
                <i className="fab fa-linkedin-in"></i>
              </a>
            </div>
          </div>

          {/* About Us Column */}
          <div className="col-lg-3 col-md-6">
            <h5 className="mb-3 text-white">About Us</h5>
            <ul className="list-unstyled">
              <li>
                <a href="#" className="text-light text-decoration-none">
                  Our Story
                </a>
              </li>
              <li>
                <a href="#" className="text-light text-decoration-none">
                  Mission & Vision
                </a>
              </li>
              <li>
                <a href="#" className="text-light text-decoration-none">
                  Careers
                </a>
              </li>
              <li>
                <a href="#" className="text-light text-decoration-none">
                  Press
                </a>
              </li>
            </ul>
          </div>

          {/* Customer Support Column */}
          <div className="col-lg-3 col-md-6">
            <h5 className="mb-3 text-white">Customer Support</h5>
            <ul className="list-unstyled">
              <li>
                <a href="#" className="text-light text-decoration-none">
                  FAQs
                </a>
              </li>
              <li>
                <a href="#" className="text-light text-decoration-none">
                  Returns & Refunds
                </a>
              </li>
              <li>
                <a href="#" className="text-light text-decoration-none">
                  Shipping Info
                </a>
              </li>
              <li>
                <a href="#" className="text-light text-decoration-none">
                  Track Order
                </a>
              </li>
              <li>
                <a href="#" className="text-light text-decoration-none">
                  Privacy Policy
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info Column */}
          <div className="col-lg-3 col-md-6">
            <h5 className="mb-3 text-white">Contact Info</h5>
            <div className="contact-item mb-2">
              <i className="fas fa-map-marker-alt text-primary me-2"></i>
              <span className="text-light">
                123 Healthcare St, Medical City, MC 12345
              </span>
            </div>
            <div className="contact-item mb-2">
              <i className="fas fa-phone text-primary me-2"></i>
              <span className="text-light">+1 (555) 123-4567</span>
            </div>
            <div className="contact-item mb-2">
              <i className="fas fa-envelope text-primary me-2"></i>
              <span className="text-light">support@medicare.com</span>
            </div>
          </div>
        </div>

        <hr
          className="my-4"
          style={{ borderColor: "rgba(255, 255, 255, 0.2)" }}
        />
        <div className="text-center">
          <p className="text-light mb-0">
            &copy; 2025 Medicare. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
