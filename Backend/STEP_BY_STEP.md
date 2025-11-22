# 📝 Hướng Dẫn Từng Bước - Chạy Backend

## ✅ Bạn đã hoàn thành:
- [x] Tạo database `medicare` trong MongoDB Compass
- [x] Kết nối với Atlas cluster

## 🔄 Bước tiếp theo:

### **Bước 1: Cài đặt Python packages**

Mở terminal trong folder Backend:

```bash
cd Backend
pip install -r requirements.txt
```

**Install các package:**
- Flask
- Flask-CORS
- pymongo
- bcrypt
- PyJWT
- python-dotenv

---

### **Bước 2: Seed Database (Tạo data mẫu)**

Chạy lệnh để tạo dữ liệu:

```bash
python seed_data.py
```

**Kết quả mong đợi:**
```
🗑️  Cleared existing data...
✅ Inserted users
✅ Inserted categories  
✅ Inserted products

🎉 Database seeding completed successfully!
Database: medicare
Collections: users, products, categories
```

---

### **Bước 3: Kiểm tra trong MongoDB Compass**

1. Trong Compass, click **Refresh** 🔄
2. Vào database `medicare`
3. Bạn sẽ thấy **3 collections mới:**
   - `users` - 2 documents
   - `products` - 4 documents
   - `categories` - 6 documents

---

### **Bước 4: Chạy Backend Server**

```bash
python app.py
```

**Kết quả:**
```
🚀 Starting Medicare API Server...
📍 MongoDB: mongodb+srv://cluster1.qncm65j.mongodb.net/medicare
 * Running on http://127.0.0.1:5000
```

---

### **Bước 5: Test API**

Mở browser và truy cập:

```
http://localhost:5000/
```

Hoặc test endpoints:

```bash
# Test root
curl http://localhost:5000/

# Test products
curl http://localhost:5000/api/products

# Test categories  
curl http://localhost:5000/api/categories
```

---

## ⚠️ Lưu ý quan trọng:

### Nếu gặp lỗi khi chạy seed_data.py:

**Lỗi:** `authentication failed`

**Giải pháp:**
1. Lấy connection string đầy đủ từ MongoDB Atlas
2. Format đúng: `mongodb+srv://username:password@cluster.mongodb.net/`
3. Sửa trong file `seed_data.py`

**Lấy connection string:**
1. Vào MongoDB Atlas
2. Click "Connect" trên cluster
3. Chọn "Connect your application"
4. Copy connection string
5. Thay `<password>` bằng password thật của bạn

---

## 📋 Checklist:

- [ ] Cài Discoveries: `pip install -r requirements.txt`
- [ ] Chạy seeder: `python seed_data.py`
- [ ] Kiểm tra data trong Compass
- [ ] Chạy backend: `python app.py`
- [ ] Test API: `http://localhost:5000`

---

## 🎯 Sau khi hoàn thành:

Backend của bạn sẽ chạy ở `http://localhost:5000`

API endpoints sẵn sàng:
- GET `/api/products` - Lấy danh sách sản phẩm
- GET `/api/categories` - Lấy danh sách categories
- POST `/api/auth/login` - Login
- POST `/api/auth/register` - Register

