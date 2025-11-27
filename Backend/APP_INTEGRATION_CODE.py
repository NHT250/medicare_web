"""
EXACT APP.PY INTEGRATION CODE
Copy-paste these snippets into your Backend/app.py
"""

# ============================================================================
# 1. ADD THIS IMPORT AT THE TOP OF app.py (with other imports)
# ============================================================================

# Add this line to your imports section:
from vnpay_routes import setup_vnpay_routes


# ============================================================================
# 2. REGISTER VNPAY ROUTES (Add this after creating Flask app + MongoDB)
# ============================================================================

# LOCATION: In app.py, after your Flask app initialization and MongoDB connection
# 
# Example:
#
#     app = Flask(__name__)
#     app.config.from_object(Config)
#     
#     # MongoDB connection
#     client = MongoClient(app.config['MONGO_URI'])
#     db = client[app.config['MONGO_DB_NAME']]
#     
#     # Auth decorator
#     from utils.auth import token_required
#     
#     # 👇 ADD THIS REGISTRATION CODE 👇
#     
#     # Initialize VNPAY routes with app, database, and auth decorator
#     vnpay_handlers = setup_vnpay_routes(app, db, token_required)
#     
#     # 👆 ADD THIS REGISTRATION CODE 👆
#     
#     # Then continue with your existing routes...


# ============================================================================
# 3. REMOVE THESE OLD ROUTES FROM app.py (if they exist)
# ============================================================================

# Search for and DELETE these functions from your app.py:
#
# @app.route('/api/payment/vnpay/create', methods=['POST'])
# @token_required
# def create_vnpay_payment(current_user):
#     # DELETE THIS ENTIRE FUNCTION
#     pass
#
# @app.route('/vnpay_return', methods=['GET'])
# def vnpay_return():
#     # DELETE THIS ENTIRE FUNCTION
#     pass


# ============================================================================
# 4. UPDATE config.py (if not already done)
# ============================================================================

# Ensure your Backend/config.py has these imports:
import os
from datetime import timedelta

