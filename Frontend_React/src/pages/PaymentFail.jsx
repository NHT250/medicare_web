import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './PaymentResult.css';

const PaymentFail = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = new URLSearchParams(search);

  const orderId = params.get('orderId');
  const productName = params.get('productName');
  const message = params.get('message');

  const displayMessage = message || 'Giao dịch đã bị hủy hoặc xảy ra lỗi không xác định.';

  return (
    <div className="payment-result">
      <Navbar />
      <div className="container d-flex align-items-center justify-content-center py-5">
        <div className="card payment-result-card">
          <div className="icon failure">✕</div>
          <h2 className="mb-2">Thanh toán thất bại</h2>
          <p className="subtitle mb-4">Rất tiếc, giao dịch cho sản phẩm của bạn chưa hoàn tất.</p>

          <div className="payment-info">
            {productName && (
              <div className="info-row">
                <span className="label">Sản phẩm:</span>
                <span className="value">{productName}</span>
              </div>
            )}
            {orderId && (
              <div className="info-row">
                <span className="label">Mã đơn hàng:</span>
                <span className="value">{orderId}</span>
              </div>
            )}
            <div className="info-row">
              <span className="label">Lý do:</span>
              <span className="value text-danger">{displayMessage}</span>
            </div>
          </div>

          <div className="actions mt-4">
            <button className="btn btn-primary w-100 primary" type="button" onClick={() => navigate('/checkout')}>
              Thử thanh toán lại
            </button>
            <button className="btn secondary w-100" type="button" onClick={() => navigate('/')}>Quay về trang chủ</button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PaymentFail;
