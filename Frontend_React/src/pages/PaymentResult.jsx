import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import '../styles/PaymentResult.css';
import { paymentAPI } from '../services/api';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const PaymentResult = () => {
  const query = useQuery();
  const navigate = useNavigate();
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifyPaymentStatus = async () => {
      try {
        // Check if this is MoMo return
        const momoOrderId = query.get('orderId');
        const momoResultCode = query.get('resultCode');

        if (momoOrderId && momoResultCode !== null) {
          // MoMo return path
          try {
            const verifyResponse = await paymentAPI.verifyMomoReturn({
              orderId: momoOrderId,
              resultCode: momoResultCode,
              amount: query.get('amount'),
              transId: query.get('transId'),
              message: query.get('message')
            });

            if (verifyResponse.success) {
              const dbStatus = verifyResponse.dbStatus;
              const expectedStatus = verifyResponse.expectedStatus;
              const isSynced = verifyResponse.isSynced;

              const isSuccess =
                dbStatus === 'Paid' || expectedStatus === 'Paid' || parseInt(momoResultCode) === 0;

              if (!isSynced && !isSuccess) {
                setTimeout(() => verifyPaymentStatus(), 2000);
                setPaymentStatus({
                  isSuccess: false,
                  isMomo: true,
                  orderId: momoOrderId,
                  amount: query.get('amount'),
                  transId: query.get('transId'),
                  message: 'Hệ thống đang xác nhận thanh toán với MoMo. Vui lòng chờ...',
                  retrying: true
                });
                setIsVerifying(false);
                return;
              }

              setPaymentStatus({
                isSuccess,
                isMomo: true,
                orderId: verifyResponse.orderIdString || momoOrderId,
                amount: verifyResponse.amount ? parseInt(verifyResponse.amount).toLocaleString('vi-VN') : query.get('amount'),
                transId: query.get('transId') || verifyResponse.transId,
                message: `MoMo: ${verifyResponse.momoResultDescription || ''}`
              });
            } else {
              setPaymentStatus({
                isSuccess: false,
                isMomo: true,
                orderId: momoOrderId,
                message: verifyResponse.message || 'Lỗi xác minh thanh toán'
              });
            }
          } catch (err) {
            console.error('❌ Error verifying MoMo payment:', err);
            const resultCode = parseInt(momoResultCode);
            const isSuccess = resultCode === 0;
            const codeDescriptions = {
              0: 'Thanh toán thành công',
              1000: 'Lỗi hệ thống MoMo',
              1001: 'Giao dịch không tồn tại hoặc hết timeout',
              1003: 'Người dùng từ chối hoặc không phản hồi',
              1004: 'Giao dịch bị từ chối',
              1005: 'Không có đủ tiền trong tài khoản',
              4007: 'Người dùng hủy thanh toán'
            };

            setPaymentStatus({
              isSuccess,
              isMomo: true,
              orderId: momoOrderId,
              amount: query.get('amount'),
              transId: query.get('transId'),
              message: `MoMo: ${codeDescriptions[resultCode] || 'Lỗi không xác định'}`
            });
          }
        } else {
          // VNPAY flow
          const responseCode = query.get('vnp_ResponseCode');
          const txnRef = query.get('vnp_TxnRef');
          const amount = query.get('vnp_Amount');
          const message = query.get('vnp_OrderInfo');
          const transactionNo = query.get('vnp_TransactionNo');

          const isSuccess = responseCode === '00';

          setPaymentStatus({
            isSuccess,
            isVnpay: true,
            responseCode,
            txnRef,
            amount: amount ? Math.round(amount / 100).toLocaleString('vi-VN') : 'N/A',
            message,
            transactionNo
          });
        }
      } catch (err) {
        console.error('❌ Error processing payment result:', err);
        setPaymentStatus({
          isSuccess: false,
          message: 'Lỗi xử lý kết quả thanh toán'
        });
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPaymentStatus();
  }, [query]);

  if (!paymentStatus || isVerifying) {
    return (
      <div className="payment-result-page">
        <Navbar />
        <div className="container my-5">
          <div className="text-center">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Đang xử lý kết quả thanh toán...</p>
            {paymentStatus?.retrying && (
              <p className="text-muted mt-2">⏳ Đồng bộ hoá trạng thái với hệ thống...</p>
            )}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const {
    isSuccess,
    responseCode,
    txnRef,
    amount,
    message,
    transactionNo,
    isMomo,
    orderId,
    transId
  } = paymentStatus;

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
                          {isMomo ? (
                            <>
                              {/* MoMo Details - Simplified */}
                              <tr className="border-bottom">
                                <td className="fw-semibold text-muted">Phương thức:</td>
                                <td className="text-end">🟠 MoMo Wallet</td>
                              </tr>
                              <tr className="border-bottom">
                                <td className="fw-semibold text-muted">Mã đơn hàng:</td>
                                <td className="text-end font-monospace">{orderId || 'N/A'}</td>
                              </tr>
                              <tr className="border-bottom">
                                <td className="fw-semibold text-muted">Mã giao dịch:</td>
                                <td className="text-end font-monospace">{transId || 'N/A'}</td>
                              </tr>
                              <tr>
                                <td className="fw-semibold text-muted">Số tiền:</td>
                                <td className="text-end fw-bold text-success">{amount} ₫</td>
                              </tr>
                            </>
                          ) : (
                            <>
                              {/* VNPAY Details */}
                              <tr className="border-bottom">
                                <td className="fw-semibold text-muted">Phương thức:</td>
                                <td className="text-end">🔴 VNPAY</td>
                              </tr>
                              <tr className="border-bottom">
                                <td className="fw-semibold text-muted">Mã giao dịch:</td>
                                <td className="text-end font-monospace">{txnRef || 'N/A'}</td>
                              </tr>
                              <tr className="border-bottom">
                                <td className="fw-semibold text-muted">Số tham chiếu:</td>
                                <td className="text-end font-monospace">{transactionNo || 'N/A'}</td>
                              </tr>
                              <tr>
                                <td className="fw-semibold text-muted">Số tiền:</td>
                                <td className="text-end fw-bold text-success">{amount} ₫</td>
                              </tr>
                            </>
                          )}
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
