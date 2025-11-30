// Product Detail Page Component
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productsAPI } from '../services/api';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import '../styles/ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isAuthenticated, role, user } = useAuth();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadReviews = async (productId = id) => {
    try {
      setReviewsLoading(true);
      setReviewError('');
      const res = await productsAPI.getReviews(productId);
      setReviews(res.reviews || []);
      setProduct((prev) => {
        if (!prev) return prev;
        const averageRating = res.averageRating ?? prev.averageRating ?? prev.rating ?? 0;
        const reviewCount = res.numReviews ?? prev.numReviews ?? prev.reviews ?? 0;
        return {
          ...prev,
          averageRating,
          rating: averageRating,
          numReviews: reviewCount,
          reviews: reviewCount,
          reviewsList: res.reviews || prev.reviewsList
        };
      });
    } catch (error) {
      console.error('Error loading reviews:', error);
      setReviewError('Không thể tải đánh giá. Vui lòng thử lại sau.');
    } finally {
      setReviewsLoading(false);
    }
  };

  const loadProduct = async () => {
    try {
      setLoading(true);
      setReviews([]);
      setReviewError('');
      const data = await productsAPI.getById(id);
      setProduct(data);
      if (Array.isArray(data?.reviewsList)) {
        setReviews(data.reviewsList);
      }
      setSelectedImageIndex(0);
      const productIdToLoad = data?._id || data?.id || id;
      await loadReviews(productIdToLoad);
    } catch (error) {
      console.error('Error loading product:', error);
      alert('Không thể tải chi tiết sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng');
      navigate('/login');
      return;
    }
    
    const basePrice = Number(product.price || 0);
    const discount = Number(product.discount || 0);
    const finalPrice = discount ? basePrice * (1 - discount / 100) : basePrice;
    const primaryImage = product.images?.[0] || product.image;
    addToCart({ ...product, price: finalPrice, image: primaryImage }, quantity);
      alert(`${quantity} x ${product.name} đã được thêm vào giỏ!`);
  };

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập để tiếp tục');
      navigate('/login');
      return;
    }
    
    const basePrice = Number(product.price || 0);
    const discount = Number(product.discount || 0);
    const finalPrice = discount ? basePrice * (1 - discount / 100) : basePrice;
    const primaryImage = product.images?.[0] || product.image;
    addToCart({ ...product, price: finalPrice, image: primaryImage }, quantity);
    navigate('/cart');
  };

  const handleIncreaseQuantity = () => {
    setQuantity(prev => prev + 1);
  };

  const handleDecreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(prev => prev - 1);
    }
  };

  const handleReviewChange = (field, value) => {
    setReviewForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmitReview = async (event) => {
    event.preventDefault();

    if (!isAuthenticated) {
      setReviewError('Bạn cần đăng nhập để đánh giá sản phẩm.');
      return;
    }

    try {
      setSubmittingReview(true);
      setReviewError('');

      await productsAPI.createReview(id, {
        rating: Number(reviewForm.rating),
        comment: reviewForm.comment.trim()
      });

      setReviewForm({ rating: 5, comment: '' });
      await loadReviews(id);
    } catch (error) {
      console.error('Error submitting review:', error);
      const message =
        error?.response?.data?.error ||
        (error?.response?.status === 401
          ? 'Vui lòng đăng nhập để gửi đánh giá.'
          : 'Không thể gửi đánh giá ngay bây giờ.');
      setReviewError(message);
      if (error?.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<i key={`full-${i}`} className="fas fa-star text-warning"></i>);
    }
    
    if (hasHalfStar) {
      stars.push(<i key="half" className="fas fa-star-half-alt text-warning"></i>);
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<i key={`empty-${i}`} className="far fa-star text-warning"></i>);
    }
    
    return stars;
  };

  if (loading) {
    return (
      <div className="product-detail-page">
        <Navbar />
        <div className="container my-5 text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-detail-page">
        <Navbar />
        <div className="container my-5 text-center">
          <i className="fas fa-exclamation-circle fa-3x text-danger mb-3"></i>
          <h4>Không tìm thấy sản phẩm</h4>
          <button className="btn btn-primary mt-3" onClick={() => navigate('/products')}>
            Quay lại trang sản phẩm
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const basePrice = Number(product.price || 0);
  const discount = Number(product.discount || 0);
  const finalPrice = discount ? basePrice * (1 - discount / 100) : basePrice;
  const averageRating = Number(product.averageRating ?? product.rating ?? 0);
  const reviewCount = Number(product.numReviews ?? product.reviews ?? 0);
  const inStock = (product.stock ?? 0) > 0 && product.is_active !== false;
  const galleryImages = product.images?.length ? product.images : product.image ? [product.image] : [];
  const mainImage = galleryImages[selectedImageIndex] || 'https://via.placeholder.com/600x600?text=No+Image';

  return (
    <div className="product-detail-page">
      <Navbar />

      <div className="container my-5">
        {/* Breadcrumb */}
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb">
            <li className="breadcrumb-item">
              <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>Trang chủ</a>
            </li>
            <li className="breadcrumb-item">
              <a href="/products" onClick={(e) => { e.preventDefault(); navigate('/products'); }}>Sản phẩm</a>
            </li>
            <li className="breadcrumb-item active" aria-current="page">{product.name}</li>
          </ol>
        </nav>

        {/* Product Detail Section */}
        <div className="row">
          {/* Product Image */}
          <div className="col-lg-5 mb-4">
            <div className="product-image-container mb-3">
              <img
                src={mainImage}
                alt={product.name}
                className="img-fluid rounded"
              />
              {(product.stock ?? 0) > 0 ? (
                <div className="stock-badge in-stock">
                  <i className="fas fa-check-circle me-1"></i> Còn hàng
                </div>
              ) : (
                <div className="stock-badge out-of-stock">
                  <i className="fas fa-times-circle me-1"></i> Hết hàng
                </div>
              )}
            </div>
            {galleryImages.length > 1 && (
              <div className="d-flex flex-wrap gap-2">
                {galleryImages.map((img, index) => (
                  <button
                    key={img}
                    type="button"
                    className={`btn p-0 border ${selectedImageIndex === index ? 'border-primary' : ''}`}
                    onClick={() => setSelectedImageIndex(index)}
                  >
                    <img
                      src={img}
                      alt={`${product.name} ${index + 1}`}
                      style={{ width: 80, height: 80, objectFit: 'cover' }}
                      className="rounded"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="col-lg-7">
            <div className="product-info-container">
              <div className="d-flex justify-content-between align-items-start">
                <h2 className="product-title">{product.name}</h2>
                {role === 'admin' && (
                  <button
                    className="btn btn-outline-primary"
                    onClick={() => navigate(`/admin/products/${product._id}/edit`)}
                  >
                    <i className="fas fa-edit me-2"></i> Chỉnh sửa sản phẩm
                  </button>
                )}
              </div>
              
              {/* Rating */}
              <div className="rating-section mb-3">
                <div className="stars">
                  {renderStars(averageRating)}
                </div>
                <span className="rating-text ms-2">
                  ({reviewCount} đánh giá)
                </span>
              </div>

              {/* Price */}
              <div className="price-section mb-4">
                <span className="current-price">${finalPrice.toFixed(2)}</span>
                {discount ? (
                  <>
                    <span className="old-price ms-2">${basePrice.toFixed(2)}</span>
                    <span className="discount-badge ms-2">{discount}% GIẢM</span>
                  </>
                ) : null}
              </div>

              {/* Short Description */}
              <p className="product-description mb-4">{product.description}</p>

              {/* Category */}
              <div className="mb-3">
                <strong>Danh mục:</strong> <span className="text-muted">{product.category}</span>
              </div>

              {/* Quantity Selector */}
              <div className="quantity-section mb-4">
                <label className="form-label">Số lượng:</label>
                <div className="quantity-control">
                  <button
                    className="btn btn-outline-secondary"
                    onClick={handleDecreaseQuantity}
                  >
                    <i className="fas fa-minus"></i>
                  </button>
                  <input
                    type="number"
                    className="form-control"
                    value={quantity}
                    readOnly
                  />
                  <button
                    className="btn btn-outline-secondary"
                    onClick={handleIncreaseQuantity}
                  >
                    <i className="fas fa-plus"></i>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="action-buttons">
                <button
                  className="btn btn-success btn-lg"
                  onClick={handleAddToCart}
                  disabled={!inStock}
                >
                  <i className="fas fa-shopping-cart me-2"></i>
                  Thêm vào giỏ
                </button>
                <button
                  className="btn btn-primary btn-lg ms-2"
                  onClick={handleBuyNow}
                  disabled={!inStock}
                >
                  <i className="fas fa-bolt me-2"></i>
                  Mua ngay
                </button>
              </div>

              {/* Features */}
              <div className="features-section mt-4">
                <div className="row">
                  <div className="col-6 mb-3">
                    <div className="feature-item">
                      <i className="fas fa-truck text-primary me-2"></i>
                      <span>Giao hàng nhanh</span>
                    </div>
                  </div>
                  <div className="col-6 mb-3">
                    <div className="feature-item">
                      <i className="fas fa-shield-alt text-success me-2"></i>
                      <span>Thanh toán an toàn</span>
                    </div>
                  </div>
                  <div className="col-6 mb-3">
                    <div className="feature-item">
                      <i className="fas fa-undo text-info me-2"></i>
                      <span>Đổi trả dễ dàng</span>
                    </div>
                  </div>
                  <div className="col-6 mb-3">
                    <div className="feature-item">
                      <i className="fas fa-headset text-warning me-2"></i>
                      <span>Hỗ trợ 24/7</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <div className="row mt-5">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <ul className="nav nav-tabs card-header-tabs">
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === 'description' ? 'active' : ''}`}
                      onClick={() => setActiveTab('description')}
                    >
                      Mô tả
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === 'specifications' ? 'active' : ''}`}
                      onClick={() => setActiveTab('specifications')}
                    >
                      Thông số
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === 'reviews' ? 'active' : ''}`}
                      onClick={() => setActiveTab('reviews')}
                    >
                      Đánh giá ({reviewCount})
                    </button>
                  </li>
                </ul>
              </div>
              <div className="card-body">
                {activeTab === 'description' && (
                  <div className="tab-content">
                    <h5>Mô tả sản phẩm</h5>
                    <p>{product.description}</p>
                    <p>
                      Sản phẩm dược chất lượng cao được thiết kế để hỗ trợ hiệu quả cho nhu cầu sức khỏe của bạn.
                      Được sản xuất theo quy trình kiểm soát chất lượng nghiêm ngặt, đảm bảo an toàn và hiệu quả.
                    </p>
                    <h6 className="mt-3">Lợi ích chính:</h6>
                    <ul>
                      <li>Công thức tác dụng nhanh</li>
                      <li>Được kiểm nghiệm lâm sàng</li>
                      <li>An toàn khi dùng hằng ngày</li>
                      <li>Không gây tác dụng phụ nguy hiểm</li>
                    </ul>
                  </div>
                )}
                
                {activeTab === 'specifications' && (
                  <div className="tab-content">
                    <h5>Thông số sản phẩm</h5>
                    <table className="table">
                      <tbody>
                        <tr>
                          <td><strong>Tên sản phẩm:</strong></td>
                          <td>{product.name}</td>
                        </tr>
                        <tr>
                          <td><strong>Danh mục:</strong></td>
                          <td>{product.category}</td>
                        </tr>
                        <tr>
                          <td><strong>Giá:</strong></td>
                          <td>${finalPrice.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td><strong>Tình trạng:</strong></td>
                          <td>{inStock ? 'Còn hàng' : 'Hết hàng'}</td>
                        </tr>
                        <tr>
                          <td><strong>Đánh giá:</strong></td>
                          <td>{averageRating.toFixed(1)} / 5.0</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
                
                {activeTab === 'reviews' && (
                  <div className="tab-content">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="mb-0">Đánh giá từ khách hàng</h5>
                      <span className="text-muted small">
                        Trung bình {averageRating.toFixed(1)} / 5 ({reviewCount})
                      </span>
                    </div>

                    {reviewError && (
                      <div className="alert alert-danger" role="alert">
                        {reviewError}
                      </div>
                    )}

                    {reviewsLoading ? (
                      <div className="text-center py-4">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Đang tải đánh giá...</span>
                        </div>
                      </div>
                    ) : reviews.length === 0 ? (
                      <div className="alert alert-light border">
                        Chưa có đánh giá nào. Hãy là người đầu tiên đánh giá sản phẩm này.
                      </div>
                    ) : (
                      <div className="list-group mb-4">
                        {reviews.map((review) => (
                          <div key={`${review.userId}-${review.createdAt}`} className="list-group-item">
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <div className="fw-semibold">{review.userName || 'Người dùng'}</div>
                                <div className="d-flex align-items-center gap-2">
                                  {renderStars(review.rating || 0)}
                                  <small className="text-muted">{review.rating}/5</small>
                                </div>
                              </div>
                              <small className="text-muted">
                                {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''}
                              </small>
                            </div>
                            {review.comment && <p className="mb-0 mt-2">{review.comment}</p>}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="border-top pt-4">
                      <h6 className="mb-3">Viết đánh giá của bạn</h6>
                      {!isAuthenticated ? (
                        <div className="alert alert-warning mb-0" role="alert">
                          Bạn cần đăng nhập để đánh giá sản phẩm.
                        </div>
                      ) : (
                        <form onSubmit={handleSubmitReview} className="row g-3">
                          <div className="col-md-4">
                            <label className="form-label">Đánh giá</label>
                            <select
                              className="form-select"
                              value={reviewForm.rating}
                              onChange={(e) => handleReviewChange('rating', Number(e.target.value))}
                              disabled={submittingReview}
                            >
                              {[5, 4, 3, 2, 1].map((value) => (
                                <option key={value} value={value}>{value} sao</option>
                              ))}
                            </select>
                          </div>
                          <div className="col-12">
                            <label className="form-label">Nhận xét</label>
                            <textarea
                              className="form-control"
                              rows="3"
                              value={reviewForm.comment}
                              onChange={(e) => handleReviewChange('comment', e.target.value)}
                              placeholder="Chia sẻ trải nghiệm của bạn..."
                              disabled={submittingReview}
                              required
                            ></textarea>
                          </div>
                          <div className="col-12 d-flex justify-content-between align-items-center">
                            <small className="text-muted">
                              Đang đánh giá với tên: {user?.name || user?.email || 'Tài khoản của bạn'}
                            </small>
                            <button
                              className="btn btn-primary"
                              type="submit"
                              disabled={submittingReview}
                            >
                              {submittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ProductDetail;
