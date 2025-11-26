# HƯỚNG DẪN TÍCH HỢP THANH TOÁN VNPAY

## 1. FLOW THANH TOÁN VNPAY

```
┌─────────────────────────────────────────────────────────────────┐
│  User tại trang Checkout                                        │
│  1. Điền thông tin giao hàng                                    │
│  2. Chọn phương thức: "VNPAY" hoặc "Cash on Delivery"          │
│  3. Click "Place Order"                                        │
└────────────────────┬────────────────────────────────────────────┘
                     │
         ┌───────────▼──────────────────────────┐
         │ Validate form + gọi API tạo order    │  
         │ ✅ Shipping info OK?                 │
         │ ✅ JWT token có?                     │
         └──────────┬───────────────────────────┘
                    │
      ┌─────────────┴──────────────────┐
      │                                │
      ▼ Payment=COD               ▼ Payment=VNPAY
   [COD Flow]                 [VNPAY Flow]
      │                            │
      │ 1. POST /api/orders        │ 1. POST /api/orders
      │    Create order            │    Create order
      │    ✓ Response: {order}     │    ✓ Response: {order}
      │                            │    │
      │ 2. Show success            │ 2. POST /api/payment/vnpay/create
      │    Clear cart              │    Body: {orderId, amount, returnUrl}
      │    Redirect /orders        │    ✓ Response: {payment_url}
      │    (after 3s)              │    │
      │                            │ 3. window.location.href = payment_url
      │                            │    (Redirect to VNPAY gateway)
      │                            │    │
      │                            │ 4. User enters card details on VNPAY
      │                            │    │
      │                            │ 5. VNPAY redirects back to:
      │                            │    returnUrl = /payment-result?...
      │                            │    Query params:
      │                            │    - vnp_ResponseCode: "00" = success
      │                            │    - vnp_TxnRef: transaction ID
      │                            │    - vnp_Amount: amount charged
      │                            │    - ...
      │                            │    │
      │                            │ 6. PaymentResult page reads query
      │                            │    - Show success/failure
      │                            │    - Buttons: "View Orders" / "Home"
```

---

## 2. CẤU HÌNH BACKEND

### a) Biến môi trường (.env)

```env
# VNPAY Configuration (Sandbox)
VNP_TMN_CODE=THAY_TMN_CODE_SANDBOX
VNP_HASH_SECRET=THAY_HASH_SECRET_SANDBOX
VNP_PAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNP_RETURN_URL=http://localhost:5173/payment-result
```

### b) Endpoint Backend

**POST `/api/payment/vnpay/create`** (Require JWT token)

**Request Body:**
```json
{
  "orderId": "5f7e5d5c4a5b5c5d5e5f5a6b",
  "amount": 2245,
  "returnUrl": "http://localhost:5173/payment-result",
  "description": "Thanh toan don hang 5f7e5d5c4a5b5c5d5e5f5a6b"
}
```

**Response (Success):**
```json
{
  "payment_url": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Version=2.1.0&vnp_Command=pay&...",
  "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...",
  "orderId": "5f7e5d5c4a5b5c5d5e5f5a6b",
  "amount": 2245
}
```

**Response (Error):**
```json
{
  "error": "VNPAY is not configured"
}
```

---

## 3. COMPONENT CHECKOUT

### File: `src/pages/Checkout.jsx`

**Key Changes:**

1. **Payment Method State**
   ```javascript
   const [paymentMethod, setPaymentMethod] = useState('cod'); // "cod" | "vnpay"
   ```

2. **Radio Button UI**
   - COD: "Thanh toán khi nhận hàng"
   - VNPAY: "Thanh toán qua VNPAY"

