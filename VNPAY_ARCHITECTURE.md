# VNPAY ARCHITECTURE & FLOW DIAGRAMS

## 1. SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────┐
│                     MEDICARE E-COMMERCE SYSTEM                      │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐
│   FRONTEND (React)   │         │  BACKEND (Flask)     │
│  - Checkout.jsx      │◄───────►│  - app.py            │
│  - PaymentResult.jsx │  HTTP   │  - config.py         │
│  - api.js            │         │  - vnpay_utils.py    │
└──────────┬───────────┘         └──────────┬───────────┘
           │                                │
           │                                ▼
           │                        ┌──────────────────┐
           │                        │   MongoDB        │
           │                        │   - orders       │
           │                        │   - users        │
           │                        └──────────────────┘
           │
           │
           ▼
        ┌────────────────────────────┐
        │    VNPAY PAYMENT GATEWAY   │
        │  (Sandbox / Production)    │
        │  - Payment Processing      │
        │  - Card Validation         │
        │  - Transaction Records     │
        └────────────────────────────┘
```

---

## 2. PAYMENT FLOW - COD

```
USER                      FRONTEND                    BACKEND
  │                          │                           │
  ├──1. Fill form ───────────►│                          │
  │                          │                           │
  ├──2. Select COD ──────────►│                          │
  │                          │                          │
  │  ┌─────────────────────────────────────────────────┐
  │  │ 3. Click "Đặt hàng"                             │
  │  └─────────────────────────────────────────────────┘
  │                          │                          │
  │                    4. Validate form                │
  │                          │                          │
  │                    5. POST /api/orders             │
  │                          ├─────────────────────────►│
  │                          │                    6. Create order
  │                          │                    Save to MongoDB
  │                          │                          │
  │                          │◄─────────────────────────┤
  │                          │    Response: {order._id}│
  │                          │                          │
  │  ┌─────────────────────────────────────────────────┐
  │  │ 7. setOrderPlaced(true)                         │
  │  │ 8. clearCart()                                  │
  │  │ 9. Show success message                         │
  │  └─────────────────────────────────────────────────┘
  │                          │
  │    ✅ Success page displayed
  │       (Order ID, success icon)
  │
  └─── 10. setTimeout(3000ms) ──────────────────────────┐
           (Auto-redirect)                              │
           navigate('/orders')◄────────────────────────┘
```

---

## 3. PAYMENT FLOW - VNPAY

```
USER                FRONTEND                 BACKEND              VNPAY
  │                    │                        │                 │
  ├─1. Fill form ─────►│                        │                 │
  │                   │                         │                 │
  ├─2. Select VNPAY ──►│                        │                 │
  │                   │                         │                 │
  │ ┌────────────────────────────────────────┐                    │
  │ │ 3. Click "Đặt hàng"                    │                    │
  │ └────────────────────────────────────────┘                    │
  │                   │                         │                 │
  │                   ├─4. POST /api/orders───►│                 │
  │                   │                        │                 │
  │                   │                    5. Create order        │
  │                   │                    in MongoDB             │
  │                   │                         │                 │
  │                   │◄──────────────────────┤                  │
  │                   │   {order._id, total}  │                 │
  │                   │                        │                 │
  │    ┌──────────────────────────────────────────┐              │
  │    │ 6. POST /api/payment/vnpay/create      │              │
  │    │    {orderId, amount, description}       │              │
  │    └──────┬───────────────────────────────────┘              │
  │           │                                  │              │
  │           ├──────────────────────────────────►│              │
  │           │                            7. Validate order     │
  │           │                               Check permission    │
  │           │                            8. build_payment_url()│
  │           │                               Sign with HMAC     │
  │           │◄──────────────────────────────┤                 │
  │           │    {payment_url, amount}      │                 │
  │           │                               │                 │
  │    ┌──────────────────────────────────────────┐              │
  │    │ 9. window.location.href = payment_url  │              │
  │    │ 10. clearCart()                         │              │
  │    └──────┬──────────────────────────────────┘              │
  │           │                                  │              │
  │           └──────────────────────────────────────┐          │
  │                                                  │          │
  │                                                  ▼          │
  │                                    VNPAY Payment Gateway    │
  │                                       │                    │
  │ ┌────────────────────────────────────────────────────────┐
  │ │ 11. Enter card details                                 │
  │ │     - Card Number: 9704198526191432198                 │
  │ │     - Exp: 07/15                                       │
  │ │     - CVV: 123                                          │
  │ │     - OTP: 123456                                       │
  │ └────────────────────────────────────────────────────────┘
  │                                                  │          │
  │                                    12. Process payment      │
  │                                    Validate card info       │
  │                                    Charge card              │
  │                                                  │          │
  │                                    13. Generate response    │
  │                                    vnp_ResponseCode="00"    │
  │                                    (or error code)          │
  │                                                  │          │
  │                                    14. Redirect to:         │
  │                                    /payment-result?vnp_..   │
  │                                                  │          │
  │                          ┌─────────────────────►│          │
  │                          │                      │          │
  │                          │ GET /payment-result  │          │
  │                          │ ?vnp_ResponseCode=00 │          │
  │                          │ &vnp_TxnRef=...      │          │
  │                          │ &vnp_Amount=...      │          │
  │                          │                      │          │
  │    ┌──────────────────────────────────────────┐│
  │    │ 15. Read query parameters                ││
  │    │ 16. Determine: success/failure           ││
  │    │ 17. Display result page                  ││
  │    └──────────────────────────────────────────┘│
  │                          │                      │
  │    ✅ Success page OR    │                      │
  │    ❌ Failure page       │                      │
  │                          │                      │
  │    Buttons:              │                      │
  │    - "View Orders"       │                      │
  │    - "Home"              │                      │
  │    (or "Retry"/"Back")   │                      │
