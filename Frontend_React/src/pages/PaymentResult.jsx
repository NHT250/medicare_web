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
                  {isSuccess ? 'Thanh toan thanh cong' : 'Thanh toan that bai'}
                </h4>
              </div>
              <div className="card-body text-center py-5">
                {isSuccess ? (
                  <>
                    <i className="fas fa-check-circle text-success mb-3" style={{ fontSize: '48px' }}></i>
                    <h5>Don hang #{orderId}</h5>
                    <p className="mt-2">Da duoc thanh toan thanh cong.</p>
                    {amount && <p className="fw-semibold">So tien: {amount} VND</p>}
                  </>
                ) : (
                  <>
                    <i className="fas fa-times-circle text-danger mb-3" style={{ fontSize: '48px' }}></i>
                    <p className="mt-2">
                      Thanh toan khong thanh cong hoac da bi huy. Vui long thu lai hoac chon phuong thuc khac.
                    </p>
                  </>
                )}

                {orderId && (
                  <button
                    className="btn btn-primary mt-3"
                    onClick={() => navigate(`/orders/${orderId}`)}
                  >
                    Xem chi tiet don hang
                  </button>
                )}

                <button className="btn btn-link mt-3" onClick={() => navigate('/')}>Quay ve trang chu</button>
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
