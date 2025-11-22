# 🎯 Hướng Dẫn Kết Nối MongoDB - Dành Riêng Cho Bạn

**Hệ điều hành:** Windows  
**MongoDB:** Đã cài (Compass 1.48.1)  
**Backend:** Flask (Medicare)

---

## 🚀 BƯỚC 1: Kiểm Tra & Start MongoDB Service

### **1.1. Mở PowerShell với quyền Administrator**

**Cách 1:**
- Nhấn `Windows + X`
- Chọn **"Windows PowerShell (Admin)"** hoặc **"Terminal (Admin)"**

**Cách 2:**
- Search "PowerShell" trong Start Menu
- Right-click → **"Run as Administrator"**

### **1.2. Kiểm tra MongoDB Service**

Paste lệnh này vào PowerShell:

```powershell
Get-Service MongoDB -ErrorAction SilentlyContinue
```

**Kết quả có thể:**

#### **✅ Case 1: MongoDB Service tồn tại**
```
Status   Name               DisplayName
------   ----               -----------
Running  MongoDB            MongoDB Server
```
→ **Good!** MongoDB đang chạy, skip sang Bước 2.

#### **⚠️ Case 2: Service Stopped**
```
Status   Name               DisplayName
------   ----               -----------
Stopped  MongoDB            MongoDB Server
```
→ Chạy lệnh:
```powershell
net start MongoDB
```

#### **❌ Case 3: Service không tồn tại**
```
(Không có output gì)
```
→ Cần start MongoDB manually (xem Bước 1.3)

---

### **1.3. Start MongoDB Manually (nếu không có service)**

**Option A - Tìm MongoDB đã cài:**

```powershell
# Tìm MongoDB installation
Get-ChildItem -Path "C:\Program Files\MongoDB" -Recurse -Filter "mongod.exe" -ErrorAction SilentlyContinue
```

Nếu tìm thấy, note lại đường dẫn (VD: `C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe`)

**Option B - Start MongoDB:**

```powershell
# Tạo thư mục data (nếu chưa có)
New-Item -ItemType Directory -Path "C:\data\db" -Force

# Start MongoDB (thay đường dẫn nếu khác)
& "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" --dbpath "C:\data\db"
```

**Lưu ý:** Cửa sổ PowerShell này phải **mở suốt** khi dùng MongoDB!

---

## 🔌 BƯỚC 2: Kết Nối MongoDB Compass

Bạn đã mở MongoDB Compass rồi, bây giờ:

### **2.1. Click nút "+ Add new connection"**

(Nút màu xanh lá trong ảnh của bạn)

### **2.2. Nhập Connection String**

Trong ô **"URI"**, paste:

```
mongodb://localhost:27017
```

### **2.3. (Optional) Đặt tên Connection**

- Phía trên URI, ở ô **"Name"**, đặt tên: `Medicare Local`

### **2.4. Click "Save & Connect"**

**✅ Thành công:** Bạn sẽ thấy màn hình Databases với các DB mặc định:
- `admin`
- `config`
- `local`

**❌ Lỗi:** Nếu báo "connection refused", quay lại Bước 1 check MongoDB service.

---

## 📊 BƯỚC 3: Tạo Database & Seed Data

### **3.1. Tạo Database trong Compass**

**Option A - Tự động (qua Seeder - Recommended):**

Skip sang 3.2, seeder sẽ tự tạo database!

**Option B - Tạo thủ công:**

1. Trong Compass, click **"CREATE DATABASE"** (góc trái)
2. Nhập:
   - **Database Name:** `medicare`
   - **Collection Name:** `users`
3. Click **"Create Database"**

### **3.2. Chạy Seeder để thêm dữ liệu mẫu**

**Mở PowerShell mới (không cần Admin):**

```powershell
# Di chuyển vào thư mục Backend
cd D:\nam3hocky1\LTWNC\Project_Medicare-codex-add-captcha-to-login-and-register-forms-h6nbpv\Backend

# Chạy seeder
python seed_data.py
```

**Output mong đợi:**