```

---

## 4. COMPONENT HIERARCHY

```
App.jsx (Routes)
│
├── Checkout Route
│   └── Checkout.jsx
│       ├── Navbar
│       ├── Form
│       │   ├── ShippingInfo
│       │   │   ├── fullName input
│       │   │   ├── email input
│       │   │   ├── phone input
│       │   │   ├── address input
│       │   │   ├── city input
│       │   │   ├── state input
│       │   │   └── zipCode input
│       │   │
│       │   └── PaymentInfo
│       │       ├── COD Radio
│       │       │   └── Alert message
│       │       └── VNPAY Radio
│       │           └── Alert message
│       │
│       ├── OrderSummary
│       │   ├── CartItems (map)
│       │   └── PriceBreakdown
│       │       ├── Subtotal
│       │       ├── Shipping
│       │       ├── Tax
│       │       └── Total
│       │
│       ├── PlaceOrderButton
│       └── Footer
│
└── PaymentResult Route
    └── PaymentResult.jsx
        ├── Navbar
        ├── ResultCard
        │   ├── Header (Success/Failure)
        │   │
        │   ├── Success Section
        │   │   ├── Check Icon
        │   │   ├── Message
        │   │   ├── TransactionDetails
        │   │   │   ├── Order ID
        │   │   │   ├── Reference No
        │   │   │   ├── Amount
        │   │   │   └── Code
        │   │   └── Buttons
        │   │       ├── View Orders
        │   │       └── Home
        │   │
        │   └── Failure Section
        │       ├── X Icon
        │       ├── Error Message
        │       ├── ErrorDetails
        │       │   ├── Error Code
        │       │   ├── Order ID
        │       │   └── Note
        │       └── Buttons
        │           ├── Retry
        │           ├── Back to Cart
        │           └── Home
        │
        └── Footer
```

---

## 5. DATA FLOW - ORDER CREATION

```
┌────────────────┐
│  Checkout Form │
└────────┬───────┘
         │
         │ orderData = {
         │   items: [...],
         │   shipping: {...},
         │   payment: {method, status},
         │   subtotal, shippingFee, tax, total
         │ }
         │
         ▼
┌────────────────────────┐
│ ordersAPI.createOrder  │
│ (Frontend Service)     │
└────────┬───────────────┘
         │
         │ POST /api/orders
         │ (JWT Token in header)
         │
         ▼
┌────────────────────────┐
│  Backend /api/orders   │
│ (Flask Route)          │
└────────┬───────────────┘
         │
         │ Validate JWT
         │ Get current_user from token
         │ Insert orderData to MongoDB
         │ Generate orderId (ObjectId)
         │
         ▼
┌────────────────────────┐
│  MongoDB Collection    │
│  (orders)              │
│                        │
│  {                     │
│    _id: ObjectId(...), │
│    userId: user_id,    │
│    items: [...],       │
│    shipping: {...},    │
│    payment: {...},     │
│    total: 2245,        │
│    createdAt: ...,     │
│    ...                 │
│  }                     │
└────────┬───────────────┘
         │
         │ Response: {
         │   order: {
         │     _id: "5f7e...",
         │     total: 2245,
         │     ...
         │   }
         │ }
         │
         ▼
