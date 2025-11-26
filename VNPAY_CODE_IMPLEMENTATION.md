# CODE IMPLEMENTATION - VNPAY INTEGRATION

## 1. FRONTEND - Checkout.jsx (UPDATED)

```jsx
// File: src/pages/Checkout.jsx
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
  const [paymentMethod, setPaymentMethod] = useState('cod'); // "cod" | "vnpay"

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

  // Redirect if not authenticated or cart is empty
  React.useEffect(() => {
    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập để tiếp tục thanh toán');
      navigate('/login');
    }
    
    if (cartItems.length === 0) {
      alert('Giỏ hàng trống');
      navigate('/cart');
    }
  }, [isAuthenticated, cartItems, navigate]);

  const handleShippingChange = (e) => {
    setShippingInfo({
      ...shippingInfo,
      [e.target.name]: e.target.value
    });
  };

  // Validate form fields
  const validateForm = () => {
    if (!shippingInfo.fullName || !shippingInfo.email || !shippingInfo.phone ||
        !shippingInfo.address || !shippingInfo.city || !shippingInfo.state ||
        !shippingInfo.zipCode) {
      alert('Vui lòng điền đầy đủ thông tin giao hàng');
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
          method: paymentMethodValue,
          status: 'Pending'
        },
        subtotal: cartTotal,
        shippingFee: shippingFee,
        tax: tax,
        total: total
      };

      console.log("📦 Creating order with data:", orderData);

      // ========== Step 1: Tạo đơn hàng trên backend ==========
      const response = await ordersAPI.createOrder(orderData);

      if (response.order) {
        const createdOrder = response.order;
        const orderId = createdOrder._id || createdOrder.orderId;
        setOrderId(orderId);

        if (paymentMethod === 'cod') {
          // ========== COD FLOW ==========
          console.log("💵 COD Payment selected - Order created successfully");
          setOrderPlaced(true);
          clearCart();

          // Chuyển hướng sang trang đơn hàng sau 3s
          setTimeout(() => {
            navigate('/orders');
          }, 3000);
        } else {
          // ========== VNPAY FLOW ==========
          console.log("💳 VNPAY Payment - Requesting payment URL from backend");
          
          // Step 2: Gọi API tạo URL thanh toán VNPAY
          const paymentResponse = await paymentAPI.createVnpayPayment({
            orderId: orderId,
            amount: Math.round(total * 100), // VNPAY tính bằng đơn vị nhỏ nhất (VND x100)
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

  // Show success screen for COD
  if (orderPlaced) {
    return (
      <div className="checkout-page">
        <Navbar />
        <div className="container my-5">
          <div className="success-message text-center">
            <div className="success-icon">
              <i className="fas fa-check-circle text-success"></i>
            </div>
            <h2>Đặt hàng thành công!</h2>
            <p className="lead">Mã đơn hàng: <strong>{orderId}</strong></p>
            <p>Cảm ơn bạn đã mua hàng. Đơn hàng của bạn đang được xử lý.</p>
            <p className="text-muted">Đang chuyển hướng sang trang đơn hàng...</p>
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
        <h2 className="mb-4">Thanh toán</h2>

        <div className="row">
          {/* Checkout Form - Bên trái */}
          <div className="col-lg-8 mb-4">
            <form onSubmit={handlePlaceOrder}>
              {/* ========== SHIPPING INFORMATION ========== */}
              <div className="card mb-4">
                <div className="card-header">
                  <h5 className="mb-0">
                    <i className="fas fa-shipping-fast me-2"></i>
                    Thông tin giao hàng
                  </h5>
                </div>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Họ và tên *</label>
                      <input
                        type="text"
                        className="form-control"
                        name="fullName"
                        value={shippingInfo.fullName}
                        onChange={handleShippingChange}
                        placeholder="Nguyễn Văn A"
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
                        placeholder="user@example.com"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Số điện thoại *</label>
                      <input
                        type="tel"
                        className="form-control"
                        name="phone"
                        value={shippingInfo.phone}
                        onChange={handleShippingChange}
                        placeholder="0123456789"
                        required
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">Địa chỉ *</label>
                      <input
                        type="text"
                        className="form-control"
                        name="address"
                        value={shippingInfo.address}
                        onChange={handleShippingChange}
                        placeholder="123 Đường A, Phường B"
                        required
                      />
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Thành phố *</label>
                      <input
                        type="text"
                        className="form-control"
                        name="city"
                        value={shippingInfo.city}
                        onChange={handleShippingChange}
                        placeholder="Hà Nội"
                        required
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Quận/Huyện *</label>
                      <input
                        type="text"
                        className="form-control"
                        name="state"
                        value={shippingInfo.state}
                        onChange={handleShippingChange}
                        placeholder="Quận Ba Đình"
                        required
                      />
                    </div>
                    <div className="col-md-4 mb-3">
                      <label className="form-label">Mã ZIP *</label>
                      <input
                        type="text"
                        className="form-control"
                        name="zipCode"
                        value={shippingInfo.zipCode}
                        onChange={handleShippingChange}
                        placeholder="100000"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ========== PAYMENT INFORMATION ========== */}
              <div className="card mb-4">
                <div className="card-header">
                  <h5 className="mb-0">
                    <i className="fas fa-money-bill-wave me-2"></i>
                    Phương thức thanh toán
                  </h5>
                </div>
              <div className="card-body">
                  {/* COD OPTION */}
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

                  {/* VNPAY OPTION */}
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
                </div>
              </div>

              {/* ========== PLACE ORDER BUTTON ========== */}
              <button
                type="submit"
                className="btn btn-success btn-lg w-100"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check-circle me-2"></i>
                    Đặt hàng
                  </>
                )}
              </button>
            </form>
          </div>

          {/* ========== ORDER SUMMARY - Bên phải ========== */}
          <div className="col-lg-4">
            <div className="card sticky-top" style={{ top: '20px' }}>
              <div className="card-header bg-primary text-white">
                <h5 className="mb-0">Tóm tắt đơn hàng</h5>
              </div>
              <div className="card-body">
                {/* CART ITEMS */}
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
                            <small className="text-muted">Số lượng: {item.quantity}</small>
                          </div>
                        </div>
                        <span className="fw-bold">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                      <hr />
                    </div>
                  ))}
                </div>

                {/* PRICE BREAKDOWN */}
                <div className="price-breakdown">
                  <div className="d-flex justify-content-between mb-2">
                    <span>Tạm tính:</span>
                    <span>${cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Phí giao hàng:</span>
                    <span>${shippingFee.toFixed(2)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-3">
                    <span>Thuế (8%):</span>
                    <span>${tax.toFixed(2)}</span>
                  </div>
                  <hr />
                  <div className="d-flex justify-content-between mb-0">
                    <strong>Tổng cộng:</strong>
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
```