```
Connecting to MongoDB...
Connected successfully to: mongodb://localhost:27017

Clearing existing data...
✅ Cleared existing collections

Creating indexes...
✅ Created indexes

Seeding users...
✅ Inserted 1 sample user

Seeding categories...
✅ Inserted 6 categories

Seeding products...
✅ Inserted 24 products

🎉 Database seeding completed successfully!

📊 Database Summary:
   Database: medicare
   Users: 1
   Categories: 6
   Products: 24

🔐 Sample Login Credentials:
   Email: user@example.com
   Password: password123

✅ You can now start the backend server!
```

**✅ Xong!** Data đã được thêm vào MongoDB.

### **3.3. Kiểm tra trong Compass**

1. Quay lại **MongoDB Compass**
2. Click **"Refresh"** (icon ↻ góc trái)
3. Bạn sẽ thấy database **"medicare"** với 3 collections:
   - **users** (1 document)
   - **categories** (6 documents)
   - **products** (24 documents)

4. Click vào từng collection để xem data!

---

## ⚙️ BƯỚC 4: Config Backend (Đã Xong)

**Good news:** Backend của bạn đã config sẵn cho localhost!

File `Backend/config.py`:
```python
MONGODB_URI = 'mongodb://localhost:27017/'
DATABASE_NAME = 'medicare'
```

→ **Không cần sửa gì!** ✅

---

## 🚀 BƯỚC 5: Start Backend

```powershell
# Đảm bảo đang ở thư mục Backend
cd D:\nam3hocky1\LTWNC\Project_Medicare-codex-add-captcha-to-login-and-register-forms-h6nbpv\Backend

# Start backend
python app.py
```

**Output mong đợi:**

```
Starting Medicare API Server...
MongoDB: mongodb://localhost:27017/medicare
 * Serving Flask app 'app'
 * Debug mode: on
WARNING: This is a development server. Do not use it in a production deployment.
 * Running on http://0.0.0.0:5000
Press CTRL+C to quit
```

**✅ Backend đang chạy!**

---

## 🌐 BƯỚC 6: Start Frontend

**Mở PowerShell mới (terminal thứ 2):**

```powershell
# Di chuyển vào Frontend_React
cd D:\nam3hocky1\LTWNC\Project_Medicare-codex-add-captcha-to-login-and-register-forms-h6nbpv\Frontend_React

# Start frontend
npm run dev
```

**Output mong đợi:**

```
VITE v7.1.7  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h + enter to show help
```

**✅ Frontend đang chạy!**

---

## 🧪 BƯỚC 7: Test Kết Nối

### **7.1. Test Backend API**

Mở browser: http://localhost:5000

**Kết quả:**
```json
{
  "message": "Welcome to Medicare API",
  "version": "1.0.0",
  "endpoints": {
    "auth": "/api/auth/register, /api/auth/login",
    "products": "/api/products",
    ...
  }
}
```

### **7.2. Test Products API**

http://localhost:5000/api/products

**Kết quả:** Danh sách 24 products từ MongoDB!

### **7.3. Test Frontend**

http://localhost:5173

**✅ Homepage hiển thị!**

### **7.4. Test Login**

1. Click **"Login"** button
2. Nhập:
   - **Email:** `user@example.com`
   - **Password:** `password123`
3. Complete reCAPTCHA
4. Click **"Login"**

**✅ Login thành công!** → Redirect về homepage với user avatar!

---

## 📋 CHECKLIST HOÀN THÀNH

Đánh dấu khi xong:

- [ ] MongoDB Service đang chạy (hoặc mongod.exe running)
- [ ] MongoDB Compass connected to `mongodb://localhost:27017`
- [ ] Database `medicare` đã được tạo
- [ ] Chạy `python seed_data.py` thành công
- [ ] Thấy 3 collections trong Compass: users, categories, products
- [ ] Backend chạy: http://localhost:5000 (Terminal 1)
- [ ] Frontend chạy: http://localhost:5173 (Terminal 2)
- [ ] Test login thành công với `user@example.com`
- [ ] Thấy products hiển thị trên web

**Hoàn thành tất cả → ✅ Setup thành công!**

---

## 🐛 TROUBLESHOOTING

### ❌ Lỗi: "Connection refused" khi seed

**Nguyên nhân:** MongoDB chưa chạy

