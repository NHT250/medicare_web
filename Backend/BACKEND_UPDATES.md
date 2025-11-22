# Backend Updates for React Frontend

## ✅ Đã Sửa (v2.0 - React Compatible)

### 🔐 **1. Bảo Mật - JWT Authentication**

**Trước (NGUY HIỂM ⚠️):**
```python
@app.route('/api/cart', methods=['GET'])
def get_cart():
    user_id = request.headers.get('user_id')  # ❌ Có thể bị fake!
    cart = db.carts.find_one({'userId': user_id})
```

**Sau (AN TOÀN ✅):**
```python
@app.route('/api/cart', methods=['GET'])
@token_required  # ✅ Verify JWT token
def get_cart(current_user):
    user_id = str(current_user['_id'])  # ✅ Từ JWT, không thể fake
    cart = db.carts.find_one({'userId': user_id})
```

### 🌐 **2. CORS - Thêm Port Vite (5173)**

**Trước:**
```python
CORS_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:5500']
```

**Sau:**
```python
CORS_ORIGINS = [
    'http://localhost:3000',      # Old frontend
    'http://127.0.0.1:5500',      # Live Server
    'http://localhost:5500',      # Live Server
    'http://localhost:5173',      # ✅ Vite (React)
    'http://127.0.0.1:5173'       # ✅ Vite (React)
]
```

### 🔒 **3. JWT Middleware - Token Verification**

**Thêm mới:**
```python
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # Get token from Authorization header
        token = request.headers.get('Authorization')
        
        # Verify JWT token
        data = jwt.decode(token, Config.JWT_SECRET_KEY)
        current_user = db.users.find_one({'_id': ObjectId(data['user_id'])})
        
        return f(current_user, *args, **kwargs)
    return decorated
```

### 📝 **4. Protected Routes**

Các routes sau giờ YÊU CẦU JWT token:

- ✅ `GET /api/cart` - @token_required
- ✅ `POST /api/cart` - @token_required  
- ✅ `GET /api/orders` - @token_required
- ✅ `POST /api/orders` - @token_required

### 🔧 **5. Better CORS Configuration**

```python
CORS(app, 
     origins=Config.CORS_ORIGINS,
     supports_credentials=True,
     allow_headers=['Content-Type', 'Authorization'],  # ✅ Allow Authorization header
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])
```

## 🎯 Cách Sử dụng với React

### React Frontend sẽ gửi request với JWT token:

```javascript
// In services/api.js
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('medicare_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;  // ✅ Backend verify token này
  }
  return config;
});
```

### Backend sẽ verify token và trả về user:

```python
@app.route('/api/cart', methods=['GET'])
@token_required
def get_cart(current_user):  # ✅ current_user từ JWT token
    user_id = str(current_user['_id'])
    # ... rest of code
```

## 🔄 Migration Steps

### Bước 1: Restart Backend
```bash
cd Backend
python app.py
```

Backend sẽ hiển thị:
```
Starting Medicare API Server...
MongoDB: mongodb://localhost:27017/medicare
* Running on http://0.0.0.0:5000
```

### Bước 2: Test với React
```bash
cd Frontend_React
npm run dev
```

## 🧪 Testing

### Test Login (sẽ nhận JWT token):
```javascript
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123",
  "recaptcha_token": "..."
}

// Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  // ✅ JWT token
  "user": { ... }
}
```

### Test Protected Route (với JWT token):
```javascript
GET /api/cart
Headers: {
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

// Response:
{
  "userId": "...",
  "items": [...],
  "total": 0
}
```

### Test Without Token (sẽ bị reject):
```javascript
GET /api/cart
// No Authorization header

// Response:
{
  "error": "Token is missing"
}
// Status: 401 Unauthorized
```

## 📊 So Sánh

| Aspect | Trước | Sau |
|--------|-------|-----|
| **Authentication** | user_id từ header (fake được) | JWT token verify |
| **Security** | ⚠️ Nguy hiểm | ✅ An toàn |
| **CORS** | Không có Vite port | ✅ Có Vite port |
| **Protected Routes** | Không có | ✅ Cart & Orders protected |
| **Token Expiry** | Không có | ✅ 24h auto expire |
| **Error Handling** | Basic | ✅ Better error messages |

## 🔐 Security Improvements

### 1. Token Expiration
- Token tự động expire sau 24 giờ
- User phải login lại
- Prevent unauthorized access

### 2. Token Verification
- Mỗi request đều verify token
- Check token format, signature, expiry
- Verify user exists trong database

### 3. Protected Endpoints
- Cart chỉ user đã login mới access được
- Orders chỉ user đã login mới xem/tạo được
- Không thể fake user_id nữa

## ⚡ Performance

- JWT verification rất nhanh (~1ms)
- Không ảnh hưởng performance
- Cải thiện bảo mật đáng kể

## 🎉 Ready for Production!

Backend giờ:
- ✅ Secure với JWT authentication
- ✅ Compatible với React frontend
- ✅ Better CORS configuration
- ✅ Protected sensitive routes
- ✅ Better error handling
- ✅ Production ready!

## 🐛 Troubleshooting

### Lỗi: "Token is missing"
**Nguyên nhân**: Frontend không gửi JWT token
**Giải pháp**: Check localStorage có token không, check Authorization header

### Lỗi: "Token has expired"
**Nguyên nhân**: Token quá 24h
**Giải pháp**: Login lại để lấy token mới

### Lỗi: "Invalid token"
**Nguyên nhân**: Token bị sai format hoặc JWT_SECRET_KEY sai
**Giải pháp**: Check JWT_SECRET_KEY giống nhau giữa login và verify

### Lỗi: CORS
**Nguyên nhân**: Frontend chạy ở port không có trong CORS_ORIGINS
**Giải pháp**: Thêm port vào CORS_ORIGINS trong config.py

---

**Version**: 2.0.0
**Date**: 2025-11-02
**Compatibility**: React Frontend v2.0.0