---

## 2. FRONTEND - PaymentResult.jsx (UPDATED)

```jsx
// File: src/pages/PaymentResult.jsx
// Component xử lý kết quả thanh toán từ VNPAY

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const PaymentResult = () => {
  const query = useQuery();
  const navigate = useNavigate();
  const [paymentStatus, setPaymentStatus] = useState(null);

  useEffect(() => {
    // ========== Step 1: Đọc kết quả thanh toán từ query string ==========
    // VNPAY sẽ trả về các tham số khi redirect về returnUrl
    const responseCode = query.get('vnp_ResponseCode');
    const txnRef = query.get('vnp_TxnRef'); // Transaction reference (order ID)
    const amount = query.get('vnp_Amount'); // Số tiền (tính theo đơn vị nhỏ nhất, chia 100 để có VND)
    const message = query.get('vnp_OrderInfo');
    const transactionNo = query.get('vnp_TransactionNo'); // Mã giao dịch của VNPAY

    console.log("🔄 VNPAY Callback received:");
    console.log("  - Response Code:", responseCode);
    console.log("  - Transaction Ref:", txnRef);
    console.log("  - Amount:", amount);
    console.log("  - Message:", message);

    // ========== Step 2: Xác định kết quả dựa trên response code ==========
    // vnp_ResponseCode = "00" = success (Giao dịch thành công)
    const isSuccess = responseCode === "00";

    setPaymentStatus({
      isSuccess,
      responseCode,
      txnRef,
      amount: amount ? Math.round(amount / 100).toLocaleString('vi-VN') : 'N/A',
      message,
      transactionNo
    });
  }, [query]);

  if (!paymentStatus) {
    return (
      <div className="payment-result-page">
        <Navbar />
        <div className="container my-5">
          <div className="text-center">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Đang xử lý kết quả thanh toán...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const { isSuccess, responseCode, txnRef, amount, message, transactionNo } = paymentStatus;

  // ========== Step 3: Hiển thị kết quả thanh toán ==========
  return (
    <div className="payment-result-page">
      <Navbar />
      <div className="container my-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className={`card shadow-lg border-0 ${isSuccess ? 'border-success' : 'border-danger'}`}>
              {/* ========== HEADER - SUCCESS/FAILURE ========== */}
              <div className={`card-header text-white py-4 ${isSuccess ? 'bg-success' : 'bg-danger'}`}>
                <h3 className="mb-0">
                  {isSuccess ? '✅ Thanh toán thành công' : '❌ Thanh toán thất bại'}
                </h3>
              </div>

              {/* ========== BODY - DETAILS ========== */}
              <div className="card-body py-5">
                {isSuccess ? (
                  <div className="text-center">
                    {/* Success Icon */}
                    <div className="mb-4">
                      <i className="fas fa-check-circle text-success" style={{ fontSize: '64px' }}></i>
                    </div>

                    {/* Success Message */}
                    <h5 className="mb-3">Giao dịch của bạn đã hoàn tất</h5>
                    <p className="lead text-muted mb-4">
                      Cảm ơn bạn đã mua hàng. Đơn hàng của bạn đang được xử lý.
                    </p>

                    {/* Transaction Details Table */}
                    <div className="bg-light p-4 rounded mb-4">
                      <table className="w-100 text-start small">
                        <tbody>
                          <tr className="border-bottom">
                            <td className="fw-semibold text-muted">Mã giao dịch:</td>
                            <td className="text-end">{txnRef || 'N/A'}</td>
                          </tr>
                          <tr className="border-bottom">
                            <td className="fw-semibold text-muted">Số tham chiếu VNPAY:</td>
                            <td className="text-end">{transactionNo || 'N/A'}</td>
                          </tr>
                          <tr className="border-bottom">
                            <td className="fw-semibold text-muted">Số tiền:</td>
                            <td className="text-end fw-bold text-success">{amount} ₫</td>
                          </tr>
                          <tr>
                            <td className="fw-semibold text-muted">Mã phản hồi:</td>
                            <td className="text-end">{responseCode}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Action Buttons */}
                    <div className="d-grid gap-2">
                      <button
                        className="btn btn-primary btn-lg"
                        onClick={() => navigate(`/orders`)}
                      >
                        <i className="fas fa-list me-2"></i>
                        Xem danh sách đơn hàng
                      </button>
                      <button
                        className="btn btn-outline-primary btn-lg"
                        onClick={() => navigate('/')}
                      >
                        <i className="fas fa-home me-2"></i>
                        Quay về trang chủ
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    {/* Failure Icon */}
                    <div className="mb-4">
                      <i className="fas fa-times-circle text-danger" style={{ fontSize: '64px' }}></i>
                    </div>

                    {/* Failure Message */}
                    <h5 className="mb-3">Thanh toán không thành công</h5>
                    <p className="lead text-muted mb-4">
                      Giao dịch đã bị hủy hoặc xảy ra lỗi.
                    </p>

                    {/* Error Details Table */}
                    <div className="bg-light p-4 rounded mb-4">
                      <table className="w-100 text-start small">
                        <tbody>
                          <tr className="border-bottom">
                            <td className="fw-semibold text-muted">Mã lỗi:</td>
                            <td className="text-end text-danger fw-bold">{responseCode}</td>
                          </tr>
                          {txnRef && (
                            <tr className="border-bottom">
                              <td className="fw-semibold text-muted">Mã giao dịch:</td>
                              <td className="text-end">{txnRef}</td>
                            </tr>
                          )}
                          {message && (
                            <tr>
                              <td className="fw-semibold text-muted">Ghi chú:</td>
                              <td className="text-end">{message}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Error Information */}
                    <div className="alert alert-warning mb-4" role="alert">
                      <small>
                        Nếu tiền đã bị trừ từ tài khoản của bạn, vui lòng liên hệ bộ phận hỗ trợ khách hàng.
                      </small>
                    </div>

                    {/* Action Buttons */}
                    <div className="d-grid gap-2">
                      <button
                        className="btn btn-primary btn-lg"
                        onClick={() => navigate('/checkout')}
                      >
                        <i className="fas fa-redo me-2"></i>
                        Thử thanh toán lại
                      </button>
                      <button
                        className="btn btn-outline-primary btn-lg"
                        onClick={() => navigate('/cart')}
                      >
                        <i className="fas fa-shopping-cart me-2"></i>
                        Quay về giỏ hàng
                      </button>
                      <button
                        className="btn btn-link btn-lg"
                        onClick={() => navigate('/')}
                      >
                        Quay về trang chủ
                      </button>
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

export default PaymentResult;
```

