import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const PaymentResult = () => {
  const query = useQuery();
  const navigate = useNavigate();
  const status = query.get('status');
  const orderId = query.get('orderId');
  const amount = query.get('amount');

  const isSuccess = status === 'success';

  return (
    <div className="payment-result-page">
      <Navbar />
      <div className="container my-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card shadow-sm">
              <div className={`card-header ${isSuccess ? 'bg-success' : 'bg-danger'} text-white`}>
                <h4 className="mb-0">
                  {isSuccess ? 'Thanh toán thành công' : 'Thanh toán thất bại'}
                </h4>
              </div>
              <div className="card-body text-center py-5">
                {isSuccess ? (
                  <>
                    <i className="fas fa-check-circle text-success mb-3" style={{ fontSize: '48px' }}></i>
                    <h5>Đơn hàng #{orderId}</h5>
                    <p className="mt-2">Đã được thanh toán thành công.</p>
                    {amount && <p className="fw-semibold">Số tiền: {amount} VND</p>}
                  </>
                ) : (
                  <>
                    <i className="fas fa-times-circle text-danger mb-3" style={{ fontSize: '48px' }}></i>
                    <p className="mt-2">
                      Thanh toán không thành công hoặc đã bị hủy. Vui lòng thử lại hoặc chọn phương thức khác.
                    </p>
                  </>
                )}

                {orderId && (
                  <button
                    className="btn btn-primary mt-3"
                    onClick={() => navigate(`/orders/${orderId}`)}
                  >
                    Xem chi tiết đơn hàng
                  </button>
                )}

                <button className="btn btn-link mt-3" onClick={() => navigate('/')}>Quay về trang chủ</button>
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