3. **Handle Place Order Function**
   ```javascript
   const handlePlaceOrder = async (e) => {
     e.preventDefault();
     
     if (!validateForm()) return;
     
     setLoading(true);
     
     try {
       // Step 1: Create order on backend
       const orderData = {
         items: cartItems.map(...),
         shipping: shippingInfo,
         payment: {
           method: paymentMethod === 'vnpay' ? 'VNPAY' : 'COD',
           status: 'Pending'
         },
         subtotal: cartTotal,
         shippingFee: 5.00,
         tax: cartTotal * 0.08,
         total: cartTotal + 5.00 + (cartTotal * 0.08)
       };
       
       const response = await ordersAPI.createOrder(orderData);
       const orderId = response.order._id;
       
       if (paymentMethod === 'cod') {
         // COD: Show success, redirect to /orders
         setOrderPlaced(true);
         clearCart();
         setTimeout(() => navigate('/orders'), 3000);
       } else {
         // VNPAY: Request payment URL
         const paymentResponse = await paymentAPI.createVnpayPayment({
           orderId: orderId,
           amount: Math.round(total * 100), // Convert to smallest unit
           returnUrl: `${window.location.origin}/payment-result`,
           description: `Thanh toan don hang ${orderId}`
         });
         
         if (paymentResponse.payment_url) {
           clearCart();
           // Step 2: Redirect to VNPAY gateway
           window.location.href = paymentResponse.payment_url;
         }
       }
     } catch (error) {
       alert(`Lỗi: ${error.message}`);
     } finally {
       setLoading(false);
     }
   };
   ```

### Key Points:

- **Form Validation**: Kiểm tra tất cả field: fullName, email, phone, address, city, state, zipCode
- **Loading State**: Disable button khi đang process
- **Error Handling**: Hiển thị error message chi tiết
- **Cart Clearing**: Xóa giỏ hàng sau khi order thành công (COD) hoặc trước khi redirect (VNPAY)

---

## 4. COMPONENT PAYMENT RESULT

### File: `src/pages/PaymentResult.jsx`

**Key Features:**

1. **Đọc Query String từ VNPAY**
   ```javascript
   const query = useQuery();
   const responseCode = query.get('vnp_ResponseCode');    // "00" = success
   const txnRef = query.get('vnp_TxnRef');               // Order ID
   const amount = query.get('vnp_Amount');               // Amount x100
   const transactionNo = query.get('vnp_TransactionNo'); // VNPAY transaction ID
   ```

2. **Xác Định Kết Quả**
   ```javascript
   const isSuccess = responseCode === "00"; // Only "00" = success
   ```

3. **Hiển Thị UI**
   - **Success Case**:
     - Biểu tượng check (✅)
     - Thông tin giao dịch
     - Button "Xem danh sách đơn hàng"
     - Button "Quay về trang chủ"
   
   - **Failure Case**:
     - Biểu tượng X (❌)
     - Mã lỗi và ghi chú
     - Button "Thử thanh toán lại"
     - Button "Quay về giỏ hàng"

---

## 5. API SERVICE

### File: `src/services/api.js`

```javascript
export const paymentAPI = {
  createVnpayPayment: async (payload) => {
    try {
      console.log("🔗 API: POST /api/payment/vnpay/create", payload);
      // Endpoint: POST /api/payment/vnpay/create
      const response = await api.post('/api/payment/vnpay/create', payload);
      console.log("✅ VNPAY Payment URL received:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ VNPAY API Error:", error.response?.data || error.message);
      throw error;
    }
  }
};
```

---

## 6. ROUTER CONFIG

### File: `src/App.jsx`

Routes đã có sẵn:
```javascript
<Route path="/checkout" element={<RequireSignedIn><Checkout /></RequireSignedIn>} />
<Route path="/payment-result" element={<PaymentResult />} />
<Route path="/orders" element={<RequireSignedIn><CustomerOrders /></RequireSignedIn>} />
```

---

## 7. TESTING VNPAY

### Sandbox Test Cards

VNPAY cung cấp thẻ test:

| Card Number | Exp | CVV | OTP |
|---|---|---|---|
| 9704198526191432198 | 07/15 | 123 | 123456 |
| 4111111111111111 | 12/22 | 253 | 123456 |

### Test Flow

1. **Local Development**:
   ```
   Frontend: http://localhost:5173
   Backend: http://localhost:5000
   VNPAY Sandbox: https://sandbox.vnpayment.vn
   ```

2. **Create Order**:
   - Điền thông tin giao hàng
   - Chọn VNPAY
   - Click "Place Order"

3. **VNPAY Gateway**:
   - Nhập card number, exp, CVV
   - Nhập OTP: 123456
   - Click "Thanh toán"