---

## 3. FRONTEND - API Service (api.js - UPDATED)

```javascript
// File: src/services/api.js - Payment API Section

// ========== PAYMENT APIs ==========
export const paymentAPI = {
  createVnpayPayment: async (payload) => {
    try {
      console.log("🔗 API: POST /api/payment/vnpay/create", payload);
      // Endpoint: POST /api/payment/vnpay/create
      // Tạo URL thanh toán VNPAY từ backend
      const response = await api.post('/api/payment/vnpay/create', payload);
      console.log("✅ VNPAY Payment URL received:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ VNPAY API Error:", error.response?.data || error.message);
      throw error;
    }
  }
};
```

---

## 4. BACKEND - New Endpoint (app.py - ADDED)

```python
# File: Backend/app.py

from datetime import datetime
from bson import ObjectId, InvalidId

# ========== VNPAY PAYMENT ENDPOINT ==========

@app.route('/api/payment/vnpay/create', methods=['POST'])
@token_required
def create_vnpay_payment(current_user):
    """
    Tạo URL thanh toán VNPAY
    Frontend sẽ gọi endpoint này sau khi tạo order thành công
    
    Request Body:
    {
      "orderId": "5f7e5d5c4a5b5c5d5e5f5a6b",  # Order ID từ database
      "amount": 2245,                          # Số tiền VND
      "returnUrl": "http://localhost:5173/payment-result",
      "description": "Thanh toan don hang 5f7e5d5c4a5b5c5d5e5f5a6b"
    }
    
    Response (Success):
    {
      "payment_url": "https://sandbox.vnpayment.vn/...",
      "paymentUrl": "https://sandbox.vnpayment.vn/...",
      "orderId": "5f7e5d5c4a5b5c5d5e5f5a6b",
      "amount": 2245
    }
    """
    try:
        if not Config.VNP_TMN_CODE or not Config.VNP_HASH_SECRET:
            print("❌ VNPAY not configured")
            return jsonify({'error': 'VNPAY is not configured'}), 503

        payload = request.get_json(force=True, silent=True) or {}
        order_identifier = payload.get('orderId')
        amount = payload.get('amount')  # Amount in VND
        description = payload.get('description')

        print(f"🔗 VNPAY Create Payment: orderId={order_identifier}, amount={amount}")

        if not order_identifier or not amount:
            print("❌ Missing orderId or amount")
            return jsonify({'error': 'orderId and amount are required'}), 400

        # ========== Find order in database ==========
        order = None
        try:
            order_object_id = ObjectId(order_identifier)
            order = db.orders.find_one({'_id': order_object_id})
        except (InvalidId, TypeError):
            order = db.orders.find_one({'orderId': order_identifier})

        if not order:
            print(f"❌ Order not found: {order_identifier}")
            return jsonify({'error': 'Order not found'}), 404

        # ========== Check permission ==========
        user_id = str(current_user['_id'])
        if order.get('userId') != user_id:
            print(f"❌ Permission denied for user {user_id}")
            return jsonify({'error': 'You do not have permission to pay for this order'}), 403

        # ========== Check if already paid ==========
        payment_info = order.get('payment') or {}
        if str(payment_info.get('status') or '').lower() == 'paid':
            print("❌ Order already paid")
            return jsonify({'error': 'Order has already been paid'}), 400
        
        if str(payment_info.get('method') or '').upper() != 'VNPAY':
            print("❌ Payment method is not VNPAY")
            return jsonify({'error': 'Payment method is not VNPAY for this order'}), 400

        # ========== Build VNPAY payment URL ==========
        ip_addr = request.remote_addr or '127.0.0.1'
        order_ref = str(order.get('_id') or order_identifier)
        
        print(f"📝 Building VNPAY URL: orderId={order_ref}, amount={amount}, ip={ip_addr}")
        
        payment_url = build_payment_url(
            order_ref,
            int(amount),  # Amount in VND; build_payment_url will x100 internally
            ip_addr,
            description or f'Thanh toan don hang {order_ref}',
        )

        # ========== Update order payment status ==========
        db.orders.update_one(
            {'_id': order['_id']},
            {'$set': {
                'payment.method': 'VNPAY',
                'payment.status': 'Pending',
                'updatedAt': datetime.utcnow()
            }},
        )

        print(f"✅ Payment URL created: {payment_url[:50]}...")
        return jsonify({
            'payment_url': payment_url,
            'paymentUrl': payment_url,  # Support both snake_case and camelCase
            'orderId': order_ref,
            'amount': amount
        }), 200

    except Exception as e:
        print(f"❌ VNPAY Payment Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
```