# And these VNPAY configuration variables:
class Config:
    # ... existing config ...
    
    # VNPAY Payment Configuration
    VNP_TMN_CODE = os.getenv('VNP_TMN_CODE', '5FMOWKQD')
    VNP_HASH_SECRET = os.getenv('VNP_HASH_SECRET', 'W4LPXY8ZN5TP6L9L9HUCE224GSTHSWJ8')
    VNP_PAY_URL = os.getenv('VNP_PAY_URL', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html')
    VNP_RETURN_URL = os.getenv('VNP_RETURN_URL', 'http://localhost:5000/api/payment/vnpay/return')
    VNP_IPN_URL = os.getenv('VNP_IPN_URL', 'http://localhost:5000/api/payment/vnpay/ipn')
    
    # Exchange rate: VND per 1 USD (VNPAY uses VND, orders store USD)
    EXCHANGE_RATE = int(os.getenv('EXCHANGE_RATE', 25000))
    
    # Frontend URL for redirects
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')


# ============================================================================
# 5. VERIFY YOUR MongoDB ORDER SCHEMA
# ============================================================================

# Make sure orders in MongoDB have this structure:
# (The code expects these fields)

order_example = {
    "_id": "ObjectId(...)",
    "orderId": "ORD-2024-001",
    "userId": "ObjectId(...)",  # or "user_id"
    "total": 100.0,  # USD amount as float
    "totalUsd": 100.0,
    "totalVnd": 2500000,  # VND amount as integer (100 * 25000)
    "paymentMethod": "VNPAY",  # or "payment_method"
    "payment": {
        "method": "VNPAY",
        "status": "Pending",  # Can be: Pending, Paid, Failed
        "transactionNo": None,  # VNPAY transaction ID (set by IPN)
        "bankCode": None,
        "payDate": None,
        "responseCode": None,
        "failReason": None,
        "initiatedAt": "datetime",
        "ipnReceivedAt": None
    },
    "status": "Payment Pending",
    "paidAt": None,
    "updatedAt": "datetime"
}


# ============================================================================
# 6. EXAMPLE: COMPLETE app.py SETUP (snippet)
# ============================================================================

"""
from flask import Flask
from pymongo import MongoClient
from config import Config
from vnpay_routes import setup_vnpay_routes
from utils.auth import token_required

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)

# MongoDB connection
try:
    client = MongoClient(app.config['MONGO_URI'])
    db = client[app.config['MONGO_DB_NAME']]
    print("✅ MongoDB connected")
except Exception as e:
    print(f"❌ MongoDB connection failed: {e}")
    db = None

# Initialize VNPAY payment routes
# This registers 3 endpoints automatically:
# - POST /api/payment/vnpay/create
# - GET /api/payment/vnpay/ipn
# - GET /api/payment/vnpay/return
vnpay_handlers = setup_vnpay_routes(app, db, token_required)

# ... rest of your routes ...

if __name__ == '__main__':
    app.run(debug=True, port=5000)
"""


# ============================================================================
# 7. TEST: CURL COMMANDS
# ============================================================================

"""
# Test: Create Payment URL

curl -X POST http://localhost:5000/api/payment/vnpay/create \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "orderId": "507f1f77bcf86cd799439011"
  }'


# Expected Response:
{
  "success": true,
  "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Version=2.1.0&vnp_Command=pay&vnp_TmnCode=5FMOWKQD&vnp_Amount=250000000&vnp_CurrCode=VND&vnp_TxnRef=507f1f77bcf86cd799439011&vnp_OrderInfo=Thanh+toan+don+hang+507f1f77bcf86cd799439011&vnp_OrderType=other&vnp_Locale=vn&vnp_IpAddr=127.0.0.1&vnp_CreateDate=20240115103045&vnp_ExpireDate=20240115110045&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A5000%2Fapi%2Fpayment%2Fvnpay%2Freturn&vnp_SecureHash=ABCDEF123456...",
  "orderId": "507f1f77bcf86cd799439011",
  "amountVnd": 2500000,
  "amountUsd": 100
}

# Then redirect browser to the paymentUrl
"""


# ============================================================================
# 8. FILE STRUCTURE CHECKLIST
# ============================================================================

"""
Backend/
├── app.py                          ← Update: Add import + setup_vnpay_routes()
├── config.py                       ← Verify: Has VNPAY config variables
├── vnpay_helpers.py               ← NEW FILE: Helper utilities
├── vnpay_routes.py                ← NEW FILE: Endpoint implementations
├── VNPAY_INTEGRATION_GUIDE.md     ← NEW FILE: Full documentation
├── requirements.txt
├── ...

Frontend_React/
├── src/
│   ├── pages/
│   │   ├── PaymentSuccess.jsx     ← Exists: Shows /payment-success?...
│   │   ├── PaymentFail.jsx        ← Exists: Shows /payment-fail?...
│   │   ├── Checkout.jsx           ← Can add VNPAY payment button here
│   │   ├── ...
"""


# ============================================================================
# 9. FRONTEND EXAMPLE: Call Payment Endpoint
# ============================================================================

"""
// In Frontend_React/src/pages/Checkout.jsx (or similar)

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Checkout() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const orderId = new URLSearchParams(window.location.search).get('orderId');

  const handleVNPAYPayment = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/payment/vnpay/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ orderId })
      });

      const data = await response.json();

      if (data.success) {
        // Redirect user to VNPAY gateway
        console.log('💳 Redirecting to VNPAY...');
        window.location.href = data.paymentUrl;
      } else {
        alert(`❌ Error: ${data.error}`);
        setLoading(false);
      }
    } catch (error) {
      console.error('Payment creation failed:', error);
      alert('Failed to create payment URL');
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Checkout</h1>
      
      <div>
        <label>
          <input type="radio" name="payment" value="cod" defaultChecked />
          Cash on Delivery (COD)
        </label>
        <label>
          <input type="radio" name="payment" value="vnpay" />
          VNPAY
        </label>
      </div>

      <button 
        onClick={handleVNPAYPayment} 
        disabled={loading}
      >
        {loading ? 'Processing...' : 'Pay with VNPAY'}
      </button>
    </div>
  );
}
"""


# ============================================================================
# 10. DEPLOYMENT CHECKLIST
# ============================================================================

"""
Before deploying to production:

☐ Update vnp_helpers.py and vnpay_routes.py to production environment
☐ Update config.py with production VNPAY credentials (not sandbox)
☐ Update .env file with production values:
    - VNP_TMN_CODE (production)
    - VNP_HASH_SECRET (production)
    - VNP_PAY_URL=https://pay.vnpayment.vn/paymentv2/vpcpay.html (not sandbox)
    - VNP_RETURN_URL=https://your-production-domain.com/api/payment/vnpay/return
    - VNP_IPN_URL=https://your-production-domain.com/api/payment/vnpay/ipn
    - FRONTEND_URL=https://your-production-domain.com

☐ Test end-to-end payment flow with production credentials
☐ Configure IPN/Return URLs in VNPAY merchant dashboard
☐ Set up monitoring/alerts for payment failures
☐ Verify database backups working properly
☐ Check server logs for any errors
☐ Test SSL/HTTPS (required for production VNPAY)
☐ Set up error notification system for failed payments
"""