┌────────────────────────┐
│  Frontend Receives     │
│  orderId = order._id   │
│  amount = order.total  │
└────────┬───────────────┘
         │
         │ If COD:
         │   - Show success
         │   - Auto redirect /orders
         │
         │ If VNPAY:
         │   - Call createVnpayPayment()
         │   - Get payment_url
         │   - Redirect to VNPAY
```

---

## 6. DATA FLOW - VNPAY PAYMENT

```
┌──────────────────────────────┐
│ paymentAPI.createVnpayPayment│
│ ({                           │
│   orderId,                   │
│   amount,                    │
│   description                │
│ })                           │
└──────────┬───────────────────┘
           │
           │ POST /api/payment/vnpay/create
           │ Body: {orderId, amount, description}
           │ Header: {Authorization: "Bearer JWT_TOKEN"}
           │
           ▼
┌──────────────────────────────┐
│  Backend Endpoint            │
│ /api/payment/vnpay/create    │
│ @token_required              │
└──────────┬───────────────────┘
           │
           ├─ 1. Validate JWT token
           ├─ 2. Get current_user from token
           ├─ 3. Lookup order in MongoDB
           ├─ 4. Verify:
           │   ├─ Order exists
           │   ├─ User owns order (order.userId == user._id)
           │   ├─ Payment method is VNPAY
           │   └─ Order not already paid
           │
           ▼
┌──────────────────────────────┐
│  build_payment_url()         │
│  (vnpay_utils.py)            │
│                              │
│  Takes:                      │
│  - order_id                  │
│  - amount (in VND)           │
│  - ip_addr                   │
│  - description               │
│                              │
│  Returns:                    │
│  - Signed VNPAY payment URL  │
│    with HMAC SHA512 signature│
└──────────┬───────────────────┘
           │
           │ URL format:
           │ https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?
           │   vnp_Version=2.1.0&
           │   vnp_Command=pay&
           │   vnp_TmnCode=XXXXX&
           │   vnp_Amount=224500 (amount x100)&
           │   vnp_CurrCode=VND&
           │   vnp_TxnRef=order_id&
           │   vnp_OrderInfo=description&
           │   vnp_ReturnUrl=http://localhost:5173/payment-result&
           │   vnp_CreateDate=20240101000000&
           │   vnp_ExpireDate=20240101001500&
           │   vnp_SecureHash=HMAC_SHA512_SIGNATURE
           │
           ▼
┌──────────────────────────────┐
│  Update Order in MongoDB     │
│                              │
│  db.orders.update_one({      │
│    _id: order._id            │
│  }, {                        │
│    $set: {                   │
│      payment.status: Pending │
│      updatedAt: now          │
│    }                         │
│  })                          │
└──────────┬───────────────────┘
           │
           │ Response: {
           │   payment_url: "https://...",
           │   paymentUrl: "https://...",
           │   orderId: "order_id",
           │   amount: 2245
           │ }
           │
           ▼
┌──────────────────────────────┐
│  Frontend receives           │
│  payment_url                 │
│                              │
│  window.location.href =      │
│  payment_url                 │
└──────────┬───────────────────┘
           │
           │ REDIRECT to VNPAY
           │
           ▼
┌──────────────────────────────┐
│  VNPAY Sandbox Gateway       │
│  User enters card details:   │
│  - 9704198526191432198       │
│  - 07/15                     │
│  - 123                       │
│  - OTP: 123456               │
└──────────┬───────────────────┘
           │
           │ VNPAY processes
           │ payment
           │
           ├─ Success (OK)
           │  vnp_ResponseCode = "00"
           │
           └─ Failure
              vnp_ResponseCode != "00"
              (error code)
           │
           │ Redirect to:
           │ returnUrl with params
           │ /payment-result?
           │   vnp_ResponseCode=00&
           │   vnp_TxnRef=order_id&
           │   vnp_Amount=224500&
           │   vnp_TransactionNo=XXXXX&
           │   vnp_SecureHash=XXXXX
           │
           ▼
