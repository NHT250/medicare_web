// Products Page Component
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { productsAPI } from '../services/api';
import { useCart } from '../contexts/CartContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import '../styles/Products.css';
import { FIXED_CATEGORIES } from '../constants/categories';

const Products = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { addToCart } = useCart();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const itemsPerPage = 8;
  
  // Filters
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || 'all',
    search: searchParams.get('search') || '',
    sortBy: 'popularity'
  });

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const sortMapping = {
        popularity: 'newest',
        'price-low': 'price_asc',
        'price-high': 'price_desc',
        rating: 'newest',
        name: 'name_asc'
      };

      const sortParam = sortMapping[filters.sortBy] || 'newest';
      const params = {
        limit: itemsPerPage,
        page: currentPage,
        ...(filters.category !== 'all' && { category: filters.category }),
        ...(filters.search && { search: filters.search }),
        sort: sortParam
      };

      const data = await productsAPI.getAll(params);
      if (data.products) {
        const normalizedProducts = filters.category !== 'all'
          ? data.products.filter((product) => product.category === filters.category)
          : data.products;
        setProducts(normalizedProducts);
        const totalFromApi =
          typeof data.total === 'number'
            ? data.total
            : typeof data.count === 'number'
            ? data.count
            : data.products.length;
        setTotalProducts(filters.category !== 'all' ? normalizedProducts.length : totalFromApi);
        if (typeof data.page === 'number' && data.page !== currentPage) {
          setCurrentPage(data.page);
        }
      }
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, itemsPerPage, currentPage]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleAddToCart = (product) => {
    addToCart(product, 1);
    alert(`${product.name} added to cart!`);
  };

  const handleCategoryChange = (category) => {
    setFilters({ ...filters, category });
    setCurrentPage(1);
  };

  const handleSortChange = (e) => {
    setFilters({ ...filters, sortBy: e.target.value });
    setCurrentPage(1);
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

  return (
    <div className="products-page">
      <Navbar />

      <div className="container my-5">
        <div className="row">
          {/* Sidebar - Filters */}
          <div className="col-lg-3 mb-4">
            <div className="filters-sidebar">
              <h5 className="mb-3">Categories</h5>
              <div className="category-list">
                <div
                  className={`category-item ${filters.category === 'all' ? 'active' : ''}`}
                  onClick={() => handleCategoryChange('all')}
                >
                  All Products
                </div>
                {FIXED_CATEGORIES.map((cat) => (
                  <div
                    key={cat.id}
                    className={`category-item ${filters.category === cat.slug ? 'active' : ''}`}
                    onClick={() => handleCategoryChange(cat.slug)}
                  >
                    <i className={cat.icon}></i> {cat.name}
                  </div>
                ))}
              </div>

              <hr className="my-4" />

              <h5 className="mb-3">Sort By</h5>
              <select
                className="form-select"
                value={filters.sortBy}
                onChange={handleSortChange}
              >
                <option value="popularity">Popularity</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Rating</option>
                <option value="name">Name</option>
              </select>
            </div>
          </div>

          {/* Products Grid */}
          <div className="col-lg-9">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h4>{totalProducts} Products Found</h4>
            </div>

            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : products.length > 0 ? (
              <div className="row g-4">
                {products.map((product) => {
                  const basePrice = Number(product.price || 0);
                  const discount = Number(product.discount || 0);
                  const finalPrice = discount ? basePrice * (1 - discount / 100) : basePrice;
                  const primaryImage = product.images?.[0] || "https://via.placeholder.com/300x300";
                  const inStock = product.stock > 0 && product.is_active !== false;

                  return (
                    <div key={product._id} className="col-lg-3 col-md-6">
                      <div className="product-card">
                        <div
                          className="product-image"
                          onClick={() => navigate(`/product/${product._id}`)}
                        >
                          <img src={primaryImage} alt={product.name} className="img-fluid" />
                          {inStock ? (
                            <div className="stock-badge in-stock">In Stock</div>
                          ) : (
                            <div className="stock-badge out-of-stock">Out of Stock</div>
                          )}
                        </div>
                        <div className="product-info">
                          <h6 className="product-name">{product.name}</h6>
                          <p className="product-description">{product.description}</p>
                          <div className="product-rating mb-2">
                            <div className="stars">{renderStars(product.rating || 0)}</div>
                            <span className="rating-text">({product.reviews || 0})</span>
                          </div>
                          <div className="price-section mb-2">
                            <span className="current-price">${finalPrice.toFixed(2)}</span>
                            {discount ? (
                              <span className="old-price">${basePrice.toFixed(2)}</span>
                            ) : null}
                          </div>
                          <div className="product-actions">
                            <button
                              className="btn btn-success w-100"
                              onClick={() =>
                                handleAddToCart({
                                  ...product,
                                  price: finalPrice,
                                  image: primaryImage,
                                })
                              }
                              disabled={!inStock}
                            >
                              <i className="fas fa-shopping-cart me-1"></i>
                              {inStock ? 'Add to Cart' : 'Unavailable'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-5">
                <i className="fas fa-search fa-3x text-muted mb-3"></i>
                <h4 className="text-muted">No products found</h4>
                <p className="text-muted">Try adjusting your filters or search terms</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Products;