**Fix:**
```powershell
# Check service
Get-Service MongoDB

# Nếu Stopped
net start MongoDB

# Hoặc start manual
& "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe" --dbpath "C:\data\db"
```

---

### ❌ Lỗi: "pymongo.errors.ServerSelectionTimeoutError"

**Nguyên nhân:** Backend không connect được MongoDB

**Fix:**

1. Check MongoDB đang chạy:
```powershell
Get-Process mongod -ErrorAction SilentlyContinue
```

2. Nếu không thấy process, start MongoDB

3. Test connection:
```powershell
cd Backend
python -c "from pymongo import MongoClient; print(MongoClient('mongodb://localhost:27017').server_info())"
```

---

### ❌ Lỗi: "Database seeding failed"

**Fix - Xóa database và seed lại:**

**Trong MongoDB Compass:**
1. Right-click database `medicare`
2. Chọn **"Drop Database"**
3. Confirm
4. Chạy lại: `python seed_data.py`

---

### ❌ Lỗi: "Port 5000 already in use"

**Nguyên nhân:** Backend đã chạy ở terminal khác

**Fix:**
```powershell
# Tìm và kill process
Get-Process python | Stop-Process -Force

# Hoặc
netstat -ano | findstr :5000
# Tìm PID, sau đó:
taskkill /PID <PID_number> /F
```

---

## 📌 TIPS

### **1. Mở nhiều terminals cùng lúc:**

**Windows Terminal (Recommended):**
- Cài từ Microsoft Store: "Windows Terminal"
- Mở tabs mới: `Ctrl + Shift + T`
- Split panes: `Alt + Shift + D`

**Hoặc dùng nhiều cửa sổ PowerShell:**
- Terminal 1: Backend
- Terminal 2: Frontend
- Terminal 3: MongoDB (nếu start manual)

### **2. Auto-start MongoDB:**

Để MongoDB tự chạy khi khởi động Windows:

```powershell
# Tạo MongoDB Service (PowerShell Admin)
sc.exe create MongoDB binPath= "C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe --service --dbpath=C:\data\db" DisplayName= "MongoDB" start= auto
```

### **3. Stop MongoDB khi không dùng:**

```powershell
# Stop service
net stop MongoDB

# Hoặc kill process
Get-Process mongod | Stop-Process
```

---

## 🎯 WORKFLOW HÀNG NGÀY

**Mỗi khi làm việc:**

```powershell
# 1. Check/Start MongoDB
net start MongoDB

# 2. Mở Terminal 1 - Backend
cd Backend
python app.py

# 3. Mở Terminal 2 - Frontend
cd Frontend_React
npm run dev

# 4. Mở browser
# http://localhost:5173
```

**Khi xong việc:**
```powershell
# Ctrl + C để stop Backend & Frontend
# Đóng terminals
# (Optional) net stop MongoDB
```

---

## 📊 MONGODB COMPASS TIPS

### **Xem dữ liệu:**
1. Connect to localhost
2. Click database `medicare`
3. Click collection (VD: `products`)
4. Xem documents

### **Tìm kiếm:**
- Filter bar: `{ "name": "Aspirin" }`
- Tìm user: `{ "email": "user@example.com" }`

### **Edit document:**
1. Click vào document
2. Click biểu tượng **pencil** (edit)
3. Sửa
4. Click **Update**

### **Add document:**
1. Vào collection
2. Click **"ADD DATA"** → **"Insert Document"**
3. Nhập JSON
4. Click **"Insert"**

---

## 🎉 HOÀN TẤT!

Bây giờ bạn có:
- ✅ MongoDB Local chạy trên máy
- ✅ Database `medicare` với 24 products, 6 categories, 1 user
- ✅ Backend connected to MongoDB
- ✅ Frontend hiển thị data thật từ MongoDB
- ✅ Login/Register hoạt động
- ✅ Profile, Orders, Cart đều lưu vào MongoDB

**Happy Coding! 🚀**

---

## 📞 NẾU GẶP VẤN ĐỀ

Cho tôi biết:
1. Bước nào bị lỗi?
2. Error message là gì?
3. Screenshot (nếu có)

Tôi sẽ giúp bạn fix ngay! 😊

