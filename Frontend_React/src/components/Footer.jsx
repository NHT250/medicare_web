// Footer Component
import React from "react";
import { useNavigate } from "react-router-dom";

const Footer = () => {
  const Navigate = useNavigate();

  return (
    <footer className="footer bg-dark text-light py-5">
      <div className="container-fluid" style={{ paddingLeft: "3rem", paddingRight: "3rem" }}>
        <div className="row g-4">
          {/* Medicare Column */}
          <div className="col-lg-3 col-md-6">
            <h5 className="text-primary mb-3">Medicare</h5>
            <p className="text-light mb-3">
              Nhà thuốc trực tuyến đáng tin cậy cho mọi nhu cầu chăm sóc sức khỏe. Thuốc chất lượng,
              tư vấn chuyên gia, giao hàng nhanh.
            </p>
            <div className="social-icons">
              <a href="#" className="social-icon me-2" title="Facebook">
                <i className="fab fa-facebook-f"></i>
              </a>
              <a href="#" className="social-icon me-2" title="Twitter">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="#" className="social-icon me-2" title="Instagram">
                <i className="fab fa-instagram"></i>
              </a>
              <a href="#" className="social-icon me-2" title="LinkedIn">
                <i className="fab fa-linkedin-in"></i>
              </a>
            </div>
          </div>

          {/* About Us Column */}
          <div className="col-lg-3 col-md-6">
            <h5 className="mb-3 text-white">Về Chúng Tôi</h5>
            <ul className="list-unstyled">
              <li>
                <a href="#" className="text-light text-decoration-none">
                  Câu Chuyện Medicare
                </a>
              </li>
              <li>
                <a href="#" className="text-light text-decoration-none">
                  Sứ Mệnh & Tầm Nhìn
                </a>
              </li>
              <li>
                <a href="#" className="text-light text-decoration-none">
                  Tuyển Dụng
                </a>
              </li>
              <li>
                <a href="#" className="text-light text-decoration-none">
                  Báo Chí
                </a>
              </li>
            </ul>
          </div>

          {/* Customer Support Column */}
          <div className="col-lg-3 col-md-6">
            <h5 className="mb-3 text-white">Hỗ Trợ Khách Hàng</h5>
            <ul className="list-unstyled">
              <li>
                <a href="#" className="text-light text-decoration-none">
                  Câu Hỏi Thường Gặp
                </a>
              </li>
              <li>
                <a href="#" className="text-light text-decoration-none">
                  Đổi Trả & Hoàn Tiền
                </a>
              </li>
              <li>
                <a href="#" className="text-light text-decoration-none">
                  Thông Tin Giao Hàng
                </a>
              </li>
              <li>
                <a href="#" className="text-light text-decoration-none">
                  Theo Dõi Đơn Hàng
                </a>
              </li>
              <li>
                <a href="#" className="text-light text-decoration-none">
                  Chính Sách Bảo Mật
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info Column */}
          <div className="col-lg-3 col-md-6">
            <h5 className="mb-3 text-white">Thông Tin Liên Hệ</h5>
            <div className="contact-item mb-2">
              <i className="fas fa-map-marker-alt text-primary me-2"></i>
              <span className="text-light">123 Đường Y Tế, Thành Phố Y Tế, MC 12345</span>
            </div>
            <div className="contact-item mb-2">
              <i className="fas fa-phone text-primary me-2"></i>
              <span className="text-light">+84 (555) 123-4567</span>
            </div>
            <div className="contact-item mb-2">
              <i className="fas fa-envelope text-primary me-2"></i>
              <span className="text-light">support@medicare.com</span>
            </div>
          </div>
        </div>

        <hr className="my-4" style={{ borderColor: "rgba(255, 255, 255, 0.2)" }} />
        <div className="text-center">
          <p className="text-light mb-0">&copy; 2025 Medicare. Bảo lưu mọi quyền.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
