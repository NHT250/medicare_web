# 🚀 Quick Start - Chạy Project trong 3 Phút

## ⚡ Các bước nhanh

### 1️⃣ Start MongoDB
```bash
# macOS
brew services start mongodb-community

# Windows - Start MongoDB Service trong Services
```

### 2️⃣ Seed Database
```bash
cd Backend
pip install -r requirements.txt
python seed_data.py
```

### 3️⃣ Run Backend
```bash
python app.py
```
✅ Backend chạy ở: `http://localhost:5000`

### 4️⃣ Mở Frontend
```bash
# Mở file HTML trực tiếp
open Frontend/homepage.html
```

---

## 📝 Chi tiết MongoDB Compass

### Nếu dùng MongoDB Atlas (Cloud):
1. Click **"CONNECT"** connection có sẵn trong Compass
2. Hoặc tạo connection mới:
   - Click **"+ Add new connection"**
   - Nhập connection string từ Atlas
   - Format: `mongodb+srv://user:pass@cluster.mongodb.net/`

### Nếu dùng Local MongoDB:
1. Click **"+ Add new connection"**
2. Nhập: `mongodb://localhost:27017`
3. Click **"Connect"**
4. Create database: `medicare`

---

## ✅ Kiểm tra

```bash
# Test backend
curl http://localhost:5000/api/products

# Nếu thấy JSON response = SUCCESS
```

Xem đầy đủ: `MONGODB_SETUP_GUIDE.md`

