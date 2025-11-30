import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import '../styles/PaymentResult.css';

const ERROR_MESSAGES = {
  STOCK_ERROR: {
    title: 'Không đủ hàng trong kho',
    description:
      'Một số sản phẩm bạn chọn không còn đủ số lượng. Vui lòng quay lại giỏ hàng và cập nhật số lượng.',
    suggestion: 'Quay lại giỏ hàng để cập nhật',
  },
  PRODUCT_NOT_FOUND: {
    title: 'Sản phẩm không tồn tại',
    description: 'Một số sản phẩm trong đơn hàng không còn hiển thị. Vui lòng quay lại giỏ hàng.',
    suggestion: 'Quay lại giỏ hàng để cập nhật',
  },
  VALIDATION_ERROR: {
    title: 'Thông tin không hợp lệ',
    description: 'Vui lòng kiểm tra lại thông tin giao hàng và thử lại.',
    suggestion: 'Quay lại thanh toán',
  },
  DB_ERROR: {
    title: 'Lỗi hệ thống',
    description: 'Có lỗi xảy ra khi xử lý đơn hàng. Vui lòng thử lại sau.',
    suggestion: 'Thử lại',
  },
  USER_CANCELLED: {
    title: 'Thanh toán bị hủy',
    description: 'Bạn đã hủy quá trình thanh toán. Đơn hàng chưa được tạo.',
    suggestion: 'Thử lại',
  },
  PAYMENT_FAILED: {
    title: 'Thanh toán thất bại',
    description: 'Giao dịch không thành công. Vui lòng kiểm tra thông tin thanh toán và thử lại.',
    suggestion: 'Thử lại',
  },
  UNKNOWN_ERROR: {
    title: 'Có lỗi xảy ra',
    description: 'Một lỗi không xác định đã xảy ra. Vui lòng thử lại hoặc liên hệ hỗ trợ.',
    suggestion: 'Thử lại',
  },
};

const getMethodDisplay = (methodCode) => {
  const methods = {
    cod: 'Thanh toán khi nhận hàng',
    vnpay: 'VNPAY',
    momo: 'MoMo',
  };
  return methods[methodCode?.toLowerCase()] || 'N/A';
};

const PaymentFail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { cart } = useCart();

  const reason = searchParams.get('reason') || 'UNKNOWN_ERROR';
  const message = searchParams.get('message') || 'Có lỗi xảy ra';
  const method = searchParams.get('method') || 'unknown';
  const orderId = searchParams.get('orderId');

  const errorInfo = ERROR_MESSAGES[reason] || ERROR_MESSAGES.UNKNOWN_ERROR;

  const handleRetry = () => {
    if (reason === 'STOCK_ERROR') {
      navigate('/cart');
    } else if (cart.length > 0) {
      navigate('/checkout');
    } else {
      navigate('/products');
    }
  };

  return (
    <div className="payment-result">
      <Navbar />
      <div className="content">
        <div className="payment-result-card shadow-lg border-0 border-danger">
          <div className="card-header bg-danger text-white py-4">
            <h3 className="mb-0">
              <i className="fas fa-times-circle me-2" />
              Thanh toán thất bại
            </h3>
          </div>

          <div className="card-body py-5">
            <div className="text-center">
              <div className="mb-4">
                <i className="fas fa-times-circle text-danger" style={{ fontSize: '64px' }} />
              </div>

              <h5 className="mb-3">{errorInfo.title}</h5>
              <p className="lead text-muted mb-4">{errorInfo.description}</p>

              <div className="bg-light p-4 rounded mb-4">
                <table className="w-100 text-start small">
                  <tbody>
                    <tr className="border-bottom">
                      <td className="fw-semibold text-muted">Lý do:</td>
                      <td className="text-end text-danger fw-bold">{reason}</td>
                    </tr>
                    {method && method !== 'unknown' && (
                      <tr className="border-bottom">
                        <td className="fw-semibold text-muted">Phương thức:</td>
                        <td className="text-end">{getMethodDisplay(method)}</td>
                      </tr>
                    )}
                    {orderId && (
                      <tr className="border-bottom">
                        <td className="fw-semibold text-muted">Mã đơn hàng:</td>
                        <td className="text-end font-monospace">{orderId}</td>
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

              <div className="alert alert-warning mb-4" role="alert">
                <small>
                  <i className="fas fa-info-circle me-2" />
                  {reason === 'PAYMENT_FAILED'
                    ? 'Nếu tiền đã bị trừ, vui lòng liên hệ bộ phận hỗ trợ khách hàng.'
                    : 'Nếu vẫn gặp vấn đề, hãy liên hệ chúng tôi để được hỗ trợ.'}
                </small>
              </div>

              <div className="d-grid gap-2">
                <button className="btn btn-primary btn-lg" onClick={handleRetry} type="button">
                  <i className="fas fa-redo me-2" />
                  {reason === 'STOCK_ERROR' ? 'Quay lại giỏ hàng' : 'Thử lại'}
                </button>
                <button className="btn btn-outline-primary btn-lg" onClick={() => navigate('/cart')} type="button">
                  <i className="fas fa-shopping-cart me-2" />
                  Quay lại giỏ hàng
                </button>
                <button className="btn btn-link btn-lg text-secondary" onClick={() => navigate('/')} type="button">
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

export default PaymentFail;