4. **Return URL**:
   - VNPAY redirect về `http://localhost:5173/payment-result?vnp_ResponseCode=00&vnp_TxnRef=...`
   - Frontend hiển thị kết quả

---

## 8. LƯỚI LOGIC XỬ LÝ QUERY STRING

| vnp_ResponseCode | Status | Meaning |
|---|---|---|
| 00 | Success | Giao dịch thành công |
| 07 | Failed | Trừ tiền thất bại |
| 09 | Failed | Giao dịch không tồn tại |
| 10 | Failed | Đã hủy giao dịch |
| 11 | Failed | Đã hoàn tiền |
| 12 | Failed | Đang xử lý |
| 13 | Failed | Chờ xác nhận |
| 24 | Failed | Giao dịch bị nghi ngờ |

Frontend chỉ cần kiểm tra:
- **responseCode === "00"** → Success
- **Khác "00"** → Failure

---

## 9. POINTS CẦN LƯU Ý

### Frontend

- ✅ JWT token tự động thêm vào header (via interceptor)
- ✅ Amount tính bằng VND (không cần convert)
- ✅ Sau khi tạo order, xóa cart TRƯỚC khi redirect VNPAY
- ✅ Payment Result page phải handle tất cả query params
- ✅ Nút "View Orders" navigate đến `/orders` (require login)

### Backend

- ✅ Endpoint `/api/payment/vnpay/create` require JWT token
- ✅ Kiểm tra order tồn tại + permission + payment method
- ✅ Return cả `payment_url` và `paymentUrl` (support cả format)
- ✅ Update order payment status thành "Pending"
- ✅ VNPAY amount x100 internally (backend xử lý)

### VNPAY Config

- ✅ VNP_RETURN_URL phải match Frontend URL: `http://localhost:5173/payment-result`
- ✅ Response Code: "00" = success, khác = failure
- ✅ Signature verification (backend xử lý)

---

## 10. DEBUGGING TIPS

### Frontend Console

```javascript
// Check payment method
console.log("🔗 VNPAY Payment - Requesting payment URL from backend");

// Check API response
console.log("✅ Payment URL received:", response.data);

// Check redirect
console.log("📊 Redirecting to VNPAY...");
window.location.href = paymentResponse.payment_url;
```

### Backend Logs

```python
# Check payment creation
print(f"🔗 VNPAY Create Payment: orderId={order_identifier}, amount={amount}")

# Check order lookup
print(f"❌ Order not found: {order_identifier}")

# Check permission
print(f"✅ Payment URL created: {payment_url[:50]}...")
```

### Network Tab

1. POST `/api/orders` → Response: `{order._id, total}`
2. POST `/api/payment/vnpay/create` → Response: `{payment_url}`
3. GET redirect to VNPAY sandbox

---

## 11. PRODUCTION CHECKLIST

- [ ] Update VNP_TMN_CODE (production)
- [ ] Update VNP_HASH_SECRET (production)
- [ ] Update VNP_PAY_URL: `https://paymentv2.vnpayment.vn/vpcpay.html`
- [ ] Update VNP_RETURN_URL: production URL
- [ ] Add SSL/HTTPS
- [ ] Test with real cards (test environment provided by VNPAY)
- [ ] Set up webhook for order status sync
- [ ] Implement retry logic for failed payments
- [ ] Add logging/monitoring for payment transactions

---

## 12. CẤU TRÚC FILE

```
Frontend_React/
├── src/
│   ├── pages/
│   │   ├── Checkout.jsx          ← Updated: Add VNPAY payment method
│   │   ├── PaymentResult.jsx      ← Updated: Handle VNPAY callback
│   ├── services/
│   │   ├── api.js                ← Updated: Add paymentAPI.createVnpayPayment()
│   ├── App.jsx                    ← Routes already configured
│   ├── App.css                    ← Updated: Add payment result styles

Backend/
├── app.py                         ← Updated: Add /api/payment/vnpay/create endpoint
├── config.py                      ← VNPAY config (from env)
├── vnpay_utils.py                ← VNPAY utilities
└── .env                           ← VNPAY credentials
```

---

## 13. REFERRER

- VNPAY Documentation: https://sandbox.vnpayment.vn/ (Sandbox)
- VNPAY API Docs: Contact VNPAY support
- Test Cards: Provided by VNPAY
