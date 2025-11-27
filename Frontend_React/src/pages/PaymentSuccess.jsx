import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import '../styles/PaymentResult.css';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const orderId = searchParams.get('orderId') || searchParams.get('orderIdString');
  const amountParam = searchParams.get('amount');
  const method = searchParams.get('method');
  const transactionNo = searchParams.get('transactionNo');
  const transId = searchParams.get('transId');
  const transactionType = searchParams.get('transactionType');

  const parsedAmount = amountParam && !Number.isNaN(Number(amountParam))
    ? Number(amountParam)
    : null;
  const formattedAmount = parsedAmount !== null
    ? parsedAmount.toLocaleString('vi-VN')
    : 'N/A';

  const getMethodDisplay = (methodCode) => {
    const methods = {
      cod: 'Thanh toán khi nhận hàng',
      vnpay: 'VNPAY',
      momo: 'MoMo Wallet',
    };
    return methods[methodCode?.toLowerCase()] || 'N/A';
  };

  const displayMethod = getMethodDisplay(method);

  const handleOrderClick = () => {
    if (orderId) {
      navigate(`/orders/${orderId}`);
    } else {
      navigate('/orders');
    }
  };

  const isCod = method?.toLowerCase() === 'cod';

  return (
    <div className="payment-result">
      <Navbar />
      <div className="content">
        <div className="payment-result-card shadow-lg border-0 border-success">
          <div className="card-header bg-success text-white py-4">
            <h3 className="mb-0">
              <i className="fas fa-check-circle me-2" />
              Thanh toán thành công
            </h3>
          </div>

          <div className="card-body py-5">
            <div className="text-center">
              <div className="mb-4">
                <i
                  className="fas fa-check-circle text-success"
                  style={{ fontSize: '64px' }}
                />
              </div>

              <h5 className="mb-3">Giao dịch của bạn đã hoàn tất</h5>

              <p className="lead text-muted mb-4">
                {isCod
                  ? 'Cảm ơn bạn đã đặt hàng. Chúng tôi sẽ liên hệ để xác nhận và sắp xếp giao hàng.'
                  : 'Cảm ơn bạn đã mua hàng. Đơn hàng của bạn đang được xử lý.'}
              </p>

              <div className="bg-light p-4 rounded mb-4">
                <table className="w-100 text-start small">
                  <tbody>
                    <tr className="border-bottom">
                      <td className="fw-semibold text-muted">Phương thức:</td>
                      <td className="text-end">{displayMethod}</td>
                    </tr>
                    {orderId && (
                      <tr className="border-bottom">
                        <td className="fw-semibold text-muted">Mã đơn hàng:</td>
                        <td className="text-end font-monospace">{orderId}</td>
                      </tr>
                    )}
                    {!isCod && transactionNo && (
                      <tr className="border-bottom">
                        <td className="fw-semibold text-muted">Số tham chiếu:</td>
                        <td className="text-end font-monospace">{transactionNo}</td>
                      </tr>
                    )}
                    {!isCod && transId && (
                      <tr className="border-bottom">
                        <td className="fw-semibold text-muted">Mã giao dịch:</td>
                        <td className="text-end font-monospace">{transId}</td>
                      </tr>
                    )}
                    {!isCod && transactionType && (
                      <tr className="border-bottom">
                        <td className="fw-semibold text-muted">Loại giao dịch:</td>
                        <td className="text-end">{transactionType}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="fw-semibold text-muted">Số tiền:</td>
                      <td className="text-end fw-bold text-success">{formattedAmount} ₫</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {isCod && (
                <div className="alert alert-info mb-4" role="alert">
                  <small>
                    <i className="fas fa-info-circle me-2" />
                    Bạn sẽ thanh toán khi nhận hàng. Hãy chuẩn bị tiền mặt đúng số tiền.
                  </small>
                </div>
              )}

              <div className="d-grid gap-2">
                <button
                  className="btn btn-primary btn-lg"
                  onClick={handleOrderClick}
                  type="button"
                >
                  <i className="fas fa-box me-2" />
                  Xem chi tiết đơn hàng
                </button>
                <button
                  className="btn btn-outline-primary btn-lg"
                  onClick={() => navigate('/products')}
                  type="button"
                >
                  <i className="fas fa-shopping-bag me-2" />
                  Tiếp tục mua sắm
                </button>
                <button
                  className="btn btn-link btn-lg text-secondary"
                  onClick={() => navigate('/')}
                  type="button"
                >
                  <i className="fas fa-home me-2" />
                  Quay về trang chủ
                </button>
              </div>

              <div className="mt-5 pt-4 border-top">
                <p className="text-muted mb-2">
                  <small>
                    <i className="fas fa-question-circle me-2" />
                    Cần hỗ trợ?
                  </small>
                </p>
                <p className="text-muted">
                  <small>
                    ☎ <strong>1900-1234-567</strong> | ✉ <strong>support@medicare.vn</strong>
                  </small>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PaymentSuccess;
