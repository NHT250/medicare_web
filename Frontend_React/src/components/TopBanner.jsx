import React, { useEffect, useState } from "react";
import "./TopBanner.css";

const messages = [
  "Miễn phí vận chuyển cho đơn hàng trên 500.000đ",
  "Giao hàng nhanh trong vòng 2 giờ tại khu vực được chọn",
  "Hotline: 1900 1234 (08:00 - 22:00)",
];

const TopBanner = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % messages.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="top-banner">
      <div className="container-fluid d-flex align-items-center justify-content-between">
        <div className="top-banner-message">
          {messages.map((msg, index) => (
            <span
              key={msg}
              className={`banner-text ${index === activeIndex ? "active" : ""}`}
            >
              {msg}
            </span>
          ))}
        </div>
        <button
          className="banner-close-btn"
          aria-label="Close promotion banner"
          onClick={() => setIsVisible(false)}
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default TopBanner;
