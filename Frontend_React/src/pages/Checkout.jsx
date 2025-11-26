// Checkout Page Component - Thanh toán COD + VNPAY
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { ordersAPI, paymentAPI } from '../services/api';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import '../styles/Checkout.css';

const Checkout = () => {
  const navigate = useNavigate();
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();

  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');

  // Shipping form state
  const [shippingInfo, setShippingInfo] = useState({
    fullName: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'USA'
  });

  // Calculate totals
  const shippingFee = 5.00;
  const tax = cartTotal * 0.08;
  const total = cartTotal + shippingFee + tax;

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      alert('Please login to continue checkout');
      navigate('/login');
    }
    
    if (cartItems.length === 0) {
      alert('Your cart is empty');
      navigate('/cart');
    }
  }, [isAuthenticated, cartItems, navigate]);

  const handleShippingChange = (e) => {
    setShippingInfo({
      ...shippingInfo,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    // Validate shipping info
    if (!shippingInfo.fullName || !shippingInfo.email || !shippingInfo.phone ||
        !shippingInfo.address || !shippingInfo.city || !shippingInfo.state ||
        !shippingInfo.zipCode) {
      alert('Please fill in all shipping information');
      return false;
    }

    return true;
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Chuẩn bị dữ liệu đơn hàng
      const paymentMethodValue = paymentMethod === 'vnpay' ? 'VNPAY' : 'COD';

      const orderData = {
        items: cartItems.map(item => ({
          productId: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.price * item.quantity
        })),
        shipping: shippingInfo,
        payment: {
          method: paymentMethod === 'cod' ? 'COD' : (paymentMethod === 'vnpay' ? 'VNPAY' : 'MOMO'),
          status: 'Pending'
        },
        subtotal: cartTotal,
        shippingFee: shippingFee,
        tax: tax,
        total: total
      };

      console.log("📦 Creating order with data:", orderData);

      // Step 1: Tạo đơn hàng trên backend
      const response = await ordersAPI.createOrder(orderData);

      if (response.order) {
        const createdOrder = response.order;
        const orderId = createdOrder._id || createdOrder.orderId;
        setOrderId(orderId);

        if (paymentMethod === 'cod') {
          // ========== COD Flow ==========
          console.log("💵 COD Payment selected - Order created successfully");
          setOrderPlaced(true);
          clearCart();

          // Chuyển hướng sang trang đơn hàng sau 3s
          setTimeout(() => {
            navigate('/orders');
          }, 3000);
        } else if (paymentMethod === 'vnpay') {
          // ========== VNPAY Flow ==========
          console.log("💳 VNPAY Payment - Requesting payment URL from backend");
          
          // Step 2: Gọi API tạo URL thanh toán VNPAY
          const paymentResponse = await paymentAPI.createVnpayPayment({
            orderId: orderId,
            amount: Math.round(createdOrder.total * 100) || Math.round(total * 100), // VNPAY tính bằng VND
            returnUrl: `${window.location.origin}/payment-result`, // URL trả về sau khi thanh toán
            description: `Thanh toan don hang ${orderId}`
          });

          if (paymentResponse.payment_url || paymentResponse.paymentUrl) {
            console.log("✅ Payment URL received, redirecting to VNPAY gateway");
            clearCart();
            
            // Step 3: Redirect sang cổng VNPAY
            window.location.href = paymentResponse.payment_url || paymentResponse.paymentUrl;
          } else {
            console.error("❌ No payment URL in response:", paymentResponse);
            alert('Không thể tạo liên kết thanh toán. Vui lòng thử lại.');
          }
        } else if (paymentMethod === 'momo') {
          // ========== MoMo Flow ==========
          console.log("💳 MoMo Payment - Requesting payment URL from backend");
          
          // Step 2: Gọi API tạo URL thanh toán MoMo
          const paymentResponse = await paymentAPI.createMomoPayment({
            orderId: orderId
          });

          if (paymentResponse.success && paymentResponse.payUrl) {
            console.log("✅ MoMo Payment URL received, redirecting to MoMo gateway");
            clearCart();
            
            // Step 3: Redirect sang cổng MoMo
            window.location.href = paymentResponse.payUrl;
          } else {
            console.error("❌ MoMo payment failed:", paymentResponse);
            alert(`Lỗi MoMo: ${paymentResponse.error || 'Không thể tạo liên kết thanh toán. Vui lòng thử lại.'}`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error placing order:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to place order';
      alert(`Lỗi: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  // Success screen
  if (orderPlaced) {
    return (
      <div className="checkout-page">
        <Navbar />
        <div className="container my-5">
          <div className="success-message text-center">
            <div className="success-icon">
              <i className="fas fa-check-circle text-success"></i>
            </div>
            <h2>Order Placed Successfully!</h2>
            <p className="lead">Your order ID is: <strong>{orderId}</strong></p>
            <p>Thank you for your purchase. Your order is being processed.</p>
            <p className="text-muted">Redirecting to orders page...</p>
            <div className="spinner-border text-primary mt-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <Navbar />

      <div className="container my-5">
        <h2 className="mb-4">Checkout</h2>

        <div className="row">
          {/* Checkout Form */}
          <div className="col-lg-8 mb-4">
            <form onSubmit={handlePlaceOrder}>
              {/* Shipping Information */}
              <div className="card mb-4">
                <div className="card-header">
                  <h5 className="mb-0">
                    <i className="fas fa-shipping-fast me-2"></i>
                    Shipping Information
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Full Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        name="fullName"
                        value={shippingInfo.fullName}
                        onChange={handleShippingChange}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Email *</label>
                      <input
                        type="email"
                        className="form-control"
                        name="email"
                        value={shippingInfo.email}
                        onChange={handleShippingChange}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Phone *</label>
                      <input
                        type="tel"
                        className="form-control"
                        name="phone"
                        value={shippingInfo.phone}
                        onChange={handleShippingChange}
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Address *</label>
                      <input
                        type="text"
                        className="form-control"
                        name="address"
                        value={shippingInfo.address}
                        onChange={handleShippingChange}
                        placeholder="Street address"
                        required
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">City *</label>
                      <input
                        type="text"
                        className="form-control"
                        name="city"
                        value={shippingInfo.city}
                        onChange={handleShippingChange}
                        required
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">State *</label>
                      <input
                        type="text"
                        className="form-control"
                        name="state"
                        value={shippingInfo.state}
                        onChange={handleShippingChange}
                        required
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">ZIP Code *</label>
                      <input
                        type="text"
                        className="form-control"
                        name="zipCode"
                        value={shippingInfo.zipCode}
                        onChange={handleShippingChange}
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Information */}
              <div className="card mb-4">
                <div className="card-header">
                  <h5 className="mb-0">
                    <i className="fas fa-money-bill-wave me-2"></i>
                    Phương thức thanh toán
                  </h5>
                </div>
              <div className="card-body">
                  {/* COD Option */}
                  <div className="payment-option mb-3">
                    <label className="form-check-label" htmlFor="paymentCod">
                      <input
                        className="form-check-input me-2"
                        type="radio"
                        name="paymentMethod"
                        id="paymentCod"
                        value="cod"
                        checked={paymentMethod === 'cod'}
                        onChange={() => setPaymentMethod('cod')}
                      />
                      <i className="fas fa-money-bill-wave me-2 text-warning"></i>
                      <strong>Thanh toán khi nhận hàng (COD)</strong>
                    </label>
                    {paymentMethod === 'cod' && (
                      <div className="alert alert-info mt-2 mb-0" role="alert">
                        <small>Bạn sẽ thanh toán trực tiếp cho nhân viên giao hàng.</small>
                      </div>
                    )}
                  </div>

                  {/* VNPAY Option */}
                  <div className="payment-option">
                    <label className="form-check-label" htmlFor="paymentVnpay">
                      <input
                        className="form-check-input me-2"
                        type="radio"
                        name="paymentMethod"
                        id="paymentVnpay"
                        value="vnpay"
                        checked={paymentMethod === 'vnpay'}
                        onChange={() => setPaymentMethod('vnpay')}
                      />
                      <i className="fas fa-credit-card me-2 text-success"></i>
                      <strong>Thanh toán qua VNPAY</strong>
                    </label>
                    {paymentMethod === 'vnpay' && (
                      <div className="alert alert-success mt-2 mb-0" role="alert">
                        <small>Bạn sẽ được chuyển sang cổng VNPAY để thanh toán an toàn.</small>
                      </div>
                    )}
                  </div>

                  {/* MoMo Option */}
                  <div className="payment-option mt-3">
                    <label className="form-check-label" htmlFor="paymentMomo">
                      <input
                        className="form-check-input me-2"
                        type="radio"
                        name="paymentMethod"
                        id="paymentMomo"
                        value="momo"
                        checked={paymentMethod === 'momo'}
                        onChange={() => setPaymentMethod('momo')}
                      />
                      <i className="fas fa-mobile-alt me-2 text-primary"></i>
                      <strong>Thanh toán qua MoMo</strong>
                    </label>
                    {paymentMethod === 'momo' && (
                      <div className="alert alert-primary mt-2 mb-0" role="alert">
                        <small>Bạn sẽ được chuyển sang ví MoMo để thanh toán an toàn.</small>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Place Order Button */}
              <button
                type="submit"
                className="btn btn-success btn-lg w-100"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check-circle me-2"></i>
                    Place Order
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="col-lg-4">
            <div className="card sticky-top" style={{ top: '20px' }}>
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">Order Summary</h5>
              </div>
              <div className="card-body">
                {/* Cart Items */}
                <div className="order-items mb-3">
                  {cartItems.map((item) => (
                    <div key={item.id} className="order-item">
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center">
                          <img
                            src={item.image || item.images?.[0] || 'https://via.placeholder.com/80'}
                            alt={item.name}
                            className="item-image"
                          />
                          <div className="ms-2">
                            <h6 className="mb-0">{item.name}</h6>
                            <small className="text-muted">Qty: {item.quantity}</small>
                          </div>
                        </div>
                        <span className="fw-bold">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                      <hr />
                    </div>
                  ))}
                </div>

                {/* Price Breakdown */}
                <div className="price-breakdown">
                  <div className="d-flex justify-content-between mb-2">
                    <span>Subtotal:</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Shipping:</span>
                    <span>${shippingFee.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-3">
                    <span>Tax (8%):</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <hr />
                  <div className="d-flex justify-content-between mb-0">
                    <strong>Total:</strong>
                    <strong className="text-success fs-4">${total.toFixed(2)}</strong>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Checkout;