---

## 5. BACKEND - Environment Variables (.env)

```env
# ========== VNPAY Configuration (Sandbox) ==========
VNP_TMN_CODE=THAY_TMN_CODE_SANDBOX
VNP_HASH_SECRET=THAY_HASH_SECRET_SANDBOX
VNP_PAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNP_RETURN_URL=http://localhost:5173/payment-result

# Rate for converting USD to VND (if needed)
EXCHANGE_RATE_USD_TO_VND=24000
```

---

## 6. KEY CONCEPTS

### Amount Handling
```
Frontend: amount = 22.45 USD = 2245 (in cents/VND units)
Backend (build_payment_url): amount * 100 = 224500 (VNPAY format)
VNPAY Callback: amount = 224500 → divide by 100 → 2245 VND
```

### Response Code Mapping
```
"00" → Success (Giao dịch thành công)
Other → Failure (Xem error code mapping)
```

### Query String from VNPAY
```
vnp_ResponseCode: Transaction status
vnp_TxnRef: Order ID
vnp_Amount: Amount charged (x100)
vnp_TransactionNo: VNPAY transaction ID
vnp_SecureHash: Signature for verification
```

---

## 7. ERROR HANDLING

### Frontend
```javascript
try {
  const response = await paymentAPI.createVnpayPayment({...});
  if (response.payment_url) {
    window.location.href = response.payment_url;
  } else {
    alert('Không thể tạo liên kết thanh toán');
  }
} catch (error) {
  alert(`Lỗi: ${error.response?.data?.error || error.message}`);
}
```

### Backend
```python
if not order:
    return jsonify({'error': 'Order not found'}), 404

if order.get('userId') != user_id:
    return jsonify({'error': 'Permission denied'}), 403

if str(payment_info.get('status')).lower() == 'paid':
    return jsonify({'error': 'Order already paid'}), 400
```

---

## 8. TESTING STEPS

1. **Navigate to Checkout**: `http://localhost:5173/checkout`
2. **Fill Shipping Info**: Name, email, phone, address, etc.
3. **Select VNPAY**: Choose "Thanh toán qua VNPAY" option
4. **Click Place Order**: Submit form
5. **VNPAY Sandbox**: Use test card (provided by VNPAY)
6. **Payment Result**: Verify success/failure page

---

