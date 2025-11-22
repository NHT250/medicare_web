# 🎉 Medicare React - Hướng Dẫn Hoàn Chỉnh

## ✅ ĐÃ HOÀN THÀNH

### 🏗️ **Frontend**: Migrate sang React ✅
- React 18+ với Vite
- React Router 6
- Context API (Auth & Cart)
- Bootstrap 5 + CSS modules
- Responsive design

### 🔐 **Backend**: Cập nhật bảo mật ✅
- JWT authentication middleware
- Protected routes (cart, orders)
- Better CORS configuration
- Security improvements

---

## 🚀 CÁCH CHẠY ỨNG DỤNG

### **Bước 1: Cài Đặt Dependencies**

**Backend:**
```bash
cd Backend
pip install -r requirements.txt
```

**Frontend React:**
```bash
cd Frontend_React
npm install
```

### **Bước 2: Start MongoDB**

Đảm bảo MongoDB đang chạy:
```bash
# Windows
mongod

# macOS
brew services start mongodb-community

# Ubuntu
sudo systemctl start mongod
```

### **Bước 3: Seed Database (Chỉ lần đầu)**

```bash
cd Backend
python seed_data.py
```

Output:
```
✅ Inserted users
✅ Inserted categories
✅ Inserted products
🎉 Database seeding completed successfully!
```

### **Bước 4: Chạy Backend**

**Terminal 1:**
```bash
cd Backend
python app.py
```

Sẽ thấy:
```
Starting Medicare API Server...
MongoDB: mongodb://localhost:27017/medicare
* Running on http://0.0.0.0:5000
```

### **Bước 5: Chạy React Frontend**

**Terminal 2:**
```bash
cd Frontend_React
npm run dev
```

> 💡 *Không có backend sẵn?* Bạn vẫn có thể demo toàn bộ admin panel bằng mock data:
>
> ```bash
> VITE_USE_ADMIN_MOCKS=true npm run dev
> ```

