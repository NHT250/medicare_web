import React from "react";
import { Carousel } from "react-bootstrap";
import "./HeroSection.css";

const HERO_BACKGROUND = "/mnt/data/d3aac6e1-93f1-4d43-9caa-4f1a857599b5.png";

const bannerImages = [
  {
    id: "banner-1",
    src: "https://sf-static.upanhlaylink.com/img/image_2025112222841506b5c8e1aabc996c198d35e999.jpg",
    alt: "Healthcare banner 1",
  },
  {
    id: "banner-2",
    src: "https://sf-static.upanhlaylink.com/img/image_20251122dd19d301a0c000ade8ccb4a43f574845.jpg",
    alt: "Healthcare banner 2",
  },
  {
    id: "banner-3",
    src: "https://sf-static.upanhlaylink.com/img/image_20251122bd43699a15f567fd71e2090a77df0893.jpg",
    alt: "Healthcare banner 3",
  },
  {
    id: "banner-4",
    src: "https://sf-static.upanhlaylink.com/img/image_20251122af49eb50047f8bbafae718b99aca7a65.jpg",
    alt: "Healthcare banner 4",
  },
  {
    id: "banner-5",
    src: "https://sf-static.upanhlaylink.com/img/image_20251122c9e1aa99c57f0aa2ac1b25e799a66533.jpg",
    alt: "Healthcare banner 5",
  },
];

const HeroSection = () => {
  return (
    <div className="hero-wrapper">
      <img className="hero-bg" src={HERO_BACKGROUND} alt="Hero background" />

      <Carousel
        className="hero-carousel"
        indicators
        controls
        fade={false}
        interval={5000}
        pause={false}
        slide
      >
        {bannerImages.map((banner) => (
          <Carousel.Item key={banner.id} className="hero-slide">
            <img src={banner.src} alt={banner.alt} />
          </Carousel.Item>
        ))}
      </Carousel>
    </div>
  );
};

export default HeroSection;
