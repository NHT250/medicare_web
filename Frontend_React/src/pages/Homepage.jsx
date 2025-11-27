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
    name: "Giảm Đau",
    key: "pain_relief",
    slug: "pain-relief",
    icon: "fas fa-pills",
  },
  {
    id: "cat-2",
    name: "Vitamin",
    key: "vitamins",
    slug: "vitamins",
    icon: "fas fa-leaf",
  },
  {
    id: "cat-3",
    name: "Chăm Sóc Da",
    key: "skin_care",
    slug: "skin-care",
    icon: "fas fa-hand-sparkles",
  },
  {
    id: "cat-4",
    name: "Sức Khỏe Tim Mạch",
    key: "heart_health",
    slug: "heart-health",
    icon: "fas fa-heartbeat",
  },
  {
    id: "cat-5",
    name: "Sức Khỏe Tâm Thần",
    key: "mental_health",
    slug: "mental-health",
    icon: "fas fa-brain",
  },
  {
    id: "cat-6",
    name: "Hô Hấp",
    key: "respiratory",
    slug: "respiratory",
    icon: "fas fa-lungs",
  },
];

const whyChoose = [
  {
    id: "why-1",
    icon: "fas fa-shield-alt",
    title: "Thuốc Chính Hãng",
    subtitle: "Nguồn gốc trực tiếp từ các nhà sản xuất đã được xác minh.",
  },
  {
    id: "why-2",
    icon: "fas fa-shipping-fast",
    title: "Giao Hàng Nhanh",
    subtitle: "Giao hàng toàn quốc trong vòng 24-48 giờ.",
  },
  {
    id: "why-3",
    icon: "fas fa-user-md",
    title: "Dược Sĩ 24/7",
    subtitle: "Chuyên gia có giấy phép sẵn sàng hỗ trợ mọi lúc.",
  },
  {
    id: "why-4",
    icon: "fas fa-lock",
    title: "Thanh Toán An Toàn",
    subtitle: "Thanh toán được bảo vệ với nhiều lớp bảo mật.",
  },
];

const reviews = [
  {
    id: "rev-1",
    name: "Minh Nguyen",
    comment: "Giao hàng nhanh và đóng gói rất cẩn thận!",
    avatar: "https://ui-avatars.com/api/?name=Minh+Nguyen&background=0D6EFD&color=fff",
  },
  {
    id: "rev-2",
    name: "Lan Pham",
    comment: "Yêu thích sản phẩm đã được xác minh và đặt hàng dễ dàng.",
    avatar: "https://ui-avatars.com/api/?name=Lan+Pham&background=2ABFF4&color=0b1224",
  },
  {
    id: "rev-3",
    name: "Huy Tran",
    comment: "Chat với dược sĩ rất hữu ích vào đêm khuya.",
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
          <p className="section-eyebrow">Tìm những gì bạn cần</p>
          <h2 className="fw-bold">Mua Sắm Theo Danh Mục</h2>
          <p className="section-subtitle">
            Khám phá các sản phẩm sức khỏe đáng tin cậy được tuyển chọn cho sức khỏe hàng ngày của bạn.
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
                  {(categoryCounts[category.key] ?? 0)} sản phẩm
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="why-section section-shell" id="why-choose-us">
        <div className="section-header text-center">
          <p className="section-eyebrow">Tại sao chọn chúng tôi</p>
          <h2 className="fw-bold">Nhà thuốc số đáng tin cậy của bạn</h2>
          <p className="section-subtitle">
            Trải nghiệm chăm sóc hiện đại với sản phẩm chính hãng và hỗ trợ ưu tiên từ dược sĩ.
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
              <p className="section-eyebrow mb-2">Ưu đãi hàng tuần</p>
              <h3 className="mb-2">Tiết kiệm nhiều hơn cho các sản phẩm thiết yếu</h3>
              <p className="section-subtitle mb-0">
                Lựa chọn được tuyển chọn cập nhật mỗi tuần với chất lượng cấp nhà thuốc.
              </p>
            </div>
          </div>
          <button className="btn btn-light weekly-cta" onClick={() => navigate("/products")}>
            Xem Ưu Đãi
          </button>
        </div>
      </section>

      <section className="reviews-section section-shell" id="customer-reviews">
        <div className="section-header text-center">
          <p className="section-eyebrow">Đánh Giá Khách Hàng</p>
          <h2 className="fw-bold">Khách hàng nói gì về chúng tôi</h2>
          <p className="section-subtitle">
            Phản hồi thực tế từ những người tin tưởng chúng tôi với sức khỏe hàng ngày của họ.
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
    <p className="section-eyebrow">Nổi bật dành cho bạn</p>
    <h2 className="fw-bold">Thuốc Nổi Bật</h2>
    <p className="section-subtitle">
      Khám phá sản phẩm mới và bán chạy nhất được tùy chỉnh theo nhu cầu của bạn.
    </p>
  </div>

  {featuredProducts.length === 0 ? (
    <div className="featured-card text-center">
      <div className="empty-icon mb-3">??</div>
      <h5 className="mb-2">Chưa có thuốc nổi bật</h5>
      <p className="text-muted mb-4">
        Chúng tôi đang tuyển chọn các sản phẩm hàng đầu cho bạn. Trong lúc chờ đợi, hãy duyệt danh mục của chúng tôi để tìm những gì bạn cần.
      </p>
      <button className="btn btn-primary px-4" onClick={() => navigate("/products")}>
        Xem Tất Cả Thuốc
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
              Bán chạy ? {product.totalSold}
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
            Xem chi tiết
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