Sẽ thấy:
```
  VITE v7.1.7  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### **Bước 6: Mở Trình Duyệt**

Truy cập: **http://localhost:5173**

---

## 🛡️ ĐĂNG NHẬP & PHÂN QUYỀN

- Tài khoản admin mẫu: **admin@medicare.com / Admin@123** (được seed trong `Backend/seed_data.py`).
- Tất cả người dùng đăng nhập chung trang **/login**.
- Sau khi đăng nhập:
  - `role === "admin"` → tự động chuyển tới `/admin` (vẫn truy cập storefront).
  - `role === "customer"` → ở lại cửa hàng.
- `token` và `role` được lưu vào `localStorage` để kích hoạt `RequireSignedIn` & `RequireAdmin`.

---

## 📊 ADMIN PANEL

### Các tuyến đường chính

| Đường dẫn | Mô tả |
|-----------|-------|
| `/admin` | Bảng điều khiển tổng quan |
| `/admin/products` | Quản lý sản phẩm (CRUD, tìm kiếm, phân trang) |
| `/admin/products/new` | Tạo sản phẩm mới với bố cục giống ProductDetail |
| `/admin/products/:id/edit` | Chỉnh sửa sản phẩm hiện có |
| `/admin/users` | Danh sách người dùng (lọc, ban/unban, phân trang) |
| `/admin/users/:id` | Trình chỉnh sửa chi tiết giống Profile |

### Tính năng nổi bật

- API `/api/admin/*` được bảo vệ bởi `@token_required` + `@admin_required`.
- Trình chỉnh sửa sản phẩm hỗ trợ quản lý danh sách ảnh, slug tự sinh, mô tả & thông số kỹ thuật.
- Trình chỉnh sửa người dùng cho phép cập nhật thông tin cá nhân, đổi vai trò, ban/unban, reset mật khẩu và xem lịch sử đơn hàng.
- Thanh hành động dính với các nút **Save**, **Save & Close** cùng cảnh báo khi có thay đổi chưa lưu.

---

## 🧪 TEST ỨNG DỤNG

### ✅ **Test 1: Login**

1. Mở: http://localhost:5173/login
2. Nhập:
   - Email: `user@example.com`
   - Password: `password123`
3. Complete reCAPTCHA
4. Click "Login"
5. ✅ Sẽ redirect về homepage với thông báo "Welcome, user@example.com"

### ✅ **Test 2: Browse Products**

1. Homepage → Click "Shop Now" hoặc category nào đó
2. Xem danh sách products
3. Filter theo category
4. Sort products
5. ✅ Products hiển thị đúng

### ✅ **Test 3: Add to Cart**

1. Click "Add to Cart" ở một sản phẩm
2. Cart badge tăng số lượng
3. Click vào cart icon
4. ✅ Sản phẩm hiển thị trong cart

### ✅ **Test 4: Cart Operations**

1. Trong cart page:
   - Tăng/giảm quantity
   - Remove items
   - View order summary
2. ✅ Totals tính đúng

---

## 📁 CẤU TRÚC PROJECT

```
Project_Medicare/
│
├── Backend/                      # Flask API
│   ├── app.py                   # ✅ Updated với JWT auth
│   ├── config.py                # ✅ Updated CORS
│   ├── seed_data.py             # Database seeder
│   ├── requirements.txt         # Python dependencies
│   └── BACKEND_UPDATES.md       # 📝 Backend changes log
│
├── Frontend/                    # Old HTML/CSS/JS (giữ tham khảo)
│
├── Frontend_React/              # ✨ NEW React App
│   ├── src/
│   │   ├── components/         # Navbar, Footer
│   │   ├── contexts/           # AuthContext, CartContext
│   │   ├── pages/              # Homepage, Auth, Products, Cart
│   │   ├── services/           # API integration
│   │   ├── styles/             # CSS files
│   │   ├── config.js           # Configuration
│   │   └── App.jsx             # Main app
│   ├── public/
│   ├── package.json
│   ├── README.md               # 📝 React documentation
│   ├── SETUP_GUIDE.md          # 📝 Setup guide
│   └── MIGRATION_SUMMARY.md    # 📝 Migration details
│
├── REACT_QUICK_START.md        # 📝 Quick start guide
└── FINAL_SETUP_GUIDE.md        # 📝 This file
```

---

## 🔧 TECH STACK

### **Backend**
- Python 3.x
- Flask (Web framework)
- MongoDB (Database)
- PyMongo (MongoDB driver)
- bcrypt (Password hashing)
- PyJWT (JWT authentication) ✅ NEW
- Flask-CORS (CORS handling)

### **Frontend**
- React 18+
- React Router 6
- Vite (Build tool)
- Axios (HTTP client)
- Bootstrap 5
- Context API (State management)
- Font Awesome (Icons)

---

## 🔐 SECURITY FEATURES

### ✅ **Backend Security**
1. **JWT Authentication**
   - Token-based authentication
   - 24h expiration
   - Secure token verification

2. **Password Security**
   - bcrypt hashing
   - Salt rounds
   - Never store plain passwords

3. **Protected Routes**
   - `/api/cart` - Requires JWT
   - `/api/orders` - Requires JWT
   - User can only access their own data

4. **reCAPTCHA**
   - Login protection
   - Register protection
   - Bot prevention

### ✅ **Frontend Security**
1. **Token Storage**
   - localStorage (temporary)
   - Auto-clear on logout
   - Auto-clear on 401

2. **Input Validation**
   - Email format
   - Password strength
   - Phone number format

3. **XSS Protection**
   - React auto-escaping
   - No innerHTML usage
   - Sanitized inputs

---

## 📊 API ENDPOINTS

### **Public Endpoints**
```
POST /api/auth/register    - Register new user
POST /api/auth/login       - Login user
GET  /api/products         - Get all products
GET  /api/products/:id     - Get product by ID
GET  /api/categories       - Get all categories
```

### **Protected Endpoints** (Require JWT Token)
```
GET  /api/cart            - Get user cart
POST /api/cart            - Add to cart
GET  /api/orders          - Get user orders
POST /api/orders          - Create order
```

### **How to Use Protected Endpoints:**
```javascript
// React automatically adds token
fetch('/api/cart', {
  headers: {
    'Authorization': `Bearer ${token}`  // Auto added by Axios interceptor
  }
})
```

---

## 🎯 FEATURES CHECKLIST

### ✅ **Implemented**
- [x] User registration với validation
- [x] User login với JWT
- [x] Homepage với hero section
- [x] Product catalog
- [x] Category filtering
- [x] Search functionality
- [x] Shopping cart
- [x] Cart persistence
- [x] Responsive design
- [x] reCAPTCHA protection
- [x] JWT authentication
- [x] Protected routes

### ⏳ **To Do (Optional)**
- [ ] Product detail page
- [ ] Checkout page
- [ ] Order history page
- [ ] User profile page
- [ ] Password reset
- [ ] Email verification
- [ ] Payment integration
- [ ] Product reviews
- [ ] Wishlist

---

## 🐛 TROUBLESHOOTING

### **Lỗi: Cannot connect to backend**
```bash
# Check backend có chạy không
cd Backend
python app.py

# Nên thấy: * Running on http://0.0.0.0:5000
```

### **Lỗi: MongoDB connection failed**
```bash
# Check MongoDB có chạy không
mongo

# Nếu không chạy:
# Windows: mongod
# macOS: brew services start mongodb-community
# Ubuntu: sudo systemctl start mongod
```

### **Lỗi: reCAPTCHA verification failed**
- Check internet connection
- Site key đúng trong frontend
- Secret key đúng trong backend

### **Lỗi: Token is missing**
- User chưa login
- Token đã expire (> 24h)
- localStorage bị clear

### **Lỗi: CORS error**
- Check backend CORS_ORIGINS có port 5173
- Restart backend sau khi sửa config

### **Lỗi: npm install failed**
```bash
# Clear cache và reinstall
cd Frontend_React
rm -rf node_modules package-lock.json
npm install
```

---

## 📱 PORTS

| Service | Port | URL |
|---------|------|-----|
| Backend API | 5000 | http://localhost:5000 |
| React Frontend | 5173 | http://localhost:5173 |
| MongoDB | 27017 | mongodb://localhost:27017 |

---

## 🎓 LEARNING RESOURCES

### **React Documentation:**
- `Frontend_React/README.md` - Full documentation
- `Frontend_React/SETUP_GUIDE.md` - Detailed setup
- `Frontend_React/MIGRATION_SUMMARY.md` - Migration details

### **Backend Documentation:**
- `Backend/README.md` - Backend docs
- `Backend/BACKEND_UPDATES.md` - Recent changes
- `Backend/QUICK_START.md` - Quick start

### **Quick Start:**
- `REACT_QUICK_START.md` - React quick start
- `FINAL_SETUP_GUIDE.md` - This file

---

## 🚀 PRODUCTION DEPLOYMENT

### **Backend (Flask)**
1. Set environment variables:
   ```bash
   export FLASK_DEBUG=False
   export JWT_SECRET_KEY="your-strong-secret-key"
   export MONGODB_URI="your-production-mongodb-uri"
   ```

2. Use production WSGI server:
   ```bash
   pip install gunicorn
   gunicorn app:app
   ```

### **Frontend (React)**
1. Build for production:
   ```bash
   cd Frontend_React
   npm run build
   ```

2. Deploy `dist/` folder to:
   - Netlify
   - Vercel
   - GitHub Pages
   - AWS S3
   - Any static hosting

3. Update API URL:
   ```env
   VITE_API_URL=https://your-api-domain.com
   ```

---

## 📞 SUPPORT

Nếu gặp vấn đề:

1. **Check logs:**
   - Backend terminal
   - Browser console (F12)
   - Network tab

2. **Verify:**
   - MongoDB running
   - Backend running
   - Frontend running
   - All dependencies installed

3. **Common fixes:**
   ```bash
   # Restart everything
   # Terminal 1
   cd Backend
   python app.py
   
   # Terminal 2
   cd Frontend_React
   npm run dev
   ```

---

## 🎉 CONGRATULATIONS!

Bạn đã có:
- ✅ Modern React frontend
- ✅ Secure Flask backend
- ✅ JWT authentication
- ✅ MongoDB database
- ✅ Production-ready code
- ✅ Full documentation

**Happy Coding!** 🚀

---

**Project**: Medicare Online Pharmacy
**Version**: 2.0.0 (React)
**Date**: November 2, 2025
**Stack**: React + Flask + MongoDB


