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
  const { isAuthenticated, role } = useAuth();
  
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const data = await productsAPI.getById(id);
      setProduct(data);
      setSelectedImageIndex(0);
    } catch (error) {
      console.error('Error loading product:', error);
      alert('Failed to load product details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      alert('Please login to add items to cart');
      navigate('/login');
      return;
    }
    
    const basePrice = Number(product.price || 0);
    const discount = Number(product.discount || 0);
    const finalPrice = discount ? basePrice * (1 - discount / 100) : basePrice;
    const primaryImage = product.images?.[0] || product.image;
    addToCart({ ...product, price: finalPrice, image: primaryImage }, quantity);
    alert(`${quantity} x ${product.name} added to cart!`);
  };

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      alert('Please login to proceed');
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
            <span className="visually-hidden">Loading...</span>
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
          <h4>Product not found</h4>
          <button className="btn btn-primary mt-3" onClick={() => navigate('/products')}>
            Back to Products
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  const basePrice = Number(product.price || 0);
  const discount = Number(product.discount || 0);
  const finalPrice = discount ? basePrice * (1 - discount / 100) : basePrice;
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
              <a href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>Home</a>
            </li>
            <li className="breadcrumb-item">
              <a href="/products" onClick={(e) => { e.preventDefault(); navigate('/products'); }}>Products</a>
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
                  <i className="fas fa-check-circle me-1"></i> In Stock
                </div>
              ) : (
                <div className="stock-badge out-of-stock">
                  <i className="fas fa-times-circle me-1"></i> Out of Stock
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
                    <i className="fas fa-edit me-2"></i> Edit Product
                  </button>
                )}
              </div>
              
              {/* Rating */}
              <div className="rating-section mb-3">
                <div className="stars">
                  {renderStars(product.rating || 4.5)}
                </div>
                <span className="rating-text ms-2">
                  ({product.reviews || 0} reviews)
                </span>
              </div>

              {/* Price */}
              <div className="price-section mb-4">
                <span className="current-price">${finalPrice.toFixed(2)}</span>
                {discount ? (
                  <>
                    <span className="old-price ms-2">${basePrice.toFixed(2)}</span>
                    <span className="discount-badge ms-2">{discount}% OFF</span>
                  </>
                ) : null}
              </div>

              {/* Short Description */}
              <p className="product-description mb-4">{product.description}</p>

              {/* Category */}
              <div className="mb-3">
                <strong>Category:</strong> <span className="text-muted">{product.category}</span>
              </div>

              {/* Quantity Selector */}
              <div className="quantity-section mb-4">
                <label className="form-label">Quantity:</label>
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
                  Add to Cart
                </button>
                <button
                  className="btn btn-primary btn-lg ms-2"
                  onClick={handleBuyNow}
                  disabled={!inStock}
                >
                  <i className="fas fa-bolt me-2"></i>
                  Buy Now
                </button>
              </div>

              {/* Features */}
              <div className="features-section mt-4">
                <div className="row">
                  <div className="col-6 mb-3">
                    <div className="feature-item">
                      <i className="fas fa-truck text-primary me-2"></i>
                      <span>Fast Delivery</span>
                    </div>
                  </div>
                  <div className="col-6 mb-3">
                    <div className="feature-item">
                      <i className="fas fa-shield-alt text-success me-2"></i>
                      <span>Secure Payment</span>
                    </div>
                  </div>
                  <div className="col-6 mb-3">
                    <div className="feature-item">
                      <i className="fas fa-undo text-info me-2"></i>
                      <span>Easy Returns</span>
                    </div>
                  </div>
                  <div className="col-6 mb-3">
                    <div className="feature-item">
                      <i className="fas fa-headset text-warning me-2"></i>
                      <span>24/7 Support</span>
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
                      Description
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === 'specifications' ? 'active' : ''}`}
                      onClick={() => setActiveTab('specifications')}
                    >
                      Specifications
                    </button>
                  </li>
                  <li className="nav-item">
                    <button
                      className={`nav-link ${activeTab === 'reviews' ? 'active' : ''}`}
                      onClick={() => setActiveTab('reviews')}
                    >
                      Reviews ({product.reviews || 0})
                    </button>
                  </li>
                </ul>
              </div>
              <div className="card-body">
                {activeTab === 'description' && (
                  <div className="tab-content">
                    <h5>Product Description</h5>
                    <p>{product.description}</p>
                    <p>
                      This high-quality pharmaceutical product is designed to provide effective relief
                      and support for your health needs. Manufactured under strict quality control
                      standards, ensuring safety and efficacy.
                    </p>
                    <h6 className="mt-3">Key Benefits:</h6>
                    <ul>
                      <li>Fast-acting formula</li>
                      <li>Clinically tested</li>
                      <li>Safe for daily use</li>
                      <li>No harmful side effects</li>
                    </ul>
                  </div>
                )}
                
                {activeTab === 'specifications' && (
                  <div className="tab-content">
                    <h5>Product Specifications</h5>
                    <table className="table">
                      <tbody>
                        <tr>
                          <td><strong>Product Name:</strong></td>
                          <td>{product.name}</td>
                        </tr>
                        <tr>
                          <td><strong>Category:</strong></td>
                          <td>{product.category}</td>
                        </tr>
                        <tr>
                          <td><strong>Price:</strong></td>
                          <td>${finalPrice.toFixed(2)}</td>
                        </tr>
                        <tr>
                          <td><strong>Stock Status:</strong></td>
                          <td>{inStock ? 'In Stock' : 'Out of Stock'}</td>
                        </tr>
                        <tr>
                          <td><strong>Rating:</strong></td>
                          <td>{product.rating || 4.5} / 5.0</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
                
                {activeTab === 'reviews' && (
                  <div className="tab-content">
                    <h5>Customer Reviews</h5>
                    <div className="alert alert-info">
                      <i className="fas fa-info-circle me-2"></i>
                      Reviews feature coming soon! Be the first to review this product.
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

