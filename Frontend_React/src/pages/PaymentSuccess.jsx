import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './PaymentResult.css';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = new URLSearchParams(search);

  const orderId = params.get('orderId');
  const method = params.get('method');
  const amountParam = params.get('amount');

  const parsedAmount = amountParam && !Number.isNaN(Number(amountParam)) ? Number(amountParam) : null;
  const formattedAmount = parsedAmount !== null ? `${parsedAmount.toLocaleString('vi-VN')} ₫` : 'N/A';
  const displayMethod = method
    ?
      {
        cod: 'Thanh toán khi nhận hàng (COD)',
        vnpay: 'VNPAY',
        momo: 'MoMo'
      }[method.toLowerCase()] || method.toUpperCase()
    : 'N/A';

  const handleOrderClick = () => {
    if (orderId) {
      navigate(`/orders/${orderId}`);
    } else {
      navigate('/orders');
    }
  };

  return (
    <div className="payment-result">
      <Navbar />
      <div className="container d-flex align-items-center justify-content-center py-5">
        <div className="card payment-result-card">
          <div className="icon success">✓</div>
          <h2 className="mb-2">Thanh toán thành công</h2>
          <p className="subtitle mb-4">Cảm ơn bạn đã mua hàng tại Medicare.</p>

          <div className="payment-info">
            <div className="info-row">
              <span className="label">Mã đơn hàng:</span>
              <span className="value">{orderId || 'N/A'}</span>
            </div>
            <div className="info-row">
              <span className="label">Số tiền:</span>
              <span className="value text-success">{formattedAmount}</span>
            </div>
            <div className="info-row">
              <span className="label">Phương thức:</span>
              <span className="value">{displayMethod}</span>
            </div>
          </div>

          <div className="actions mt-4">
            <button className="btn btn-primary w-100 primary" type="button" onClick={handleOrderClick}>
              Xem đơn hàng của tôi
            </button>
            <button className="btn secondary w-100" type="button" onClick={() => navigate('/')}>Quay lại trang chủ</button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PaymentSuccess;
