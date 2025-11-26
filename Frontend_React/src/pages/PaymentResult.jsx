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
    // Step 1: Đọc kết quả thanh toán từ query string
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

    // Step 2: Xác định kết quả dựa trên response code
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

  // Step 3: Hiển thị kết quả thanh toán
  return (
    <div className="payment-result-page">
      <Navbar />
      <div className="container my-5">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className={`card shadow-lg border-0 ${isSuccess ? 'border-success' : 'border-danger'}`}>
              {/* Header - Success/Failure */}
              <div className={`card-header text-white py-4 ${isSuccess ? 'bg-success' : 'bg-danger'}`}>
                <h3 className="mb-0">
                  {isSuccess ? '✅ Thanh toán thành công' : '❌ Thanh toán thất bại'}
                </h3>
              </div>

              {/* Body - Details */}
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

                    {/* Transaction Details */}
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

                    {/* Error Details */}
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
