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
  { id: "cat-1", name: "Gi?m ?au", key: "pain_relief", slug: "pain-relief", icon: "fas fa-pills" },
  { id: "cat-2", name: "Vitamin", key: "vitamins", slug: "vitamins", icon: "fas fa-leaf" },
  { id: "cat-3", name: "Ch?m s?c da", key: "skin_care", slug: "skin-care", icon: "fas fa-hand-sparkles" },
  { id: "cat-4", name: "S?c kh?e tim m?ch", key: "heart_health", slug: "heart-health", icon: "fas fa-heartbeat" },
  { id: "cat-5", name: "S?c kh?e t?m th?n", key: "mental_health", slug: "mental-health", icon: "fas fa-brain" },
  { id: "cat-6", name: "H? h?p", key: "respiratory", slug: "respiratory", icon: "fas fa-lungs" },
];

const whyChoose = [
  {
    id: "why-1",
    icon: "fas fa-shield-alt",
    title: "Thu?c Ch?nh H?ng",
    subtitle: "Ngu?n g?c t? c?c nh? s?n xu?t ???c x?c minh r? r?ng.",
  },
  {
    id: "why-2",
    icon: "fas fa-shipping-fast",
    title: "Giao H?ng Nhanh",
    subtitle: "Giao h?ng to?n qu?c trong 24-48 gi?.",
  },
  {
    id: "why-3",
    icon: "fas fa-user-md",
    title: "D??c S? 24/7",
    subtitle: "Chuy?n gia s?n s?ng h? tr? m?i l?c.",
  },
  {
    id: "why-4",
    icon: "fas fa-lock",
    title: "Thanh To?n An To?n",
    subtitle: "B?o v? nhi?u l?p, an t?m thanh to?n.",
  },
];

const reviews = [
  {
    id: "rev-1",
    name: "Minh Nguy?n",
    comment: "Giao h?ng nhanh v? ??ng g?i r?t c?n th?n!",
    avatar: "https://ui-avatars.com/api/?name=Minh+Nguyen&background=0D6EFD&color=fff",
  },
  {
    id: "rev-2",
    name: "Lan Ph?m",
    comment: "Y?u th?ch s?n ph?m ?? ???c x?c minh v? ??t h?ng d? d?ng.",
    avatar: "https://ui-avatars.com/api/?name=Lan+Pham&background=2ABFF4&color=0b1224",
  },
  {
    id: "rev-3",
    name: "Huy Tr?n",
    comment: "Chat v?i d??c s? r?t h?u ?ch, k? c? l?c ??m khuya.",
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
          <p className="section-eyebrow">T?m nh?ng g? b?n c?n</p>
          <h2 className="fw-bold">Mua s?m theo danh m?c</h2>
          <p className="section-subtitle">
            Kh?m ph? c?c s?n ph?m s?c kh?e ??ng tin c?y ???c tuy?n ch?n cho b?n m?i ng?y.
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
                  {(categoryCounts[category.key] ?? 0)} s?n ph?m
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

            <section className="why-section section-shell" id="why-choose-us">
        <div className="section-header text-center">
          <p className="section-eyebrow">T?i sao ch?n ch?ng t?i</p>
          <h2 className="fw-bold">Nh? thu?c ??ng tin c?y c?a b?n</h2>
          <p className="section-subtitle">
            Tr?i nghi?m ch?m s?c hi?n ??i v?i s?n ph?m ch?nh h?ng v? h? tr? ?u ti?n t? d??c s?.
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
            <div className="weekly-icon">%</div>
            <div>
              <p className="section-eyebrow mb-2">?u ??i h?ng tu?n</p>
              <h3 className="mb-2">Ti?t ki?m nhi?u h?n cho s?n ph?m thi?t y?u</h3>
              <p className="section-subtitle mb-0">
                L?a ch?n ???c tuy?n ch?n c?p nh?t m?i tu?n v?i ch?t l??ng chu?n nh? thu?c.
              </p>
            </div>
          </div>
          <button className="btn btn-light weekly-cta" onClick={() => navigate("/products")}>
            Xem ?u ??i
          </button>
        </div>
      </section>

            <section className="reviews-section section-shell" id="customer-reviews">
        <div className="section-header text-center">
          <p className="section-eyebrow">??nh Gi? Kh?ch H?ng</p>
          <h2 className="fw-bold">Kh?ch h?ng n?i g? v? ch?ng t?i</h2>
          <p className="section-subtitle">
            Ph?n h?i th?c t? t? nh?ng ng??i tin t??ng ch?ng t?i v?i s?c kh?e h?ng ng?y c?a h?.
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
                    <span>?????</span>
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
    <p className="section-eyebrow">N?i b?t d?nh cho b?n</p>
    <h2 className="fw-bold">Thu?c N?i B?t</h2>
    <p className="section-subtitle">
      Kh?m ph? s?n ph?m m?i v? b?n ch?y nh?t ???c t?y ch?nh theo nhu c?u c?a b?n.
    </p>
  </div>

  {featuredProducts.length === 0 ? (
    <div className="featured-card text-center">
      <div className="empty-icon mb-3">??</div>
      <h5 className="mb-2">Ch?a c? thu?c n?i b?t</h5>
      <p className="text-muted mb-4">
        Ch?ng t?i ?ang tuy?n ch?n c?c s?n ph?m h?ng ??u cho b?n. Trong l?c ch? ??i, h?y duy?t danh m?c ?? t?m s?n ph?m ph? h?p.
      </p>
      <button className="btn btn-primary px-4" onClick={() => navigate("/products")}>Xem t?t c? thu?c</button>
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
              B?n ch?y ? {product.totalSold}
            </span>
          </div>
          <h5 className="mt-3 mb-2">{product.name}</h5>
          <p className="text-primary fw-bold mb-3">
            {product.price ? `$${Number(product.price).toFixed(2)}` : '?'}
          </p>
          <button
            className="btn btn-outline-primary"
            onClick={() => navigate(`/product/${product._id}`)}
            type="button"
          >
            Xem chi ti?t
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
