# QUICK START - VNPAY PAYMENT INTEGRATION

## 📋 QUICK REFERENCE

### 1. Files Modified
```
✏️ Frontend_React/src/pages/Checkout.jsx
✏️ Frontend_React/src/pages/PaymentResult.jsx
✏️ Frontend_React/src/services/api.js
✏️ Frontend_React/src/App.css
✏️ Backend/app.py (added endpoint)
```

### 2. Key Endpoints
```
POST /api/orders                    → Create order
POST /api/payment/vnpay/create      → Create VNPAY payment URL
GET  /payment-result?vnp_...        → Handle VNPAY callback
```

### 3. Environment Variables
```bash
VNP_TMN_CODE=YOUR_TMN_CODE
VNP_HASH_SECRET=YOUR_HASH_SECRET
VNP_PAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNP_RETURN_URL=http://localhost:5173/payment-result
```

---

## 🚀 5-MINUTE SETUP

### Step 1: Update Backend .env
```bash
cd Backend
# Edit .env file
# Add: VNP_TMN_CODE, VNP_HASH_SECRET, VNP_PAY_URL, VNP_RETURN_URL
```

### Step 2: Restart Services
```bash
# Terminal 1: Backend
cd Backend
python app.py

# Terminal 2: Frontend
cd Frontend_React
npm run dev
```

### Step 3: Navigate to Checkout
```
http://localhost:5173/checkout
```

### Step 4: Test
- Fill shipping info
- Select VNPAY
- Click "Đặt hàng"
- Use test card from VNPAY

---

## 🎯 USER FLOW

### COD Payment
```
User selects COD → Click "Đặt hàng" 
→ Order created → Success page → Redirect /orders (3s)
```

### VNPAY Payment
```
User selects VNPAY → Click "Đặt hàng"
→ Order created → Get payment_url
→ Redirect to VNPAY → User enters card
→ VNPAY redirects to /payment-result
→ Show result page
```

---

## 🧪 TEST CARDS

**Sandbox Test Card**:
- Number: `9704198526191432198`
- Exp: `07/15`
- CVV: `123`
- OTP: `123456`

---

## 🔍 VERIFY IMPLEMENTATION

### 1. Check Frontend Code
```javascript
// Checkout.jsx - Check for:
const [paymentMethod, setPaymentMethod] = useState('cod');
if (paymentMethod === 'vnpay') {
  await paymentAPI.createVnpayPayment({...});
}

// PaymentResult.jsx - Check for:
const responseCode = query.get('vnp_ResponseCode');
const isSuccess = responseCode === "00";
```

### 2. Check Backend Endpoint
```python
# app.py - Check for:
@app.route('/api/payment/vnpay/create', methods=['POST'])
@token_required
def create_vnpay_payment(current_user):
    # Should validate order, check permission
    # Should return {payment_url, paymentUrl, orderId, amount}
```

### 3. Check API Service
```javascript
// api.js - Check for:
export const paymentAPI = {
  createVnpayPayment: async (payload) => {
    const response = await api.post('/api/payment/vnpay/create', payload);
    return response.data;
  }
};
```

---

## 🐛 COMMON ISSUES

| Problem | Solution |
|---------|----------|
| Payment URL is null | Check VNPAY credentials in .env |
| 403 Permission Error | Check order userId matches current user |
| 404 Order Not Found | Verify order created in MongoDB first |
| Not redirecting to VNPAY | Check payment_url format, verify window.location.href works |
| Payment result not displaying | Check query parameter names (case-sensitive) |

---

## 📊 TESTING CHECKLIST

- [ ] Backend running on port 5000
- [ ] Frontend running on port 5173
- [ ] VNPAY credentials in .env
- [ ] Can navigate to /checkout
- [ ] Form validation works
- [ ] Payment method selection works
- [ ] Order created successfully
- [ ] Payment URL returned
- [ ] Redirects to VNPAY
- [ ] Payment result page displays
- [ ] Success message shows
- [ ] Navigation buttons work

---

## 🔐 SECURITY

- ✅ JWT token required for payment endpoint
- ✅ User permission validation
- ✅ Order payment status verification
- ✅ VNPAY signature verification (existing)
- ✅ Secure amount handling

---

## 📖 DETAILED DOCS

For more information, see:
- `VNPAY_INTEGRATION_GUIDE.md` - Complete integration guide
- `VNPAY_CODE_IMPLEMENTATION.md` - Full code examples
- `VNPAY_CHECKLIST.md` - Comprehensive checklist

---

## 💬 SUPPORT

**Error Messages**?
- Check browser console for detailed error
- Check backend logs for server-side issues
- Check Network tab for API response details

**Code Issues**?
- Compare with code in `VNPAY_CODE_IMPLEMENTATION.md`
- Verify all imports are correct
- Check function names match exactly

**VNPAY Issues**?
- Verify credentials are correct
- Use correct test cards
- Check sandbox URL is correct

---

## ✨ SUMMARY

**What was added:**
1. COD + VNPAY payment options on Checkout page
2. Payment result page to display transaction status
3. Backend endpoint to create VNPAY payment URL
4. Proper error handling and validation
5. Vietnamese UI text throughout

**What works:**
- Order creation (existing, now with payment method)
- Payment method selection
- VNPAY payment flow
- Transaction result display
- COD payment flow

**Ready to test!** 🎉

