import React, { useEffect, useMemo, useState } from "react";
import "./HeroCarousel.css";

const HeroCarousel = () => {
  const slides = useMemo(
    () => [
      {
        id: 1,
        title: "Chăm sóc sức khỏe toàn diện",
        description: "Dịch vụ y tế và dược phẩm giao tận nơi, tiện lợi cho cả gia đình.",
        image: "/images/banner-1.jpg",
      },
      {
        id: 2,
        title: "Tư vấn dược sĩ 24/7",
        description: "Nhận lời khuyên chuyên môn nhanh chóng mọi lúc khi bạn cần.",
        image: "/images/banner-2.jpg",
      },
      {
        id: 3,
        title: "Ưu đãi hằng tuần",
        description: "Tiết kiệm chi phí với nhiều chương trình khuyến mãi hấp dẫn.",
        image: "/images/banner-3.jpg",
      },
      {
        id: 4,
        title: "Theo dõi đơn hàng dễ dàng",
        description: "Cập nhật trạng thái giao hàng tức thì ngay trên ứng dụng.",
        image: "/images/banner-4.jpg",
      },
      {
        id: 5,
        title: "Giải pháp cho mọi lứa tuổi",
        description: "Sản phẩm phong phú cho trẻ em, người lớn và người cao tuổi.",
        image: "/images/banner-5.jpg",
      },
    ],
    []
  );

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const intervalId = setInterval(() => {
      handleNext();
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const handleDotClick = (index) => {
    setCurrentIndex(index);
  };

  return (
    <section className="hero-wrapper" aria-roledescription="carousel">
      <div className="hero-inner">
        {slides.map((slide, index) => {
          const isActive = index === currentIndex;
          return (
            <div
              key={slide.id}
              className={`hero-slide ${isActive ? "hero-slide-active" : "hero-slide-hidden"}`}
              style={{ backgroundImage: `url(${slide.image})` }}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} / ${slides.length}: ${slide.title}`}
              aria-hidden={!isActive}
            >
              <div className="hero-overlay">
                <div className="hero-content">
                  <p className="hero-kicker">Medicare - Care for everyone</p>
                  <h2 className="hero-title">{slide.title}</h2>
                  <p className="hero-desc">{slide.description}</p>
                </div>
              </div>
            </div>
          );
        })}

        <button
          className="hero-arrow hero-arrow-left"
          onClick={handlePrev}
          aria-label="Slide trước"
          type="button"
        >
          ‹
        </button>
        <button
          className="hero-arrow hero-arrow-right"
          onClick={handleNext}
          aria-label="Slide tiếp theo"
          type="button"
        >
          ›
        </button>

        <div className="hero-dots" role="tablist" aria-label="Chọn slide">
          {slides.map((_, index) => (
            <button
              key={index}
              className={`hero-dot ${index === currentIndex ? "hero-dot-active" : ""}`}
              onClick={() => handleDotClick(index)}
              aria-label={`Slide ${index + 1}`}
              aria-pressed={index === currentIndex}
              type="button"
            ></button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroCarousel;
