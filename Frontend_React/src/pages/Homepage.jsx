// Homepage Component
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { categoriesAPI, productsAPI } from "../services/api";
import TopBanner from "../components/TopBanner";
import Navbar from "../components/Navbar";
import HeroSection from "../components/HeroSection";
import Footer from "../components/Footer";
import "./Homepage.css";

const categories = [
  {
    id: "cat-1",
    name: "Pain Relief",
    key: "pain_relief",
    slug: "pain-relief",
    icon: "fas fa-pills",
  },
  {
    id: "cat-2",
    name: "Vitamins",
    key: "vitamins",
    slug: "vitamins",
    icon: "fas fa-leaf",
  },
  {
    id: "cat-3",
    name: "Skin Care",
    key: "skin_care",
    slug: "skin-care",
    icon: "fas fa-hand-sparkles",
  },
  {
    id: "cat-4",
    name: "Heart Health",
    key: "heart_health",
    slug: "heart-health",
    icon: "fas fa-heartbeat",
  },
  {
    id: "cat-5",
    name: "Mental Health",
    key: "mental_health",
    slug: "mental-health",
    icon: "fas fa-brain",
  },
  {
    id: "cat-6",
    name: "Respiratory",
    key: "respiratory",
    slug: "respiratory",
    icon: "fas fa-lungs",
  },
];

const whyChoose = [
  {
    id: "why-1",
    icon: "fas fa-shield-alt",
    title: "Genuine Medicines",
    subtitle: "Sourced directly from verified manufacturers.",
  },
  {
    id: "why-2",
    icon: "fas fa-shipping-fast",
    title: "Fast Delivery",
    subtitle: "Nationwide express within 24-48 hours.",
  },
  {
    id: "why-3",
    icon: "fas fa-user-md",
    title: "24/7 Pharmacists",
    subtitle: "Licensed experts ready to support anytime.",
  },
  {
    id: "why-4",
    icon: "fas fa-lock",
    title: "Secure Payments",
    subtitle: "Protected checkout with multi-layer security.",
  },
];

const reviews = [
  {
    id: "rev-1",
    name: "Minh Nguyen",
    comment: "Quick delivery and packaging was spotless!",
    avatar: "https://ui-avatars.com/api/?name=Minh+Nguyen&background=0D6EFD&color=fff",
  },
  {
    id: "rev-2",
    name: "Lan Pham",
    comment: "Love the verified products and easy ordering.",
    avatar: "https://ui-avatars.com/api/?name=Lan+Pham&background=2ABFF4&color=0b1224",
  },
  {
    id: "rev-3",
    name: "Huy Tran",
    comment: "Pharmacist chat was super helpful late at night.",
    avatar: "https://ui-avatars.com/api/?name=Huy+Tran&background=4ADEDE&color=0b1224",
  },
];

