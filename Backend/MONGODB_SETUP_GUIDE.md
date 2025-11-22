# 🔧 MongoDB Setup Guide - Kết nối với Backend

## 📋 Hướng dẫn từng bước

### **Bước 1: Kết nối MongoDB Compass**

#### Option A: Local MongoDB (Khuyến nghị cho Development)

1. **Cài đặt MongoDB (nếu chưa có)**
   ```bash
   # macOS
   brew install mongodb-community
   brew services start mongodb-community
   
   # Windows
   # Download từ: https://www.mongodb.com/try/download/community
   ```

2. **Mở MongoDB Compass**
   - Click nút **"+ Add new connection"**
   - Nhập connection string: 
   ```
   mongodb://localhost:27017
   ```
   - Click **"Connect"**

3. **Kiểm tra kết nối**
   - Bạn sẽ thấy databases list
   - Mặc định có: `admin`, `config`, `local`

#### Option B: MongoDB Atlas (Cloud - Có sẵn ở hình của bạn)

Từ hình bạn gửi, bạn đã có connection **"cluster1.qncm65..."**:

1. **Click "CONNECT"** bên cạnh connection đó
2. Hoặc tạo connection mới:
   - Click **"+ Add new connection"**
   - Nhập connection string từ MongoDB Atlas (format: `mongodb+srv://...`)

---

### **Bước 2: Tạo Database**

1. Trong MongoDB Compass, click **"CREATE DATABASE"**
2. Nhập:
   - **Database Name:** `medicare`
   - **Collection Name:** `users` (hoặc để trống)
3. Click **"Create Database"**

---

### **Bước 3: Chạy Seeder (Seed Data)**

Mở terminal và chạy:

```bash
cd Backend
python seed_data.py
```

**Kết quả:**
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

### **Bước 4: Kiểm tra Database trong MongoDB Compass**

1. Refresh MongoDB Compass
2. Vào database `medicare`
3. Bạn sẽ thấy 3 collections:
   - ✅ `users` - 2 users
   - ✅ `products` - 4 products
   - ✅ `categories` - 6 categories

---

### **Bước 5: Cấu hình Backend**

#### A. Local MongoDB

File `Backend/config.py` đã có sẵn:
```python
MONGODB_URI = 'mongodb://localhost:27017/'
DATABASE_NAME = 'medicare'
```

#### B. MongoDB Atlas (Cloud)

1. Lấy connection string từ MongoDB Atlas
2. Sửa file `Backend/config.py`:
```python
MONGODB_URI = 'mongodb+srv://username:password@cluster1.qncm65.mongodb.net/'
DATABASE_NAME = 'medicare'
```

---

### **Bước 6: Chạy Backend**

```bash
cd Backend
python app.py
```

**Output:**
```
🚀 Starting Medicare API Server...
📍 MongoDB: mongodb://localhost:27017/medicare
 * Running on http://127.0.0.1:5000
```

---

### **Bước 7: Test API**

Mở browser hoặc Postman và test:

```bash
# Test root endpoint
curl http://localhost:5000/

# Test products
curl http://localhost:5000/api/products

# Test categories
curl http://localhost:5000/api/categories
```

---

## 🔍 Troubleshooting

### Lỗi: Cannot connect to MongoDB

**Nguyên nhân:** MongoDB chưa chạy

**Giải pháp:**
```bash
# macOS - Start MongoDB
brew services start mongodb-community

# Windows - Start MongoDB Service
# Vào Services > Start MongoDB

# Check status
mongosh  # Nếu không lỗi là đã chạy
```

### Lỗ {"message": "Welcome to Medicare API", "version": "1.0.0"} khi test API

**Nguyên nhân:** Backend chưa kết nối được MongoDB

**Giải pháp:**
1. Kiểm tra MongoDB đang chạy
2. Kiểm tra connection string trong `config.py`
3. Kiểm tra database name đúng: `medicare`

### Lỗi: ModuleNotFoundError

**Nguyên nhân:** Thiếu Python packages

**Giải pháp:**
```bash
pip install -r requirements.txt
```

---

## 📊 Structure sau khi Setup

```
medicare (database)
├── users (collection) - 2 documents
├── categories (collection) - 6 documents
├── products (collection) - 4 documents
├── carts (collection) - empty (will be created)
└── orders (collection) - empty (will be created)
```

---

## ✅ Checklist

- [ ] MongoDB đã cài đặt và chạy
- [ ] MongoDB Compass kết nối thành công
- [ ] Database `medicare` đã tạo
- [ ] Đã chạy `seed_data.py`
- [ ] Đã kiểm tra data trong Compass
- [ ] Backend đã chạy (`python app.py`)
- [ ] Đã test API endpoints

---

## 🎯 Quick Commands

```bash
# Start MongoDB (macOS)
brew services start mongodb-community

# Start MongoDB (Windows)
# Vào Services > Start MongoDB

# Seed database
cd Backend && python seed_data.py

# Run backend
cd Backend && python app.py

# Test API
curl http://localhost:5000/api/products
```

---

## 📞 Support

Nếu gặp lỗi, kiểm tra:
1. MongoDB đang chạy không
2. Port 27017 (MongoDB) và 5000 (Flask) có bị chiếm không
3. Dependencies đã cài đủ chưa