┌──────────────────────────────┐
│  Frontend /payment-result    │
│                              │
│  1. Read query params        │
│  2. Parse VNPAY response     │
│  3. Determine: success/error │
│  4. Display result page      │
│  5. Show buttons for next    │
│     action                   │
└──────────────────────────────┘
```

---

## 7. ERROR HANDLING FLOW

```
User Action
    │
    ├─ Validation Error
    │   └─ Show alert: "Vui lòng điền đầy đủ thông tin"
    │
    ├─ API Error (POST /api/orders)
    │   ├─ 400: Missing fields
    │   ├─ 401: Unauthorized
    │   └─ 500: Server error
    │       └─ Show: "Lỗi: {error message}"
    │
    ├─ API Error (POST /api/payment/vnpay/create)
    │   ├─ 400: Missing orderId/amount
    │   ├─ 403: Permission denied
    │   ├─ 404: Order not found
    │   ├─ 503: VNPAY not configured
    │   └─ 500: Server error
    │       └─ Show: "Lỗi: {error message}"
    │
    ├─ VNPAY Error (Payment Failed)
    │   └─ Show PaymentResult page
    │       ├─ vnp_ResponseCode != "00"
    │       ├─ Display error code
    │       └─ Show retry option
    │
    └─ Network Error
        └─ Show: "Lỗi kết nối, vui lòng thử lại"
```

---

## 8. REQUEST/RESPONSE EXAMPLES

### POST /api/orders

**Request**:
```json
{
  "items": [
    {
      "productId": "5f7e5d5c4a5b5c5d5e5f5a6b",
      "name": "Product Name",
      "price": 100,
      "quantity": 2,
      "subtotal": 200
    }
  ],
  "shipping": {
    "fullName": "Nguyễn Văn A",
    "email": "user@example.com",
    "phone": "0123456789",
    "address": "123 Đường A",
    "city": "Hà Nội",
    "state": "Quận Ba Đình",
    "zipCode": "100000"
  },
  "payment": {
    "method": "VNPAY",
    "status": "Pending"
  },
  "subtotal": 200,
  "shippingFee": 5,
  "tax": 16.4,
  "total": 221.4
}
```

**Response (200)**:
```json
{
  "order": {
    "_id": "5f7e5d5c4a5b5c5d5e5f5a6b",
    "userId": "user_id",
    "items": [...],
    "shipping": {...},
    "payment": {
      "method": "VNPAY",
      "status": "Pending"
    },
    "subtotal": 200,
    "shippingFee": 5,
    "tax": 16.4,
    "total": 221.4,
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### POST /api/payment/vnpay/create

**Request**:
```json
{
  "orderId": "5f7e5d5c4a5b5c5d5e5f5a6b",
  "amount": 2214,
  "description": "Thanh toan don hang 5f7e5d5c4a5b5c5d5e5f5a6b"
}
```

**Response (200)**:
```json
{
  "payment_url": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Version=2.1.0&vnp_Command=pay&vnp_TmnCode=XXXXX&vnp_Amount=221400&vnp_CurrCode=VND&vnp_TxnRef=5f7e5d5c4a5b5c5d5e5f5a6b&vnp_OrderInfo=Thanh+toan+don+hang+5f7e5d5c4a5b5c5d5e5f5a6b&vnp_ReturnUrl=http%3A%2F%2Flocalhost%3A5173%2Fpayment-result&vnp_CreateDate=20240101000000&vnp_ExpireDate=20240101001500&vnp_SecureHash=XXXXX",
  "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...",
  "orderId": "5f7e5d5c4a5b5c5d5e5f5a6b",
  "amount": 2214
}
```

---

## 9. STATE MANAGEMENT

```
Checkout Component State:
├── [loading, setLoading]              (boolean)
├── [orderPlaced, setOrderPlaced]      (boolean)
├── [orderId, setOrderId]              (string)
├── [paymentMethod, setPaymentMethod]  ("cod" | "vnpay")
└── [shippingInfo, setShippingInfo]    (object)
    ├── fullName
    ├── email
    ├── phone
    ├── address
    ├── city
    ├── state
    ├── zipCode
    └── country

PaymentResult Component State:
└── [paymentStatus, setPaymentStatus]  (object | null)
    ├── isSuccess              (boolean)
    ├── responseCode           (string)
    ├── txnRef                 (string)
    ├── amount                 (string)
    ├── message                (string)
    └── transactionNo          (string)
```

---

This completes the VNPAY integration architecture! 🎉