const Homepage = () => {
  const navigate = useNavigate();
  const [categoryCounts, setCategoryCounts] = useState({});
  const [featuredProducts, setFeaturedProducts] = useState([]);

  useEffect(() => {
    let mounted = true;

    const fetchStats = async () => {
      try {
        const res = await categoriesAPI.getStats();
        if (mounted && res?.data) {
          const counts = res.data.reduce((acc, item) => {
            acc[item.key] = item.count || 0;
            return acc;
          }, {});
          setCategoryCounts(counts);
        }
      } catch (error) {
        console.error("Failed to fetch category stats:", error);
        if (mounted) setCategoryCounts({});
      }
    };

    fetchStats();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const fetchFeatured = async () => {
      try {
        const res = await productsAPI.getFeatured(8);
        if (mounted && res?.data) {
          setFeaturedProducts(res.data);
        }
      } catch (error) {
        console.error("Failed to fetch featured products:", error);
        if (mounted) setFeaturedProducts([]);
      }
    };
    fetchFeatured();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="homepage">
      <TopBanner />
      <Navbar />
      <HeroSection />

      <section className="categories-section section-shell" id="categories">
        <div className="section-header text-center">
          <p className="section-eyebrow">Find what you need</p>
          <h2 className="fw-bold">Shop by Category</h2>
          <p className="section-subtitle">
            Explore trusted health essentials curated for your daily wellness.
          </p>
        </div>

        <div className="category-grid">
          {categories.map((category) => (
            <div key={category.id} className="category-card" role="button" onClick={() => navigate(`/products?category=${category.slug}`)}>
              <div className="category-icon">
                <i className={category.icon}></i>
              </div>
              <div className="category-body">
                <h6 className="category-title">{category.name}</h6>
                <p className="category-count text-muted">
                  {(categoryCounts[category.key] ?? 0)} products
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="why-section section-shell" id="why-choose-us">
        <div className="section-header text-center">
          <p className="section-eyebrow">Why choose us</p>
          <h2 className="fw-bold">Your trusted digital pharmacy</h2>
          <p className="section-subtitle">
            Modern care experience with authentic products and pharmacist-first support.
          </p>
        </div>

        <div className="why-grid">
          {whyChoose.map((item) => (
            <div key={item.id} className="why-card">
              <div className="why-icon">
                <i className={item.icon}></i>
              </div>
              <div>
                <h5 className="why-title">{item.title}</h5>
                <p className="why-subtitle">{item.subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="weekly-deals section-shell" id="weekly-deals">
        <div className="weekly-banner">
          <div className="weekly-content">
            <div className="weekly-icon">🔥</div>
            <div>
              <p className="section-eyebrow mb-2">Weekly deals</p>
              <h3 className="mb-2">Save more on essentials</h3>
              <p className="section-subtitle mb-0">
                Curated picks updated every week with pharmacy-grade quality.
              </p>
            </div>
          </div>
          <button className="btn btn-light weekly-cta" onClick={() => navigate("/products")}>
            Browse Deals
          </button>
        </div>
      </section>

      <section className="reviews-section section-shell" id="customer-reviews">
        <div className="section-header text-center">
          <p className="section-eyebrow">Customer Reviews</p>
          <h2 className="fw-bold">What our patients say</h2>
          <p className="section-subtitle">
            Real feedback from people who trust us with their everyday health.
          </p>
        </div>

        <div className="reviews-grid">
          {reviews.map((review) => (
            <div key={review.id} className="review-card">
              <div className="review-header">
                <img src={review.avatar} alt={review.name} className="review-avatar" />
                <div>
                  <h6 className="mb-1">{review.name}</h6>
                  <div className="review-stars" aria-label="Rated 5 out of 5">
                    <span>★★★★★</span>
                  </div>
                </div>
              </div>
              <p className="review-comment">{review.comment}</p>
            </div>
          ))}
        </div>
      </section>


<section className="featured-section section-shell" id="featured-medicines">
  <div className="section-header text-center">
    <p className="section-eyebrow">Highlighted for you</p>
    <h2 className="fw-bold">Featured Medicines</h2>
    <p className="section-subtitle">
      Discover new arrivals and best sellers tailored to your needs.
    </p>
  </div>

  {featuredProducts.length === 0 ? (
    <div className="featured-card text-center">
      <div className="empty-icon mb-3">??</div>
      <h5 className="mb-2">No featured medicines yet</h5>
      <p className="text-muted mb-4">
        We are curating top picks for you. Browse our catalog to find what you need in the meantime.
      </p>
      <button className="btn btn-primary px-4" onClick={() => navigate("/products")}>
        View All Medicines
      </button>
    </div>
  ) : (
    <div className="featured-grid">
      {featuredProducts.map((product) => (
        <div key={product._id} className="featured-card product-card text-center">
          <div className="featured-image-wrap">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} />
            ) : (
              <div className="empty-icon">??</div>
            )}
            <span className="badge bg-warning text-dark best-seller-badge">
              Best seller ? {product.totalSold}
            </span>
          </div>
          <h5 className="mt-3 mb-2">{product.name}</h5>
          <p className="text-primary fw-bold mb-3">
            {product.price ? `$${Number(product.price).toFixed(2)}` : '?'}
          </p>
          <button
            className="btn btn-outline-primary"
            onClick={() => navigate(`/products/${product._id}`)}
            type="button"
          >
            View details
          </button>
        </div>
      ))}
    </div>
  )}
</section>

      <Footer />
    </div>
  );
};

export default Homepage;
