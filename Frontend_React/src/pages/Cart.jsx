// Cart Page Component
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import '../styles/Cart.css';

const Cart = () => {
  const navigate = useNavigate();
  const { cartItems, cartTotal, updateQuantity, removeFromCart } = useCart();

  const shippingFee = 5.00;
  const tax = cartTotal * 0.08; // 8% tax
  const total = cartTotal + shippingFee + tax;

  const handleIncreaseQuantity = (item) => {
    updateQuantity(item.id, item.quantity + 1);
  };

  const handleDecreaseQuantity = (item) => {
    if (item.quantity > 1) {
      updateQuantity(item.id, item.quantity - 1);
    }
  };

  const handleRemoveItem = (item) => {
    if (window.confirm(`Xóa ${item.name} khỏi giỏ hàng?`)) {
      removeFromCart(item.id);
    }
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  return (
    <div className="cart-page">
      <Navbar />

      <div className="container my-5">
        <h2 className="mb-4">Giỏ Hàng</h2>

        {cartItems.length === 0 ? (
          <div className="empty-cart text-center py-5">
            <i className="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
            <h4 className="text-muted">Giỏ hàng của bạn đang trống</h4>
            <p className="text-muted">Thêm một số sản phẩm vào giỏ hàng</p>
            <button className="btn btn-primary mt-3" onClick={() => navigate('/products')}>
              Tiếp Tục Mua Sắm
            </button>
          </div>
        ) : (
          <div className="row">
            {/* Cart Items */}
            <div className="col-lg-8 mb-4">
              <div className="card">
                <div className="card-body">
                  {cartItems.map((item) => (
                    <div key={item.id} className="cart-item">
                      <div className="row align-items-center">
                        <div className="col-md-2">
                          <img
                            src={
                              item.image ||
                              item.images?.[0] ||
                              'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="%23e5e7eb"/><text x="50%" y="50%" fill="%23737484" font-size="14" font-family="Arial" text-anchor="middle" alignment-baseline="middle">No Image</text></svg>'
                            }
                            alt={item.name}
                            className="img-fluid rounded"
                          />
                        </div>
                        <div className="col-md-4">
                          <h6 className="mb-0">{item.name}</h6>
                          <small className="text-muted">{item.description}</small>
                        </div>
                        <div className="col-md-2">
                          <p className="mb-0 fw-bold">${item.price.toFixed(2)}</p>
                        </div>
                        <div className="col-md-3">
                          <div className="quantity-control d-flex align-items-center">
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => handleDecreaseQuantity(item)}
                            >
                              <i className="fas fa-minus"></i>
                            </button>
                            <span className="mx-3">{item.quantity}</span>
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={() => handleIncreaseQuantity(item)}
                            >
                              <i className="fas fa-plus"></i>
                            </button>
                          </div>
                        </div>
                        <div className="col-md-1">
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleRemoveItem(item)}
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                      <hr />
                    </div>
                  ))}

                  <div className="d-flex justify-content-between mt-3">
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => navigate('/products')}
                    >
                      <i className="fas fa-arrow-left me-2"></i>
                      Tiếp Tục Mua Sắm
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="col-lg-4">
              <div className="card">
                <div className="card-header bg-primary text-white">
                  <h5 className="mb-0">Tóm Tắt Đơn Hàng</h5>
                </div>
                <div className="card-body">
                  <div className="d-flex justify-content-between mb-2">
                    <span>Tạm tính:</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Phí vận chuyển:</span>
                    <span>${shippingFee.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Thuế (8%):</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <hr />
                  <div className="d-flex justify-content-between mb-3">
                    <strong>Tổng cộng:</strong>
                    <strong className="text-primary">${total.toFixed(2)}</strong>
                  </div>
                  <button
                    className="btn btn-success w-100"
                    onClick={handleCheckout}
                  >
                    <i className="fas fa-lock me-2"></i>
                    Tiến Hành Thanh Toán
                  </button>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="card mt-3">
                <div className="card-body">
                  <h6 className="mb-3">Chúng Tôi Chấp Nhận</h6>
                  <div className="d-flex gap-2">
                    <i className="fab fa-cc-visa fa-2x text-primary"></i>
                    <i className="fab fa-cc-mastercard fa-2x text-danger"></i>
                    <i className="fab fa-cc-paypal fa-2x text-info"></i>
                    <i className="fas fa-money-bill-wave fa-2x text-success"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Cart;





