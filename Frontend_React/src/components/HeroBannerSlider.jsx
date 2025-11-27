import React, { useEffect, useState } from "react";
import "./HeroBannerSlider.css";

const slides = [
  {
    id: "hero-main",
    image: "/mnt/data/c7e8934a-2533-4e61-a6dc-95f82c047138.png",
    fallbackImage: "/images/hero-fullscreen-fallback.svg",
    alt: "Modern healthcare banner",
  },
];

const AUTO_PLAY_DELAY = 5000;

const HeroBannerSlider = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return undefined;

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, AUTO_PLAY_DELAY);

    return () => clearInterval(timer);
  }, []);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % slides.length);
  };

  const goToSlide = (index) => setActiveIndex(index);

  return (
    <section className="hero-full" aria-label="Hero banner">
      <div className="hero-stage">
        {slides.map((slide, index) => {
          const backgroundImage = [slide.image, slide.fallbackImage]
            .filter(Boolean)
            .map((url) => `url(${url})`)
            .join(", ");

          return (
            <div
              key={slide.id}
              className={`hero-slide ${
                index === activeIndex ? "hero-slide-active" : "hero-slide-hidden"
              }`}
              style={{ backgroundImage }}
              role="img"
              aria-label={slide.alt}
            >
              <div className="hero-slide-backdrop" aria-hidden="true" />
            </div>
          );
        })}

        {slides.length > 1 && (
          <>
            <button
              type="button"
              className="hero-arrow hero-arrow-left"
              aria-label="Previous slide"
              onClick={handlePrev}
            >
              ‹
            </button>
            <button
              type="button"
              className="hero-arrow hero-arrow-right"
              aria-label="Next slide"
              onClick={handleNext}
            >
              ›
            </button>
          </>
        )}

        <div className="hero-dots" aria-label="Slide pagination">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              className={`hero-dot ${index === activeIndex ? "hero-dot-active" : ""}`}
              aria-label={`Go to slide ${index + 1}`}
              aria-pressed={index === activeIndex}
              onClick={() => goToSlide(index)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroBannerSlider;
