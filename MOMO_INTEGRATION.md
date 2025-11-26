# MoMo Payment Integration - Setup Guide

## ✅ Triển khai hoàn tất

Tôi vừa triển khai **cổng thanh toán MoMo** vào dự án của bạn theo đúng pattern của VNPAY.

### 📦 Files Đã Tạo/Sửa

#### **Backend (Python/Flask)**

1. **`Backend/momo_service.py`** (NEW)
   - Hàm `create_momo_payment(order)` - Tạo payment URL MoMo
   - Hàm `verify_momo_signature(data)` - Verify IPN signature
   - Logic USD ↔ VND giống VNPAY
   - MoMo amount không nhân 100 (khác VNPAY)

2. **`Backend/config.py`** (UPDATED)
   - Thêm MoMo config constants
   - `MOMO_ENDPOINT` = test endpoint
   - `MOMO_PARTNER_CODE` = "MOMO"
   - `MOMO_ACCESS_KEY` = "F8BBA842ECF85"
   - `MOMO_SECRET_KEY` = "K951B6PE1waDMi640xX08PD3vg6EkVlz"
   - `MOMO_REQUEST_TYPE` = "captureWallet"
   - `MOMO_REDIRECT_URL` = http://localhost:5173/payment-result
   - `MOMO_IPN_URL` = http://localhost:5000/api/payment/momo/ipn

3. **`Backend/app.py`** (UPDATED)
   - Import `momo_service`
   - **Route `POST /api/payment/momo`** - Tạo payment URL MoMo
   - **Route `POST /api/payment/momo/ipn`** - Xử lý IPN từ MoMo (callback)
   - Logic kiểm tra tiền: `paid_vnd` vs `order.totalVnd`

#### **Frontend (React)**

1. **`Frontend_React/src/pages/Checkout.jsx`** (UPDATED)
   - Thêm radio button "Thanh toán qua MoMo"
   - Thêm MoMo payment flow: create order → call `/api/payment/momo` → redirect to payUrl

2. **`Frontend_React/src/services/api.js`** (UPDATED)
   - Thêm `paymentAPI.createMomoPayment(payload)` - Call backend MoMo endpoint

---

## 🔄 Logic Tiền Tệ

### USD ↔ VND Conversion (Giống VNPAY)

```
Web Display: USD (total_usd)
  ↓
Order Create: Compute total_vnd = round(total_usd * EXCHANGE_RATE)
  ↓
MoMo Request: amount = total_vnd (VND, NOT x100 like VNPAY)
  ↓
MoMo IPN: paid_vnd = int(amount)
  ↓
Compare: paid_vnd vs order.totalVnd ← MUST match
```

**Exchange Rate:**
- `EXCHANGE_RATE = 25,000` (VND per 1 USD)
- Config từ env: `EXCHANGE_RATE = os.getenv('EXCHANGE_RATE', 25000)`

---

## 🧪 Testing

### 1. Backend - Check Config

```bash
cd Backend
python -c "from config import Config; print(f'EXCHANGE_RATE={Config.EXCHANGE_RATE}'); print(f'MOMO_ACCESS_KEY={Config.MOMO_ACCESS_KEY}')"
```

### 2. Run Backend

```bash
cd Backend
pip install -r requirements.txt
python app.py
```

Output:
```
Starting Medicare API Server...
MongoDB: mongodb+srv://...
 * Running on http://127.0.0.1:5000
Warning: MoMo config missing – MoMo payment will be disabled.  ← Remove this after setting env vars (optional for sandbox)
```

### 3. Run Frontend

```bash
cd Frontend_React
npm install
npm run dev
```

Output:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

### 4. Test MoMo Checkout

1. Open http://localhost:5173
2. Add product to cart
3. Go to Checkout
4. Fill shipping info
5. Select **"Thanh toán qua MoMo"**
6. Click "Place Order"
7. Should redirect to MoMo sandbox payment page
8. After payment, redirects to `/payment-result`

---

## 📝 API Endpoints

### Create MoMo Payment

**POST** `/api/payment/momo`

```json
{
  "orderId": "66abc123def456..."
}
```

Response (Success):
```json
{
  "success": true,
  "payUrl": "https://test-payment.momo.vn/v2/gateway/api/...",
  "orderId": "66abc123def456...",
  "amount_vnd": 291250
}
```

### MoMo IPN Webhook

**POST** `/api/payment/momo/ipn`

MoMo gọi endpoint này với payment result:
```json
{
  "partnerCode": "MOMO",
  "orderId": "66abc123def456...",
  "amount": "291250",
  "resultCode": 0,
  "transId": "2106071512345678",
  "signature": "..."
}
```

Backend sẽ:
- Verify signature
- Kiểm tra `paid_vnd` vs `order.totalVnd`
- Update order status

---

## 🔐 Security Notes

- ✅ IPN signature verified (HMAC SHA256)
- ✅ Amount checked against expected total
- ✅ User permission verified (only owner can pay)
- ✅ Order status checked (can't pay twice)

---

## 🌐 Environment Variables (Optional)

Nếu muốn override default sandbox values:

```
MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_PARTNER_CODE=MOMO
MOMO_ACCESS_KEY=F8BBA842ECF85
MOMO_SECRET_KEY=K951B6PE1waDMi640xX08PD3vg6EkVlz
MOMO_REQUEST_TYPE=captureWallet
MOMO_REDIRECT_URL=http://localhost:5173/payment-result
MOMO_IPN_URL=http://localhost:5000/api/payment/momo/ipn
EXCHANGE_RATE=25000
```

---

## 📱 Payment Methods Now Available

1. **COD** (Cash on Delivery) - Thanh toán khi nhận hàng
2. **VNPAY** - Cổng thanh toán (ngân hàng)
3. **MoMo** - Ví điện tử MoMo (NEW)

---

## 🐛 Troubleshooting

### Backend fails to start
- Check Python 3.8+: `python --version`
- Check dependencies: `pip install -r requirements.txt`
- Check MongoDB connection: `MONGO_URI` env var
- Check JWT_SECRET_KEY env var

### MoMo payment doesn't redirect
- Check browser console for errors
- Check backend logs for API response
- Verify `Config.MOMO_ACCESS_KEY` is set
- Check internet connection (MoMo needs real network call)

### IPN not received
- Check firewall allows incoming HTTP to port 5000
- For local testing, use ngrok/localtunnel to expose http://localhost:5000/api/payment/momo/ipn

---

## ✨ Khác biệt MoMo vs VNPAY

| Aspect | VNPAY | MoMo |
|--------|-------|------|
| Amount format | VND * 100 | VND |
| Signature algo | HMAC SHA512 | HMAC SHA256 |
| Request type | "pay" command | "captureWallet" |
| Response | Contains `SecureHash` | Contains `signature` |
| Test endpoint | sandbox.vnpayment.vn | test-payment.momo.vn |

---

## 📞 Next Steps

1. **Test MoMo sandbox** - Create test order, select MoMo, see redirect
2. **Monitor logs** - Check backend console for payment flow
3. **Verify IPN** - Payment result should update in DB
4. **Go live** - Switch to production endpoint when ready

---

**Status:** ✅ **READY TO TEST**

Tất cả code đã được viết, import, và kết nối. Hãy start backend + frontend và test checkout flow!
